import { doc, getDoc, setDoc } from '../firestore';
import type { MeetingNote } from './types';
import { generateUniqueMeetingNoteId, retryDbOperation } from './utils';
import * as path from 'path';

/**
 * 議事録のJSONファイルパスを取得するヘルパー関数
 */
async function getMeetingNoteJsonPath(noteId: string): Promise<string> {
  try {
    const { callTauriCommand } = await import('../localFirebase');
    const appDataPath = await callTauriCommand('get_path', {}) as string;
    const meetingNotesDir = path.join(appDataPath, 'meetingNotes');
    return path.join(meetingNotesDir, `${noteId}.json`);
  } catch (error) {
    console.error('アプリデータディレクトリの取得に失敗しました:', error);
    throw error;
  }
}

/**
 * JSONファイルに保存
 */
async function saveMeetingNoteToJson(note: MeetingNote): Promise<void> {
  try {
    const { callTauriCommand } = await import('../localFirebase');
    const filePath = await getMeetingNoteJsonPath(note.id);
    const jsonString = JSON.stringify(note, null, 2);
    const result = await callTauriCommand('write_file', {
      filePath: filePath,
      data: jsonString,
    });
    
    if (!result.success) {
      throw new Error(result.error || 'JSONファイルの保存に失敗しました');
    }
    
    console.log('✅ [saveMeetingNoteToJson] JSONファイルに保存成功:', filePath);
  } catch (error: any) {
    console.error('❌ [saveMeetingNoteToJson] JSONファイルの保存に失敗しました:', error);
    throw error;
  }
}

/**
 * すべての議事録を取得（組織ID指定なし）
 */
export async function getAllMeetingNotes(): Promise<MeetingNote[]> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('📖 [getAllMeetingNotes] 開始（Supabaseから取得）');
    
    const { getCollectionViaDataSource } = await import('../dataSourceAdapter');
    // PostgreSQLでは大文字小文字を区別しないため、小文字でアクセス
    const result = await getCollectionViaDataSource('meetingnotes');
    
    // Supabaseから取得したデータは既に配列形式
    const allNotes = Array.isArray(result) ? result : [];
    console.log('📖 [getAllMeetingNotes] Supabaseから取得:', allNotes.length, '件');
    
    const meetingNotes = allNotes.map((item: any) => {
      // Supabaseから取得したデータは直接オブジェクト形式
      const data = item;
      return {
        id: data.id,
        organizationId: data.organizationId || data.organizationid,
        companyId: data.companyId || data.companyid || undefined,
        title: data.title || '',
        description: data.description || '',
        content: data.content || '',
        createdAt: data.createdAt || data.createdat,
        updatedAt: data.updatedAt || data.updatedat,
      } as MeetingNote & { companyId?: string };
    });
  
    const sorted = meetingNotes.sort((a, b) => {
      const aTime = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt.toMillis ? a.createdAt.toMillis() : 0)) : 0;
      const bTime = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt.toMillis ? b.createdAt.toMillis() : 0)) : 0;
      return bTime - aTime;
    });
    
    console.log('✅ [getAllMeetingNotes] 取得成功（Supabaseから取得）:', sorted.length, '件');
    return sorted;
  } catch (error: any) {
    console.error('❌ [getAllMeetingNotes] Supabase取得エラー:', error);
    throw error;
  }
}

/**
 * 議事録を取得
 */
