/**
 * トピックAPI
 * トピック情報の取得と管理
 */

import type { TopicInfo } from './orgApi';

/**
 * トピックファイル情報
 */
export interface TopicFileInfo {
  id: string;
  topicId: string;
  filePath: string;
  fileName: string;
  mimeType?: string;
  description?: string;
  detailedDescription?: string;
  fileSize?: number;
}

/**
 * トピック情報（RAG検索用）
 */
export interface TopicSearchInfo {
  topicId: string;
  meetingNoteId?: string;
  regulationId?: string;
  title: string;
  content: string;
  summary?: string;
  semanticCategory?: string;
  keywords?: string[];
  importance?: string;
  organizationId: string;
  createdAt?: string;
  updatedAt?: string;
  searchCount?: number;
  files?: TopicFileInfo[]; // トピックに紐づくファイル情報
}

/**
 * トピックIDでトピック情報を取得
 */
export async function getTopicById(
  topicId: string,
  meetingNoteId?: string,
  regulationId?: string
): Promise<TopicSearchInfo | null> {
  try {
    const parentId = meetingNoteId || regulationId;
    
    if (!parentId) {
      console.warn(`[getTopicById] meetingNoteIdまたはregulationIdが必要です: topicId=${topicId}`);
      return null;
    }
    
    // topicsテーブルから直接取得を試みる
    // idが {meetingNoteId}-topic-{topicId} 形式の場合
    const embeddingId = `${parentId}-topic-${topicId}`;
    
    try {
      let topicData: any = null;
      
      // Supabaseから取得
      const { getDataSourceInstance } = await import('./dataSource');
      const dataSource = getDataSourceInstance();
      
      // まずIDで直接取得を試みる
      try {
        const data = await dataSource.doc_get('topics', embeddingId);
        if (data) {
          topicData = data;
          console.log(`[getTopicById] topicsテーブルから直接取得成功: topicId=${topicId}, id=${embeddingId}`);
        }
      } catch (docGetError: any) {
        // doc_getで見つからない場合は、queryで検索
        const errorMessage = docGetError?.message || String(docGetError || '');
        const isNoRowsError = errorMessage.includes('no rows') || 
                              errorMessage.includes('Query returned no rows') ||
                              errorMessage.includes('PGRST116');
        
        if (!isNoRowsError) {
          console.warn(`[getTopicById] doc_getエラー（続行）:`, docGetError);
        }
      }
      
      // IDで見つからない場合、topicIdとmeetingNoteIdで検索
      if (!topicData) {
        const { getCollectionViaDataSource } = await import('./dataSourceAdapter');
        const allTopics = await getCollectionViaDataSource('topics');
        
        // topicIdとmeetingNoteIdでフィルタリング
        const filtered = allTopics.filter((item: any) => {
          const itemTopicId = item.topicId || item.topicid;
          const itemMeetingNoteId = item.meetingNoteId || item.meetingnoteid;
          return itemTopicId === topicId && 
                 (meetingNoteId ? itemMeetingNoteId === meetingNoteId : 
                  regulationId ? itemMeetingNoteId === regulationId : true);
        });
        
        if (filtered.length > 0) {
          topicData = filtered[0];
          console.log(`[getTopicById] topicsテーブルから取得成功（topicId検索）: topicId=${topicId}`);
        }
      }
      
      if (topicData) {
        // データをTopicSearchInfo形式に変換
        const data = topicData;
        return {
          topicId: data.topicId || data.topicid || topicId,
          meetingNoteId: data.meetingNoteId || data.meetingnoteid || meetingNoteId,
          regulationId: data.regulationId || data.regulationid || regulationId,
          title: data.title || '',
          content: data.content || '',
          summary: data.description || data.contentSummary || data.contentsummary || data.summary,
          semanticCategory: data.semanticCategory || data.semanticcategory,
          importance: data.importance,
          organizationId: data.organizationId || data.organizationid || '',
          keywords: data.keywords ? (Array.isArray(data.keywords) ? data.keywords : (typeof data.keywords === 'string' ? JSON.parse(data.keywords) : [])) : [],
          createdAt: data.createdAt || data.createdat,
          updatedAt: data.updatedAt || data.updatedat,
          searchCount: data.searchCount || data.searchcount || 0,
        };
      }
      
      console.log(`[getTopicById] topicsテーブルにデータが見つかりませんでした: id=${embeddingId}`);
      return null;
    } catch (error) {
      console.warn(`[getTopicById] topicsテーブルからの取得エラー:`, error);
      return null;
    }
  } catch (error) {
    console.error(`[getTopicById] エラー:`, error);
    return null;
  }
}

