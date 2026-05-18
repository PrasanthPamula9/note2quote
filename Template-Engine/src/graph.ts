import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { END, START, StateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { GoogleGenAI, createPartFromUri, createUserContent } from '@google/genai';
import { jsonrepair } from 'jsonrepair';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pickCanvasPreset } from './canvas.js';
import { ANALYSIS_PROMPT, SYSTEM_PROMPT, TEMPLATE_PROMPT } from './prompts.js';
import {
  analysisSchema,
  normalizeSupportedFont,
  normalizeQuoteTemplatePayload,
  quoteTemplateSchema,
  sanitizeQuoteTemplate,
  type QuoteTemplate,
  type TemplateAgentInput,
  type TemplateAnalysis,
} from './contract.js';
import type { ModelProviderKey, TemplateEngineConfig } from './config.js';
import { resolveProviderApiKey, resolveProviderKey } from './config.js';

export type TemplateAgentState = {
  input: TemplateAgentInput;
  analysis?: TemplateAnalysis;
  draft?: QuoteTemplate;
  final?: QuoteTemplate;
  errors: string[];
  attempts: number;
};

const imageToContentPart = async (image: TemplateAgentInput['images'][number]) => {
  if (/^https?:\/\//i.test(image.uri) || /^data:/i.test(image.uri)) {
    return {
      type: 'image_url' as const,
      image_url: { url: image.uri },
    };
  }

  const buffer = await readFile(path.resolve(image.uri));
  const mimeType = image.mimeType || 'image/jpeg';
  return {
    type: 'image_url' as const,
    image_url: {
      url: `data:${mimeType};base64,${buffer.toString('base64')}`,
    },
  };
};

const buildImageMessages = async (input: TemplateAgentInput, prompt: string) => {
  const imageParts = await Promise.all(input.images.map((image) => imageToContentPart(image)));
  return [
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage({
      content: [
        { type: 'text', text: prompt },
        ...(input.brief ? [{ type: 'text' as const, text: `User brief: ${input.brief}` }] : []),
        ...imageParts,
      ],
    }),
  ];
};

const buildOpenAIModel = (modelName: string, apiKey: string, temperature: number, maxTokens: number) =>
  new ChatOpenAI({
    model: modelName,
    apiKey,
    temperature,
    maxTokens,
  });

const buildGeminiClient = (apiKey: string) => new GoogleGenAI({ apiKey });

const safeTemplateName = (value?: string) => {
  const name = String(value ?? '').trim();
  return name.length > 0 ? name : 'Generated Template';
};

const parseJsonValue = (value: string) => {
  const trimmed = String(value ?? '').trim();
  const jsonText = trimmed.startsWith('```')
    ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim()
    : trimmed;

  const parse = (text: string) => JSON.parse(text) as unknown;

  try {
    return parse(jsonText);
  } catch (error) {
    try {
      return parse(jsonrepair(jsonText));
    } catch {
      const firstObject = jsonText.indexOf('{');
      const lastObject = jsonText.lastIndexOf('}');
      const firstArray = jsonText.indexOf('[');
      const lastArray = jsonText.lastIndexOf(']');

      const objectCandidate =
        firstObject >= 0 && lastObject > firstObject ? jsonText.slice(firstObject, lastObject + 1) : null;
      const arrayCandidate =
        firstArray >= 0 && lastArray > firstArray ? jsonText.slice(firstArray, lastArray + 1) : null;

      const candidate = objectCandidate && (!arrayCandidate || objectCandidate.length <= arrayCandidate.length)
        ? objectCandidate
        : arrayCandidate;

      if (candidate) {
        return parse(jsonrepair(candidate));
      }

      throw error;
    }
  }
};

const normalizeCanvasPreset = (value: unknown, fallback: TemplateAgentInput['canvasHint']) => {
  const text = String(value ?? '').trim().toLowerCase();
  if (text === 'instagram_post_square' || text === 'square' || text === '1:1 square') {
    return 'instagram_post_square';
  }
  if (text === 'instagram_post_portrait' || text === 'portrait' || text === '4:5 portrait') {
    return 'instagram_post_portrait';
  }
  if (text === 'instagram_post_landscape' || text === 'landscape' || text === '3:2 landscape' || text === '1.91:1 landscape') {
    return 'instagram_post_landscape';
  }
  if (text === 'instagram_story' || text === 'story' || text === '9:16 story') {
    return 'instagram_story';
  }
  return fallback ?? 'instagram_post_square';
};

