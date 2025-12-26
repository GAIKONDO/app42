import { useState, useRef, useEffect } from 'react';
import { usePathname, useParams } from 'next/navigation';
import type { Message, ModelType } from '../types';
import type { Agent } from '@/lib/agent-system/types';
import { useRAGContext } from './useRAGContext';
import { useAIChat } from './useAIChat';

export function useAIAssistant(
  modelType: ModelType,
  selectedModel: string,
  initialQuery?: string,
  selectedAgent?: Agent | null
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [feedbackRatings, setFeedbackRatings] = useState<Record<string, 'positive' | 'negative' | 'neutral'>>({});
  // 最初に送った議事録IDとアイテムIDを保存
  const [savedMeetingNoteId, setSavedMeetingNoteId] = useState<string | null>(null);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();
  const params = useParams();
  const previousAgentRef = useRef<Agent | null>(null);

  const { getRAGContext } = useRAGContext();
  const { sendMessage: sendAIMessage } = useAIChat(modelType, selectedModel);

  // 初期クエリが設定されたときに、入力フィールドに設定
  useEffect(() => {
    if (initialQuery) {
      setInputValue(initialQuery);
      setTimeout(() => {
        inputRef.current?.focus();
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
          inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        }
      }, 100);
    }
  }, [initialQuery]);

  // Agentが選択されたときに、システムメッセージを追加
  useEffect(() => {
    // 前回のAgentと比較して、変更があった場合のみ処理
    const previousAgent = previousAgentRef.current;
    
    if (selectedAgent && previousAgent?.id !== selectedAgent.id) {
      // Agentが変更された場合、前回のAgent選択メッセージを削除
      setMessages((prev) => {
        const filtered = prev.filter(msg => !msg.id.startsWith('agent-selected-'));
        // 新しいAgent選択メッセージを追加
        // 議事録編集Agentの場合のみ、議事録IDの指定を案内
        const isMeetingNoteAgent = selectedAgent.id === 'meeting-note-agent';
        const additionalInfo = isMeetingNoteAgent 
          ? '\n\nこのAgentを使用してタスクを実行します。議事録編集の場合は、議事録IDを指定してください（例: 「議事録ID: meeting-123」）。'
          : '\n\nこのAgentを使用してタスクを実行します。';
        const agentMessage: Message = {
          id: `agent-selected-${Date.now()}`,
          role: 'assistant',
          content: `🤖 **Agentが選択されました: ${selectedAgent.name}**\n\n${selectedAgent.description}${additionalInfo}`,
          timestamp: new Date(),
        };
        return [...filtered, agentMessage];
      });
      // Agentが変更された場合、保存されたIDをリセット
      setSavedMeetingNoteId(null);
      setSavedItemId(null);
      previousAgentRef.current = selectedAgent;
    } else if (!selectedAgent && previousAgent) {
      // Agentが解除された場合、Agent選択メッセージを削除
      setMessages((prev) => prev.filter(msg => !msg.id.startsWith('agent-selected-')));
      // Agentが解除された場合、保存されたIDをリセット
      setSavedMeetingNoteId(null);
      setSavedItemId(null);
      previousAgentRef.current = null;
    } else if (!previousAgent && selectedAgent) {
      // 初回選択の場合
      // 議事録編集Agentの場合のみ、議事録IDの指定を案内
      const isMeetingNoteAgent = selectedAgent.id === 'meeting-note-agent';
      const additionalInfo = isMeetingNoteAgent 
        ? '\n\nこのAgentを使用してタスクを実行します。議事録編集の場合は、議事録IDを指定してください（例: 「議事録ID: meeting-123」）。'
        : '\n\nこのAgentを使用してタスクを実行します。';
      const agentMessage: Message = {
        id: `agent-selected-${Date.now()}`,
        role: 'assistant',
        content: `🤖 **Agentが選択されました: ${selectedAgent.name}**\n\n${selectedAgent.description}${additionalInfo}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);
      previousAgentRef.current = selectedAgent;
    }
  }, [selectedAgent]);

  // メッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // メッセージをコピー
  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (error) {
      console.error('コピーに失敗しました:', error);
      // フォールバック: 古い方法を使用
      const textArea = document.createElement('textarea');
      textArea.value = content;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedMessageId(messageId);
        setTimeout(() => {
          setCopiedMessageId(null);
        }, 2000);
      } catch (err) {
        console.error('コピーに失敗しました:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  // AIフィードバックハンドラー
  const handleAIFeedback = (messageId: string, rating: 'positive' | 'negative') => {
    setFeedbackRatings(prev => ({
      ...prev,
      [messageId]: rating,
    }));
    console.log(`AIフィードバック: メッセージID ${messageId}, 評価: ${rating}`);
  };

  // 現在のページから組織IDを抽出
  const extractOrganizationId = (): string | undefined => {
    if (pathname?.startsWith('/organization/')) {
      const pathParts = pathname.split('/');
      const orgIndex = pathParts.indexOf('organization');
      if (orgIndex >= 0 && pathParts[orgIndex + 1]) {
        return pathParts[orgIndex + 1];
      }
    }
    if (params?.id) {
      return params.id as string;
    }
    return undefined;
  };

  // 現在のページから議事録IDを抽出（URLパラメータから）
  const extractMeetingNoteIdFromURL = (): string | null => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const meetingId = urlParams.get('meetingId');
      if (meetingId) {
        console.log('[useAIAssistant] URLから議事録IDを取得:', meetingId);
        return meetingId;
      }
    }
    return null;
  };

  // ユーザー入力から議事録IDを抽出
  const extractMeetingNoteId = (input: string): string | null => {
    // パターン1: "議事録ID: xxx"
    const pattern1 = /議事録ID[：:]\s*([a-zA-Z0-9_-]+)/i;
    // パターン2: "meetingId: xxx"
    const pattern2 = /meetingId[：:]\s*([a-zA-Z0-9_-]+)/i;
    // パターン3: "ID: xxx"
    const pattern3 = /ID[：:]\s*([a-zA-Z0-9_-]+)/i;
    // パターン4: "議事録 xxx を"
    const pattern4 = /議事録\s+([a-zA-Z0-9_-]+)\s+を/i;
    // パターン5: "meeting-xxx" のような形式
    const pattern5 = /(meeting-[a-zA-Z0-9_-]+)/i;
    
    // 各パターンを試す
    const match = input.match(pattern1) || 
                  input.match(pattern2) || 
                  input.match(pattern3) || 
                  input.match(pattern4) ||
                  input.match(pattern5);
    
    return match ? match[1] : null;
  };

  // ユーザーの回答が「登録する」「保存する」などの肯定的な回答かどうかを判定
  const isConfirmationResponse = (text: string): boolean => {
    const confirmationPatterns = [
      /^(登録|保存|はい|OK|了解|お願い|よろしく|Yes|yes)/i,
      /(登録|保存)(する|します|してください)/i,
      /(はい|OK|了解|お願いします|Yes|yes)/i,
    ];
    return confirmationPatterns.some(pattern => pattern.test(text.trim()));
  };
  
  // ユーザーの回答が「最新のアイテムを使用」などの回答かどうかを判定
  const isUseLatestItemResponse = (text: string): boolean => {
    const patterns = [
      /最新のアイテム/i,
      /最新を使用/i,
      /最新/i,
      /latest.*item/i,
    ];
    return patterns.some(pattern => pattern.test(text.trim()));
  };

  // メッセージ送信
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const inputText = inputValue.trim();
    setInputValue('');
    setIsLoading(true);
    
    // 入力フォームのサイズをリセット
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = '24px'; // 最小高さにリセット
    }

    // ユーザーメッセージを追加
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: new Date(),
    };
    
    // ローディングメッセージを表示
    const loadingMessageId = (Date.now() + 1).toString();
    const loadingMessage: Message = {
      id: loadingMessageId,
      role: 'assistant',
      content: '考え中...',
      timestamp: new Date(),
    };
    
    // メッセージを更新（ユーザーメッセージとローディングメッセージを追加）
    setMessages((prev) => [...prev, userMessage, loadingMessage]);

    try {
      const organizationId = extractOrganizationId();
      
      // 議事録IDを抽出（Agentが選択されている場合）
      // まず、URLパラメータから取得を試みる
      let meetingNoteId: string | null = null;
      let itemId: string | null = null;
      let topicId: string | null = null;
      if (selectedAgent) {
        // URLパラメータから取得を試みる
        const meetingIdFromURL = extractMeetingNoteIdFromURL();
        if (meetingIdFromURL) {
          meetingNoteId = meetingIdFromURL;
          console.log('[useAIAssistant] URLから議事録IDを取得:', meetingNoteId);
          // 状態として保存
          setSavedMeetingNoteId(meetingNoteId);
        } else {
          // URLから取得できない場合、ユーザー入力から抽出
          const extractedId = extractMeetingNoteId(inputText);
          if (extractedId) {
            meetingNoteId = extractedId;
            console.log('[useAIAssistant] ユーザー入力から議事録IDを抽出:', meetingNoteId);
            // 状態として保存
            setSavedMeetingNoteId(meetingNoteId);
          } else {
            // 既に保存されているIDを使用
            meetingNoteId = savedMeetingNoteId;
            console.log('[useAIAssistant] 保存された議事録IDを使用:', meetingNoteId);
          }
        }
        
        // itemIdを抽出（例: "アイテムID: xxx" または "itemId: xxx"）
        const itemIdPattern = /(?:アイテムID|itemId)[：:]\s*([a-zA-Z0-9_-]+)/i;
        const itemIdMatch = inputText.match(itemIdPattern);
        if (itemIdMatch) {
          itemId = itemIdMatch[1];
          console.log('[useAIAssistant] アイテムIDを抽出:', itemId);
          // 状態として保存
          setSavedItemId(itemId);
        } else {
          // 既に保存されているIDを使用
          itemId = savedItemId;
          console.log('[useAIAssistant] 保存されたアイテムIDを使用:', itemId);
        }
        
        // topicIdを抽出（例: "トピックID: xxx" または "topicId: xxx"）
        const topicIdPattern = /(?:トピックID|topicId)[：:]\s*([a-zA-Z0-9_-]+)/i;
        const topicIdMatch = inputText.match(topicIdPattern);
        if (topicIdMatch) {
          topicId = topicIdMatch[1];
          console.log('[useAIAssistant] トピックIDを抽出:', topicId);
        }
      }
      
      // 前回のメッセージ履歴を確認して、format_meeting_note_content Toolが実行されたかどうかを確認
      const previousMessages = messages.slice(-5); // 最新5件のメッセージを確認
      const formatToolResultMessage = previousMessages.find(msg => 
        msg.role === 'assistant' && 
        (msg.content.includes('議事録整形結果') || msg.content.includes('format_meeting_note_content'))
      );
      
      // ユーザーの回答が肯定的な回答で、かつ前回format_meeting_note_content Toolが実行された場合
      if (formatToolResultMessage && isConfirmationResponse(inputText) && selectedAgent?.id === 'meeting-note-agent') {
        // まず、保存されているIDを使用（最初に送ったIDを優先）
        if (savedMeetingNoteId) {
          meetingNoteId = savedMeetingNoteId;
          console.log('[useAIAssistant] 保存された議事録IDを使用（登録時）:', meetingNoteId);
        } else {
          // 保存されていない場合、URLパラメータから議事録IDを取得
          const meetingIdFromURL = extractMeetingNoteIdFromURL();
          if (meetingIdFromURL) {
            meetingNoteId = meetingIdFromURL;
            console.log('[useAIAssistant] URLから議事録IDを取得（登録時）:', meetingNoteId);
          }
        }
        
        // itemIdも保存されているものを優先
        if (savedItemId) {
          itemId = savedItemId;
          console.log('[useAIAssistant] 保存されたアイテムIDを使用（登録時）:', itemId);
        }
        
        // 前回のメッセージからitemIdを抽出（もしあれば）
        for (const msg of [...previousMessages].reverse()) {
          if (msg.content.includes('ItemID:')) {
            const itemIdMatch = msg.content.match(/ItemID:\s*([a-zA-Z0-9_-]+)/i);
            if (itemIdMatch) {
              itemId = itemIdMatch[1];
              break;
            }
          }
        }
        
        // itemIdが取得できていない場合、ユーザーに確認を求める
        // ただし、「最新のアイテムを使用」と回答した場合は最新のアイテムIDを自動取得
        if (meetingNoteId && !itemId) {
          // 「最新のアイテムを使用」と回答した場合、最新のアイテムIDを自動取得
          if (isUseLatestItemResponse(inputText)) {
            try {
              const { getMeetingNoteById } = await import('@/lib/orgApi');
              const meetingNote = await getMeetingNoteById(meetingNoteId);
              if (meetingNote && meetingNote.content) {
                try {
                  const parsed = JSON.parse(meetingNote.content);
                  // すべてのタブから最新のアイテムを探す
                  let latestItem: any = null;
                  let latestItemTabId: string | null = null;
                  let latestTimestamp = 0;
                  
                  for (const [tabId, tabData] of Object.entries(parsed)) {
                    if (tabData && typeof tabData === 'object') {
                      const monthContent = tabData as any;
                      if (monthContent.items && Array.isArray(monthContent.items)) {
                        for (const item of monthContent.items) {
                          // アイテムの作成日時または更新日時を取得（あれば）
                          const itemTimestamp = item.updatedAt || item.createdAt || 0;
                          if (itemTimestamp > latestTimestamp) {
                            latestTimestamp = itemTimestamp;
                            latestItem = item;
                            latestItemTabId = tabId;
                          }
                        }
                      }
                    }
                  }
                  
                  // 最新のアイテムが見つかった場合、そのIDを使用
                  if (latestItem && latestItem.id) {
                    itemId = latestItem.id;
                    setSavedItemId(itemId);
                    console.log('[useAIAssistant] 最新のアイテムIDを取得:', {
                      itemId,
                      tabId: latestItemTabId,
                      title: latestItem.title,
                    });
                  } else {
                    // 最新のアイテムが見つからない場合、最初に見つかったアイテムを使用
                    for (const [tabId, tabData] of Object.entries(parsed)) {
                      if (tabData && typeof tabData === 'object') {
                        const monthContent = tabData as any;
                        if (monthContent.items && Array.isArray(monthContent.items) && monthContent.items.length > 0) {
                          itemId = monthContent.items[0].id;
                          setSavedItemId(itemId);
                          console.log('[useAIAssistant] 最初のアイテムIDを取得:', {
                            itemId,
                            tabId,
                          });
                          break;
                        }
                      }
                    }
                  }
                } catch (parseError) {
                  console.warn('[useAIAssistant] 議事録のパースに失敗:', parseError);
                }
              }
            } catch (error) {
              console.error('[useAIAssistant] 議事録の取得に失敗:', error);
            }
          }
          
          // itemIdがまだ取得できていない場合、ユーザーに確認を求める
          if (!itemId) {
            // 議事録から利用可能なアイテム一覧を取得して表示
            try {
              const { getMeetingNoteById } = await import('@/lib/orgApi');
              const meetingNote = await getMeetingNoteById(meetingNoteId);
              if (meetingNote && meetingNote.content) {
                try {
                  const parsed = JSON.parse(meetingNote.content);
                  // すべてのタブからアイテムを収集
                  const availableItems: Array<{ id: string; title: string; tabId: string }> = [];
                  
                  for (const [tabId, tabData] of Object.entries(parsed)) {
                    if (tabData && typeof tabData === 'object') {
                      const monthContent = tabData as any;
                      if (monthContent.items && Array.isArray(monthContent.items)) {
                        for (const item of monthContent.items) {
                          if (item.id && item.title) {
                            availableItems.push({
                              id: item.id,
                              title: item.title,
                              tabId: tabId,
                            });
                          }
                        }
                      }
                    }
                  }
                  
                  // アイテムが見つかった場合、ユーザーに確認を求める
                  if (availableItems.length > 0) {
                    const itemsList = availableItems.map(item => `- **${item.title}** (ItemID: ${item.id})`).join('\n');
                    const confirmationMessage: Message = {
                      id: loadingMessageId,
                      role: 'assistant',
                      content: `⚠️ **ItemIDが指定されていません。**\n\n以下のアイテムから選択してください：\n\n${itemsList}\n\n**ItemIDを指定してください。**\n例: 「ItemID: ${availableItems[0].id}」\n\nまたは、最新のアイテムを使用する場合は「最新のアイテムを使用」と回答してください。`,
                      timestamp: new Date(),
                    };
                    setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? confirmationMessage : msg));
                    setIsLoading(false);
                    return;
                  } else {
                    // アイテムが見つからない場合、エラーを返す
                    const errorMessage: Message = {
                      id: loadingMessageId,
                      role: 'assistant',
                      content: '❌ 議事録にアイテムが見つかりませんでした。先に議事録アイテムを作成してください。',
                      timestamp: new Date(),
                    };
                    setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? errorMessage : msg));
                    setIsLoading(false);
                    return;
                  }
                } catch (parseError) {
                  console.warn('[useAIAssistant] 議事録のパースに失敗:', parseError);
                  const errorMessage: Message = {
                    id: loadingMessageId,
                    role: 'assistant',
                    content: '❌ 議事録の内容を読み取れませんでした。ItemIDを明示的に指定してください。\n\n例: 「ItemID: xxx」',
                    timestamp: new Date(),
                  };
                  setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? errorMessage : msg));
                  setIsLoading(false);
                  return;
                }
              } else {
                // 議事録が見つからない場合
                const errorMessage: Message = {
                  id: loadingMessageId,
                  role: 'assistant',
                  content: '❌ 議事録が見つかりませんでした。ItemIDを明示的に指定してください。\n\n例: 「ItemID: xxx」',
                  timestamp: new Date(),
                };
                setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? errorMessage : msg));
                setIsLoading(false);
                return;
              }
            } catch (error) {
              console.error('[useAIAssistant] 議事録の取得に失敗:', error);
              const errorMessage: Message = {
                id: loadingMessageId,
                role: 'assistant',
                content: '❌ 議事録の取得に失敗しました。ItemIDを明示的に指定してください。\n\n例: 「ItemID: xxx」',
                timestamp: new Date(),
              };
              setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? errorMessage : msg));
              setIsLoading(false);
              return;
            }
          }
        }
        
        // 前回のメッセージからformattedContentを抽出
        let formattedContent: string | null = null;
        
        console.log('[useAIAssistant] 前回のメッセージからformattedContentを抽出します:', {
          messageLength: formatToolResultMessage.content.length,
          hasFormattedContentSection: formatToolResultMessage.content.includes('### 整形された内容'),
          messagePreview: formatToolResultMessage.content.substring(0, 500),
        });
        
        // パターン1: "### 整形された内容" セクションから抽出（最も確実）
        if (formatToolResultMessage.content.includes('### 整形された内容')) {
          // "### 整形された内容" の後から、確認メッセージ（💡 **確認**）の前までを抽出
          // 複数のパターンを試す
          let contentMatch = formatToolResultMessage.content.match(/### 整形された内容\s*\n\n([\s\S]*?)(?:\n\n💡\s*\*\*確認\*\*|$)/);
          if (!contentMatch) {
            // パターン2: 💡 だけでなく、**確認** や **この内容で議事録に登録しますか？** の前まで
            contentMatch = formatToolResultMessage.content.match(/### 整形された内容\s*\n\n([\s\S]*?)(?:\n\n\*\*この内容で議事録に登録しますか\?\*\*|$)/);
          }
          if (!contentMatch) {
            // パターン3: 💡 の前まで
            contentMatch = formatToolResultMessage.content.match(/### 整形された内容\s*\n\n([\s\S]*?)(?:\n\n💡|$)/);
          }
          if (!contentMatch) {
            // パターン4: 最後の手段として、次のセクション（## で始まる）の前まで
            contentMatch = formatToolResultMessage.content.match(/### 整形された内容\s*\n\n([\s\S]*?)(?:\n\n##|$)/);
          }
          if (contentMatch && contentMatch[1]) {
            formattedContent = contentMatch[1].trim();
            console.log('[useAIAssistant] パターン1で抽出成功:', formattedContent.length, '文字');
          }
        }
        
        // パターン2: "議事録整形結果" セクション全体から抽出
        if (!formattedContent && formatToolResultMessage.content.includes('## 議事録整形結果')) {
          // "## 議事録整形結果" から "### 整形された内容" までの間、またはその後の内容を抽出
          const fullMatch = formatToolResultMessage.content.match(/## 議事録整形結果\s*\n\n### 整形された内容\s*\n\n([\s\S]*?)(?:\n\n(?:💡|✅|\*\*|##)|$)/);
          if (fullMatch && fullMatch[1]) {
            formattedContent = fullMatch[1].trim();
            console.log('[useAIAssistant] パターン2で抽出成功:', formattedContent.length, '文字');
          }
        }
        
        // パターン3: マークダウンのコードブロックから抽出
        if (!formattedContent && formatToolResultMessage.content.includes('```')) {
          const codeBlockMatch = formatToolResultMessage.content.match(/```[\s\S]*?\n([\s\S]*?)```/);
          if (codeBlockMatch && codeBlockMatch[1]) {
            formattedContent = codeBlockMatch[1].trim();
            console.log('[useAIAssistant] パターン3で抽出成功:', formattedContent.length, '文字');
          }
        }
        
        // パターン4: Tool実行結果のJSONデータから直接取得（最後の手段）
        if (!formattedContent) {
          // 前回のメッセージ履歴から、Tool実行結果のJSONデータを探す
          for (const msg of previousMessages) {
            if (msg.content.includes('format_meeting_note_content') && msg.content.includes('formattedContent')) {
              try {
                const jsonMatch = msg.content.match(/\{[^}]*"formattedContent"[^}]*\}/);
                if (jsonMatch) {
                  const parsed = JSON.parse(jsonMatch[0]);
                  if (parsed.formattedContent) {
                    formattedContent = parsed.formattedContent;
                    console.log('[useAIAssistant] パターン4で抽出成功:', formattedContent.length, '文字');
                    break;
                  }
                }
              } catch (parseError) {
                console.warn('[useAIAssistant] JSONパースに失敗:', parseError);
              }
            }
          }
        }
        
        console.log('[useAIAssistant] formattedContent抽出結果:', {
          hasFormattedContent: !!formattedContent,
          formattedContentLength: formattedContent?.length || 0,
          preview: formattedContent?.substring(0, 200) || '(空)',
        });
        
        // formattedContentが取得できていない場合、エラーを返す
        if (!formattedContent || formattedContent.trim().length === 0) {
          console.error('[useAIAssistant] formattedContentが取得できませんでした。');
          console.error('[useAIAssistant] 前回のメッセージ全体:', formatToolResultMessage.content);
          const errorMessage: Message = {
            id: loadingMessageId,
            role: 'assistant',
            content: '❌ 前回の整形結果が見つかりませんでした。もう一度内容を送信してください。',
            timestamp: new Date(),
          };
          setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? errorMessage : msg));
          setIsLoading(false);
          return;
        }
        
        if (meetingNoteId) {
          // format_meeting_note_content Toolをsave: trueで直接呼び出す
          console.log('[useAIAssistant] 登録確認を受け取りました。保存処理を実行します。', {
            meetingNoteId,
            itemId,
            topicId,
            hasFormattedContent: !!formattedContent,
          });
          
          try {
            const { executeTool } = await import('@/lib/mcp/tools');
            
            console.log('[useAIAssistant] 保存処理を実行します:', {
              meetingNoteId,
              itemId,
              topicId,
              hasFormattedContent: !!formattedContent,
              formattedContentLength: formattedContent?.length || 0,
            });
            
            const toolResult = await executeTool({
              tool: 'format_meeting_note_content',
              arguments: {
                meetingNoteId: meetingNoteId,
                itemId: itemId || undefined,
                topicId: topicId || undefined,
                rawContent: formattedContent || undefined, // 前回の整形結果を渡す
                save: true,
                modelType: selectedAgent.modelType || 'gpt',
                selectedModel: selectedAgent.selectedModel || 'gpt-5-mini',
              },
              context: {
                organizationId,
              },
            });
            
            console.log('[useAIAssistant] Tool実行結果:', {
              success: toolResult.success,
              saved: (toolResult.data as any)?.saved,
              error: toolResult.error,
              data: toolResult.data,
            });
            
            if (toolResult.success) {
              const saved = (toolResult.data as any)?.saved || false;
              if (saved) {
                // 保存完了をカスタムイベントで通知（議事録詳細ページで再取得するため）
                if (typeof window !== 'undefined' && meetingNoteId) {
                  window.dispatchEvent(new CustomEvent('meetingNoteUpdated', {
                    detail: {
                      meetingNoteId: meetingNoteId,
                      itemId: itemId,
                    },
                  }));
                  console.log('[useAIAssistant] 議事録更新イベントを発火:', { meetingNoteId, itemId });
                }
                
                const assistantMessage: Message = {
                  id: loadingMessageId,
                  role: 'assistant',
                  content: '✅ 議事録の内容を更新しました。',
                  timestamp: new Date(),
                };
                setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? assistantMessage : msg));
              } else {
                // 保存されなかった場合の詳細なエラーメッセージ
                const errorDetails = (toolResult.data as any)?.message || toolResult.error || '保存に失敗しました';
                const assistantMessage: Message = {
                  id: loadingMessageId,
                  role: 'assistant',
                  content: `❌ 議事録の保存に失敗しました。\n\n詳細: ${errorDetails}\n\n議事録ID: ${meetingNoteId}\nアイテムID: ${itemId || '未指定'}`,
                  timestamp: new Date(),
                };
                setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? assistantMessage : msg));
              }
              setIsLoading(false);
              return;
            } else {
              const errorMessage = toolResult.error || '保存に失敗しました';
              console.error('[useAIAssistant] Tool実行失敗:', errorMessage);
              throw new Error(errorMessage);
            }
          } catch (toolError: any) {
            console.error('[useAIAssistant] Tool実行エラー:', toolError);
            console.error('[useAIAssistant] エラー詳細:', {
              message: toolError.message,
              stack: toolError.stack,
              name: toolError.name,
            });
            const errorMessage: Message = {
              id: loadingMessageId,
              role: 'assistant',
              content: `❌ 議事録の保存に失敗しました。\n\nエラー: ${toolError.message || '不明なエラー'}\n\n議事録ID: ${meetingNoteId}\nアイテムID: ${itemId || '未指定'}\n\n詳細はコンソールを確認してください。`,
              timestamp: new Date(),
            };
            setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? errorMessage : msg));
            setIsLoading(false);
            return;
          }
        }
      }
      
      // MeetingIDが指定されているが、内容が指定されていない場合、問い返す
      if (selectedAgent && meetingNoteId && !itemId) {
        // 前回のメッセージでMeetingIDが指定されていたかチェック
        const previousMessage = messages[messages.length - 1];
        const hasMeetingIdInPrevious = previousMessage && 
          (extractMeetingNoteId(previousMessage.content) || extractMeetingNoteIdFromURL());
        
        // 今回のメッセージにMeetingIDが含まれているが、内容が指定されていない場合
        const hasMeetingIdInCurrent = extractMeetingNoteId(inputText) || extractMeetingNoteIdFromURL();
        const hasContent = inputText.length > 50 || // ある程度の長さがある
          inputText.includes('整形') || 
          inputText.includes('編集') ||
          inputText.includes('内容');
        
        if (hasMeetingIdInCurrent && !hasContent) {
          // MeetingIDが指定されているが、内容が指定されていない場合、問い返す
          const questionMessage: Message = {
            id: loadingMessageId,
            role: 'assistant',
            content: `議事録ID「${meetingNoteId}」を確認しました。\n\n整形してほしい内容を教えてください。テキストをそのまま貼り付けるか、内容を入力してください。`,
            timestamp: new Date(),
          };
          setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? questionMessage : msg));
          setIsLoading(false);
          return;
        }
      }
      
      // RAGコンテキストを取得
      const { context: ragContext, sources: ragSources } = await getRAGContext(
        inputText,
        organizationId
      );

      // 最新のメッセージ履歴を取得（ユーザーメッセージを含むが、ローディングメッセージは除外）
      const currentMessages = [...messages, userMessage];
      
      // AIにメッセージを送信
      const responseText = await sendAIMessage(
        inputText,
        currentMessages,
        ragContext,
        ragSources,
        organizationId,
        selectedAgent,
        meetingNoteId,
        itemId
      );

      // ローディングメッセージを実際のレスポンスに置き換え
      const assistantMessage: Message = {
        id: loadingMessageId,
        role: 'assistant',
        content: responseText || 'レスポンスが空でした。',
        timestamp: new Date(),
      };
      setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? assistantMessage : msg));
    } catch (error: any) {
      console.error('AIアシスタントエラー:', error);
      const errorMessage: Message = {
        id: loadingMessageId,
        role: 'assistant',
        content: `❌ エラーが発生しました: ${error.message || '不明なエラー'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => prev.map(msg => msg.id === loadingMessageId ? errorMessage : msg));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    setMessages,
    inputValue,
    setInputValue,
    isLoading,
    copiedMessageId,
    feedbackRatings,
    messagesEndRef,
    inputRef,
    handleSend,
    handleCopyMessage,
    handleAIFeedback,
  };
}

