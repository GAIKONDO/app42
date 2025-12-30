/**
 * カテゴリー・Biz-Devフェーズスナップショット分析タブ
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  getAllStartups,
  getCategories,
  getBizDevPhases,
  calculateCurrentCounts,
  saveCategoryBizDevPhaseSnapshot,
  getAllCategoryBizDevPhaseSnapshots,
  getCategoryBizDevPhaseSnapshotByDate,
  deleteCategoryBizDevPhaseSnapshot,
  type Category,
  type BizDevPhase,
  type Startup,
  type CategoryBizDevPhaseSnapshot,
} from '@/lib/orgApi';
import { formatStartupDate } from '@/lib/orgApi/utils';

// VegaChartを動的インポート（SSRを回避）
const DynamicVegaChart = dynamic(() => import('@/components/VegaChart'), {
  ssr: false,
});

interface CategoryBizDevPhaseSnapshotTabProps {
  // 必要に応じてpropsを追加
}

export function CategoryBizDevPhaseSnapshotTab({}: CategoryBizDevPhaseSnapshotTabProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [bizDevPhases, setBizDevPhases] = useState<BizDevPhase[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [snapshots, setSnapshots] = useState<CategoryBizDevPhaseSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'comparison' | 'timeline'>('timeline');
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // データ読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [categoriesData, bizDevPhasesData, startupsData, snapshotsData] = await Promise.all([
          getCategories(),
          getBizDevPhases(),
          getAllStartups(),
          getAllCategoryBizDevPhaseSnapshots(),
        ]);

        setCategories(categoriesData);
        setBizDevPhases(bizDevPhasesData);
        setStartups(startupsData);
        setSnapshots(snapshotsData);
      } catch (err: any) {
        console.error('データの読み込みに失敗しました:', err);
        setError(`データの読み込みに失敗しました: ${err?.message || err}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 現在の数値を計算
  const currentCounts = useMemo(() => {
    return calculateCurrentCounts(startups, categories, bizDevPhases);
  }, [startups, categories, bizDevPhases]);

  // スナップショットを保存
  const handleSaveSnapshot = useCallback(async () => {
    try {
      const now = new Date();
      const snapshotDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // 既存のスナップショットを確認
      const existing = await getCategoryBizDevPhaseSnapshotByDate(snapshotDate);
      if (existing) {
        const confirmMessage = `${snapshotDate}のスナップショットは既に存在します。上書きしますか？`;
        if (!window.confirm(confirmMessage)) {
          return;
        }
      }

      await saveCategoryBizDevPhaseSnapshot(
        snapshotDate,
        currentCounts.categoryCounts,
        currentCounts.bizDevPhaseCounts
      );

      // スナップショットリストを再読み込み
      const updatedSnapshots = await getAllCategoryBizDevPhaseSnapshots();
      setSnapshots(updatedSnapshots);

      alert('スナップショットを保存しました');
    } catch (err: any) {
      console.error('スナップショットの保存に失敗しました:', err);
      alert(`スナップショットの保存に失敗しました: ${err?.message || err}`);
    }
  }, [currentCounts]);

  // 先月のスナップショットを取得
  const lastMonthSnapshot = useMemo(() => {
    if (snapshots.length === 0) return null;

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthDate = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    return snapshots.find(s => s.snapshotDate === lastMonthDate) || null;
  }, [snapshots]);

  // 年間の各月のスナップショットを取得
  const monthlySnapshots = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const monthly: CategoryBizDevPhaseSnapshot[] = [];

    for (let month = 1; month <= 12; month++) {
      const date = `${currentYear}-${String(month).padStart(2, '0')}`;
      const snapshot = snapshots.find(s => s.snapshotDate === date);
      if (snapshot) {
        monthly.push(snapshot);
      }
    }

    return monthly;
  }, [snapshots]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>データを読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{
          padding: '16px',
          backgroundColor: '#FEF2F2',
          border: '1.5px solid #FCA5A5',
          borderRadius: '8px',
          color: '#991B1B',
          fontSize: '14px',
        }}>
          <strong>エラー:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>カテゴリー・Biz-Devフェーズ分析</h2>
        <button
          onClick={handleSaveSnapshot}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          現在のスナップショットを保存
        </button>
      </div>

      {/* ビュー切り替え */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setSelectedView('timeline')}
          style={{
            padding: '8px 16px',
            backgroundColor: selectedView === 'timeline' ? '#3B82F6' : '#E5E7EB',
            color: selectedView === 'timeline' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          年間推移
        </button>
        <button
          onClick={() => setSelectedView('comparison')}
          style={{
            padding: '8px 16px',
            backgroundColor: selectedView === 'comparison' ? '#3B82F6' : '#E5E7EB',
            color: selectedView === 'comparison' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          先月との比較
        </button>
      </div>

      {/* 先月との比較ビュー */}
      {selectedView === 'comparison' && (
        <ComparisonView
          currentCounts={currentCounts}
          lastMonthSnapshot={lastMonthSnapshot}
          categories={categories}
          bizDevPhases={bizDevPhases}
          snapshots={snapshots}
          onSnapshotChange={async () => {
            // スナップショットリストを再読み込み
            const updatedSnapshots = await getAllCategoryBizDevPhaseSnapshots();
            setSnapshots(updatedSnapshots);
          }}
        />
      )}

      {/* 年間推移ビュー */}
      {selectedView === 'timeline' && (
        <TimelineView
          monthlySnapshots={monthlySnapshots}
          currentCounts={currentCounts}
          categories={categories}
          bizDevPhases={bizDevPhases}
          startups={startups}
        />
      )}
    </div>
  );
}

// 先月との比較ビューコンポーネント
interface ComparisonViewProps {
  currentCounts: { categoryCounts: Record<string, number>; bizDevPhaseCounts: Record<string, number> };
  lastMonthSnapshot: CategoryBizDevPhaseSnapshot | null;
  categories: Category[];
  bizDevPhases: BizDevPhase[];
  snapshots: CategoryBizDevPhaseSnapshot[];
  onSnapshotChange: () => Promise<void>;
}

function ComparisonView({ currentCounts, lastMonthSnapshot, categories, bizDevPhases, snapshots, onSnapshotChange }: ComparisonViewProps) {
  const [categoryMode, setCategoryMode] = useState<'all' | 'parent' | 'sub'>('parent');
  const [selectedSnapshot, setSelectedSnapshot] = useState<CategoryBizDevPhaseSnapshot | null>(lastMonthSnapshot);
  const [showSnapshotManagement, setShowSnapshotManagement] = useState(false);
  const [snapshotToDelete, setSnapshotToDelete] = useState<CategoryBizDevPhaseSnapshot | null>(null);

  // 選択されたスナップショットが変更されたときに更新
  useEffect(() => {
    setSelectedSnapshot(lastMonthSnapshot);
  }, [lastMonthSnapshot]);

  // スナップショットを削除
  const handleDeleteSnapshot = useCallback(async (snapshot: CategoryBizDevPhaseSnapshot) => {
    if (!window.confirm(`${snapshot.snapshotDate}のスナップショットを削除しますか？`)) {
      return;
    }

    try {
      await deleteCategoryBizDevPhaseSnapshot(snapshot.id);
      await onSnapshotChange();
      
      // 削除されたスナップショットが選択されていた場合、先月のスナップショットに戻す
      if (selectedSnapshot?.id === snapshot.id) {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthDate = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
        const updatedSnapshots = await getAllCategoryBizDevPhaseSnapshots();
        const newLastMonthSnapshot = updatedSnapshots.find(s => s.snapshotDate === lastMonthDate) || null;
        setSelectedSnapshot(newLastMonthSnapshot);
      }
      
      setSnapshotToDelete(null);
      alert('スナップショットを削除しました');
    } catch (err: any) {
      console.error('スナップショットの削除に失敗しました:', err);
      alert(`スナップショットの削除に失敗しました: ${err?.message || err}`);
    }
  }, [selectedSnapshot, onSnapshotChange]);

  // カテゴリーをフィルタリング
  const filteredCategories = useMemo(() => {
    if (categoryMode === 'parent') {
      return categories.filter(cat => !cat.parentCategoryId);
    } else if (categoryMode === 'sub') {
      return categories.filter(cat => cat.parentCategoryId);
    }
    return categories;
  }, [categories, categoryMode]);

  // スナップショットの日付をフォーマット（YYYY-MM → YYYY年MM月）
  const formatSnapshotDate = (date: string) => {
    const [year, month] = date.split('-');
    return `${year}年${parseInt(month)}月`;
  };

  // スナップショットの保存日時をフォーマット
  const formatSnapshotDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch {
      return dateString;
    }
  };

  const displaySnapshot = selectedSnapshot || lastMonthSnapshot;

  if (!displaySnapshot && snapshots.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
        <p>スナップショットがありません。スナップショットを保存してください。</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
            {displaySnapshot ? `${formatSnapshotDate(displaySnapshot.snapshotDate)}との比較` : '比較対象を選択してください'}
          </h3>
          {displaySnapshot && (
            <span style={{ fontSize: '13px', color: '#6B7280' }}>
              （保存日時: {formatSnapshotDateTime(displaySnapshot.createdAt)}）
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* スナップショット選択ドロップダウン */}
          {snapshots.length > 0 && (
            <select
              value={selectedSnapshot?.id || ''}
              onChange={(e) => {
                const snapshot = snapshots.find(s => s.id === e.target.value);
                setSelectedSnapshot(snapshot || null);
              }}
              style={{
                padding: '6px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '13px',
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
            >
              <option value="">比較対象を選択...</option>
              {snapshots.map(snapshot => (
                <option key={snapshot.id} value={snapshot.id}>
                  {formatSnapshotDate(snapshot.snapshotDate)} {snapshot.id === lastMonthSnapshot?.id && '(先月)'}
                </option>
              ))}
            </select>
          )}
          {/* スナップショット管理ボタン */}
          <button
            onClick={() => setShowSnapshotManagement(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#6B7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            スナップショット管理
          </button>
        </div>
      </div>

      {/* スナップショット管理モーダル */}
      {showSnapshotManagement && (
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
            zIndex: 1000,
          }}
          onClick={() => setShowSnapshotManagement(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>スナップショット管理</h3>
              <button
                onClick={() => setShowSnapshotManagement(false)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#E5E7EB',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                閉じる
              </button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#6B7280' }}>
                保存されているスナップショットの一覧です。削除する場合は各スナップショットの削除ボタンをクリックしてください。
              </p>
            </div>
            <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F3F4F6', borderBottom: '1px solid #E5E7EB' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>スナップショット日付</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>保存日時</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>
                        スナップショットがありません
                      </td>
                    </tr>
                  ) : (
                    snapshots.map(snapshot => (
                      <tr key={snapshot.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '12px' }}>
                          {formatSnapshotDate(snapshot.snapshotDate)}
                          {snapshot.id === lastMonthSnapshot?.id && (
                            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#3B82F6' }}>(先月)</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#6B7280' }}>
                          {formatSnapshotDateTime(snapshot.createdAt)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteSnapshot(snapshot)}
                            style={{
                              padding: '4px 12px',
                              backgroundColor: '#DC2626',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {!displaySnapshot && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
          <p>比較対象のスナップショットを選択してください。</p>
        </div>
      )}

      {displaySnapshot && (
        <>

      {/* カテゴリー比較 */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>カテゴリー別数値</h4>
          {/* カテゴリーモード切り替えボタン */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setCategoryMode('all')}
              style={{
                padding: '6px 12px',
                backgroundColor: categoryMode === 'all' ? '#3B82F6' : '#E5E7EB',
                color: categoryMode === 'all' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              すべて
            </button>
            <button
              onClick={() => setCategoryMode('parent')}
              style={{
                padding: '6px 12px',
                backgroundColor: categoryMode === 'parent' ? '#3B82F6' : '#E5E7EB',
                color: categoryMode === 'parent' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              親カテゴリー
            </button>
            <button
              onClick={() => setCategoryMode('sub')}
              style={{
                padding: '6px 12px',
                backgroundColor: categoryMode === 'sub' ? '#3B82F6' : '#E5E7EB',
                color: categoryMode === 'sub' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              サブカテゴリー
            </button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F3F4F6', borderBottom: '2px solid #E5E7EB' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>カテゴリー</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                  {displaySnapshot ? formatSnapshotDate(displaySnapshot.snapshotDate) : '比較対象'}
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>現在</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>差分</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map(category => {
                const snapshotCount = displaySnapshot.categoryCounts[category.id] || 0;
                const currentCount = currentCounts.categoryCounts[category.id] || 0;
                const diff = currentCount - snapshotCount;
                const diffPercent = snapshotCount > 0 ? ((diff / snapshotCount) * 100).toFixed(1) : '0.0';
                const parentCategory = category.parentCategoryId 
                  ? categories.find(c => c.id === category.parentCategoryId)
                  : null;

                return (
                  <tr key={category.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '12px' }}>
                      {parentCategory ? `${parentCategory.title} / ${category.title}` : category.title}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{snapshotCount}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{currentCount}</td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      color: diff > 0 ? '#059669' : diff < 0 ? '#DC2626' : '#6B7280',
                      fontWeight: '500',
                    }}>
                      {diff > 0 ? '+' : ''}{diff} ({diffPercent}%)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Biz-Devフェーズ比較 */}
      <div>
        <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>Biz-Devフェーズ別数値</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F3F4F6', borderBottom: '2px solid #E5E7EB' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Biz-Devフェーズ</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                  {displaySnapshot ? formatSnapshotDate(displaySnapshot.snapshotDate) : '比較対象'}
                </th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>現在</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>差分</th>
              </tr>
            </thead>
            <tbody>
              {bizDevPhases.map(phase => {
                const snapshotCount = displaySnapshot.bizDevPhaseCounts[phase.id] || 0;
                const currentCount = currentCounts.bizDevPhaseCounts[phase.id] || 0;
                const diff = currentCount - snapshotCount;
                const diffPercent = snapshotCount > 0 ? ((diff / snapshotCount) * 100).toFixed(1) : '0.0';

                return (
                  <tr key={phase.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '12px' }}>{phase.title}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{snapshotCount}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{currentCount}</td>
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      color: diff > 0 ? '#059669' : diff < 0 ? '#DC2626' : '#6B7280',
                      fontWeight: '500',
                    }}>
                      {diff > 0 ? '+' : ''}{diff} ({diffPercent}%)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

// 年間推移ビューコンポーネント
interface TimelineViewProps {
  monthlySnapshots: CategoryBizDevPhaseSnapshot[];
  currentCounts: { categoryCounts: Record<string, number>; bizDevPhaseCounts: Record<string, number> };
  categories: Category[];
  bizDevPhases: BizDevPhase[];
  startups: Startup[];
}

function TimelineView({ monthlySnapshots, currentCounts, categories, bizDevPhases, startups }: TimelineViewProps) {
  const router = useRouter();
  const [displayMode, setDisplayMode] = useState<'table' | 'chart'>('table');
  const [categoryMode, setCategoryMode] = useState<'all' | 'parent' | 'sub'>('parent');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCurrentCell, setSelectedCurrentCell] = useState<{ type: 'category' | 'bizDevPhase'; id: string } | null>(null);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  // カテゴリーをフィルタリング
  const filteredCategories = useMemo(() => {
    if (categoryMode === 'parent') {
      return categories.filter(cat => !cat.parentCategoryId);
    } else if (categoryMode === 'sub') {
      return categories.filter(cat => cat.parentCategoryId);
    }
    return categories;
  }, [categories, categoryMode]);

  // 選択されたカテゴリーに紐づくスタートアップを取得
  const filteredStartups = useMemo(() => {
    if (!selectedCategoryId) {
      return startups;
    }

    // 選択されたカテゴリーとその子カテゴリーを取得
    const getCategoryAndChildren = (categoryId: string): string[] => {
      const categoryIds = [categoryId];
      const childCategories = categories.filter(c => c.parentCategoryId === categoryId);
      childCategories.forEach(child => {
        categoryIds.push(...getCategoryAndChildren(child.id));
      });
      return categoryIds;
    };

    const targetCategoryIds = getCategoryAndChildren(selectedCategoryId);
    
    return startups.filter(startup => 
      startup.categoryIds && 
      startup.categoryIds.some(catId => targetCategoryIds.includes(catId))
    );
  }, [startups, selectedCategoryId, categories]);

  // フィルターされたスタートアップでBiz-Devフェーズの数値を計算
  const filteredBizDevPhaseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    // Biz-Devフェーズの初期化
    bizDevPhases.forEach(phase => {
      counts[phase.id] = 0;
    });

    // フィルターされたスタートアップを集計
    filteredStartups.forEach(startup => {
      if ((startup as any).bizDevPhase) {
        if (counts[(startup as any).bizDevPhase] !== undefined) {
          counts[(startup as any).bizDevPhase]++;
        }
      }
    });

    return counts;
  }, [filteredStartups, bizDevPhases]);

  // 選択された「現在」セルに紐づくスタートアップを取得
  const getSelectedCurrentCellStartups = useMemo(() => {
    if (!selectedCurrentCell) return [];

    // カテゴリーフィルターが適用されている場合は、フィルターされたスタートアップを使用
    const targetStartups = selectedCategoryId ? filteredStartups : startups;

    if (selectedCurrentCell.type === 'category') {
      // カテゴリーに紐づくスタートアップを取得
      const getCategoryAndChildren = (categoryId: string): string[] => {
        const categoryIds = [categoryId];
        const childCategories = categories.filter(c => c.parentCategoryId === categoryId);
        childCategories.forEach(child => {
          categoryIds.push(...getCategoryAndChildren(child.id));
        });
        return categoryIds;
      };

      const targetCategoryIds = getCategoryAndChildren(selectedCurrentCell.id);
      
      return targetStartups.filter(startup => 
        startup.categoryIds && 
        startup.categoryIds.some(catId => targetCategoryIds.includes(catId))
      );
    } else {
      // Biz-Devフェーズに紐づくスタートアップを取得
      return targetStartups.filter(startup => 
        (startup as any).bizDevPhase === selectedCurrentCell.id
      );
    }
  }, [selectedCurrentCell, startups, categories, selectedCategoryId, filteredStartups]);

  // 各月のデータを準備（4月から11月まで：年度開始）
  const monthlyData = useMemo(() => {
    const data: Array<{
      month: number;
      date: string;
      categoryCounts: Record<string, number>;
      bizDevPhaseCounts: Record<string, number>;
    }> = [];

    for (let month = 4; month <= 11; month++) {
      const date = `${currentYear}-${String(month).padStart(2, '0')}`;
      const snapshot = monthlySnapshots.find(s => s.snapshotDate === date);

      data.push({
        month,
        date,
        categoryCounts: snapshot ? snapshot.categoryCounts : {},
        bizDevPhaseCounts: snapshot ? snapshot.bizDevPhaseCounts : {},
      });
    }

    return data;
  }, [monthlySnapshots, currentYear]);

  // 12月のデータを取得
  const decemberData = useMemo(() => {
    const date = `${currentYear}-12`;
    const snapshot = monthlySnapshots.find(s => s.snapshotDate === date);
    return {
      month: 12,
      date,
      categoryCounts: snapshot ? snapshot.categoryCounts : {},
      bizDevPhaseCounts: snapshot ? snapshot.bizDevPhaseCounts : {},
    };
  }, [monthlySnapshots, currentYear]);

  // 1月、2月、3月のデータを取得（前年度のデータとして）
  const januaryMarchData = useMemo(() => {
    const previousYear = currentYear - 1;
    const data: Array<{
      month: number;
      date: string;
      categoryCounts: Record<string, number>;
      bizDevPhaseCounts: Record<string, number>;
    }> = [];

    for (let month = 1; month <= 3; month++) {
      const date = `${previousYear}-${String(month).padStart(2, '0')}`;
      const snapshot = monthlySnapshots.find(s => s.snapshotDate === date);

      data.push({
        month,
        date,
        categoryCounts: snapshot ? snapshot.categoryCounts : {},
        bizDevPhaseCounts: snapshot ? snapshot.bizDevPhaseCounts : {},
      });
    }

    return data;
  }, [monthlySnapshots, currentYear]);

  // 現在のデータ（カテゴリーフィルター適用）
  const currentData = useMemo(() => {
    return {
      categoryCounts: currentCounts.categoryCounts,
      bizDevPhaseCounts: selectedCategoryId ? filteredBizDevPhaseCounts : currentCounts.bizDevPhaseCounts,
    };
  }, [currentCounts, selectedCategoryId, filteredBizDevPhaseCounts]);

  // カテゴリー用の折れ線グラフデータを準備（4月から11月、12月、1月～3月、現在を含む）
  const categoryChartData = useMemo(() => {
    const data: Array<{ month: number | string; category: string; count: number }> = [];
    
    // 4月から11月
    monthlyData.forEach(({ month, categoryCounts }) => {
      filteredCategories.forEach(category => {
        const count = categoryCounts[category.id] || 0;
        if (count > 0 || monthlyData.some(d => (d.categoryCounts[category.id] || 0) > 0) || 
            (decemberData.categoryCounts[category.id] || 0) > 0 || 
            januaryMarchData.some(d => (d.categoryCounts[category.id] || 0) > 0) ||
            (currentData.categoryCounts[category.id] || 0) > 0) {
          const parentCategory = category.parentCategoryId 
            ? categories.find(c => c.id === category.parentCategoryId)
            : null;
          const categoryLabel = parentCategory 
            ? `${parentCategory.title} / ${category.title}` 
            : category.title;
          data.push({
            month,
            category: categoryLabel,
            count,
          });
        }
      });
    });

    // 12月
    filteredCategories.forEach(category => {
      const count = decemberData.categoryCounts[category.id] || 0;
      if (count > 0 || monthlyData.some(d => (d.categoryCounts[category.id] || 0) > 0) || 
          januaryMarchData.some(d => (d.categoryCounts[category.id] || 0) > 0) ||
          (currentData.categoryCounts[category.id] || 0) > 0) {
        const parentCategory = category.parentCategoryId 
          ? categories.find(c => c.id === category.parentCategoryId)
          : null;
        const categoryLabel = parentCategory 
          ? `${parentCategory.title} / ${category.title}` 
          : category.title;
        data.push({
          month: 12,
          category: categoryLabel,
          count,
        });
      }
    });

    // 1月、2月、3月
    januaryMarchData.forEach(({ month, categoryCounts }) => {
      filteredCategories.forEach(category => {
        const count = categoryCounts[category.id] || 0;
        if (count > 0 || monthlyData.some(d => (d.categoryCounts[category.id] || 0) > 0) || 
            (decemberData.categoryCounts[category.id] || 0) > 0 ||
            (currentData.categoryCounts[category.id] || 0) > 0) {
          const parentCategory = category.parentCategoryId 
            ? categories.find(c => c.id === category.parentCategoryId)
            : null;
          const categoryLabel = parentCategory 
            ? `${parentCategory.title} / ${category.title}` 
            : category.title;
          data.push({
            month,
            category: categoryLabel,
            count,
          });
        }
      });
    });

    // 現在
    filteredCategories.forEach(category => {
      const count = currentData.categoryCounts[category.id] || 0;
      if (count > 0 || monthlyData.some(d => (d.categoryCounts[category.id] || 0) > 0) || 
          (decemberData.categoryCounts[category.id] || 0) > 0 ||
          januaryMarchData.some(d => (d.categoryCounts[category.id] || 0) > 0)) {
        const parentCategory = category.parentCategoryId 
          ? categories.find(c => c.id === category.parentCategoryId)
          : null;
        const categoryLabel = parentCategory 
          ? `${parentCategory.title} / ${category.title}` 
          : category.title;
        data.push({
          month: '現在',
          category: categoryLabel,
          count,
        });
      }
    });

    return data;
  }, [monthlyData, decemberData, januaryMarchData, currentData, filteredCategories, categories]);

  // Biz-Devフェーズ用の折れ線グラフデータを準備（4月から11月、12月、1月～3月、現在を含む）
  const bizDevPhaseChartData = useMemo(() => {
    const data: Array<{ month: number | string; phase: string; count: number }> = [];
    
    // 4月から11月
    monthlyData.forEach(({ month, bizDevPhaseCounts }) => {
      bizDevPhases.forEach(phase => {
        const count = bizDevPhaseCounts[phase.id] || 0;
        if (count > 0 || monthlyData.some(d => (d.bizDevPhaseCounts[phase.id] || 0) > 0) ||
            (decemberData.bizDevPhaseCounts[phase.id] || 0) > 0 ||
            januaryMarchData.some(d => (d.bizDevPhaseCounts[phase.id] || 0) > 0) ||
            (currentData.bizDevPhaseCounts[phase.id] || 0) > 0) {
          data.push({
            month,
            phase: phase.title,
            count,
          });
        }
      });
    });

    // 12月
    bizDevPhases.forEach(phase => {
      const count = decemberData.bizDevPhaseCounts[phase.id] || 0;
      if (count > 0 || monthlyData.some(d => (d.bizDevPhaseCounts[phase.id] || 0) > 0) ||
          januaryMarchData.some(d => (d.bizDevPhaseCounts[phase.id] || 0) > 0) ||
          (currentData.bizDevPhaseCounts[phase.id] || 0) > 0) {
        data.push({
          month: 12,
          phase: phase.title,
          count,
        });
      }
    });

    // 1月、2月、3月
    januaryMarchData.forEach(({ month, bizDevPhaseCounts }) => {
      bizDevPhases.forEach(phase => {
        const count = bizDevPhaseCounts[phase.id] || 0;
        if (count > 0 || monthlyData.some(d => (d.bizDevPhaseCounts[phase.id] || 0) > 0) ||
            (decemberData.bizDevPhaseCounts[phase.id] || 0) > 0 ||
            (currentData.bizDevPhaseCounts[phase.id] || 0) > 0) {
          data.push({
            month,
            phase: phase.title,
            count,
          });
        }
      });
    });

    // 現在
    bizDevPhases.forEach(phase => {
      const count = currentData.bizDevPhaseCounts[phase.id] || 0;
      if (count > 0 || monthlyData.some(d => (d.bizDevPhaseCounts[phase.id] || 0) > 0) ||
          (decemberData.bizDevPhaseCounts[phase.id] || 0) > 0 ||
          januaryMarchData.some(d => (d.bizDevPhaseCounts[phase.id] || 0) > 0)) {
        data.push({
          month: '現在',
          phase: phase.title,
          count,
        });
      }
    });

    return data;
  }, [monthlyData, decemberData, januaryMarchData, currentData, bizDevPhases]);

  // カテゴリー用の折れ線グラフ仕様
  const categoryChartSpec = useMemo(() => {
    if (categoryChartData.length === 0) return null;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const chartHeight = isMobile ? 400 : 500;

    // カテゴリーごとの色を生成
    const categoryList = Array.from(new Set(categoryChartData.map(d => d.category)));
    const maxColors = 20;

    // x軸の順序を定義（4月→11月→12月→1月→2月→3月→現在）
    const monthOrder = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, '現在'];

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      description: 'カテゴリー別数値の推移',
      width: 'container',
      height: chartHeight,
      padding: { top: 20, right: 20, bottom: 60, left: 60 },
      data: {
        values: categoryChartData,
      },
      mark: {
        type: 'line',
        point: true,
        tooltip: true,
      },
      encoding: {
        x: {
          field: 'month',
          type: 'ordinal',
          title: '月',
          scale: {
            domain: monthOrder,
          },
          axis: {
            labelFontSize: isMobile ? 11 : 13,
            labelColor: '#6B7280',
            labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
            titleFontSize: isMobile ? 12 : 14,
            titleFontWeight: '600',
            titleColor: '#1A1A1A',
            titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
            titlePadding: 12,
            domain: true,
            domainColor: '#E5E7EB',
            domainWidth: 1,
            tickSize: 0,
          },
        },
        y: {
          field: 'count',
          type: 'quantitative',
          title: '数値',
          axis: {
            grid: true,
            gridColor: '#F3F4F6',
            labelFontSize: isMobile ? 11 : 13,
            labelColor: '#6B7280',
            labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
            titleFontSize: isMobile ? 12 : 14,
            titleFontWeight: '600',
            titleColor: '#1A1A1A',
            titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
            titlePadding: 12,
            domain: true,
            domainColor: '#E5E7EB',
            domainWidth: 1,
            tickSize: 0,
          },
        },
        color: {
          field: 'category',
          type: 'nominal',
          title: 'カテゴリー',
          scale: {
            scheme: categoryList.length <= maxColors ? 'category20' : 'category20b',
          },
          legend: {
            orient: isMobile ? 'bottom' : 'right',
            columns: isMobile ? 2 : 1,
            symbolLimit: categoryList.length > 20 ? 50 : undefined,
            labelFontSize: isMobile ? 11 : 13,
            labelColor: '#4B5563',
            labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
            titleFontSize: isMobile ? 12 : 14,
            titleFontWeight: '600',
            titleColor: '#1A1A1A',
            titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
            titlePadding: 8,
            symbolType: 'circle',
            symbolSize: 80,
            padding: 8,
            offset: isMobile ? 0 : 20,
          },
        },
        tooltip: [
          { field: 'month', type: 'ordinal', title: '月' },
          { field: 'category', type: 'nominal', title: 'カテゴリー' },
          { field: 'count', type: 'quantitative', title: '数値', format: '.0f' },
        ],
      },
    };
  }, [categoryChartData]);

  // Biz-Devフェーズ用の折れ線グラフ仕様
  const bizDevPhaseChartSpec = useMemo(() => {
    if (bizDevPhaseChartData.length === 0) return null;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const chartHeight = isMobile ? 400 : 500;

    // フェーズごとの色を生成
    const phaseList = Array.from(new Set(bizDevPhaseChartData.map(d => d.phase)));
    const maxColors = 20;

    // x軸の順序を定義（4月→11月→12月→1月→2月→3月→現在）
    const monthOrder = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, '現在'];

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      description: 'Biz-Devフェーズ別数値の推移',
      width: 'container',
      height: chartHeight,
      padding: { top: 20, right: 20, bottom: 60, left: 60 },
      data: {
        values: bizDevPhaseChartData,
      },
      mark: {
        type: 'line',
        point: true,
        tooltip: true,
      },
      encoding: {
        x: {
          field: 'month',
          type: 'ordinal',
          title: '月',
          scale: {
            domain: monthOrder,
          },
          axis: {
            labelFontSize: isMobile ? 11 : 13,
            labelColor: '#6B7280',
            labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
            titleFontSize: isMobile ? 12 : 14,
            titleFontWeight: '600',
            titleColor: '#1A1A1A',
            titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
            titlePadding: 12,
            domain: true,
            domainColor: '#E5E7EB',
            domainWidth: 1,
            tickSize: 0,
          },
        },
        y: {
          field: 'count',
          type: 'quantitative',
          title: '数値',
          axis: {
            grid: true,
            gridColor: '#F3F4F6',
            labelFontSize: isMobile ? 11 : 13,
            labelColor: '#6B7280',
            labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
            titleFontSize: isMobile ? 12 : 14,
            titleFontWeight: '600',
            titleColor: '#1A1A1A',
            titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
            titlePadding: 12,
            domain: true,
            domainColor: '#E5E7EB',
            domainWidth: 1,
            tickSize: 0,
          },
        },
        color: {
          field: 'phase',
          type: 'nominal',
          title: 'Biz-Devフェーズ',
          scale: {
            scheme: phaseList.length <= maxColors ? 'category20' : 'category20b',
          },
          legend: {
            orient: isMobile ? 'bottom' : 'right',
            columns: isMobile ? 2 : 1,
            symbolLimit: phaseList.length > 20 ? 50 : undefined,
            labelFontSize: isMobile ? 11 : 13,
            labelColor: '#4B5563',
            labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
            titleFontSize: isMobile ? 12 : 14,
            titleFontWeight: '600',
            titleColor: '#1A1A1A',
            titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
            titlePadding: 8,
            symbolType: 'circle',
            symbolSize: 80,
            padding: 8,
            offset: isMobile ? 0 : 20,
          },
        },
        tooltip: [
          { field: 'month', type: 'ordinal', title: '月' },
          { field: 'phase', type: 'nominal', title: 'Biz-Devフェーズ' },
          { field: 'count', type: 'quantitative', title: '数値', format: '.0f' },
        ],
      },
    };
  }, [bizDevPhaseChartData]);

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          現在の数値
        </h3>
        {/* 表示形式切り替えボタン */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setDisplayMode('table')}
            style={{
              padding: '6px 12px',
              backgroundColor: displayMode === 'table' ? '#3B82F6' : '#E5E7EB',
              color: displayMode === 'table' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            表形式
          </button>
          <button
            onClick={() => setDisplayMode('chart')}
            style={{
              padding: '6px 12px',
              backgroundColor: displayMode === 'chart' ? '#3B82F6' : '#E5E7EB',
              color: displayMode === 'chart' ? 'white' : '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            折れ線グラフ
          </button>
        </div>
      </div>

      {/* 統計情報カード */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
          ? '1fr' 
          : 'repeat(3, 1fr)',
        gap: typeof window !== 'undefined' && window.innerWidth < 768 ? '16px' : '20px',
        marginBottom: '32px',
      }}>
        {/* カテゴリー数 */}
        <div style={{
          padding: '24px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #F0F4FF 0%, #E0E8FF 100%)',
            borderRadius: '0 12px 0 60px',
            opacity: 0.5,
          }} />
          <div style={{
            fontSize: '13px',
            color: '#6B7280',
            marginBottom: '12px',
            fontWeight: '500',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            position: 'relative',
            zIndex: 1,
          }}>
            カテゴリー数
          </div>
          <div style={{
            fontSize: '40px',
            fontWeight: '700',
            color: '#1A1A1A',
            lineHeight: '1',
            marginBottom: '4px',
            position: 'relative',
            zIndex: 1,
            fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
          }}>
            {categories.filter(c => !c.parentCategoryId).length}
          </div>
          <div style={{
            fontSize: '13px',
            color: '#9CA3AF',
            fontWeight: '400',
            position: 'relative',
            zIndex: 1,
          }}>
            件のカテゴリー
          </div>
        </div>

        {/* サブカテゴリー数 */}
        <div style={{
          padding: '24px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
            borderRadius: '0 12px 0 60px',
            opacity: 0.5,
          }} />
          <div style={{
            fontSize: '13px',
            color: '#6B7280',
            marginBottom: '12px',
            fontWeight: '500',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            position: 'relative',
            zIndex: 1,
          }}>
            サブカテゴリー数
          </div>
          <div style={{
            fontSize: '40px',
            fontWeight: '700',
            color: '#1A1A1A',
            lineHeight: '1',
            marginBottom: '4px',
            position: 'relative',
            zIndex: 1,
            fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
          }}>
            {categories.filter(c => c.parentCategoryId).length}
          </div>
          <div style={{
            fontSize: '13px',
            color: '#9CA3AF',
            fontWeight: '400',
            position: 'relative',
            zIndex: 1,
          }}>
            件のサブカテゴリー
          </div>
        </div>

        {/* スタートアップ件数 */}
        <div style={{
          padding: '24px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #FEF3F2 0%, #FEE2E2 100%)',
            borderRadius: '0 12px 0 60px',
            opacity: 0.5,
          }} />
          <div style={{
            fontSize: '13px',
            color: '#6B7280',
            marginBottom: '12px',
            fontWeight: '500',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            position: 'relative',
            zIndex: 1,
          }}>
            スタートアップ件数
          </div>
          <div style={{
            fontSize: '40px',
            fontWeight: '700',
            color: '#1A1A1A',
            lineHeight: '1',
            marginBottom: '4px',
            position: 'relative',
            zIndex: 1,
            fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
          }}>
            {startups.length}
          </div>
          <div style={{
            fontSize: '13px',
            color: '#9CA3AF',
            fontWeight: '400',
            position: 'relative',
            zIndex: 1,
          }}>
            件のスタートアップ
          </div>
        </div>
      </div>

      {/* カテゴリー推移 */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>カテゴリー別数値の推移</h4>
          {/* カテゴリーモード切り替えボタン */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setCategoryMode('all')}
              style={{
                padding: '6px 12px',
                backgroundColor: categoryMode === 'all' ? '#3B82F6' : '#E5E7EB',
                color: categoryMode === 'all' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              すべて
            </button>
            <button
              onClick={() => setCategoryMode('parent')}
              style={{
                padding: '6px 12px',
                backgroundColor: categoryMode === 'parent' ? '#3B82F6' : '#E5E7EB',
                color: categoryMode === 'parent' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              親カテゴリー
            </button>
            <button
              onClick={() => setCategoryMode('sub')}
              style={{
                padding: '6px 12px',
                backgroundColor: categoryMode === 'sub' ? '#3B82F6' : '#E5E7EB',
                color: categoryMode === 'sub' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              サブカテゴリー
            </button>
          </div>
        </div>
        {displayMode === 'table' ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F3F4F6', borderBottom: '2px solid #E5E7EB' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>カテゴリー</th>
                  {monthlyData.map(({ month }) => (
                    <th
                      key={month}
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: '600',
                      }}
                    >
                      {month}月
                    </th>
                  ))}
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontWeight: '600',
                    }}
                  >
                    12月
                  </th>
                  {januaryMarchData.map(({ month }) => (
                    <th
                      key={month}
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: '600',
                      }}
                    >
                      {month}月
                    </th>
                  ))}
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontWeight: '600',
                    }}
                  >
                    現在
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map(category => {
                  const parentCategory = category.parentCategoryId 
                    ? categories.find(c => c.id === category.parentCategoryId)
                    : null;
                  return (
                    <tr key={category.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '12px', fontWeight: '500' }}>
                        {parentCategory ? `${parentCategory.title} / ${category.title}` : category.title}
                      </td>
                      {monthlyData.map(({ month, categoryCounts: counts }) => {
                        const count = counts[category.id] || 0;
                        return (
                          <td
                            key={month}
                            style={{
                              padding: '12px',
                              textAlign: 'center',
                            }}
                          >
                            {count > 0 ? count : '-'}
                          </td>
                        );
                      })}
                      <td
                        style={{
                          padding: '12px',
                          textAlign: 'center',
                        }}
                      >
                        {(decemberData.categoryCounts[category.id] || 0) > 0 ? decemberData.categoryCounts[category.id] : '-'}
                      </td>
                      {januaryMarchData.map(({ month, categoryCounts: counts }) => {
                        const count = counts[category.id] || 0;
                        return (
                          <td
                            key={month}
                            style={{
                              padding: '12px',
                              textAlign: 'center',
                            }}
                          >
                            {count > 0 ? count : '-'}
                          </td>
                        );
                      })}
                      <td
                        onClick={() => {
                          const count = currentData.categoryCounts[category.id] || 0;
                          if (count > 0) {
                            setSelectedCurrentCell({ type: 'category', id: category.id });
                          }
                        }}
                        style={{
                          padding: '12px',
                          textAlign: 'center',
                          cursor: (currentData.categoryCounts[category.id] || 0) > 0 ? 'pointer' : 'default',
                          backgroundColor: selectedCurrentCell?.type === 'category' && selectedCurrentCell?.id === category.id ? '#EFF6FF' : 'transparent',
                          transition: 'background-color 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          const count = currentData.categoryCounts[category.id] || 0;
                          if (count > 0) {
                            e.currentTarget.style.backgroundColor = '#F3F4F6';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!(selectedCurrentCell?.type === 'category' && selectedCurrentCell?.id === category.id)) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        {(currentData.categoryCounts[category.id] || 0) > 0 ? currentData.categoryCounts[category.id] : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ marginBottom: '16px' }}>
            {categoryChartSpec ? (
              <DynamicVegaChart spec={categoryChartSpec} language="vega-lite" />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                <p>表示するデータがありません。</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Biz-Devフェーズ推移 */}
      <div>
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Biz-Devフェーズ別数値の推移</h4>
          {/* カテゴリーフィルター */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>カテゴリーでフィルター:</label>
            <select
              value={selectedCategoryId || ''}
              onChange={(e) => setSelectedCategoryId(e.target.value || null)}
              style={{
                padding: '8px 36px 8px 12px',
                border: '1.5px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '13px',
                backgroundColor: '#FFFFFF',
                color: selectedCategoryId ? '#1F2937' : '#9CA3AF',
                fontWeight: selectedCategoryId ? '500' : '400',
                cursor: 'pointer',
                minWidth: '220px',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                transition: 'all 0.2s ease',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <option value="" style={{ color: '#9CA3AF' }}>すべてのカテゴリー</option>
              {filteredCategories.map(category => {
                const parentCategory = category.parentCategoryId 
                  ? categories.find(c => c.id === category.parentCategoryId)
                  : null;
                const label = parentCategory 
                  ? `${parentCategory.title} / ${category.title}` 
                  : category.title;
                return (
                  <option key={category.id} value={category.id} style={{ color: '#1F2937' }}>
                    {label}
                  </option>
                );
              })}
            </select>
            {selectedCategoryId && (
              <button
                onClick={() => setSelectedCategoryId(null)}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                  e.currentTarget.style.borderColor = '#D1D5DB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                クリア
              </button>
            )}
          </div>
        </div>
        {displayMode === 'table' ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F3F4F6', borderBottom: '2px solid #E5E7EB' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Biz-Devフェーズ</th>
                  {monthlyData.map(({ month }) => (
                    <th
                      key={month}
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: '600',
                      }}
                    >
                      {month}月
                    </th>
                  ))}
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontWeight: '600',
                    }}
                  >
                    12月
                  </th>
                  {januaryMarchData.map(({ month }) => (
                    <th
                      key={month}
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        fontWeight: '600',
                      }}
                    >
                      {month}月
                    </th>
                  ))}
                  <th
                    style={{
                      padding: '12px',
                      textAlign: 'center',
                      fontWeight: '600',
                    }}
                  >
                    現在
                  </th>
                </tr>
              </thead>
              <tbody>
                {bizDevPhases.map(phase => (
                  <tr key={phase.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{phase.title}</td>
                    {monthlyData.map(({ month, bizDevPhaseCounts: counts }) => {
                      const count = counts[phase.id] || 0;
                      return (
                        <td
                          key={month}
                          style={{
                            padding: '12px',
                            textAlign: 'center',
                          }}
                        >
                          {count > 0 ? count : '-'}
                        </td>
                      );
                    })}
                    <td
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                      }}
                    >
                      {(decemberData.bizDevPhaseCounts[phase.id] || 0) > 0 ? decemberData.bizDevPhaseCounts[phase.id] : '-'}
                    </td>
                    {januaryMarchData.map(({ month, bizDevPhaseCounts: counts }) => {
                      const count = counts[phase.id] || 0;
                      return (
                        <td
                          key={month}
                          style={{
                            padding: '12px',
                            textAlign: 'center',
                          }}
                        >
                          {count > 0 ? count : '-'}
                        </td>
                      );
                    })}
                    <td
                      onClick={() => {
                        const count = currentData.bizDevPhaseCounts[phase.id] || 0;
                        if (count > 0) {
                          setSelectedCurrentCell({ type: 'bizDevPhase', id: phase.id });
                        }
                      }}
                      style={{
                        padding: '12px',
                        textAlign: 'center',
                        cursor: (currentData.bizDevPhaseCounts[phase.id] || 0) > 0 ? 'pointer' : 'default',
                        backgroundColor: selectedCurrentCell?.type === 'bizDevPhase' && selectedCurrentCell?.id === phase.id ? '#EFF6FF' : 'transparent',
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        const count = currentData.bizDevPhaseCounts[phase.id] || 0;
                        if (count > 0) {
                          e.currentTarget.style.backgroundColor = '#F3F4F6';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!(selectedCurrentCell?.type === 'bizDevPhase' && selectedCurrentCell?.id === phase.id)) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {(currentData.bizDevPhaseCounts[phase.id] || 0) > 0 ? currentData.bizDevPhaseCounts[phase.id] : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            {bizDevPhaseChartSpec ? (
              <DynamicVegaChart spec={bizDevPhaseChartSpec} language="vega-lite" />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                <p>表示するデータがありません。</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 選択された「現在」セルのスタートアップ一覧 */}
      {selectedCurrentCell && getSelectedCurrentCellStartups.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <div style={{
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1A1A1A',
              margin: 0,
              fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
            }}>
              {selectedCurrentCell.type === 'category' 
                ? (() => {
                    const category = categories.find(c => c.id === selectedCurrentCell.id);
                    const parentCategory = category?.parentCategoryId 
                      ? categories.find(c => c.id === category.parentCategoryId)
                      : null;
                    return parentCategory ? `${parentCategory.title} / ${category?.title}` : category?.title;
                  })()
                : bizDevPhases.find(phase => phase.id === selectedCurrentCell.id)?.title} に紐づくスタートアップ
              <span style={{
                marginLeft: '8px',
                fontSize: '14px',
                fontWeight: '400',
                color: '#6B7280',
              }}>
                ({getSelectedCurrentCellStartups.length}件)
              </span>
            </h4>
            <button
              type="button"
              onClick={() => setSelectedCurrentCell(null)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                color: '#6B7280',
                backgroundColor: '#F3F4F6',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              閉じる
            </button>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
              ? '1fr' 
              : 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
          }}>
            {getSelectedCurrentCellStartups.map(startup => (
              <div
                key={startup.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (startup.organizationId && startup.id) {
                    // 静的エクスポートモードではwindow.location.hrefを使用
                    window.location.href = `/organization/startup?organizationId=${startup.organizationId}&startupId=${startup.id}`;
                  }
                }}
                style={{
                  padding: '16px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  cursor: startup.organizationId ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (startup.organizationId) {
                    e.currentTarget.style.borderColor = '#4262FF';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(66, 98, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  marginBottom: '8px',
                  fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                }}>
                  {startup.title}
                </div>
                {startup.createdAt && (() => {
                  const formattedDate = formatStartupDate(startup.createdAt);
                  return formattedDate ? (
                    <div style={{
                      fontSize: '12px',
                      color: '#9CA3AF',
                      marginTop: '8px',
                    }}>
                      作成日: {formattedDate}
                    </div>
                  ) : null;
                })()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

