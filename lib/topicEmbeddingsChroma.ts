/**
 * トピック埋め込みのChromaDB管理
 * ChromaDBを使用した高速ベクトル検索
 */

import { callTauriCommand } from './localFirebase';
import { 
  generateCombinedEmbedding, 
  generateSeparatedEmbeddings,
  generateEnhancedEmbedding,
  generateMetadataEmbedding,
} from './embeddings';
import { getMeetingNoteById, getRegulationById } from './orgApi';
import type { TopicEmbedding, TopicMetadata } from '@/types/topicMetadata';

/**
 * トピック埋め込みをChromaDBに保存
 */
export async function saveTopicEmbeddingToChroma(
  topicId: string,
  meetingNoteId: string | undefined,
  organizationId: string,
  title: string,
  content: string,
  metadata?: Partial<Pick<TopicMetadata, 'keywords' | 'semanticCategory' | 'tags' | 'summary' | 'importance'>>,
  regulationId?: string
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('トピック埋め込みの保存はクライアント側でのみ実行可能です');
  }

  // タイトルが空の場合の警告とフォールバック処理
  if (!title || title.trim() === '') {
    console.warn(`[saveTopicEmbeddingToChroma] ⚠️ タイトルが空です: topicId=${topicId}, meetingNoteId=${meetingNoteId}, regulationId=${regulationId}`);
    console.warn(`[saveTopicEmbeddingToChroma] contentの最初の50文字: ${content?.substring(0, 50) || 'なし'}`);
    
    // contentからタイトルを推測（最初の50文字）
    if (content && content.trim() !== '') {
      title = content.substring(0, 50).trim();
      if (content.length > 50) {
        title += '...';
      }
      console.log(`[saveTopicEmbeddingToChroma] contentからタイトルを生成: ${title}`);
    } else {
      // 最後の手段としてtopicIdを使用
      title = `トピック ${topicId}`;
      console.log(`[saveTopicEmbeddingToChroma] topicIdをタイトルとして使用: ${title}`);
    }
  }

  try {
    const now = new Date().toISOString();
    const embeddingVersion = metadata ? '2.0' : '1.0';

    // 埋め込みを生成
    let combinedEmbedding: number[] | undefined;
    let titleEmbedding: number[] | undefined;
    let contentEmbedding: number[] | undefined;
    let metadataEmbedding: number[] | undefined;

    if (metadata && (metadata.keywords || metadata.semanticCategory || metadata.tags)) {
      // メタデータがある場合: 分離埋め込み + メタデータ埋め込みを生成
      try {
        const separated = await generateSeparatedEmbeddings(title, content);
        titleEmbedding = separated.titleEmbedding;
        contentEmbedding = separated.contentEmbedding;
        
        // メタデータの埋め込みを生成
        try {
          metadataEmbedding = await generateMetadataEmbedding({
            keywords: metadata.keywords,
            semanticCategory: metadata.semanticCategory,
            tags: metadata.tags,
            summary: metadata.summary,
          });
        } catch (error) {
          console.warn('メタデータ埋め込みの生成に失敗しました:', error);
        }
        
        // 後方互換性のため、combinedEmbeddingも生成
        combinedEmbedding = await generateEnhancedEmbedding(
          title,
          content,
          {
            keywords: metadata.keywords,
            semanticCategory: metadata.semanticCategory,
            tags: metadata.tags,
            summary: metadata.summary,
          }
        );
      } catch (error) {
        console.warn('分離埋め込みの生成に失敗しました。従来の方法を使用します:', error);
        combinedEmbedding = await generateCombinedEmbedding(title, content);
      }
    } else {
      // メタデータがない場合: 従来の方法
      combinedEmbedding = await generateCombinedEmbedding(title, content);
    }

    // 埋め込みベクトルの次元数をチェック
    if (combinedEmbedding && combinedEmbedding.length !== 1536) {
      throw new Error(`埋め込みベクトルの次元数が一致しません。期待値: 1536, 実際: ${combinedEmbedding.length}`);
    }

    // 議事録または制度のタイトルを取得
    let parentTitle = '';
    const parentId = meetingNoteId || regulationId;
    
    if (meetingNoteId) {
      try {
        const meetingNote = await getMeetingNoteById(meetingNoteId);
        if (meetingNote && meetingNote.title) {
          parentTitle = meetingNote.title;
        }
      } catch (error) {
        console.warn('議事録タイトルの取得に失敗しました:', error);
      }
    } else if (regulationId) {
      try {
        const regulation = await getRegulationById(regulationId);
        if (regulation && regulation.title) {
          parentTitle = regulation.title;
        }
      } catch (error) {
        console.warn('制度タイトルの取得に失敗しました:', error);
      }
    }

    // contentSummaryを生成
    const contentSummary = content && content.length > 0 
      ? content.substring(0, 200)
      : '';

    // メタデータを準備
    const embeddingMetadata: Record<string, any> = {
      topicId,
      organizationId,
      title,
      contentSummary,
      semanticCategory: metadata?.semanticCategory || '',
      keywords: metadata?.keywords ? JSON.stringify(metadata.keywords) : '',
      tags: metadata?.tags ? JSON.stringify(metadata.tags) : '',
      summary: metadata?.summary || '',
      importance: metadata?.importance || '',
      parentTitle,
      createdAt: now,
      updatedAt: now,
    };
    
    // meetingNoteIdまたはregulationIdを設定
    if (meetingNoteId) {
      embeddingMetadata.meetingNoteId = meetingNoteId;
    }
    if (regulationId) {
      embeddingMetadata.regulationId = regulationId;
    }

    // Rust側のTauriコマンドを呼び出し
    await callTauriCommand('chromadb_save_topic_embedding', {
      topicId,
      meetingNoteId: meetingNoteId || undefined,
      regulationId: regulationId || undefined,
      organizationId,
      combinedEmbedding: combinedEmbedding || [],
      metadata: embeddingMetadata,
    });
  } catch (error) {
    console.error('ChromaDBへのトピック埋め込み保存エラー:', error);
    throw error;
  }
}

