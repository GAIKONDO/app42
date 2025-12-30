'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Category, Startup } from '@/lib/orgApi';

interface DetailsTabProps {
  isEditing: boolean;
  editingContent: string;
  setEditingContent: (content: string) => void;
  // 新しいフィールド
  startup: Startup | null;
  localCategory: string[];
  setLocalCategory: (category: string[]) => void;
  localStatus: string;
  setLocalStatus: (status: string) => void;
  localAgencyContractMonth: string;
  setLocalAgencyContractMonth: (month: string) => void;
  localEngagementLevel: string;
  setLocalEngagementLevel: (level: string) => void;
  localBizDevPhase: string;
  setLocalBizDevPhase: (phase: string) => void;
  localRelatedVCs: string[];
  setLocalRelatedVCs: (vcs: string[]) => void;
  localResponsibleDepts: string[];
  setLocalResponsibleDepts: (depts: string[]) => void;
  localHpUrl: string;
  setLocalHpUrl: (url: string) => void;
  localAsanaUrl: string;
  setLocalAsanaUrl: (url: string) => void;
  localBoxUrl: string;
  setLocalBoxUrl: (url: string) => void;
  // 選択肢のオプション
  categories: Category[];
  vcs: VC[];
  departments: Department[];
  statuses: Status[];
  engagementLevels: EngagementLevel[];
  bizDevPhases: BizDevPhase[];
}

