/**
 * ローカルモデルProviderのルーティング
 */

import type { LocalModelProvider } from './index';
import type { ModelConfig } from './types';
import { OllamaProvider } from './providers/ollamaProvider';
import { LlamaCppServerProvider } from './providers/llamaCppProvider';

/**
 * プロバイダーインスタンスのキャッシュ
 */
const providerCache = new Map<string, LocalModelProvider>();

/**
 * モデル設定からプロバイダーを取得
 */
export function getProviderForModel(modelConfig: ModelConfig): LocalModelProvider {
  const cacheKey = `${modelConfig.provider}:${modelConfig.apiUrl || 'default'}`;
  
  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey)!;
  }

  let provider: LocalModelProvider;

  switch (modelConfig.provider) {
    case 'ollama':
      provider = new OllamaProvider(modelConfig.apiUrl);
      break;
    case 'llamacpp':
      provider = new LlamaCppServerProvider(modelConfig.apiUrl);
      break;
    default:
      throw new Error(`未知のプロバイダー: ${modelConfig.provider}`);
  }

  providerCache.set(cacheKey, provider);
  return provider;
}

/**
 * モデルIDからモデル設定を取得（デフォルト実装）
 * 将来的には設定データベースから取得する
 */
export function getModelConfig(modelId: string): ModelConfig {
  // LFM2 8B-A1Bの設定
  if (modelId === 'lfm2-8b-a1b-q4-k-m' || modelId.includes('LFM2-8B-A1B')) {
    const apiUrl = typeof window !== 'undefined' 
      ? (localStorage.getItem('NEXT_PUBLIC_LLAMA_CPP_API_URL') || process.env.NEXT_PUBLIC_LLAMA_CPP_API_URL || 'http://localhost:8080')
      : (process.env.NEXT_PUBLIC_LLAMA_CPP_API_URL || 'http://localhost:8080');
    
    return {
      id: 'lfm2-8b-a1b-q4-k-m',
      name: 'LFM2-8B-A1B (Q4_K_M)',
      provider: 'llamacpp',
      apiUrl: apiUrl,
    };
  }
  
  // GGUFファイルパス（.ggufで終わる）の場合はllamacppとして扱う
  if (modelId.endsWith('.gguf')) {
    const apiUrl = typeof window !== 'undefined' 
      ? (localStorage.getItem('NEXT_PUBLIC_LLAMA_CPP_API_URL') || process.env.NEXT_PUBLIC_LLAMA_CPP_API_URL || 'http://localhost:8080')
      : (process.env.NEXT_PUBLIC_LLAMA_CPP_API_URL || 'http://localhost:8080');
    
    return {
      id: modelId,
      name: modelId,
      provider: 'llamacpp',
      modelPath: modelId,
      apiUrl: apiUrl,
    };
  }

  // デフォルト: Ollamaとして扱う
  // Phase 4で設定画面から取得できるようにする
  return {
    id: modelId,
    name: modelId,
    provider: 'ollama',
  };
}

/**
 * モデルIDがローカルモデルかどうかを判定
 */
export function isLocalModel(modelId: string): boolean {
  return (
    modelId.startsWith('qwen') ||
    modelId.startsWith('llama') ||
    modelId.startsWith('mistral') ||
    modelId.includes(':latest') ||
    modelId.includes(':instruct') ||
    modelId.endsWith('.gguf') ||
    modelId === 'lfm2-8b-a1b-q4-k-m' ||
    modelId.includes('LFM2')
  );
}

