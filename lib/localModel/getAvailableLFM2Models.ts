/**
 * LFM2モデルのみを取得する関数
 */
import { LlamaCppServerProvider } from './providers/llamaCppProvider';

export async function getAvailableLFM2Models(): Promise<Array<{
  name: string;
  model: string;
  size: number;
  provider: 'llamacpp';
}>> {
  const models: Array<{
    name: string;
    model: string;
    size: number;
    provider: 'llamacpp';
  }> = [];

  // LlamaCppServerProviderモデルを取得
  try {
    const apiUrl = typeof window !== 'undefined' 
      ? (localStorage.getItem('NEXT_PUBLIC_LLAMA_CPP_API_URL') || process.env.NEXT_PUBLIC_LLAMA_CPP_API_URL || 'http://localhost:8080')
      : (process.env.NEXT_PUBLIC_LLAMA_CPP_API_URL || 'http://localhost:8080');
    
    const llamacppProvider = new LlamaCppServerProvider(apiUrl);
    const llamacppModels = await llamacppProvider.listModels();
    
    // LFM2モデルをフィルタリング（LFM2を含むモデルのみ）
    const lfm2Models = llamacppModels.filter(m => 
      m.name.toLowerCase().includes('lfm2') || 
      m.id.toLowerCase().includes('lfm2')
    );
    
    if (lfm2Models.length > 0) {
      models.push(...lfm2Models.map(m => ({
        name: m.name,
        model: m.id,
        size: m.size || 0,
        provider: 'llamacpp' as const,
      })));
    } else {
      // listModelsが空の場合、サーバーが起動しているか確認してLFM2 8B-A1Bを追加
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

