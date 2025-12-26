/**
 * 議事録整形MCP Tool
 * 整形されていない議事録テキストを、構造化されたマークダウン形式に整形し、個別トピックに分割します
 */

import type { MCPToolImplementation, MCPToolRequest, MCPToolResult } from '../tools';
import { getMeetingNoteById, saveMeetingNote } from '@/lib/orgApi';
import { callLLMAPI } from '@/lib/agent-system/llmHelper';

/**
 * 議事録整形Tool
 */
class FormatMeetingNoteContentTool implements MCPToolImplementation {
  name = 'format_meeting_note_content';
  description = '整形されていない議事録テキストを、読みやすいマークダウン形式に整形します。整形されたコンテンツは指定された議事録アイテムに保存されます。トピック分割やエンティティ・リレーション生成は後で行います。';
  arguments = [
    { name: 'rawContent', type: 'string' as const, description: '整形前の議事録テキスト（meetingNoteIdと排他的）', required: false },
    { name: 'meetingNoteId', type: 'string' as const, description: '議事録アーカイブID（議事録アーカイブ全体を取得）', required: false },
    { name: 'itemId', type: 'string' as const, description: '個別議事録アイテムID（ナビゲーションで追加した議事録のID。meetingNoteIdとitemIdの両方が指定された場合、そのアイテムのみを編集）', required: false },
    { name: 'topicId', type: 'string' as const, description: 'トピックID（itemIdとtopicIdの両方が指定された場合、そのトピックのみを編集）', required: false },
    { name: 'options', type: 'object' as const, description: '整形オプション', required: false },
    { name: 'modelType', type: 'string' as const, description: 'モデルタイプ（gpt/local）', required: false, default: 'gpt' },
    { name: 'selectedModel', type: 'string' as const, description: '選択されたモデル名', required: false, default: 'gpt-5-mini' },
    { name: 'save', type: 'boolean' as const, description: '整形結果を議事録に保存するかどうか（デフォルト: false。falseの場合は整形結果のみを返し、保存は行わない）', required: false, default: false },
  ];
  returns = {
    type: 'object' as const,
    description: '整形結果（formattedContentとtopics配列を含む）',
  };

