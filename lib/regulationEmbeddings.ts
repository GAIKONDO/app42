/**
 * 制度埋め込みの管理ユーティリティ
 * ナレッジグラフRAG検索用の制度埋め込み機能を提供
 */

import { generateEmbedding } from './embeddings';
import type { Regulation } from '@/lib/orgApi';
import { getRegulationById } from '@/lib/orgApi/regulations';
import { saveRegulationEmbeddingToSupabase, saveRegulationItemEmbeddingToSupabase } from './vectorSearchSupabase';

/**
 * 現在の埋め込みバージョン
 */
export const CURRENT_EMBEDDING_VERSION = '1.0';

/**
 * 現在の埋め込みモデル
 */
export const CURRENT_EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * 制度埋め込みを保存
 */
export async function saveRegulationEmbedding(
  regulationId: string,
  organizationId: string,
  regulation: Regulation
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('制度埋め込みの保存はクライアント側でのみ実行可能です');
  }
  
  if (!organizationId) {
    console.warn(`[saveRegulationEmbedding] organizationIdが設定されていません: ${regulationId}`);
    return;
  }
  
  try {
    // 埋め込みテキストを構築
    const parts: string[] = [];
    
    if (regulation.title) {
      parts.push(regulation.title);
      parts.push(regulation.title); // タイトルを強調
    }
    
    if (regulation.description) {
      parts.push(regulation.description);
    }
    
    if (regulation.content) {
      parts.push(regulation.content);
    }
    
    const combinedText = parts.join('\n\n').trim();
    
    if (!combinedText) {
      console.warn(`[saveRegulationEmbedding] 埋め込みテキストが空です: ${regulationId}`);
      return;
    }
    
    // 埋め込みを生成
    const embedding = await generateEmbedding(combinedText);
    
    // Supabaseに保存
    await saveRegulationEmbeddingToSupabase(
      regulationId,
      organizationId,
      embedding,
      {
        title: regulation.title,
        description: regulation.description,
        content: regulation.content,
        embeddingModel: CURRENT_EMBEDDING_MODEL,
        embeddingVersion: CURRENT_EMBEDDING_VERSION,
      }
    );
    
    console.log(`✅ [saveRegulationEmbedding] 制度埋め込み保存完了: ${regulationId}`);
  } catch (error: any) {
    console.error(`❌ [saveRegulationEmbedding] 制度 ${regulationId} の埋め込み保存エラー:`, {
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

/**
 * 制度埋め込みを非同期で保存
 */
export async function saveRegulationEmbeddingAsync(
  regulationId: string,
  organizationId: string
): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const regulation = await getRegulationById(regulationId);
    if (!regulation) {
      console.warn(`[saveRegulationEmbeddingAsync] 制度が見つかりません: ${regulationId}`);
      return false;
    }
    
    await saveRegulationEmbedding(regulationId, organizationId, regulation);
    return true;
  } catch (error: any) {
    console.error(`❌ [saveRegulationEmbeddingAsync] 制度 ${regulationId} の埋め込み生成エラー:`, {
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

/**
 * 制度アイテム埋め込みを保存
 */
export async function saveRegulationItemEmbedding(
  regulationId: string,
  itemId: string,
  organizationId: string,
  item: {
    title: string;
    content: string;
  }
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('制度アイテム埋め込みの保存はクライアント側でのみ実行可能です');
  }
  
  if (!organizationId) {
    console.warn(`[saveRegulationItemEmbedding] organizationIdが設定されていません: ${regulationId}, ${itemId}`);
    return;
  }
  
  try {
    // 埋め込みテキストを構築
    const parts: string[] = [];
    
    if (item.title) {
      parts.push(item.title);
      parts.push(item.title); // タイトルを強調
    }
    
    if (item.content) {
      parts.push(item.content);
    }
    
    const combinedText = parts.join('\n\n').trim();
    
    if (!combinedText) {
      console.warn(`[saveRegulationItemEmbedding] 埋め込みテキストが空です: ${regulationId}, ${itemId}`);
      return;
    }
    
    // 埋め込みを生成
    const embedding = await generateEmbedding(combinedText);
    
    // Supabaseに保存
    await saveRegulationItemEmbeddingToSupabase(
      regulationId,
      itemId,
      organizationId,
      embedding,
      {
        title: item.title,
        content: item.content,
        embeddingModel: CURRENT_EMBEDDING_MODEL,
        embeddingVersion: CURRENT_EMBEDDING_VERSION,
      }
    );
    
    console.log(`✅ [saveRegulationItemEmbedding] 制度アイテム埋め込み保存完了: ${regulationId}, ${itemId}`);
  } catch (error: any) {
    console.error(`❌ [saveRegulationItemEmbedding] 制度アイテム ${regulationId}, ${itemId} の埋め込み保存エラー:`, {
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

/**
 * 制度アイテム埋め込みを非同期で保存
 */
export async function saveRegulationItemEmbeddingAsync(
  regulationId: string,
  itemId: string,
  organizationId: string,
  item: {
    title: string;
    content: string;
  }
): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    await saveRegulationItemEmbedding(regulationId, itemId, organizationId, item);
    return true;
  } catch (error: any) {
    console.error(`❌ [saveRegulationItemEmbeddingAsync] 制度アイテム ${regulationId}, ${itemId} の埋め込み生成エラー:`, {
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