export async function getMeetingNotes(organizationId: string): Promise<MeetingNote[]> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('📖 [getMeetingNotes] 開始（Supabaseから取得）:', { organizationId });
    
    try {
        const { getCollectionViaDataSource } = await import('../dataSourceAdapter');
        // PostgreSQLでは大文字小文字を区別しないため、小文字でアクセス
        const result = await getCollectionViaDataSource('meetingnotes');
        
        // Supabaseから取得したデータは既に配列形式
        const allNotes = Array.isArray(result) ? result : [];
        console.log('📖 [getMeetingNotes] Supabaseから取得:', allNotes.length, '件');
        
        const filtered = allNotes
          .filter((item: any) => {
            // Supabaseから取得したデータは直接オブジェクト形式
            const data = item;
            const matches = (data.organizationId || data.organizationid) === organizationId;
            return matches;
          })
          .map((item: any) => {
            const data = item;
            return {
              id: data.id,
              organizationId: data.organizationId || data.organizationid,
              title: data.title || '',
              description: data.description || '',
              content: data.content || '',
              createdAt: data.createdAt || data.createdat,
              updatedAt: data.updatedAt || data.updatedat,
            } as MeetingNote;
          });
      
      console.log('📖 [getMeetingNotes] フィルタ後:', {
        filteredCount: filtered.length,
        filteredIds: filtered.map(n => n.id),
      });
      
      const sorted = filtered.sort((a, b) => {
        const aTime = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt.toMillis ? a.createdAt.toMillis() : 0)) : 0;
        const bTime = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt.toMillis ? b.createdAt.toMillis() : 0)) : 0;
        return bTime - aTime;
      });
      
        console.log('📖 [getMeetingNotes] 最終結果（Supabaseから取得）:', {
          count: sorted.length,
          notes: sorted.map(n => ({ id: n.id, title: n.title, organizationId: n.organizationId })),
        });
        return sorted;
      } catch (error: any) {
        console.error('❌ [getMeetingNotes] Supabase取得エラー:', error);
        throw error;
      }
  } catch (error: any) {
    console.error('❌ [getMeetingNotes] エラー:', {
      error,
      errorMessage: error?.message,
      errorStack: error?.stack,
      organizationId,
    });
    throw error;
  }
}

/**
 * 議事録を保存
 */
