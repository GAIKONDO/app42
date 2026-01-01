/**
 * トピック埋め込みの管理ユーティリティ
 */

import { doc, setDoc, collection, getDocs } from './localFirebase';
import { callTauriCommand } from './localFirebase';
import { 
  generateCombinedEmbedding, 
  generateSeparatedEmbeddings,
  generateEnhancedEmbedding,
  generateMetadataEmbedding,
  cosineSimilarity 
} from './embeddings';
import type { TopicEmbedding, TopicMetadata, TopicSemanticCategory } from '@/types/topicMetadata';
import { shouldUseChroma } from './chromaConfig';
import { getVectorSearchBackend } from './vectorSearchConfig';
import { saveTopicEmbedding as saveTopicEmbeddingAdapter } from './vectorSearchAdapter';
import { getTopicsByIds } from './topicApi';
import { calculateTopicScore, adjustWeightsForQuery } from './ragSearchScoring';
import { handleRAGSearchError, safeHandleRAGSearchError } from './ragSearchErrors';
import pLimit from 'p-limit';

/**
 * トピック埋め込みを保存
 */
export async function saveTopicEmbedding(
  topicId: string,
  meetingNoteId: string | undefined,
  organizationId: string,
  title: string,
  content: string,
  metadata?: Partial<Pick<TopicMetadata, 'keywords' | 'semanticCategory' | 'tags' | 'summary' | 'importance'>>,
  regulationId?: string,
  topicDate?: string | null
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('トピック埋め込みの保存はクライアント側でのみ実行可能です');
  }
  
  // meetingNoteIdまたはregulationIdのいずれかが必要
  const parentId = meetingNoteId || regulationId;
  if (!parentId) {
    throw new Error('meetingNoteIdまたはregulationIdのいずれかが必要です');
  }
  
  // Graphvizのトピックの場合は、専用の関数を使用
  if (meetingNoteId && meetingNoteId.startsWith('graphviz_')) {
    console.log('📊 [saveTopicEmbedding] Graphvizトピックを検出。専用の保存関数を使用します:', {
      topicId,
      meetingNoteId,
    });
    
    try {
      const { saveGraphvizCardEmbeddingToChroma } = await import('./graphvizCardEmbeddings');
      // Graphvizのトピックの場合は、yamlFileIdを抽出（meetingNoteIdから`graphviz_`を除去）
      const yamlFileId = meetingNoteId.replace('graphviz_', '');
      
      // topicsテーブルからGraphvizのメタデータを取得
      const embeddingId = `${meetingNoteId}-topic-${topicId}`;
      let yamlType: string | undefined;
      let description: string | undefined;
      
      try {
        const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
        let topicDoc: any = null;
        
        if (useSupabase) {
          // Supabase経由で取得
          const { getDocViaDataSource } = await import('./dataSourceAdapter');
          topicDoc = await getDocViaDataSource('topics', embeddingId);
        } else {
          // SQLite経由で取得
          const { callTauriCommand } = await import('./localFirebase');
          topicDoc = await callTauriCommand('doc_get', {
            collectionName: 'topics',
            docId: embeddingId,
          });
        }
        
        if (topicDoc) {
          const topicData = topicDoc.data || topicDoc;
          if (topicData) {
            yamlType = topicData.yamlType;
            description = topicData.description;
          }
        }
      } catch (error) {
        console.warn('⚠️ [saveTopicEmbedding] Graphvizトピックのメタデータ取得に失敗（続行）:', error);
      }
      
      await saveGraphvizCardEmbeddingToChroma(
        yamlFileId,
        organizationId,
        title,
        content,
        {
          semanticCategory: metadata?.semanticCategory,
          keywords: metadata?.keywords as string[] | undefined,
          summary: metadata?.summary,
          description: description,
          yamlType: yamlType,
        }
      );
      return;
    } catch (error) {
      console.error('❌ [saveTopicEmbedding] Graphvizトピックの保存に失敗。通常の方法にフォールバック:', error);
      // エラーが発生した場合は通常の方法にフォールバック
    }
  }
  
  try {
    const now = new Date().toISOString();
    const embeddingVersion = metadata ? '2.0' : '1.0';
    const embeddingId = `${parentId}-topic-${topicId}`;
    
    // topicsテーブルに保存するためのデータ
    const topicData: any = {
      id: embeddingId,
      topicId,
      organizationId,
      title: title || '',
      content: content || null,
      createdAt: now,
      updatedAt: now,
    };
    
    // meetingNoteIdまたはregulationIdを設定
    if (meetingNoteId) {
      topicData.meetingNoteId = meetingNoteId;
    }
    if (regulationId) {
      topicData.regulationId = regulationId;
    }
    
    // topicDate（登録日）を設定
    // 注意: SupabaseスキーマにtopicDateカラムが存在しないため、Supabase使用時は除外
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    if (topicDate && !useSupabase) {
      // SQLite使用時のみtopicDateを設定
      topicData.topicDate = topicDate;
    }

    // メタデータフィールドを追加
    if (metadata?.semanticCategory) {
      topicData.semanticCategory = metadata.semanticCategory;
    }
    if (metadata?.importance) {
      topicData.importance = metadata.importance;
    }
    // keywordsは空配列でも保存する（存在する場合は保存）
    if (metadata?.keywords !== undefined) {
      if (Array.isArray(metadata.keywords) && metadata.keywords.length > 0) {
        topicData.keywords = JSON.stringify(metadata.keywords);
      } else if (typeof metadata.keywords === 'string' && metadata.keywords.length > 0) {
        topicData.keywords = metadata.keywords;
      }
    }
    if (metadata?.tags && metadata.tags.length > 0) {
      topicData.tags = Array.isArray(metadata.tags) 
        ? JSON.stringify(metadata.tags) 
        : metadata.tags;
    }
    if (metadata?.summary) {
      topicData.description = metadata.summary;
    }
    
    console.log('📊 [saveTopicEmbedding] topicDataに設定されたメタデータ:', {
      hasSemanticCategory: !!topicData.semanticCategory,
      hasImportance: !!topicData.importance,
      hasKeywords: !!topicData.keywords,
      keywordsValue: topicData.keywords,
      hasDescription: !!topicData.description,
      descriptionValue: topicData.description,
    });

    // ベクトル検索バックエンドに保存（ChromaDBまたはSupabase）
    const backend = getVectorSearchBackend();
    if (backend === 'supabase' || shouldUseChroma()) {
      try {
        if (backend === 'supabase') {
          // Supabaseを使用（新しい抽象化レイヤー）
          // 埋め込みを生成
          const { generateCombinedEmbedding, generateEnhancedEmbedding } = await import('./embeddings');
          let combinedEmbedding: number[];
          
          if (metadata && (metadata.keywords || metadata.semanticCategory || metadata.tags)) {
            // メタデータがある場合: 拡張埋め込みを生成
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
          } else {
            // メタデータがない場合: 従来の方法
            combinedEmbedding = await generateCombinedEmbedding(title, content);
          }
          
          // 組織IDと会社IDを取得
          let companyId: string | null = null;
          let orgId: string = organizationId;
          
          try {
            const orgData = await getTopicsByIds([embeddingId]).then(topics => topics[0]);
            companyId = orgData?.companyId || null;
            orgId = orgData?.organizationId || organizationId;
          } catch (error: any) {
            console.warn(`[saveTopicEmbedding] getTopicsByIdsエラー（続行）:`, error);
            // エラーが発生しても続行（organizationIdは既に設定されている）
          }
          
          // Supabaseに保存
          console.log('💾 [saveTopicEmbedding] topic_embeddingsテーブルに保存開始:', {
            embeddingId,
            orgId,
            companyId,
            embeddingDimension: combinedEmbedding.length,
            hasMeetingNoteId: !!meetingNoteId,
          });
          
          try {
            // embeddingIdはidカラムに、topicIdはtopic_idカラムに保存する必要がある
            // saveTopicEmbeddingAdapterの第1引数はidとして使用されるため、embeddingIdを渡す
            // しかし、topic_idには実際のトピックIDを保存する必要がある
            // そのため、saveTopicEmbeddingAdapterを直接呼び出すのではなく、saveTopicEmbeddingToSupabaseを直接呼び出す
            const { saveTopicEmbeddingToSupabase } = await import('./vectorSearchSupabase');
            await saveTopicEmbeddingToSupabase(
              embeddingId, // idカラムに保存
              orgId || '',
              companyId,
              combinedEmbedding,
              {
                topicId: topicId, // 実際のトピックIDをmetadataに含める
                meetingNoteId,
                title,
                content,
                semanticCategory: metadata?.semanticCategory,
                keywords: metadata?.keywords,
                tags: metadata?.tags,
                embeddingModel: 'text-embedding-3-small',
                embeddingVersion: '1.0',
              }
            );
            console.log('✅ [saveTopicEmbedding] topic_embeddingsテーブルへの保存成功:', embeddingId);
          } catch (error: any) {
            console.error(`❌ [saveTopicEmbedding] topic_embeddingsテーブルへの保存エラー: ${embeddingId}`, {
              error: error?.message || String(error),
              stack: error?.stack,
            });
            throw error;
          }
        } else {
          // ChromaDBを使用（既存の実装）
          const { saveTopicEmbeddingToChroma } = await import('./topicEmbeddingsChroma');
          await saveTopicEmbeddingToChroma(topicId, meetingNoteId, organizationId, title, content, metadata, regulationId);
        }
        
        // topicsテーブルにメタデータを保存
        try {
          console.log('💾 [saveTopicEmbedding] topicsテーブルに保存開始:', {
            embeddingId,
            topicDataKeys: Object.keys(topicData),
            hasKeywords: !!topicData.keywords,
            hasSemanticCategory: !!topicData.semanticCategory,
            hasImportance: !!topicData.importance,
            hasDescription: !!topicData.description,
            hasTopicDate: !!topicData.topicDate,
          });
          
          // topicDateは既に事前に除外されているため、そのまま保存
          await setDoc(doc(null, 'topics', embeddingId), topicData);
          
          console.log('✅ [saveTopicEmbedding] topicsテーブルへの保存成功:', embeddingId);
        } catch (topicSaveError: any) {
          console.error(`❌ [saveTopicEmbedding] topicsテーブルへの保存に失敗しました: ${embeddingId}`, {
            error: topicSaveError,
            errorMessage: topicSaveError?.message,
            errorStack: topicSaveError?.stack,
            topicDataKeys: Object.keys(topicData),
          });
          throw new Error(`topicsテーブルへの保存に失敗しました: ${topicSaveError?.message || '不明なエラー'}`);
        }
        
        // 同期状態を更新（ChromaDBの場合のみ）
        if (backend === 'chromadb') {
          try {
            await callTauriCommand('update_chroma_sync_status', {
              entityType: 'topic',
              entityId: embeddingId,
              synced: true,
              error: null,
            });
          } catch (syncStatusError: any) {
            console.warn(`同期状態の更新に失敗しました: ${embeddingId}`, syncStatusError?.message);
          }
        }
      } catch (error: any) {
        // 同期状態を失敗として更新（ChromaDBの場合のみ）
        if (backend === 'chromadb') {
          try {
            await callTauriCommand('update_chroma_sync_status', {
              entityType: 'topic',
              entityId: embeddingId,
              synced: false,
              error: error?.message || String(error),
            });
          } catch (syncStatusError: any) {
            console.warn(`同期状態の更新に失敗しました: ${embeddingId}`, syncStatusError?.message);
          }
        }
        
        // フォールバック: SQLiteに保存
        try {
          console.log('💾 [saveTopicEmbedding] フォールバック: topicsテーブルに保存開始:', embeddingId);
          await setDoc(doc(null, 'topics', embeddingId), topicData);
          console.log('✅ [saveTopicEmbedding] フォールバック: topicsテーブルへの保存成功:', embeddingId);
        } catch (fallbackError: any) {
          console.error(`❌ [saveTopicEmbedding] フォールバック保存も失敗しました: ${embeddingId}`, {
            error: fallbackError,
            errorMessage: fallbackError?.message,
            errorStack: fallbackError?.stack,
          });
          throw new Error(`topicsテーブルへの保存に失敗しました: ${fallbackError?.message || '不明なエラー'}`);
        }
      }
    } else {
      // SQLiteに保存
      try {
        console.log('💾 [saveTopicEmbedding] SQLiteに保存開始:', {
          embeddingId,
          topicDataKeys: Object.keys(topicData),
          hasKeywords: !!topicData.keywords,
          hasSemanticCategory: !!topicData.semanticCategory,
          hasImportance: !!topicData.importance,
          hasDescription: !!topicData.description,
        });
        await setDoc(doc(null, 'topics', embeddingId), topicData);
        console.log('✅ [saveTopicEmbedding] SQLiteへの保存成功:', embeddingId);
      } catch (sqliteError: any) {
        console.error(`❌ [saveTopicEmbedding] SQLiteへの保存に失敗しました: ${embeddingId}`, {
          error: sqliteError,
          errorMessage: sqliteError?.message,
          errorStack: sqliteError?.stack,
          topicDataKeys: Object.keys(topicData),
        });
        throw new Error(`topicsテーブルへの保存に失敗しました: ${sqliteError?.message || '不明なエラー'}`);
      }
    }
  } catch (error) {
    console.error('トピック埋め込みの保存エラー:', error);
    throw error;
  }
}