/**
 * ChromaDBからトピック埋め込みを取得
 */
export async function getTopicEmbeddingFromChroma(
  topicId: string,
  organizationId: string
): Promise<TopicEmbedding | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const result = await callTauriCommand('chromadb_get_topic_embedding', {
      topicId,
      organizationId,
    }) as Record<string, any> | null;

    if (!result) {
      return null;
    }

    const combinedEmbedding = result.combinedEmbedding as number[] | undefined;
    if (!combinedEmbedding || !Array.isArray(combinedEmbedding) || combinedEmbedding.length === 0) {
      return null;
    }

    const meetingNoteId = result.meetingNoteId as string | undefined || '';
    const title = result.title as string | undefined || '';
    const content = result.content as string | undefined || '';
    
    const embedding: TopicEmbedding = {
      id: `${meetingNoteId}-topic-${topicId}`,
      topicId,
      meetingNoteId,
      organizationId,
      title,
      content,
      combinedEmbedding,
      embeddingModel: (result.embeddingModel as string) || 'text-embedding-3-small',
      embeddingVersion: (result.embeddingVersion as string) || '1.0',
      createdAt: (result.createdAt as string) || new Date().toISOString(),
      updatedAt: (result.updatedAt as string) || new Date().toISOString(),
      metadata: result.metadata || {},
    };

    return embedding;
  } catch (error: any) {
    // ChromaDBが初期化されていない場合や、埋め込みが存在しない場合はエラーをログに出力しない
    const errorMessage = error?.message || String(error || '');
    if (!errorMessage.includes('ChromaDBクライアントが初期化されていません') && 
        !errorMessage.includes('no such table') &&
        !errorMessage.includes('Database error')) {
      // 予期しないエラーのみログに出力
      console.error('ChromaDBからのトピック埋め込み取得エラー:', error);
    }
    return null;
  }
}

/**
 * ChromaDBを使用した類似トピック検索
 */
