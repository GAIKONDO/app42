/**
 * Graphvizカード用の埋め込み管理
 * YAML、説明文、要約をトピックとしてEmbedding化し、RAG検索可能にする
 */

import { callTauriCommand, doc, setDoc } from './localFirebase';
import { 
  generateCombinedEmbedding, 
  generateSeparatedEmbeddings,
  generateEnhancedEmbedding,
  generateMetadataEmbedding,
} from './embeddings';
import { shouldUseChroma } from './chromaConfig';

/**
 * Graphvizカードの埋め込みをChromaDBに保存
 * @param yamlFileId YAMLファイルID（トピックIDとして使用）
 * @param organizationId 組織ID
 * @param title タイトル（YAMLファイル名）
 * @param content コンテンツ（YAML、説明文、要約を結合）
 * @param metadata メタデータ（セマンティックカテゴリ、キーワード、要約など）
 */
export async function saveGraphvizCardEmbeddingToChroma(
  yamlFileId: string,
  organizationId: string,
  title: string,
  content: string,
  metadata?: {
    semanticCategory?: string;
    keywords?: string[];
    summary?: string;
    description?: string;
    yamlType?: string;
  }
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Graphvizカード埋め込みの保存はクライアント側でのみ実行可能です');
  }

  if (!shouldUseChroma()) {
    console.warn('⚠️ [saveGraphvizCardEmbeddingToChroma] ChromaDBが無効です。スキップします。');
    return;
  }

  try {
    const now = new Date().toISOString();
    const embeddingVersion = metadata ? '2.0' : '1.0';

    // 埋め込みを生成
    let combinedEmbedding: number[] | undefined;
    let titleEmbedding: number[] | undefined;
    let contentEmbedding: number[] | undefined;
    let metadataEmbedding: number[] | undefined;

    if (metadata && (metadata.keywords || metadata.semanticCategory)) {
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

    // contentSummaryを生成
    const contentSummary = content && content.length > 0 
      ? content.substring(0, 200)
      : '';

    // メタデータを準備
    const embeddingMetadata: Record<string, any> = {
      topicId: yamlFileId, // GraphvizカードのIDをトピックIDとして使用
      meetingNoteId: `graphviz_${yamlFileId}`, // Graphvizカード用のダミーID
      organizationId,
      title,
      contentSummary,
      semanticCategory: metadata?.semanticCategory || '',
      keywords: metadata?.keywords ? JSON.stringify(metadata.keywords) : '',
      summary: metadata?.summary || '',
      description: metadata?.description || '',
      yamlType: metadata?.yamlType || '',
      sourceType: 'graphviz', // Graphvizカードであることを示す
      embeddingVersion,
      createdAt: now,
      updatedAt: now,
    };

    const meetingNoteId = `graphviz_${yamlFileId}`; // Graphvizカード用のダミーID
    const embeddingId = `${meetingNoteId}-topic-${yamlFileId}`;
    
    // Rust側のTauriコマンドを呼び出し（ChromaDBに保存）
    await callTauriCommand('chromadb_save_topic_embedding', {
      topicId: yamlFileId,
      meetingNoteId,
      organizationId,
      combinedEmbedding: combinedEmbedding || [],
      metadata: embeddingMetadata,
    });

    // SQLiteのtopicsテーブルにも保存（ナレッジグラフのリスト表示で取得できるようにするため）
    try {
      // descriptionの優先順位: metadata.description > metadata.summary
      const description = metadata?.description || metadata?.summary || null;
      
      // searchableTextを手動で生成（トリガーに依存せず明示的に設定）
      const searchableTextParts: string[] = [];
      if (title) searchableTextParts.push(title);
      if (description) searchableTextParts.push(description);
      if (contentSummary) searchableTextParts.push(contentSummary);
      const searchableText = searchableTextParts.join(' ').trim() || null;
      
      const topicData: any = {
        id: embeddingId,
        topicId: yamlFileId,
        meetingNoteId,
        organizationId,
        title: title || '',
        content: content && content.length > 0 ? content : null,
        description: description,
        contentSummary: contentSummary && contentSummary.length > 0 ? contentSummary : null,
        searchableText: searchableText && searchableText.length > 0 ? searchableText : null,
        createdAt: now,
        updatedAt: now,
      };

      // メタデータフィールドを追加（空文字列でも保存）
      if (metadata?.semanticCategory) {
        topicData.semanticCategory = metadata.semanticCategory;
      }
      
      // keywordsは空配列でも保存（JSON文字列として）
      if (metadata?.keywords !== undefined) {
        if (Array.isArray(metadata.keywords) && metadata.keywords.length > 0) {
          topicData.keywords = JSON.stringify(metadata.keywords);
        } else if (Array.isArray(metadata.keywords)) {
          topicData.keywords = JSON.stringify([]); // 空配列も保存
        }
      }
      
      // tagsは空配列として保存（Graphvizカードにはタグがないため）
      topicData.tags = JSON.stringify([]);
      
      // sourceTypeをメタデータとして保存
      topicData.sourceType = 'graphviz';
      if (metadata?.yamlType) {
        topicData.yamlType = metadata.yamlType;
      }
      
      // ChromaDB同期状態を設定（ChromaDBに保存済みなので1）
      topicData.chromaSynced = 1;

      console.log('💾 [saveGraphvizCardEmbeddingToChroma] topicsテーブルに保存開始:', {
        embeddingId,
        topicDataKeys: Object.keys(topicData),
      });
      
      await setDoc(doc(null, 'topics', embeddingId), topicData);
      console.log('✅ [saveGraphvizCardEmbeddingToChroma] topicsテーブルへの保存成功:', embeddingId);
    } catch (topicSaveError: any) {
      console.error(`❌ [saveGraphvizCardEmbeddingToChroma] topicsテーブルへの保存に失敗しました: ${embeddingId}`, {
        error: topicSaveError,
        errorMessage: topicSaveError?.message,
      });
      // エラーが発生しても続行（ChromaDBへの保存は成功しているため）
    }

    console.log('✅ [saveGraphvizCardEmbeddingToChroma] Graphvizカードの埋め込みを保存しました:', {
      yamlFileId,
      organizationId,
      title,
      contentLength: content.length,
      hasMetadata: !!metadata,
    });
  } catch (error) {
    console.error('❌ [saveGraphvizCardEmbeddingToChroma] ChromaDBへのGraphvizカード埋め込み保存エラー:', error);
    throw error;
  }
}