const normalizeStringArray = (value: unknown, fallback: string[] = []) => {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const normalized = value
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        return String(record.color ?? record.value ?? record.hex ?? record.name ?? record.label ?? '').trim();
      }
      return String(item ?? '').trim();
    })
    .map((item) => item.trim())
    .filter(Boolean);
  return normalized.length > 0 ? normalized : fallback;
};

const normalizeAnalysisPayload = (value: unknown, fallbackCanvasPreset: TemplateAgentInput['canvasHint']) => {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const typographyRaw = raw.typography_direction && typeof raw.typography_direction === 'object'
    ? (raw.typography_direction as Record<string, unknown>)
    : {};
  const backgroundRaw = raw.background_direction && typeof raw.background_direction === 'object'
    ? (raw.background_direction as Record<string, unknown>)
    : {};

  const sourceWidth = Number(raw.source_image_width);
  const sourceHeight = Number(raw.source_image_height);
  const confidence = Number(raw.confidence);

  return {
    canvas_preset: normalizeCanvasPreset(raw.canvas_preset, fallbackCanvasPreset),
    source_image_width: Number.isFinite(sourceWidth) ? sourceWidth : null,
    source_image_height: Number.isFinite(sourceHeight) ? sourceHeight : null,
    dominant_palette: normalizeStringArray(raw.dominant_palette, []),
    visual_hierarchy: normalizeStringArray(raw.visual_hierarchy, []),
    text_regions: Array.isArray(raw.text_regions)
      ? raw.text_regions
          .map((region) => {
            if (!region || typeof region !== 'object') {
              return null;
            }
            const record = region as Record<string, unknown>;
            return {
              role: String(record.role ?? 'decorative') as TemplateAnalysis['text_regions'][number]['role'],
              text: String(record.text ?? '').trim(),
              x_percent: Number(record.x_percent ?? 0),
              y_percent: Number(record.y_percent ?? 0),
              width_percent: Number(record.width_percent ?? 0),
              height_percent: Number(record.height_percent ?? 0),
            };
          })
          .filter(Boolean)
      : [],
    typography_direction: {
      font_family: String(typographyRaw.font_family ?? 'Inter'),
      font_size: Number.isFinite(Number(typographyRaw.font_size)) ? Number(typographyRaw.font_size) : 14,
      font_weight: Number.isFinite(Number(typographyRaw.font_weight)) ? Number(typographyRaw.font_weight) : 700,
      text_align: Number.isFinite(Number(typographyRaw.text_align)) ? Number(typographyRaw.text_align) : 2,
      font_shadow: Number.isFinite(Number(typographyRaw.font_shadow)) ? Number(typographyRaw.font_shadow) : 0,
      font_color: String(typographyRaw.font_color ?? '#FFFFFF'),
    },
    background_direction: {
      image_uri: backgroundRaw.image_uri != null ? String(backgroundRaw.image_uri) : null,
      color: String(backgroundRaw.color ?? '#222222'),
      opacity: Number.isFinite(Number(backgroundRaw.opacity)) ? Number(backgroundRaw.opacity) : 0.6,
    },
    confidence: Number.isFinite(confidence) ? confidence : 0.5,
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map((warning) => String(warning)) : [],
    notes: String(raw.notes ?? ''),
  };
};

const normalizeGeminiContent = async (client: GoogleGenAI, image: TemplateAgentInput['images'][number]) => {
  if (/^https?:\/\//i.test(image.uri) || /^data:/i.test(image.uri)) {
    return createPartFromUri(image.uri, image.mimeType || 'image/jpeg');
  }

  const uploaded = await client.files.upload({
    file: path.resolve(image.uri),
    config: { mimeType: image.mimeType || 'image/jpeg' },
  });

  if (!uploaded.uri) {
    throw new Error('Gemini file upload did not return a URI.');
  }

  return createPartFromUri(uploaded.uri, uploaded.mimeType || image.mimeType || 'image/jpeg');
};

const buildOpenRouterMessageContent = (
  prompt: string,
  imageParts: Array<{ type: 'image_url'; image_url: { url: string } }>,
) => ([
  {
    role: 'system' as const,
    content: SYSTEM_PROMPT,
  },
  {
    role: 'user' as const,
    content: [
      { type: 'text' as const, text: prompt },
      ...imageParts,
    ],
  },
]);

