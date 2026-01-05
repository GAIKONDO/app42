/**
 * 利用可能なローカルモデル（Ollama + LlamaCpp）を取得
 */
import { OllamaProvider } from './providers/ollamaProvider';
import { LlamaCppServerProvider } from './providers/llamaCppProvider';

export async function getAvailableLocalModels(): Promise<Array<{
  name: string;
  model: string;
  size: number;
  provider: 'ollama' | 'llamacpp';
}>> {
  const models: Array<{
    name: string;
    model: string;
    size: number;
    provider: 'ollama' | 'llamacpp';
  }> = [];

  // Ollamaモデルを取得
  try {
    const ollamaProvider = new OllamaProvider();
    const ollamaModels = await ollamaProvider.listModels();
    models.push(...ollamaModels.map(m => ({
      name: m.name,
      model: m.id,
      size: m.size || 0,
      provider: 'ollama' as const,
    })));
  } catch (error) {
    console.warn('Ollamaモデルの取得に失敗:', error);
  }

  // LlamaCppServerProviderモデルを取得
  try {
    const apiUrl = typeof window !== 'undefined' 
      ? (localStorage.getItem('NEXT_PUBLIC_LLAMA_CPP_API_URL') || process.env.NEXT_PUBLIC_LLAMA_CPP_API_URL || 'http://localhost:8080')
      : (process.env.NEXT_PUBLIC_LLAMA_CPP_API_URL || 'http://localhost:8080');
    
    const llamacppProvider = new LlamaCppServerProvider(apiUrl);
    const llamacppModels = await llamacppProvider.listModels();
    
    // LFM2 8B-A1Bを手動で追加（listModelsが空の場合、またはサーバーが起動している場合）
    if (llamacppModels.length === 0) {
      // サーバーが起動しているか確認
      try {
        const healthCheck = await fetch(`${apiUrl}/health`).catch(() => null);
        if (healthCheck?.ok || healthCheck?.status === 404) {
          // サーバーが起動している場合はLFM2 8B-A1Bを追加
          models.push({
            name: 'LFM2-8B-A1B (Q4_K_M)',
            model: 'lfm2-8b-a1b-q4-k-m',
            size: 5.04 * 1024 * 1024 * 1024, // 5.04GB
            provider: 'llamacpp' as const,
          });
        }
      } catch (e) {
        // サーバーが起動していない場合はスキップ
        console.warn('LlamaCpp Serverの接続確認に失敗:', e);
      }
    } else {
      models.push(...llamacppModels.map(m => ({
        name: m.name,
        model: m.id,
        size: m.size || 0,
        provider: 'llamacpp' as const,
      })));
    }
  } catch (error) {
    console.warn('LlamaCppServerProviderモデルの取得に失敗:', error);
    
    // エラーが発生しても、サーバーが起動している可能性があるので確認
    try {
      const apiUrl = typeof window !== 'undefined' 
        ? (localStorage.getItem('NEXT_PUBLIC_LLAMA_CPP_API_URL') || process.env.NEXT_PUBLIC_LLAMA_CPP_API_URL || 'http://localhost:8080')
        : (process.env.NEXT_PUBLIC_LLAMA_CPP_API_URL || 'http://localhost:8080');
      
      const healthCheck = await fetch(`${apiUrl}/health`).catch(() => null);
      if (healthCheck?.ok || healthCheck?.status === 404) {
        // サーバーが起動している場合はLFM2 8B-A1Bを追加
        models.push({
          name: 'LFM2-8B-A1B (Q4_K_M)',
          model: 'lfm2-8b-a1b-q4-k-m',
          size: 5.04 * 1024 * 1024 * 1024, // 5.04GB
          provider: 'llamacpp' as const,
        });
      }
    } catch (e) {
      // 無視
    }
  }

  return models;
}

