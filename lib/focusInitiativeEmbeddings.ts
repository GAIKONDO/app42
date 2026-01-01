/**
 * 注力施策埋め込みの管理ユーティリティ
 * ナレッジグラフRAG検索用の注力施策埋め込み機能を提供
 */

import { generateEmbedding } from './embeddings';
import type { FocusInitiative } from '@/lib/orgApi';
import { getFocusInitiativeById } from '@/lib/orgApi/focusInitiatives';
import { saveFocusInitiativeEmbeddingToSupabase } from './vectorSearchSupabase';

/**
 * 現在の埋め込みバージョン
 */
export const CURRENT_EMBEDDING_VERSION = '1.0';

/**
 * 現在の埋め込みモデル
 */
export const CURRENT_EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * 注力施策埋め込みを保存
 */
export async function saveFocusInitiativeEmbedding(
  focusInitiativeId: string,
  organizationId: string,
  focusInitiative: FocusInitiative
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('注力施策埋め込みの保存はクライアント側でのみ実行可能です');
  }
  
  const orgOrCompanyId = focusInitiative.companyId || organizationId || focusInitiative.organizationId || '';
  
  if (!orgOrCompanyId) {
    console.warn(`[saveFocusInitiativeEmbedding] organizationIdもcompanyIdも設定されていません: ${focusInitiativeId}`);
    return;
  }
  
  try {
    // 埋め込みテキストを構築
    const parts: string[] = [];
    
    if (focusInitiative.title) {
      parts.push(focusInitiative.title);
      parts.push(focusInitiative.title); // タイトルを強調
    }
    
    if (focusInitiative.description) {
      parts.push(focusInitiative.description);
    }
    
    if (focusInitiative.content) {
      parts.push(focusInitiative.content);
    }
    
    const combinedText = parts.join('\n\n').trim();
    
    if (!combinedText) {
      console.warn(`[saveFocusInitiativeEmbedding] 埋め込みテキストが空です: ${focusInitiativeId}`);
      return;
    }
    
    // 埋め込みを生成
    const embedding = await generateEmbedding(combinedText);
    
    // Supabaseに保存
    await saveFocusInitiativeEmbeddingToSupabase(
      focusInitiativeId,
      focusInitiative.organizationId || null,
      focusInitiative.companyId || null,
      embedding,
      {
        title: focusInitiative.title,
        description: focusInitiative.description,
        content: focusInitiative.content,
        embeddingModel: CURRENT_EMBEDDING_MODEL,
        embeddingVersion: CURRENT_EMBEDDING_VERSION,
      }
    );
    
    console.log(`✅ [saveFocusInitiativeEmbedding] 注力施策埋め込み保存完了: ${focusInitiativeId}`);
  } catch (error: any) {
    console.error(`❌ [saveFocusInitiativeEmbedding] 注力施策 ${focusInitiativeId} の埋め込み保存エラー:`, {
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

/**
 * 注力施策埋め込みを非同期で保存
 */
export async function saveFocusInitiativeEmbeddingAsync(
  focusInitiativeId: string,
  organizationId: string
): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const focusInitiative = await getFocusInitiativeById(focusInitiativeId);
    if (!focusInitiative) {
      console.warn(`[saveFocusInitiativeEmbeddingAsync] 注力施策が見つかりません: ${focusInitiativeId}`);
      return false;
    }
    
    await saveFocusInitiativeEmbedding(focusInitiativeId, organizationId, focusInitiative);
    return true;
  } catch (error: any) {
    console.error(`❌ [saveFocusInitiativeEmbeddingAsync] 注力施策 ${focusInitiativeId} の埋め込み生成エラー:`, {
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

