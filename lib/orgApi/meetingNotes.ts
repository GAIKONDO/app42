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
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`📖 [getAllMeetingNotes] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から取得）`);
    
    // Supabase使用時はDataSource経由で取得
    if (useSupabase) {
      try {
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
        // フォールバック: Tauriコマンド経由
        console.warn('⚠️ [getAllMeetingNotes] Supabase取得に失敗、Tauriコマンドにフォールバック:', error);
      }
    }
    
    // ローカルSQLite使用時またはフォールバック時はTauriコマンド経由
    const { callTauriCommand } = await import('../localFirebase');
    
    try {
      const result = await callTauriCommand('collection_get', {
        collectionName: 'meetingNotes',
      });
      
      console.log('📖 [getAllMeetingNotes] collection_get結果:', result);
      
      const allNotes = Array.isArray(result) ? result : [];
      console.log('📖 [getAllMeetingNotes] 全データ数:', allNotes.length);
      
      const meetingNotes = allNotes.map((item: any) => {
        const data = item.data || item;
        return {
          id: data.id || item.id,
          organizationId: data.organizationId,
          companyId: data.companyId || undefined,
          title: data.title || '',
          description: data.description || '',
          content: data.content || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as MeetingNote & { companyId?: string };
      });
      
      const sorted = meetingNotes.sort((a, b) => {
        const aTime = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt.toMillis ? a.createdAt.toMillis() : 0)) : 0;
        const bTime = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt.toMillis ? b.createdAt.toMillis() : 0)) : 0;
        return bTime - aTime;
      });
      
      console.log('✅ [getAllMeetingNotes] 取得成功（SQLiteから取得）:', sorted.length, '件');
      return sorted;
    } catch (collectionError: any) {
      console.error('📖 [getAllMeetingNotes] collection_getエラー:', collectionError);
      return [];
    }
  } catch (error) {
    console.error('❌ [getAllMeetingNotes] エラー:', error);
    return [];
  }
}

/**
 * 議事録を取得
 */
