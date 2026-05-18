import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTemplateEngineConfig, resolveProviderKey } from './config.js';
import { createTemplateAgentGraph } from './graph.js';
import type { TemplateAgentInput } from './contract.js';

const parseArgs = (argv: string[]) => {
  const images: string[] = [];
  const positional: string[] = [];
  let brief = '';
  let templateName = '';
  let canvasHint: TemplateAgentInput['canvasHint'] | undefined;
  let model: string | undefined;
  let provider: string | undefined;
  let outPath: string | undefined;
  let configPath: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('-')) {
      positional.push(token);
      continue;
    }

    if (token === '--image' && argv[index + 1]) {
      images.push(argv[index + 1]);
      index += 1;
    } else if (token.startsWith('--image=')) {
      images.push(token.slice('--image='.length));
    } else if (token === '--brief' && argv[index + 1]) {
      brief = argv[index + 1];
      index += 1;
    } else if (token.startsWith('--brief=')) {
      brief = token.slice('--brief='.length);
    } else if (token === '--template-name' && argv[index + 1]) {
      templateName = argv[index + 1];
      index += 1;
    } else if (token.startsWith('--template-name=')) {
      templateName = token.slice('--template-name='.length);
    } else if (token === '--canvas' && argv[index + 1]) {
      canvasHint = argv[index + 1] as TemplateAgentInput['canvasHint'];
      index += 1;
    } else if (token.startsWith('--canvas=')) {
      canvasHint = token.slice('--canvas='.length) as TemplateAgentInput['canvasHint'];
    } else if (token === '--model' && argv[index + 1]) {
      model = argv[index + 1];
      index += 1;
    } else if (token.startsWith('--model=')) {
      model = token.slice('--model='.length);
    } else if (token === '--provider' && argv[index + 1]) {
      provider = argv[index + 1];
      index += 1;
    } else if (token.startsWith('--provider=')) {
      provider = token.slice('--provider='.length);
    } else if (token === '--out' && argv[index + 1]) {
      outPath = argv[index + 1];
      index += 1;
    } else if (token.startsWith('--out=')) {
      outPath = token.slice('--out='.length);
    } else if (token === '--config' && argv[index + 1]) {
      configPath = argv[index + 1];
      index += 1;
    } else if (token.startsWith('--config=')) {
      configPath = token.slice('--config='.length);
    }
  }

  if (positional.length > 0 && !provider) {
    const first = positional[0];
    if (first === 'openai' || first === 'openrouter' || first === 'gemini') {
      provider = first;
      positional.shift();
    }
  }

  if (positional.length > 0 && images.length === 0) {
    images.push(...positional);
  }

  return { images, brief, templateName, canvasHint, model, provider, outPath, configPath };
};

const loadImageDimensions = async (imagePath: string) => {
  try {
    const uri = path.resolve(imagePath);
    await readFile(imagePath);
    return { uri, mimeType: imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg' };
  } catch {
    return null;
  }
};

const main = async () => {
  const argv = process.argv.slice(2);
  const parsed = parseArgs(argv);

  if (parsed.images.length === 0) {
    throw new Error('Pass at least one image with --image <path-or-url>.');
  }

  const config = await loadTemplateEngineConfig(parsed.configPath);
  const resolvedProvider = resolveProviderKey(parsed.provider, config.default_provider);
  const inputImages: TemplateAgentInput['images'] = [];
  for (const image of parsed.images) {
    if (/^https?:\/\//i.test(image) || /^data:/i.test(image)) {
      inputImages.push({ uri: image });
      continue;
    }

    const resolved = await loadImageDimensions(image);
    if (!resolved) {
      throw new Error(`Could not read image: ${image}`);
    }

    inputImages.push({
      uri: resolved.uri,
      mimeType: resolved.mimeType,
    });
  }

  const graph = createTemplateAgentGraph(config, {
    provider: resolvedProvider,
    model: parsed.model,
  });
  const result = await graph.invoke({
    input: {
      images: inputImages,
      brief: parsed.brief,
      templateName: parsed.templateName || undefined,
      canvasHint: parsed.canvasHint,
    },
  });

  if (!result.final) {
    throw new Error(`Template generation failed: ${result.errors.join('; ') || 'unknown error'}`);
  }

  const outputJson = JSON.stringify(result.final, null, 2);

  if (parsed.outPath) {
    await writeFile(path.resolve(parsed.outPath), outputJson, 'utf8');
  }

  process.stdout.write(`${outputJson}\n`);
};

const isMainModule = fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || '');

if (isMainModule) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

export { createTemplateAgentGraph } from './graph.js';
export type { QuoteTemplate, TemplateAgentInput, TemplateAnalysis } from './contract.js';