/**
 * Graphvizカードの埋め込みを保存（メタデータ抽出後）
 * @param yamlFileId YAMLファイルID
 * @param yamlName YAMLファイル名
 * @param yamlContent YAMLコンテンツ
 * @param organizationId 組織ID
 * @param description 説明文（オプション）
 * @param summary 要約（オプション）
 * @param semanticCategory セマンティックカテゴリ（オプション）
 * @param keywords キーワード（オプション）
 * @param yamlType YAMLタイプ（オプション）
 */
export async function saveGraphvizCardAsTopic(
  yamlFileId: string,
  yamlName: string,
  yamlContent: string,
  organizationId: string,
  options?: {
    description?: string;
    summary?: string;
    semanticCategory?: string;
    keywords?: string[];
    yamlType?: string;
    dotContent?: string;
  }
): Promise<void> {
  if (!organizationId) {
    console.warn('⚠️ [saveGraphvizCardAsTopic] organizationIdが指定されていないため、スキップします。');
    return;
  }

  try {
    // YAML、説明文、要約を結合してコンテンツを作成
    const contentParts: string[] = [];
    
    // 説明文を追加
    if (options?.description) {
      contentParts.push(`説明: ${options.description}`);
    }
    
    // YAMLコンテンツを追加
    if (yamlContent) {
      contentParts.push(`YAMLコンテンツ:\n${yamlContent}`);
    }
    
    // DOTコードを追加（オプション）
    if (options?.dotContent) {
      contentParts.push(`Graphviz DOTコード:\n${options.dotContent}`);
    }
    
    // 要約を追加
    if (options?.summary) {
      contentParts.push(`要約: ${options.summary}`);
    }
    
    const combinedContent = contentParts.join('\n\n');
    
    // 埋め込みを保存
    await saveGraphvizCardEmbeddingToChroma(
      yamlFileId,
      organizationId,
      yamlName,
      combinedContent,
      {
        semanticCategory: options?.semanticCategory,
        keywords: options?.keywords,
        summary: options?.summary,
        description: options?.description,
        yamlType: options?.yamlType,
      }
    );
    
    console.log('✅ [saveGraphvizCardAsTopic] Graphvizカードをトピックとして保存しました:', {
      yamlFileId,
      yamlName,
      organizationId,
    });
  } catch (error) {
    console.error('❌ [saveGraphvizCardAsTopic] Graphvizカードのトピック保存エラー:', error);
    // エラーが発生しても続行（メタデータ抽出は成功しているため）
  }
}

