import { BaseProvider, getOpenAILikeModel } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';

export default class LiteLLMProvider extends BaseProvider {
  name = 'LiteLLM';
  getApiKeyLink = 'https://docs.litellm.ai/docs/proxy/intro';

  config = {
    baseUrlKey: 'LITELLM_API_BASE_URL',
    apiTokenKey: 'LITELLM_API_KEY',
    baseUrl: 'http://localhost:4000',
  };

  staticModels: ModelInfo[] = [];

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv: Record<string, string> = {},
  ): Promise<ModelInfo[]> {
    const { baseUrl: baseUrlFromConfig, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv,
      defaultBaseUrlKey: 'LITELLM_API_BASE_URL',
      defaultApiTokenKey: 'LITELLM_API_KEY',
    });
    let baseUrl = baseUrlFromConfig;

    if (!baseUrl) {
      return [];
    }

    if (typeof window === 'undefined') {
      const isDocker = process?.env?.RUNNING_IN_DOCKER === 'true' || serverEnv?.RUNNING_IN_DOCKER === 'true';
      baseUrl = isDocker ? baseUrl.replace('localhost', 'host.docker.internal') : baseUrl;
      baseUrl = isDocker ? baseUrl.replace('127.0.0.1', 'host.docker.internal') : baseUrl;
    }

    const headers: Record<string, string> = {};

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseUrl}/v1/models`, { headers });
    const res = (await response.json()) as { data?: Array<{ id: string; context_window?: number }> };

    if (!res?.data || !Array.isArray(res.data)) {
      return [];
    }

    return res.data.map((model) => ({
      name: model.id,
      label: model.id,
      provider: this.name,
      maxTokenAllowed: model.context_window ?? 8000,
    }));
  }

  getModelInstance(options: {
    model: string;
    serverEnv?: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { baseUrl: baseUrlFromConfig, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: 'LITELLM_API_BASE_URL',
      defaultApiTokenKey: 'LITELLM_API_KEY',
    });
    let baseUrl = baseUrlFromConfig;

    if (!baseUrl) {
      throw new Error(`Missing base URL for ${this.name} provider`);
    }

    if (typeof window === 'undefined') {
      const isDocker = process?.env?.RUNNING_IN_DOCKER === 'true' || (serverEnv as any)?.RUNNING_IN_DOCKER === 'true';
      baseUrl = isDocker ? baseUrl.replace('localhost', 'host.docker.internal') : baseUrl;
      baseUrl = isDocker ? baseUrl.replace('127.0.0.1', 'host.docker.internal') : baseUrl;
    }

    return getOpenAILikeModel(`${baseUrl}/v1`, apiKey ?? '', model);
  }
}
