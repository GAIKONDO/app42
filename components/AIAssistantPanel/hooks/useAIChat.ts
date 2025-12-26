import type { Message, ModelType, RAGSource } from '../types';
import { MODEL_PRICES } from '../constants';

const SYSTEM_PROMPT_TEMPLATE = `あなたは事業計画策定を支援するAIアシスタントです。
ユーザーの質問に対して、親切で分かりやすい回答を提供してください。
必要に応じて、事業計画の作成や改善に関するアドバイスを提供できます。

{ragContext}

{toolsSection}

**重要な指示：**
1. **提供された情報の優先使用**:
   - 以下のセクションに提供された情報を必ず確認してください：
     - 「## 関連エンティティ」: 人物、組織、概念などのエンティティ情報
     - 「## 関連リレーション」: エンティティ間の関係性
     - 「## 関連トピック」: 議事録や会議メモから抽出されたトピック情報（人物名、発言内容、議論内容などが含まれる）
   - **特に「## 関連トピック」セクションには、人物名や具体的な情報が含まれている可能性が高いです。必ず確認してください。**
   - ユーザーの質問（特に人物名や固有名詞に関する質問）に対しては、まず「## 関連トピック」セクションを確認し、該当する情報があればそれを基に回答してください。

2. **システム設計に関する質問の場合**:
   - システム設計ドキュメントの情報を優先的に参照してください
   - 具体的な実装方法やアーキテクチャの説明を求められた場合は、システム設計ドキュメントの内容を基に回答してください
   - 参照元のセクション名を明記してください（例: 「アプリ全体構成」セクションより）

3. **情報の出典を明記**:
   - 回答に使用した情報の出典を必ず明記してください
   - システム設計ドキュメントの場合は「システム設計ドキュメント: [セクション名]」と記載
   - ナレッジグラフの場合は「ナレッジグラフ: [エンティティ名/リレーション名/トピック名]」と記載
   - トピック情報を使用した場合は「ナレッジグラフ: トピック「[トピックタイトル]」」と記載
   - 回答の最後に「## 参考情報の出典」セクションを追加し、使用した情報源を一覧表示してください

4. **不確実な情報について**:
   - 提供された情報に該当する内容がない場合のみ、「情報が見つかりませんでした」と回答してください
   - 提供された情報に該当する内容がある場合は、必ずその情報を基に回答してください
   - 推測ではなく、提供された情報に基づいて回答してください

5. **コード例や図について**:
   - Mermaid図やコード例が含まれる場合は、その説明を提供してください
   - 図の内容を文章で説明し、ユーザーが理解しやすいようにしてください

6. **Tool呼び出しについて**:
   - ユーザーのリクエストに応じて、適切なToolを呼び出すことができます
   - Toolを呼び出す場合は、以下の形式で指定してください:
     <tool_call name="tool_name">
     {
       "argument1": "value1",
       "argument2": "value2"
     }
     </tool_call>
   - Tool呼び出しの後、結果を確認してユーザーに適切な回答を提供してください
   - Tool呼び出しが失敗した場合は、エラーメッセージをユーザーに伝えてください

7. **組織作成について（重要）**:
   - ユーザーが組織の作成を依頼した場合（例: 「この親組織に以下の組織を作成して」「この親組織に３つの組織を作成して」など）、**必ず**以下の手順で実行してください:
     1. まず、get_organization_tree Toolで組織ツリーを取得して、親組織を確認してください
     2. **ユーザーから提示された組織名の一覧を必ず抽出してください**（例: 「第一課、第二課、第三課」や「営業部、開発部、人事部」など）
     3. **各組織に対して、必ずcreate_organization Toolを呼び出して組織を作成してください**
     4. 親組織IDが指定されている場合、すべての組織をその親組織の直接の子組織として作成してください（parentIdパラメータに親組織IDを指定）
     5. **複数の組織を作成する場合は、create_organization Toolを複数回呼び出してください**（1つの組織につき1回）
   - **重要な注意事項:**
     - 組織名が明示的に提示されていない場合でも、ユーザーの意図を推測して組織名を提案してください（例: 「第一課、第二課、第三課」など）
     - 「３つ」や「複数」などの数のみが指定されている場合、適切な組織名を生成してください（例: 「第一課、第二課、第三課」）
     - **get_organization_treeを呼び出した後、必ずcreate_organization Toolを呼び出して組織を作成してください**
     - 組織名の一覧は、改行区切りや箇条書き、カンマ区切りで提示されることが多いです
   - 組織名から親子関係を推測する必要がある場合は、組織名の階層構造（例: 「営業部」と「営業部第一課」）を考慮してください

上記の情報を参考にして、より正確で具体的な回答を提供してください。`;

