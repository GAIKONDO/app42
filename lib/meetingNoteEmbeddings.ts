/**
 * 議事録埋め込みの管理ユーティリティ
 * ナレッジグラフRAG検索用の議事録埋め込み機能を提供
 */

import { generateEmbedding } from './embeddings';
import type { MeetingNote } from '@/lib/orgApi';
import { getMeetingNoteById } from '@/lib/orgApi/meetingNotes';
import { saveMeetingNoteEmbeddingToSupabase, saveMeetingNoteItemEmbeddingToSupabase } from './vectorSearchSupabase';
import type { MonthContent } from '@/app/organization/detail/meeting/types';

/**
 * 現在の埋め込みバージョン
 */
export const CURRENT_EMBEDDING_VERSION = '1.0';

/**
 * 現在の埋め込みモデル
 */
export const CURRENT_EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * 議事録埋め込みを保存
 */
export async function saveMeetingNoteEmbedding(
  meetingNoteId: string,
  organizationId: string,
  meetingNote: MeetingNote
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('議事録埋め込みの保存はクライアント側でのみ実行可能です');
  }
  
  const orgOrCompanyId = meetingNote.companyId || organizationId || meetingNote.organizationId || '';
  
  if (!orgOrCompanyId) {
    console.warn(`[saveMeetingNoteEmbedding] organizationIdもcompanyIdも設定されていません: ${meetingNoteId}`);
    return;
  }
  
  try {
    // 埋め込みテキストを構築
    const parts: string[] = [];
    
    if (meetingNote.title) {
      parts.push(meetingNote.title);
      parts.push(meetingNote.title); // タイトルを強調
    }
    
    if (meetingNote.description) {
      parts.push(meetingNote.description);
    }
    
    if (meetingNote.content) {
      parts.push(meetingNote.content);
    }
    
    const combinedText = parts.join('\n\n').trim();
    
    if (!combinedText) {
      console.warn(`[saveMeetingNoteEmbedding] 埋め込みテキストが空です: ${meetingNoteId}`);
      return;
    }
    
    // 埋め込みを生成
    const embedding = await generateEmbedding(combinedText);
    
    // Supabaseに保存
    await saveMeetingNoteEmbeddingToSupabase(
      meetingNoteId,
      meetingNote.organizationId || null,
      meetingNote.companyId || null,
      embedding,
      {
        title: meetingNote.title,
        description: meetingNote.description,
        content: meetingNote.content,
        embeddingModel: CURRENT_EMBEDDING_MODEL,
        embeddingVersion: CURRENT_EMBEDDING_VERSION,
      }
    );
    
    console.log(`✅ [saveMeetingNoteEmbedding] 議事録埋め込み保存完了: ${meetingNoteId}`);
  } catch (error: any) {
    console.error(`❌ [saveMeetingNoteEmbedding] 議事録 ${meetingNoteId} の埋め込み保存エラー:`, {
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

/**
 * 議事録埋め込みを非同期で保存
 */
export async function saveMeetingNoteEmbeddingAsync(
  meetingNoteId: string,
  organizationId: string
): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const meetingNote = await getMeetingNoteById(meetingNoteId);
    if (!meetingNote) {
      console.warn(`[saveMeetingNoteEmbeddingAsync] 議事録が見つかりません: ${meetingNoteId}`);
      return false;
    }
    
    await saveMeetingNoteEmbedding(meetingNoteId, organizationId, meetingNote);
    return true;
  } catch (error: any) {
    console.error(`❌ [saveMeetingNoteEmbeddingAsync] 議事録 ${meetingNoteId} の埋め込み生成エラー:`, {
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

/**
 * 議事録アイテム埋め込みを保存
 */
export async function saveMeetingNoteItemEmbedding(
  meetingNoteId: string,
  itemId: string,
  organizationId: string,
  item: {
    title: string;
    content: string;
  }
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('議事録アイテム埋め込みの保存はクライアント側でのみ実行可能です');
  }
  
  if (!organizationId) {
    console.warn(`[saveMeetingNoteItemEmbedding] organizationIdが設定されていません: ${meetingNoteId}, ${itemId}`);
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
      console.warn(`[saveMeetingNoteItemEmbedding] 埋め込みテキストが空です: ${meetingNoteId}, ${itemId}`);
      return;
    }
    
    // 埋め込みを生成
    const embedding = await generateEmbedding(combinedText);
    
    // 議事録情報を取得してcompanyIdを取得
    const meetingNote = await getMeetingNoteById(meetingNoteId);
    const companyId = meetingNote?.companyId || null;
    const orgId = meetingNote?.organizationId || organizationId;
    
    // Supabaseに保存
    await saveMeetingNoteItemEmbeddingToSupabase(
      meetingNoteId,
      itemId,
      orgId || null,
      companyId,
      embedding,
      {
        title: item.title,
        content: item.content,
        embeddingModel: CURRENT_EMBEDDING_MODEL,
        embeddingVersion: CURRENT_EMBEDDING_VERSION,
      }
    );
    
    console.log(`✅ [saveMeetingNoteItemEmbedding] 議事録アイテム埋め込み保存完了: ${meetingNoteId}, ${itemId}`);
  } catch (error: any) {
    console.error(`❌ [saveMeetingNoteItemEmbedding] 議事録アイテム ${meetingNoteId}, ${itemId} の埋め込み保存エラー:`, {
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

/**
 * 議事録アイテム埋め込みを非同期で保存
 */
export async function saveMeetingNoteItemEmbeddingAsync(
  meetingNoteId: string,
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
    await saveMeetingNoteItemEmbedding(meetingNoteId, itemId, organizationId, item);
    return true;
  } catch (error: any) {
    console.error(`❌ [saveMeetingNoteItemEmbeddingAsync] 議事録アイテム ${meetingNoteId}, ${itemId} の埋め込み生成エラー:`, {
      error: error?.message || String(error),
      stack: error?.stack,
      timestamp: new Date().toISOString(),
    });
    return false;
  }
}