export async function saveMeetingNote(note: Partial<MeetingNote>): Promise<string> {
  try {
    const noteId = note.id || generateUniqueMeetingNoteId();
    console.log('💾 [saveMeetingNote] 開始:', { noteId, organizationId: note.organizationId, title: note.title });
    
    if (note.organizationId) {
      try {
        const orgDocRef = doc(null, 'organizations', note.organizationId);
        const orgDoc = await getDoc(orgDocRef);
        if (!orgDoc.exists()) {
          throw new Error(`組織ID "${note.organizationId}" がorganizationsテーブルに存在しません`);
        }
        console.log('✅ [saveMeetingNote] 組織IDの存在確認成功:', note.organizationId);
      } catch (orgCheckError: any) {
        const errorMessage = orgCheckError?.message || String(orgCheckError || '');
        if (errorMessage.includes('存在しません')) {
          throw new Error(`組織ID "${note.organizationId}" がorganizationsテーブルに存在しません。組織一覧ページから正しい組織を選択してください。`);
        }
        console.warn('⚠️ [saveMeetingNote] 組織IDの存在確認でエラー（続行します）:', errorMessage);
      }
    } else {
      throw new Error('organizationIdが指定されていません');
    }
    
    const docRef = doc(null, 'meetingNotes', noteId);
    const now = new Date().toISOString();
    
    const data: any = {
      id: noteId,
      organizationId: note.organizationId!,
      title: note.title || '',
      description: note.description || '',
      content: note.content || '',
      updatedAt: now,
    };
    
    try {
      const existingDoc = await getDoc(docRef);
      if (existingDoc.exists()) {
        const existingData = existingDoc.data() as MeetingNote;
        if (existingData?.createdAt) {
          data.createdAt = typeof existingData.createdAt === 'string' 
            ? existingData.createdAt 
            : (existingData.createdAt.toMillis ? new Date(existingData.createdAt.toMillis()).toISOString() : now);
        } else {
          data.createdAt = now;
        }
        console.log('💾 [saveMeetingNote] 既存ドキュメントを更新:', noteId);
      } else {
        data.createdAt = now;
        console.log('💾 [saveMeetingNote] 新規ドキュメントを作成:', noteId);
      }
    } catch (getDocError: any) {
      console.warn('⚠️ [saveMeetingNote] 既存ドキュメント確認エラー（新規作成として続行）:', getDocError?.message || getDocError);
      data.createdAt = now;
    }
    
    console.log('💾 [saveMeetingNote] setDoc呼び出し前:', { 
      collectionName: 'meetingNotes', 
      docId: noteId, 
      data: {
        id: data.id,
        organizationId: data.organizationId,
        title: data.title,
        description: data.description ? data.description.substring(0, 50) + '...' : '',
        content: data.content ? data.content.substring(0, 50) + '...' : '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }
    });
    
    try {
      await setDoc(docRef, data);
      console.log('✅ [saveMeetingNote] データベース保存成功:', noteId);
    } catch (setDocError: any) {
      console.error('❌ [saveMeetingNote] setDoc呼び出しエラー:', {
        error: setDocError,
        errorMessage: setDocError?.message,
        errorStack: setDocError?.stack,
        collectionName: 'meetingNotes',
        docId: noteId,
        dataKeys: Object.keys(data),
      });
      throw new Error(`議事録の保存に失敗しました: ${setDocError?.message || '不明なエラー'}`);
    }
    
    try {
      const fullNote: MeetingNote = {
        id: data.id,
        organizationId: data.organizationId,
        title: data.title,
        description: data.description,
        content: data.content,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      await saveMeetingNoteToJson(fullNote);
    } catch (jsonError) {
      console.warn('⚠️ [saveMeetingNote] JSONファイルの保存に失敗しましたが、データベースには保存済み:', jsonError);
    }
    
    return noteId;
  } catch (error: any) {
    console.error('❌ [saveMeetingNote] 保存失敗:', error);
    throw error;
  }
}

/**
 * 議事録を取得（ID指定）
 */
export async function getMeetingNoteById(noteId: string): Promise<MeetingNote | null> {
  console.log('📖 [getMeetingNoteById] 開始:', { noteId });
  
  if (!noteId || noteId.trim() === '') {
    console.warn('📖 [getMeetingNoteById] 議事録IDが空です');
    return null;
  }
  
  // Supabase専用（環境変数チェック不要）
  try {
    const { getDataSourceInstance } = await import('../dataSource');
    const dataSource = getDataSourceInstance();
    
    // タイムアウトを設定（3秒）
    const supabasePromise = dataSource.doc_get('meetingNotes', noteId.trim());
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 3000);
    });
    
    const data = await Promise.race([supabasePromise, timeoutPromise]);
    
    if (data) {
      console.log('📖 [getMeetingNoteById] Supabaseから取得したデータ:', data);
      const note: MeetingNote = {
        id: data.id || noteId,
        organizationId: data.organizationId || data.organizationid || '',
        companyId: data.companyId || data.companyid || undefined,
        title: data.title || '',
        description: data.description || '',
        content: data.content || '',
        createdAt: data.createdAt || data.createdat,
        updatedAt: data.updatedAt || data.updatedat,
      };
      
      console.log('📖 [getMeetingNoteById] 変換後:', {
        id: note.id,
        title: note.title,
        description: note.description,
        contentLength: note.content?.length || 0,
        companyId: note.companyId,
      });
      return note;
    }
    
    // データが見つからない場合はnullを返す
    console.debug('📖 [getMeetingNoteById] Supabaseから取得できませんでした');
    return null;
  } catch (error: any) {
    const errorMessage = error?.message || String(error || '');
    console.error('❌ [getMeetingNoteById] Supabase取得エラー:', errorMessage);
    return null;
  }
}

/**
 * 議事録を削除
 * 関連するtopics、relationsも削除する
 * Supabase使用時はCASCADE制約により自動削除、SQLite使用時はバッチ削除を使用
 */
export async function deleteMeetingNote(noteId: string): Promise<void> {
  // Supabase専用（環境変数チェック不要）
  console.log('🗑️ [deleteMeetingNote] 開始（Supabase経由）:', noteId);
  
  // Supabase経由で削除（CASCADE制約により関連データも自動削除）
  try {
    const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
    console.log('🗑️ [deleteMeetingNote] Supabase経由で削除します:', noteId);
    await deleteDocViaDataSource('meetingNotes', noteId);
    console.log(`✅ [deleteMeetingNote] 削除成功（Supabase）: ${noteId}`);
  } catch (error: any) {
    const errorMessage = error?.message || 
                        error?.error || 
                        (typeof error === 'string' ? error : String(error || ''));
    console.error('❌ [deleteMeetingNote] Supabase削除失敗:', {
      error,
      errorMessage,
      errorType: typeof error,
      errorKeys: error ? Object.keys(error) : [],
      noteId,
    });
    throw new Error(`議事録の削除に失敗しました: ${errorMessage || '不明なエラー'}`);
  }
}

