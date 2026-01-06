'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { Startup, CompetitorComparisonData, Category } from '@/lib/orgApi';
import { getAllStartups, saveStartup } from '@/lib/orgApi/startups';
import { generateUniqueId, getCategories } from '@/lib/orgApi';

interface CompetitorComparisonTabProps {
  startup: Startup | null;
  organizationId: string;
  setStartup?: (startup: Startup) => void;
}

interface ComparisonAxis {
  id: string;
  label: string;
  isEditing?: boolean;
}

interface ComparisonMatrix {
  [startupId: string]: {
    [axisId: string]: boolean;
  };
}

export default function CompetitorComparisonTab({
  startup,
  organizationId,
  setStartup,
}: CompetitorComparisonTabProps) {
  const [allStartups, setAllStartups] = useState<Startup[]>([]);
  const [selectedStartups, setSelectedStartups] = useState<string[]>([]);
  const [comparisonAxes, setComparisonAxes] = useState<ComparisonAxis[]>([]);
  const [comparisonMatrix, setComparisonMatrix] = useState<ComparisonMatrix>({});
  const [isGeneratingAxes, setIsGeneratingAxes] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingAxisId, setEditingAxisId] = useState<string | null>(null);
  const [editingAxisLabel, setEditingAxisLabel] = useState<string>('');
  const [comparisonId, setComparisonId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // 保存された競合比較データを読み込む（startupIdが変更された場合のみ）
  const prevStartupIdRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!startup) return;
    
    // startupIdが変更された場合のみ再読み込み
    if (prevStartupIdRef.current !== startup.id) {
      prevStartupIdRef.current = startup.id;
      
      if (startup.competitorComparison) {
        const saved = startup.competitorComparison;
        console.log('📖 [CompetitorComparisonTab] 保存されたデータを読み込み:', {
          id: saved.id,
          axesCount: saved.axes?.length || 0,
          selectedStartupsCount: saved.selectedStartupIds?.length || 0,
          matrixKeys: Object.keys(saved.matrix || {}),
        });
        setComparisonId(saved.id);
        setComparisonAxes(saved.axes || []);
        setSelectedStartups(saved.selectedStartupIds || []);
        setComparisonMatrix(saved.matrix || {});
      } else {
        // データがない場合は初期化
        console.log('📖 [CompetitorComparisonTab] 保存されたデータなし');
        setComparisonId(null);
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
    if (!startup?.competitorComparison && filteredStartups.length > 0 && selectedStartups.length === 0) {
      setSelectedStartups(filteredStartups.slice(0, Math.min(5, filteredStartups.length)).map(s => s.id));
    }
  }, [filteredStartups, startup?.competitorComparison]);

  // 比較軸をAIで生成（プレースホルダー）
  const generateComparisonAxes = async () => {
    setIsGeneratingAxes(true);
    // TODO: AI APIを呼び出して比較軸を生成
    // 現在はプレースホルダーの比較軸を生成
    setTimeout(async () => {
      const defaultAxes: ComparisonAxis[] = [
        { id: 'axis1', label: '技術優位性' },
        { id: 'axis2', label: '市場規模' },
        { id: 'axis3', label: '資金調達状況' },
        { id: 'axis4', label: 'パートナーシップ' },
        { id: 'axis5', label: '製品成熟度' },
        { id: 'axis6', label: '顧客基盤' },
      ];
      setComparisonAxes(defaultAxes);
      setIsGeneratingAxes(false);
      
      // 比較軸を生成したら自動保存（生成されたaxesを渡す）
      console.log('💾 [CompetitorComparisonTab] 比較軸生成後の自動保存開始');
      await autoSaveComparisonData(defaultAxes);
      console.log('✅ [CompetitorComparisonTab] 比較軸生成後の自動保存成功');
    }, 1000);
  };

  // 比較軸の編集を開始
  const startEditingAxis = (axis: ComparisonAxis) => {
    setEditingAxisId(axis.id);
    setEditingAxisLabel(axis.label);
  };

  // 比較軸の編集を保存
  const saveEditingAxis = async () => {
    if (editingAxisId && editingAxisLabel.trim()) {
      const updatedAxes = comparisonAxes.map(axis => 
        axis.id === editingAxisId ? { ...axis, label: editingAxisLabel.trim() } : axis
      );
      setComparisonAxes(updatedAxes);
      setEditingAxisId(null);
      setEditingAxisLabel('');
      // 編集後に自動保存（更新されたaxesを渡す）
      await autoSaveComparisonData(updatedAxes);
    }
  };

  // 比較軸の編集をキャンセル
  const cancelEditingAxis = () => {
    setEditingAxisId(null);
    setEditingAxisLabel('');
  };

  // 比較軸を削除
  const deleteAxis = async (axisId: string) => {
    const updatedAxes = comparisonAxes.filter(axis => axis.id !== axisId);
    setComparisonAxes(updatedAxes);
    // マトリクスからも削除
    const updatedMatrix = { ...comparisonMatrix };
    Object.keys(updatedMatrix).forEach(startupId => {
      delete updatedMatrix[startupId][axisId];
    });
    setComparisonMatrix(updatedMatrix);
    // 削除後に自動保存（更新されたaxesとmatrixを渡す）
    await autoSaveComparisonData(updatedAxes, undefined, updatedMatrix);
  };

  // すべての比較軸を一括削除
  const deleteAllAxes = async () => {
    if (comparisonAxes.length === 0) return;
    
    if (confirm(`すべての比較軸（${comparisonAxes.length}件）を削除しますか？`)) {
      setComparisonAxes([]);
      setComparisonMatrix({});
      // 一括削除後に自動保存
      await autoSaveComparisonData([], selectedStartups, {});
    }
  };

  // 新しい比較軸を追加
  const addNewAxis = async () => {
    const newId = `axis_${Date.now()}`;
    const newAxis: ComparisonAxis = {
      id: newId,
      label: '新しい比較軸',
    };
    const updatedAxes = [...comparisonAxes, newAxis];
    setComparisonAxes(updatedAxes);
    setEditingAxisId(newId);
    setEditingAxisLabel('新しい比較軸');
    // 追加後に自動保存（更新されたaxesを渡す）
    await autoSaveComparisonData(updatedAxes);
  };

  // 自動保存用の関数（保存中フラグを表示しない、再読み込みを発生させない）
  const autoSaveComparisonData = async (
    axesOverride?: ComparisonAxis[],
    selectedStartupsOverride?: string[],
    matrixOverride?: ComparisonMatrix
  ) => {
    if (!startup) return;

    try {
      const now = new Date().toISOString();
      const comparisonData: CompetitorComparisonData = {
        id: comparisonId || `comp_${generateUniqueId()}`,
        axes: axesOverride ?? comparisonAxes,
        selectedStartupIds: selectedStartupsOverride ?? selectedStartups,
        matrix: matrixOverride ?? comparisonMatrix,
        createdAt: comparisonId && startup.competitorComparison?.createdAt 
          ? startup.competitorComparison.createdAt 
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
      
      // 自動保存時はsetStartupを呼び出さない（再読み込みを防ぐため）
      // データベースには保存されているので、次回ページを開いたときに正しいデータが読み込まれる
    } catch (error) {
      console.error('自動保存に失敗しました:', error);
      // 自動保存の失敗はユーザーに通知しない（手動保存で対応可能）
    }
  };

  // 競合比較データを保存
  const saveComparisonData = async () => {
    if (!startup) return;

    try {
      setIsSaving(true);
      const now = new Date().toISOString();
      const comparisonData: CompetitorComparisonData = {
        id: comparisonId || `comp_${generateUniqueId()}`,
        axes: comparisonAxes,
        selectedStartupIds: selectedStartups,
        matrix: comparisonMatrix,
        createdAt: comparisonId && startup.competitorComparison?.createdAt 
          ? startup.competitorComparison.createdAt 
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
        axesCount: comparisonData.axes.length,
        selectedStartupsCount: comparisonData.selectedStartupIds.length,
        matrixKeys: Object.keys(comparisonData.matrix),
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

  // マトリクスのセルをトグル
  const toggleMatrixCell = async (startupId: string, axisId: string) => {
    const updatedMatrix = {
      ...comparisonMatrix,
      [startupId]: {
        ...comparisonMatrix[startupId],
        [axisId]: !comparisonMatrix[startupId]?.[axisId],
      },
    };
    setComparisonMatrix(updatedMatrix);
    // マトリクス変更後に自動保存（更新されたmatrixを渡す）
    await autoSaveComparisonData(undefined, undefined, updatedMatrix);
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
          {comparisonAxes.length > 0 && (
            <>
              <button
                onClick={addNewAxis}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#FFFFFF',
                  color: '#4262FF',
                  border: '1.5px solid #4262FF',
                  borderRadius: '8px',
                  fontSize: '14px',
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
                onClick={deleteAllAxes}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#FFFFFF',
                  color: '#EF4444',
                  border: '1.5px solid #EF4444',
                  borderRadius: '8px',
                  fontSize: '14px',
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
          )}
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

      {/* マトリクステーブル */}
      {comparisonAxes.length > 0 && selectedStartupList.length > 0 && (
        <div style={{ 
          backgroundColor: '#FFFFFF', 
          borderRadius: '8px', 
          padding: '20px',
          border: '1px solid #E5E7EB',
          overflowX: 'auto'
        }}>
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
              {comparisonAxes.map((axis, axisIndex) => (
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
                      if (editingAxisId !== axis.id) {
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
                    {editingAxisId === axis.id ? (
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
                          onClick={() => startEditingAxis(axis)}
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
                              deleteAxis(axis.id);
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
                    padding: '12px',
                    textAlign: 'center',
                    borderBottom: '1px solid #E5E7EB',
                    backgroundColor: '#EFF6FF'
                  }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        margin: '0 auto',
                        backgroundColor: '#4262FF',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}
                    >
                      ✓
                    </div>
                  </td>
                  {selectedStartupList.map(s => (
                    <td 
                      key={s.id}
                      style={{ 
                        padding: '12px',
                        textAlign: 'center',
                        borderBottom: '1px solid #E5E7EB',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }}
                      onClick={() => toggleMatrixCell(s.id, axis.id)}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          margin: '0 auto',
                          backgroundColor: comparisonMatrix[s.id]?.[axis.id] ? '#4262FF' : '#E5E7EB',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: comparisonMatrix[s.id]?.[axis.id] ? '#FFFFFF' : '#9CA3AF',
                          fontSize: '12px',
                          fontWeight: '600',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {comparisonMatrix[s.id]?.[axis.id] ? '✓' : ''}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {comparisonAxes.length === 0 && (
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
      )}
    </div>
  );
}

