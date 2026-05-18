import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const providerSchema = z.object({
  enabled: z.boolean().default(true),
  api_key: z.string().default(''),
  api_key_env: z.string().min(1).optional(),
  base_url: z.string().url().optional(),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.2),
  max_tokens: z.number().int().positive().default(2048),
  site_url: z.string().url().optional(),
  site_name: z.string().min(1).optional(),
  provider: z.record(z.any()).optional(),
});

const geminiProviderSchema = z.object({
  enabled: z.boolean().default(true),
  api_key: z.string().default(''),
  api_key_env: z.string().min(1).optional(),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.2),
  max_tokens: z.number().int().positive().default(2048),
});

export const templateEngineConfigSchema = z.object({
  default_provider: z.enum(['openai', 'openrouter', 'gemini']).default('openrouter'),
  providers: z.object({
    openai: providerSchema,
    openrouter: providerSchema.extend({
      base_url: z.string().url().default('https://openrouter.ai/api/v1'),
      site_url: z.string().url().default('https://note2quote.app'),
      site_name: z.string().min(1).default('note2quote'),
      provider: z.object({
        allow_fallbacks: z.boolean().default(true).optional(),
        data_collection: z.enum(['deny', 'allow']).default('deny').optional(),
      }).passthrough().optional(),
    }),
    gemini: geminiProviderSchema,
  }),
});

export type TemplateEngineConfig = z.infer<typeof templateEngineConfigSchema>;
export type ModelProviderKey = keyof TemplateEngineConfig['providers'];

const defaultConfigPath = () => path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'template-engine.config.json');

export const loadTemplateEngineConfig = async (configPath = process.env.TEMPLATE_ENGINE_CONFIG_PATH || defaultConfigPath()) => {
  const raw = await readFile(path.resolve(configPath), 'utf8');
  return templateEngineConfigSchema.parse(JSON.parse(raw));
};

export const resolveProviderApiKey = (configValue: string | undefined, envName: string | undefined) => {
  const directKey = String(configValue ?? '').trim();
  if (directKey) {
    return directKey;
  }

  if (envName) {
    const envKey = String(process.env[envName] ?? '').trim();
    if (envKey) {
      return envKey;
    }
  }

  return '';
};

export const resolveProviderKey = (provider?: string | null, fallback: ModelProviderKey = 'openrouter') => {
  if (provider === 'openai' || provider === 'openrouter' || provider === 'gemini') {
    return provider;
  }
  return fallback;
};