/**
 * トピック埋め込みを非同期で生成・保存
 */
export async function saveTopicEmbeddingAsync(
  topicId: string,
  meetingNoteId: string | undefined,
  organizationId: string,
  title: string,
  content: string,
  metadata?: Partial<Pick<TopicMetadata, 'keywords' | 'semanticCategory' | 'tags' | 'summary' | 'importance'>>,
  regulationId?: string,
  topicDate?: string | null
): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    console.log('💾 [saveTopicEmbeddingAsync] 開始:', {
      topicId,
      meetingNoteId,
      regulationId,
      organizationId,
      hasMetadata: !!metadata,
      metadataKeys: metadata ? Object.keys(metadata) : [],
      topicDate,
    });
    await saveTopicEmbedding(topicId, meetingNoteId, organizationId, title, content, metadata, regulationId, topicDate);
    console.log('✅ [saveTopicEmbeddingAsync] 成功:', topicId);
  } catch (error: any) {
    console.error(`❌ [saveTopicEmbeddingAsync] トピック ${topicId} の埋め込み生成エラー:`, {
      error,
      errorMessage: error?.message,
      errorStack: error?.stack,
      topicId,
      meetingNoteId,
      organizationId,
      hasMetadata: !!metadata,
    });
    // エラーを再スローして、呼び出し元で処理できるようにする
    throw error;
  }
}