/**
 * 複数のトピックIDでトピック情報を一括取得（N+1問題の解決）
 */
export async function getTopicsByIds(
  topicIdsWithParentIds: Array<{ topicId: string; meetingNoteId?: string; regulationId?: string }>,
  concurrencyLimit: number = 5
): Promise<TopicSearchInfo[]> {
  if (topicIdsWithParentIds.length === 0) {
    return [];
  }

  const pLimit = (await import('p-limit')).default;
  const limit = pLimit(concurrencyLimit);

  try {
    const results = await Promise.allSettled(
      topicIdsWithParentIds.map(({ topicId, meetingNoteId, regulationId }) =>
        limit(async () => {
          try {
            return await getTopicById(topicId, meetingNoteId, regulationId);
          } catch (error: any) {
            console.error(`[getTopicsByIds] トピック取得エラー (${topicId}, meetingNoteId=${meetingNoteId}, regulationId=${regulationId}):`, error);
            return null;
          }
        })
      )
    );

    const topics: TopicSearchInfo[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        topics.push(result.value);
      }
    }

    return topics;
  } catch (error) {
    console.error('[getTopicsByIds] エラー:', error);
    return [];
  }
}

/**
 * 複数のトピックIDでトピックファイル情報を一括取得
 * @param topicIds トピックIDの配列（{meetingNoteId}-topic-{topicId}形式）
 * @returns トピックファイル情報の配列
 */