const openRouterRequest = async (
  apiKey: string,
  baseUrl: string,
  model: string,
  messages: Array<{ role: 'system' | 'user'; content: unknown }>,
  options: {
    temperature: number;
    maxTokens: number;
    siteUrl: string;
    siteName: string;
    provider?: TemplateEngineConfig['providers']['openrouter']['provider'];
  },
) => {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': options.siteUrl,
      'X-Title': options.siteName,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      provider: options.provider,
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`OpenRouter request failed (${response.status}): ${responseText}`);
  }

  const parsed = JSON.parse(responseText) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = parsed.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenRouter returned no message content.');
  }

  return content;
};

export const createTemplateAgentGraph = (
  config: TemplateEngineConfig,
  overrides?: {
    provider?: ModelProviderKey;
    model?: string;
  },
) => {
  const providerKey = resolveProviderKey(
    overrides?.provider ?? process.env.TEMPLATE_ENGINE_PROVIDER ?? config.default_provider,
    config.default_provider,
  );

  const openRouterConfig = config.providers.openrouter;
  const openRouterApiKey = resolveProviderApiKey(openRouterConfig.api_key, openRouterConfig.api_key_env);
  const openRouterModel = overrides?.model ?? process.env.TEMPLATE_ENGINE_MODEL ?? openRouterConfig.model;
  const openRouterBaseUrl = openRouterConfig.base_url ?? 'https://openrouter.ai/api/v1';
  const openRouterSiteUrl = openRouterConfig.site_url ?? 'https://note2quote.app';
  const openRouterSiteName = openRouterConfig.site_name ?? 'note2quote';
  const geminiConfig = config.providers.gemini;
  const geminiApiKey = resolveProviderApiKey(geminiConfig.api_key, geminiConfig.api_key_env);
  const geminiModel = overrides?.model ?? process.env.TEMPLATE_ENGINE_MODEL ?? geminiConfig.model;
  const geminiClient = providerKey === 'gemini' && geminiApiKey ? buildGeminiClient(geminiApiKey) : null;

  const openAiModel =
    providerKey === 'openai'
      ? (() => {
          const providerConfig = config.providers.openai;
          const modelName = overrides?.model ?? process.env.TEMPLATE_ENGINE_MODEL ?? providerConfig.model;
          const apiKey = resolveProviderApiKey(providerConfig.api_key, providerConfig.api_key_env);
          if (!apiKey) {
            throw new Error(`Missing API key for openai (set api_key in config or api_key_env in config).`);
          }
          return buildOpenAIModel(modelName, apiKey, providerConfig.temperature, providerConfig.max_tokens);
        })()
      : null;

  const analysisModel = openAiModel ? openAiModel.withStructuredOutput(analysisSchema) : null;
  const templateModel = openAiModel ? openAiModel.withStructuredOutput(quoteTemplateSchema) : null;

  const analyzeNode = async (state: TemplateAgentState) => {
    const imageMeta = state.input.images[0];
    const fallbackCanvasPreset = state.input.canvasHint ?? pickCanvasPreset(imageMeta?.width, imageMeta?.height);

    if (providerKey === 'openrouter') {
      if (!openRouterApiKey) {
        throw new Error('Missing API key for openrouter (set api_key in config or api_key_env in config).');
      }

      const imageParts = await Promise.all(state.input.images.map((image) => imageToContentPart(image)));
      const prompt = [
        ANALYSIS_PROMPT,
        state.input.brief ? `User brief: ${state.input.brief}` : '',
        'Return strict JSON only.',
      ].filter(Boolean).join('\n\n');

      const content = await openRouterRequest(
        openRouterApiKey,
        openRouterBaseUrl,
        openRouterModel,
        buildOpenRouterMessageContent(prompt, imageParts),
        {
          temperature: openRouterConfig.temperature,
          maxTokens: openRouterConfig.max_tokens,
          siteUrl: openRouterSiteUrl,
          siteName: openRouterSiteName,
          provider: openRouterConfig.provider,
        },
      );

      const analysis = analysisSchema.parse(normalizeAnalysisPayload(JSON.parse(content), fallbackCanvasPreset));
      return {
        analysis: {
          ...analysis,
          canvas_preset: analysis.canvas_preset ?? fallbackCanvasPreset,
          typography_direction: {
            ...analysis.typography_direction,
            font_family: normalizeSupportedFont(analysis.typography_direction.font_family),
          },
        },
        errors: [],
        attempts: 0,
      };
    }

    if (providerKey === 'gemini') {
      if (!geminiApiKey) {
        throw new Error('Missing API key for gemini (set api_key in config or api_key_env in config).');
      }
      if (!geminiClient) {
        throw new Error('Gemini client is unavailable.');
      }

      const imageParts = await Promise.all(state.input.images.map((image) => normalizeGeminiContent(geminiClient, image)));
      const prompt = [
        ANALYSIS_PROMPT,
        state.input.brief ? `User brief: ${state.input.brief}` : '',
        'Return strict JSON only.',
      ].filter(Boolean).join('\n\n');

      const response = await geminiClient.models.generateContent({
        model: geminiModel,
        contents: createUserContent([prompt, ...imageParts]),
        config: {
          responseMimeType: 'application/json',
          temperature: geminiConfig.temperature,
          maxOutputTokens: geminiConfig.max_tokens,
        },
      });

      const analysis = analysisSchema.parse(normalizeAnalysisPayload(JSON.parse(response.text ?? '{}'), fallbackCanvasPreset));
      return {
        analysis: {
          ...analysis,
          canvas_preset: analysis.canvas_preset ?? fallbackCanvasPreset,
          typography_direction: {
            ...analysis.typography_direction,
            font_family: normalizeSupportedFont(analysis.typography_direction.font_family),
          },
        },
        errors: [],
        attempts: 0,
      };
    }

    if (!analysisModel) {
      throw new Error('Analysis model is unavailable for the current provider.');
    }

    const messages = await buildImageMessages(state.input, ANALYSIS_PROMPT);
    const analysis = await analysisModel.invoke(messages);

    return {
      analysis: {
        ...analysis,
        canvas_preset: analysis.canvas_preset ?? fallbackCanvasPreset,
        typography_direction: {
          ...analysis.typography_direction,
          font_family: normalizeSupportedFont(analysis.typography_direction.font_family),
        },
      },
      errors: [],
      attempts: 0,
    };
  };

  const draftNode = async (state: TemplateAgentState) => {
    const imageMeta = state.input.images[0];
    const fallbackCanvasPreset = state.input.canvasHint ?? pickCanvasPreset(imageMeta?.width, imageMeta?.height);

    if (providerKey === 'openrouter') {
      if (!openRouterApiKey) {
        throw new Error('Missing API key for openrouter (set api_key in config or api_key_env in config).');
      }

      const imageParts = await Promise.all(state.input.images.map((image) => imageToContentPart(image)));
      const prompt = [
        TEMPLATE_PROMPT,
        `Reference analysis: ${JSON.stringify(state.analysis, null, 2)}`,
        `Template name hint: ${safeTemplateName(state.input.templateName)}`,
        `User brief: ${state.input.brief ?? 'Create a production-ready template from the image evidence.'}`,
        'Return strict JSON only.',
      ].join('\n\n');

      const content = await openRouterRequest(
        openRouterApiKey,
        openRouterBaseUrl,
        openRouterModel,
        buildOpenRouterMessageContent(prompt, imageParts),
        {
          temperature: openRouterConfig.temperature,
          maxTokens: openRouterConfig.max_tokens,
          siteUrl: openRouterSiteUrl,
          siteName: openRouterSiteName,
          provider: openRouterConfig.provider,
        },
      );

      const draft = normalizeQuoteTemplatePayload(parseJsonValue(content), {
        templateName: safeTemplateName(state.input.templateName),
        canvasPreset: state.input.canvasHint ?? state.analysis?.canvas_preset ?? fallbackCanvasPreset,
        analysis: state.analysis,
        sourceImage: imageMeta,
      });
      return {
        draft: sanitizeQuoteTemplate(quoteTemplateSchema.parse(draft)),
      };
    }

    if (providerKey === 'gemini') {
      if (!geminiApiKey) {
        throw new Error('Missing API key for gemini (set api_key in config or api_key_env in config).');
      }
      if (!geminiClient) {
        throw new Error('Gemini client is unavailable.');
      }

      const imageParts = await Promise.all(state.input.images.map((image) => normalizeGeminiContent(geminiClient, image)));
      const prompt = [
        TEMPLATE_PROMPT,
        `Reference analysis: ${JSON.stringify(state.analysis, null, 2)}`,
        `Template name hint: ${safeTemplateName(state.input.templateName)}`,
        `User brief: ${state.input.brief ?? 'Create a production-ready template from the image evidence.'}`,
        'Return strict JSON only.',
      ].join('\n\n');

      const response = await geminiClient.models.generateContent({
        model: geminiModel,
        contents: createUserContent([prompt, ...imageParts]),
        config: {
          responseMimeType: 'application/json',
          temperature: geminiConfig.temperature,
          maxOutputTokens: geminiConfig.max_tokens,
        },
      });

      const draft = normalizeQuoteTemplatePayload(parseJsonValue(response.text ?? '{}'), {
        templateName: safeTemplateName(state.input.templateName),
        canvasPreset: state.input.canvasHint ?? state.analysis?.canvas_preset ?? fallbackCanvasPreset,
        analysis: state.analysis,
        sourceImage: imageMeta,
      });
      return {
        draft: sanitizeQuoteTemplate(quoteTemplateSchema.parse(draft)),
      };
    }

    const imageParts = await Promise.all(state.input.images.map((image) => imageToContentPart(image)));
    const messages = [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage({
        content: [
          { type: 'text', text: TEMPLATE_PROMPT },
          { type: 'text', text: `Reference analysis: ${JSON.stringify(state.analysis, null, 2)}` },
          { type: 'text', text: `Template name hint: ${safeTemplateName(state.input.templateName)}` },
          { type: 'text', text: `User brief: ${state.input.brief ?? 'Create a production-ready template from the image evidence.'}` },
          ...imageParts,
        ],
      }),
    ];

    if (!templateModel) {
      throw new Error('Template model is unavailable for the current provider.');
    }

    const draft = await templateModel.invoke(messages);
    return {
      draft: sanitizeQuoteTemplate(
        quoteTemplateSchema.parse(
          normalizeQuoteTemplatePayload(draft, {
            templateName: safeTemplateName(state.input.templateName),
            canvasPreset: state.input.canvasHint ?? state.analysis?.canvas_preset ?? fallbackCanvasPreset,
            analysis: state.analysis,
            sourceImage: imageMeta,
          }),
        ),
      ),
    };
  };

  const validateNode = async (state: TemplateAgentState) => {
    const result = quoteTemplateSchema.safeParse(state.draft);
    if (result.success) {
      return {
        final: result.data,
        errors: [],
      };
    }

    return {
      errors: result.error.issues.map((issue) => `${issue.path.join('.') || 'template'}: ${issue.message}`),
    };
  };

  const repairNode = async (state: TemplateAgentState) => {
    if (providerKey === 'openrouter') {
      if (!openRouterApiKey) {
        throw new Error('Missing API key for openrouter (set api_key in config or api_key_env in config).');
      }

      const imageParts = await Promise.all(state.input.images.map((image) => imageToContentPart(image)));
      const prompt = [
        TEMPLATE_PROMPT,
        `Previous validation errors: ${JSON.stringify(state.errors, null, 2)}`,
        `Current draft: ${JSON.stringify(state.draft, null, 2)}`,
        ...(state.analysis ? [`Reference analysis: ${JSON.stringify(state.analysis, null, 2)}`] : []),
        'Fix the JSON and return a fully valid Note2Quote template.',
        'Return strict JSON only.',
      ].join('\n\n');

      const content = await openRouterRequest(
        openRouterApiKey,
        openRouterBaseUrl,
        openRouterModel,
        buildOpenRouterMessageContent(prompt, imageParts),
        {
          temperature: openRouterConfig.temperature,
          maxTokens: openRouterConfig.max_tokens,
          siteUrl: openRouterSiteUrl,
          siteName: openRouterSiteName,
          provider: openRouterConfig.provider,
        },
      );

      const repaired = normalizeQuoteTemplatePayload(parseJsonValue(content), {
        templateName: safeTemplateName(state.input.templateName),
        canvasPreset: state.input.canvasHint ?? state.analysis?.canvas_preset ?? pickCanvasPreset(state.input.images[0]?.width, state.input.images[0]?.height),
        analysis: state.analysis,
        sourceImage: state.input.images[0],
      });
      const validated = sanitizeQuoteTemplate(
        quoteTemplateSchema.parse(repaired),
      );

      return {
        final: validated,
        errors: [],
        attempts: state.attempts + 1,
      };
    }

    if (providerKey === 'gemini') {
      if (!geminiApiKey) {
        throw new Error('Missing API key for gemini (set api_key in config or api_key_env in config).');
      }
      if (!geminiClient) {
        throw new Error('Gemini client is unavailable.');
      }

      const imageParts = await Promise.all(state.input.images.map((image) => normalizeGeminiContent(geminiClient, image)));
      const prompt = [
        TEMPLATE_PROMPT,
        `Previous validation errors: ${JSON.stringify(state.errors, null, 2)}`,
        `Current draft: ${JSON.stringify(state.draft, null, 2)}`,
        ...(state.analysis ? [`Reference analysis: ${JSON.stringify(state.analysis, null, 2)}`] : []),
        'Fix the JSON and return a fully valid Note2Quote template.',
        'Return strict JSON only.',
      ].join('\n\n');

      const response = await geminiClient.models.generateContent({
        model: geminiModel,
        contents: createUserContent([prompt, ...imageParts]),
        config: {
          responseMimeType: 'application/json',
          temperature: geminiConfig.temperature,
          maxOutputTokens: geminiConfig.max_tokens,
        },
      });

      const repaired = normalizeQuoteTemplatePayload(parseJsonValue(response.text ?? '{}'), {
        templateName: safeTemplateName(state.input.templateName),
        canvasPreset: state.input.canvasHint ?? state.analysis?.canvas_preset ?? pickCanvasPreset(state.input.images[0]?.width, state.input.images[0]?.height),
        analysis: state.analysis,
        sourceImage: state.input.images[0],
      });
      const validated = sanitizeQuoteTemplate(
        quoteTemplateSchema.parse(repaired),
      );

      return {
        final: validated,
        errors: [],
        attempts: state.attempts + 1,
      };
    }

    const imageParts = await Promise.all(state.input.images.map((image) => imageToContentPart(image)));
    const repairMessages = [
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage({
        content: [
          { type: 'text', text: TEMPLATE_PROMPT },
          { type: 'text', text: `Previous validation errors: ${JSON.stringify(state.errors, null, 2)}` },
          { type: 'text', text: `Current draft: ${JSON.stringify(state.draft, null, 2)}` },
          ...(state.analysis ? [{ type: 'text' as const, text: `Reference analysis: ${JSON.stringify(state.analysis, null, 2)}` }] : []),
          { type: 'text', text: 'Fix the JSON and return a fully valid Note2Quote template.' },
          ...imageParts,
        ],
      }),
    ];

    if (!templateModel) {
      throw new Error('Template model is unavailable for the current provider.');
    }

    const repaired = await templateModel.invoke(repairMessages);
    const validated = sanitizeQuoteTemplate(
      quoteTemplateSchema.parse(
        normalizeQuoteTemplatePayload(repaired, {
          templateName: safeTemplateName(state.input.templateName),
          canvasPreset: state.input.canvasHint ?? state.analysis?.canvas_preset ?? pickCanvasPreset(state.input.images[0]?.width, state.input.images[0]?.height),
          analysis: state.analysis,
          sourceImage: state.input.images[0],
        }),
      ),
    );

    return {
      final: validated,
      errors: [],
      attempts: state.attempts + 1,
    };
  };

  return new StateGraph<TemplateAgentState>({
    channels: {
      input: null,
      analysis: null,
      draft: null,
      final: null,
      errors: null,
      attempts: null,
    },
  })
    .addNode('analyzeTemplate', analyzeNode)
    .addNode('generateTemplate', draftNode)
    .addNode('validateTemplate', validateNode)
    .addNode('repairTemplate', repairNode)
    .addEdge(START, 'analyzeTemplate')
    .addEdge('analyzeTemplate', 'generateTemplate')
    .addEdge('generateTemplate', 'validateTemplate')
    .addConditionalEdges('validateTemplate', (state) => (state.final ? END : 'repairTemplate'))
    .addConditionalEdges('repairTemplate', (state) => (state.final ? END : 'validateTemplate'))
    .compile();
};