export async function getMeetingNotes(organizationId: string): Promise<MeetingNote[]> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`📖 [getMeetingNotes] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から取得）:`, { organizationId });
    
    // Supabase使用時はDataSource経由で取得
    if (useSupabase) {
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
        // フォールバック: Tauriコマンド経由
        console.warn('⚠️ [getMeetingNotes] Supabase取得に失敗、Tauriコマンドにフォールバック:', error);
      }
    }
    
    // ローカルSQLite使用時またはフォールバック時はTauriコマンド経由
    const { callTauriCommand } = await import('../localFirebase');
    
    try {
      console.log('📖 [getMeetingNotes] collection_get呼び出し前:', { collectionName: 'meetingNotes' });
      const result = await callTauriCommand('collection_get', {
        collectionName: 'meetingNotes',
      });
      
      console.log('📖 [getMeetingNotes] collection_get結果:', {
        resultType: typeof result,
        isArray: Array.isArray(result),
        resultLength: Array.isArray(result) ? result.length : 'N/A',
        resultPreview: Array.isArray(result) ? result.slice(0, 3) : result,
      });
      
      const allNotes = Array.isArray(result) ? result : [];
      console.log('📖 [getMeetingNotes] 全データ数:', allNotes.length);
      
      if (allNotes.length > 0) {
        console.log('📖 [getMeetingNotes] サンプルデータ:', {
          firstNote: allNotes[0],
          sampleIds: allNotes.slice(0, 5).map((item: any) => ({
            id: item.id || item.data?.id,
            organizationId: item.data?.organizationId || item.organizationId,
            title: item.data?.title || item.title,
          })),
        });
      }
      
      const filtered = allNotes
        .filter((item: any) => {
          const data = item.data || item;
          const matches = data.organizationId === organizationId;
          if (!matches && allNotes.length > 0) {
            console.log('📖 [getMeetingNotes] フィルタ除外:', {
              itemId: data.id || item.id,
              itemOrganizationId: data.organizationId,
              targetOrganizationId: organizationId,
              match: matches,
            });
          }
          return matches;
        })
        .map((item: any) => {
          const data = item.data || item;
          return {
            id: data.id || item.id,
            organizationId: data.organizationId,
            title: data.title || '',
            description: data.description || '',
            content: data.content || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
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
      
      console.log('📖 [getMeetingNotes] 最終結果:', {
        count: sorted.length,
        notes: sorted.map(n => ({ id: n.id, title: n.title, organizationId: n.organizationId })),
      });
      return sorted;
    } catch (collectionError: any) {
      console.error('📖 [getMeetingNotes] collection_getエラー:', {
        error: collectionError,
        errorMessage: collectionError?.message,
        errorStack: collectionError?.stack,
        collectionName: 'meetingNotes',
      });
      return [];
    }
  } catch (error: any) {
    console.error('❌ [getMeetingNotes] エラー:', {
      error,
      errorMessage: error?.message,
      errorStack: error?.stack,
      organizationId,
    });
    return [];
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
  try {
    console.log('📖 [getMeetingNoteById] 開始:', { noteId });
    
    if (!noteId || noteId.trim() === '') {
      console.warn('📖 [getMeetingNoteById] 議事録IDが空です');
      return null;
    }
    
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    
    // Supabase使用時は直接Supabaseから取得（パフォーマンス最適化）
    if (useSupabase) {
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
        
        // データが見つからない、またはタイムアウトの場合はフォールバック
        console.debug('📖 [getMeetingNoteById] Supabaseから取得できませんでした。Tauriコマンドにフォールバックします');
      } catch (error: any) {
        const errorMessage = error?.message || String(error || '');
        // エラーログを抑制（Load failedなどのネットワークエラーは正常なフォールバック）
        console.debug('📖 [getMeetingNoteById] Supabase取得エラー（フォールバック）:', errorMessage);
      }
    }
    
    // ローカルSQLite使用時またはフォールバック時はTauriコマンド経由
    const { callTauriCommand } = await import('../localFirebase');
    
    try {
      const result = await callTauriCommand('doc_get', {
        collectionName: 'meetingNotes',
        docId: noteId.trim(),
      });
      
      console.log('📖 [getMeetingNoteById] doc_get結果:', {
        hasResult: !!result,
        hasData: !!(result && result.data),
        resultKeys: result ? Object.keys(result) : [],
      });
      
      const data = (result && result.data) ? result.data : result;
      
      if (data && (data.id || data.title || data.organizationId)) {
        const note: MeetingNote = {
          id: data.id || noteId,
          organizationId: data.organizationId || '',
          companyId: data.companyId || undefined,
          title: data.title || '',
          description: data.description || '',
          content: data.content || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
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
      
      console.warn('📖 [getMeetingNoteById] データが見つかりませんでした。result:', result);
      return null;
    } catch (docError: any) {
      console.error('📖 [getMeetingNoteById] doc_getエラー:', docError);
      return null;
    }
  } catch (error: any) {
    console.error('❌ [getMeetingNoteById] エラー:', error);
    return null;
  }
}

/**
 * 議事録を削除
 * 関連するtopics、relationsも削除する
 * Supabase使用時はCASCADE制約により自動削除、SQLite使用時はバッチ削除を使用
 */
export async function deleteMeetingNote(noteId: string): Promise<void> {
  const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
  console.log(`🗑️ [deleteMeetingNote] 開始（${useSupabase ? 'Supabase' : 'SQLite'}経由）:`, noteId);
  
  const { callTauriCommand } = await import('../localFirebase');
  
  let topicEmbeddings: any[] = [];
  try {
    const result = await callTauriCommand('query_get', {
      collectionName: 'topics',
      conditions: {
        meetingNoteId: noteId,
      },
    });
    topicEmbeddings = Array.isArray(result) ? result : (result?.data ? [result.data] : []);
    console.log(`📊 [deleteMeetingNote] 関連するtopics: ${topicEmbeddings.length}件（ChromaDB削除用）`);
  } catch (error: any) {
    console.warn('⚠️ [deleteMeetingNote] topicsの取得エラー（ChromaDB削除用、続行します）:', error);
  }
  
  let meetingNote: MeetingNote | null = null;
  try {
    meetingNote = await getMeetingNoteById(noteId);
  } catch (error: any) {
    console.warn('⚠️ [deleteMeetingNote] 議事録情報の取得エラー（ChromaDB削除用、続行します）:', error);
  }
  
  // Supabase使用時はDataSource経由で削除（CASCADE制約により関連データも自動削除）
  if (useSupabase) {
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
  } else {
    // SQLite使用時はバッチ削除コマンドを使用
    try {
      console.log('🗑️ [deleteMeetingNote] バッチ削除コマンドを呼び出します:', noteId);
      await retryDbOperation(async () => {
        const result = await callTauriCommand('delete_meeting_note_with_relations', {
          noteId: noteId,
        });
        console.log('✅ [deleteMeetingNote] バッチ削除成功:', noteId, result);
        return result;
      }, 5, 300);
      
      console.log(`✅ [deleteMeetingNote] 削除成功: ${noteId}`);
    } catch (error: any) {
      const errorMessage = error?.message || 
                          error?.error || 
                          error?.errorString || 
                          (typeof error === 'string' ? error : String(error || ''));
      
      console.error('❌ [deleteMeetingNote] バッチ削除失敗:', {
        error,
        errorMessage,
        errorType: typeof error,
        errorKeys: error ? Object.keys(error) : [],
        noteId,
      });
      
      if (errorMessage.includes('database is locked') || errorMessage.includes('locked')) {
        console.log('🔄 [deleteMeetingNote] データベースロック検出、1秒待機後に再試行...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          await retryDbOperation(async () => {
            const result = await callTauriCommand('delete_meeting_note_with_relations', {
              noteId: noteId,
            });
            console.log('✅ [deleteMeetingNote] バッチ削除成功（再試行）:', noteId, result);
            return result;
          }, 5, 300);
          console.log('✅ [deleteMeetingNote] 削除成功（再試行後）:', noteId);
        } catch (retryError: any) {
          const retryErrorMessage = retryError?.message || 
                                   retryError?.error || 
                                   String(retryError || '');
          console.error('❌ [deleteMeetingNote] 再試行も失敗:', {
            retryError,
            retryErrorMessage,
            noteId,
          });
          throw new Error(`議事録の削除に失敗しました（データベースロック）: ${retryErrorMessage || '不明なエラー'}`);
        }
      } else {
        throw new Error(`議事録の削除に失敗しました: ${errorMessage || '不明なエラー'}`);
      }
    }
  }
  
  // ChromaDBからも削除（非同期、エラーは無視）
  if (meetingNote && topicEmbeddings.length > 0) {
    (async () => {
      try {
        const { callTauriCommand: chromaCallTauriCommand } = await import('../localFirebase');
        
        for (const topicEmbedding of topicEmbeddings) {
          const topicEmbeddingData = topicEmbedding.data || topicEmbedding;
          const topicId = topicEmbeddingData.topicId;
          if (!topicId) continue;
          
          try {
            await chromaCallTauriCommand('chromadb_delete_topic_embedding', {
              topicId: topicId,
              organizationId: meetingNote.organizationId,
            });
            console.log(`✅ [deleteMeetingNote] ChromaDBトピック埋め込み削除: ${topicId}`);
          } catch (error: any) {
            console.warn(`⚠️ [deleteMeetingNote] ChromaDBトピック埋め込み削除エラー（続行します）: ${topicId}`, error);
          }
        }
      } catch (error: any) {
        console.warn('⚠️ [deleteMeetingNote] ChromaDB削除エラー（続行します）:', error);
      }
    })();
  }
}