/**
 * 複数のトピック埋め込みを一括取得
 */
export async function getTopicEmbeddingsByIds(
  topicIds: Array<{ topicId: string; meetingNoteId: string }>,
  concurrencyLimit: number = 5
): Promise<TopicEmbedding[]> {
  if (topicIds.length === 0) {
    return [];
  }

  const limit = pLimit(concurrencyLimit);

  try {
    const results = await Promise.allSettled(
      topicIds.map(({ topicId, meetingNoteId }) =>
        limit(() => getTopicEmbedding(topicId, meetingNoteId))
      )
    );

    const embeddings: TopicEmbedding[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        embeddings.push(result.value);
      }
    }

    return embeddings;
  } catch (error) {
    console.error('トピック埋め込み一括取得エラー:', error);
    return [];
  }
}

/**
 * トピック埋め込みを取得
 */
export async function getTopicEmbedding(
  topicId: string,
  meetingNoteId: string | undefined,
  regulationId?: string
): Promise<TopicEmbedding | null> {
  try {
    const parentId = meetingNoteId || regulationId;
    if (!parentId) {
      console.warn('getTopicEmbedding: meetingNoteIdまたはregulationIdが必要です');
      return null;
    }
    const embeddingId = `${parentId}-topic-${topicId}`;
    
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    let result: any = null;
    
    if (useSupabase) {
      // Supabase経由で取得
      const { getDocViaDataSource } = await import('./dataSourceAdapter');
      result = await getDocViaDataSource('topics', embeddingId);
      if (result) {
        result = { exists: true, data: result };
      }
    } else {
      // SQLite経由で取得
      const { callTauriCommand } = await import('./localFirebase');
      result = await callTauriCommand('doc_get', {
        collectionName: 'topics',
        docId: embeddingId,
      });
    }
    
    if (result && result.data) {
      return result.data as TopicEmbedding;
    }
    
    return null;
  } catch (error) {
    console.error('トピック埋め込みの取得エラー:', error);
    return null;
  }
}