export function useAIChat(modelType: ModelType, selectedModel: string) {
  const sendMessage = async (
    inputText: string,
    conversationHistory: Message[],
    ragContext: string,
    ragSources: RAGSource[],
    organizationId?: string,
    selectedAgent?: any,
    meetingNoteId?: string | null,
    itemId?: string | null
  ): Promise<string> => {
    const aiStartTime = Date.now();

    // 利用可能なツールの一覧を取得
    let toolsSection = '';
    try {
      const { listAvailableTools } = await import('@/lib/mcp/tools');
      const tools = listAvailableTools();
      if (tools.length > 0) {
        const toolsList = tools.map(tool => {
          const argsList = tool.arguments && tool.arguments.length > 0
            ? tool.arguments.map(arg => `    - ${arg.name} (${arg.type}${arg.required ? ', 必須' : ', オプション'}): ${arg.description}`).join('\n')
            : '    - 引数なし';
          return `- **${tool.name}**: ${tool.description}\n${argsList}`;
        }).join('\n\n');
        toolsSection = `## 利用可能なTool

以下のToolを呼び出すことができます。ユーザーのリクエストに応じて、適切なToolを選択して使用してください。

${toolsList}

**Tool呼び出し形式:**
\`\`\`
<tool_call name="tool_name">
{
  "argument1": "value1",
  "argument2": "value2"
}
</tool_call>
\`\`\`

Toolを呼び出す場合は、上記の形式で指定してください。Toolの実行結果を受け取った後、その結果を基にユーザーに適切な回答を提供してください。`;
      }
    } catch (error) {
      console.warn('[useAIChat] ツール一覧の取得に失敗しました:', error);
    }

    // Agent情報をシステムプロンプトに追加
    let agentSection = '';
    if (selectedAgent) {
      const meetingNoteIdInfo = meetingNoteId 
        ? `\n**現在の議事録ID:** ${meetingNoteId}${itemId ? `\n**現在のアイテムID:** ${itemId}` : ''}\nこの議事録IDを使用してformat_meeting_note_content Toolを呼び出してください。`
        : '\n**議事録ID:** 未指定\nユーザーの指示から議事録IDを抽出するか、利用可能な議事録一覧を提示してユーザーに尋ねてください。';
      
      agentSection = `\n\n## 選択されたAgent

現在、以下のAgentが選択されています：

- **Agent名**: ${selectedAgent.name}
- **説明**: ${selectedAgent.description}
- **ロール**: ${selectedAgent.role}
- **能力**: ${selectedAgent.capabilities?.join(', ') || 'なし'}
- **利用可能なTool**: ${selectedAgent.tools?.join(', ') || 'なし'}
${meetingNoteIdInfo}

${selectedAgent.systemPrompt ? `\n**Agentシステムプロンプト:**\n${selectedAgent.systemPrompt}\n` : ''}

**重要な指示:**
- Agentが選択されている場合、ユーザーの指示に従ってAgentの能力を活用してください
- 議事録編集に関するAgent（meeting-note-agent）の場合：
  - ユーザーの指示から議事録IDを抽出してください（パターン: "議事録ID: xxx", "meetingId: xxx", "ID: xxx"など）
  - 議事録IDが抽出できた場合、ユーザーに「議事録にする内容を教えてください」と問い返してください
  - ユーザーが内容を提供したら、format_meeting_note_content Toolを呼び出してください（**save: false**で呼び出してください）
  - 議事録IDが含まれていない場合、利用可能な議事録一覧を提示して、ユーザーに議事録IDを尋ねてください
  - format_meeting_note_content Toolの引数:
    - meetingNoteId: 議事録ID（必須。現在の議事録IDが指定されている場合はそれを使用）
    - itemId: アイテムID（個別議事録アイテムを指定する場合。オプション）
    - rawContent: 整形する内容（**ユーザーが提供したテキストをそのまま渡してください。これは必須です。**）
    - options: { splitTopics: true, generateSummaries: true, extractKeywords: true, generateSemanticCategory: true }
    - modelType: ${selectedAgent.modelType || 'gpt'}
    - selectedModel: ${selectedAgent.selectedModel || 'gpt-5-mini'}
    - **save: false**（最初の呼び出しでは必ずfalseにしてください。保存は確認後に行います）
  
  **特に重要な注意:**
  - ユーザーが内容を提供した場合、その内容を**必ずrawContent引数として渡してください**
  - rawContentが空の場合、Toolの実行が失敗します
  - ユーザーのメッセージ全体が内容である可能性が高いので、それをrawContentとして渡してください
  - **format_meeting_note_content Toolを呼び出した後、整形結果を表示し、「この内容で登録しますか？」と確認してください**
  - ユーザーが「登録する」「保存する」「はい」「OK」などと回答した場合、再度format_meeting_note_content Toolを呼び出してください（**save: true**で呼び出してください）
  - 保存が完了したら、「議事録の内容を更新しました」とユーザーに伝えてください`;
    }

    // システムプロンプトを構築
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE
      .replace(
        '{ragContext}',
        ragContext ? `## 利用可能な情報\n${ragContext}` : '## 利用可能な情報\n（情報なし）'
      )
      .replace(
        '{toolsSection}',
        toolsSection + agentSection
      );
    
    // デバッグ: RAGコンテキストの内容をログ出力
    if (ragContext) {
      console.log('[useAIChat] RAGコンテキストの内容:', {
        contextLength: ragContext.length,
        hasTopics: ragContext.includes('## 関連トピック'),
        hasEntities: ragContext.includes('## 関連エンティティ'),
        hasRelations: ragContext.includes('## 関連リレーション'),
        contextPreview: ragContext.substring(0, 1000),
      });
    } else {
      console.warn('[useAIChat] RAGコンテキストが空です。クエリ:', inputText);
    }

    // 会話履歴を構築（最新の10件のみに制限してタイムアウトを防ぐ）
    const recentHistory = conversationHistory.slice(-10);
    const conversationMessages = [
      ...recentHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: inputText,
      },
    ];

    // システムプロンプトが長すぎる場合は警告を出す
    if (systemPrompt.length > 8000) {
      console.warn('[useAIChat] システムプロンプトが長すぎます:', systemPrompt.length, '文字');
    }

    const allMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationMessages,
    ];

    const isLocalModel = selectedModel.startsWith('qwen') || 
                         selectedModel.startsWith('llama') || 
                         selectedModel.startsWith('mistral') ||
                         selectedModel.includes(':latest') ||
                         selectedModel.includes(':instruct');
    const isGeminiModel = selectedModel.startsWith('gemini');
    const isClaudeModel = selectedModel.startsWith('claude');

    let responseText = '';
    let tokenUsage: any = null;

    if (isLocalModel) {
      responseText = await callOllamaAPI(selectedModel, allMessages);
    } else if (isGeminiModel) {
      const result = await callGeminiAPI(selectedModel, allMessages);
      responseText = result.text;
      tokenUsage = result.usage;
    } else if (isClaudeModel) {
      const result = await callClaudeAPI(selectedModel, allMessages);
      responseText = result.text;
      tokenUsage = result.usage;
    } else {
      const result = await callOpenAIAPI(selectedModel, allMessages);
      responseText = result.text;
      tokenUsage = result.usage;
    }

    // Tool呼び出しを検出して実行
    const { parseToolCalls, executeToolCalls, formatToolCallResults } = await import('@/lib/mcp/toolParser');
    const toolCalls = parseToolCalls(responseText);
    
    if (toolCalls.length > 0) {
      console.log(`[useAIChat] ${toolCalls.length}件のTool呼び出しを検出しました`);
      
      // Toolを実行
      // format_meeting_note_content Toolの場合、ユーザーの入力テキストをrawContentとして自動的に追加
      const toolResults = await executeToolCalls(toolCalls, {
        query: inputText,
        organizationId,
        modelType,
        selectedModel,
        // format_meeting_note_content Toolの場合、ユーザーの入力テキストをrawContentとして使用
        rawContent: toolCalls.some(tc => tc.tool === 'format_meeting_note_content') ? inputText : undefined,
      });
      
      // Tool実行結果をフォーマット
      const toolResultsText = formatToolCallResults(toolResults);
      
      console.log('[useAIChat] Tool実行結果:', {
        toolResultsCount: toolResults.length,
        toolResultsTextLength: toolResultsText.length,
        toolResultsTextPreview: toolResultsText.substring(0, 500),
      });
      
      // Tool呼び出し部分を結果に置き換え
      for (const toolCall of toolCalls) {
        responseText = responseText.replace(toolCall.rawCall, `[Tool "${toolCall.tool}" を実行しました]`);
      }
      
      // Tool実行結果を追加
      responseText += toolResultsText;
      
      // format_meeting_note_content Toolが実行された場合の処理
      const formatMeetingNoteResult = toolResults.find(r => r.toolCall.tool === 'format_meeting_note_content' && r.result.success);
      
      // Tool実行結果を基に、AIに追加の回答を生成
      // format_meeting_note_content Toolが実行された場合、確認メッセージを表示するため、追加のAI応答は不要
      if (!formatMeetingNoteResult || (formatMeetingNoteResult.result.data as any)?.saved) {
        // get_organization_tree Toolが実行された場合、組織作成の指示があるか確認
        const orgTreeResult = toolResults.find(r => r.toolCall.tool === 'get_organization_tree' && r.result.success);
        const createOrgResult = toolResults.find(r => r.toolCall.tool === 'create_organization' && r.result.success);
        
        // get_organization_treeが実行されたが、create_organizationが実行されていない場合
        if (orgTreeResult && !createOrgResult) {
          // ユーザーの入力に組織作成の意図があるか確認
          const hasOrgCreationIntent = /(?:作成|追加|作って|追加して|作る|追加する|組織を作成|組織を追加|３つ|3つ|複数)/i.test(inputText) ||
                                       /(?:この親組織|この組織|親組織ID|parentOrganizationId)/i.test(inputText);
          
          if (hasOrgCreationIntent) {
            console.log('[useAIChat] 組織作成の意図を検出しましたが、create_organization Toolが呼び出されていません。再問い合わせを実行します。');
            
            const parentOrgId = orgTreeResult.result.data?.tree?.id || orgTreeResult.toolCall.arguments?.rootId;
            
            // 組織作成を促すメッセージを追加
            const followUpMessages = [
              ...allMessages,
              {
                role: 'assistant' as const,
                content: responseText,
              },
              {
                role: 'user' as const,
                content: `上記のTool実行結果を確認しました。ユーザーは組織の作成を依頼しています。

**重要な指示:**
1. ユーザーから提示された組織名の一覧を抽出してください（例: 「第一課、第二課、第三課」など）
2. 組織名が明示的に提示されていない場合、適切な組織名を生成してください（例: 「第一課、第二課、第三課」）
3. **各組織に対して、必ずcreate_organization Toolを呼び出して組織を作成してください**
4. 親組織IDは「${parentOrgId}」を使用してください
5. 複数の組織を作成する場合は、create_organization Toolを複数回呼び出してください（1つの組織につき1回）

**Tool呼び出し例:**
<tool_call name="create_organization">
{
  "parentId": "${parentOrgId}",
  "name": "第一課"
}
</tool_call>

<tool_call name="create_organization">
{
  "parentId": "${parentOrgId}",
  "name": "第二課"
}
</tool_call>

上記の形式で、必ずcreate_organization Toolを呼び出して組織を作成してください。`,
              },
            ];
            
            if (isLocalModel) {
              const followUpResponse = await callOllamaAPI(selectedModel, followUpMessages);
              responseText = followUpResponse;
            } else {
              const followUpResult = await callOpenAIAPI(selectedModel, followUpMessages);
              responseText = followUpResult.text;
              tokenUsage = followUpResult.usage;
            }
            
            // 再問い合わせ後もTool呼び出しを検出して実行
            const followUpToolCalls = parseToolCalls(responseText);
            if (followUpToolCalls.length > 0) {
              console.log(`[useAIChat] 再問い合わせ後に${followUpToolCalls.length}件のTool呼び出しを検出しました`);
              const followUpToolResults = await executeToolCalls(followUpToolCalls, {
                query: inputText,
                organizationId,
                modelType,
                selectedModel,
              });
              const followUpToolResultsText = formatToolCallResults(followUpToolResults);
              for (const toolCall of followUpToolCalls) {
                responseText = responseText.replace(toolCall.rawCall, `[Tool "${toolCall.tool}" を実行しました]`);
              }
              responseText += followUpToolResultsText;
            }
            
            console.log('[useAIChat] 組織作成の再問い合わせ完了:', {
              responseLength: responseText.length,
              responsePreview: responseText.substring(0, 200),
            });
          }
        }
        
        // search_knowledge_graph Toolが実行された場合、結果を基に再度AIに問い合わせる
        const searchToolResult = toolResults.find(r => r.toolCall.tool === 'search_knowledge_graph' && r.result.success);
        
        console.log('[useAIChat] searchToolResult確認:', {
          found: !!searchToolResult,
          hasData: !!(searchToolResult && searchToolResult.result.data),
          resultsCount: searchToolResult?.result.data?.results?.length || 0,
          contextLength: searchToolResult?.result.data?.context?.length || 0,
        });
        
        if (searchToolResult && searchToolResult.result.data) {
          const searchData = searchToolResult.result.data;
          console.log('[useAIChat] searchData詳細:', {
            resultsCount: searchData.results?.length || 0,
            topicResultsCount: searchData.results?.filter((r: any) => r.type === 'topic').length || 0,
            contextLength: searchData.context?.length || 0,
            contextPreview: searchData.context?.substring(0, 500),
          });
          
          // 検索結果が存在する場合、またはコンテキストが存在する場合、再問い合わせを実行
          if ((searchData.results && searchData.results.length > 0) || (searchData.context && searchData.context.trim() !== '')) {
            // Tool実行結果を含めて再度AIに問い合わせ
            console.log('[useAIChat] Tool実行結果を基に再度AIに問い合わせます', {
              resultsCount: searchData.results?.length || 0,
              hasContext: !!(searchData.context && searchData.context.trim() !== ''),
            });
            
            // Tool実行結果を強調したメッセージを作成
            const toolResultsSummary = toolResultsText.length > 0 
              ? `\n\n## Tool実行結果\n${toolResultsText}\n\n上記のTool実行結果を**必ず確認**してください。`
              : '';
            
            const followUpMessages = [
              ...allMessages,
              {
                role: 'assistant' as const,
                content: responseText,
              },
              {
                role: 'user' as const,
                content: `上記のTool実行結果を確認して、ユーザーの質問「${inputText}」に対して回答してください。

**重要な指示:**
1. Tool実行結果に含まれる「## ナレッジグラフ検索結果」セクションを**必ず確認**してください
2. 「関連トピック」セクションに情報が含まれている場合、その詳細内容を**必ず読み**、ユーザーの質問に対する回答に使用してください
3. 検索結果が見つかっている場合は、「情報が見つかりませんでした」とは**絶対に言わないでください**
4. Tool実行結果に含まれる情報を基に、具体的で詳細な回答を提供してください${toolResultsSummary}`,
              },
            ];
            
            if (isLocalModel) {
              const followUpResponse = await callOllamaAPI(selectedModel, followUpMessages);
              responseText = followUpResponse;
            } else {
              const followUpResult = await callOpenAIAPI(selectedModel, followUpMessages);
              responseText = followUpResult.text;
              tokenUsage = followUpResult.usage;
            }
            
            console.log('[useAIChat] 再問い合わせ完了:', {
              responseLength: responseText.length,
              responsePreview: responseText.substring(0, 200),
            });
          } else {
            console.warn('[useAIChat] Tool実行結果が空です。再問い合わせをスキップします。');
          }
        }
      }
    }

    // 出典情報を追加
    if (ragSources.length > 0) {
      const { formatSources } = await import('@/lib/knowledgeGraphRAG');
      const sourcesText = formatSources(ragSources);
      if (sourcesText && !responseText.includes('参考情報の出典')) {
        responseText += sourcesText;
      }
    }

    // メトリクスを記録
    await logMetrics(
      inputText,
      selectedModel,
      isLocalModel,
      allMessages,
      responseText,
      aiStartTime,
      ragContext.length > 0,
      tokenUsage
    );

    return responseText;
  };

  return { sendMessage };
}

