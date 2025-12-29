/**
 * トピックAPI
 * トピック情報の取得と管理
 */

import { callTauriCommand } from './localFirebase';
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
    
    // まず、topicsテーブルから直接取得を試みる（優先）
    // idが {meetingNoteId}-topic-{topicId} 形式の場合
    if (parentId) {
      const { callTauriCommand } = await import('./localFirebase');
      const embeddingId = `${parentId}-topic-${topicId}`;
      
      try {
        // topicsテーブルから直接取得を試みる
        const topicResults = await callTauriCommand('query_get', {
          collectionName: 'topics',
          conditions: { id: embeddingId },
        }) as Array<{ id: string; data: any }>;
        
        if (topicResults && topicResults.length > 0) {
          const topicData = topicResults[0].data || topicResults[0];
          console.log(`[getTopicById] topicsテーブルから直接取得成功: topicId=${topicId}, id=${embeddingId}`);
          
          return {
            topicId: topicData.topicId || topicId,
            meetingNoteId: topicData.meetingNoteId || meetingNoteId,
            regulationId: topicData.regulationId || regulationId,
            title: topicData.title || '',
            content: topicData.content || '',
            summary: topicData.description || topicData.contentSummary || topicData.summary,
            semanticCategory: topicData.semanticCategory,
            importance: topicData.importance,
            organizationId: topicData.organizationId || '',
            keywords: topicData.keywords ? (Array.isArray(topicData.keywords) ? topicData.keywords : (typeof topicData.keywords === 'string' ? JSON.parse(topicData.keywords) : [])) : [],
            createdAt: topicData.createdAt,
            updatedAt: topicData.updatedAt,
            searchCount: topicData.searchCount || 0,
          };
        } else {
          console.log(`[getTopicById] topicsテーブルにデータが見つかりませんでした（id検索）: id=${embeddingId}。フォールバック処理に進みます。`);
        }
      } catch (error) {
        console.warn(`[getTopicById] topicsテーブルからの取得エラー（続行）:`, error);
      }
      
      // topicIdとmeetingNoteId/regulationIdで検索も試みる
      try {
        const conditions: any = { topicId };
        if (meetingNoteId) {
          conditions.meetingNoteId = meetingNoteId;
        } else if (regulationId) {
          // regulationIdの場合は、meetingNoteIdがregulationIdとして保存されている可能性がある
          conditions.meetingNoteId = regulationId;
        }
        
        const topicResults = await callTauriCommand('query_get', {
          collectionName: 'topics',
          conditions,
        }) as Array<{ id: string; data: any }>;
        
        if (topicResults && topicResults.length > 0) {
          const topicData = topicResults[0].data || topicResults[0];
          console.log(`[getTopicById] topicsテーブルから取得成功（topicId検索）: topicId=${topicId}`);
          
          return {
            topicId: topicData.topicId || topicId,
            meetingNoteId: topicData.meetingNoteId || meetingNoteId,
            regulationId: topicData.regulationId || regulationId,
            title: topicData.title || '',
            content: topicData.content || '',
            summary: topicData.description || topicData.contentSummary || topicData.summary,
            semanticCategory: topicData.semanticCategory,
            importance: topicData.importance,
            organizationId: topicData.organizationId || '',
            keywords: topicData.keywords ? (Array.isArray(topicData.keywords) ? topicData.keywords : (typeof topicData.keywords === 'string' ? JSON.parse(topicData.keywords) : [])) : [],
            createdAt: topicData.createdAt,
            updatedAt: topicData.updatedAt,
            searchCount: topicData.searchCount || 0,
          };
        } else {
          console.log(`[getTopicById] topicsテーブルにデータが見つかりませんでした（topicId検索）: topicId=${topicId}。フォールバック処理に進みます。`);
        }
      } catch (error) {
        console.warn(`[getTopicById] topicsテーブルからの取得エラー（topicId検索、続行）:`, error);
      }
    }
    
    // topicsテーブルにない場合、議事録または制度のJSONからパースして取得（フォールバック）
    if (!parentId) {
      console.warn(`[getTopicById] meetingNoteIdまたはregulationIdが必要です: topicId=${topicId}`);
      return null;
    }
    
    console.log(`[getTopicById] フォールバック処理: 議事録/制度のJSONからパースして取得します。topicId=${topicId}, meetingNoteId=${meetingNoteId}, regulationId=${regulationId}`);
    
    // 議事録または制度からトピック情報を取得
    if (meetingNoteId) {
      const { getTopicsByMeetingNote } = await import('./orgApi');
      const topics = await getTopicsByMeetingNote(meetingNoteId);
      
      console.log(`[getTopicById] 取得したトピック数: ${topics.length}, topicId=${topicId}, meetingNoteId=${meetingNoteId}`);
      if (topics.length > 0) {
        console.log(`[getTopicById] トピックIDのサンプル:`, topics.slice(0, 3).map(t => t.id));
      }
      
      const topic = topics.find(t => t.id === topicId);
      if (!topic) {
        console.warn(`[getTopicById] トピックが見つかりません: topicId=${topicId}, meetingNoteId=${meetingNoteId}`);
        console.warn(`[getTopicById] 利用可能なトピックID:`, topics.map(t => t.id));
        return null;
      }
      
      // TopicInfoをTopicSearchInfoに変換
      return {
        topicId: topic.id,
        meetingNoteId: topic.meetingNoteId,
        title: topic.title,
        content: topic.content,
        summary: topic.summary,
        semanticCategory: topic.semanticCategory,
        importance: topic.importance,
        organizationId: topic.organizationId,
        keywords: topic.keywords || [], // キーワードも含める
        createdAt: topic.topicDate || undefined,
        updatedAt: topic.topicDate || undefined,
        searchCount: 0, // デフォルト値
      };
    } else if (regulationId) {
      const { getTopicsByRegulation } = await import('./orgApi');
      const topics = await getTopicsByRegulation(regulationId);
      
      console.log(`[getTopicById] 取得したトピック数: ${topics.length}, topicId=${topicId}, regulationId=${regulationId}`);
      if (topics.length > 0) {
        console.log(`[getTopicById] トピックIDのサンプル:`, topics.slice(0, 3).map(t => t.id));
      }
      
      const topic = topics.find(t => t.id === topicId);
      if (!topic) {
        console.warn(`[getTopicById] トピックが見つかりません: topicId=${topicId}, regulationId=${regulationId}`);
        console.warn(`[getTopicById] 利用可能なトピックID:`, topics.map(t => t.id));
        return null;
      }
      
      // TopicInfoをTopicSearchInfoに変換
      return {
        topicId: topic.id,
        meetingNoteId: topic.meetingNoteId, // 制度IDが入っている可能性がある
        regulationId: regulationId,
        title: topic.title,
        content: topic.content,
        summary: topic.summary,
        semanticCategory: topic.semanticCategory,
        importance: topic.importance,
        organizationId: topic.organizationId,
        keywords: topic.keywords || [], // キーワードも含める
        createdAt: topic.topicDate || undefined,
        updatedAt: topic.topicDate || undefined,
        searchCount: 0, // デフォルト値
      };
    }
    
    return null;
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
    const { callTauriCommand } = await import('./localFirebase');
    const allFiles: TopicFileInfo[] = [];

    // バッチで取得（topicIdsを分割してクエリ）
    const batchSize = 10;
    for (let i = 0; i < topicIds.length; i += batchSize) {
      const batch = topicIds.slice(i, i + batchSize);
      
      // デバッグ: topicFilesテーブルの全件を取得して確認（最初の1回のみ）
      if (i === 0) {
        try {
          const allFilesDebug = await callTauriCommand('query_get', {
            collectionName: 'topicFiles',
            conditions: {},
          }) as Array<{ id: string; data: any }>;
          console.log(`[getTopicFilesByTopicIds] 🔍 デバッグ: topicFilesテーブルの全件数=${allFilesDebug?.length || 0}`, {
            allFiles: allFilesDebug?.slice(0, 10).map((item: any) => ({
              id: item.id,
              topicId: item.data?.topicId || item.topicId,
              fileName: item.data?.fileName || item.fileName,
              meetingNoteId: item.data?.meetingNoteId || item.meetingNoteId,
            })),
            totalCount: allFilesDebug?.length || 0,
          });
        } catch (debugError) {
          console.warn('[getTopicFilesByTopicIds] デバッグ用の全件取得エラー:', debugError);
        }
      }
      
      // 各トピックIDでファイルを取得
      const filePromises = batch.map(async (topicId) => {
        try {
          console.log(`[getTopicFilesByTopicIds] ファイル取得開始: topicId=${topicId}`);
          
          // 1. topicFilesテーブルから取得
          const filesResult = await callTauriCommand('query_get', {
            collectionName: 'topicFiles',
            conditions: { topicId },
          }) as Array<{ id: string; data: any }>;

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
                const graphvizFilesResult = await callTauriCommand('query_get', {
                  collectionName: 'graphvizYamlFileAttachments',
                  conditions: { yamlFileId },
                }) as Array<{ id: string; data: any }>;
                
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
              } catch (graphvizError) {
                console.warn(`[getTopicFilesByTopicIds] Graphvizカードのファイル取得エラー:`, graphvizError);
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

