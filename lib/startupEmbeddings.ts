/**
 * スタートアップ埋め込みの管理ユーティリティ
 * ナレッジグラフRAG検索用のスタートアップ埋め込み機能を提供
 */

import { generateEmbedding } from './embeddings';
import type { Startup } from '@/lib/orgApi';
import { getStartupById } from '@/lib/orgApi/startups';
import { saveStartupEmbeddingToSupabase } from './vectorSearchSupabase';

/**
 * 現在の埋め込みバージョン
 */
export const CURRENT_EMBEDDING_VERSION = '1.0';

/**
 * 現在の埋め込みモデル
 */
export const CURRENT_EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * スタートアップ埋め込みを保存
 */
export async function saveStartupEmbedding(
  startupId: string,
  organizationId: string,
  startup: Startup
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('スタートアップ埋め込みの保存はクライアント側でのみ実行可能です');
  }
  
  const orgOrCompanyId = startup.companyId || organizationId || startup.organizationId || '';
  
  if (!orgOrCompanyId) {
    console.warn(`[saveStartupEmbedding] organizationIdもcompanyIdも設定されていません: ${startupId}`);
    return;
  }
  
  try {
    // 埋め込みテキストを構築
    const parts: string[] = [];
    
    if (startup.title) {
      parts.push(startup.title);
      parts.push(startup.title); // タイトルを強調
    }
    
    if (startup.description) {
      parts.push(startup.description);
    }
    
    if (startup.content) {
      parts.push(startup.content);
    }
    
    if (startup.objective) {
      parts.push(`目標: ${startup.objective}`);
    }
    
    if (startup.evaluation) {
      parts.push(`評価: ${startup.evaluation}`);
    }
    
    // JSON形式の詳細情報をテキスト化
    if (startup.methodDetails && typeof startup.methodDetails === 'object') {
      parts.push(`手法詳細: ${JSON.stringify(startup.methodDetails)}`);
    }
    
    if (startup.competitorComparison && typeof startup.competitorComparison === 'object') {
      parts.push(`競合比較: ${JSON.stringify(startup.competitorComparison)}`);
    }
    
    if (startup.deepSearch && typeof startup.deepSearch === 'object') {
      parts.push(`深掘り検索: ${JSON.stringify(startup.deepSearch)}`);
    }
    
    const combinedText = parts.join('\n\n').trim();
    
    if (!combinedText) {
      console.warn(`[saveStartupEmbedding] 埋め込みテキストが空です: ${startupId}`);
      return;
    }
    
    // 埋め込みを生成
    const embedding = await generateEmbedding(combinedText);
    
    // Supabaseに保存
    await saveStartupEmbeddingToSupabase(
      startupId,
      startup.organizationId || null,
      startup.companyId || null,
      embedding,
      {
        title: startup.title,
        description: startup.description,
        content: startup.content,
        objective: startup.objective,
        evaluation: startup.evaluation,
        metadata: {
          methodDetails: startup.methodDetails,
          competitorComparison: startup.competitorComparison,
          deepSearch: startup.deepSearch,
        },
        embeddingModel: CURRENT_EMBEDDING_MODEL,
        embeddingVersion: CURRENT_EMBEDDING_VERSION,
      }
    );
    
    console.log(`✅ [saveStartupEmbedding] スタートアップ埋め込み保存完了: ${startupId}`);
  } catch (error: any) {
    console.error(`❌ [saveStartupEmbedding] スタートアップ ${startupId} の埋め込み保存エラー:`, {
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

/**
 * スタートアップ埋め込みを非同期で保存
 */
export async function saveStartupEmbeddingAsync(
  startupId: string,
  organizationId: string
): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const startup = await getStartupById(startupId);
    if (!startup) {
      console.warn(`[saveStartupEmbeddingAsync] スタートアップが見つかりません: ${startupId}`);
      return false;
    }
    
    await saveStartupEmbedding(startupId, organizationId, startup);
    return true;
  } catch (error: any) {
    console.error(`❌ [saveStartupEmbeddingAsync] スタートアップ ${startupId} の埋め込み生成エラー:`, {
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