export async function getTopicFilesByTopicIds(
  topicIds: string[]
): Promise<TopicFileInfo[]> {
  if (topicIds.length === 0) {
    return [];
  }

  try {
    const allFiles: TopicFileInfo[] = [];

    // バッチで取得（topicIdsを分割してクエリ）
    const batchSize = 10;
    for (let i = 0; i < topicIds.length; i += batchSize) {
      const batch = topicIds.slice(i, i + batchSize);
      
      // 各トピックIDでファイルを取得
      const filePromises = batch.map(async (topicId) => {
        try {
          console.log(`[getTopicFilesByTopicIds] ファイル取得開始: topicId=${topicId}`);
          
          // 1. topicFilesテーブルから取得（Supabase経由）
          const { getCollectionViaDataSource } = await import('./dataSourceAdapter');
          const topicFilesData = await getCollectionViaDataSource('topicFiles', {
            filters: [{ field: 'topicid', operator: 'eq', value: topicId }]
          });
          const filesResult = topicFilesData.map((file: any) => ({
            id: file.id,
            data: file
          }));

          console.log(`[getTopicFilesByTopicIds] topicFilesテーブルから取得: topicId=${topicId}, count=${filesResult?.length || 0}`);

          const files: TopicFileInfo[] = [];
          
          // topicFilesテーブルから取得したファイルを追加
          if (filesResult && Array.isArray(filesResult) && filesResult.length > 0) {
            files.push(...filesResult.map((item: any) => {
              const file = item.data || item;
              return {
                id: item.id || file.id,
                topicId: topicId,
                filePath: file.filePath || '',
                fileName: file.fileName || '',
                mimeType: file.mimeType,
                description: file.description,
                detailedDescription: file.detailedDescription,
                fileSize: file.fileSize,
              } as TopicFileInfo;
            }));
          }
          
          // 2. Graphvizカードのトピックの場合、graphvizYamlFileAttachmentsテーブルからも取得
          // topicIdの形式: graphviz_{yamlFileId}-topic-{yamlFileId}
          if (topicId.startsWith('graphviz_') && topicId.includes('-topic-')) {
            const yamlFileIdMatch = topicId.match(/graphviz_(.+?)-topic-\1$/);
            if (yamlFileIdMatch && yamlFileIdMatch[1]) {
              const yamlFileId = yamlFileIdMatch[1];
              console.log(`[getTopicFilesByTopicIds] Graphvizカードのファイルを取得: yamlFileId=${yamlFileId}`);
              
              try {
                // Graphvizカードのファイルを取得（Supabase経由）
                let graphvizFilesResult: Array<{ id: string; data: any }> = [];
                try {
                  const { getCollectionViaDataSource } = await import('./dataSourceAdapter');
                  const graphvizFiles = await getCollectionViaDataSource('graphvizYamlFileAttachments', {
                    filters: [{ field: 'yamlfileid', operator: 'eq', value: yamlFileId }]
                  });
                  graphvizFilesResult = graphvizFiles.map((file: any) => ({
                    id: file.id,
                    data: file
                  }));
                } catch (supabaseError: any) {
                  // テーブルが存在しない場合のエラーを無視（PGRST205）
                  const errorMessage = supabaseError?.message || String(supabaseError || '');
                  const isTableNotFoundError = errorMessage.includes('PGRST205') || 
                                               errorMessage.includes('Could not find the table') ||
                                               errorMessage.includes('graphvizyamlfileattachments');
                  
                  if (isTableNotFoundError) {
                    console.warn(`⚠️ [getTopicFilesByTopicIds] graphvizYamlFileAttachmentsテーブルが存在しません（Supabase）: yamlFileId=${yamlFileId}`);
                    graphvizFilesResult = [];
                  } else {
                    throw supabaseError;
                  }
                }
                
                console.log(`[getTopicFilesByTopicIds] graphvizYamlFileAttachmentsテーブルから取得: yamlFileId=${yamlFileId}, count=${graphvizFilesResult?.length || 0}`);
                
                if (graphvizFilesResult && Array.isArray(graphvizFilesResult) && graphvizFilesResult.length > 0) {
                  files.push(...graphvizFilesResult.map((item: any) => {
                    const file = item.data || item;
                    return {
                      id: item.id || file.id,
                      topicId: topicId, // topicIdを設定（topicsテーブルのid）
                      filePath: file.filePath || '',
                      fileName: file.fileName || '',
                      mimeType: file.mimeType,
                      description: file.description,
                      detailedDescription: file.detailedDescription,
                      fileSize: file.fileSize,
                    } as TopicFileInfo;
                  }));
                }
              } catch (graphvizError: any) {
                // テーブルが存在しない場合のエラーは既に処理済みなので、その他のエラーのみ警告
                const errorMessage = graphvizError?.message || String(graphvizError || '');
                const isTableNotFoundError = errorMessage.includes('PGRST205') || 
                                           errorMessage.includes('Could not find the table') ||
                                           errorMessage.includes('graphvizyamlfileattachments');
                
                if (!isTableNotFoundError) {
                  console.warn(`[getTopicFilesByTopicIds] Graphvizカードのファイル取得エラー:`, graphvizError);
                }
              }
            }
          }

          console.log(`[getTopicFilesByTopicIds] ファイル取得結果: topicId=${topicId}, totalCount=${files.length}`, {
            files: files.map(f => ({
              id: f.id,
              fileName: f.fileName,
            })),
          });

          return files;
        } catch (error) {
          console.warn(`[getTopicFilesByTopicIds] トピックID ${topicId} のファイル取得エラー:`, error);
          return [];
        }
      });

      const batchResults = await Promise.all(filePromises);
      allFiles.push(...batchResults.flat());
    }

    console.log(`[getTopicFilesByTopicIds] 取得したファイル数: ${allFiles.length}件 (トピック数: ${topicIds.length})`);
    return allFiles;
  } catch (error) {
    console.error('[getTopicFilesByTopicIds] エラー:', error);
    return [];
  }
}

