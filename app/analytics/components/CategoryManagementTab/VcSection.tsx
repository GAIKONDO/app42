'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { VC, Startup, BizDevPhase } from '@/lib/orgApi';
import { useVcManagement } from '../../hooks/useVcManagement';
import { SubTabBar } from './SubTabBar';
import dynamic from 'next/dynamic';
import { formatStartupDate } from '@/lib/orgApi/utils';
import { StartupListModal } from './StartupListModal';

const DynamicVegaChart = dynamic(() => import('@/components/VegaChart'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      グラフを読み込み中...
    </div>
  ),
});

interface VcSectionProps {
  vcs: VC[];
  setVcs: React.Dispatch<React.SetStateAction<VC[]>>;
  startups: Startup[];
  bizDevPhases: BizDevPhase[];
  orderedBizDevPhases: BizDevPhase[];
  vcManagement: ReturnType<typeof useVcManagement>;
}

export function VcSection({
  vcs,
  setVcs,
  startups,
  bizDevPhases,
  orderedBizDevPhases,
  vcManagement,
}: VcSectionProps) {
  const router = useRouter();
  const [vcSubTab, setVcSubTab] = useState<'management' | 'diagram'>('diagram');
  const [viewMode, setViewMode] = useState<'diagram' | 'bar' | 'matrix'>('matrix');
  const [selectedBarVcId, setSelectedBarVcId] = useState<string | null>(null);
  const [selectedMatrixCell, setSelectedMatrixCell] = useState<{ vcId: string; bizDevPhaseId: string } | null>(null);
  const [selectedBizDevPhaseIds, setSelectedBizDevPhaseIds] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [showTotalStartupModal, setShowTotalStartupModal] = useState<boolean>(false);
  const [showMatchingStartupModal, setShowMatchingStartupModal] = useState<boolean>(false);

  // viewModeが'bar'以外に変更された時にフィルターをリセット
  useEffect(() => {
    if (viewMode !== 'bar') {
      setSelectedBizDevPhaseIds([]);
    }
  }, [viewMode]);

  // フィルター適用後のスタートアップを計算
  const filteredStartups = useMemo(() => {
    if (viewMode === 'bar' && selectedBizDevPhaseIds.length > 0) {
      return startups.filter(startup => {
        const hasBizDevPhase = (startup as any).bizDevPhase && selectedBizDevPhaseIds.includes((startup as any).bizDevPhase);
        return hasBizDevPhase;
      });
    }
    return startups;
  }, [startups, viewMode, selectedBizDevPhaseIds]);

  // 統計情報を計算
  const statistics = useMemo(() => {
    const vcCount = vcs.length;
    
    // 使用するスタートアップデータ（フィルター適用後）
    const startupsToUse = viewMode === 'bar' ? filteredStartups : startups;
    
    // 全企業数（フィルター適用後の全企業数）
    const totalStartupCount = startupsToUse.length;
    const totalStartups = startupsToUse;
    
    // 該当企業数（VCに紐づく企業、重複除去）
    const uniqueStartupIds = new Set<string>();
    const matchingStartups: Startup[] = [];
    startupsToUse.forEach(startup => {
      if (startup.relatedVCS && startup.relatedVCS.length > 0) {
        startup.relatedVCS.forEach(vcId => {
          if (vcs.some(vc => vc.id === vcId)) {
            if (!uniqueStartupIds.has(startup.id)) {
              uniqueStartupIds.add(startup.id);
              matchingStartups.push(startup);
            }
          }
        });
      }
    });
    
    return {
      vcCount,
      totalStartupCount,
      totalStartups,
      matchingStartupCount: uniqueStartupIds.size,
      matchingStartups,
    };
  }, [vcs, startups, viewMode, filteredStartups]);

  // VCごとのスタートアップ件数を集計（フィルター適用後）
  const vcChartData = useMemo(() => {
    const startupsToUse = viewMode === 'bar' ? filteredStartups : startups;
    return vcs.map(vc => {
      const relatedStartups = startupsToUse.filter(startup => 
        startup.relatedVCS && startup.relatedVCS.includes(vc.id)
      );
      
      return {
        vc: vc.title,
        vcId: vc.id,
        count: relatedStartups.length,
      };
    }).filter(item => item.count > 0); // 0件のVCは除外
  }, [vcs, startups, viewMode, filteredStartups]);

  // 棒グラフの仕様を生成
  const barChartSpec = useMemo(() => {
    if (vcChartData.length === 0) return null;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const chartHeight = isMobile ? 400 : 500;

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      description: 'VCごとのスタートアップ件数',
      width: 'container',
      height: chartHeight,
      padding: { top: 20, right: 20, bottom: 60, left: 60 },
      data: {
        values: vcChartData,
      },
      mark: {
        type: 'bar',
        tooltip: true,
        cursor: 'pointer',
        cornerRadiusTopLeft: 8,
        cornerRadiusTopRight: 8,
        stroke: '#FFFFFF',
        strokeWidth: 1,
      },
      encoding: {
        x: {
          field: 'vc',
          type: 'ordinal',
          title: 'VC',
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
          sort: {
            field: 'count',
            order: 'descending',
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
          field: 'vc',
          type: 'nominal',
          scale: {
            scheme: 'category10',
          },
          legend: null,
        },
        tooltip: [
          { field: 'vc', title: 'VC' },
          { field: 'count', title: 'スタートアップ件数', format: ',d' },
        ],
      },
      selection: {
        clicked_theme: {
          type: 'single',
          on: 'click',
          fields: ['vcId'],
          empty: 'none',
        },
      },
    };
  }, [vcChartData]);

  // 選択されたVCに紐づくスタートアップを取得（フィルター適用後）
  const getSelectedVcStartups = useMemo(() => {
    if (!selectedBarVcId) return [];

    const startupsToUse = viewMode === 'bar' ? filteredStartups : startups;
    return startupsToUse.filter(startup => 
      startup.relatedVCS && startup.relatedVCS.includes(selectedBarVcId)
    );
  }, [selectedBarVcId, startups, viewMode, filteredStartups]);

  // 選択されたVCのスタートアップをBiz-Devフェーズごとにグループ化
  const getSelectedVcStartupsByBizDevPhase = useMemo(() => {
    if (!selectedBarVcId || getSelectedVcStartups.length === 0) return new Map<string, { phase: BizDevPhase | null; startups: Startup[] }>();

    const grouped = new Map<string, { phase: BizDevPhase | null; startups: Startup[] }>();
    
    // Biz-Devフェーズ未設定のグループ
    const noPhaseStartups: Startup[] = [];
    
    getSelectedVcStartups.forEach(startup => {
      if (startup.bizDevPhase) {
        const phase = bizDevPhases.find(p => p.id === startup.bizDevPhase);
        if (phase) {
          const key = phase.id;
          if (!grouped.has(key)) {
            grouped.set(key, { phase, startups: [] });
          }
          grouped.get(key)!.startups.push(startup);
        } else {
          noPhaseStartups.push(startup);
        }
      } else {
        noPhaseStartups.push(startup);
      }
    });
    
    // Biz-Devフェーズ未設定のスタートアップがある場合は追加
    if (noPhaseStartups.length > 0) {
      grouped.set('no-phase', { phase: null, startups: noPhaseStartups });
    }
    
    return grouped;
  }, [selectedBarVcId, getSelectedVcStartups, bizDevPhases]);

  // マトリクスデータを生成（VC × Biz-Devフェーズ）
  // orderedBizDevPhasesとorderedVcsの順序を使用（管理タブの順序に合わせる）
  const matrixData = useMemo(() => {
    const data: Array<{
      vc: string;
      vcId: string;
      bizDevPhase: string;
      bizDevPhaseId: string;
      bizDevPhasePosition: number;
      count: number;
    }> = [];

    // orderedBizDevPhasesが空の場合はbizDevPhasesを使用（フォールバック）
    const phasesToUse = orderedBizDevPhases.length > 0 ? orderedBizDevPhases : bizDevPhases;
    // orderedVcsが空の場合はvcsを使用（フォールバック）
    const vcsToUse = vcManagement.orderedVcs.length > 0 ? vcManagement.orderedVcs : vcs;

    vcsToUse.forEach(vc => {
      phasesToUse.forEach((phase, index) => {
        const matchingStartups = startups.filter(startup => 
          startup.relatedVCS && startup.relatedVCS.includes(vc.id) &&
          (startup as any).bizDevPhase === phase.id
        );
        
        data.push({
          vc: vc.title,
          vcId: vc.id,
          bizDevPhase: phase.title,
          bizDevPhaseId: phase.id,
          // orderedBizDevPhasesのインデックスをpositionとして使用（管理タブの順序を反映）
          bizDevPhasePosition: index,
          count: matchingStartups.length,
        });
      });
    });

    return data;
  }, [vcs, bizDevPhases, orderedBizDevPhases, vcManagement.orderedVcs, startups]);

  // マトリクスチャートの仕様を生成
  const matrixChartSpec = useMemo(() => {
    if (matrixData.length === 0) return null;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const chartHeight = isMobile ? 400 : Math.max(400, bizDevPhases.length * 40 + 100);

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      description: 'VC × Biz-Devフェーズ マトリクス',
      width: 'container',
      height: chartHeight,
      padding: { top: 20, right: 20, bottom: 60, left: 120 },
      data: {
        values: matrixData,
      },
      layer: [
        // 1. 背景のrect（ヒートマップ）
        {
          mark: {
            type: 'rect',
            tooltip: true,
            cursor: 'pointer',
            stroke: '#FFFFFF',
            strokeWidth: 2,
          },
          encoding: {
            x: {
              field: 'vc',
              type: 'ordinal',
              title: 'VC',
              // orderedVcsの順序をdomainとして明示的に指定
              scale: {
                domain: (vcManagement.orderedVcs.length > 0 ? vcManagement.orderedVcs : vcs).map(v => v.title),
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
              field: 'bizDevPhase',
              type: 'ordinal',
              title: 'Biz-Devフェーズ',
              // orderedBizDevPhasesの順序をdomainとして明示的に指定
              scale: {
                domain: (orderedBizDevPhases.length > 0 ? orderedBizDevPhases : bizDevPhases).map(p => p.title),
              },
              axis: {
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
            color: {
              field: 'count',
              type: 'quantitative',
              scale: {
                scheme: 'blues',
                domain: [0, Math.max(...matrixData.map(d => d.count), 1)],
              },
              legend: {
                title: '件数',
                labelFontSize: isMobile ? 11 : 13,
                labelColor: '#6B7280',
                titleFontSize: isMobile ? 12 : 14,
                titleFontWeight: '600',
                titleColor: '#1A1A1A',
              },
            },
            tooltip: [
              { field: 'vc', title: 'VC' },
              { field: 'bizDevPhase', title: 'Biz-Devフェーズ' },
              { field: 'count', title: 'スタートアップ件数', format: ',d' },
            ],
          },
        },
        // 2. 数字のテキスト
        {
          mark: {
            type: 'text',
            fontSize: isMobile ? 12 : 14,
            fontWeight: '600',
            fill: '#1A1A1A',
            font: 'var(--font-inter), var(--font-noto), sans-serif',
          },
          encoding: {
            x: {
              field: 'vc',
              type: 'ordinal',
            },
            y: {
              field: 'bizDevPhase',
              type: 'ordinal',
            },
            text: {
              field: 'count',
              type: 'quantitative',
              format: 'd',
            },
            color: {
              condition: {
                test: 'datum.count > 0',
                value: '#1A1A1A',
              },
              value: '#9CA3AF',
            },
          },
        },
      ],
      selection: {
        clicked_theme: {
          type: 'single',
          on: 'click',
          fields: ['vcId', 'bizDevPhaseId'],
          empty: 'none',
        },
      },
    };
  }, [matrixData, bizDevPhases.length, orderedBizDevPhases, vcManagement.orderedVcs, vcs]);

  // 選択されたマトリクスセルに紐づくスタートアップを取得
  const getSelectedMatrixStartups = useMemo(() => {
    if (!selectedMatrixCell) return [];

    return startups.filter(startup => 
      startup.relatedVCS && startup.relatedVCS.includes(selectedMatrixCell.vcId) &&
      startup.bizDevPhase === selectedMatrixCell.bizDevPhaseId
    );
  }, [selectedMatrixCell, startups]);

  return (
    <>
      <div style={{ 
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1A1A1A',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          VC管理
        </h3>
        {vcSubTab === 'management' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => vcManagement.setShowEditVcsModal(true)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#1A1A1A',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #E0E0E0',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              編集
            </button>
            <button
              type="button"
              onClick={() => {
                vcManagement.setEditingVc(null);
                vcManagement.setVcFormTitle('');
                vcManagement.setVcFormDescription('');
                vcManagement.setShowVcModal(true);
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
              }}
            >
              VCを追加
            </button>
          </div>
        )}
      </div>

      <SubTabBar
        activeTab={vcSubTab}
        onTabChange={setVcSubTab}
        managementLabel="VC管理"
        diagramLabel="VC関係性図"
      />

      {/* VC管理サブタブ */}
      {vcSubTab === 'management' && (
        <div>
          {vcs.length === 0 ? (
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#FFFBF0', 
              border: '1.5px solid #FCD34D', 
              borderRadius: '8px',
              color: '#92400E',
              fontSize: '14px',
            }}>
              VCが見つかりません。VCを追加してください。
            </div>
          ) : (
            <div>
              {vcs.map((vc) => (
                <div
                  key={vc.id}
                  style={{
                    padding: '16px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E0E0E0',
                    borderRadius: '8px',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1A1A1A',
                    marginBottom: '8px',
                  }}>
                    {vc.title}
                  </div>
                  {vc.description && (
                    <div style={{
                      fontSize: '14px',
                      color: '#4B5563',
                    }}>
                      {vc.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VC関係性図サブタブ */}
      {vcSubTab === 'diagram' && (
        <div>
          {/* 統計情報カード */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
              ? '1fr' 
              : 'repeat(3, 1fr)',
            gap: typeof window !== 'undefined' && window.innerWidth < 768 ? '16px' : '20px',
            marginBottom: '24px',
          }}>
            {/* VC数カード */}
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
                VC数
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
                {statistics.vcCount}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#9CA3AF',
                fontWeight: '400',
                position: 'relative',
                zIndex: 1,
              }}>
                件のVC
              </div>
            </div>

            {/* 全企業数カード */}
            <div 
              onClick={() => setShowTotalStartupModal(true)}
              style={{
                padding: '24px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
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
                background: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)',
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
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                全企業数
                {viewMode === 'bar' && selectedBizDevPhaseIds.length > 0 && (
                  <span style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#4262FF',
                    backgroundColor: '#E0E8FF',
                    borderRadius: '4px',
                    textTransform: 'none',
                    letterSpacing: '0',
                  }}>
                    フィルター適用中
                  </span>
                )}
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
                {statistics.totalStartupCount}
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

            {/* 該当企業数カード */}
            <div 
              onClick={() => setShowMatchingStartupModal(true)}
              style={{
                padding: '24px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
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
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                該当企業数
                {viewMode === 'bar' && selectedBizDevPhaseIds.length > 0 && (
                  <span style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#4262FF',
                    backgroundColor: '#E0E8FF',
                    borderRadius: '4px',
                    textTransform: 'none',
                    letterSpacing: '0',
                  }}>
                    フィルター適用中
                  </span>
                )}
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
                {statistics.matchingStartupCount}
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

          {/* 表示モード選択 */}
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: viewMode === 'matrix' ? '600' : '400',
                color: viewMode === 'matrix' ? '#FFFFFF' : '#1A1A1A',
                backgroundColor: viewMode === 'matrix' ? '#4262FF' : '#FFFFFF',
                border: '1.5px solid',
                borderColor: viewMode === 'matrix' ? '#4262FF' : '#E0E0E0',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (viewMode !== 'matrix') {
                  e.currentTarget.style.borderColor = '#C4C4C4';
                  e.currentTarget.style.backgroundColor = '#FAFAFA';
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== 'matrix') {
                  e.currentTarget.style.borderColor = '#E0E0E0';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }
              }}
            >
              マトリクス
            </button>
            <button
              type="button"
              onClick={() => setViewMode('bar')}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: viewMode === 'bar' ? '600' : '400',
                color: viewMode === 'bar' ? '#FFFFFF' : '#1A1A1A',
                backgroundColor: viewMode === 'bar' ? '#4262FF' : '#FFFFFF',
                border: '1.5px solid',
                borderColor: viewMode === 'bar' ? '#4262FF' : '#E0E0E0',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
              onMouseEnter={(e) => {
                if (viewMode !== 'bar') {
                  e.currentTarget.style.borderColor = '#C4C4C4';
                  e.currentTarget.style.backgroundColor = '#FAFAFA';
                }
              }}
              onMouseLeave={(e) => {
                if (viewMode !== 'bar') {
                  e.currentTarget.style.borderColor = '#E0E0E0';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }
              }}
            >
              棒グラフ
            </button>
          </div>

          {/* Biz-Devフェーズフィルター（棒グラフ表示時のみ） */}
          {viewMode === 'bar' && (
            <div style={{ 
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
            }}>
              <div 
                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                style={{
                  marginBottom: isFilterExpanded ? '12px' : '0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1A1A1A',
                  fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  userSelect: 'none',
                }}
              >
                <span style={{
                  display: 'inline-block',
                  transform: isFilterExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  fontSize: '12px',
                }}>
                  ▶
                </span>
                Biz-Devフェーズでフィルター
                {selectedBizDevPhaseIds.length > 0 && (
                  <span style={{
                    marginLeft: '8px',
                    padding: '2px 6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#4262FF',
                    backgroundColor: '#E0E8FF',
                    borderRadius: '4px',
                  }}>
                    {selectedBizDevPhaseIds.length}件選択中
                  </span>
                )}
              </div>
              {isFilterExpanded && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}>
                  {bizDevPhases.map(phase => {
                    const isSelected = selectedBizDevPhaseIds.includes(phase.id);
                    return (
                      <label
                        key={phase.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          backgroundColor: isSelected ? '#E0E8FF' : '#FFFFFF',
                          border: `1.5px solid ${isSelected ? '#4262FF' : '#E0E0E0'}`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 150ms',
                          fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                          fontSize: '14px',
                          color: isSelected ? '#4262FF' : '#1A1A1A',
                          fontWeight: isSelected ? '500' : '400',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = '#F5F5F5';
                            e.currentTarget.style.borderColor = '#C4C4C4';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                            e.currentTarget.style.borderColor = '#E0E0E0';
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBizDevPhaseIds([...selectedBizDevPhaseIds, phase.id]);
                            } else {
                              setSelectedBizDevPhaseIds(selectedBizDevPhaseIds.filter(id => id !== phase.id));
                            }
                          }}
                          style={{
                            width: '16px',
                            height: '16px',
                            cursor: 'pointer',
                            accentColor: '#4262FF',
                          }}
                        />
                        <span>{phase.title}</span>
                      </label>
                    );
                  })}
                  {selectedBizDevPhaseIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedBizDevPhaseIds([])}
                      style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#6B7280',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E0E0E0',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 150ms',
                        fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F5F5F5';
                        e.currentTarget.style.borderColor = '#C4C4C4';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#E0E0E0';
                      }}
                    >
                      フィルターをクリア
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2D関係性図、棒グラフ、またはマトリクス */}
          {viewMode === 'matrix' ? (
            matrixChartSpec && matrixData.length > 0 ? (
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  padding: '24px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    marginBottom: '20px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #F3F4F6',
                  }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#1A1A1A',
                      margin: 0,
                      fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                    }}>
                      VC × Biz-Devフェーズ マトリクス
                    </h3>
                  </div>
                  <DynamicVegaChart
                    spec={matrixChartSpec}
                    language="vega-lite"
                    chartData={matrixData}
                    noBorder={true}
                    onSignal={(signalName: string, value: any) => {
                      console.log('VcSection matrix onSignal:', signalName, value);
                      if (signalName === 'clicked_theme' || signalName === 'click') {
                        if (value && value.datum) {
                          const datum = value.datum;
                          console.log('VcSection matrix datum:', datum);
                          if (datum.vcId && datum.bizDevPhaseId) {
                            console.log('Setting selectedMatrixCell:', { vcId: datum.vcId, bizDevPhaseId: datum.bizDevPhaseId });
                            setSelectedMatrixCell({ vcId: datum.vcId, bizDevPhaseId: datum.bizDevPhaseId });
                          }
                        } else if (value && value.vcId && value.bizDevPhaseId) {
                          console.log('Setting selectedMatrixCell from value:', { vcId: value.vcId, bizDevPhaseId: value.bizDevPhaseId });
                          setSelectedMatrixCell({ vcId: value.vcId, bizDevPhaseId: value.bizDevPhaseId });
                        }
                      }
                    }}
                  />
                </div>
                
                {/* 選択されたマトリクスセルのスタートアップ一覧 */}
                {selectedMatrixCell && getSelectedMatrixStartups.length > 0 && (
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
                        {vcs.find(vc => vc.id === selectedMatrixCell.vcId)?.title} × {bizDevPhases.find(phase => phase.id === selectedMatrixCell.bizDevPhaseId)?.title} に紐づくスタートアップ
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '14px',
                          fontWeight: '400',
                          color: '#6B7280',
                        }}>
                          ({getSelectedMatrixStartups.length}件)
                        </span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setSelectedMatrixCell(null)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '13px',
                          fontWeight: '500',
                          color: '#6B7280',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E0E0E0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 150ms',
                          fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F5F5F5';
                          e.currentTarget.style.borderColor = '#C4C4C4';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                          e.currentTarget.style.borderColor = '#E0E0E0';
                        }}
                      >
                        閉じる
                      </button>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                      gap: '16px',
                    }}>
                      {getSelectedMatrixStartups.map((startup) => (
                        <div
                          key={startup.id}
                          onClick={() => {
                            if (startup.organizationId && startup.id) {
                              router.push(`/organization/startup?organizationId=${startup.organizationId}&startupId=${startup.id}`);
                            }
                          }}
                          style={{
                            padding: '16px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F9FAFB';
                            e.currentTarget.style.borderColor = '#3B82F6';
                            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#FFFFFF';
                            e.currentTarget.style.borderColor = '#E5E7EB';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <h5 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#1A1A1A',
                            margin: '0 0 8px 0',
                            fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                          }}>
                            {startup.title}
                          </h5>
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
            ) : (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                color: '#6B7280',
                fontSize: '14px',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}>
                データがありません。
              </div>
            )
          ) : viewMode === 'bar' ? (
            barChartSpec && vcChartData.length > 0 ? (
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  padding: '24px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    marginBottom: '20px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #F3F4F6',
                  }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#1A1A1A',
                      margin: 0,
                      fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                    }}>
                      VC別スタートアップ件数
                    </h3>
                  </div>
                  <DynamicVegaChart
                    spec={barChartSpec}
                    language="vega-lite"
                    chartData={vcChartData}
                    noBorder={true}
                    onSignal={(signalName: string, value: any) => {
                      // VegaChartのクリックイベントを処理
                      console.log('VcSection onSignal:', signalName, value);
                      if (signalName === 'clicked_theme' || signalName === 'click') {
                        // value.datumからVC情報を取得
                        if (value && value.datum) {
                          const datum = value.datum;
                          console.log('VcSection datum:', datum);
                          // VC IDがある場合は直接使用、なければVC名から検索
                          if (datum.vcId) {
                            console.log('Setting selectedBarVcId from datum.vcId:', datum.vcId);
                            setSelectedBarVcId(datum.vcId);
                          } else if (datum.vc) {
                            const clickedVc = vcs.find(vc => vc.title === datum.vc);
                            if (clickedVc) {
                              console.log('Setting selectedBarVcId from datum.vc:', clickedVc.id);
                              setSelectedBarVcId(clickedVc.id);
                            }
                          }
                        } else if (value && value.vcId) {
                          console.log('Setting selectedBarVcId from value.vcId:', value.vcId);
                          setSelectedBarVcId(value.vcId);
                        } else if (value && value.vc) {
                          const clickedVc = vcs.find(vc => vc.title === value.vc);
                          if (clickedVc) {
                            console.log('Setting selectedBarVcId from value.vc:', clickedVc.id);
                            setSelectedBarVcId(clickedVc.id);
                          }
                        }
                      }
                    }}
                  />
                </div>
                
                {/* 選択されたVCのスタートアップ一覧 */}
                {selectedBarVcId && getSelectedVcStartups.length > 0 && (
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
                        {vcs.find(vc => vc.id === selectedBarVcId)?.title} に紐づくスタートアップ
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '14px',
                          fontWeight: '400',
                          color: '#6B7280',
                        }}>
                          ({getSelectedVcStartups.length}件)
                        </span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => setSelectedBarVcId(null)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '13px',
                          fontWeight: '500',
                          color: '#6B7280',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E0E0E0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 150ms',
                          fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F5F5F5';
                          e.currentTarget.style.borderColor = '#C4C4C4';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                          e.currentTarget.style.borderColor = '#E0E0E0';
                        }}
                      >
                        閉じる
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                      {(() => {
                        // orderedBizDevPhasesの順序に従ってソート
                        const entries = Array.from(getSelectedVcStartupsByBizDevPhase.entries());
                        const sortedEntries = entries.sort(([phaseIdA], [phaseIdB]) => {
                          // Biz-Devフェーズ未設定は最後に
                          if (phaseIdA === 'no-phase') return 1;
                          if (phaseIdB === 'no-phase') return -1;
                          
                          // orderedBizDevPhasesの順序に従ってソート
                          const indexA = orderedBizDevPhases.findIndex(p => p.id === phaseIdA);
                          const indexB = orderedBizDevPhases.findIndex(p => p.id === phaseIdB);
                          
                          // どちらもorderedBizDevPhasesにない場合は元の順序を維持
                          if (indexA === -1 && indexB === -1) return 0;
                          if (indexA === -1) return 1;
                          if (indexB === -1) return -1;
                          
                          return indexA - indexB;
                        });
                        
                        return sortedEntries.map(([phaseId, { phase, startups: phaseStartups }]) => (
                          <div key={phaseId}>
                          <div style={{
                            marginBottom: '16px',
                            paddingBottom: '12px',
                            borderBottom: '2px solid #E5E7EB',
                          }}>
                            <h5 style={{
                              fontSize: '16px',
                              fontWeight: '600',
                              color: '#1A1A1A',
                              margin: 0,
                              fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                            }}>
                              {phase ? phase.title : 'Biz-Devフェーズ未設定'}
                              <span style={{
                                marginLeft: '8px',
                                fontSize: '14px',
                                fontWeight: '400',
                                color: '#6B7280',
                              }}>
                                ({phaseStartups.length}件)
                              </span>
                            </h5>
                          </div>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '16px',
                          }}>
                            {phaseStartups.map((startup) => (
                              <div
                                key={startup.id}
                                onClick={() => {
                                  if (startup.organizationId && startup.id) {
                                    router.push(`/organization/startup?organizationId=${startup.organizationId}&startupId=${startup.id}`);
                                  }
                                }}
                                style={{
                                  padding: '16px',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #E5E7EB',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                                  e.currentTarget.style.borderColor = '#3B82F6';
                                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                                  e.currentTarget.style.borderColor = '#E5E7EB';
                                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }}
                              >
                                <h5 style={{
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  color: '#1A1A1A',
                                  margin: '0 0 8px 0',
                                  fontFamily: 'var(--font-inter), var(--font-noto), sans-serif',
                                }}>
                                  {startup.title}
                                </h5>
                                {startup.createdAt && (() => {
                                  const { formatStartupDate } = require('@/lib/orgApi/utils');
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
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                backgroundColor: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                color: '#6B7280',
                fontSize: '14px',
                fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}>
                データがありません。
              </div>
            )
          ) : (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          color: '#6B7280',
          fontSize: '14px',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          VC関係性図は準備中です。
            </div>
          )}
        </div>
      )}

      {/* スタートアップ一覧モーダル */}
      <StartupListModal
        isOpen={showTotalStartupModal}
        onClose={() => setShowTotalStartupModal(false)}
        startups={statistics.totalStartups || []}
        title="全スタートアップ一覧"
      />
      <StartupListModal
        isOpen={showMatchingStartupModal}
        onClose={() => setShowMatchingStartupModal(false)}
        startups={statistics.matchingStartups || []}
        title="該当スタートアップ一覧"
      />
    </>
  );
}

