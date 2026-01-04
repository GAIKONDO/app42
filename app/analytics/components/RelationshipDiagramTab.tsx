/**
 * 関係性図タブコンテンツ
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { RelationshipNode } from '@/components/RelationshipDiagram2D';
import { getFocusInitiatives } from '@/lib/orgApi';
import { getOrgTreeFromDb, getAllOrganizationsFromTree, type OrgNodeData } from '@/lib/orgApi';
import dynamic from 'next/dynamic';
import ThemeSelector from './ThemeSelector';
import TypeFilter from './TypeFilter';
import ViewModeSelector from './ViewModeSelector';
import ThemeModal from '../modals/ThemeModal';
import DeleteThemeModal from '../modals/DeleteThemeModal';
import EditThemesModal from '../modals/EditThemesModal';
import { useThemeManagement } from '../hooks/useThemeManagement';
import { useRelationshipDiagramData } from '../hooks/useRelationshipDiagramData';
import { devLog } from '../utils/devLog';
import type { Theme, FocusInitiative, TopicInfo, Startup } from '@/lib/orgApi';
import { getAllStartups } from '@/lib/orgApi';

const DynamicVegaChart = dynamic(() => import('@/components/VegaChart'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      グラフを読み込み中...
    </div>
  ),
});

const DynamicRelationshipDiagram2D = dynamic(() => import('@/components/RelationshipDiagram2D'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      関係性図を読み込み中...
    </div>
  ),
});

const DynamicRelationshipBubbleChart = dynamic(() => import('@/components/RelationshipBubbleChart'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      バブルチャートを読み込み中...
    </div>
  ),
});

interface RelationshipDiagramTabProps {
  selectedThemeId: string | null;
  viewMode: 'diagram' | 'bubble' | 'bar';
  selectedTypeFilter: 'all' | 'organization' | 'company' | 'person';
  themes: Theme[];
  setThemes: (themes: Theme[]) => void;
  initiatives: FocusInitiative[];
  startups: Startup[];
  orgData: OrgNodeData | null;
  topics: TopicInfo[];
  setTopics: (topics: Topic[]) => void;
  refreshThemes: () => Promise<void>;
  refreshTopics: () => Promise<void>;
  onSelectedThemeIdChange: (themeId: string | null) => void;
  onViewModeChange: (mode: 'diagram' | 'bubble' | 'bar') => void;
  onTypeFilterChange: (filter: 'all' | 'organization' | 'company' | 'person') => void;
}

export function RelationshipDiagramTab({
  selectedThemeId,
  viewMode,
  selectedTypeFilter,
  themes,
  setThemes,
  initiatives,
  startups,
  orgData,
  topics,
  setTopics,
  refreshThemes,
  refreshTopics,
  onSelectedThemeIdChange,
  onViewModeChange,
  onTypeFilterChange,
}: RelationshipDiagramTabProps) {
  const themeManagement = useThemeManagement(themes, setThemes);
  const [selectedThemeStartups, setSelectedThemeStartups] = useState<Startup[]>([]);
  const [loadingStartups, setLoadingStartups] = useState(false);

  useEffect(() => {
    if (themes.length > 0) {
      themeManagement.initializeOrderedThemes(themes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themes]);

  // selectedThemeIdが変更されたとき、またはviewModeが'bar'以外になったときにスタートアップリストをクリア
  useEffect(() => {
    if (viewMode !== 'bar' || !selectedThemeId) {
      setSelectedThemeStartups([]);
    }
  }, [selectedThemeId, viewMode]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { nodes, links } = useRelationshipDiagramData({
    selectedThemeId,
    themes,
    initiatives,
    startups,
    orgData,
    topics,
    selectedTypeFilter,
  });

  // テーマに関連するスタートアップを判定するヘルパー関数（barChartDataとクリック時の処理で共通使用）
  const isStartupRelatedToTheme = useCallback((startup: Startup, themeId: string): boolean => {
    // themeIdまたはthemeIdsで関連付けられているスタートアップを取得
    if (startup.themeId === themeId) {
      return true;
    }
    if (Array.isArray(startup.themeIds) && startup.themeIds.includes(themeId)) {
      return true;
    }
    // themeIdsが文字列（JSON）の場合もパースしてチェック
    if (typeof startup.themeIds === 'string') {
      try {
        const parsed = JSON.parse(startup.themeIds);
        if (Array.isArray(parsed) && parsed.includes(themeId)) {
          return true;
        }
      } catch (e) {
        // パースエラーは無視
      }
    }
    return false;
  }, []);

  // 棒グラフ用のデータを生成（テーマごとのスタートアップ数）
  const barChartData = useMemo(() => {
    const themesToShow = selectedThemeId
      ? themes.filter((t) => t.id === selectedThemeId)
      : themes;

    return themesToShow.map(theme => {
      // テーマに関連するスタートアップをカウント
      const relatedStartups = startups.filter((startup) => isStartupRelatedToTheme(startup, theme.id));

      return {
        theme: theme.title,
        themeId: theme.id,
        count: relatedStartups.length,
      };
    }).filter(item => {
      // 選択されていない場合は、0件でも表示
      if (!selectedThemeId) return true;
      // 選択されている場合は、選択されたテーマのみ表示（0件でも表示）
      return item.themeId === selectedThemeId;
    });
  }, [themes, startups, selectedThemeId, isStartupRelatedToTheme]);

  // 棒グラフの仕様を生成
  const barChartSpec = useMemo(() => {
    // 選択されたテーマがある場合は、そのテーマが0件でも表示する
    if (barChartData.length === 0 && !selectedThemeId) return null;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const chartHeight = isMobile ? 400 : 500;

    // テーマのリストを取得（position順にソート）
    const themeList = themes
      .filter(theme => barChartData.some(d => d.themeId === theme.id))
      .sort((a, b) => {
        const posA = a.position ?? 999999;
        const posB = b.position ?? 999999;
        return posA - posB;
      })
      .map(t => t.title);

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      description: 'テーマごとのスタートアップ件数',
      width: 'container',
      height: chartHeight,
      padding: { top: 20, right: 20, bottom: 60, left: 60 },
      data: {
        values: barChartData,
      },
      mark: {
        type: 'bar',
        tooltip: true,
        cursor: 'pointer',
        cornerRadiusTopLeft: 8,
        cornerRadiusTopRight: 8,
      },
      encoding: {
        x: {
          field: 'theme',
          type: 'ordinal',
          title: 'テーマ',
          scale: {
            domain: themeList,
          },
          axis: {
            labelAngle: isMobile ? -90 : -45,
            labelLimit: isMobile ? 50 : 120,
            labelFontSize: isMobile ? 11 : 13,
            labelColor: '#4B5563',
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
          title: 'スタートアップ件数',
          axis: {
            grid: true,
            gridColor: '#F3F4F6',
            gridOpacity: 0.5,
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
          field: 'theme',
          type: 'nominal',
          scale: {
            scheme: 'category10',
          },
          legend: null,
        },
        tooltip: [
          { field: 'theme', type: 'nominal', title: 'テーマ' },
          { field: 'count', type: 'quantitative', title: '件数', format: 'd' },
        ],
      },
      selection: {
        clicked_theme: {
          type: 'single',
          on: 'click',
          fields: ['themeId'],
          empty: 'none',
        },
      },
      config: {
        view: {
          stroke: 'transparent',
        },
        background: 'transparent',
        axis: {
          labelFont: 'var(--font-inter), var(--font-noto), sans-serif',
          titleFont: 'var(--font-inter), var(--font-noto), sans-serif',
        },
      },
    };
  }, [barChartData, themes]);

  const handleNodeClick = (node: RelationshipNode) => {
    // ノードクリック時の処理（必要に応じて実装）
  };

  // デバッグ用: BPOビジネス課のAriel社協業のトピック数を確認する関数をグローバルに公開
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).checkArielTopics = async () => {
        try {
          devLog('=== BPOビジネス課のAriel社協業のトピック数を確認 ===\n');
          
          // 組織ツリーを取得
          const orgTree = await getOrgTreeFromDb();
          if (!orgTree) {
            console.error('❌ 組織ツリーの取得に失敗しました');
            return;
          }
          
          // BPOビジネス課の組織IDを検索
          const { getAllOrganizationsFromTree } = await import('@/lib/orgApi');
          const allOrgs = getAllOrganizationsFromTree(orgTree);
          const bpoOrg = allOrgs.find(org => 
            org.name === 'BPOビジネス課' || 
            org.name === 'ＢＰＯビジネス課' ||
            org.title === 'BPO Business Section'
          );
          
          if (!bpoOrg) {
            console.error('❌ BPOビジネス課が見つかりませんでした');
            devLog('利用可能な組織数:', allOrgs.length);
            return;
          }
          
          devLog(`✅ BPOビジネス課の組織ID: ${bpoOrg.id}\n`);
          
          // BPOビジネス課の注力施策を取得
          const bpoInitiatives = await getFocusInitiatives(bpoOrg.id);
          devLog(`📊 BPOビジネス課の注力施策数: ${bpoInitiatives.length}件\n`);
          
          // Ariel社協業を検索
          const arielInitiative = bpoInitiatives.find(init => 
            init.title.includes('Ariel') || 
            init.title.includes('アリエル') ||
            init.title.includes('協業')
          );
          
          if (!arielInitiative) {
            console.error('❌ Ariel社協業の注力施策が見つかりませんでした');
            devLog('利用可能な注力施策数:', bpoInitiatives.length);
            return;
          }
          
          devLog(`✅ 注力施策が見つかりました:`);
          devLog(`   ID: ${arielInitiative.id}`);
          devLog(`   タイトル: ${arielInitiative.title}`);
          devLog(`   トピック数: ${arielInitiative.topicIds ? arielInitiative.topicIds.length : 0}件\n`);
          
          if (arielInitiative.topicIds && arielInitiative.topicIds.length > 0) {
            devLog('📋 紐づけられているトピックID数:', arielInitiative.topicIds.length);
          } else {
            devLog('⚠️ トピックが紐づけられていません');
          }
          
          devLog('\n=== 確認完了 ===');
          return {
            initiativeId: arielInitiative.id,
            title: arielInitiative.title,
            topicIds: arielInitiative.topicIds || [],
            topicCount: arielInitiative.topicIds ? arielInitiative.topicIds.length : 0,
          };
        } catch (error: any) {
          console.error('❌ エラーが発生しました:', error);
          console.error('エラー詳細:', error.stack);
          throw error;
        }
      };
      // 既に読み込まれているデータから確認する関数も追加
      (window as any).checkArielTopicsFromLoadedData = () => {
        try {
          devLog('=== 読み込まれているデータから確認 ===\n');
          
          // BPOビジネス課の組織IDを検索
          if (!orgData) {
            console.error('❌ 組織データが読み込まれていません');
            return;
          }
          
          const { getAllOrganizationsFromTree } = require('@/lib/orgApi');
          const allOrgs = getAllOrganizationsFromTree(orgData);
          const bpoOrg = allOrgs.find((org: OrgNodeData) =>
            org.name === 'BPOビジネス課' ||
            org.name === 'ＢＰＯビジネス課' ||
            org.title === 'BPO Business Section'
          );
          
          if (!bpoOrg) {
            console.error('❌ BPOビジネス課が見つかりませんでした');
            return;
          }
          
          devLog(`✅ BPOビジネス課の組織ID: ${bpoOrg.id}\n`);
          
          // 読み込まれている注力施策から検索
          const bpoInitiatives = initiatives.filter(init => init.organizationId === bpoOrg.id);
          devLog(`📊 BPOビジネス課の注力施策数: ${bpoInitiatives.length}件\n`);
          
          // Ariel社協業を検索
          const arielInitiative = bpoInitiatives.find(init => 
            init.title.includes('Ariel') || 
            init.title.includes('アリエル') ||
            init.title.includes('協業')
          );
          
          if (!arielInitiative) {
            console.error('❌ Ariel社協業の注力施策が見つかりませんでした');
            devLog('利用可能な注力施策数:', bpoInitiatives.length);
            return;
          }
          
          devLog(`✅ 注力施策が見つかりました:`);
          devLog(`   ID: ${arielInitiative.id}`);
          devLog(`   タイトル: ${arielInitiative.title}`);
          devLog(`   トピック数: ${arielInitiative.topicIds ? arielInitiative.topicIds.length : 0}件\n`);
          
          if (arielInitiative.topicIds && arielInitiative.topicIds.length > 0) {
            devLog('📋 紐づけられているトピックID数:', arielInitiative.topicIds.length);
          } else {
            devLog('⚠️ トピックが紐づけられていません');
          }
          
          devLog('\n=== 確認完了 ===');
          return {
            initiativeId: arielInitiative.id,
            title: arielInitiative.title,
            topicIds: arielInitiative.topicIds || [],
            topicCount: arielInitiative.topicIds ? arielInitiative.topicIds.length : 0,
          };
        } catch (error: any) {
          console.error('❌ エラーが発生しました:', error);
          console.error('エラー詳細:', error.stack);
          throw error;
        }
      };
      
      devLog('✅ checkArielTopics() 関数が利用可能になりました。ブラウザのコンソールで実行してください。');
      devLog('✅ checkArielTopicsFromLoadedData() 関数も利用可能です（読み込まれているデータから確認）。');
    }
  }, [orgData, initiatives, topics]);

  return (
    <>
      <TypeFilter
        selectedTypeFilter={selectedTypeFilter}
        onFilterChange={onTypeFilterChange}
      />

      <ViewModeSelector
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />

      {/* テーマ選択 */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px',
        }}>
          <label style={{ 
            fontWeight: '500',
            fontSize: '14px',
            color: '#1A1A1A',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            テーマを選択
            {themes.length > 0 && (
              <span style={{ 
                fontSize: '12px', 
                color: '#808080', 
                fontWeight: '400',
                marginLeft: '8px',
              }}>
                ({themes.length}件)
              </span>
            )}
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                themeManagement.setShowEditThemesModal(true);
              }}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#1A1A1A',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #E0E0E0',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 150ms',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#C4C4C4';
                e.currentTarget.style.backgroundColor = '#FAFAFA';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E0E0E0';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M11.333 2.00001C11.5084 1.82465 11.7163 1.68571 11.9447 1.59203C12.1731 1.49835 12.4173 1.4519 12.6637 1.45564C12.9101 1.45938 13.1533 1.51324 13.3788 1.6139C13.6043 1.71456 13.8075 1.8598 13.9767 2.04068C14.1459 2.22156 14.2775 2.43421 14.3639 2.66548C14.4503 2.89675 14.4896 3.14195 14.4795 3.38801C14.4694 3.63407 14.4101 3.8759 14.305 4.09868C14.1999 4.32146 14.0512 4.52059 13.8673 4.68401L5.54001 13.0113L1.33334 14.3333L2.65534 10.1267L11.333 2.00001Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              編集
            </button>
            <button
              type="button"
              onClick={() => {
                themeManagement.setEditingTheme(null);
                themeManagement.setThemeFormTitle('');
                themeManagement.setThemeFormDescription('');
                themeManagement.setShowThemeModal(true);
              }}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#FFFFFF',
                backgroundColor: '#4262FF',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 150ms',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#3151CC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4262FF';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3V13M3 8H13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              テーマを追加
            </button>
          </div>
        </div>
        {themes.length === 0 ? (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#FFFBF0', 
            border: '1.5px solid #FCD34D', 
            borderRadius: '8px',
            color: '#92400E',
            fontSize: '14px',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            テーマが見つかりません。テーマを追加してください。
          </div>
        ) : (
          <ThemeSelector
            themes={themes}
            selectedThemeId={selectedThemeId}
            onSelect={(themeId) => {
              devLog('テーマを選択:', themeId);
              onSelectedThemeIdChange(themeId);
            }}
          />
        )}
      </div>

      {/* 2D関係性図、バブルチャート、または棒グラフ */}
      {/* テーマが存在する場合は、組織や注力施策、トピックが0件でも、テーマが選択されていなくても（すべて表示）表示 */}
      {(nodes.length > 0 || themes.length > 0 || viewMode === 'bar') ? (
        <div style={{ marginBottom: '32px' }}>
          {viewMode === 'diagram' ? (
            <DynamicRelationshipDiagram2D
              width={1200}
              height={800}
              nodes={nodes}
              links={links}
              selectedThemeId={selectedThemeId ?? undefined}
              onNodeClick={handleNodeClick}
              onTopicMetadataSaved={refreshTopics}
              maxNodes={1000}
            />
          ) : viewMode === 'bubble' ? (
            <DynamicRelationshipBubbleChart
              width={1200}
              height={800}
              nodes={nodes}
              links={links}
              onNodeClick={handleNodeClick}
            />
          ) : viewMode === 'bar' ? (
            barChartSpec ? (
              <div>
                <DynamicVegaChart
                  spec={barChartSpec}
                  chartData={barChartData}
                  onSignal={async (signalName: string, value: any) => {
                    // VegaChartのクリックイベントを処理
                    if (signalName === 'clicked_theme' && value && value.themeId) {
                      console.log('🔍 [棒グラフ] テーマクリック:', value.themeId);
                      onSelectedThemeIdChange(value.themeId);
                      
                      // 最新のスタートアップデータを取得（Supabaseから）
                      try {
                        setLoadingStartups(true);
                        const allStartups = await getAllStartups();
                        console.log('📖 [棒グラフ] 全スタートアップ取得:', allStartups.length, '件');
                        
                        // barChartDataの生成ロジックと同じ方法でフィルタリング
                        const relatedStartups = allStartups.filter((startup) => {
                          const isRelated = isStartupRelatedToTheme(startup, value.themeId);
                          if (isRelated) {
                            console.log('✅ [棒グラフ] 関連スタートアップ:', {
                              id: startup.id,
                              title: startup.title,
                              themeId: startup.themeId,
                              themeIds: startup.themeIds,
                              themeIdsType: typeof startup.themeIds,
                              themeIdsIsArray: Array.isArray(startup.themeIds),
                            });
                          }
                          return isRelated;
                        });
                        
                        console.log('📖 [棒グラフ] 選択テーマに紐づくスタートアップ:', relatedStartups.length, '件', {
                          themeId: value.themeId,
                          allStartupsCount: allStartups.length,
                          relatedStartupsCount: relatedStartups.length,
                          sampleStartup: relatedStartups.length > 0 ? {
                            id: relatedStartups[0].id,
                            title: relatedStartups[0].title,
                            themeId: relatedStartups[0].themeId,
                            themeIds: relatedStartups[0].themeIds,
                            themeIdsType: typeof relatedStartups[0].themeIds,
                            themeIdsIsArray: Array.isArray(relatedStartups[0].themeIds),
                          } : null,
                        });
                        setSelectedThemeStartups(relatedStartups);
                      } catch (error) {
                        console.error('❌ [棒グラフ] スタートアップ取得エラー:', error);
                        setSelectedThemeStartups([]);
                      } finally {
                        setLoadingStartups(false);
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div style={{ 
                padding: '60px', 
                textAlign: 'center', 
                color: '#808080',
                fontSize: '14px',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                backgroundColor: '#FAFAFA',
                borderRadius: '8px',
                border: '1px dashed #E0E0E0',
              }}>
                表示するデータがありません
              </div>
            )
          ) : null}
          
          {/* 選択されたテーマに紐づくスタートアップのリスト（棒グラフ表示時のみ） */}
          {viewMode === 'bar' && selectedThemeId && (
            <div style={{ marginTop: '32px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1A1A1A',
                marginBottom: '16px',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}>
                {themes.find(t => t.id === selectedThemeId)?.title || '選択されたテーマ'}に紐づくスタートアップ
                {loadingStartups && (
                  <span style={{ marginLeft: '8px', fontSize: '14px', color: '#808080', fontWeight: '400' }}>
                    (読み込み中...)
                  </span>
                )}
              </h3>
              
              {loadingStartups ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#808080',
                  fontSize: '14px',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}>
                  データを読み込み中...
                </div>
              ) : selectedThemeStartups.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '16px',
                }}>
                  {selectedThemeStartups.map((startup) => (
                    <div
                      key={startup.id}
                      style={{
                        padding: '16px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E0E0E0',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#4262FF';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(66, 98, 255, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#E0E0E0';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1A1A1A',
                        marginBottom: '8px',
                        fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      }}>
                        {startup.title}
                      </h4>
                      {startup.description && (
                        <p style={{
                          fontSize: '14px',
                          color: '#666',
                          margin: 0,
                          lineHeight: '1.5',
                          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {startup.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#808080',
                  fontSize: '14px',
                  fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                  backgroundColor: '#FAFAFA',
                  borderRadius: '8px',
                  border: '1px dashed #E0E0E0',
                }}>
                  選択されたテーマに紐づくスタートアップがありません
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ 
          padding: '60px', 
          textAlign: 'center', 
          color: '#808080',
          fontSize: '14px',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          backgroundColor: '#FAFAFA',
          borderRadius: '8px',
          border: '1px dashed #E0E0E0',
          marginBottom: '32px',
        }}>
          テーマを選択すると関係性図が表示されます。
        </div>
      )}

      <ThemeModal
        isOpen={themeManagement.showThemeModal}
        editingTheme={themeManagement.editingTheme}
        themeFormTitle={themeManagement.themeFormTitle}
        themeFormDescription={themeManagement.themeFormDescription}
        showEditThemesModal={themeManagement.showEditThemesModal}
        onClose={() => {
          themeManagement.setShowThemeModal(false);
          themeManagement.setEditingTheme(null);
          themeManagement.setThemeFormTitle('');
          themeManagement.setThemeFormDescription('');
        }}
        onTitleChange={themeManagement.setThemeFormTitle}
        onDescriptionChange={themeManagement.setThemeFormDescription}
        onThemeSaved={(themes) => {
          setThemes(themes);
          themeManagement.initializeOrderedThemes(themes);
        }}
        onEditThemesModalReopen={() => themeManagement.setShowEditThemesModal(true)}
      />

      <DeleteThemeModal
        isOpen={themeManagement.showDeleteModal}
        themeToDelete={themeManagement.themeToDelete}
        selectedThemeId={selectedThemeId}
        onClose={() => {
          themeManagement.setShowDeleteModal(false);
          themeManagement.setThemeToDelete(null);
        }}
        onDelete={async () => {
          await themeManagement.refreshThemes();
        }}
        onSelectedThemeChange={onSelectedThemeIdChange}
      />

      <EditThemesModal
        isOpen={themeManagement.showEditThemesModal}
        orderedThemes={themeManagement.orderedThemes}
        sensors={sensors}
        onClose={() => themeManagement.setShowEditThemesModal(false)}
        onDragEnd={themeManagement.handleDragEnd}
        onEdit={(theme) => {
          themeManagement.setEditingTheme(theme);
          themeManagement.setThemeFormTitle(theme.title);
          themeManagement.setThemeFormDescription(theme.description || '');
          themeManagement.setShowEditThemesModal(false);
          themeManagement.setShowThemeModal(true);
        }}
        onDelete={(theme) => {
          themeManagement.setThemeToDelete(theme);
          themeManagement.setShowDeleteModal(true);
        }}
      />
    </>
  );
}