export async function callOllamaAPI(model: string, messages: any[]): Promise<string> {
  let apiUrl: string = 'http://localhost:11434/api/chat';
  if (typeof window !== 'undefined') {
    const savedUrl = localStorage.getItem('NEXT_PUBLIC_OLLAMA_API_URL') || localStorage.getItem('ollamaChatApiUrl');
    if (savedUrl) {
      apiUrl = savedUrl;
    } else {
      apiUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL || apiUrl;
    }
  } else {
    apiUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL || apiUrl;
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: messages.map(msg => ({
        role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 2000,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Ollama APIエラー: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.message?.content?.trim() || '';
}

export async function callOpenAIAPI(model: string, messages: any[]): Promise<{ text: string; usage?: any }> {
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
    throw new Error(`OpenAI APIキーが設定されていません。

設定方法:
1. 設定ページ（/settings）にアクセス
2. 「APIキー設定」セクションでOpenAI APIキーを入力
3. 保存ボタンをクリック

または、環境変数として設定:
プロジェクトルートの .env.local ファイルに以下を追加:
   NEXT_PUBLIC_OPENAI_API_KEY=your-api-key-here

APIキーは https://platform.openai.com/api-keys で取得できます。`);
  }

  const requestBody: any = {
    model,
    messages,
  };

  if (model.startsWith('gpt-5')) {
    // GPT-5シリーズではmax_completion_tokensを使用（議事録整形など長いテキストが必要な場合は増やす）
    requestBody.max_completion_tokens = 4000;
    // GPT-5シリーズではtemperatureはサポートされていないため設定しない
  } else {
    requestBody.max_tokens = 2000;
    requestBody.temperature = 0.7;
  }

  // タイムアウト設定（120秒）
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 120秒

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`GPT APIエラー: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    // デバッグ: GPT-5シリーズの場合、レスポンス構造を確認
    if (model.startsWith('gpt-5')) {
      console.log('[callOpenAIAPI] GPT-5シリーズのレスポンス:', {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length || 0,
        firstChoice: data.choices?.[0],
        responseStructure: Object.keys(data),
      });
    }
    
    // GPT-5シリーズの場合、レスポンス構造が異なる可能性があるため、複数のパターンを試す
    let responseText = '';
    if (data.choices?.[0]?.message?.content) {
      responseText = data.choices[0].message.content.trim();
    } else if (data.content) {
      // 直接contentが返される場合
      responseText = typeof data.content === 'string' ? data.content.trim() : '';
    } else if (data.message?.content) {
      // message.contentが直接返される場合
      responseText = typeof data.message.content === 'string' ? data.message.content.trim() : '';
    } else if (data.text) {
      // textが直接返される場合
      responseText = typeof data.text === 'string' ? data.text.trim() : '';
    }
    
    if (!responseText && model.startsWith('gpt-5')) {
      console.error('[callOpenAIAPI] GPT-5シリーズのレスポンスが空です。レスポンス全体:', JSON.stringify(data, null, 2));
    }
    
    return {
      text: responseText,
      usage: data.usage,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('リクエストがタイムアウトしました。リクエストが大きすぎる可能性があります。メッセージ数を減らすか、より短いプロンプトを試してください。');
    }
    
    if (error.message) {
      throw error;
    }
    
    throw new Error(`GPT API呼び出しエラー: ${error.message || '不明なエラー'}`);
  }
}

export async function callGeminiAPI(model: string, messages: any[]): Promise<{ text: string; usage?: any }> {
  let apiKey: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      const { getAPIKey } = await import('@/lib/security');
      apiKey = getAPIKey('gemini');
    } catch (error) {
      apiKey = localStorage.getItem('NEXT_PUBLIC_GEMINI_API_KEY');
    }
  }
  
  if (!apiKey) {
    apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || null;
  }
  
  if (!apiKey) {
    throw new Error(`Gemini APIキーが設定されていません。

設定方法:
1. 設定ページ（/settings）にアクセス
2. 「APIキー設定」セクションでGemini APIキーを入力
3. 保存ボタンをクリック

または、環境変数として設定:
プロジェクトルートの .env.local ファイルに以下を追加:
   NEXT_PUBLIC_GEMINI_API_KEY=your-api-key-here

APIキーは https://aistudio.google.com/app/apikey で取得できます。`);
  }

  // Gemini APIはsystemメッセージをサポートしていないため、最初のsystemメッセージをuserメッセージに変換
  const geminiMessages = messages.map((msg, index) => {
    if (msg.role === 'system') {
      return {
        role: 'user' as const,
        parts: [{ text: `[システム指示] ${msg.content}` }],
      };
    }
    return {
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.content }],
    };
  });

  const requestBody = {
    contents: geminiMessages,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2000,
    },
  };

  // タイムアウト設定（120秒）
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini APIエラー: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    
    return {
      text: responseText,
      usage: data.usageMetadata,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('リクエストがタイムアウトしました。リクエストが大きすぎる可能性があります。メッセージ数を減らすか、より短いプロンプトを試してください。');
    }
    
    if (error.message) {
      throw error;
    }
    
    throw new Error(`Gemini API呼び出しエラー: ${error.message || '不明なエラー'}`);
  }
}

