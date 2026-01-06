'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Startup, CompetitorComparisonData, Category } from '@/lib/orgApi';
import { getAllStartups, saveStartup } from '@/lib/orgApi/startups';
import { generateUniqueId, getCategories } from '@/lib/orgApi';
import { callGPTAPI } from '@/lib/topicMetadataGeneration';

interface CompetitorComparisonTabProps {
  startup: Startup | null;
  organizationId: string;
  setStartup?: (startup: Startup) => void;
}

interface ComparisonAxis {
  id: string;
  label: string;
  isEditing?: boolean;
  options?: string[]; // ターゲット層セクションの場合、バッジの選択肢
}

interface ComparisonMatrix {
  [startupId: string]: {
    [axisId: string]: number; // 0-5の点数（一般・機能セクション用）
  };
}

type ComparisonSectionType = 'general' | 'function' | 'target';

interface ComparisonSection {
  axes: ComparisonAxis[];
  matrix: {
    [startupId: string]: {
      [axisId: string]: number | string[]; // 点数（0-5）またはバッジの配列
    };
  };
}

interface ComparisonSections {
  general: ComparisonSection;
  function: ComparisonSection;
  target: ComparisonSection;
}

export default function CompetitorComparisonTab({
  startup,
  organizationId,
  setStartup,
}: CompetitorComparisonTabProps) {
  const [allStartups, setAllStartups] = useState<Startup[]>([]);
  const [selectedStartups, setSelectedStartups] = useState<string[]>([]);
  // セクションごとのデータ構造
  const [comparisonSections, setComparisonSections] = useState<ComparisonSections>({
    general: { axes: [], matrix: {} },
    function: { axes: [], matrix: {} },
    target: { axes: [], matrix: {} },
  });
  // 後方互換性のための従来の構造（既存データ用）
  const [comparisonAxes, setComparisonAxes] = useState<ComparisonAxis[]>([]);
  const [comparisonMatrix, setComparisonMatrix] = useState<ComparisonMatrix>({});
  const [isGeneratingAxes, setIsGeneratingAxes] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingAxisId, setEditingAxisId] = useState<string | null>(null);
  const [editingAxisLabel, setEditingAxisLabel] = useState<string>('');
  const [editingSection, setEditingSection] = useState<ComparisonSectionType | null>(null);
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllSection, setDeleteAllSection] = useState<ComparisonSectionType | null>(null);
  const [scoreSelectCell, setScoreSelectCell] = useState<{ section: ComparisonSectionType; startupId: string; axisId: string } | null>(null);
  const [badgeSelectCell, setBadgeSelectCell] = useState<{ section: ComparisonSectionType; startupId: string; axisId: string } | null>(null);
  const [editingAxisOptions, setEditingAxisOptions] = useState<{ section: ComparisonSectionType; axisId: string } | null>(null);
  const [newOptionInput, setNewOptionInput] = useState<string>('');

  // マトリクスのbooleanを数値に変換（後方互換性）
  const convertMatrixToScores = (matrix: any): ComparisonMatrix => {
    const converted: ComparisonMatrix = {};
    Object.keys(matrix).forEach(startupId => {
      converted[startupId] = {};
      Object.keys(matrix[startupId]).forEach(axisId => {
        const value = matrix[startupId][axisId];
        // booleanの場合は1点に変換、数値の場合はそのまま
        converted[startupId][axisId] = typeof value === 'boolean' ? (value ? 1 : 0) : (typeof value === 'number' ? value : 0);
      });
    });
    return converted;
  };

  // 保存された競合比較データを読み込む（startupIdが変更された場合のみ）
  const prevStartupIdRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!startup) return;
    
    // startupIdが変更された場合のみ再読み込み
    if (prevStartupIdRef.current !== startup.id) {
      prevStartupIdRef.current = startup.id;
      
      if ((startup as any).competitorComparison) {
        const saved = (startup as any).competitorComparison;
        console.log('📖 [CompetitorComparisonTab] 保存されたデータを読み込み:', {
          id: saved.id,
          axesCount: saved.axes?.length || 0,
          selectedStartupsCount: saved.selectedStartupIds?.length || 0,
          matrixKeys: Object.keys(saved.matrix || {}),
        });
        setComparisonId(saved.id);
        setSelectedStartups(saved.selectedStartupIds || []);
        
        // 新しいセクション構造がある場合はそれを使用、なければ従来の構造を変換
        if ((saved as any).sections) {
          const sections = (saved as any).sections;
          // マトリクスのbooleanを数値に変換（後方互換性）
          // ターゲット層セクションはバッジ（配列）なので変換しない
          const convertedSections: ComparisonSections = {
            general: {
              axes: sections.general?.axes || [],
              matrix: convertMatrixToScores(sections.general?.matrix || {}),
            },
            function: {
              axes: sections.function?.axes || [],
              matrix: convertMatrixToScores(sections.function?.matrix || {}),
            },
            target: {
              axes: sections.target?.axes || [],
              // ターゲット層セクションのマトリクスはそのまま使用（バッジの配列）
              matrix: sections.target?.matrix || {},
            },
          };
          
          // デバッグ: ターゲット層セクションのマトリクスを確認
          console.log('📖 [CompetitorComparisonTab] ターゲット層セクションのマトリクス:', {
            targetMatrix: convertedSections.target.matrix,
            sampleCell: Object.keys(convertedSections.target.matrix).length > 0 
              ? convertedSections.target.matrix[Object.keys(convertedSections.target.matrix)[0]]
              : null,
          });
          
          setComparisonSections(convertedSections);
        } else {
          // 従来の構造をセクション構造に変換（一般セクションに配置）
          const convertedMatrix = convertMatrixToScores(saved.matrix || {});
          setComparisonSections({
            general: { 
              axes: saved.axes || [], 
              matrix: convertedMatrix
            },
            function: { axes: [], matrix: {} },
            target: { axes: [], matrix: {} },
          });
      // 後方互換性のため従来の構造も保持
      setComparisonAxes(saved.axes || []);
      setComparisonMatrix(convertedMatrix as any);
        }
      } else {
        // データがない場合は初期化
        console.log('📖 [CompetitorComparisonTab] 保存されたデータなし');
        setComparisonId(null);
        setComparisonSections({
          general: { axes: [], matrix: {} },
          function: { axes: [], matrix: {} },
          target: { axes: [], matrix: {} },
        });
        setComparisonAxes([]);
        setSelectedStartups([]);
        setComparisonMatrix({});
      }
    }
  }, [startup?.id]);

  // カテゴリー情報を取得
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('カテゴリーの取得に失敗しました:', error);
      }
    };

    loadCategories();
  }, []);

  // すべてのスタートアップを取得
  useEffect(() => {
    const loadStartups = async () => {
      try {
        setIsLoading(true);
        const startups = await getAllStartups();
        // 現在のスタートアップを除外
        const filtered = startups.filter(s => s.id !== startup?.id);
        setAllStartups(filtered);
      } catch (error) {
        console.error('スタートアップの取得に失敗しました:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (startup) {
      loadStartups();
    }
  }, [startup]);

  // 現在のスタートアップが持つサブカテゴリーIDを取得
  const currentSubCategoryIds = useMemo(() => {
    if (!startup || !startup.categoryIds || startup.categoryIds.length === 0) {
      return new Set<string>();
    }
    
    const subCategoryIds = new Set<string>();
    startup.categoryIds.forEach(categoryId => {
      const category = categories.find(c => c.id === categoryId);
      // サブカテゴリー（parentCategoryIdがある）のみを対象
      if (category && category.parentCategoryId) {
        subCategoryIds.add(categoryId);
      }
    });
    
    return subCategoryIds;
  }, [startup, categories]);

  // 同じサブカテゴリーを持つスタートアップのみをフィルタリング
  const filteredStartups = useMemo(() => {
    if (currentSubCategoryIds.size === 0) {
      // サブカテゴリーが設定されていない場合は空配列を返す
      return [];
    }
    
    return allStartups.filter(s => {
      // カテゴリーが設定されていないスタートアップは除外
      if (!s.categoryIds || s.categoryIds.length === 0) {
        return false;
      }
      
      // 少なくとも1つのサブカテゴリーが一致するスタートアップを返す
      return s.categoryIds.some(categoryId => currentSubCategoryIds.has(categoryId));
    });
  }, [allStartups, currentSubCategoryIds]);

  // サブカテゴリーごとにスタートアップをグループ化
  const startupsBySubCategory = useMemo(() => {
    if (currentSubCategoryIds.size === 0) {
      return new Map<string, { subCategory: Category; parentCategory?: Category; startups: Startup[] }>();
    }

    const grouped = new Map<string, { subCategory: Category; parentCategory?: Category; startups: Startup[] }>();

    // 現在のスタートアップが持つサブカテゴリーのみを処理
    currentSubCategoryIds.forEach(subCategoryId => {
      const subCategory = categories.find(c => c.id === subCategoryId);
      if (!subCategory || !subCategory.parentCategoryId) return;

      const parentCategory = categories.find(c => c.id === subCategory.parentCategoryId);
      
      // このサブカテゴリーを持つスタートアップをフィルタリング
      const startupsInSubCategory = filteredStartups.filter(s => 
        s.categoryIds && s.categoryIds.includes(subCategoryId)
      );
      
      if (startupsInSubCategory.length > 0) {
        grouped.set(subCategoryId, {
          subCategory: subCategory,
          parentCategory: parentCategory,
          startups: startupsInSubCategory,
        });
      }
    });

    return grouped;
  }, [filteredStartups, categories, currentSubCategoryIds]);

  // フィルタリングされたスタートアップから初期選択を設定
  useEffect(() => {
    // 保存されたデータがない場合のみ初期選択
    if (!(startup as any)?.competitorComparison && filteredStartups.length > 0 && selectedStartups.length === 0) {
      setSelectedStartups(filteredStartups.slice(0, Math.min(5, filteredStartups.length)).map(s => s.id));
    }
  }, [filteredStartups, (startup as any)?.competitorComparison]);

  // サブカテゴリーごとに専門的な比較軸をAI生成
  const generateFunctionAxesForSubCategory = async (subCategory: Category, startupInfo?: { title: string; description?: string }): Promise<ComparisonAxis[]> => {
    try {
      // モデルを取得（デフォルトはgpt-4o-mini）
      let model = 'gpt-4o-mini';
      if (typeof window !== 'undefined') {
        const savedModel = localStorage.getItem('aiSelectedModel') || localStorage.getItem('selectedModel');
        if (savedModel) {
          model = savedModel;
        }
      }

      const systemPrompt = `あなたはスタートアップの競合比較分析の専門家です。
サブカテゴリーに基づいて、その分野で重要な比較軸を考えてください。
各比較軸は、そのサブカテゴリーのビジネスにおいて実際に差別化や優劣を判断する上で重要な観点である必要があります。

出力形式:
- 各比較軸は1行で、簡潔で明確な名称を付けてください
- 3-5個の比較軸を生成してください
- 比較軸は、そのサブカテゴリーの専門的な視点から考えてください
- 一般的すぎる比較軸は避け、その分野特有の重要な観点を重視してください

出力は以下の形式で、各行が1つの比較軸名になります:
比較軸1
比較軸2
比較軸3
...`;

      const userPrompt = `以下のサブカテゴリーについて、専門的な比較軸を生成してください。

【サブカテゴリー】
${subCategory.title}
${subCategory.description ? `\n説明: ${subCategory.description}` : ''}

${startupInfo ? `\n【対象スタートアップ】
${startupInfo.title}
${startupInfo.description ? `説明: ${startupInfo.description}` : ''}` : ''}

このサブカテゴリーにおける競合比較で重要な専門的な比較軸を3-5個考えてください。
各比較軸は、この分野のスタートアップを比較する際に実際に使える、具体的で専門的な観点にしてください。`;

      const response = await callGPTAPI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], model);

      // レスポンスをパースして比較軸の配列に変換
      const axes: ComparisonAxis[] = [];
      const lines = response.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      lines.forEach((line, index) => {
        // 番号や記号を除去
        const cleanLabel = line
          .replace(/^[0-9]+[\.\)、]\s*/, '') // 番号を除去
          .replace(/^[-•・]\s*/, '') // 箇条書き記号を除去
          .replace(/^比較軸[0-9]+[:：]\s*/, '') // "比較軸1:"などを除去
          .trim();
        
        if (cleanLabel.length > 0 && cleanLabel.length < 50) { // 適切な長さの比較軸のみ
          axes.push({
            id: `function_axis_${subCategory.id}_${Date.now()}_${index}`,
            label: cleanLabel,
          });
        }
      });

      // パースに失敗した場合や軸が少ない場合は、レスポンス全体を1つの比較軸として扱う
      if (axes.length === 0) {
        const fallbackLabel = response.trim().split('\n')[0].replace(/^[0-9]+[\.\)、]\s*/, '').trim();
        if (fallbackLabel.length > 0) {
          axes.push({
            id: `function_axis_${subCategory.id}_${Date.now()}_0`,
            label: fallbackLabel.substring(0, 50), // 最大50文字
          });
        }
      }

      // 最低3個、最大5個に調整
      if (axes.length === 0) {
        // フォールバック: サブカテゴリー名を使った比較軸
        axes.push({
          id: `function_axis_${subCategory.id}_${Date.now()}_0`,
          label: `${subCategory.title}における技術的優位性`,
        });
        axes.push({
          id: `function_axis_${subCategory.id}_${Date.now()}_1`,
          label: `${subCategory.title}における差別化要因`,
        });
        axes.push({
          id: `function_axis_${subCategory.id}_${Date.now()}_2`,
          label: `${subCategory.title}における実用性・完成度`,
        });
      }

      return axes.slice(0, 5); // 最大5個
    } catch (error) {
      console.error('AI比較軸生成エラー:', error);
      // エラー時はフォールバック
      return [
        { id: `function_axis_${subCategory.id}_${Date.now()}_0`, label: `${subCategory.title}における技術的優位性` },
        { id: `function_axis_${subCategory.id}_${Date.now()}_1`, label: `${subCategory.title}における差別化要因` },
        { id: `function_axis_${subCategory.id}_${Date.now()}_2`, label: `${subCategory.title}における実用性・完成度` },
      ];
    }
  };

  // 比較軸をAIで生成（3つのセクションそれぞれに生成）
  const generateComparisonAxes = async () => {
    setIsGeneratingAxes(true);
    
    try {
      // モデルを取得（デフォルトはgpt-4o-mini）
      let model = 'gpt-4o-mini';
      if (typeof window !== 'undefined') {
        const savedModel = localStorage.getItem('aiSelectedModel') || localStorage.getItem('selectedModel');
        if (savedModel) {
          model = savedModel;
        }
      }

      // 一般セクション：AIで生成（スタートアップ情報を活用）
      const generalSystemPrompt = `あなたはスタートアップの競合比較分析の専門家です。
一般的な比較軸を考えてください。各比較軸は、スタートアップを比較する際に実際に使える、具体的で明確な名称にしてください。`;

      const generalUserPrompt = `以下のスタートアップ情報を参考に、一般的に重要な比較軸を6個考えてください。

${startup ? `【対象スタートアップ】
${startup.title}
${startup.description ? `説明: ${startup.description}` : ''}
${startup.categoryIds && startup.categoryIds.length > 0 ? `\nカテゴリー: ${startup.categoryIds.map(id => {
  const cat = categories.find(c => c.id === id);
  return cat ? cat.title : '';
}).filter(Boolean).join(', ')}` : ''}` : '【スタートアップ情報】\n（情報なし）'}

一般的な比較軸として、以下のような観点を含めて考えてください：
- 技術優位性（技術的な強みや独自性）
- 市場規模（市場の大きさや成長性）
- 資金調達状況（調達額、調達ラウンド、投資家など）
- 主要機能（製品・サービスの主要な機能）
- 機能の独自性（他社との差別化要因）
- 機能の完成度（製品・サービスの完成度や品質）

各比較軸は1行で、簡潔で明確な名称を付けてください。
出力は以下の形式で、各行が1つの比較軸名になります:
比較軸1
比較軸2
比較軸3
...`;

      let generalAxes: ComparisonAxis[] = [];
      let generalResponse = '';
      
      try {
        generalResponse = await callGPTAPI([
          { role: 'system', content: generalSystemPrompt },
          { role: 'user', content: generalUserPrompt }
        ], model);

        const generalLines = generalResponse.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        generalLines.forEach((line, index) => {
          const cleanLabel = line
            .replace(/^[0-9]+[\.\)、]\s*/, '')
            .replace(/^[-•・]\s*/, '')
            .replace(/^比較軸[0-9]+[:：]\s*/, '')
            .trim();
          if (cleanLabel.length > 0 && cleanLabel.length < 50) {
            generalAxes.push({
              id: `general_axis_${Date.now()}_${index}`,
              label: cleanLabel,
            });
          }
        });
      } catch (error) {
        console.error('一般セクションのAI生成エラー:', error);
      }

      // パースに失敗した場合や軸が少ない場合は、再度AI APIを呼び出す
      if (generalAxes.length < 3) {
        try {
          const retryPrompt = `前回の応答が適切に解析できませんでした。以下の形式で、スタートアップの一般的な比較軸を6個、1行に1つずつ出力してください：
技術優位性
市場規模
資金調達状況
主要機能
機能の独自性
機能の完成度

${generalResponse ? `前回の応答: ${generalResponse.substring(0, 200)}` : ''}`;

          const retryResponse = await callGPTAPI([
            { role: 'system', content: generalSystemPrompt },
            { role: 'user', content: retryPrompt }
          ], model);

          const retryLines = retryResponse.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          retryLines.forEach((line, index) => {
            const cleanLabel = line
              .replace(/^[0-9]+[\.\)、]\s*/, '')
              .replace(/^[-•・]\s*/, '')
              .replace(/^比較軸[0-9]+[:：]\s*/, '')
              .trim();
            if (cleanLabel.length > 0 && cleanLabel.length < 50 && generalAxes.length < 6) {
              generalAxes.push({
                id: `general_axis_${Date.now()}_retry_${index}`,
                label: cleanLabel,
              });
            }
          });
        } catch (retryError) {
          console.error('一般セクションの再試行エラー:', retryError);
        }
      }

      // 機能セクション：各サブカテゴリーごとにAIで専門的な比較軸を生成
      const functionAxes: ComparisonAxis[] = [];
      if (currentSubCategoryIds.size > 0) {
        const startupInfo = startup ? {
          title: startup.title,
          description: startup.description,
        } : undefined;

        // 各サブカテゴリーごとに並列でAI生成
        const subCategoryPromises = Array.from(currentSubCategoryIds).map(async (subCategoryId) => {
          const subCategory = categories.find(c => c.id === subCategoryId);
          if (subCategory) {
            return await generateFunctionAxesForSubCategory(subCategory, startupInfo);
          }
          return [];
        });

        const subCategoryAxesArrays = await Promise.all(subCategoryPromises);
        subCategoryAxesArrays.forEach(axes => {
          functionAxes.push(...axes);
        });
      }
      
      // サブカテゴリーがない場合は、AIで一般的な機能比較軸を生成
      if (functionAxes.length === 0) {
        try {
          const functionSystemPrompt = `あなたはスタートアップの競合比較分析の専門家です。
機能に関する専門的な比較軸を考えてください。`;

          const functionUserPrompt = `以下のスタートアップ情報を参考に、機能に関する専門的な比較軸を4-5個考えてください。

${startup ? `【対象スタートアップ】
${startup.title}
${startup.description ? `説明: ${startup.description}` : ''}` : '【スタートアップ情報】\n（情報なし）'}

機能に関する専門的な比較軸として、以下のような観点を含めて考えてください：
- 技術的優位性
- 差別化要因
- 実用性・完成度
- 拡張性・将来性
- 統合性・連携機能

各比較軸は1行で、簡潔で明確な名称を付けてください。
出力は以下の形式で、各行が1つの比較軸名になります:
比較軸1
比較軸2
比較軸3
...`;

          const functionResponse = await callGPTAPI([
            { role: 'system', content: functionSystemPrompt },
            { role: 'user', content: functionUserPrompt }
          ], model);

          const functionLines = functionResponse.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          functionLines.forEach((line, index) => {
            const cleanLabel = line
              .replace(/^[0-9]+[\.\)、]\s*/, '')
              .replace(/^[-•・]\s*/, '')
              .replace(/^比較軸[0-9]+[:：]\s*/, '')
              .trim();
            if (cleanLabel.length > 0 && cleanLabel.length < 50) {
              functionAxes.push({
                id: `function_axis_${Date.now()}_${index}`,
                label: cleanLabel,
              });
            }
          });
        } catch (error) {
          console.error('機能セクションのAI生成エラー:', error);
        }
      }
      
      // ターゲット層セクション：AIで生成（職種、業務内容、産業、企業規模などの観点を含む）
      const targetSystemPrompt = `あなたはスタートアップの競合比較分析の専門家です。
ターゲット層に関する比較軸と、その選択肢（バッジ）を考えてください。
ターゲット層の比較軸には、以下のような観点を含めてください：
- 職種（エンジニア、営業、マーケター、経営者など）
- 業務内容（開発、営業、マーケティング、経営企画など）
- 産業・業界（製造業、IT、金融、小売など）
- 企業規模（大企業、中堅企業、中小企業、スタートアップなど）
- 部署・部門（開発部門、営業部門、経営層など）
- 地域（国内、海外、特定地域など）

各比較軸に対して、選択肢（バッジ）を3-6個考えてください。
出力形式:
比較軸名: 選択肢1, 選択肢2, 選択肢3, ...

例:
職種: ITエンジニア, セキュリティ担当者, 営業担当者, 経営者
産業・業界: 製造業, IT・ソフトウェア, 金融, 小売, 医療`;

      const targetUserPrompt = `以下のスタートアップ情報を参考に、ターゲット層に関する重要な比較軸を4-6個、各比較軸の選択肢も含めて考えてください。

${startup ? `【対象スタートアップ】
${startup.title}
${startup.description ? `説明: ${startup.description}` : ''}
${startup.categoryIds && startup.categoryIds.length > 0 ? `\nカテゴリー: ${startup.categoryIds.map(id => {
  const cat = categories.find(c => c.id === id);
  return cat ? cat.title : '';
}).filter(Boolean).join(', ')}` : ''}` : '【スタートアップ情報】\n（情報なし）'}

ターゲット層の比較軸として、以下のような観点を含めて考えてください：
- 職種（例: ITエンジニア、セキュリティ担当者、営業担当者、マーケター、経営者、経理担当者など）
- 業務内容（例: ソフトウェア開発、営業活動、マーケティング、経営企画、財務管理など）
- 産業・業界（例: 製造業、IT・ソフトウェア、金融、小売、医療、教育など）
- 企業規模（例: 大企業、中堅企業、中小企業、スタートアップ、個人事業主など）
- 部署・部門（例: 開発部門、営業部門、マーケティング部門、経営層、経理部門など）
- 地域（例: 国内、海外、特定地域など）

各比較軸に対して、選択肢（バッジ）を3-6個考えてください。
出力形式:
比較軸名: 選択肢1, 選択肢2, 選択肢3, ...`;

      const targetResponse = await callGPTAPI([
        { role: 'system', content: targetSystemPrompt },
        { role: 'user', content: targetUserPrompt }
      ], model);

      const targetAxes: ComparisonAxis[] = [];
      const targetLines = targetResponse.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      targetLines.forEach((line, index) => {
        // "比較軸名: 選択肢1, 選択肢2, ..." の形式をパース
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const label = line.substring(0, colonIndex)
            .replace(/^[0-9]+[\.\)、]\s*/, '')
            .replace(/^[-•・]\s*/, '')
            .replace(/^比較軸[0-9]+[:：]\s*/, '')
            .trim();
          
          const optionsStr = line.substring(colonIndex + 1).trim();
          const options = optionsStr.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
          
          if (label.length > 0 && label.length < 50 && options.length > 0) {
            targetAxes.push({
              id: `target_axis_${Date.now()}_${index}`,
              label: label,
              options: options,
            });
          }
        } else {
          // コロンがない場合は従来の形式として処理
          const cleanLabel = line
            .replace(/^[0-9]+[\.\)、]\s*/, '')
            .replace(/^[-•・]\s*/, '')
            .replace(/^比較軸[0-9]+[:：]\s*/, '')
            .trim();
          if (cleanLabel.length > 0 && cleanLabel.length < 50) {
            targetAxes.push({
              id: `target_axis_${Date.now()}_${index}`,
              label: cleanLabel,
              options: [], // デフォルトの選択肢なし
            });
          }
        }
      });

      // パースに失敗した場合や軸が少ない場合は、再度AI APIを呼び出す
      if (targetAxes.length < 3) {
        try {
          const retryPrompt = `前回の応答が適切に解析できませんでした。以下の形式で、ターゲット層に関する比較軸を4-6個、各比較軸の選択肢も含めて出力してください：
職種: ITエンジニア, セキュリティ担当者, 営業担当者, 経営者
産業・業界: 製造業, IT・ソフトウェア, 金融, 小売
企業規模: 大企業, 中堅企業, 中小企業, スタートアップ
業務内容: ソフトウェア開発, 営業活動, マーケティング, 経営企画

${targetResponse ? `前回の応答: ${targetResponse.substring(0, 200)}` : ''}`;

          const retryResponse = await callGPTAPI([
            { role: 'system', content: targetSystemPrompt },
            { role: 'user', content: retryPrompt }
          ], model);

          const retryLines = retryResponse.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          retryLines.forEach((line, index) => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
              const label = line.substring(0, colonIndex).trim();
              const optionsStr = line.substring(colonIndex + 1).trim();
              const options = optionsStr.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
              
              if (label.length > 0 && label.length < 50 && options.length > 0 && targetAxes.length < 6) {
                targetAxes.push({
                  id: `target_axis_${Date.now()}_retry_${index}`,
                  label: label,
                  options: options,
                });
              }
            }
          });
        } catch (retryError) {
          console.error('ターゲット層セクションの再試行エラー:', retryError);
        }
      }
      
      // 選択肢がない比較軸にはデフォルトの選択肢を追加
      targetAxes.forEach(axis => {
        if (!axis.options || axis.options.length === 0) {
          // 比較軸名に基づいてデフォルトの選択肢を生成
          const labelLower = axis.label.toLowerCase();
          if (labelLower.includes('職種')) {
            axis.options = ['ITエンジニア', 'セキュリティ担当者', '営業担当者', '経営者'];
          } else if (labelLower.includes('産業') || labelLower.includes('業界')) {
            axis.options = ['製造業', 'IT・ソフトウェア', '金融', '小売', '医療'];
          } else if (labelLower.includes('企業規模') || labelLower.includes('規模')) {
            axis.options = ['大企業', '中堅企業', '中小企業', 'スタートアップ'];
          } else if (labelLower.includes('業務') || labelLower.includes('内容')) {
            axis.options = ['ソフトウェア開発', '営業活動', 'マーケティング', '経営企画'];
          } else {
            axis.options = ['選択肢1', '選択肢2', '選択肢3'];
          }
        }
      });
      
      const newSections: ComparisonSections = {
        general: { axes: generalAxes.slice(0, 6), matrix: {} },
        function: { axes: functionAxes, matrix: {} },
        target: { axes: targetAxes.slice(0, 6), matrix: {} }, // 最大6個まで
      };
      
      setComparisonSections(newSections);
      
      // 比較軸を生成したら自動保存
      console.log('💾 [CompetitorComparisonTab] 比較軸生成後の自動保存開始');
      await autoSaveComparisonDataWithSections(newSections);
      console.log('✅ [CompetitorComparisonTab] 比較軸生成後の自動保存成功');
    } catch (error) {
      console.error('比較軸生成エラー:', error);
      alert(`比較軸の生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsGeneratingAxes(false);
    }
  };

  // セクションごとの比較軸の編集を開始
  const startEditingAxis = (section: ComparisonSectionType, axis: ComparisonAxis) => {
    setEditingSection(section);
    setEditingAxisId(axis.id);
    setEditingAxisLabel(axis.label);
  };

  // セクションごとの比較軸の編集を保存
  const saveEditingAxis = async () => {
    if (editingSection && editingAxisId && editingAxisLabel.trim()) {
      const updatedSections = { ...comparisonSections };
      updatedSections[editingSection].axes = updatedSections[editingSection].axes.map(axis => 
        axis.id === editingAxisId ? { ...axis, label: editingAxisLabel.trim() } : axis
      );
      setComparisonSections(updatedSections);
      setEditingSection(null);
      setEditingAxisId(null);
      setEditingAxisLabel('');
      // 編集後に自動保存
      await autoSaveComparisonDataWithSections(updatedSections);
    }
  };

  // 比較軸の編集をキャンセル
  const cancelEditingAxis = () => {
    setEditingSection(null);
    setEditingAxisId(null);
    setEditingAxisLabel('');
  };

  // セクションごとの比較軸を削除
  const deleteAxis = async (section: ComparisonSectionType, axisId: string) => {
    const updatedSections = { ...comparisonSections };
    updatedSections[section].axes = updatedSections[section].axes.filter(axis => axis.id !== axisId);
    // マトリクスからも削除
    const updatedMatrix = { ...updatedSections[section].matrix };
    Object.keys(updatedMatrix).forEach(startupId => {
      delete updatedMatrix[startupId][axisId];
    });
    updatedSections[section].matrix = updatedMatrix;
    setComparisonSections(updatedSections);
    // 削除後に自動保存
    await autoSaveComparisonDataWithSections(updatedSections);
  };

  // セクションごとのすべての比較軸を一括削除の確認モーダルを表示
  const handleDeleteAllClick = (section: ComparisonSectionType) => {
    if (comparisonSections[section].axes.length === 0) return;
    setDeleteAllSection(section);
    setShowDeleteAllModal(true);
  };

  // セクションごとのすべての比較軸を一括削除
  const deleteAllAxes = async () => {
    if (!deleteAllSection) return;
    const updatedSections = { ...comparisonSections };
    updatedSections[deleteAllSection] = { axes: [], matrix: {} };
    setComparisonSections(updatedSections);
    setShowDeleteAllModal(false);
    setDeleteAllSection(null);
    // 一括削除後に自動保存
    await autoSaveComparisonDataWithSections(updatedSections);
  };

  // セクションごとの新しい比較軸を追加
  const addNewAxis = async (section: ComparisonSectionType) => {
    const newId = `${section}_axis_${Date.now()}`;
    const newAxis: ComparisonAxis = {
      id: newId,
      label: '新しい比較軸',
    };
    const updatedSections = { ...comparisonSections };
    updatedSections[section].axes = [...updatedSections[section].axes, newAxis];
    setComparisonSections(updatedSections);
    setEditingSection(section);
    setEditingAxisId(newId);
    setEditingAxisLabel('新しい比較軸');
    // 追加後に自動保存
    await autoSaveComparisonDataWithSections(updatedSections);
  };

  // 点数ごとの色を取得
  const getScoreColor = (score: number | undefined): { bg: string; text: string; border: string } => {
    if (score === undefined || score === 0) {
      return { bg: '#F3F4F6', text: '#9CA3AF', border: '#E5E7EB' }; // グレーアウト
    } else if (score === 1) {
      return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' }; // 赤系
    } else if (score === 2) {
      return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' }; // オレンジ系
    } else if (score === 3) {
      return { bg: '#FEF9C3', text: '#CA8A04', border: '#FDE047' }; // 黄色系
    } else if (score === 4) {
      return { bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC' }; // 緑系
    } else if (score === 5) {
      return { bg: '#D1FAE5', text: '#059669', border: '#6EE7B7' }; // 濃い緑系
    }
    return { bg: '#F3F4F6', text: '#9CA3AF', border: '#E5E7EB' };
  };

  // セクションごとのマトリクスのセルに点数を設定
  const setMatrixCellScore = async (section: ComparisonSectionType, startupId: string, axisId: string, score: number) => {
    const updatedSections = { ...comparisonSections };
    const updatedMatrix = {
      ...updatedSections[section].matrix,
      [startupId]: {
        ...updatedSections[section].matrix[startupId],
        [axisId]: score,
      },
    };
    updatedSections[section].matrix = updatedMatrix;
    setComparisonSections(updatedSections);
    // マトリクス変更後に自動保存
    await autoSaveComparisonDataWithSections(updatedSections);
  };

  // ターゲット層セクションのマトリクスのセルにバッジを設定
  const setMatrixCellBadges = async (section: ComparisonSectionType, startupId: string, axisId: string, badges: string[]) => {
    const updatedSections = { ...comparisonSections };
    const updatedMatrix = {
      ...updatedSections[section].matrix,
      [startupId]: {
        ...updatedSections[section].matrix[startupId],
        [axisId]: badges,
      },
    };
    updatedSections[section].matrix = updatedMatrix;
    setComparisonSections(updatedSections);
    // マトリクス変更後に自動保存
    await autoSaveComparisonDataWithSections(updatedSections);
  };

  // 比較軸の選択肢を追加
  const addAxisOption = async (section: ComparisonSectionType, axisId: string, option: string) => {
    if (!option.trim()) return;
    const updatedSections = { ...comparisonSections };
    const axis = updatedSections[section].axes.find(a => a.id === axisId);
    if (axis) {
      if (!axis.options) {
        axis.options = [];
      }
      if (!axis.options.includes(option.trim())) {
        axis.options.push(option.trim());
        setComparisonSections(updatedSections);
        await autoSaveComparisonDataWithSections(updatedSections);
      }
    }
  };

  // 比較軸の選択肢を削除
  const removeAxisOption = async (section: ComparisonSectionType, axisId: string, option: string) => {
    const updatedSections = { ...comparisonSections };
    const axis = updatedSections[section].axes.find(a => a.id === axisId);
    if (axis && axis.options) {
      axis.options = axis.options.filter(opt => opt !== option);
      setComparisonSections(updatedSections);
      
      // マトリクスからも削除された選択肢を削除
      Object.keys(updatedSections[section].matrix).forEach(startupId => {
        const cellValue = updatedSections[section].matrix[startupId]?.[axisId];
        if (Array.isArray(cellValue)) {
          updatedSections[section].matrix[startupId][axisId] = cellValue.filter(badge => badge !== option);
        }
      });
      
      await autoSaveComparisonDataWithSections(updatedSections);
    }
  };

  // セクション構造での自動保存用の関数
  const autoSaveComparisonDataWithSections = async (sectionsOverride?: ComparisonSections) => {
    if (!startup) return;

    try {
      const now = new Date().toISOString();
      const sectionsToSave = sectionsOverride ?? comparisonSections;
      
      // 新しいセクション構造で保存
      const comparisonData: any = {
        id: comparisonId || `comp_${generateUniqueId()}`,
        sections: sectionsToSave,
        selectedStartupIds: selectedStartups,
        // 後方互換性のため、一般セクションのデータも従来の形式で保存
        axes: sectionsToSave.general.axes,
        matrix: sectionsToSave.general.matrix,
        createdAt: comparisonId && (startup as any).competitorComparison?.createdAt 
          ? (startup as any).competitorComparison.createdAt 
          : now,
        updatedAt: now,
      };

      const updatedStartup = {
        ...startup,
        competitorComparison: comparisonData,
      };
      
      // データベースに保存（setStartupは呼び出さないことで再読み込みを防ぐ）
      await saveStartup(updatedStartup);

      const newComparisonId = comparisonData.id;
      setComparisonId(newComparisonId);
    } catch (error) {
      console.error('自動保存に失敗しました:', error);
    }
  };

  // 自動保存用の関数（保存中フラグを表示しない、再読み込みを発生させない）
  // 後方互換性のため残す（従来の構造用）
  const autoSaveComparisonData = async (
    axesOverride?: ComparisonAxis[],
    selectedStartupsOverride?: string[],
    matrixOverride?: ComparisonMatrix
  ) => {
    if (!startup) return;

    try {
      const now = new Date().toISOString();
      const comparisonData: any = {
        id: comparisonId || `comp_${generateUniqueId()}`,
        axes: axesOverride ?? comparisonAxes,
        selectedStartupIds: selectedStartupsOverride ?? selectedStartups,
        matrix: matrixOverride ?? comparisonMatrix,
        createdAt: comparisonId && (startup as any).competitorComparison?.createdAt 
          ? (startup as any).competitorComparison.createdAt 
          : now,
        updatedAt: now,
      };

      const updatedStartup = {
        ...startup,
        competitorComparison: comparisonData,
      };
      
      // データベースに保存（setStartupは呼び出さないことで再読み込みを防ぐ）
      await saveStartup(updatedStartup);

      const newComparisonId = comparisonData.id;
      setComparisonId(newComparisonId);
    } catch (error) {
      console.error('自動保存に失敗しました:', error);
    }
  };

  // 競合比較データを保存
  const saveComparisonData = async () => {
    if (!startup) return;

    try {
      setIsSaving(true);
      const now = new Date().toISOString();
      
      // セクション構造で保存
      const comparisonData: any = {
        id: comparisonId || `comp_${generateUniqueId()}`,
        sections: comparisonSections,
        selectedStartupIds: selectedStartups,
        // 後方互換性のため、一般セクションのデータも従来の形式で保存
        axes: comparisonSections.general.axes,
        matrix: comparisonSections.general.matrix,
        createdAt: comparisonId && (startup as any).competitorComparison?.createdAt 
          ? (startup as any).competitorComparison.createdAt 
          : now,
        updatedAt: now,
      };

      const updatedStartup = {
        ...startup,
        competitorComparison: comparisonData,
      };
      
      console.log('💾 [CompetitorComparisonTab] 保存開始:', {
        startupId: startup.id,
        comparisonId: comparisonData.id,
        sections: Object.keys(comparisonData.sections),
        selectedStartupsCount: comparisonData.selectedStartupIds.length,
      });
      
      await saveStartup(updatedStartup);

      console.log('✅ [CompetitorComparisonTab] 保存成功');

      setComparisonId(comparisonData.id);
      
      // 親コンポーネントのstartupを更新
      if (setStartup) {
        setStartup(updatedStartup as Startup);
      }
      
      alert('競合比較データを保存しました');
    } catch (error) {
      console.error('競合比較データの保存に失敗しました:', error);
      alert('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // 選択されたスタートアップのリスト
  const selectedStartupList = useMemo(() => {
    return filteredStartups.filter(s => selectedStartups.includes(s.id));
  }, [filteredStartups, selectedStartups]);

  if (!startup) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>
        <p>スタートアップデータがありません。</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#374151', margin: 0, marginBottom: '4px' }}>
            競合比較
          </h2>
          {comparisonId && (
            <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
              ID: {comparisonId}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {(() => {
            const hasAnyAxes = Object.values(comparisonSections).some(section => section.axes.length > 0);
            return hasAnyAxes && (
              <>
                <button
                  onClick={saveComparisonData}
                  disabled={isSaving}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: isSaving ? '#9CA3AF' : '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSaving) {
                      e.currentTarget.style.backgroundColor = '#059669';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSaving) {
                      e.currentTarget.style.backgroundColor = '#10B981';
                    }
                  }}
                >
                  {isSaving ? '保存中...' : '💾 保存'}
                </button>
              </>
            );
          })()}
          <button
            onClick={generateComparisonAxes}
            disabled={isGeneratingAxes}
            style={{
              padding: '10px 20px',
              backgroundColor: isGeneratingAxes ? '#9CA3AF' : '#4262FF',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isGeneratingAxes ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isGeneratingAxes) {
                e.currentTarget.style.backgroundColor = '#3552D4';
              }
            }}
            onMouseLeave={(e) => {
              if (!isGeneratingAxes) {
                e.currentTarget.style.backgroundColor = '#4262FF';
              }
            }}
          >
            {isGeneratingAxes ? '生成中...' : '比較軸をAI生成'}
          </button>
        </div>
      </div>

      {/* 比較対象の選択 */}
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        borderRadius: '8px', 
        padding: '20px',
        border: '1px solid #E5E7EB',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>
          比較対象の選択
        </h3>
        {!startup.categoryIds || startup.categoryIds.length === 0 ? (
          <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
            このスタートアップにカテゴリーが設定されていないため、比較対象を表示できません。まず、詳細タブでカテゴリーを設定してください。
          </p>
        ) : currentSubCategoryIds.size === 0 ? (
          <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
            このスタートアップにサブカテゴリーが設定されていないため、比較対象を表示できません。サブカテゴリーを設定してください。
          </p>
        ) : startupsBySubCategory.size === 0 ? (
          <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
            同じサブカテゴリーが設定されているスタートアップが見つかりませんでした。
          </p>
        ) : (
          <>
            <p style={{ color: '#6B7280', fontSize: '12px', margin: 0, marginBottom: '16px' }}>
              同じカテゴリーが設定されているスタートアップのみ表示されています（合計 {filteredStartups.length}件）
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {Array.from(startupsBySubCategory.entries()).map(([subCategoryId, { subCategory, parentCategory, startups: subCategoryStartups }]) => (
                <div key={subCategoryId} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    paddingBottom: '8px',
                    borderBottom: '2px solid #E5E7EB',
                    marginBottom: '8px',
                  }}>
                    {parentCategory && (
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#9CA3AF',
                        marginRight: '8px',
                      }}>
                        {parentCategory.title} / 
                      </span>
                    )}
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#4262FF',
                      margin: 0,
                    }}>
                      {subCategory.title}
                    </h4>
                    <span style={{
                      fontSize: '12px',
                      color: '#6B7280',
                      marginLeft: '8px',
                    }}>
                      ({subCategoryStartups.length}件)
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {subCategoryStartups.map(s => (
                      <label
                        key={s.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '8px 16px',
                          backgroundColor: selectedStartups.includes(s.id) ? '#EFF6FF' : '#F9FAFB',
                          border: `1.5px solid ${selectedStartups.includes(s.id) ? '#4262FF' : '#E5E7EB'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: selectedStartups.includes(s.id) ? '#4262FF' : '#374151',
                          fontWeight: selectedStartups.includes(s.id) ? '600' : '400',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStartups.includes(s.id)}
                          onChange={async (e) => {
                            let updatedSelectedStartups: string[];
                            if (e.target.checked) {
                              updatedSelectedStartups = [...selectedStartups, s.id];
                            } else {
                              updatedSelectedStartups = selectedStartups.filter(id => id !== s.id);
                            }
                            setSelectedStartups(updatedSelectedStartups);
                            // 選択変更後に自動保存
                            await autoSaveComparisonData(undefined, updatedSelectedStartups);
                          }}
                          style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        {s.title}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* セクションごとのマトリクステーブル */}
      {selectedStartupList.length > 0 && (() => {
        const sectionConfigs: { type: ComparisonSectionType; label: string }[] = [
          { type: 'general', label: '一般' },
          { type: 'function', label: '機能' },
          { type: 'target', label: 'ターゲット層' },
        ];

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {sectionConfigs.map(({ type, label }) => {
              const section = comparisonSections[type];
              const hasAxes = section.axes.length > 0;
              
              if (!hasAxes) return null;

              return (
                <div key={type} style={{ 
                  backgroundColor: '#FFFFFF', 
                  borderRadius: '8px', 
                  padding: '20px',
                  border: '1px solid #E5E7EB',
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '16px',
                    paddingBottom: '12px',
                    borderBottom: '2px solid #E5E7EB',
                  }}>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: '600', 
                      color: '#374151', 
                      margin: 0 
                    }}>
                      {label}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => addNewAxis(type)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#FFFFFF',
                          color: '#4262FF',
                          border: '1.5px solid #4262FF',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#EFF6FF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                        }}
                      >
                        + 比較軸を追加
                      </button>
                      <button
                        onClick={() => handleDeleteAllClick(type)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#FFFFFF',
                          color: '#EF4444',
                          border: '1.5px solid #EF4444',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FEF2F2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                        }}
                      >
                        🗑️ すべて削除
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                      <thead>
                        <tr>
                          <th style={{ 
                            padding: '12px',
                            textAlign: 'left',
                            borderBottom: '2px solid #E5E7EB',
                            backgroundColor: '#F9FAFB',
                            position: 'sticky',
                            left: 0,
                            zIndex: 10,
                            minWidth: '200px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            比較軸
                          </th>
                          <th style={{ 
                            padding: '12px',
                            textAlign: 'center',
                            borderBottom: '2px solid #E5E7EB',
                            backgroundColor: '#F9FAFB',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#4262FF',
                            minWidth: '150px'
                          }}>
                            {startup.title}
                          </th>
                          {selectedStartupList.map(s => (
                            <th 
                              key={s.id}
                              style={{ 
                                padding: '12px',
                                textAlign: 'center',
                                borderBottom: '2px solid #E5E7EB',
                                backgroundColor: '#F9FAFB',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#374151',
                                minWidth: '150px'
                              }}
                            >
                              {s.title}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.axes.map((axis) => (
                <tr 
                  key={axis.id}
                  style={{ position: 'relative' }}
                  onMouseEnter={(e) => {
                    const buttons = e.currentTarget.querySelectorAll('[data-action-button]');
                    buttons.forEach((btn: any) => {
                      btn.style.opacity = '1';
                      btn.style.visibility = 'visible';
                    });
                  }}
                  onMouseLeave={(e) => {
                    const buttons = e.currentTarget.querySelectorAll('[data-action-button]');
                    buttons.forEach((btn: any) => {
                      if (!(editingSection === type && editingAxisId === axis.id)) {
                        btn.style.opacity = '0';
                        btn.style.visibility = 'hidden';
                      }
                    });
                  }}
                >
                  <td style={{ 
                    padding: '12px',
                    borderBottom: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    position: 'sticky',
                    left: 0,
                    zIndex: 5,
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    {editingSection === type && editingAxisId === axis.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="text"
                          value={editingAxisLabel}
                          onChange={(e) => setEditingAxisLabel(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              saveEditingAxis();
                            } else if (e.key === 'Escape') {
                              cancelEditingAxis();
                            }
                          }}
                          autoFocus
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            border: '1.5px solid #4262FF',
                            borderRadius: '6px',
                            fontSize: '14px',
                            outline: 'none',
                          }}
                        />
                        <button
                          onClick={saveEditingAxis}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#4262FF',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                          title="保存"
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEditingAxis}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#F3F4F6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                          title="キャンセル"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                        <span style={{ flex: 1 }}>{axis.label}</span>
                        <button
                          data-action-button
                          onClick={() => startEditingAxis(type, axis)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: 'transparent',
                            color: '#6B7280',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            opacity: 0,
                            visibility: 'hidden',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F3F4F6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="編集"
                        >
                          ✏️
                        </button>
                        <button
                          data-action-button
                          onClick={() => {
                            if (confirm(`「${axis.label}」を削除しますか？`)) {
                              deleteAxis(type, axis.id);
                            }
                          }}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: 'transparent',
                            color: '#EF4444',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            opacity: 0,
                            visibility: 'hidden',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#FEF2F2';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="削除"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{ 
                    padding: '8px',
                    textAlign: 'center',
                    borderBottom: '1px solid #E5E7EB',
                    position: 'relative',
                  }}>
                    {(() => {
                      // ターゲット層セクションの場合はバッジ形式、それ以外は点数形式
                      if (type === 'target') {
                        const cellValue = section.matrix[startup.id]?.[axis.id];
                        const selectedBadges = Array.isArray(cellValue) 
                          ? (cellValue as string[])
                          : [];
                        const isSelected = badgeSelectCell?.section === type && 
                                          badgeSelectCell?.startupId === startup.id && 
                                          badgeSelectCell?.axisId === axis.id;
                        
                        return (
                          <>
                            <div
                              onClick={() => {
                                setBadgeSelectCell({ section: type, startupId: startup.id, axisId: axis.id });
                              }}
                              style={{
                                minHeight: '40px',
                                padding: '8px',
                                margin: '0 auto',
                                border: `2px solid ${isSelected ? '#4262FF' : '#E5E7EB'}`,
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '4px',
                                justifyContent: selectedBadges.length === 0 ? 'center' : 'flex-start',
                                alignItems: 'center',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#4262FF';
                                e.currentTarget.style.backgroundColor = '#F9FAFB';
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.borderColor = '#E5E7EB';
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              {selectedBadges.length > 0 ? (
                                selectedBadges.map((badge, idx) => (
                                  <span
                                    key={idx}
                                    style={{
                                      padding: '4px 8px',
                                      backgroundColor: '#4262FF',
                                      color: '#FFFFFF',
                                      borderRadius: '12px',
                                      fontSize: '12px',
                                      fontWeight: '500',
                                      display: 'inline-block',
                                    }}
                                  >
                                    {badge}
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>バッジを選択</span>
                              )}
                            </div>
                            
                            {/* バッジ選択モーダル */}
                            {isSelected && axis.options && axis.options.length > 0 && (
                              <div
                                style={{
                                  position: 'fixed',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #E5E7EB',
                                  borderRadius: '16px',
                                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                  zIndex: 10001,
                                  padding: '24px',
                                  minWidth: '500px',
                                  maxWidth: '600px',
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div style={{ marginBottom: '16px' }}>
                                  <h4 style={{
                                    margin: 0,
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    color: '#374151',
                                    marginBottom: '4px',
                                  }}>
                                    バッジを選択
                                  </h4>
                                  <p style={{
                                    margin: 0,
                                    fontSize: '12px',
                                    color: '#6B7280',
                                  }}>
                                    {axis.label} - {startup.title}
                                  </p>
                                </div>
                                
                                <div style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '8px',
                                  marginBottom: '16px',
                                  maxHeight: '300px',
                                  overflowY: 'auto',
                                }}>
                                  {axis.options.map((option) => {
                                    const isSelected = selectedBadges.includes(option);
                                    return (
                                      <button
                                        key={option}
                                        onClick={() => {
                                          const newBadges = isSelected
                                            ? selectedBadges.filter(b => b !== option)
                                            : [...selectedBadges, option];
                                          setMatrixCellBadges(type, startup.id, axis.id, newBadges);
                                        }}
                                        style={{
                                          padding: '8px 16px',
                                          border: `2px solid ${isSelected ? '#4262FF' : '#E5E7EB'}`,
                                          borderRadius: '12px',
                                          backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                                          color: isSelected ? '#4262FF' : '#374151',
                                          fontSize: '14px',
                                          fontWeight: isSelected ? '600' : '500',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                          if (!isSelected) {
                                            e.currentTarget.style.borderColor = '#4262FF';
                                            e.currentTarget.style.backgroundColor = '#F9FAFB';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          if (!isSelected) {
                                            e.currentTarget.style.borderColor = '#E5E7EB';
                                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                                          }
                                        }}
                                      >
                                        {option}
                                        {isSelected && ' ✓'}
                                      </button>
                                    );
                                  })}
                                </div>
                                
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  paddingTop: '16px',
                                  borderTop: '1px solid #E5E7EB',
                                }}>
                                  <button
                                    onClick={() => {
                                      setEditingAxisOptions({ section: type, axisId: axis.id });
                                      setBadgeSelectCell(null);
                                    }}
                                    style={{
                                      padding: '8px 16px',
                                      backgroundColor: '#F3F4F6',
                                      color: '#374151',
                                      border: 'none',
                                      borderRadius: '8px',
                                      fontSize: '14px',
                                      fontWeight: '500',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    選択肢を編集
                                  </button>
                                  <button
                                    onClick={() => setBadgeSelectCell(null)}
                                    style={{
                                      padding: '8px 16px',
                                      backgroundColor: '#F3F4F6',
                                      color: '#374151',
                                      border: 'none',
                                      borderRadius: '8px',
                                      fontSize: '14px',
                                      fontWeight: '500',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    閉じる
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      }
                      
                      // 一般・機能セクションは点数形式
                      const currentStartupScore = section.matrix[startup.id]?.[axis.id];
                      const score = typeof currentStartupScore === 'number' && currentStartupScore !== undefined 
                        ? currentStartupScore 
                        : 5; // デフォルトは5点
                      const colors = getScoreColor(score);
                      const isSelected = scoreSelectCell?.section === type && 
                                        scoreSelectCell?.startupId === startup.id && 
                                        scoreSelectCell?.axisId === axis.id;
                      
                      return (
                        <>
                          <div
                            onClick={() => {
                              setScoreSelectCell({ section: type, startupId: startup.id, axisId: axis.id });
                            }}
                            style={{
                              width: '40px',
                              height: '40px',
                              margin: '0 auto',
                              backgroundColor: colors.bg,
                              border: `2px solid ${isSelected ? '#4262FF' : colors.border}`,
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: colors.text,
                              fontSize: '16px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              opacity: score === 0 ? 0.5 : 1,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.1)';
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            {score !== undefined && score !== null ? score : '-'}
                          </div>
                          
                          {/* 点数選択モーダル */}
                          {isSelected && (
                            <div
                              style={{
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E5E7EB',
                                borderRadius: '16px',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                zIndex: 10001,
                                padding: '24px',
                                minWidth: '400px',
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => {
                                const key = e.key;
                                if (key >= '0' && key <= '5') {
                                  const point = parseInt(key);
                                  setMatrixCellScore(type, startup.id, axis.id, point);
                                  setScoreSelectCell(null);
                                } else if (key === 'Escape') {
                                  setScoreSelectCell(null);
                                }
                              }}
                              tabIndex={0}
                            >
                              <div style={{ marginBottom: '16px' }}>
                                <h4 style={{
                                  margin: 0,
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  color: '#374151',
                                  marginBottom: '4px',
                                }}>
                                  点数を選択
                                </h4>
                                <p style={{
                                  margin: 0,
                                  fontSize: '12px',
                                  color: '#6B7280',
                                }}>
                                  {axis.label} - {startup.title}
                                </p>
                              </div>
                              
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '12px',
                                marginBottom: '16px',
                              }}>
                                {[0, 1, 2, 3, 4, 5].map((point) => {
                                  const pointColors = getScoreColor(point);
                                  const isCurrentScore = score === point;
                                  return (
                                    <button
                                      key={point}
                                      onClick={() => {
                                        setMatrixCellScore(type, startup.id, axis.id, point);
                                        setScoreSelectCell(null);
                                      }}
                                      style={{
                                        padding: '16px',
                                        border: `2px solid ${isCurrentScore ? '#4262FF' : pointColors.border}`,
                                        borderRadius: '12px',
                                        backgroundColor: isCurrentScore ? '#EFF6FF' : pointColors.bg,
                                        color: pointColors.text,
                                        fontSize: '18px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        opacity: point === 0 ? 0.6 : 1,
                                        position: 'relative',
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.boxShadow = 'none';
                                      }}
                                    >
                                      <div style={{
                                        fontSize: '32px',
                                        fontWeight: '700',
                                        lineHeight: 1,
                                      }}>
                                        {point}
                                      </div>
                                      <div style={{
                                        fontSize: '11px',
                                        fontWeight: '500',
                                        opacity: 0.8,
                                      }}>
                                        点
                                      </div>
                                      {isCurrentScore && (
                                        <div style={{
                                          position: 'absolute',
                                          top: '4px',
                                          right: '4px',
                                          width: '20px',
                                          height: '20px',
                                          backgroundColor: '#4262FF',
                                          borderRadius: '50%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: '#FFFFFF',
                                          fontSize: '12px',
                                        }}>
                                          ✓
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                              
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingTop: '16px',
                                borderTop: '1px solid #E5E7EB',
                              }}>
                                <p style={{
                                  margin: 0,
                                  fontSize: '11px',
                                  color: '#9CA3AF',
                                }}>
                                  キーボードの0-5キーでも選択できます
                                </p>
                                <button
                                  onClick={() => setScoreSelectCell(null)}
                                  style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#F3F4F6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s ease',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#E5E7EB';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                                  }}
                                >
                                  キャンセル
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </td>
                  {selectedStartupList.map(s => {
                    // ターゲット層セクションの場合はバッジ形式、それ以外は点数形式
                    if (type === 'target') {
                      const cellValue = section.matrix[s.id]?.[axis.id];
                      const selectedBadges = Array.isArray(cellValue) 
                        ? (cellValue as string[])
                        : [];
                      const isSelected = badgeSelectCell?.section === type && 
                                        badgeSelectCell?.startupId === s.id && 
                                        badgeSelectCell?.axisId === axis.id;
                      
                      return (
                        <td 
                          key={s.id}
                          style={{ 
                            padding: '8px',
                            textAlign: 'center',
                            borderBottom: '1px solid #E5E7EB',
                            position: 'relative',
                          }}
                        >
                          <div
                            onClick={() => {
                              setBadgeSelectCell({ section: type, startupId: s.id, axisId: axis.id });
                            }}
                            style={{
                              minHeight: '40px',
                              padding: '8px',
                              margin: '0 auto',
                              border: `2px solid ${isSelected ? '#4262FF' : '#E5E7EB'}`,
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '4px',
                              justifyContent: selectedBadges.length === 0 ? 'center' : 'flex-start',
                              alignItems: 'center',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#4262FF';
                              e.currentTarget.style.backgroundColor = '#F9FAFB';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.borderColor = '#E5E7EB';
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            {selectedBadges.length > 0 ? (
                              selectedBadges.map((badge, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#4262FF',
                                    color: '#FFFFFF',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    display: 'inline-block',
                                  }}
                                >
                                  {badge}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: '#9CA3AF', fontSize: '12px' }}>バッジを選択</span>
                            )}
                          </div>
                          
                          {/* バッジ選択モーダル */}
                          {isSelected && axis.options && axis.options.length > 0 && (
                            <div
                              style={{
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E5E7EB',
                                borderRadius: '16px',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                zIndex: 10001,
                                padding: '24px',
                                minWidth: '500px',
                                maxWidth: '600px',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div style={{ marginBottom: '16px' }}>
                                <h4 style={{
                                  margin: 0,
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  color: '#374151',
                                  marginBottom: '4px',
                                }}>
                                  バッジを選択
                                </h4>
                                <p style={{
                                  margin: 0,
                                  fontSize: '12px',
                                  color: '#6B7280',
                                }}>
                                  {axis.label} - {s.title}
                                </p>
                              </div>
                              
                              <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '8px',
                                marginBottom: '16px',
                                maxHeight: '300px',
                                overflowY: 'auto',
                              }}>
                                {axis.options.map((option) => {
                                  const isSelectedBadge = selectedBadges.includes(option);
                                  return (
                                    <button
                                      key={option}
                                      onClick={() => {
                                        const newBadges = isSelectedBadge
                                          ? selectedBadges.filter(b => b !== option)
                                          : [...selectedBadges, option];
                                        setMatrixCellBadges(type, s.id, axis.id, newBadges);
                                      }}
                                      style={{
                                        padding: '8px 16px',
                                        border: `2px solid ${isSelectedBadge ? '#4262FF' : '#E5E7EB'}`,
                                        borderRadius: '12px',
                                        backgroundColor: isSelectedBadge ? '#EFF6FF' : '#FFFFFF',
                                        color: isSelectedBadge ? '#4262FF' : '#374151',
                                        fontSize: '14px',
                                        fontWeight: isSelectedBadge ? '600' : '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isSelectedBadge) {
                                          e.currentTarget.style.borderColor = '#4262FF';
                                          e.currentTarget.style.backgroundColor = '#F9FAFB';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isSelectedBadge) {
                                          e.currentTarget.style.borderColor = '#E5E7EB';
                                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                                        }
                                      }}
                                    >
                                      {option}
                                      {isSelectedBadge && ' ✓'}
                                    </button>
                                  );
                                })}
                              </div>
                              
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingTop: '16px',
                                borderTop: '1px solid #E5E7EB',
                              }}>
                                <button
                                  onClick={() => {
                                    setEditingAxisOptions({ section: type, axisId: axis.id });
                                    setBadgeSelectCell(null);
                                  }}
                                  style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#F3F4F6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                  }}
                                >
                                  選択肢を編集
                                </button>
                                <button
                                  onClick={() => setBadgeSelectCell(null)}
                                  style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#F3F4F6',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                  }}
                                >
                                  閉じる
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    }
                    
                    // 一般・機能セクションは点数形式
                    const cellValue = section.matrix[s.id]?.[axis.id];
                    const score = typeof cellValue === 'number' && cellValue !== undefined ? cellValue : undefined;
                    const colors = getScoreColor(score);
                    const isSelected = scoreSelectCell?.section === type && 
                                      scoreSelectCell?.startupId === s.id && 
                                      scoreSelectCell?.axisId === axis.id;
                    
                    return (
                      <td 
                        key={s.id}
                        style={{ 
                          padding: '8px',
                          textAlign: 'center',
                          borderBottom: '1px solid #E5E7EB',
                          position: 'relative',
                        }}
                      >
                        <div
                          onClick={() => {
                            setScoreSelectCell({ section: type, startupId: s.id, axisId: axis.id });
                          }}
                          style={{
                            width: '40px',
                            height: '40px',
                            margin: '0 auto',
                            backgroundColor: colors.bg,
                            border: `2px solid ${isSelected ? '#4262FF' : colors.border}`,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: colors.text,
                            fontSize: '16px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            opacity: score === 0 || score === undefined ? 0.5 : 1,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.1)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {score !== undefined && score !== null ? score : '-'}
                        </div>
                        
                        {/* 点数選択モーダル */}
                        {isSelected && (
                          <div
                            style={{
                              position: 'fixed',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #E5E7EB',
                              borderRadius: '16px',
                              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                              zIndex: 10001,
                              padding: '24px',
                              minWidth: '400px',
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              // キーボードショートカット（0-5の数字キー）
                              const key = e.key;
                              if (key >= '0' && key <= '5') {
                                const point = parseInt(key);
                                setMatrixCellScore(type, s.id, axis.id, point);
                                setScoreSelectCell(null);
                              } else if (key === 'Escape') {
                                setScoreSelectCell(null);
                              }
                            }}
                            tabIndex={0}
                          >
                            <div style={{ marginBottom: '16px' }}>
                              <h4 style={{
                                margin: 0,
                                fontSize: '16px',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '4px',
                              }}>
                                点数を選択
                              </h4>
                              <p style={{
                                margin: 0,
                                fontSize: '12px',
                                color: '#6B7280',
                              }}>
                                {axis.label} - {s.title}
                              </p>
                            </div>
                            
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: '12px',
                              marginBottom: '16px',
                            }}>
                              {[0, 1, 2, 3, 4, 5].map((point) => {
                                const pointColors = getScoreColor(point);
                                const isCurrentScore = score === point;
                                return (
                                  <button
                                    key={point}
                                    onClick={() => {
                                      setMatrixCellScore(type, s.id, axis.id, point);
                                      setScoreSelectCell(null);
                                    }}
                                    style={{
                                      padding: '16px',
                                      border: `2px solid ${isCurrentScore ? '#4262FF' : pointColors.border}`,
                                      borderRadius: '12px',
                                      backgroundColor: isCurrentScore ? '#EFF6FF' : pointColors.bg,
                                      color: pointColors.text,
                                      fontSize: '18px',
                                      fontWeight: '700',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '8px',
                                      opacity: point === 0 ? 0.6 : 1,
                                      position: 'relative',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'scale(1.05)';
                                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'scale(1)';
                                      e.currentTarget.style.boxShadow = 'none';
                                    }}
                                  >
                                    <div style={{
                                      fontSize: '32px',
                                      fontWeight: '700',
                                      lineHeight: 1,
                                    }}>
                                      {point}
                                    </div>
                                    <div style={{
                                      fontSize: '11px',
                                      fontWeight: '500',
                                      opacity: 0.8,
                                    }}>
                                      点
                                    </div>
                                    {isCurrentScore && (
                                      <div style={{
                                        position: 'absolute',
                                        top: '4px',
                                        right: '4px',
                                        width: '20px',
                                        height: '20px',
                                        backgroundColor: '#4262FF',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#FFFFFF',
                                        fontSize: '12px',
                                      }}>
                                        ✓
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              paddingTop: '16px',
                              borderTop: '1px solid #E5E7EB',
                            }}>
                              <p style={{
                                margin: 0,
                                fontSize: '11px',
                                color: '#9CA3AF',
                              }}>
                                キーボードの0-5キーでも選択できます
                              </p>
                              <button
                                onClick={() => setScoreSelectCell(null)}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: '#F3F4F6',
                                  color: '#374151',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  cursor: 'pointer',
                                  transition: 'background-color 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                                }}
                              >
                                キャンセル
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {(() => {
        const hasAnyAxes = Object.values(comparisonSections).some(section => section.axes.length > 0);
        if (!hasAnyAxes) {
          return (
            <div style={{ 
              backgroundColor: '#FFFFFF', 
              borderRadius: '8px', 
              padding: '40px',
              border: '1px solid #E5E7EB',
              textAlign: 'center'
            }}>
              <p style={{ color: '#6B7280', fontSize: '14px', marginBottom: '16px' }}>
                比較軸を生成して、競合比較を開始してください。
              </p>
            </div>
          );
        }
        return null;
      })()}

      {/* 点数選択モーダルを閉じるためのオーバーレイ */}
      {scoreSelectCell && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
          }}
          onClick={() => setScoreSelectCell(null)}
        />
      )}

      {/* バッジ選択モーダルを閉じるためのオーバーレイ */}
      {badgeSelectCell && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
          }}
          onClick={() => setBadgeSelectCell(null)}
        />
      )}

      {/* 選択肢編集モーダル */}
      {editingAxisOptions && (() => {
        const axis = comparisonSections[editingAxisOptions.section].axes.find(a => a.id === editingAxisOptions.axisId);
        if (!axis) return null;
        const options = axis.options || [];
        
        return (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => {
              setEditingAxisOptions(null);
              setNewOptionInput('');
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '16px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                padding: '24px',
                minWidth: '500px',
                maxWidth: '600px',
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{
                margin: 0,
                marginBottom: '16px',
                fontSize: '18px',
                fontWeight: '600',
                color: '#374151',
              }}>
                選択肢を編集: {axis.label}
              </h3>
              
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={newOptionInput}
                    onChange={(e) => setNewOptionInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newOptionInput.trim()) {
                        addAxisOption(editingAxisOptions.section, editingAxisOptions.axisId, newOptionInput.trim());
                        setNewOptionInput('');
                      }
                    }}
                    placeholder="新しい選択肢を入力"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newOptionInput.trim()) {
                        addAxisOption(editingAxisOptions.section, editingAxisOptions.axisId, newOptionInput.trim());
                        setNewOptionInput('');
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#4262FF',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                  >
                    追加
                  </button>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '16px',
              }}>
                {options.map((option, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '8px',
                    }}
                  >
                    <span style={{ fontSize: '14px', color: '#374151' }}>{option}</span>
                    <button
                      onClick={() => removeAxisOption(editingAxisOptions.section, editingAxisOptions.axisId, option)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#FEF2F2',
                        color: '#EF4444',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      削除
                    </button>
                  </div>
                ))}
                {options.length === 0 && (
                  <p style={{ color: '#9CA3AF', fontSize: '14px', textAlign: 'center', margin: '16px 0' }}>
                    選択肢がありません。上記の入力欄から追加してください。
                  </p>
                )}
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
              }}>
                <button
                  onClick={() => {
                    setEditingAxisOptions(null);
                    setNewOptionInput('');
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 一括削除確認モーダル */}
      {showDeleteAllModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteAllModal(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '500px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              margin: 0,
              marginBottom: '16px',
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
            }}>
              すべての比較軸を削除
            </h3>
            <p style={{
              margin: 0,
              marginBottom: '24px',
              fontSize: '14px',
              color: '#6B7280',
              lineHeight: '1.5',
            }}>
              {deleteAllSection && (
                <>
                  {deleteAllSection === 'general' && '一般'}
                  {deleteAllSection === 'function' && '機能'}
                  {deleteAllSection === 'target' && 'ターゲット層'}
                  セクションのすべての比較軸（{comparisonSections[deleteAllSection].axes.length}件）を削除しますか？<br />
                  この操作は取り消せません。
                </>
              )}
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                onClick={() => setShowDeleteAllModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
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
                キャンセル
              </button>
              <button
                onClick={deleteAllAxes}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#DC2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#EF4444';
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