/**
 * 類似トピックを検索
 */
export async function findSimilarTopics(
  queryText: string,
  limit: number = 5,
  meetingNoteId?: string,
  organizationId?: string,
  regulationId?: string
): Promise<Array<{ topicId: string; meetingNoteId?: string; regulationId?: string; similarity: number; title?: string; contentSummary?: string }>> {
  if (shouldUseChroma()) {
    try {
      const { findSimilarTopicsChroma } = await import('./topicEmbeddingsChroma');
      const results = await findSimilarTopicsChroma(queryText, limit, organizationId);
      // meetingNoteIdまたはregulationIdでフィルタリング
      let filteredResults = results;
      if (meetingNoteId) {
        filteredResults = results.filter(r => r.meetingNoteId === meetingNoteId);
      } else if (regulationId) {
        filteredResults = results.filter(r => r.regulationId === regulationId);
      }
      return filteredResults;
    } catch (chromaError: any) {
      console.error('ChromaDBでの検索に失敗しました:', chromaError?.message || chromaError);
      return [];
    }
  }
  
  return [];
}

/**
 * ハイブリッド検索: ベクトル検索 + メタデータフィルタリング・ブースト
 * 
 * 注意: 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。
 */
export async function findSimilarTopicsHybrid(
  queryText: string,
  limit: number = 20,
  filters?: {
    meetingNoteId?: string;
    organizationId?: string;
    semanticCategory?: TopicSemanticCategory;
    keywords?: string[];
  }
): Promise<Array<{ topicId: string; meetingNoteId: string; similarity: number; score: number }>> {
  // TODO: 新しい関連度計算アルゴリズムを実装
  console.warn('[findSimilarTopicsHybrid] 既存の関連度計算アルゴリズムは削除されました。新しい実装が必要です。');
  return [];
}