  async execute(request: MCPToolRequest): Promise<MCPToolResult> {
    const { rawContent, meetingNoteId, itemId, topicId, options, modelType, selectedModel, save } = request.arguments;
    
    console.log('[FormatMeetingNoteContentTool] 実行開始:', {
      hasRawContent: !!rawContent,
      rawContentLength: rawContent ? (rawContent as string).length : 0,
      hasMeetingNoteId: !!meetingNoteId,
      meetingNoteId: meetingNoteId as string | undefined,
      hasItemId: !!itemId,
      itemId: itemId as string | undefined,
      hasTopicId: !!topicId,
      topicId: topicId as string | undefined,
      save: save === true,
    });
    
    // rawContentまたはmeetingNoteIdのどちらかが必要
    if (!rawContent && !meetingNoteId) {
      return {
        success: false,
        error: 'rawContentまたはmeetingNoteIdが必要です',
      };
    }
    
    // rawContentが空文字列の場合もエラー
    if (rawContent && typeof rawContent === 'string' && rawContent.trim().length === 0) {
      return {
        success: false,
        error: 'rawContentが空です。整形する内容を指定してください。',
      };
    }
    
    // itemIdが指定されている場合、meetingNoteIdも必要
    if (itemId && !meetingNoteId) {
      return {
        success: false,
        error: 'itemIdを指定する場合、meetingNoteIdも必要です',
      };
    }
    
    // topicIdが指定されている場合、meetingNoteIdとitemIdも必要
    if (topicId && (!meetingNoteId || !itemId)) {
      return {
        success: false,
        error: 'topicIdを指定する場合、meetingNoteIdとitemIdも必要です',
      };
    }

    try {
      let contentToFormat = rawContent as string | undefined;
      let meetingNote: any = null;
      let targetItemId: string | null = itemId as string | null;
      let targetTabId: string | null = null;
      
      // meetingNoteIdが指定されている場合、議事録を取得（save: trueの場合は必ず取得）
      if (meetingNoteId && (!rawContent || save === true)) {
        const noteId = meetingNoteId as string;
        console.log('[FormatMeetingNoteContentTool] 議事録IDで検索:', noteId, itemId ? `itemId: ${itemId}` : '');
        
        meetingNote = await getMeetingNoteById(noteId);
        
        if (!meetingNote) {
          console.warn('[FormatMeetingNoteContentTool] 議事録が見つかりません:', noteId);
          
          // デバッグ: 利用可能な議事録一覧を取得して表示
          let availableNotesInfo = '';
          try {
            const { getAllMeetingNotes } = await import('@/lib/orgApi');
            const allNotes = await getAllMeetingNotes();
            console.log('[FormatMeetingNoteContentTool] 利用可能な議事録数:', allNotes.length);
            if (allNotes.length > 0) {
              const noteIds = allNotes.slice(0, 10).map(n => `- ${n.id} (${n.title || 'タイトルなし'})`);
              console.log('[FormatMeetingNoteContentTool] 議事録ID一覧:', noteIds);
              availableNotesInfo = `\n\n利用可能な議事録ID（最初の10件）:\n${noteIds.join('\n')}`;
              
              // 指定されたIDがinit_で始まる場合、特別なメッセージを追加
              if (noteId.startsWith('init_')) {
                availableNotesInfo += `\n\n⚠️ 注意: 指定されたID「${noteId}」は「init_」で始まっていますが、議事録IDは通常「meeting_」で始まります。\nこのIDは議事録アーカイブのIDではなく、個別アイテムのIDまたは別のエンティティのIDの可能性があります。\n\n議事録アーカイブのIDを確認するには、議事録一覧ページ（/organization/detail?id=xxx&tab=meetingNotes）を参照してください。`;
              }
            } else {
              availableNotesInfo = '\n\n利用可能な議事録が見つかりませんでした。';
            }
          } catch (debugError) {
            console.error('[FormatMeetingNoteContentTool] 議事録一覧取得エラー:', debugError);
            availableNotesInfo = '\n\n議事録一覧の取得に失敗しました。';
          }
          
          return {
            success: false,
            error: `議事録が見つかりません: ${noteId}\n\nヒント: 正しい議事録IDを指定してください。議事録IDは通常「meeting_」で始まります。${availableNotesInfo}`,
          };
        }
        
        console.log('[FormatMeetingNoteContentTool] 議事録を取得しました:', {
          specifiedId: noteId,
          retrievedId: meetingNote.id,
          idsMatch: noteId === meetingNote.id,
          title: meetingNote.title,
          contentLength: meetingNote.content?.length || 0,
        });
        
        // 取得した議事録のIDが指定されたIDと一致しているか確認
        if (meetingNote.id !== noteId) {
          console.error('[FormatMeetingNoteContentTool] ⚠️ 警告: 取得した議事録のIDが指定されたIDと一致しません:', {
            specifiedId: noteId,
            retrievedId: meetingNote.id,
          });
          // 警告のみで続行（IDの不一致をログに記録）
        }
        
        // 議事録のcontentを取得（JSON形式の場合はパース）
        if (meetingNote.content) {
          try {
            const parsed = JSON.parse(meetingNote.content);
            
            // itemIdが指定されている場合、そのアイテムのみを取得
            if (targetItemId) {
              let foundItem: any = null;
              
              // すべてのタブを検索して、指定されたitemIdのアイテムを探す
              for (const [tabId, tabData] of Object.entries(parsed)) {
                if (tabData && typeof tabData === 'object') {
                  const monthContent = tabData as any;
                  if (monthContent.items) {
                    const item = monthContent.items.find((i: any) => i.id === targetItemId);
                    if (item) {
                      foundItem = item;
                      targetTabId = tabId;
                      break;
                    }
                  }
                }
              }
              
              if (!foundItem) {
                return {
                  success: false,
                  error: `議事録アイテムが見つかりません: itemId=${targetItemId}, meetingNoteId=${noteId}`,
                };
              }
              
              // topicIdが指定されている場合、そのトピックのみを取得
              const targetTopicId = topicId as string | null;
              if (targetTopicId) {
                if (!foundItem.topics || !Array.isArray(foundItem.topics)) {
                  return {
                    success: false,
                    error: `アイテムにトピックがありません: itemId=${targetItemId}, meetingNoteId=${noteId}`,
                  };
                }
                
                const foundTopic = foundItem.topics.find((t: any) => t.id === targetTopicId);
                if (!foundTopic) {
                  return {
                    success: false,
                    error: `トピックが見つかりません: topicId=${targetTopicId}, itemId=${targetItemId}, meetingNoteId=${noteId}`,
                  };
                }
                
                // 見つかったトピックの内容を整形対象にする
                contentToFormat = foundTopic.content || '';
                console.log('[FormatMeetingNoteContentTool] 個別トピックを取得:', {
                  topicId: targetTopicId,
                  itemId: targetItemId,
                  tabId: targetTabId,
                  title: foundTopic.title,
                  contentLength: contentToFormat.length,
                });
              } else {
                // 見つかったアイテムの内容を整形対象にする
                contentToFormat = foundItem.content || '';
                console.log('[FormatMeetingNoteContentTool] 個別アイテムを取得:', {
                  itemId: targetItemId,
                  tabId: targetTabId,
                  title: foundItem.title,
                  contentLength: contentToFormat.length,
                });
              }
            } else {
              // itemIdが指定されていない場合、すべてのタブの内容を結合
              const allContent: string[] = [];
              for (const [tabId, tabData] of Object.entries(parsed)) {
                if (tabData && typeof tabData === 'object') {
                  const monthContent = tabData as any;
                  if (monthContent.summary) {
                    allContent.push(`## ${tabId}サマリ\n${monthContent.summary}`);
                  }
                  if (monthContent.items) {
                    for (const item of monthContent.items) {
                      if (item.title) {
                        allContent.push(`## ${item.title}\n${item.content || ''}`);
                      } else {
                        allContent.push(item.content || '');
                      }
                    }
                  }
                }
              }
              contentToFormat = allContent.join('\n\n');
            }
          } catch {
            // JSON形式でない場合はそのまま使用
            contentToFormat = meetingNote.content;
          }
        } else {
          return {
            success: false,
            error: '議事録の内容が空です',
          };
        }
      }

      // save: trueの場合、rawContentが空でも議事録から内容を取得できるため、エラーにしない
      if ((!contentToFormat || contentToFormat.trim().length === 0) && save !== true) {
        return {
          success: false,
          error: '整形するコンテンツが空です',
        };
      }
      
      // save: trueの場合、rawContentが空でも議事録から内容を取得して保存できる
      if (save === true && (!contentToFormat || contentToFormat.trim().length === 0)) {
        console.log('[FormatMeetingNoteContentTool] save=trueですが、contentToFormatが空です。議事録から内容を取得します。');
        // contentToFormatは後で議事録から取得されるため、ここではエラーにしない
      }

      // save: trueでrawContentが指定されている場合、AI APIを呼び出さずにrawContentをそのまま使用
      let formattedContent: string;
      
      if (save === true && rawContent && typeof rawContent === 'string' && rawContent.trim().length > 0) {
        // save: trueでrawContentが指定されている場合、AI整形をスキップしてrawContentをそのまま使用
        formattedContent = rawContent.trim();
        console.log('[FormatMeetingNoteContentTool] save=true: rawContent（前回の整形結果）を使用します（AI API呼び出しをスキップ）:', {
          formattedContentLength: formattedContent.length,
        });
      } else {
        // 通常の整形処理：AI APIを呼び出して整形
        const opts = (options as any) || {};
        const finalModelType = (modelType || 'gpt') as 'gpt' | 'local';
        const finalSelectedModel = (selectedModel || 'gpt-5-mini') as string;

        // AIプロンプトを作成（シンプルに整形のみ）
        const systemPrompt = `あなたは議事録編集専門のAIアシスタントです。
提供された議事録テキストを、読みやすいマークダウン形式に整形してください。

**出力形式:**
整形されたマークダウンテキストをそのまま返してください。JSON形式ではなく、整形されたテキストのみを返してください。

**重要な指示:**
1. 整形されたコンテンツは、読みやすいマークダウン形式にしてください
2. 見出しには##を使用してください
3. 箇条書きは適切にフォーマットしてください
4. 段落は適切に区切ってください
5. 元の内容の意味を変えずに、読みやすく整形してください

**会議情報の構造化:**
議事録の冒頭に会議情報を以下の形式でまとめてください：

## 基本情報

### 日付
（会議の日付を記載）

### 参加者
参加者は所属毎に「所属：名前、名前、...」の形式で記載してください。
例：
- 伊藤忠：近藤、山田、佐藤
- 三菱商事：鈴木、高橋

**重要：参加者は個別のトピックにしないでください。全て会議情報セクションにまとめてください。**

### 会議目的
（会議の目的を記載）

### 主要トピック
（会議で議論された主要なトピックを記載）

### キーワード
（会議のキーワードを記載）

会議情報の後に、##見出しを使って各トピックを分割してください。`;

        const userPrompt = `以下の議事録テキストを読みやすいマークダウン形式に整形してください。

**議事録テキスト:**
${contentToFormat}

整形されたテキストのみを返してください。JSON形式や説明文は不要です。`;

        // AI APIを呼び出し
        console.log('[FormatMeetingNoteContentTool] AI APIを呼び出し中...', {
          contentLength: contentToFormat.length,
          modelType: finalModelType,
          selectedModel: finalSelectedModel,
          systemPromptLength: systemPrompt.length,
          userPromptLength: userPrompt.length,
        });
        
        let aiResponse: string;
        try {
          aiResponse = await callLLMAPI(
            userPrompt,
            systemPrompt,
            finalModelType,
            finalSelectedModel
          );
          
          // 応答がnullやundefinedの場合の処理
          if (aiResponse === null || aiResponse === undefined) {
            console.warn('[FormatMeetingNoteContentTool] AI応答がnull/undefinedです。元のコンテンツを整形済みとして使用します');
            aiResponse = contentToFormat; // フォールバック: 元のコンテンツを使用
          }
        } catch (apiError: any) {
          console.error('[FormatMeetingNoteContentTool] AI API呼び出しエラー:', apiError);
          // エラーが発生した場合、元のコンテンツを整形済みとして使用（フォールバック）
          console.warn('[FormatMeetingNoteContentTool] AI API呼び出しに失敗しましたが、元のコンテンツを整形済みとして使用します');
          aiResponse = contentToFormat;
        }

        console.log('[FormatMeetingNoteContentTool] AI応答の長さ:', aiResponse?.length || 0);
        console.log('[FormatMeetingNoteContentTool] AI応答の先頭500文字:', aiResponse?.substring(0, 500) || '(空)');
        
        // AI応答が空の場合、元のコンテンツを使用（フォールバック）
        if (!aiResponse || aiResponse.trim().length === 0) {
          console.warn('[FormatMeetingNoteContentTool] AI応答が空です。元のコンテンツを整形済みとして使用します');
          aiResponse = contentToFormat;
        }

        // AI応答をそのまま整形されたコンテンツとして使用
        // JSONコードブロックがある場合は除去
        formattedContent = aiResponse.trim();
        
        // コードブロックを除去
        if (formattedContent.startsWith('```')) {
          // ```markdown や ```json などの形式を除去
          formattedContent = formattedContent.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
        }
        
        // JSON形式の応答が返ってきた場合の処理（オプション）
        // ただし、AIはJSON形式ではなくプレーンテキストを返すように指示しているため、
        // 通常はこの処理は実行されない
        if (formattedContent.startsWith('{') || formattedContent.startsWith('[')) {
          try {
            const parsed = JSON.parse(formattedContent);
            if (parsed && typeof parsed === 'object') {
              if (parsed.formattedContent && typeof parsed.formattedContent === 'string') {
                formattedContent = parsed.formattedContent;
              } else if (typeof parsed === 'string') {
                formattedContent = parsed;
              } else {
                // JSONオブジェクトの場合は、そのまま使用（通常は発生しない）
                console.warn('[FormatMeetingNoteContentTool] JSON形式の応答を受け取りましたが、formattedContentが見つかりません');
              }
            }
          } catch (parseError) {
            // JSON形式でない場合はそのまま使用（エラーを無視）
            console.log('[FormatMeetingNoteContentTool] JSONパースを試みましたが、プレーンテキストとして処理します');
          }
        }

        // 結果を検証
        if (!formattedContent || formattedContent.trim().length === 0) {
          console.error('[FormatMeetingNoteContentTool] formattedContentが空です。AI応答:', aiResponse);
          return {
            success: false,
            error: `AIからの応答が空です。\n\nAI応答の先頭500文字:\n${aiResponse.substring(0, 500)}`,
          };
        }
        
        console.log('[FormatMeetingNoteContentTool] 整形成功:', {
          formattedContentLength: formattedContent.length,
          preview: formattedContent.substring(0, 200),
        });
      }

      // save: trueの場合、rawContentが指定されている場合は、それをそのまま使用（再整形不要）
      // rawContentは前回の整形結果（全文）なので、それを保存する
      if (save === true && rawContent && typeof rawContent === 'string' && rawContent.trim().length > 0) {
        // rawContentが指定されている場合、それをそのまま使用（AI整形済みの全文）
        formattedContent = rawContent.trim();
        console.log('[FormatMeetingNoteContentTool] save=true: rawContent（前回の整形結果）を使用します（全文を保存）:', {
          formattedContentLength: formattedContent.length,
          rawContentLength: rawContent.length,
        });
      } else if (save === true && formattedContent && formattedContent.trim().length > 0) {
        // rawContentが指定されていないが、AI整形が完了している場合は、その結果を使用
        console.log('[FormatMeetingNoteContentTool] save=true: AI整形結果を使用します（全文を保存）:', {
          formattedContentLength: formattedContent.length,
        });
        // formattedContentは既にAI整形済みなので、そのまま使用
      } else if (save === true && contentToFormat && contentToFormat.trim().length > 0) {
        // rawContentもAI整形結果もない場合は、議事録から取得した内容を使用
        formattedContent = contentToFormat.trim();
        console.log('[FormatMeetingNoteContentTool] save=true: 議事録から取得した内容を使用します。');
      }
      
      // 結果オブジェクトを作成（トピック分割は後で行うため、ここでは空配列）
      const result = {
        formattedContent,
        topics: [] as Array<{
          title: string;
          content: string;
          summary?: string;
          keywords?: string[];
          semanticCategory?: string;
        }>,
      };

      // saveがtrueの場合、rawContentが指定されていても議事録を取得してtargetTabIdを設定
      if (save === true && meetingNoteId && targetItemId && !targetTabId) {
        console.log('[FormatMeetingNoteContentTool] save=trueですが、targetTabIdが取得されていません。議事録を取得して検索します。');
        if (!meetingNote) {
          try {
            meetingNote = await getMeetingNoteById(meetingNoteId as string);
          } catch (error) {
            console.error('[FormatMeetingNoteContentTool] 議事録の取得に失敗:', error);
          }
        }
        
        if (meetingNote && meetingNote.content) {
          try {
            const parsed = JSON.parse(meetingNote.content);
            for (const [tabId, tabData] of Object.entries(parsed)) {
              if (tabData && typeof tabData === 'object') {
                const monthContent = tabData as any;
                if (monthContent.items) {
                  const item = monthContent.items.find((i: any) => i.id === targetItemId);
                  if (item) {
                    targetTabId = tabId;
                    console.log('[FormatMeetingNoteContentTool] targetTabIdを取得しました:', targetTabId);
                    break;
                  }
                }
              }
            }
          } catch (parseError) {
            console.error('[FormatMeetingNoteContentTool] 議事録のパースに失敗:', parseError);
          }
        }
      }

      // saveがtrueの場合のみ、itemIdが指定されている場合、整形結果をそのアイテムに保存
      // topicIdが指定されている場合は、そのトピックに保存
      // rawContentが指定されている場合でも、meetingNoteIdとitemIdがあれば保存可能
      const targetTopicId = topicId as string | null;
      let shouldSave = save === true && targetItemId && meetingNote && targetTabId;
      if (targetTopicId) {
        // topicIdが指定されている場合、itemIdとtopicIdの両方が必要
        shouldSave = shouldSave && !!targetTopicId;
      }
      
      // saveがtrueだが、meetingNoteが取得されていない場合、再度取得を試みる
      if (save === true && !meetingNote && meetingNoteId) {
        console.log('[FormatMeetingNoteContentTool] save=trueですが、meetingNoteが取得されていません。再度取得を試みます。');
        try {
          meetingNote = await getMeetingNoteById(meetingNoteId as string);
          if (meetingNote && targetItemId) {
            // itemIdからtargetTabIdを取得
            try {
              const parsed = JSON.parse(meetingNote.content);
              for (const [tabId, tabData] of Object.entries(parsed)) {
                if (tabData && typeof tabData === 'object') {
                  const monthContent = tabData as any;
                  if (monthContent.items) {
                    const item = monthContent.items.find((i: any) => i.id === targetItemId);
                    if (item) {
                      targetTabId = tabId;
                      shouldSave = true;
                      break;
                    }
                  }
                }
              }
            } catch (parseError) {
              console.error('[FormatMeetingNoteContentTool] 議事録のパースに失敗:', parseError);
            }
          }
        } catch (retryError) {
          console.error('[FormatMeetingNoteContentTool] 議事録の再取得に失敗:', retryError);
        }
      }
      
      // saveがtrueだが、targetTabIdが取得されていない場合、再度検索
      if (save === true && targetItemId && meetingNote && !targetTabId) {
        console.log('[FormatMeetingNoteContentTool] save=trueですが、targetTabIdが取得されていません。再度検索します。');
        try {
          const parsed = JSON.parse(meetingNote.content);
          for (const [tabId, tabData] of Object.entries(parsed)) {
            if (tabData && typeof tabData === 'object') {
              const monthContent = tabData as any;
              if (monthContent.items) {
                const item = monthContent.items.find((i: any) => i.id === targetItemId);
                if (item) {
                  targetTabId = tabId;
                  shouldSave = true;
                  console.log('[FormatMeetingNoteContentTool] targetTabIdを取得しました:', targetTabId);
                  break;
                }
              }
            }
          }
        } catch (parseError) {
          console.error('[FormatMeetingNoteContentTool] 議事録のパースに失敗:', parseError);
        }
      }
      
      if (shouldSave) {
        console.log('[FormatMeetingNoteContentTool] 保存処理を開始:', {
          itemId: targetItemId,
          topicId: targetTopicId,
          tabId: targetTabId,
          hasMeetingNote: !!meetingNote,
          formattedContentLength: result.formattedContent.length,
        });
        
        try {
          const parsed = JSON.parse(meetingNote.content);
          const tabData = parsed[targetTabId];
          
          if (!tabData) {
            throw new Error(`タブデータが見つかりません: tabId=${targetTabId}`);
          }
          
          if (!tabData.items || !Array.isArray(tabData.items)) {
            throw new Error(`タブデータにitemsがありません: tabId=${targetTabId}`);
          }
          
          const itemIndex = tabData.items.findIndex((i: any) => i.id === targetItemId);
          if (itemIndex < 0) {
            throw new Error(`アイテムが見つかりません: itemId=${targetItemId}, tabId=${targetTabId}`);
          }
          
          const currentItem = tabData.items[itemIndex];
          
          // topicIdが指定されている場合、そのトピックのcontentを更新
          if (targetTopicId) {
            if (!currentItem.topics || !Array.isArray(currentItem.topics)) {
              throw new Error(`アイテムにトピックがありません: itemId=${targetItemId}, tabId=${targetTabId}`);
            }
            
            const topicIndex = currentItem.topics.findIndex((t: any) => t.id === targetTopicId);
            if (topicIndex < 0) {
              throw new Error(`トピックが見つかりません: topicId=${targetTopicId}, itemId=${targetItemId}, tabId=${targetTabId}`);
            }
            
            console.log('[FormatMeetingNoteContentTool] トピックを更新します:', {
              topicId: targetTopicId,
              itemId: targetItemId,
              tabId: targetTabId,
              topicTitle: currentItem.topics[topicIndex].title,
            });
            
            // トピックのcontentを整形結果で更新
            const contentToSave = result.formattedContent || (rawContent as string) || '';
            
            // トピックのcontentを更新
            currentItem.topics[topicIndex].content = contentToSave;
            currentItem.topics[topicIndex].updatedAt = new Date().toISOString();
            
            console.log('[FormatMeetingNoteContentTool] トピックのcontentを更新しました:', {
              topicId: targetTopicId,
              contentLength: contentToSave.length,
            });
          } else {
            // アイテムのcontentを整形結果で更新
            // SQLに直接保存を試みる（より効率的）
            try {
              const { callTauriCommand } = await import('@/lib/localFirebase');
              console.log('[FormatMeetingNoteContentTool] SQLに直接保存を試みます:', {
                meetingNoteId: meetingNote.id,
                tabId: targetTabId,
                itemId: targetItemId,
                contentLength: result.formattedContent.length,
              });
              
              // AI整形が完了している場合は、その結果を使用
              // save: trueの場合、rawContentではなく、AI整形済みのformattedContentを使用
              // result.formattedContentは必ずAI整形後の全文を含んでいる
              const contentToSave = result.formattedContent || (rawContent as string) || '';
              
              console.log('[FormatMeetingNoteContentTool] 保存するコンテンツ:', {
                hasFormattedContent: !!result.formattedContent,
                formattedContentLength: result.formattedContent?.length || 0,
                rawContentLength: (rawContent as string)?.length || 0,
                contentToSaveLength: contentToSave.length,
                formattedContentPreview: result.formattedContent?.substring(0, 200) || '(空)',
              });
              
              const sqlResult = await callTauriCommand('update_meeting_note_item_content', {
                meetingNoteId: meetingNote.id,
                tabId: targetTabId,
                itemId: targetItemId,
                newContent: contentToSave,
              });
              
              console.log('[FormatMeetingNoteContentTool] SQL直接保存結果:', sqlResult);
              
              if (sqlResult && (sqlResult as any).success) {
                console.log('[FormatMeetingNoteContentTool] SQLに直接保存成功');
                
                // SQLに直接保存した後、parsedの内容も更新してからJSONファイルに保存
                // これにより、SQLとJSONファイルの内容が一致する
                try {
                  // parsedの内容を更新（保存したコンテンツを使用）
                  tabData.items[itemIndex].content = contentToSave;
                  const updatedContent = JSON.stringify(parsed, null, 2);
                  
                  // 指定されたmeetingNoteIdを明示的に使用（重要：IDが上書きされないようにする）
                  const targetNoteId = (meetingNoteId as string) || meetingNote.id;
                  console.log('[FormatMeetingNoteContentTool] 保存する議事録IDを確認:', {
                    specifiedMeetingNoteId: meetingNoteId as string,
                    meetingNoteId: meetingNote.id,
                    targetNoteId,
                    idsMatch: (meetingNoteId as string) === meetingNote.id,
                  });
                  
                  // JSONファイルにも保存（SQLと同期させるため）
                  // 指定されたIDを明示的に使用
                  await saveMeetingNote({
                    id: targetNoteId, // 明示的にIDを指定
                    organizationId: meetingNote.organizationId,
                    title: meetingNote.title,
                    description: meetingNote.description,
                    content: updatedContent,
                  });
                  console.log('[FormatMeetingNoteContentTool] JSONファイルにも保存完了（SQLと同期）:', {
                    savedNoteId: targetNoteId,
                  });
                } catch (jsonError) {
                  console.warn('[FormatMeetingNoteContentTool] JSONファイルの保存に失敗しましたが、SQLには保存済み:', jsonError);
                }
              
              // 成功した場合、結果を返す
              return {
                success: true,
                data: {
                  ...result,
                  saved: true,
                  message: '議事録の整形と保存が完了しました。',
                },
                metadata: {
                  source: this.name,
                  meetingNoteId: meetingNote.id,
                  itemId: targetItemId || undefined,
                  topicId: targetTopicId || undefined,
                  saved: true,
                },
              };
            } else {
              console.warn('[FormatMeetingNoteContentTool] SQLに直接保存に失敗しました。通常の保存方法にフォールバックします。', sqlResult);
            }
          } catch (sqlError: any) {
            console.warn('[FormatMeetingNoteContentTool] SQLに直接保存中にエラーが発生しました。通常の保存方法にフォールバックします:', sqlError);
          }
          
          // フォールバック: 通常の保存方法
          // topicIdが指定されていない場合のみ、アイテムのcontentを更新
          tabData.items[itemIndex].content = result.formattedContent;
        }
        
        // 議事録を保存（topicIdが指定されている場合も、指定されていない場合も）
        const updatedContent = JSON.stringify(parsed, null, 2);
        
        // 指定されたmeetingNoteIdを明示的に使用（重要：IDが上書きされないようにする）
        const targetNoteId = (meetingNoteId as string) || meetingNote.id;
        console.log('[FormatMeetingNoteContentTool] 議事録を保存します:', {
          specifiedMeetingNoteId: meetingNoteId as string,
          meetingNoteId: meetingNote.id,
          targetNoteId,
          itemId: targetItemId,
          topicId: targetTopicId,
          contentLength: updatedContent.length,
          idsMatch: (meetingNoteId as string) === meetingNote.id,
        });
        
        // 指定されたIDを明示的に使用
        await saveMeetingNote({
          id: targetNoteId, // 明示的にIDを指定
          organizationId: meetingNote.organizationId,
          title: meetingNote.title,
          description: meetingNote.description,
          content: updatedContent,
        });
        
        if (targetTopicId) {
          console.log('[FormatMeetingNoteContentTool] トピックを更新しました:', {
            topicId: targetTopicId,
            itemId: targetItemId,
            tabId: targetTabId,
            contentLength: result.formattedContent.length,
          });
        } else {
          console.log('[FormatMeetingNoteContentTool] 議事録アイテムを更新しました:', {
            itemId: targetItemId,
            tabId: targetTabId,
            contentLength: result.formattedContent.length,
          });
        }
      } catch (saveError: any) {
          console.error('[FormatMeetingNoteContentTool] 保存エラー:', saveError);
          console.error('[FormatMeetingNoteContentTool] エラー詳細:', {
            message: saveError.message,
            stack: saveError.stack,
            name: saveError.name,
            itemId: targetItemId,
            tabId: targetTabId,
            hasMeetingNote: !!meetingNote,
          });
          return {
            success: false,
            error: `議事録の保存に失敗しました: ${saveError.message || '不明なエラー'}\n\n詳細:\n- アイテムID: ${targetItemId}\n- タブID: ${targetTabId || '未取得'}\n- 議事録ID: ${meetingNoteId}`,
            metadata: {
              source: this.name,
              meetingNoteId: meetingNoteId as string | undefined,
              itemId: targetItemId || undefined,
            },
          };
        }
      } else if (save === true) {
        const missingInfo = [];
        if (!targetItemId) missingInfo.push('アイテムID');
        if (!meetingNote) missingInfo.push('議事録データ');
        if (!targetTabId) missingInfo.push('タブID');
        
        console.warn('[FormatMeetingNoteContentTool] save=trueが指定されましたが、保存に必要な情報が不足しています:', {
          hasItemId: !!targetItemId,
          hasMeetingNote: !!meetingNote,
          hasTabId: !!targetTabId,
          missingInfo,
        });
        
        return {
          success: false,
          error: `議事録の保存に必要な情報が不足しています: ${missingInfo.join(', ')}\n\n- アイテムID: ${targetItemId || '未指定'}\n- 議事録ID: ${meetingNoteId || '未指定'}\n- タブID: ${targetTabId || '未取得'}`,
          metadata: {
            source: this.name,
            meetingNoteId: meetingNoteId as string | undefined,
            itemId: targetItemId || undefined,
          },
        };
      }

      return {
        success: true,
        data: {
          ...result,
          saved: shouldSave,
          message: shouldSave 
            ? '議事録の整形と保存が完了しました。' 
            : '議事録の整形が完了しました。この内容で登録する場合は、「登録する」または「保存する」と回答してください。',
        },
        metadata: {
          source: this.name,
          meetingNoteId: meetingNoteId as string | undefined,
          itemId: targetItemId || undefined,
          saved: shouldSave,
        },
      };
    } catch (error: any) {
      console.error('[FormatMeetingNoteContentTool] エラー:', error);
      return {
        success: false,
        error: error.message || '議事録整形に失敗しました',
        metadata: {
          source: this.name,
        },
      };
    }
  }
}

export const formatMeetingNoteContentTool = new FormatMeetingNoteContentTool();