export async function callClaudeAPI(model: string, messages: any[]): Promise<{ text: string; usage?: any }> {
  let apiKey: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      const { getAPIKey } = await import('@/lib/security');
      apiKey = getAPIKey('claude');
    } catch (error) {
      apiKey = localStorage.getItem('NEXT_PUBLIC_CLAUDE_API_KEY');
    }
  }
  
  if (!apiKey) {
    apiKey = process.env.NEXT_PUBLIC_CLAUDE_API_KEY || null;
  }
  
  if (!apiKey) {
    throw new Error(`Claude APIキーが設定されていません。

設定方法:
1. 設定ページ（/settings）にアクセス
2. 「APIキー設定」セクションでClaude APIキーを入力
3. 保存ボタンをクリック

または、環境変数として設定:
プロジェクトルートの .env.local ファイルに以下を追加:
   NEXT_PUBLIC_CLAUDE_API_KEY=your-api-key-here

APIキーは https://console.anthropic.com/ で取得できます。`);
  }

  // Claude APIはsystemメッセージをサポートしている
  const systemMessage = messages.find(m => m.role === 'system');
  const conversationMessages = messages.filter(m => m.role !== 'system');

  const requestBody: any = {
    model,
    messages: conversationMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    })),
    max_tokens: 2000,
    temperature: 0.7,
  };

  if (systemMessage) {
    requestBody.system = systemMessage.content;
  }

  // タイムアウト設定（120秒）
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Claude APIエラー: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    const responseText = data.content?.[0]?.text?.trim() || '';
    
    return {
      text: responseText,
      usage: data.usage,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('リクエストがタイムアウトしました。リクエストが大きすぎる可能性があります。メッセージ数を減らすか、より短いプロンプトを試してください。');
    }
    
    if (error.message) {
      throw error;
    }
    
    throw new Error(`Claude API呼び出しエラー: ${error.message || '不明なエラー'}`);
  }
}

