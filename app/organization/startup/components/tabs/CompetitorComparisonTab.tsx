'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Startup, CompetitorComparisonData, Category } from '@/lib/orgApi';
import { getAllStartups, saveStartup } from '@/lib/orgApi/startups';
import { generateUniqueId, getCategories } from '@/lib/orgApi';
import { callGPTAPI } from '@/lib/topicMetadataGeneration';
import type { 
  ComparisonAxis, 
  ComparisonMatrix, 
  ComparisonSectionType, 
  ComparisonSection, 
  ComparisonSections,
  CompetitorComparisonTabProps 
} from './CompetitorComparisonTab/types';
import { convertMatrixToScores, getScoreColor } from './CompetitorComparisonTab/utils';
import ComparisonTargetSelector from './CompetitorComparisonTab/ComparisonTargetSelector';
import ComparisonMatrixTable from './CompetitorComparisonTab/ComparisonMatrixTable';
import ScoreSelectModal from './CompetitorComparisonTab/ScoreSelectModal';
import BadgeSelectModal from './CompetitorComparisonTab/BadgeSelectModal';
import AxisOptionsEditModal from './CompetitorComparisonTab/AxisOptionsEditModal';
import DeleteAllConfirmModal from './CompetitorComparisonTab/DeleteAllConfirmModal';
import DeleteAxisConfirmModal from './CompetitorComparisonTab/DeleteAxisConfirmModal';
import AIGenerationModal from '../modals/AIGenerationModal';
import { showToast } from '@/components/Toast';

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
  const [showDeleteAxisModal, setShowDeleteAxisModal] = useState(false);
  const [deleteAxisInfo, setDeleteAxisInfo] = useState<{ section: ComparisonSectionType; axisId: string; axisLabel: string } | null>(null);
  const [scoreSelectCell, setScoreSelectCell] = useState<{ section: ComparisonSectionType; startupId: string; axisId: string } | null>(null);
  const [badgeSelectCell, setBadgeSelectCell] = useState<{ section: ComparisonSectionType; startupId: string; axisId: string } | null>(null);
  const [editingAxisOptions, setEditingAxisOptions] = useState<{ section: ComparisonSectionType; axisId: string } | null>(null);
  const [newOptionInput, setNewOptionInput] = useState<string>('');
  // AI生成関連の状態
  const [isAIGenerationModalOpen, setIsAIGenerationModalOpen] = useState(false);
  const [aiGeneratedTarget, setAiGeneratedTarget] = useState<ComparisonSectionType | null>(null);
  const [aiGeneratedContent, setAiGeneratedContent] = useState<string | null>(null);
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  const [aiGenerationInput, setAiGenerationInput] = useState<string>('');
  const [selectedTopicIdsForAI, setSelectedTopicIdsForAI] = useState<string[]>([]);
  const [aiSummaryFormat, setAiSummaryFormat] = useState<'auto' | 'bullet' | 'paragraph' | 'custom'>('auto');
  const [aiSummaryLength, setAiSummaryLength] = useState<number>(1000);
  const [aiCustomPrompt, setAiCustomPrompt] = useState<string>('');
  // エクスポート関連の状態
  const [showExportModal, setShowExportModal] = useState(false);

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
              description: sections.general?.description || '',
            },
            function: {
              axes: sections.function?.axes || [],
              matrix: convertMatrixToScores(sections.function?.matrix || {}),
              description: sections.function?.description || '',
            },
            target: {
              axes: sections.target?.axes || [],
              // ターゲット層セクションのマトリクスはそのまま使用（バッジの配列）
              matrix: sections.target?.matrix || {},
              description: sections.target?.description || '',
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
      
      // 必須の比較軸を追加（既に存在しない場合のみ）
      const requiredAxes: ComparisonAxis[] = [
        {
          id: `target_axis_required_environment_${Date.now()}`,
          label: '利用環境',
          options: ['クラウド', 'オンプレミス', 'ハイブリッド'],
        },
        {
          id: `target_axis_required_cost_${Date.now()}`,
          label: 'コスト',
          options: ['無償', '10万円', '100万円', '1,000万円', '1億円'],
        },
      ];
      
      // 既存の比較軸に同じラベルがないかチェック
      const existingLabels = new Set(targetAxes.map(axis => axis.label));
      requiredAxes.forEach(requiredAxis => {
        if (!existingLabels.has(requiredAxis.label)) {
          targetAxes.unshift(requiredAxis); // 先頭に追加
        }
      });
      
      const newSections: ComparisonSections = {
        general: { axes: generalAxes.slice(0, 6), matrix: {} },
        function: { axes: functionAxes, matrix: {} },
        target: { axes: targetAxes.slice(0, 8), matrix: {} }, // 必須2つ + AI生成分（最大6個）で最大8個まで
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

  // セクションごとの比較軸の削除確認モーダルを表示
  const handleDeleteAxisClick = (section: ComparisonSectionType, axisId: string) => {
    const axis = comparisonSections[section].axes.find(a => a.id === axisId);
    if (axis) {
      setDeleteAxisInfo({ section, axisId, axisLabel: axis.label });
      setShowDeleteAxisModal(true);
    }
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
    // モーダルを閉じる
    setShowDeleteAxisModal(false);
    setDeleteAxisInfo(null);
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
      // ターゲット層の場合はデフォルトの選択肢を設定
      ...(section === 'target' && {
        options: ['選択肢1', '選択肢2', '選択肢3'],
      }),
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

  // セクションの解説文を更新
  const updateSectionDescription = async (section: ComparisonSectionType, description: string) => {
    const updatedSections = { ...comparisonSections };
    updatedSections[section].description = description;
    setComparisonSections(updatedSections);
    // 解説文変更後に自動保存
    await autoSaveComparisonDataWithSections(updatedSections);
  };

  // AI生成モーダルを開く
  const handleOpenAIModal = (sectionType: ComparisonSectionType) => {
    setAiGeneratedTarget(sectionType);
    setAiGenerationInput('');
    setSelectedTopicIdsForAI([]);
    setAiSummaryFormat('auto');
    setAiSummaryLength(1000);
    setAiCustomPrompt('');
    setOriginalContent(comparisonSections[sectionType].description || '');
    setIsAIGenerationModalOpen(true);
  };

  // AI生成結果を元に戻す
  const handleUndo = () => {
    if (aiGeneratedTarget) {
      const updatedSections = { ...comparisonSections };
      updatedSections[aiGeneratedTarget].description = originalContent || '';
      setComparisonSections(updatedSections);
      autoSaveComparisonDataWithSections(updatedSections);
    }
    setAiGeneratedContent(null);
    setAiGeneratedTarget(null);
    setOriginalContent(null);
  };

  // AI生成結果を保持
  const handleKeep = () => {
    setAiGeneratedContent(null);
    setAiGeneratedTarget(null);
    setOriginalContent(null);
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

  // ファイルダウンロードのヘルパー関数
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  // JSON形式でエクスポート
  const exportToJSON = () => {
    if (!startup) {
      alert('スタートアップデータがありません');
      return;
    }
    try {
      const exportData = {
        startup: {
          id: startup.id,
          title: startup.title,
          description: startup.description,
        },
        comparisonId: comparisonId,
        selectedStartups: selectedStartupList.map(s => ({
          id: s.id,
          title: s.title,
          description: s.description,
        })),
        sections: comparisonSections,
        exportedAt: new Date().toISOString(),
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const sanitizedTitle = (startup.title || '競合比較').replace(/[<>:"/\\|?*]/g, '_');
      const filename = `${sanitizedTitle}_競合比較_${new Date().toISOString().split('T')[0]}.json`;
      downloadFile(jsonString, filename, 'application/json');
      setShowExportModal(false);
      showToast('完了しました。', 'success');
    } catch (error) {
      console.error('JSONエクスポートエラー:', error);
      alert('JSON形式でのエクスポートに失敗しました');
    }
  };

  // Markdown形式でエクスポート
  const exportToMarkdown = () => {
    if (!startup) {
      alert('スタートアップデータがありません');
      return;
    }
    try {
      const sectionLabels: Record<ComparisonSectionType, string> = {
        general: '一般',
        function: '機能',
        target: 'ターゲット層',
      };

      let markdown = `# ${startup.title || '競合比較'} - 競合比較レポート\n\n`;
      markdown += `**エクスポート日時**: ${new Date().toLocaleString('ja-JP')}\n\n`;
      
      if (startup.description) {
        markdown += `## 対象スタートアップ\n\n${startup.description}\n\n`;
      }

      if (selectedStartupList.length > 0) {
        markdown += `## 比較対象スタートアップ\n\n`;
        selectedStartupList.forEach((s, idx) => {
          markdown += `${idx + 1}. **${s.title}**${s.description ? `: ${s.description}` : ''}\n`;
        });
        markdown += '\n';
      }

      // 各セクションをエクスポート
      (['general', 'function', 'target'] as ComparisonSectionType[]).forEach(sectionType => {
        const section = comparisonSections[sectionType];
        if (section.axes.length === 0) return;

        markdown += `## ${sectionLabels[sectionType]}セクション\n\n`;

        // セクションの解説があれば追加
        if (section.description) {
          markdown += `${section.description}\n\n`;
        }

        // マトリクステーブルを作成
        if (selectedStartupList.length > 0) {
          markdown += `### 比較マトリクス\n\n`;
          
          // ヘッダー行
          markdown += `| 比較軸 | ${startup.title}`;
          selectedStartupList.forEach(s => {
            markdown += ` | ${s.title}`;
          });
          markdown += ' |\n';
          
          // 区切り行
          markdown += '|';
          for (let i = 0; i <= selectedStartupList.length + 1; i++) {
            markdown += ' --- |';
          }
          markdown += '\n';

          // データ行
          section.axes.forEach(axis => {
            markdown += `| ${axis.label}`;
            
            // 現在のスタートアップ
            const currentValue = section.matrix[startup.id]?.[axis.id];
            if (sectionType === 'target') {
              const badges = Array.isArray(currentValue) ? currentValue : [];
              markdown += ` | ${badges.length > 0 ? badges.join(', ') : '-'}`;
            } else {
              const score = typeof currentValue === 'number' ? currentValue : '-';
              markdown += ` | ${score}`;
            }

            // 選択されたスタートアップ
            selectedStartupList.forEach(s => {
              const value = section.matrix[s.id]?.[axis.id];
              if (sectionType === 'target') {
                const badges = Array.isArray(value) ? value : [];
                markdown += ` | ${badges.length > 0 ? badges.join(', ') : '-'}`;
              } else {
                const score = typeof value === 'number' ? value : '-';
                markdown += ` | ${score}`;
              }
            });
            markdown += ' |\n';
          });
          markdown += '\n';
        }
      });

      const sanitizedTitle = (startup.title || '競合比較').replace(/[<>:"/\\|?*]/g, '_');
      const filename = `${sanitizedTitle}_競合比較_${new Date().toISOString().split('T')[0]}.md`;
      downloadFile(markdown, filename, 'text/markdown;charset=utf-8');
      setShowExportModal(false);
      showToast('完了しました。', 'success');
    } catch (error) {
      console.error('Markdownエクスポートエラー:', error);
      alert('Markdown形式でのエクスポートに失敗しました');
    }
  };

  // HTML形式でエクスポート
  const exportToHTML = () => {
    if (!startup) {
      alert('スタートアップデータがありません');
      return;
    }
    try {
      const sectionLabels: Record<ComparisonSectionType, string> = {
        general: '一般',
        function: '機能',
        target: 'ターゲット層',
      };

      // スコアの色を取得する関数（HTML用）
      const getScoreColorHTML = (score: number | undefined): string => {
        if (score === undefined) return '#9CA3AF';
        if (score >= 4) return '#10B981';
        if (score >= 3) return '#3B82F6';
        if (score >= 2) return '#F59E0B';
        return '#EF4444';
      };

      // バッジの色を取得する関数（HTML用）
      const getBadgeColorHTML = (badgeText: string): string => {
        const colorPalette = [
          '#4262FF', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF',
          '#1E3A8A', '#6366F1', '#4F46E5', '#5B21B6', '#4338CA',
        ];
        let hash = 0;
        for (let i = 0; i < badgeText.length; i++) {
          hash = badgeText.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colorIndex = Math.abs(hash) % colorPalette.length;
        return colorPalette[colorIndex];
      };

      // マークダウンをHTMLに変換する関数（基本的な記法のみ）
      const markdownToHTML = (markdown: string): string => {
        if (!markdown) return '';
        
        let html = markdown;
        
        // コードブロック（```で囲まれた部分）を先に処理
        const codeBlocks: string[] = [];
        html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
          const id = `CODE_BLOCK_${codeBlocks.length}`;
          codeBlocks.push(`<pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`);
          return id;
        });
        
        // インラインコード
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // 見出し（行の先頭のみ）
        html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // リスト（順序なし）
        html = html.replace(/^[\*\-\+]\s+(.*$)/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // リスト（順序あり）
        html = html.replace(/^\d+\.\s+(.*$)/gim, '<li>$1</li>');
        // 順序なしリストと順序ありリストを区別する必要があるが、簡易実装のため省略
        
        // 太字
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
        
        // 斜体（太字の後に処理）
        html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
        html = html.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>');
        
        // 水平線
        html = html.replace(/^---$/gim, '<hr>');
        html = html.replace(/^\*\*\*$/gim, '<hr>');
        
        // 引用
        html = html.replace(/^>\s+(.*$)/gim, '<blockquote>$1</blockquote>');
        
        // リンク
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
        
        // コードブロックを復元
        codeBlocks.forEach((codeBlock, index) => {
          html = html.replace(`CODE_BLOCK_${index}`, codeBlock);
        });
        
        // 段落に分割（空行で区切る）
        const paragraphs = html.split(/\n\s*\n/);
        html = paragraphs.map(p => {
          p = p.trim();
          if (!p) return '';
          // 既にHTMLタグで囲まれている場合はそのまま
          if (p.match(/^<(h[1-6]|ul|ol|pre|blockquote|hr)/)) {
            return p;
          }
          // 改行を<br>に変換
          p = p.replace(/\n/g, '<br>');
          return `<p>${p}</p>`;
        }).filter(p => p).join('\n');
        
        return html;
      };

      let htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${startup.title || '競合比較'} - 競合比較レポート</title>
    <style>
        html {
            scroll-behavior: smooth;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;
            background-color: #F9FAFB;
            color: #374151;
            line-height: 1.6;
            padding: 24px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background-color: #FFFFFF;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            overflow: visible;
        }
        h1 {
            font-size: 28px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
        }
        h2 {
            font-size: 22px;
            font-weight: 600;
            color: #374151;
            margin-top: 32px;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #E5E7EB;
        }
        h3 {
            font-size: 18px;
            font-weight: 600;
            color: #374151;
            margin-top: 24px;
            margin-bottom: 12px;
        }
        .meta-info {
            color: #6B7280;
            font-size: 14px;
            margin-bottom: 24px;
        }
        .startup-info {
            background-color: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
        }
        .startup-list {
            list-style: none;
            padding: 0;
            margin: 16px 0;
        }
        .startup-list li {
            padding: 8px 0;
            border-bottom: 1px solid #E5E7EB;
        }
        .startup-list li:last-child {
            border-bottom: none;
        }
        .section {
            margin-bottom: 40px;
        }
        .section-description {
            background-color: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 20px;
            font-size: 14px;
            line-height: 1.8;
        }
        .section-description h4 {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 12px;
        }
        .comparison-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            background-color: #FFFFFF;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            overflow: hidden;
        }
        .comparison-table thead {
            background-color: #F9FAFB;
        }
        .comparison-table th {
            padding: 12px 16px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #E5E7EB;
            font-size: 14px;
        }
        .comparison-table th:first-child {
            min-width: 200px;
        }
        .comparison-table td {
            padding: 12px 16px;
            border-bottom: 1px solid #E5E7EB;
            font-size: 14px;
        }
        .comparison-table tr:last-child td {
            border-bottom: none;
        }
        .score-cell {
            text-align: center;
            font-weight: 600;
            font-size: 16px;
        }
        .badge-container {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            color: #FFFFFF;
        }
        .empty-cell {
            color: #9CA3AF;
            font-style: italic;
            text-align: center;
        }
        /* タブ機能のスタイル */
        .tabs {
            display: flex;
            border-bottom: 2px solid #E5E7EB;
            margin-bottom: 24px;
        }
        .tab-button {
            padding: 12px 24px;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
            color: #6B7280;
            transition: all 0.2s ease;
            margin-bottom: -2px;
        }
        .tab-button:hover {
            color: #374151;
            background-color: #F9FAFB;
        }
        .tab-button.active {
            color: #4262FF;
            border-bottom-color: #4262FF;
            font-weight: 600;
        }
        .tab-content {
            display: none;
            overflow: visible;
        }
        .tab-content.active {
            display: block;
            overflow: visible;
        }
        /* マークダウンコンテンツのスタイル */
        .markdown-content {
            color: #374151;
            line-height: 1.8;
            font-size: 15px;
        }
        .markdown-content > *:first-child {
            margin-top: 0 !important;
        }
        .markdown-content h1 {
            font-size: 20px;
            font-weight: 700;
            margin-top: 24px;
            margin-bottom: 16px;
            color: #1F2937;
            border-bottom: 2px solid #E5E7EB;
            padding-bottom: 8px;
        }
        .markdown-content h1:first-child {
            margin-top: 0;
        }
        .markdown-content h2 {
            font-size: 18px;
            font-weight: 600;
            margin-top: 20px;
            margin-bottom: 12px;
            color: #2563EB;
            border-bottom: 1px solid #E5E7EB;
            padding-bottom: 8px;
        }
        .markdown-content h2:first-child {
            margin-top: 0;
        }
        .markdown-content h3 {
            font-size: 16px;
            font-weight: 600;
            margin-top: 16px;
            margin-bottom: 10px;
            color: #1F2937;
        }
        .markdown-content h4 {
            font-size: 14px;
            font-weight: 600;
            margin-top: 14px;
            margin-bottom: 8px;
            color: #1F2937;
        }
        .markdown-content p {
            margin-bottom: 12px;
            color: #374151;
        }
        .markdown-content ul {
            margin-bottom: 12px;
            padding-left: 32px;
            list-style-type: disc;
        }
        .markdown-content ol {
            margin-bottom: 12px;
            padding-left: 32px;
        }
        .markdown-content li {
            margin-bottom: 6px;
        }
        .markdown-content code {
            background-color: #F3F4F6;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.9em;
            font-family: monospace;
            color: #DC2626;
        }
        .markdown-content pre {
            background-color: #F9FAFB;
            padding: 16px;
            border-radius: 6px;
            overflow: auto;
            margin-bottom: 12px;
            border: 1px solid #E5E7EB;
        }
        .markdown-content pre code {
            background-color: transparent;
            padding: 0;
            font-family: monospace;
            font-size: 14px;
            color: #374151;
        }
        .markdown-content blockquote {
            border-left: 4px solid #3B82F6;
            padding-left: 16px;
            margin-left: 0;
            margin-right: 0;
            margin-bottom: 12px;
            color: #6B7280;
            font-style: italic;
        }
        .markdown-content table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            border: 1px solid #E5E7EB;
        }
        .markdown-content th {
            padding: 8px 12px;
            background-color: #F9FAFB;
            border: 1px solid #E5E7EB;
            font-weight: 600;
            text-align: left;
        }
        .markdown-content td {
            padding: 8px 12px;
            border: 1px solid #E5E7EB;
            text-align: left;
        }
        .markdown-content a {
            color: #3B82F6;
            text-decoration: underline;
        }
        .markdown-content strong {
            font-weight: 600;
            color: #1F2937;
        }
        .markdown-content hr {
            border: none;
            border-top: 1px solid #E5E7EB;
            margin: 24px 0;
        }
        /* ナビゲーション用スタイル */
        .nav-sidebar-outer {
            position: fixed;
            left: calc((100% - 1400px) / 2);
            top: 230px;
            width: 280px;
            z-index: 100;
        }
        @media (max-width: 1448px) {
            .nav-sidebar-outer {
                left: 24px;
            }
        }
        .nav-sidebar {
            background-color: #FFFFFF;
            border: 1px solid #E5E7EB;
            border-radius: 12px;
            padding: 20px;
            max-height: calc(100vh - 250px);
            overflow-y: auto;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .nav-sidebar h3 {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
            margin-top: 0;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 2px solid #E5E7EB;
        }
        .nav-links {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .nav-links li {
            margin-bottom: 4px;
        }
        .nav-links a {
            display: block;
            padding: 10px 14px;
            color: #374151;
            text-decoration: none;
            border-radius: 8px;
            transition: all 0.2s ease;
            font-size: 14px;
            line-height: 1.5;
        }
        .nav-links a:hover {
            background-color: #F3F4F6;
            color: #4262FF;
        }
        .nav-links a:active {
            background-color: #EFF6FF;
            color: #2563EB;
        }
        .startup-section {
            margin-bottom: 40px;
            padding-bottom: 24px;
            border-bottom: 2px solid #E5E7EB;
        }
        .startup-section:last-child {
            border-bottom: none;
        }
        .startup-section h2 {
            scroll-margin-top: 20px;
        }
        .content-with-nav {
            margin-left: 304px;
            position: relative;
            padding-right: 24px;
        }
        .content-column {
            width: 100%;
            max-width: calc(1400px - 304px - 24px);
        }
        @media (max-width: 1448px) {
            .content-with-nav {
                margin-left: 304px;
            }
        }
        @media (max-width: 1200px) {
            .nav-sidebar-outer {
                display: none;
            }
            .content-with-nav {
                margin-left: 0;
            }
        }
        @media print {
            body {
                padding: 0;
            }
            .container {
                box-shadow: none;
            }
            .tabs {
                display: none;
            }
            .tab-content {
                display: block !important;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${startup.title || '競合比較'} - 競合比較レポート</h1>
        <div class="meta-info">
            <strong>エクスポート日時:</strong> ${new Date().toLocaleString('ja-JP')}
        </div>
        
        <!-- タブ -->
        <div class="tabs">
            <button class="tab-button active" onclick="showTab('startup-info')">対象スタートアップの紹介</button>
            <button class="tab-button" onclick="showTab('comparison')">競合比較</button>
        </div>
        
        <!-- 対象スタートアップの紹介タブ -->
        <div id="startup-info" class="tab-content active">
            <!-- ナビゲーション（コンテナの外に配置） -->
            <div class="nav-sidebar-outer">
                <div class="nav-sidebar">
                    <h3>ナビゲーション</h3>
                    <ul class="nav-links">
                        <li><a href="#startup-${startup.id}">${startup.title || '対象スタートアップ'}</a></li>`;
      
      // 比較対象スタートアップのナビゲーションリンクを追加
      selectedStartupList.forEach((s) => {
        const sanitizedId = s.id.replace(/[^a-zA-Z0-9]/g, '_');
        htmlContent += `
                        <li><a href="#startup-${sanitizedId}">${s.title}</a></li>`;
      });
      
      htmlContent += `
                    </ul>
                </div>
            </div>
            
            <!-- コンテンツ -->
            <div class="content-with-nav">
                <div class="content-column">
                    <!-- 対象スタートアップ -->
                    <div id="startup-${startup.id}" class="startup-section">
                        <h2>${startup.title || '対象スタートアップ'}</h2>
                        ${startup.description ? `
                        <div class="markdown-content">
                            ${markdownToHTML(startup.description)}
                        </div>` : '<p>説明がありません。</p>'}
                    </div>`;
      
      // 比較対象スタートアップの概要を追加
      selectedStartupList.forEach((s) => {
        const sanitizedId = s.id.replace(/[^a-zA-Z0-9]/g, '_');
        htmlContent += `
                    
                    <!-- ${s.title} -->
                    <div id="startup-${sanitizedId}" class="startup-section">
                        <h2>${s.title}</h2>
                        ${s.description ? `
                        <div class="markdown-content">
                            ${markdownToHTML(s.description)}
                        </div>` : '<p>説明がありません。</p>'}
                    </div>`;
      });
      
      htmlContent += `
                </div>
            </div>
        </div>
        
        <!-- 競合比較タブ -->
        <div id="comparison" class="tab-content">`;

      // 全セクションをエクスポート（一般、機能、ターゲット層）
      (['general', 'function', 'target'] as ComparisonSectionType[]).forEach(sectionType => {
        const section = comparisonSections[sectionType];
        if (section.axes.length === 0) return;

        htmlContent += `
        <div class="section">
            <h2>${sectionLabels[sectionType]}セクション</h2>`;

        // マトリクステーブル（先に表示）
        if (selectedStartupList.length > 0) {
          htmlContent += `
            <h3>比較マトリクス</h3>
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>比較軸</th>
                        <th>${startup.title}</th>`;
          selectedStartupList.forEach(s => {
            htmlContent += `
                        <th>${s.title}</th>`;
          });
          htmlContent += `
                    </tr>
                </thead>
                <tbody>`;

          section.axes.forEach(axis => {
            htmlContent += `
                    <tr>
                        <td><strong>${axis.label}</strong></td>`;

            // 現在のスタートアップ
            const currentValue = section.matrix[startup.id]?.[axis.id];
            if (sectionType === 'target') {
              const badges = Array.isArray(currentValue) ? currentValue : [];
              if (badges.length > 0) {
                htmlContent += `
                        <td>
                            <div class="badge-container">`;
                badges.forEach(badge => {
                  const badgeColor = getBadgeColorHTML(badge);
                  htmlContent += `
                                <span class="badge" style="background-color: ${badgeColor};">${badge}</span>`;
                });
                htmlContent += `
                            </div>
                        </td>`;
              } else {
                htmlContent += `
                        <td class="empty-cell">-</td>`;
              }
            } else {
              const score = typeof currentValue === 'number' ? currentValue : undefined;
              if (score !== undefined) {
                const scoreColor = getScoreColorHTML(score);
                htmlContent += `
                        <td class="score-cell" style="color: ${scoreColor};">${score}</td>`;
              } else {
                htmlContent += `
                        <td class="empty-cell">-</td>`;
              }
            }

            // 選択されたスタートアップ
            selectedStartupList.forEach(s => {
              const value = section.matrix[s.id]?.[axis.id];
              if (sectionType === 'target') {
                const badges = Array.isArray(value) ? value : [];
                if (badges.length > 0) {
                  htmlContent += `
                        <td>
                            <div class="badge-container">`;
                  badges.forEach(badge => {
                    const badgeColor = getBadgeColorHTML(badge);
                    htmlContent += `
                                <span class="badge" style="background-color: ${badgeColor};">${badge}</span>`;
                  });
                  htmlContent += `
                            </div>
                        </td>`;
                } else {
                  htmlContent += `
                        <td class="empty-cell">-</td>`;
                }
              } else {
                const score = typeof value === 'number' ? value : undefined;
                if (score !== undefined) {
                  const scoreColor = getScoreColorHTML(score);
                  htmlContent += `
                        <td class="score-cell" style="color: ${scoreColor};">${score}</td>`;
                } else {
                  htmlContent += `
                        <td class="empty-cell">-</td>`;
                }
              }
            });

            htmlContent += `
                    </tr>`;
          });

          htmlContent += `
                </tbody>
            </table>`;
        }

        // セクションの解説（後で表示）
        if (section.description) {
          htmlContent += `
            <div class="section-description" style="margin-top: 24px;">
                <h4>${sectionLabels[sectionType]}セクションの解説</h4>
                <div class="markdown-content">${markdownToHTML(section.description)}</div>
            </div>`;
        }

        htmlContent += `
        </div>`;
      });

      htmlContent += `
        </div>
    </div>
    
    <script>
        function showTab(tabName) {
            // すべてのタブコンテンツを非表示
            const contents = document.querySelectorAll('.tab-content');
            contents.forEach(content => {
                content.classList.remove('active');
            });
            
            // すべてのタブボタンからactiveクラスを削除
            const buttons = document.querySelectorAll('.tab-button');
            buttons.forEach(button => {
                button.classList.remove('active');
            });
            
            // 選択されたタブを表示
            document.getElementById(tabName).classList.add('active');
            
            // クリックされたボタンにactiveクラスを追加
            event.target.classList.add('active');
        }
    </script>
</body>
</html>`;

      const sanitizedTitle = (startup.title || '競合比較').replace(/[<>:"/\\|?*]/g, '_');
      const filename = `${sanitizedTitle}_競合比較_${new Date().toISOString().split('T')[0]}.html`;
      downloadFile(htmlContent, filename, 'text/html;charset=utf-8');
      setShowExportModal(false);
      showToast('完了しました。', 'success');
    } catch (error) {
      console.error('HTMLエクスポートエラー:', error);
      alert('HTML形式でのエクスポートに失敗しました');
    }
  };

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
          <button
            onClick={() => setShowExportModal(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6B7280',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4B5563';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6B7280';
            }}
          >
            📥 エクスポート
          </button>
        </div>
      </div>

      {/* 比較対象の選択 */}
      {currentSubCategoryIds.size === 0 ? (
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
          <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
            このスタートアップにサブカテゴリーが設定されていないため、比較対象を表示できません。サブカテゴリーを設定してください。
          </p>
        </div>
      ) : (
        <ComparisonTargetSelector
          startup={startup}
          startupsBySubCategory={startupsBySubCategory}
          filteredStartups={filteredStartups}
          selectedStartups={selectedStartups}
          onSelectionChange={async (updatedSelectedStartups) => {
            setSelectedStartups(updatedSelectedStartups);
            await autoSaveComparisonData(undefined, updatedSelectedStartups);
          }}
        />
      )}

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
              
              return (
                <ComparisonMatrixTable
                  key={type}
                  section={section}
                  sectionType={type}
                  sectionLabel={label}
                  currentStartup={startup}
                  selectedStartups={selectedStartupList}
                  editingSection={editingSection}
                  editingAxisId={editingAxisId}
                  editingAxisLabel={editingAxisLabel}
                  onEditLabel={setEditingAxisLabel}
                  onSaveEdit={saveEditingAxis}
                  onCancelEdit={cancelEditingAxis}
                  onStartEdit={(axis) => startEditingAxis(type, axis)}
                  onDelete={(axisId) => handleDeleteAxisClick(type, axisId)}
                  onAddAxis={() => addNewAxis(type)}
                  onDeleteAll={() => handleDeleteAllClick(type)}
                  scoreSelectCell={scoreSelectCell}
                  badgeSelectCell={badgeSelectCell}
                  onScoreCellClick={(startupId, axisId) => {
                    setScoreSelectCell({ section: type, startupId, axisId });
                  }}
                  onBadgeCellClick={(startupId, axisId) => {
                    setBadgeSelectCell({ section: type, startupId, axisId });
                  }}
                  onDescriptionChange={(description) => updateSectionDescription(type, description)}
                  onOpenAIModal={handleOpenAIModal}
                  isAIGenerationModalOpen={isAIGenerationModalOpen}
                  aiGeneratedTarget={aiGeneratedTarget}
                  aiGeneratedContent={aiGeneratedContent}
                  originalContent={originalContent}
                  onUndo={handleUndo}
                  onKeep={handleKeep}
                />
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

      {/* モーダル */}
      {scoreSelectCell && (() => {
        const section = comparisonSections[scoreSelectCell.section];
        const axis = section.axes.find(a => a.id === scoreSelectCell.axisId);
        const targetStartup = scoreSelectCell.startupId === startup.id 
          ? startup 
          : selectedStartupList.find(s => s.id === scoreSelectCell.startupId);
        if (!axis || !targetStartup) return null;
        
        const cellValue = section.matrix[targetStartup.id]?.[axis.id];
        const score = typeof cellValue === 'number' && cellValue !== undefined ? cellValue : undefined;
        
        return (
          <ScoreSelectModal
            isOpen={true}
            section={scoreSelectCell.section}
            startup={targetStartup}
            axis={axis}
            currentScore={score}
            onSelect={(newScore) => setMatrixCellScore(scoreSelectCell.section, targetStartup.id, axis.id, newScore)}
            onClose={() => setScoreSelectCell(null)}
          />
        );
      })()}

      {badgeSelectCell && (() => {
        const section = comparisonSections[badgeSelectCell.section];
        const axis = section.axes.find(a => a.id === badgeSelectCell.axisId);
        const targetStartup = badgeSelectCell.startupId === startup.id 
          ? startup 
          : selectedStartupList.find(s => s.id === badgeSelectCell.startupId);
        if (!axis || !targetStartup) return null;
        
        const cellValue = section.matrix[targetStartup.id]?.[axis.id];
        const selectedBadges = Array.isArray(cellValue) ? (cellValue as string[]) : [];
        
        return (
          <BadgeSelectModal
            isOpen={true}
            section={badgeSelectCell.section}
            startup={targetStartup}
            axis={axis}
            selectedBadges={selectedBadges}
            onSelect={(newBadges) => setMatrixCellBadges(badgeSelectCell.section, targetStartup.id, axis.id, newBadges)}
            onClose={() => setBadgeSelectCell(null)}
            onEditOptions={() => {
              setEditingAxisOptions({ section: badgeSelectCell.section, axisId: axis.id });
              setBadgeSelectCell(null);
            }}
          />
        );
      })()}

      {editingAxisOptions && (() => {
        const axis = comparisonSections[editingAxisOptions.section].axes.find(a => a.id === editingAxisOptions.axisId);
        if (!axis) return null;
        
        return (
          <AxisOptionsEditModal
            isOpen={true}
            section={editingAxisOptions.section}
            axis={axis}
            onAddOption={(option) => addAxisOption(editingAxisOptions.section, editingAxisOptions.axisId, option)}
            onRemoveOption={(option) => removeAxisOption(editingAxisOptions.section, editingAxisOptions.axisId, option)}
            onClose={() => {
              setEditingAxisOptions(null);
              setNewOptionInput('');
            }}
          />
        );
      })()}

      {showDeleteAllModal && deleteAllSection && (
        <DeleteAllConfirmModal
          isOpen={true}
          section={deleteAllSection}
          axesCount={comparisonSections[deleteAllSection].axes.length}
          onConfirm={deleteAllAxes}
          onCancel={() => {
            setShowDeleteAllModal(false);
            setDeleteAllSection(null);
          }}
        />
      )}

      {showDeleteAxisModal && deleteAxisInfo && (
        <DeleteAxisConfirmModal
          isOpen={true}
          axisLabel={deleteAxisInfo.axisLabel}
          onConfirm={() => {
            deleteAxis(deleteAxisInfo.section, deleteAxisInfo.axisId);
          }}
          onCancel={() => {
            setShowDeleteAxisModal(false);
            setDeleteAxisInfo(null);
          }}
        />
      )}

      {/* エクスポートモーダル */}
      {showExportModal && (
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
              setShowExportModal(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                エクスポート形式を選択
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#6B7280',
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={exportToJSON}
                style={{
                  padding: '16px',
                  backgroundColor: '#F9FAFB',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                  e.currentTarget.style.borderColor = '#D1D5DB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                }}
              >
                <span style={{ fontSize: '20px' }}>📄</span>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>JSON形式</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    データを完全に保存・インポート可能な形式
                  </div>
                </div>
              </button>
              
              <button
                onClick={exportToMarkdown}
                style={{
                  padding: '16px',
                  backgroundColor: '#F9FAFB',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                  e.currentTarget.style.borderColor = '#D1D5DB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                }}
              >
                <span style={{ fontSize: '20px' }}>📝</span>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>Markdown形式</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    テキストエディタで編集可能な形式
                  </div>
                </div>
              </button>
              
              <button
                onClick={exportToHTML}
                style={{
                  padding: '16px',
                  backgroundColor: '#F9FAFB',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                  e.currentTarget.style.borderColor = '#D1D5DB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                }}
              >
                <span style={{ fontSize: '20px' }}>🌐</span>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>HTML形式</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    ブラウザで表示可能な形式（デザイン保持）
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI生成モーダル */}
      <AIGenerationModal
        isOpen={isAIGenerationModalOpen}
        onClose={() => {
          setIsAIGenerationModalOpen(false);
          setAiGeneratedTarget(null);
          setAiGeneratedContent(null);
          setOriginalContent(null);
        }}
        target={aiGeneratedTarget ? 'description' : null}
        topics={[]}
        localTopicIds={[]}
        selectedTopicIdsForAI={selectedTopicIdsForAI}
        setSelectedTopicIdsForAI={setSelectedTopicIdsForAI}
        aiGenerationInput={aiGenerationInput}
        setAIGenerationInput={setAiGenerationInput}
        aiSummaryFormat={aiSummaryFormat}
        setAiSummaryFormat={setAiSummaryFormat}
        aiSummaryLength={aiSummaryLength}
        setAiSummaryLength={setAiSummaryLength}
        aiCustomPrompt={aiCustomPrompt}
        setAiCustomPrompt={setAiCustomPrompt}
        aiGeneratedContent={aiGeneratedContent}
        originalContent={originalContent}
        setAiGeneratedContent={setAiGeneratedContent}
        setAiGeneratedTarget={(target) => {
          // targetがnullの場合はaiGeneratedTargetもnullに
          if (target === null) {
            setAiGeneratedTarget(null);
          }
        }}
        setOriginalContent={setOriginalContent}
        localDescription={aiGeneratedTarget ? (comparisonSections[aiGeneratedTarget].description || '') : ''}
        localObjective={''}
        localEvaluation={''}
        setLocalDescription={async (description: string) => {
          if (aiGeneratedTarget) {
            await updateSectionDescription(aiGeneratedTarget, description);
          }
        }}
        setLocalObjective={() => {}}
        setLocalEvaluation={() => {}}
        setIsEditingDescription={() => {}}
        setIsEditingObjective={() => {}}
        setIsEditingEvaluation={() => {}}
        startup={startup}
        categories={categories}
        vcs={[]}
        departments={[]}
        statuses={[]}
        engagementLevels={[]}
        bizDevPhases={[]}
        comparisonSectionType={aiGeneratedTarget || null}
        comparisonSectionLabel={aiGeneratedTarget ? (aiGeneratedTarget === 'general' ? '一般' : aiGeneratedTarget === 'function' ? '機能' : 'ターゲット層') : undefined}
      />
    </div>
  );
}