/**
 * 特定のトピックに類似するトピックを検索
 */
export async function findSimilarTopicsByTopicId(
  topicId: string,
  meetingNoteId: string | undefined,
  limit: number = 5,
  regulationId?: string
): Promise<Array<{ topicId: string; meetingNoteId?: string; regulationId?: string; similarity: number }>> {
  try {
    const topicEmbedding = await getTopicEmbedding(topicId, meetingNoteId, regulationId);
    
    if (!topicEmbedding || !topicEmbedding.combinedEmbedding) {
      return [];
    }

    const embeddingsSnapshot = await getDocs(collection(null, 'topics'));

    const similarities: Array<{ topicId: string; meetingNoteId?: string; regulationId?: string; similarity: number }> = [];
    
    for (const docSnap of embeddingsSnapshot.docs) {
      const embeddingData = docSnap.data() as TopicEmbedding;
      
      const embeddingParentId = embeddingData.meetingNoteId || embeddingData.regulationId;
      const currentParentId = meetingNoteId || regulationId;
      if (embeddingData.topicId === topicId && embeddingParentId === currentParentId) {
        continue;
      }

      if (!embeddingData.combinedEmbedding || embeddingData.combinedEmbedding.length === 0) {
        continue;
      }

      try {
        const similarity = cosineSimilarity(
          topicEmbedding.combinedEmbedding,
          embeddingData.combinedEmbedding
        );
        similarities.push({
          topicId: embeddingData.topicId,
          meetingNoteId: embeddingData.meetingNoteId,
          regulationId: embeddingData.regulationId,
          similarity,
        });
      } catch (error) {
        console.warn(`トピック ${embeddingData.topicId} の類似度計算でエラー:`, error);
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  } catch (error) {
    console.error('類似トピック検索エラー:', error);
    throw error;
  }
}

/**
 * 既存のトピック埋め込みを一括更新
 */
export async function batchUpdateTopicEmbeddings(
  topics: Array<{ id: string; title: string; content: string; metadata?: Partial<TopicMetadata> }>,
  meetingNoteId: string | undefined,
  organizationId: string,
  forceRegenerate: boolean = false,
  onProgress?: (current: number, total: number, topicId: string, status: 'processing' | 'skipped' | 'error' | 'success') => void,
  shouldCancel?: () => boolean,
  regulationId?: string
): Promise<{ success: number; skipped: number; errors: number }> {
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let processedCount = 0;

  const limit = pLimit(5);
  
  const promises = topics.map((topic) => 
    limit(async () => {
      if (shouldCancel && shouldCancel()) {
        return { status: 'cancelled' as const };
      }
      
      try {
        const parentId = meetingNoteId || regulationId;
        if (!parentId) {
          console.warn(`トピック ${topic.id} のparentIdが取得できません。スキップします。`);
          const current = ++processedCount;
          skippedCount++;
          onProgress?.(current, topics.length, topic.id, 'skipped');
          return { status: 'skipped' as const };
        }
        const topicEmbeddingId = `${parentId}-topic-${topic.id}`;
        
        if (!forceRegenerate) {
          try {
            const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
            let topicDoc: any = null;
            
            if (useSupabase) {
              // Supabase経由で取得
              const { getDocViaDataSource } = await import('./dataSourceAdapter');
              const topicData = await getDocViaDataSource('topics', topicEmbeddingId);
              if (topicData) {
                topicDoc = { exists: true, data: topicData };
              }
            } else {
              // SQLite経由で取得
              topicDoc = await callTauriCommand('doc_get', {
                collectionName: 'topics',
                docId: topicEmbeddingId,
              });
            }
            
            if (topicDoc?.exists && topicDoc?.data) {
              const chromaSynced = topicDoc.data.chromaSynced;
              if (chromaSynced === 1 || chromaSynced === true || chromaSynced === '1') {
                try {
                  const { getTopicEmbeddingFromChroma } = await import('./topicEmbeddingsChroma');
                  const existing = await getTopicEmbeddingFromChroma(topic.id, organizationId);
                  if (existing && existing.combinedEmbedding && Array.isArray(existing.combinedEmbedding) && existing.combinedEmbedding.length > 0) {
                    const current = ++processedCount;
                    skippedCount++;
                    onProgress?.(current, topics.length, topic.id, 'skipped');
                    return { status: 'skipped' as const };
                  } else {
                    try {
                      // Supabase使用時はupdate_chroma_sync_statusをスキップ
                      if (!useSupabase) {
                        await callTauriCommand('update_chroma_sync_status', {
                          entityType: 'topic',
                          entityId: topicEmbeddingId,
                          synced: false,
                          error: 'ChromaDBに存在しないため再生成',
                        });
                      }
                    } catch (resetError) {
                      console.warn(`chromaSyncedフラグのリセットエラー:`, resetError);
                    }
                  }
                } catch (chromaCheckError) {
                  console.warn(`ChromaDB確認エラー（続行）: ${topic.id}`, chromaCheckError);
                }
              }
            }
          } catch (error: any) {
            // データ取得に失敗した場合は続行
            console.warn(`トピック取得エラー（続行）: ${topic.id}`, error?.message);
          }
        }
        
        if (!forceRegenerate) {
          try {
            const { getTopicEmbeddingFromChroma } = await import('./topicEmbeddingsChroma');
            const existing = await getTopicEmbeddingFromChroma(topic.id, organizationId);
            if (existing && existing.combinedEmbedding && Array.isArray(existing.combinedEmbedding) && existing.combinedEmbedding.length > 0) {
              const current = ++processedCount;
              skippedCount++;
              onProgress?.(current, topics.length, topic.id, 'skipped');
              return { status: 'skipped' as const };
            }
          } catch (chromaCheckError) {
            // ChromaDB確認エラーは無視して続行
          }
        }

        await saveTopicEmbedding(
          topic.id,
          meetingNoteId,
          organizationId,
          topic.title,
          topic.content,
          topic.metadata,
          regulationId
        );
        
        const current = ++processedCount;
        successCount++;
        onProgress?.(current, topics.length, topic.id, 'success');
        return { status: 'success' as const };
      } catch (error) {
        const current = ++processedCount;
        console.error(`トピック ${topic.id} の埋め込み生成エラー:`, error);
        errorCount++;
        onProgress?.(current, topics.length, topic.id, 'error');
        return { status: 'error' as const };
      }
    })
  );

  await Promise.allSettled(promises);

  return { success: successCount, skipped: skippedCount, errors: errorCount };
}