async function logMetrics(
  query: string,
  model: string,
  isLocal: boolean,
  messages: any[],
  responseText: string,
  startTime: number,
  ragUsed: boolean,
  tokenUsage?: any
) {
  if (typeof window === 'undefined') return;

  try {
    const { logAIMetrics } = await import('@/lib/monitoring');
    const responseTime = Date.now() - startTime;

    if (isLocal) {
      const estimatedTokens = Math.ceil(
        (messages.reduce((sum, m) => sum + m.content.length, 0) + responseText.length) / 4
      );
      logAIMetrics({
        query,
        responseTime,
        tokenUsage: {
          input: Math.ceil(messages.reduce((sum, m) => sum + m.content.length, 0) / 4),
          output: Math.ceil(responseText.length / 4),
          total: estimatedTokens,
        },
        cost: 0,
        model,
        ragContextUsed: ragUsed,
        ragContextLength: 0,
      });
    } else {
      const usage = tokenUsage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      const prices = MODEL_PRICES[model] || { input: 0, output: 0 };
      const cost = (usage.prompt_tokens / 1000) * prices.input + (usage.completion_tokens / 1000) * prices.output;
      
      logAIMetrics({
        query,
        responseTime,
        tokenUsage: {
          input: usage.prompt_tokens || 0,
          output: usage.completion_tokens || 0,
          total: usage.total_tokens || 0,
        },
        cost,
        model,
        ragContextUsed: ragUsed,
        ragContextLength: 0,
      });
    }
  } catch (error) {
    console.warn('[useAIChat] メトリクス記録エラー:', error);
  }
}