export async function findSimilarTopicsChroma(
  queryText: string,
  limit: number = 5,
  organizationId?: string,
  semanticCategory?: string
): Promise<Array<{ topicId: string; meetingNoteId?: string; regulationId?: string; similarity: number; title?: string; contentSummary?: string; organizationId?: string }>> {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    // クエリの埋め込みを生成
    const { generateEmbedding } = await import('./embeddings');
    const queryEmbedding = await generateEmbedding(queryText);

    // 埋め込みベクトルの次元数をチェック
    if (queryEmbedding.length !== 1536) {
      throw new Error(`埋め込みベクトルの次元数が一致しません。期待値: 1536, 実際: ${queryEmbedding.length}`);
    }

    // organizationIdが未指定の場合、Supabaseから組織IDのリストを取得
    let finalOrganizationId: string | undefined = organizationId;
    if (!finalOrganizationId) {
      try {
        // シンプルにorganizationsテーブルから組織IDのリストを取得
        const { getDataSourceInstance } = await import('./dataSource');
        const dataSource = getDataSourceInstance();
        
        // タイムアウトを設定（3秒）
        const orgsPromise = dataSource.collection_get('organizations');
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 3000);
        });
        
        const orgs = await Promise.race([orgsPromise, timeoutPromise]);
        
        console.log('[findSimilarTopicsChroma] 組織データ取得結果:', {
          hasOrgs: !!orgs,
          isArray: Array.isArray(orgs),
          length: Array.isArray(orgs) ? orgs.length : 0,
        });
        
        if (orgs && Array.isArray(orgs) && orgs.length > 0) {
          // 組織IDのリストを抽出
          const orgIds = orgs.map((org: any) => org.id).filter((id: string) => id);
          
          console.log('[findSimilarTopicsChroma] 抽出した組織ID:', {
            count: orgIds.length,
            sample: orgIds.slice(0, 5),
          });
          
          if (orgIds.length > 0) {
            // 複数の組織がある場合、各組織に対して個別に検索を実行
            console.log(`[findSimilarTopicsChroma] 全組織横断検索: ${orgIds.length}件の組織を検索します`);
          
          const allResults: Array<{ topicId: string; meetingNoteId?: string; regulationId?: string; similarity: number; title?: string; contentSummary?: string; organizationId?: string }> = [];
            const searchPromises = orgIds.map(async (orgId: string) => {
              try {
                const orgResults = await callTauriCommand('chromadb_find_similar_topics', {
                  queryEmbedding,
                  limit,
                  organizationId: orgId,
                }) as Array<{
                topic_id: string;
                meeting_note_id?: string | null;
                regulation_id?: string | null;
                similarity: number;
                title: string;
                content_summary: string;
                organization_id?: string | null;
              }>;
              
              return orgResults.map((result) => ({
                topicId: result.topic_id,
                meetingNoteId: result.meeting_note_id || undefined,
                regulationId: result.regulation_id || undefined,
                similarity: result.similarity,
                title: result.title,
                contentSummary: result.content_summary,
                organizationId: result.organization_id || undefined,
              }));
              } catch (error) {
                console.warn(`[findSimilarTopicsChroma] 組織 ${orgId} の検索エラー:`, error);
                return [];
              }
            });
            
            const resultsArray = await Promise.all(searchPromises);
            for (const results of resultsArray) {
              allResults.push(...results);
            }
            
            // 類似度でソートして上位limit件を返す
            allResults.sort((a, b) => b.similarity - a.similarity);
            const finalResults = allResults.slice(0, limit);
            
            console.log(`[findSimilarTopicsChroma] 全組織横断検索結果: ${finalResults.length}件`);
            return finalResults;
          }
        }
        
        console.warn('[findSimilarTopicsChroma] 組織が見つかりませんでした。organizationIdを未指定のまま検索を続行します。');
      } catch (error) {
        // エラーをログに出力しない（Supabaseエラーが大量に出力されるのを防ぐ）
        console.debug('[findSimilarTopicsChroma] 組織IDの取得に失敗しました。organizationIdを未指定のまま検索を続行します:', error);
      }
    }

    // Rust側のTauriコマンドを呼び出し
    const results = await callTauriCommand('chromadb_find_similar_topics', {
      queryEmbedding,
      limit,
      organizationId: finalOrganizationId || undefined,
    }) as Array<{
      topic_id: string;
      meeting_note_id?: string | null;
      regulation_id?: string | null;
      similarity: number;
      title: string;
      content_summary: string;
      organization_id?: string | null;
    }>;

    console.log('[findSimilarTopicsChroma] ChromaDB検索結果:', {
      resultType: Array.isArray(results) ? 'array' : typeof results,
      resultLength: Array.isArray(results) ? results.length : 0,
      organizationId: organizationId || 'all',
      semanticCategory: semanticCategory || 'all',
      limit,
      sample: Array.isArray(results) && results.length > 0 ? results.slice(0, 3) : [],
    });

    // 結果が空の場合の警告
    if (Array.isArray(results) && results.length === 0) {
      console.warn('[findSimilarTopicsChroma] ⚠️ ChromaDBからの検索結果が空です。埋め込みが保存されていない可能性があります。');
      if (organizationId) {
        console.warn('[findSimilarTopicsChroma] 組織ID:', organizationId, 'の埋め込みを確認してください。');
      } else {
        console.warn('[findSimilarTopicsChroma] 全組織横断検索を実行しましたが、どの組織にも埋め込みが見つかりませんでした。');
      }
    }

    // 結果を変換
    let similarities = results.map((result) => {
      if (typeof result.similarity !== 'number' || isNaN(result.similarity)) {
        console.warn(`トピック ${result.topic_id} のsimilarityが無効です:`, result.similarity);
        return {
          topicId: result.topic_id,
          meetingNoteId: result.meeting_note_id || undefined,
          regulationId: result.regulation_id || undefined,
          similarity: 0,
          title: result.title,
          contentSummary: result.content_summary,
          organizationId: result.organization_id || undefined,
        };
      }
      return {
        topicId: result.topic_id,
        meetingNoteId: result.meeting_note_id || undefined,
        regulationId: result.regulation_id || undefined,
        similarity: result.similarity,
        title: result.title,
        contentSummary: result.content_summary,
        organizationId: result.organization_id || undefined,
      };
    });

    // semanticCategoryでフィルタリング（Rust側で未対応のため、JavaScript側でフィルタリング）
    if (semanticCategory) {
      console.warn('semanticCategoryでのフィルタリングはRust側で未対応のため、全ての結果を返します');
    }

    console.log('[findSimilarTopicsChroma] 変換後の結果:', {
      count: similarities.length,
      sample: similarities.slice(0, 3),
    });

    return similarities.slice(0, limit);
  } catch (error) {
    console.error('ChromaDBでの類似トピック検索エラー:', error);
    throw error;
  }
}

/**
 * ChromaDBからトピック埋め込みを削除
 */
export async function deleteTopicEmbeddingFromChroma(
  topicId: string,
  organizationId: string
): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    await callTauriCommand('chromadb_delete_topic_embedding', {
      topicId,
      organizationId,
    });
  } catch (error) {
    console.error('ChromaDBからのトピック埋め込み削除エラー:', error);
    throw error;
  }
}
