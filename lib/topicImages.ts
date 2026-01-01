/**
 * トピック画像の管理ユーティリティ
 */

import { callTauriCommand } from './localFirebase';
import { doc, setDoc, getDoc } from './localFirebase';

/**
 * 画像ファイルかどうかを判定
 */
function isImageFile(file: File): boolean {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  return imageTypes.includes(file.type) || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
}

/**
 * ファイルをBase64エンコード
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // data:image/png;base64, の形式から base64 部分だけを取得
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * GPT-4 Vision APIを使って画像の説明を生成
 * RAG検索用（簡潔）と詳細解説の2つを返す
 */
async function generateImageDescriptionWithGPT4Vision(
  imageBase64: string,
  imageMimeType: string,
  model: string = 'gpt-4o'
): Promise<{ description: string; detailedDescription: string }> {
  let apiKey: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      const { getAPIKey } = await import('@/lib/security');
      apiKey = getAPIKey('openai');
    } catch (error) {
      apiKey = localStorage.getItem('NEXT_PUBLIC_OPENAI_API_KEY');
    }
  }
  
  if (!apiKey) {
    apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || null;
  }
  
  if (!apiKey) {
    throw new Error('OpenAI APIキーが設定されていません。設定ページ（/settings）でAPIキーを設定してください。');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
      body: JSON.stringify({
        model: model, // GPT-4 Vision対応モデル
        messages: [
          {
            role: 'system',
            content: `あなたは画像分析の専門家です。画像の内容を詳細に観察し、以下の要素を含む包括的な説明文を生成してください：

1. **主要な被写体**: 画像の中心的な主題や人物、物体
2. **背景と環境**: 場所、時間帯、天候、雰囲気
3. **視覚的な詳細**: 色、構図、スタイル、質感
4. **動作や状態**: 人物の動作、表情、物体の状態
5. **文脈的な情報**: 推測できる状況、目的、意味
6. **重要なキーワード**: RAG検索で使用されるため、検索に有用な具体的なキーワードを含める

説明文は検索しやすく、かつ画像の内容を正確に伝えるものである必要があります。簡潔さよりも詳細さと正確さを優先してください。`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `この画像を詳細に分析し、包括的な説明文を生成してください。

以下の観点から画像を観察してください：
- 画像に写っている主要な被写体（人物、物体、風景など）
- 背景や環境の詳細
- 色、構図、スタイルなどの視覚的特徴
- 人物の表情、動作、服装などの詳細
- 画像から読み取れる文脈や状況
- 検索に有用な具体的なキーワード

説明文は日本語で、画像の内容を正確に伝える詳細なものにしてください。簡潔さよりも詳細さと正確さを優先します。`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${imageMimeType};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000, // 詳細な説明のため、トークン数を大幅に増加
        temperature: 0.8, // 創造性を少し上げて、より詳細な分析を促す
      }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`GPT-4 Vision APIエラー: ${response.status} ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const fullDescription = data.choices?.[0]?.message?.content?.trim() || '';
  
  // RAG検索用の簡潔な説明文を生成（別のAPI呼び出し）
  const ragResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'あなたは画像の内容を分析して、簡潔で検索しやすい説明文を生成する専門家です。説明文はRAG検索で使用されるため、重要なキーワードを含めてください。100文字程度の簡潔な説明文を生成してください。',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '以下の詳細な画像説明を基に、RAG検索用の簡潔な説明文（100文字程度）を生成してください。重要なキーワードを含めてください。\n\n詳細説明:\n' + fullDescription,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${imageMimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    }),
  });

  if (!ragResponse.ok) {
    // RAG検索用の生成に失敗した場合は、詳細説明の最初の100文字を使用
    const shortDescription = fullDescription.substring(0, 100) + (fullDescription.length > 100 ? '...' : '');
    return {
      description: shortDescription,
      detailedDescription: fullDescription,
    };
  }

  const ragData = await ragResponse.json();
  const ragDescription = ragData.choices?.[0]?.message?.content?.trim() || fullDescription.substring(0, 100);
  
  return {
    description: ragDescription,
    detailedDescription: fullDescription,
  };
}

/**
 * LFM2-VL-1.6Bを直接使用して画像の説明を生成（Ollama経由ではない）
 */
async function generateImageDescriptionWithLFM2Direct(
  imageBase64: string,
  imageMimeType: string,
  model: string = 'lfm2-vl-1.6b'
): Promise<string> {
  // ブラウザ環境では、APIエンドポイント経由で呼び出す
  const apiUrl = process.env.NEXT_PUBLIC_LFM2_VL_API_URL || '/api/lfm2-vl-inference';
  
  try {
    // タイムアウトを15分（900秒）に設定（モデルの読み込みと推論に時間がかかるため）
    // ブラウザのfetch APIにはデフォルトのタイムアウトはないが、念のため長めに設定
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn('[generateImageDescriptionWithLFM2Direct] リクエストがタイムアウトしました');
    }, 900000); // 15分
    
    console.log('[generateImageDescriptionWithLFM2Direct] リクエストを送信します...', {
      apiUrl,
      imageBase64Length: imageBase64.length,
      model,
    });
    
    // fetchリクエストを送信（タイムアウトなしで実行）
    const fetchPromise = fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: imageBase64,
        model_path: model,
      }),
      // signalは設定しない（ブラウザのデフォルトタイムアウトを回避）
    });
    
    // タイムアウトとfetchを競争させる
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId;
      setTimeout(() => {
        controller.abort();
        reject(new Error('リクエストがタイムアウトしました（15分）。処理に時間がかかっている可能性があります。'));
      }, 900000);
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]).catch((error: any) => {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError' || error.message?.includes('タイムアウト')) {
        throw new Error('リクエストがタイムアウトしました。処理に時間がかかっている可能性があります。もう一度お試しください。');
      }
      throw error;
    });
    
    clearTimeout(timeoutId);
    
    console.log('[generateImageDescriptionWithLFM2Direct] レスポンスを受信しました:', response.status);
    
    if (!response.ok) {
      let errorDetails = 'Unknown error';
      try {
        const errorData = await response.json();
        errorDetails = errorData.error || errorData.details || JSON.stringify(errorData);
        console.error('[generateImageDescriptionWithLFM2Direct] APIエラー詳細:', errorData);
      } catch (e) {
        errorDetails = await response.text().catch(() => 'Unknown error');
      }
      throw new Error(`LFM2-VL APIエラー: ${response.status} ${errorDetails}`);
    }
    
    console.log('[generateImageDescriptionWithLFM2Direct] レスポンスボディを読み取り中...');
    const data = await response.json().catch((error: any) => {
      console.error('[generateImageDescriptionWithLFM2Direct] JSONパースエラー:', error);
      throw new Error('レスポンスの解析に失敗しました');
    });
    
    console.log('[generateImageDescriptionWithLFM2Direct] レスポンスデータ:', data);
    
    if (data.success) {
      return data.description;
    } else {
      console.error('[generateImageDescriptionWithLFM2Direct] 推論エラー:', data);
      throw new Error(data.error || data.details || '説明の生成に失敗しました');
    }
  } catch (error: any) {
    console.error('[generateImageDescriptionWithLFM2Direct] エラー:', error);
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      throw new Error('リクエストがタイムアウトしました。処理に時間がかかっている可能性があります。もう一度お試しください。');
    }
    throw error;
  }
}

/**
 * Liquid AI（ローカルVLM）を使って画像の説明を生成
 * Ollama経由または直接使用
 */
async function generateImageDescriptionWithLiquidAI(
  imageBase64: string,
  imageMimeType: string,
  model: string = 'llava:latest',
  useDirect: boolean = false
): Promise<string> {
  // LFM2-VL-1.6Bで直接使用する場合
  if (useDirect && (model.includes('lfm2') || model.includes('LFM2'))) {
    return await generateImageDescriptionWithLFM2Direct(imageBase64, imageMimeType, model);
  }
  
  // Ollama経由で使用する場合
  const apiUrl = process.env.NEXT_PUBLIC_LIQUID_AI_API_URL || 'http://localhost:11434/api/chat';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'あなたは画像の内容を分析して、簡潔で検索しやすい説明文を生成する専門家です。説明文はRAG検索で使用されるため、重要なキーワードを含めてください。',
        },
        {
          role: 'user',
          content: 'この画像の内容を簡潔に説明してください。説明はRAG検索で使われるため、重要なキーワードを含めてください。日本語で100文字以内で説明してください。',
          images: [imageBase64],
        },
      ],
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 200,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Liquid AI APIエラー: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.message?.content?.trim() || '';
}

/**
 * VLMを使って画像の説明を自動生成
 * GPT-4 VisionまたはLiquid AIを使用
 * RAG検索用（簡潔）と詳細解説の2つを返す
 */
async function generateImageDescription(
  file: File,
  useLocalVLM: boolean = false,
  model: string = 'gpt-4o',
  useDirect: boolean = false
): Promise<{ description: string; detailedDescription: string } | null> {
  try {
    const imageBase64 = await fileToBase64(file);
    const imageMimeType = file.type || 'image/png';

    if (useLocalVLM) {
      // Liquid AI（ローカルVLM）を使用
      // LFM2-VL-1.6Bで直接使用する場合
      if (useDirect && (model.includes('lfm2') || model.includes('LFM2'))) {
        console.log('[generateImageDescription] LFM2-VL-1.6Bを直接使用して画像を分析中...', { model });
        const description = await generateImageDescriptionWithLiquidAI(imageBase64, imageMimeType, model, true);
        // ローカルVLMの場合は、同じ説明文を両方に使用（後で改善可能）
        return {
          description: description.substring(0, 200) + (description.length > 200 ? '...' : ''),
          detailedDescription: description,
        };
      } else {
        console.log('[generateImageDescription] Liquid AI（Ollama経由）を使用して画像を分析中...', { model });
        const description = await generateImageDescriptionWithLiquidAI(imageBase64, imageMimeType, model, false);
        // ローカルVLMの場合は、同じ説明文を両方に使用（後で改善可能）
        return {
          description: description.substring(0, 200) + (description.length > 200 ? '...' : ''),
          detailedDescription: description,
        };
      }
    } else {
      // GPT-4 Visionを使用
      console.log('[generateImageDescription] GPT-4 Visionを使用して画像を分析中...', { model });
      return await generateImageDescriptionWithGPT4Vision(imageBase64, imageMimeType, model);
    }
  } catch (error: any) {
    console.error('[generateImageDescription] 画像説明の生成エラー:', error);
    // エラーが発生しても処理を続行（手動入力にフォールバック）
    return null;
  }
}

/**
 * 画像ファイルをバイナリデータ（Uint8Array）に変換
 */
export async function fileToBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      resolve(bytes);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * ファイルをトピックに保存（画像、PDF、Excel、その他すべてのファイルタイプに対応）
 * 
 * @param organizationId 組織ID
 * @param topicId トピックID
 * @param meetingNoteId 議事録ID
 * @param file ファイル（画像、PDF、Excel、その他）
 * @param description ファイルの説明文（RAG検索用）
 * @param autoGenerateDescription 画像の場合、VLMで説明を自動生成するかどうか（デフォルト: false）
 * @param useLocalVLM ローカルVLM（Liquid AI）を使用するかどうか（デフォルト: false、GPT-4 Visionを使用）
 * @param vlmModel VLMで使用するモデル名（デフォルト: 'gpt-4o' または 'llava:latest'）
 * @returns 保存されたファイルのパス
 */
export async function saveTopicFile(
  organizationId: string,
  topicId: string,
  meetingNoteId: string,
  file: File,
  description?: string,
  autoGenerateDescription: boolean = false,
  useLocalVLM: boolean = false,
  vlmModel: string = 'gpt-4o',
  useDirect: boolean = false,
  parentTopicId?: string // 親トピックID（子トピックとして扱う場合）
): Promise<{ success: boolean; filePath?: string; fileId?: string; error?: string; generatedDescription?: string; generatedDetailedDescription?: string }> {
  try {
    // 画像ファイルで説明が未指定かつ自動生成が有効な場合、VLMで説明を生成
    let finalDescription = description;
    let finalDetailedDescription: string | undefined = undefined;
    if (isImageFile(file) && !description && autoGenerateDescription) {
      console.log('[saveTopicFile] 画像の説明を自動生成中...', { useLocalVLM, vlmModel, useDirect });
      const generatedDescriptions = await generateImageDescription(file, useLocalVLM, vlmModel, useDirect);
      if (generatedDescriptions) {
        finalDescription = generatedDescriptions.description;
        finalDetailedDescription = generatedDescriptions.detailedDescription;
        console.log('[saveTopicFile] 生成された説明:', finalDescription);
        console.log('[saveTopicFile] 生成された詳細解説:', finalDetailedDescription);
      } else {
        console.warn('[saveTopicFile] 説明の自動生成に失敗しました。手動入力にフォールバックします。');
      }
    }

    // ファイルをバイナリデータに変換
    const fileBytes = await fileToBytes(file);
    
    // ファイル名を生成（元のファイル名を使用、またはタイムスタンプ付き）
    const timestamp = Date.now();
    const originalName = file.name || 'file';
    const fileName = `${timestamp}_${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // Rust側のTauriコマンドを呼び出してファイルを保存
    // Uint8Arrayを配列に変換して渡す（Tauriが自動的にVec<u8>に変換）
    console.log('[saveTopicFile] ファイル保存を開始:', { 
      organizationId, 
      topicId, 
      meetingNoteId, 
      fileName,
      parentTopicId 
    });
    const result = await callTauriCommand('save_topic_file', {
      organizationId,
      topicId,
      fileBytes: Array.from(fileBytes),
      fileName,
      meetingNoteId: meetingNoteId,
      parentTopicId: parentTopicId || undefined, // 親トピックID（子トピックとして扱う場合）
      description: finalDescription,
      detailedDescription: finalDetailedDescription,
      mimeType: file.type || undefined,
    });
    console.log('[saveTopicFile] ファイル保存結果:', result);
    
    if (result && result.success) {
      const filePath = result.file_path as string;
      
      // SQLiteのtopicsテーブルにファイルパスを保存
      await updateTopicImagePaths(organizationId, topicId, meetingNoteId, filePath, finalDescription, finalDetailedDescription);
      
      return {
        success: true,
        filePath,
        fileId: result.file_id as string | undefined, // 新しいファイルIDを返す
        generatedDescription: finalDescription !== description ? finalDescription : undefined,
        generatedDetailedDescription: finalDetailedDescription,
      };
    } else {
      return {
        success: false,
        error: (result?.error as string) || 'ファイルの保存に失敗しました',
      };
    }
  } catch (error: any) {
    console.error('トピックファイルの保存エラー:', error);
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}

/**
 * 画像をトピックに保存（後方互換性のため保持）
 * 
 * @deprecated この関数は後方互換性のため保持されています。新しいコードでは`saveTopicFile`を使用してください。
 */
export async function saveTopicImage(
  organizationId: string,
  topicId: string,
  meetingNoteId: string,
  imageFile: File,
  description?: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  return saveTopicFile(organizationId, topicId, meetingNoteId, imageFile, description);
}

/**
 * トピックの画像パスリストを更新
 * 
 * @param organizationId 組織ID
 * @param topicId トピックID
 * @param meetingNoteId 議事録ID
 * @param imagePath 追加する画像パス
 * @param description 画像の説明文（RAG検索用）
 */
async function updateTopicImagePaths(
  organizationId: string,
  topicId: string,
  meetingNoteId: string,
  imagePath: string,
  description?: string,
  detailedDescription?: string
): Promise<void> {
  try {
    // topicsテーブルのidは {meetingNoteId}-topic-{topicId} の形式
    const topicDocId = `${meetingNoteId}-topic-${topicId}`;
    
    // トピックデータを取得
    const topicDoc = await getDoc(doc(null, 'topics', topicDocId));
    let topicData = topicDoc?.data() || {};
    
    // トピックが存在しない場合、最小限のデータを作成
    if (!topicDoc?.exists || !topicData.topicId) {
      const now = new Date().toISOString();
      topicData = {
        id: topicDocId,
        topicId: topicId,
        meetingNoteId: meetingNoteId,
        organizationId: organizationId,
        title: '', // タイトルは必須だが、後で更新される可能性がある
        content: '',
        createdAt: now,
        updatedAt: now,
        chromaSynced: 0,
      };
    }
    
    // 既存の画像パスリストを取得
    let imagePaths: Array<{ path: string; description?: string; detailedDescription?: string }> = [];
    if (topicData.imagePaths) {
      try {
        imagePaths = typeof topicData.imagePaths === 'string'
          ? JSON.parse(topicData.imagePaths)
          : topicData.imagePaths;
      } catch (e) {
        console.warn('imagePathsのパースに失敗しました:', e);
        imagePaths = [];
      }
    }
    
    // 新しい画像パスを追加
    imagePaths.push({
      path: imagePath,
      description: description || '',
      detailedDescription: detailedDescription,
    });
    
    // 画像の説明文をcontentに統合（RAG検索用）
    const imageDescriptions = imagePaths
      .filter(img => img.description)
      .map(img => `[画像: ${img.description}]`)
      .join(' ');
    
    const currentContent = topicData.content || '';
    const updatedContent = currentContent
      ? `${currentContent}\n\n${imageDescriptions}`
      : imageDescriptions;
    
    // トピックデータを更新（必須フィールドを確実に含める）
    await setDoc(doc(null, 'topics', topicDocId), {
      ...topicData,
      id: topicDocId,
      topicId: topicId,
      meetingNoteId: meetingNoteId,
      organizationId: organizationId,
      title: topicData.title || '', // タイトルが空の場合は空文字列
      imagePaths: JSON.stringify(imagePaths),
      content: updatedContent,
      updatedAt: new Date().toISOString(),
      createdAt: topicData.createdAt || new Date().toISOString(),
      chromaSynced: topicData.chromaSynced || 0,
    });
  } catch (error) {
    console.error('トピック画像パスの更新エラー:', error);
    throw error;
  }
}

/**
 * トピックの画像パスリストを取得
 * 
 * @param topicId トピックID
 * @param meetingNoteId 議事録ID
 * @returns 画像パスリスト
 */
export async function getTopicImagePaths(
  topicId: string,
  meetingNoteId?: string
): Promise<Array<{ path: string; description?: string; detailedDescription?: string; id?: string; fileName?: string; mimeType?: string; fileSize?: number }>> {
  try {
    // まず、新しいtopicFilesテーブルから取得を試みる
    // topicFilesテーブルのtopicIdはtopicsテーブルのid（{meetingNoteId}-topic-{topicId}形式）を参照している
    // そのため、まずtopicsテーブルから実際のidを取得する必要がある
    let actualTopicId = topicId;
    if (meetingNoteId) {
      // meetingNoteIdがある場合、{meetingNoteId}-topic-{topicId}形式のidを構築
      actualTopicId = `${meetingNoteId}-topic-${topicId}`;
    } else {
      // meetingNoteIdがない場合、topicsテーブルからidを取得を試みる
      try {
        const topicDoc = await getDoc(doc(null, 'topics', topicId));
        const topicData = topicDoc?.data();
        if (topicData && topicData.id) {
          actualTopicId = topicData.id;
        }
      } catch (e) {
        console.warn('topicsテーブルからidを取得できませんでした:', e);
      }
    }
    
    try {
      // Supabase専用（環境変数チェック不要）
      const { getCollectionViaDataSource } = await import('./dataSourceAdapter');
      const files = await getCollectionViaDataSource('topicFiles', {
        filters: [{ field: 'topicid', operator: 'eq', value: actualTopicId }]
      });
      const filesResult = files.map((file: any) => ({
        id: file.id,
        data: file
      }));
      
      console.log('topicFilesテーブルからの取得結果:', filesResult); // デバッグ用
      if (filesResult && Array.isArray(filesResult) && filesResult.length > 0) {
        return filesResult.map((item: any) => {
          const file = item.data || item;
          // query_getは { id: "...", data: { ... } } の形式で返すため、item.idを優先
          const fileId = item.id || file.id;
          return {
            path: file.filePath || file.path,
            description: file.description,
            detailedDescription: file.detailedDescription,
            id: fileId,
            fileName: file.fileName,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
          };
        });
      }
    } catch (e) {
      console.warn('topicFilesテーブルからの取得に失敗しました（後方互換性のため、imagePathsから取得します）:', e);
    }
    
    // 後方互換性のため、既存のimagePathsからも取得
    const topicDocId = meetingNoteId ? `${meetingNoteId}-topic-${topicId}` : topicId;
    const topicDoc = await getDoc(doc(null, 'topics', topicDocId));
    const topicData = topicDoc?.data();
    
    if (!topicData || !topicData.imagePaths) {
      return [];
    }
    
    try {
      const imagePaths = typeof topicData.imagePaths === 'string'
        ? JSON.parse(topicData.imagePaths)
        : topicData.imagePaths;
      
      // imagePathsから取得した場合、ファイルパスを使ってtopicFilesテーブルからIDを取得
      const filesWithIds = await Promise.all(
        (Array.isArray(imagePaths) ? imagePaths : []).map(async (imgPath: any) => {
          const filePath = imgPath.path || imgPath;
          const fileName = filePath.split('/').pop() || '';
          
          // ファイルパスまたはファイル名でtopicFilesテーブルを検索してIDを取得
          try {
            // Supabase専用（環境変数チェック不要）
            const { getCollectionViaDataSource } = await import('./dataSourceAdapter');
            // まず、topicIdとfilePathで検索
            let files = await getCollectionViaDataSource('topicFiles', {
              filters: [
                { field: 'topicid', operator: 'eq', value: topicId },
                { field: 'filepath', operator: 'eq', value: filePath }
              ]
            });
            
            // 見つからない場合、topicIdとfileNameで検索
            if (!files || files.length === 0) {
              files = await getCollectionViaDataSource('topicFiles', {
                filters: [
                  { field: 'topicid', operator: 'eq', value: topicId },
                  { field: 'filename', operator: 'eq', value: fileName }
                ]
              });
            }
            
            const fileResult = files.map((file: any) => ({
              id: file.id,
              data: file
            }));
            
            if (fileResult && Array.isArray(fileResult) && fileResult.length > 0) {
              const item = fileResult[0];
              const file = item.data || item;
              const fileId = item.id || file.id;
              return {
                path: file.filePath || filePath,
                description: imgPath.description || file.description,
                detailedDescription: imgPath.detailedDescription || file.detailedDescription,
                id: fileId,
                fileName: file.fileName || fileName,
                mimeType: file.mimeType,
                fileSize: file.fileSize,
              };
            }
          } catch (e) {
            console.warn('ファイルパスからIDを取得できませんでした:', filePath, e);
          }
          
          // IDが取得できない場合でも、基本情報を返す
          return {
            path: filePath,
            description: imgPath.description,
            detailedDescription: imgPath.detailedDescription,
            id: undefined,
            fileName: fileName,
            mimeType: undefined,
            fileSize: undefined,
          };
        })
      );
      
      return filesWithIds;
    } catch (e) {
      console.warn('imagePathsのパースに失敗しました:', e);
      return [];
    }
  } catch (error) {
    console.error('トピック画像パスの取得エラー:', error);
    return [];
  }
}

/**
 * 親トピックIDで子トピック（ファイル）を取得
 * 
 * @param parentTopicId 親トピックID
 * @returns 子トピック（ファイル）のリスト
 */
export async function getChildTopicFiles(
  parentTopicId: string
): Promise<Array<{ path: string; description?: string; detailedDescription?: string; id?: string; fileName?: string; mimeType?: string; fileSize?: number }>> {
  try {
    // Supabase専用（環境変数チェック不要）
    const { getCollectionViaDataSource } = await import('./dataSourceAdapter');
    const files = await getCollectionViaDataSource('topicFiles', {
      filters: [{ field: 'parenttopicid', operator: 'eq', value: parentTopicId }]
    });
    const filesResult = files.map((file: any) => ({
      id: file.id,
      data: file
    }));
    
    if (filesResult && Array.isArray(filesResult) && filesResult.length > 0) {
      return filesResult.map((item: any) => {
        const file = item.data || item;
        return {
          path: file.filePath || file.path,
          description: file.description,
          detailedDescription: file.detailedDescription,
          id: file.id || item.id,
          fileName: file.fileName,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
        };
      });
    }
    
    return [];
  } catch (error) {
    console.error('子トピック（ファイル）の取得エラー:', error);
    return [];
  }
}

/**
 * 既存の画像ファイルからVLMで説明を生成して更新
 * 
 * @param organizationId 組織ID
 * @param topicId トピックID
 * @param meetingNoteId 議事録ID
 * @param imagePath 画像ファイルのパス
 * @param useLocalVLM ローカルVLM（Liquid AI）を使用するかどうか
 * @param vlmModel VLMで使用するモデル名
 * @returns 生成された説明
 */
export async function generateDescriptionForExistingImage(
  organizationId: string,
  topicId: string,
  meetingNoteId: string,
  imagePath: string,
  useLocalVLM: boolean = false,
  vlmModel: string = 'gpt-4o',
  useDirect: boolean = false
): Promise<{ success: boolean; description?: string; error?: string }> {
  try {
    // ファイルパスからファイルを読み込む
    const result = await callTauriCommand('read_file', { filePath: imagePath });
    
    if (!result || !result.success || !result.data) {
      throw new Error('画像ファイルの読み込みに失敗しました');
    }

    // Base64データを取得（Tauriコマンドから返されるデータをBase64に変換）
    // 実際には、ファイルを直接読み込むのではなく、fetchで読み込む必要がある
    // ただし、Tauri環境ではfile://プロトコルが使えないため、別の方法が必要
    
    // ファイルパスからFileオブジェクトを作成
    // Tauri環境ではconvertFileSrcを使用してURLを取得
    let imageUrl: string;
    try {
      const { convertFileSrc } = await import('@tauri-apps/api/core');
      imageUrl = convertFileSrc(imagePath);
    } catch (error) {
      // convertFileSrcが利用できない場合は、file://プロトコルを使用（動作しない可能性がある）
      console.warn('convertFileSrcが利用できません。file://プロトコルを使用します。', error);
      imageUrl = `file://${imagePath}`;
    }
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`画像の読み込みに失敗しました: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const file = new File([blob], imagePath.split('/').pop() || 'image', { type: blob.type || 'image/png' });
    
    // VLMで説明を生成
    const descriptions = await generateImageDescription(file, useLocalVLM, vlmModel, useDirect);
    
    if (!descriptions) {
      return {
        success: false,
        error: '説明の生成に失敗しました',
      };
    }
    
    // 説明を更新
    await updateTopicFileDescription(organizationId, topicId, meetingNoteId, imagePath, descriptions.description, descriptions.detailedDescription);
    
    return {
      success: true,
      description: descriptions.description,
    };
  } catch (error: any) {
    console.error('既存画像の説明生成エラー:', error);
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}

/**
 * 既存のファイルの説明を更新（公開関数）
 */
export async function updateTopicFileDescription(
  organizationId: string,
  topicId: string,
  meetingNoteId: string,
  filePath: string,
  description: string,
  detailedDescription?: string
): Promise<void> {
  try {
    const topicDocId = `${meetingNoteId}-topic-${topicId}`;
    const topicDoc = await getDoc(doc(null, 'topics', topicDocId));
    const topicData = topicDoc?.data() || {};
    
    // 既存のファイルパスリストを取得
    let imagePaths: Array<{ path: string; description?: string; detailedDescription?: string }> = [];
    if (topicData.imagePaths) {
      try {
        imagePaths = typeof topicData.imagePaths === 'string'
          ? JSON.parse(topicData.imagePaths)
          : topicData.imagePaths;
      } catch (e) {
        console.warn('imagePathsのパースに失敗しました:', e);
        imagePaths = [];
      }
    }
    
    // 指定されたファイルパスの説明を更新
    const updatedImagePaths = imagePaths.map(img => 
      img.path === filePath ? { ...img, description, detailedDescription } : img
    );
    
    // 画像の説明文をcontentに統合（RAG検索用）
    const imageDescriptions = updatedImagePaths
      .filter(img => img.description)
      .map(img => `[画像: ${img.description}]`)
      .join(' ');
    
    // 元のcontentから画像説明を除去して再構築
    let updatedContent = topicData.content || '';
    if (updatedContent) {
      updatedContent = updatedContent.replace(/\[画像:.*?\]/g, '').trim();
      if (imageDescriptions) {
        updatedContent = updatedContent ? `${updatedContent}\n\n${imageDescriptions}` : imageDescriptions;
      }
    } else {
      updatedContent = imageDescriptions;
    }
    
    // トピックデータを更新
    await setDoc(doc(null, 'topics', topicDocId), {
      ...topicData,
      id: topicDocId,
      topicId: topicId,
      meetingNoteId: meetingNoteId,
      organizationId: organizationId,
      title: topicData.title || '',
      imagePaths: JSON.stringify(updatedImagePaths),
      content: updatedContent,
      updatedAt: new Date().toISOString(),
      createdAt: topicData.createdAt || new Date().toISOString(),
      chromaSynced: topicData.chromaSynced || 0,
    });
  } catch (error) {
    console.error('ファイル説明の更新エラー:', error);
    throw error;
  }
}

/**
 * トピックから画像を削除
 * 
 * @param organizationId 組織ID
 * @param topicId トピックID
 * @param meetingNoteId 議事録ID
 * @param imagePath 削除する画像パス
 */
export async function deleteTopicImage(
  organizationId: string,
  topicId: string,
  meetingNoteId: string,
  imagePath: string
): Promise<void> {
  try {
    // まず、topicFilesテーブルからファイルを検索して削除
    const actualTopicId = `${meetingNoteId}-topic-${topicId}`;
    try {
      // Supabase専用（環境変数チェック不要）
      const { getCollectionViaDataSource, deleteDocViaDataSource } = await import('./dataSourceAdapter');
      // ファイルパスでtopicFilesテーブルを検索
      let files = await getCollectionViaDataSource('topicFiles', {
        filters: [
          { field: 'topicid', operator: 'eq', value: actualTopicId },
          { field: 'filepath', operator: 'eq', value: imagePath }
        ]
      });
      
      if (!files || files.length === 0) {
        // ファイル名でも検索を試みる
        const fileName = imagePath.split('/').pop();
        if (fileName) {
          files = await getCollectionViaDataSource('topicFiles', {
            filters: [
              { field: 'topicid', operator: 'eq', value: actualTopicId },
              { field: 'filename', operator: 'eq', value: fileName }
            ]
          });
        }
      }
      
      const filesResult = files.map((file: any) => ({
        id: file.id,
        data: file
      }));
      
      // 見つかったファイルを削除
      for (const item of filesResult) {
        const fileId = item.id || (item.data && item.data.id);
        if (fileId) {
          try {
            await deleteDocViaDataSource('topicFiles', fileId);
            console.log('✅ [deleteTopicImage] topicFilesテーブルから削除しました: fileId=', fileId);
          } catch (e) {
            console.warn('⚠️ [deleteTopicImage] topicFilesテーブルからの削除に失敗しました:', e);
          }
        }
      }
      
    } catch (e) {
      console.warn('⚠️ [deleteTopicImage] topicFilesテーブルからの削除に失敗しました（後方互換性のため、imagePathsから削除します）:', e);
    }
    
    // topicsテーブルのidは {meetingNoteId}-topic-{topicId} の形式
    const topicDocId = `${meetingNoteId}-topic-${topicId}`;
    
    // トピックデータを取得
    const topicDoc = await getDoc(doc(null, 'topics', topicDocId));
    const topicData = topicDoc?.data() || {};
    
    // 既存の画像パスリストを取得
    let imagePaths: Array<{ path: string; description?: string; detailedDescription?: string }> = [];
    if (topicData.imagePaths) {
      try {
        imagePaths = typeof topicData.imagePaths === 'string'
          ? JSON.parse(topicData.imagePaths)
          : topicData.imagePaths;
      } catch (e) {
        console.warn('imagePathsのパースに失敗しました:', e);
        imagePaths = [];
      }
    }
    
    // 指定された画像パスを削除
    imagePaths = imagePaths.filter(img => img.path !== imagePath);
    
    // 画像の説明文をcontentから削除（RAG検索用）
    const imageDescriptions = imagePaths
      .filter(img => img.description)
      .map(img => `[画像: ${img.description}]`)
      .join(' ');
    
    // 元のcontentから画像説明を除去
    let updatedContent = topicData.content || '';
    if (updatedContent) {
      // 画像説明のパターンを削除
      updatedContent = updatedContent.replace(/\[画像:.*?\]/g, '').trim();
      if (imageDescriptions) {
        updatedContent = `${updatedContent}\n\n${imageDescriptions}`;
      }
    } else {
      updatedContent = imageDescriptions;
    }
    
    // トピックデータを更新（必須フィールドを確実に含める）
    await setDoc(doc(null, 'topics', topicDocId), {
      ...topicData,
      id: topicDocId,
      topicId: topicId,
      meetingNoteId: meetingNoteId,
      organizationId: organizationId,
      title: topicData.title || '', // タイトルが必須なので、存在しない場合は空文字列
      imagePaths: JSON.stringify(imagePaths),
      content: updatedContent,
      updatedAt: new Date().toISOString(),
      createdAt: topicData.createdAt || new Date().toISOString(),
      chromaSynced: topicData.chromaSynced || 0,
    });
  } catch (error) {
    console.error('トピック画像の削除エラー:', error);
    throw error;
  }
}