export default function DetailsTab({
  isEditing,
  editingContent,
  setEditingContent,
  startup,
  localCategory,
  setLocalCategory,
  localStatus,
  setLocalStatus,
  localAgencyContractMonth,
  setLocalAgencyContractMonth,
  localEngagementLevel,
  setLocalEngagementLevel,
  localBizDevPhase,
  setLocalBizDevPhase,
  localRelatedVCs,
  setLocalRelatedVCs,
  localResponsibleDepts,
  setLocalResponsibleDepts,
  localHpUrl,
  setLocalHpUrl,
  localAsanaUrl,
  setLocalAsanaUrl,
  localBoxUrl,
  setLocalBoxUrl,
  categories,
  vcs,
  departments,
  statuses,
  engagementLevels,
  bizDevPhases,
}: DetailsTabProps) {
  // デバッグ: カテゴリーの状態を確認
  console.log('🔍 [DetailsTab] categories:', categories);
  console.log('🔍 [DetailsTab] categories length:', categories?.length || 0);
  console.log('🔍 [DetailsTab] localCategory:', localCategory);
  console.log('🔍 [DetailsTab] localCategory length:', localCategory?.length || 0);
  
  // 親カテゴリー（トップレベル）を取得
  const topLevelCategories = (categories || []).filter(cat => !cat.parentCategoryId);
  
  // 子カテゴリーを取得する関数
  const getChildren = (parentId: string) => (categories || []).filter(cat => cat.parentCategoryId === parentId);
  
  console.log('🔍 [DetailsTab] topLevelCategories:', topLevelCategories);
  
  // 選択された親カテゴリーを管理（Finder形式のカラム表示用）
  const [selectedParentCategoryId, setSelectedParentCategoryId] = React.useState<string | null>(null);
  
  // 代理店契約締結月を年と月で管理
  const [agencyContractYear, setAgencyContractYear] = React.useState<string>('');
  const [agencyContractMonth, setAgencyContractMonth] = React.useState<string>('');

  // 無限ループを防ぐためのref（前回の値を保持）
  const prevLocalAgencyContractMonthRef = React.useRef<string>('');
  const prevAgencyContractYearRef = React.useRef<string>('');
  const prevAgencyContractMonthRef = React.useRef<string>('');

  // URLフィールドの個別編集状態
  const [isEditingHpUrl, setIsEditingHpUrl] = React.useState(false);
  const [isEditingAsanaUrl, setIsEditingAsanaUrl] = React.useState(false);
  const [isEditingBoxUrl, setIsEditingBoxUrl] = React.useState(false);

  // AIカテゴリー判定の状態
  const [isAICategorizing, setIsAICategorizing] = React.useState(false);
  
  // カテゴリーポップアップの状態
  const [hoveredCategoryId, setHoveredCategoryId] = React.useState<string | null>(null);
  const [popupPosition, setPopupPosition] = React.useState<{ x: number; y: number } | null>(null);
  
  // 初期化: 既に選択されているカテゴリーから親カテゴリーを特定
  React.useEffect(() => {
    if (localCategory.length > 0 && !selectedParentCategoryId) {
      // 選択されているカテゴリーの親カテゴリーを探す
      const selectedCategory = categories.find(cat => localCategory.includes(cat.id));
      if (selectedCategory) {
        if (selectedCategory.parentCategoryId) {
          // サブカテゴリーが選択されている場合、親カテゴリーを設定
          setSelectedParentCategoryId(selectedCategory.parentCategoryId);
        } else {
          // 親カテゴリーが選択されている場合
          setSelectedParentCategoryId(selectedCategory.id);
        }
      }
    }
  }, [localCategory, categories, selectedParentCategoryId]);
  
  // 代理店契約締結月の初期化（YYYY-MM形式から年と月を分離）
  React.useEffect(() => {
    // localAgencyContractMonthが変更された場合のみ更新
    if (prevLocalAgencyContractMonthRef.current === localAgencyContractMonth) {
      return;
    }
    
    // 年と月から生成された値と一致する場合はスキップ（無限ループ防止）
    if (agencyContractYear && agencyContractMonth) {
      const formattedMonth = `${agencyContractYear}-${agencyContractMonth.padStart(2, '0')}`;
      if (formattedMonth === localAgencyContractMonth) {
        prevLocalAgencyContractMonthRef.current = localAgencyContractMonth;
        return; // 既に同期されている場合はスキップ
      }
    }
    
    if (localAgencyContractMonth) {
      const [year, month] = localAgencyContractMonth.split('-');
      if (year && year !== agencyContractYear) {
        setAgencyContractYear(year);
      }
      if (month && month !== agencyContractMonth) {
        setAgencyContractMonth(month);
      }
    } else {
      if (agencyContractYear) {
        setAgencyContractYear('');
      }
      if (agencyContractMonth) {
        setAgencyContractMonth('');
      }
    }
    
    prevLocalAgencyContractMonthRef.current = localAgencyContractMonth;
  }, [localAgencyContractMonth, agencyContractYear, agencyContractMonth]);
  
  // 年と月が変更されたら、YYYY-MM形式に変換して保存
  React.useEffect(() => {
    // agencyContractYearまたはagencyContractMonthが変更されていない場合はスキップ
    if (
      prevAgencyContractYearRef.current === agencyContractYear &&
      prevAgencyContractMonthRef.current === agencyContractMonth
    ) {
      return;
    }
    
    if (agencyContractYear && agencyContractMonth) {
      const formattedMonth = `${agencyContractYear}-${agencyContractMonth.padStart(2, '0')}`;
      if (formattedMonth !== localAgencyContractMonth) {
        setLocalAgencyContractMonth(formattedMonth);
      }
    } else if (!agencyContractYear && !agencyContractMonth) {
      if (localAgencyContractMonth) {
        setLocalAgencyContractMonth('');
      }
    }
    
    prevAgencyContractYearRef.current = agencyContractYear;
    prevAgencyContractMonthRef.current = agencyContractMonth;
  }, [agencyContractYear, agencyContractMonth, localAgencyContractMonth]);
  
  // 親カテゴリーを選択
  const handleParentCategorySelect = (parentCategoryId: string) => {
    setSelectedParentCategoryId(parentCategoryId);
  };
  
  // サブカテゴリーをトグル（親カテゴリーが選択されている場合のみ）
  const handleSubCategoryToggle = (subCategoryId: string) => {
    if (!selectedParentCategoryId) return;
    
    const subCategory = categories.find(c => c.id === subCategoryId);
    const parentCategoryId = subCategory?.parentCategoryId;
    
    if (localCategory.includes(subCategoryId)) {
      // サブカテゴリーを解除する場合
      const newCategoryIds = localCategory.filter(c => c !== subCategoryId);
      setLocalCategory(newCategoryIds);
    } else {
      // サブカテゴリーを選択する場合、親カテゴリーも自動的に追加
      const newCategoryIds = [...localCategory, subCategoryId];
      if (parentCategoryId && !newCategoryIds.includes(parentCategoryId)) {
        newCategoryIds.push(parentCategoryId);
      }
      setLocalCategory(newCategoryIds);
    }
  };
  
  // 親カテゴリーをトグル（親カテゴリーを選択/解除）
  const handleParentCategoryToggle = (parentCategoryId: string) => {
    const isSelected = localCategory.includes(parentCategoryId);
    
    if (isSelected) {
      // 親カテゴリーを解除する場合、そのサブカテゴリーも全て解除
      const childCategoryIds = getChildren(parentCategoryId).map(c => c.id);
      const newCategoryIds = localCategory.filter(c => c !== parentCategoryId && !childCategoryIds.includes(c));
      setLocalCategory(newCategoryIds);
      
      // 選択された親カテゴリーが解除された場合、選択状態をクリア
      if (selectedParentCategoryId === parentCategoryId) {
        setSelectedParentCategoryId(null);
      }
    } else {
      // 親カテゴリーを選択する場合
      setLocalCategory([...localCategory, parentCategoryId]);
      setSelectedParentCategoryId(parentCategoryId);
    }
  };

  // 関連VCトグル（VC IDで管理）
  const handleVCToggle = (vcId: string) => {
    console.log('🔍 [DetailsTab] handleVCToggle:', {
      vcId,
      currentLocalRelatedVCs: localRelatedVCs,
      isSelected: localRelatedVCs.includes(vcId),
    });
    
    const newVcIds = localRelatedVCs.includes(vcId)
      ? localRelatedVCs.filter(v => v !== vcId)
      : [...localRelatedVCs, vcId];
    
    console.log('🔍 [DetailsTab] newVcIds:', newVcIds);
    
    setLocalRelatedVCs(newVcIds);
  };

  // 主管事業部署トグル（部署IDで管理）
  const handleDeptToggle = (deptId: string) => {
    console.log('🔍 [DetailsTab] handleDeptToggle:', {
      deptId,
      currentLocalResponsibleDepts: localResponsibleDepts,
      isSelected: localResponsibleDepts.includes(deptId),
    });
    
    const newDeptIds = localResponsibleDepts.includes(deptId)
      ? localResponsibleDepts.filter(d => d !== deptId)
      : [...localResponsibleDepts, deptId];
    
    console.log('🔍 [DetailsTab] newDeptIds:', newDeptIds);
    
    setLocalResponsibleDepts(newDeptIds);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '6px', border: '1px solid #BFDBFE' }}>
        <div style={{ fontSize: '13px', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
          💡 <strong>保存について:</strong> 編集内容を保存するには、ページ右上の「保存」ボタンをクリックしてください。
        </div>
      </div>

      {/* カテゴリー（Finder形式のカラム表示） */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <label style={{ 
            display: 'block', 
            fontWeight: '600', 
            color: '#1A1A1A',
            fontSize: '14px',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            <span style={{ 
              display: 'inline-block',
              width: '24px',
              height: '24px',
              lineHeight: '24px',
              textAlign: 'center',
              backgroundColor: '#4262FF',
              color: '#FFFFFF',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '700',
              marginRight: '8px',
              verticalAlign: 'middle',
            }}>1</span>
            カテゴリー
          </label>
          <button
            type="button"
            onClick={async () => {
              if (!startup || categories.length === 0) {
                alert('スタートアップ情報またはカテゴリーが不足しています。');
                return;
              }

              setIsAICategorizing(true);
              try {
                // AIモデル設定を取得
                const aiModelType = (typeof window !== 'undefined' && localStorage.getItem('aiGenerationModelType')) || 'gpt';
                const aiSelectedModel = (typeof window !== 'undefined' && localStorage.getItem('aiGenerationSelectedModel')) || 'gpt-5-mini';

                // スタートアップの情報を収集
                const startupInfo = {
                  title: startup.title || '',
                  description: startup.description || '',
                  content: editingContent || '',
                  objective: startup.objective || '',
                  evaluation: startup.evaluation || '',
                  deepSearch: startup.deepSearch?.content || '',
                  hpUrl: localHpUrl || '',
                  asanaUrl: localAsanaUrl || '',
                  boxUrl: localBoxUrl || '',
                };

                // 情報の充足度をチェック
                const hasTitle = !!startupInfo.title;
                const hasDescription = !!startupInfo.description;
                const hasContent = !!startupInfo.content;
                const hasObjective = !!startupInfo.objective;
                const hasEvaluation = !!startupInfo.evaluation;
                const hasDeepSearch = !!startupInfo.deepSearch;
                const hasUrls = !!(startupInfo.hpUrl || startupInfo.asanaUrl || startupInfo.boxUrl);
                
                const infoCount = [hasTitle, hasDescription, hasContent, hasObjective, hasEvaluation, hasDeepSearch, hasUrls].filter(Boolean).length;
                const isInfoInsufficient = infoCount < 3; // 3つ未満の場合は情報不足と判断

                // カテゴリー一覧を整形
                const categoryList = categories.map(cat => {
                  const parentCategory = cat.parentCategoryId 
                    ? categories.find(c => c.id === cat.parentCategoryId)
                    : null;
                  const label = parentCategory
                    ? `${parentCategory.title} / ${cat.title}`
                    : cat.title;
                  return {
                    id: cat.id,
                    label: label,
                    parentId: cat.parentCategoryId || null,
                  };
                });

                // システムプロンプト
                const systemPrompt = `あなたはスタートアップの情報を分析して、適切なカテゴリーを判定するAIアシスタントです。
利用可能なカテゴリー一覧から、スタートアップの情報に最も適したカテゴリーを複数選択してください。

**重要な指示:**
1. 提供されたスタートアップ情報が不足している場合、以下の方法で情報を補完してください:
   - スタートアップのタイトルから、一般的な知識や業界情報を活用して推測
   - 提供されたURL（HP URL、Asana URL、Box URL）から、そのスタートアップの特徴を推測
   - あなたの知識ベース（学習データ）から、類似のスタートアップや業界の情報を活用
   - 可能であれば、Web検索機能を活用して最新情報を取得（モデルが対応している場合）

2. 情報が不足している場合でも、タイトルやURLから可能な限り正確に判定してください。

3. カテゴリーIDの配列をJSON形式で返してください。

出力形式:
{
  "categoryIds": ["category-id-1", "category-id-2", ...]
}`;

                // ユーザープロンプト
                const userPrompt = `以下のスタートアップ情報を分析して、適切なカテゴリーを選択してください。

【スタートアップ情報】
タイトル: ${startupInfo.title || '(未設定)'}
説明: ${startupInfo.description || '(未設定)'}
詳細コンテンツ: ${startupInfo.content || '(未設定)'}
目的: ${startupInfo.objective || '(未設定)'}
評価: ${startupInfo.evaluation || '(未設定)'}
Deepsearch情報: ${startupInfo.deepSearch || '(未設定)'}
HP URL: ${startupInfo.hpUrl || '(未設定)'}
Asana URL: ${startupInfo.asanaUrl || '(未設定)'}
Box URL: ${startupInfo.boxUrl || '(未設定)'}

${isInfoInsufficient ? `
【重要】上記の情報が不足しているため、以下の方法で情報を補完して判定してください:
1. スタートアップのタイトル「${startupInfo.title}」から、一般的な知識や業界情報を活用
2. 提供されたURLから、そのスタートアップの特徴や事業内容を推測
3. あなたの知識ベースから、類似のスタートアップや業界の情報を活用
4. 可能であれば、Web検索機能を活用して最新情報を取得（モデルが対応している場合）

情報が不足していても、タイトルやURLから可能な限り正確に判定してください。
` : ''}

【利用可能なカテゴリー】
${categoryList.map(cat => `- ID: ${cat.id}, ラベル: ${cat.label}`).join('\n')}

上記の情報${isInfoInsufficient ? '（必要に応じて外部情報も活用）' : ''}を基に、最も適切なカテゴリーIDの配列をJSON形式で返してください。複数選択可能です。`;

                // AI APIを呼び出し
                const isLocalModel = aiSelectedModel.startsWith('qwen') || 
                                     aiSelectedModel.startsWith('llama') || 
                                     aiSelectedModel.startsWith('mistral') ||
                                     aiSelectedModel.includes(':latest') ||
                                     aiSelectedModel.includes(':instruct');

                let responseText = '';
                if (isLocalModel || aiModelType === 'local') {
                  // Ollama API
                  const apiUrl = process.env.NEXT_PUBLIC_OLLAMA_API_URL || 'http://localhost:11434/api/chat';
                  const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      model: aiSelectedModel,
                      messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                      ],
                      stream: false,
                      options: {
                        temperature: 0.7,
                        num_predict: 1000,
                      },
                    }),
                  });

                  if (!response.ok) {
                    throw new Error(`Ollama APIエラー: ${response.status}`);
                  }

                  const data = await response.json();
                  responseText = data.message?.content?.trim() || '';
                } else {
                  // OpenAI API
                  let apiKey: string | undefined;
                  if (typeof window !== 'undefined') {
                    try {
                      const { getAPIKey } = await import('@/lib/security');
                      apiKey = getAPIKey('openai') || undefined;
                    } catch (error) {
                      apiKey = localStorage.getItem('NEXT_PUBLIC_OPENAI_API_KEY') || undefined;
                    }
                  }
                  if (!apiKey) {
                    apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
                  }

                  if (!apiKey) {
                    throw new Error('OpenAI APIキーが設定されていません。');
                  }

                  const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${apiKey}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      model: aiSelectedModel,
                      messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                      ],
                      temperature: 0.7,
                      max_tokens: 1000,
                    }),
                  });

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(`OpenAI APIエラー: ${response.status} ${JSON.stringify(errorData)}`);
                  }

                  const data = await response.json();
                  responseText = data.choices?.[0]?.message?.content?.trim() || '';
                }

                // JSONをパース
                let categoryIds: string[] = [];
                try {
                  // JSONコードブロックを抽出
                  const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                                   responseText.match(/```\n([\s\S]*?)\n```/) ||
                                   responseText.match(/\{[\s\S]*\}/);
                  
                  const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
                  const parsed = JSON.parse(jsonText);
                  categoryIds = Array.isArray(parsed.categoryIds) ? parsed.categoryIds : [];
                } catch (parseError) {
                  console.error('JSONパースエラー:', parseError, 'Response:', responseText);
                  // フォールバック: カテゴリーIDを直接検索
                  categoryIds = categoryList
                    .filter(cat => responseText.includes(cat.id))
                    .map(cat => cat.id);
                }

                // 有効なカテゴリーIDのみをフィルター
                let validCategoryIds = categoryIds.filter(id => 
                  categories.some(cat => cat.id === id)
                );

                // サブカテゴリーが含まれている場合、親カテゴリーも自動的に追加
                const categoryIdsWithParents = new Set(validCategoryIds);
                validCategoryIds.forEach(categoryId => {
                  const category = categories.find(c => c.id === categoryId);
                  if (category?.parentCategoryId) {
                    // サブカテゴリーの場合、親カテゴリーも追加
                    categoryIdsWithParents.add(category.parentCategoryId);
                  }
                });
                validCategoryIds = Array.from(categoryIdsWithParents);

                if (validCategoryIds.length > 0) {
                  setLocalCategory(validCategoryIds);
                  alert(`${validCategoryIds.length}個のカテゴリーを自動判定しました。`);
                } else {
                  alert('適切なカテゴリーが見つかりませんでした。');
                }
              } catch (error: any) {
                console.error('AIカテゴリー判定エラー:', error);
                alert(`カテゴリーの自動判定に失敗しました: ${error?.message || '不明なエラー'}`);
              } finally {
                setIsAICategorizing(false);
              }
            }}
            disabled={isAICategorizing || !startup || categories.length === 0}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: '500',
              color: '#4262FF',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '6px',
              cursor: isAICategorizing || !startup || categories.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              opacity: isAICategorizing || !startup || categories.length === 0 ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isAICategorizing && startup && categories.length > 0) {
                e.currentTarget.style.backgroundColor = '#DBEAFE';
                e.currentTarget.style.borderColor = '#93C5FD';
              }
            }}
            onMouseLeave={(e) => {
              if (!isAICategorizing && startup && categories.length > 0) {
                e.currentTarget.style.backgroundColor = '#EFF6FF';
                e.currentTarget.style.borderColor = '#BFDBFE';
              }
            }}
          >
            {isAICategorizing ? (
              <>
                <svg 
                  width="14" 
                  height="14" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  style={{
                    animation: 'spin 1s linear infinite',
                  }}
                >
                  <path d="M21 12a9 9 0 11-6.219-8.56" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                判定中...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                AIでカテゴリーを自動判定
              </>
            )}
          </button>
        </div>
        {topLevelCategories.length === 0 ? (
          <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '6px', color: '#6B7280', fontSize: '14px' }}>
            カテゴリーが登録されていません。分析ページの機能3でカテゴリーを追加してください。
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            gap: '1px', 
            border: '1px solid #E5E7EB', 
            borderRadius: '8px', 
            overflow: 'hidden',
            backgroundColor: '#E5E7EB',
            minHeight: '400px',
          }}>
            {/* 左カラム: 親カテゴリー */}
            <div style={{ 
              flex: '0 0 250px', 
              backgroundColor: '#FFFFFF',
              overflowY: 'auto',
              maxHeight: '600px',
            }}>
          {topLevelCategories.map((parentCategory) => {
            const isParentSelected = localCategory.includes(parentCategory.id);
                const isActive = selectedParentCategoryId === parentCategory.id;
            
            return (
                  <div
                    key={parentCategory.id}
                    style={{
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      if (typeof window === 'undefined') return;
                      setHoveredCategoryId(parentCategory.id);
                      const rect = e.currentTarget.getBoundingClientRect();
                      setPopupPosition({
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredCategoryId(null);
                      setPopupPosition(null);
                    }}
                  >
                    <div
                      onClick={() => handleParentCategorySelect(parentCategory.id)}
                      style={{
                        padding: '12px 16px',
                        backgroundColor: isActive ? '#F0F4FF' : isParentSelected ? '#F9FAFB' : '#FFFFFF',
                        borderLeft: isActive ? '3px solid #4262FF' : '3px solid transparent',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: isActive ? '600' : isParentSelected ? '500' : '400',
                        color: isActive ? '#4262FF' : '#374151',
                        transition: 'all 0.15s',
                        borderBottom: '1px solid #F3F4F6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = '#F9FAFB';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = isParentSelected ? '#F9FAFB' : '#FFFFFF';
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isParentSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleParentCategoryToggle(parentCategory.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          cursor: 'pointer',
                          width: '16px',
                          height: '16px',
                          accentColor: '#4262FF',
                        }}
                      />
                      <span style={{ flex: 1 }}>{parentCategory.title}</span>
                    </div>
                    {/* ポップアップ */}
                    {hoveredCategoryId === parentCategory.id && popupPosition && typeof window !== 'undefined' && (
                      <div
                        style={{
                          position: 'fixed',
                          left: `${popupPosition.x}px`,
                          top: `${popupPosition.y - 8}px`,
                          transform: 'translate(-50%, -100%)',
                          zIndex: 1000,
                          pointerEvents: 'none',
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: '#1A1A1A',
                            color: '#FFFFFF',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            lineHeight: '1.6',
                            maxWidth: '320px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          }}
                        >
                          <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
                            {parentCategory.title}
                          </div>
                          {parentCategory.description && (
                            <div style={{ color: '#E5E7EB', fontSize: '12px', lineHeight: '1.5' }}>
                              {parentCategory.description}
                            </div>
                          )}
                          {!parentCategory.description && (
                            <div style={{ color: '#9CA3AF', fontSize: '12px', fontStyle: 'italic' }}>
                              説明が設定されていません
                            </div>
                          )}
                        </div>
                        {/* 矢印 */}
                        <div
                          style={{
                            position: 'absolute',
                            left: '50%',
                            bottom: '-6px',
                            transform: 'translateX(-50%)',
                            width: 0,
                            height: 0,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: '6px solid #1A1A1A',
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* 右カラム: サブカテゴリー */}
            <div style={{ 
              flex: 1, 
              backgroundColor: '#FFFFFF',
              overflowY: 'auto',
              maxHeight: '600px',
              padding: '16px',
            }}>
              {selectedParentCategoryId ? (
                (() => {
                  const selectedParent = topLevelCategories.find(cat => cat.id === selectedParentCategoryId);
                  const subCategories = selectedParent ? getChildren(selectedParentCategoryId) : [];
                  
                  return subCategories.length > 0 ? (
                    <div>
                      <div style={{ 
                        marginBottom: '16px', 
                        paddingBottom: '12px', 
                        borderBottom: '1px solid #E5E7EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <h3 style={{ 
                          fontSize: '16px', 
                          fontWeight: '600', 
                          color: '#1A1A1A',
                          margin: 0,
                        }}>
                          {selectedParent?.title}
                        </h3>
                        <button
                          type="button"
                          onClick={() => setSelectedParentCategoryId(null)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            color: '#6B7280',
                            backgroundColor: 'transparent',
                            border: '1px solid #E5E7EB',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F9FAFB';
                            e.currentTarget.style.borderColor = '#D1D5DB';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.borderColor = '#E5E7EB';
                          }}
                        >
                          閉じる
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {subCategories.map((subCategory) => {
                          const isSubSelected = localCategory.includes(subCategory.id);
                          return (
                            <div
                              key={subCategory.id}
                              style={{
                                position: 'relative',
                              }}
                              onMouseEnter={(e) => {
                                if (typeof window === 'undefined') return;
                                setHoveredCategoryId(subCategory.id);
                                const rect = e.currentTarget.getBoundingClientRect();
                                setPopupPosition({
                                  x: rect.left + rect.width / 2,
                                  y: rect.top,
                                });
                              }}
                              onMouseLeave={() => {
                                setHoveredCategoryId(null);
                                setPopupPosition(null);
                              }}
                            >
                              <div
                                style={{
                                  padding: '12px 16px',
                                  border: `1px solid ${isSubSelected ? '#4262FF' : '#E5E7EB'}`,
                                  borderRadius: '6px',
                                  backgroundColor: isSubSelected ? '#F0F4FF' : '#FFFFFF',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                }}
                                onClick={() => handleSubCategoryToggle(subCategory.id)}
                                onMouseEnter={(e) => {
                                  if (!isSubSelected) {
                                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                                    e.currentTarget.style.borderColor = '#D1D5DB';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSubSelected) {
                                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                                    e.currentTarget.style.borderColor = '#E5E7EB';
                                  }
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSubSelected}
                                  onChange={() => handleSubCategoryToggle(subCategory.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    cursor: 'pointer',
                                    width: '16px',
                                    height: '16px',
                                    accentColor: '#4262FF',
                                  }}
                                />
                                <span style={{ 
                                  fontSize: '14px',
                                  fontWeight: isSubSelected ? '500' : '400',
                                  color: isSubSelected ? '#4262FF' : '#374151',
                                }}>
                                  {subCategory.title}
                                </span>
                              </div>
                              {/* ポップアップ */}
                              {hoveredCategoryId === subCategory.id && popupPosition && typeof window !== 'undefined' && (
                                <div
                                  style={{
                                    position: 'fixed',
                                    left: `${popupPosition.x}px`,
                                    top: `${popupPosition.y - 8}px`,
                                    transform: 'translate(-50%, -100%)',
                                    zIndex: 1000,
                                    pointerEvents: 'none',
                                  }}
                                >
                                  <div
                                    style={{
                                      backgroundColor: '#1A1A1A',
                                      color: '#FFFFFF',
                                      padding: '12px 16px',
                                      borderRadius: '8px',
                                      fontSize: '13px',
                                      lineHeight: '1.6',
                                      maxWidth: '320px',
                                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                      fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                                    }}
                                  >
                                    <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
                                      {selectedParent?.title} / {subCategory.title}
                                    </div>
                                    {subCategory.description && (
                                      <div style={{ color: '#E5E7EB', fontSize: '12px', lineHeight: '1.5' }}>
                                        {subCategory.description}
                                      </div>
                                    )}
                                    {!subCategory.description && (
                                      <div style={{ color: '#9CA3AF', fontSize: '12px', fontStyle: 'italic' }}>
                                        説明が設定されていません
                                      </div>
                                    )}
                                  </div>
                                  {/* 矢印 */}
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: '50%',
                                      bottom: '-6px',
                                      transform: 'translateX(-50%)',
                                      width: 0,
                                      height: 0,
                                      borderLeft: '6px solid transparent',
                                      borderRight: '6px solid transparent',
                                      borderTop: '6px solid #1A1A1A',
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                      );
                    })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      padding: '40px 20px', 
                      textAlign: 'center', 
                      color: '#9CA3AF',
                      fontSize: '14px',
                    }}>
                      {selectedParent?.title} にはサブカテゴリーがありません。
                    </div>
                  );
                })()
              ) : (
                <div style={{ 
                  padding: '40px 20px', 
                  textAlign: 'center', 
                  color: '#9CA3AF',
                  fontSize: '14px',
                }}>
                  左側から親カテゴリーを選択してください。
                  </div>
                )}
            </div>
          </div>
        )}
        
        {/* 選択されたカテゴリーをバッジで表示 */}
        {localCategory.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '8px',
              padding: '12px',
              backgroundColor: '#F9FAFB',
              borderRadius: '6px',
              border: '1px solid #E5E7EB',
            }}>
              {localCategory.map((categoryId) => {
                const category = categories.find(c => c.id === categoryId);
                if (!category) return null;
                
                const isParentCategory = !category.parentCategoryId;
                const parentCategory = isParentCategory 
                  ? null 
                  : categories.find(c => c.id === category.parentCategoryId);
                
                return (
                  <div
                    key={categoryId}
                    style={{
                      position: 'relative',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onMouseEnter={(e) => {
                      if (typeof window === 'undefined') return;
                      setHoveredCategoryId(categoryId);
                      const rect = e.currentTarget.getBoundingClientRect();
                      setPopupPosition({
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredCategoryId(null);
                      setPopupPosition(null);
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        backgroundColor: '#4262FF',
                        color: '#FFFFFF',
                        borderRadius: '16px',
                        fontSize: '13px',
                        fontWeight: '500',
                      }}
                    >
                      {isParentCategory ? (
                        <span>{category.title}</span>
                      ) : (
                        <span>
                          {parentCategory?.title} / {category.title}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (isParentCategory) {
                            handleParentCategoryToggle(categoryId);
                          } else {
                            handleSubCategoryToggle(categoryId);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '18px',
                          height: '18px',
                          padding: 0,
                          margin: 0,
                          border: 'none',
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          color: '#FFFFFF',
                          borderRadius: '50%',
                          cursor: 'pointer',
                          fontSize: '12px',
                          lineHeight: 1,
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                      >
                        ×
                      </button>
                    </div>
                    {/* ポップアップ */}
                    {hoveredCategoryId === categoryId && popupPosition && typeof window !== 'undefined' && (
                      <div
                        style={{
                          position: 'fixed',
                          left: `${popupPosition.x}px`,
                          top: `${popupPosition.y - 8}px`,
                          transform: 'translate(-50%, -100%)',
                          zIndex: 1000,
                          pointerEvents: 'none',
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: '#1A1A1A',
                            color: '#FFFFFF',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            lineHeight: '1.6',
                            maxWidth: '320px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          }}
                        >
                          <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
                            {isParentCategory ? (
                              category.title
                            ) : (
                              <>
                                {parentCategory?.title} / {category.title}
                              </>
                            )}
                          </div>
                          {category.description && (
                            <div style={{ color: '#E5E7EB', fontSize: '12px', lineHeight: '1.5' }}>
                              {category.description}
                            </div>
                          )}
                          {!category.description && (
                            <div style={{ color: '#9CA3AF', fontSize: '12px', fontStyle: 'italic' }}>
                              説明が設定されていません
                            </div>
                          )}
                        </div>
                        {/* 矢印 */}
                        <div
                          style={{
                            position: 'absolute',
                            left: '50%',
                            bottom: '-6px',
                            transform: 'translateX(-50%)',
                            width: 0,
                            height: 0,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: '6px solid #1A1A1A',
                          }}
                        />
                      </div>
                    )}
              </div>
            );
          })}
            </div>
            </div>
          )}
      </div>

      {/* ステータス */}
      <div style={{ marginBottom: '28px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: '600', 
          color: '#1A1A1A',
          fontSize: '14px',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          <span style={{ 
            display: 'inline-block',
            width: '24px',
            height: '24px',
            lineHeight: '24px',
            textAlign: 'center',
            backgroundColor: '#4262FF',
            color: '#FFFFFF',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '700',
            marginRight: '8px',
            verticalAlign: 'middle',
          }}>2</span>
          ステータス
        </label>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
        <select
          value={localStatus}
          onChange={(e) => {
            const newValue = e.target.value;
            console.log('🔍 [DetailsTab] status変更:', { oldValue: localStatus, newValue });
            setLocalStatus(newValue);
          }}
          style={{
            width: '100%',
              padding: '10px 40px 10px 14px',
              border: '1.5px solid #E5E7EB',
              borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
              color: localStatus ? '#1A1A1A' : '#9CA3AF',
              fontWeight: localStatus ? '500' : '400',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 14px center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#D1D5DB';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#4262FF';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 98, 255, 0.1)';
              e.currentTarget.style.outline = 'none';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <option value="" disabled style={{ color: '#9CA3AF' }}>選択してください</option>
          {statuses.map((status) => (
              <option key={status.id} value={status.id} style={{ color: '#1A1A1A' }}>
              {status.title}
            </option>
          ))}
        </select>
        </div>
      </div>

      {/* 代理店契約締結月 */}
      <div style={{ marginBottom: '28px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: '600', 
          color: '#1A1A1A',
          fontSize: '14px',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          <span style={{ 
            display: 'inline-block',
            width: '24px',
            height: '24px',
            lineHeight: '24px',
            textAlign: 'center',
            backgroundColor: '#4262FF',
            color: '#FFFFFF',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '700',
            marginRight: '8px',
            verticalAlign: 'middle',
          }}>3</span>
          代理店契約締結月
        </label>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* 年の選択 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '0 0 auto' }}>
            <label style={{ 
              fontSize: '12px', 
              color: '#6B7280', 
              fontWeight: '500',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}>
              年
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={agencyContractYear}
                onChange={(e) => setAgencyContractYear(e.target.value)}
          style={{
                  padding: '10px 40px 10px 14px',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  color: agencyContractYear ? '#1A1A1A' : '#9CA3AF',
                  fontWeight: agencyContractYear ? '500' : '400',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  minWidth: '140px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#4262FF';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 98, 255, 0.1)';
                  e.currentTarget.style.outline = 'none';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="" disabled style={{ color: '#9CA3AF' }}>選択してください</option>
                {Array.from({ length: 30 }, (_, i) => {
                  const year = new Date().getFullYear() - 10 + i;
                  return (
                    <option key={year} value={year.toString()} style={{ color: '#1A1A1A' }}>
                      {year}年
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          
          {/* 月の選択 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '0 0 auto' }}>
            <label style={{ 
              fontSize: '12px', 
              color: '#6B7280', 
              fontWeight: '500',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}>
              月
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={agencyContractMonth}
                onChange={(e) => setAgencyContractMonth(e.target.value)}
                disabled={!agencyContractYear}
                style={{
                  padding: '10px 40px 10px 14px',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: agencyContractYear ? '#FFFFFF' : '#F9FAFB',
                  cursor: agencyContractYear ? 'pointer' : 'not-allowed',
                  color: agencyContractYear ? (agencyContractMonth ? '#1A1A1A' : '#9CA3AF') : '#9CA3AF',
                  fontWeight: agencyContractMonth ? '500' : '400',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  minWidth: '140px',
                  transition: 'all 0.2s ease',
                  opacity: agencyContractYear ? 1 : 0.6,
                }}
                onMouseEnter={(e) => {
                  if (agencyContractYear) {
                    e.currentTarget.style.borderColor = '#D1D5DB';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onFocus={(e) => {
                  if (agencyContractYear) {
                    e.currentTarget.style.borderColor = '#4262FF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 98, 255, 0.1)';
                    e.currentTarget.style.outline = 'none';
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="" disabled style={{ color: '#9CA3AF' }}>選択してください</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const month = (i + 1).toString();
                  return (
                    <option key={month} value={month} style={{ color: '#1A1A1A' }}>
                      {month}月
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          
          {/* クリアボタン */}
          {(agencyContractYear || agencyContractMonth) && (
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
              <button
                type="button"
                onClick={() => {
                  setAgencyContractYear('');
                  setAgencyContractMonth('');
                }}
                style={{
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#6B7280',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                  e.currentTarget.style.borderColor = '#D1D5DB';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.color = '#6B7280';
                }}
              >
                クリア
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ねじ込み注力度 */}
      <div style={{ marginBottom: '28px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: '600', 
          color: '#1A1A1A',
          fontSize: '14px',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          <span style={{ 
            display: 'inline-block',
            width: '24px',
            height: '24px',
            lineHeight: '24px',
            textAlign: 'center',
            backgroundColor: '#4262FF',
            color: '#FFFFFF',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '700',
            marginRight: '8px',
            verticalAlign: 'middle',
          }}>4</span>
          ねじ込み注力度
        </label>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
        <select
          value={localEngagementLevel}
          onChange={(e) => {
            const newValue = e.target.value;
            console.log('🔍 [DetailsTab] engagementLevel変更:', { oldValue: localEngagementLevel, newValue });
            setLocalEngagementLevel(newValue);
          }}
          style={{
            width: '100%',
              padding: '10px 40px 10px 14px',
              border: '1.5px solid #E5E7EB',
              borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
              color: localEngagementLevel ? '#1A1A1A' : '#9CA3AF',
              fontWeight: localEngagementLevel ? '500' : '400',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 14px center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#D1D5DB';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#4262FF';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 98, 255, 0.1)';
              e.currentTarget.style.outline = 'none';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <option value="" disabled style={{ color: '#9CA3AF' }}>選択してください</option>
          {engagementLevels.map((level) => (
              <option key={level.id} value={level.id} style={{ color: '#1A1A1A' }}>
              {level.title}
            </option>
          ))}
        </select>
        </div>
      </div>

      {/* Biz-Devフェーズ */}
      <div style={{ marginBottom: '28px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: '600', 
          color: '#1A1A1A',
          fontSize: '14px',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          <span style={{ 
            display: 'inline-block',
            width: '24px',
            height: '24px',
            lineHeight: '24px',
            textAlign: 'center',
            backgroundColor: '#4262FF',
            color: '#FFFFFF',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '700',
            marginRight: '8px',
            verticalAlign: 'middle',
          }}>5</span>
          Biz-Devフェーズ
        </label>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
        <select
          value={localBizDevPhase}
          onChange={(e) => {
            const newValue = e.target.value;
            console.log('🔍 [DetailsTab] bizDevPhase変更:', { oldValue: localBizDevPhase, newValue });
            setLocalBizDevPhase(newValue);
          }}
          style={{
            width: '100%',
              padding: '10px 40px 10px 14px',
              border: '1.5px solid #E5E7EB',
              borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
              color: localBizDevPhase ? '#1A1A1A' : '#9CA3AF',
              fontWeight: localBizDevPhase ? '500' : '400',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 14px center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#D1D5DB';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.boxShadow = 'none';
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#4262FF';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 98, 255, 0.1)';
              e.currentTarget.style.outline = 'none';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.boxShadow = 'none';
            }}
        >
            <option value="" disabled style={{ color: '#9CA3AF' }}>選択してください</option>
          {bizDevPhases.map((phase) => (
              <option key={phase.id} value={phase.id} style={{ color: '#1A1A1A' }}>
              {phase.title}
            </option>
          ))}
        </select>
        </div>
      </div>

      {/* 関連VC */}
      <div style={{ marginBottom: '28px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: '600', 
          color: '#1A1A1A',
          fontSize: '14px',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          <span style={{ 
            display: 'inline-block',
            width: '24px',
            height: '24px',
            lineHeight: '24px',
            textAlign: 'center',
            backgroundColor: '#4262FF',
            color: '#FFFFFF',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '700',
            marginRight: '8px',
            verticalAlign: 'middle',
          }}>6</span>
          関連VC
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {vcs.length === 0 ? (
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#F9FAFB', 
              borderRadius: '8px', 
              border: '1px solid #E5E7EB',
              color: '#6B7280', 
              fontSize: '14px',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}>
              VCが登録されていません。分析ページの機能3でVCを追加してください。
            </div>
          ) : (
            vcs.map((vc) => {
              const isSelected = localRelatedVCs.includes(vc.id);
              return (
                <button
                  key={vc.id}
                  type="button"
                  onClick={() => handleVCToggle(vc.id)}
                  style={{
                    padding: '10px 18px',
                    border: `1.5px solid ${isSelected ? '#4262FF' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    backgroundColor: isSelected ? '#F0F4FF' : '#FFFFFF',
                    color: isSelected ? '#4262FF' : '#374151',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: isSelected ? '600' : '500',
                    transition: 'all 0.2s ease',
                    fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: isSelected ? '0 1px 3px rgba(66, 98, 255, 0.2)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                    } else {
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(66, 98, 255, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E5E7EB';
                      e.currentTarget.style.boxShadow = 'none';
                    } else {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(66, 98, 255, 0.2)';
                    }
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.borderColor = '#4262FF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 98, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = isSelected ? '0 1px 3px rgba(66, 98, 255, 0.2)' : 'none';
                  }}
                >
                  {isSelected && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      style={{ flexShrink: 0 }}
                >
                      <path
                        d="M13 4L6 11L3 8"
                        stroke="#4262FF"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  <span>{vc.title}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 主管事業部署 */}
      <div style={{ marginBottom: '28px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: '600', 
          color: '#1A1A1A',
          fontSize: '14px',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          <span style={{ 
            display: 'inline-block',
            width: '24px',
            height: '24px',
            lineHeight: '24px',
            textAlign: 'center',
            backgroundColor: '#4262FF',
            color: '#FFFFFF',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '700',
            marginRight: '8px',
            verticalAlign: 'middle',
          }}>7</span>
          主管事業部署
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {departments.length === 0 ? (
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#F9FAFB', 
              borderRadius: '8px', 
              border: '1px solid #E5E7EB',
              color: '#6B7280', 
              fontSize: '14px',
              fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}>
              部署が登録されていません。分析ページの機能3で部署を追加してください。
            </div>
          ) : (
            departments.map((dept) => {
              const isSelected = localResponsibleDepts.includes(dept.id);
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => handleDeptToggle(dept.id)}
                  style={{
                    padding: '10px 18px',
                    border: `1.5px solid ${isSelected ? '#4262FF' : '#E5E7EB'}`,
                    borderRadius: '8px',
                    backgroundColor: isSelected ? '#F0F4FF' : '#FFFFFF',
                    color: isSelected ? '#4262FF' : '#374151',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: isSelected ? '600' : '500',
                    transition: 'all 0.2s ease',
                    fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: isSelected ? '0 1px 3px rgba(66, 98, 255, 0.2)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                    } else {
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(66, 98, 255, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E5E7EB';
                      e.currentTarget.style.boxShadow = 'none';
                    } else {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(66, 98, 255, 0.2)';
                    }
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.borderColor = '#4262FF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 98, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.boxShadow = isSelected ? '0 1px 3px rgba(66, 98, 255, 0.2)' : 'none';
                  }}
                >
                  {isSelected && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      style={{ flexShrink: 0 }}
                >
                      <path
                        d="M13 4L6 11L3 8"
                        stroke="#4262FF"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  <span>{dept.title}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* HP URL */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>
          HP URL
        </label>
        {isEditing || isEditingHpUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '600px' }}>
            <input
              type="url"
              value={localHpUrl}
              onChange={(e) => setLocalHpUrl(e.target.value)}
              placeholder="https://example.com"
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
              }}
              onBlur={() => setIsEditingHpUrl(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditingHpUrl(false);
                }
              }}
              autoFocus
            />
            <button
              onClick={() => setIsEditingHpUrl(false)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                color: '#6B7280',
                backgroundColor: '#F3F4F6',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E5E7EB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
            >
              完了
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '600px' }}>
            {localHpUrl ? (
              <div
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
                    if (isTauri) {
                      // Tauri環境ではTauriコマンドを使用
                      const { callTauriCommand } = await import('@/lib/localFirebase');
                      const result = await callTauriCommand('open_url', { url: localHpUrl });
                      if (!result || !result.success) {
                        console.error('URLを開くエラー:', result?.error || '不明なエラー');
                      }
                    } else {
                      window.open(localHpUrl, '_blank', 'noopener,noreferrer');
                    }
                  } catch (error) {
                    console.error('URLを開くエラー:', error);
                    // フォールバック: window.openを試す
                    try {
                      window.open(localHpUrl, '_blank', 'noopener,noreferrer');
                    } catch (fallbackError) {
                      console.error('フォールバックでもURLを開けませんでした:', fallbackError);
                    }
                  }
                }}
                style={{
                  flex: 1,
                  color: '#4262FF',
                  textDecoration: 'none',
                  fontSize: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                {localHpUrl}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </div>
            ) : (
              <span style={{ flex: 1, color: '#9CA3AF', fontSize: '14px' }}>未設定</span>
            )}
            <button
              onClick={() => setIsEditingHpUrl(true)}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                color: '#9CA3AF',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: 0.6,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.6';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="編集"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Asana URL */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>
          Asana URL
        </label>
        {isEditing || isEditingAsanaUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '600px' }}>
            <input
              type="url"
              value={localAsanaUrl}
              onChange={(e) => setLocalAsanaUrl(e.target.value)}
              placeholder="https://app.asana.com/..."
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
              }}
              onBlur={() => setIsEditingAsanaUrl(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditingAsanaUrl(false);
                }
              }}
              autoFocus
            />
            <button
              onClick={() => setIsEditingAsanaUrl(false)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                color: '#6B7280',
                backgroundColor: '#F3F4F6',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E5E7EB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
            >
              完了
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '600px' }}>
            {localAsanaUrl ? (
              <div
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
                    if (isTauri) {
                      // Tauri環境ではTauriコマンドを使用
                      const { callTauriCommand } = await import('@/lib/localFirebase');
                      const result = await callTauriCommand('open_url', { url: localAsanaUrl });
                      if (!result || !result.success) {
                        console.error('URLを開くエラー:', result?.error || '不明なエラー');
                      }
                    } else {
                      window.open(localAsanaUrl, '_blank', 'noopener,noreferrer');
                    }
                  } catch (error) {
                    console.error('URLを開くエラー:', error);
                    // フォールバック: window.openを試す
                    try {
                      window.open(localAsanaUrl, '_blank', 'noopener,noreferrer');
                    } catch (fallbackError) {
                      console.error('フォールバックでもURLを開けませんでした:', fallbackError);
                    }
                  }
                }}
                style={{
                  flex: 1,
                  color: '#4262FF',
                  textDecoration: 'none',
                  fontSize: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                {localAsanaUrl}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </div>
            ) : (
              <span style={{ flex: 1, color: '#9CA3AF', fontSize: '14px' }}>未設定</span>
            )}
            <button
              onClick={() => setIsEditingAsanaUrl(true)}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                color: '#9CA3AF',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: 0.6,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.6';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="編集"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Box URL */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>
          Box URL
        </label>
        {isEditing || isEditingBoxUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '600px' }}>
            <input
              type="url"
              value={localBoxUrl}
              onChange={(e) => setLocalBoxUrl(e.target.value)}
              placeholder="https://app.box.com/..."
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#FFFFFF',
              }}
              onBlur={() => setIsEditingBoxUrl(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditingBoxUrl(false);
                }
              }}
              autoFocus
            />
            <button
              onClick={() => setIsEditingBoxUrl(false)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                color: '#6B7280',
                backgroundColor: '#F3F4F6',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E5E7EB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
            >
              完了
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '600px' }}>
            {localBoxUrl ? (
              <div
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
                    if (isTauri) {
                      // Tauri環境ではTauriコマンドを使用
                      const { callTauriCommand } = await import('@/lib/localFirebase');
                      const result = await callTauriCommand('open_url', { url: localBoxUrl });
                      if (!result || !result.success) {
                        console.error('URLを開くエラー:', result?.error || '不明なエラー');
                      }
                    } else {
                      window.open(localBoxUrl, '_blank', 'noopener,noreferrer');
                    }
                  } catch (error) {
                    console.error('URLを開くエラー:', error);
                    // フォールバック: window.openを試す
                    try {
                      window.open(localBoxUrl, '_blank', 'noopener,noreferrer');
                    } catch (fallbackError) {
                      console.error('フォールバックでもURLを開けませんでした:', fallbackError);
                    }
                  }
                }}
                style={{
                  flex: 1,
                  color: '#4262FF',
                  textDecoration: 'none',
                  fontSize: '14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.textDecoration = 'none';
                }}
              >
                {localBoxUrl}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </div>
            ) : (
              <span style={{ flex: 1, color: '#9CA3AF', fontSize: '14px' }}>未設定</span>
            )}
            <button
              onClick={() => setIsEditingBoxUrl(true)}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                color: '#9CA3AF',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                opacity: 0.6,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.6';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="編集"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* 詳細コンテンツ */}
      <div style={{ marginTop: '32px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
          詳細コンテンツ
        </label>
        {isEditing ? (
          <div>
            <textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              placeholder="詳細コンテンツをマークダウン形式で入力してください..."
              style={{
                width: '100%',
                minHeight: '500px',
                padding: '12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace',
                resize: 'vertical',
                lineHeight: '1.6',
              }}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280' }}>
              💡 マークダウン形式で記述できます（例: **太字**, *斜体*, `コード`, # 見出し, - リストなど）
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '24px',
              backgroundColor: '#FFFFFF',
              borderRadius: '6px',
              minHeight: '400px',
              border: '1px solid #E5E7EB',
            }}
          >
            {editingContent ? (
              <div
                className="markdown-content"
                style={{
                  fontSize: '15px',
                  lineHeight: '1.8',
                  color: '#374151',
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {editingContent}
                </ReactMarkdown>
              </div>
            ) : (
              <div style={{ color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '40px' }}>
                詳細コンテンツがありません。編集ボタンから追加してください。
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
