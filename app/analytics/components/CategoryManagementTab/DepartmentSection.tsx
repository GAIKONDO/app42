'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Department, Startup, BizDevPhase } from '@/lib/orgApi';
import { useDepartmentManagement } from '../../hooks/useDepartmentManagement';
import { SubTabBar } from './SubTabBar';
import dynamic from 'next/dynamic';
import { formatStartupDate } from '@/lib/orgApi/utils';

const DynamicVegaChart = dynamic(() => import('@/components/VegaChart'), {
  ssr: false,
  loading: () => (
    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
      グラフを読み込み中...
    </div>
  ),
});

interface DepartmentSectionProps {
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  startups: Startup[];
  bizDevPhases: BizDevPhase[];
  orderedBizDevPhases: BizDevPhase[];
  departmentManagement: ReturnType<typeof useDepartmentManagement>;
}

export function DepartmentSection({
  departments,
  setDepartments,
  startups,
  bizDevPhases,
  orderedBizDevPhases,
  departmentManagement,
}: DepartmentSectionProps) {
  const router = useRouter();
  const [departmentSubTab, setDepartmentSubTab] = useState<'management' | 'diagram'>('diagram');
  const [viewMode, setViewMode] = useState<'diagram' | 'bar' | 'matrix'>('matrix');
  const [selectedMatrixCell, setSelectedMatrixCell] = useState<{ departmentId: string; bizDevPhaseId: string } | null>(null);

  // 統計情報を計算
  const statistics = useMemo(() => {
    const departmentCount = departments.length;
    
    // 関連スタートアップ数（重複除去）
    const uniqueStartupIds = new Set<string>();
    startups.forEach(startup => {
      if (startup.responsibleDepartments && startup.responsibleDepartments.length > 0) {
        startup.responsibleDepartments.forEach(deptId => {
          if (departments.some(dept => dept.id === deptId)) {
            uniqueStartupIds.add(startup.id);
          }
        });
      }
    });
    
    return {
      departmentCount,
      startupCount: uniqueStartupIds.size,
    };
  }, [departments, startups]);

  // マトリクスデータを生成（部署 × Biz-Devフェーズ）
  // orderedBizDevPhasesとorderedDepartmentsの順序を使用（管理タブの順序に合わせる）
  const matrixData = useMemo(() => {
    const data: Array<{
      department: string;
      departmentId: string;
      bizDevPhase: string;
      bizDevPhaseId: string;
      bizDevPhasePosition: number;
      count: number;
    }> = [];

    // orderedBizDevPhasesが空の場合はbizDevPhasesを使用（フォールバック）
    const phasesToUse = orderedBizDevPhases.length > 0 ? orderedBizDevPhases : bizDevPhases;
    // orderedDepartmentsが空の場合はdepartmentsを使用（フォールバック）
    const departmentsToUse = departmentManagement.orderedDepartments.length > 0 ? departmentManagement.orderedDepartments : departments;

    departmentsToUse.forEach(dept => {
      phasesToUse.forEach((phase, index) => {
        const matchingStartups = startups.filter(startup => 
          startup.responsibleDepartments && startup.responsibleDepartments.includes(dept.id) &&
          (startup as any).bizDevPhase === phase.id
        );
        
        data.push({
          department: dept.title,
          departmentId: dept.id,
          bizDevPhase: phase.title,
          bizDevPhaseId: phase.id,
          // orderedBizDevPhasesのインデックスをpositionとして使用（管理タブの順序を反映）
          bizDevPhasePosition: index,
          count: matchingStartups.length,
        });
      });
    });

    return data;
  }, [departments, bizDevPhases, orderedBizDevPhases, departmentManagement.orderedDepartments, startups]);

  // マトリクスチャートの仕様を生成
  const matrixChartSpec = useMemo(() => {
    if (matrixData.length === 0) return null;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const chartHeight = isMobile ? 400 : Math.max(400, bizDevPhases.length * 40 + 100);

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      description: '主管事業部署 × Biz-Devフェーズ マトリクス',
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
              field: 'department',
              type: 'ordinal',
              title: '主管事業部署',
              // orderedDepartmentsの順序をdomainとして明示的に指定
              scale: {
                domain: (departmentManagement.orderedDepartments.length > 0 ? departmentManagement.orderedDepartments : departments).map(d => d.title),
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
              { field: 'department', title: '主管事業部署' },
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
              field: 'department',
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
          fields: ['departmentId', 'bizDevPhaseId'],
          empty: 'none',
        },
      },
    };
  }, [matrixData, bizDevPhases.length, orderedBizDevPhases]);

  // 選択されたマトリクスセルに紐づくスタートアップを取得
  const getSelectedMatrixStartups = useMemo(() => {
    if (!selectedMatrixCell) return [];

    return startups.filter(startup => 
      startup.responsibleDepartments && startup.responsibleDepartments.includes(selectedMatrixCell.departmentId) &&
      (startup as any).bizDevPhase === selectedMatrixCell.bizDevPhaseId
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
          部署管理
        </h3>
        {departmentSubTab === 'management' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => departmentManagement.setShowEditDepartmentsModal(true)}
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
                departmentManagement.setEditingDepartment(null);
                departmentManagement.setDepartmentFormTitle('');
                departmentManagement.setDepartmentFormDescription('');
                departmentManagement.setShowDepartmentModal(true);
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
              部署を追加
            </button>
          </div>
        )}
      </div>

      <SubTabBar
        activeTab={departmentSubTab}
        onTabChange={setDepartmentSubTab}
        managementLabel="部署管理"
        diagramLabel="部署関係性図"
      />

      {/* 部署管理サブタブ */}
      {departmentSubTab === 'management' && (
        <div>
          {departments.length === 0 ? (
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#FFFBF0', 
              border: '1.5px solid #FCD34D', 
              borderRadius: '8px',
              color: '#92400E',
              fontSize: '14px',
            }}>
              部署が見つかりません。部署を追加してください。
            </div>
          ) : (
            <div>
              {departments.map((dept) => (
                <div
                  key={dept.id}
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
                    {dept.title}
                  </div>
                  {dept.description && (
                    <div style={{
                      fontSize: '14px',
                      color: '#4B5563',
                    }}>
                      {dept.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 部署関係性図サブタブ */}
      {departmentSubTab === 'diagram' && (
        <div>
          {/* 統計情報カード */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
              ? '1fr' 
              : 'repeat(2, 1fr)',
            gap: typeof window !== 'undefined' && window.innerWidth < 768 ? '16px' : '20px',
            marginBottom: '32px',
          }}>
            {/* 部署数カード */}
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
                部署数
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
                {statistics.departmentCount}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#9CA3AF',
                fontWeight: '400',
                position: 'relative',
                zIndex: 1,
              }}>
                件の部署
              </div>
            </div>

            {/* スタートアップ数カード */}
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
                スタートアップ数
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
                {statistics.startupCount}
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
          </div>

          {/* マトリクス表示 */}
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
                      主管事業部署 × Biz-Devフェーズ マトリクス
                    </h3>
                  </div>
                  <DynamicVegaChart
                    spec={matrixChartSpec}
                    language="vega-lite"
                    chartData={matrixData}
                    noBorder={true}
                    onSignal={(signalName: string, value: any) => {
                      console.log('DepartmentSection matrix onSignal:', signalName, value);
                      if (signalName === 'clicked_theme' || signalName === 'click') {
                        // value.datumからデータを取得
                        if (value && value.datum) {
                          const datum = value.datum;
                          console.log('DepartmentSection matrix datum:', datum);
                          if (datum.departmentId && datum.bizDevPhaseId) {
                            console.log('Setting selectedMatrixCell from datum:', { departmentId: datum.departmentId, bizDevPhaseId: datum.bizDevPhaseId });
                            setSelectedMatrixCell({ departmentId: datum.departmentId, bizDevPhaseId: datum.bizDevPhaseId });
                          }
                        } 
                        // valueから直接取得
                        else if (value && value.departmentId && value.bizDevPhaseId) {
                          console.log('Setting selectedMatrixCell from value:', { departmentId: value.departmentId, bizDevPhaseId: value.bizDevPhaseId });
                          setSelectedMatrixCell({ departmentId: value.departmentId, bizDevPhaseId: value.bizDevPhaseId });
                        }
                        // departmentとbizDevPhaseから検索
                        else if (value && (value.department || value.bizDevPhase)) {
                          const department = value.department ? departments.find(d => d.title === value.department) : null;
                          const bizDevPhase = value.bizDevPhase ? bizDevPhases.find(p => p.title === value.bizDevPhase) : null;
                          if (department && bizDevPhase) {
                            console.log('Setting selectedMatrixCell from department and bizDevPhase:', { departmentId: department.id, bizDevPhaseId: bizDevPhase.id });
                            setSelectedMatrixCell({ departmentId: department.id, bizDevPhaseId: bizDevPhase.id });
                          }
                        }
                        // chartDataから検索
                        else if (value && (value.department || value.bizDevPhase)) {
                          const matchingData = matrixData.find(d => 
                            (value.department ? d.department === value.department : true) &&
                            (value.bizDevPhase ? d.bizDevPhase === value.bizDevPhase : true)
                          );
                          if (matchingData) {
                            console.log('Setting selectedMatrixCell from matchingData:', { departmentId: matchingData.departmentId, bizDevPhaseId: matchingData.bizDevPhaseId });
                            setSelectedMatrixCell({ departmentId: matchingData.departmentId, bizDevPhaseId: matchingData.bizDevPhaseId });
                          }
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
                        {departments.find(dept => dept.id === selectedMatrixCell.departmentId)?.title} × {bizDevPhases.find(phase => phase.id === selectedMatrixCell.bizDevPhaseId)?.title} に紐づくスタートアップ
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
                      {getSelectedMatrixStartups.map(startup => (
                        <div
                          key={startup.id}
                          onClick={() => {
                            if (startup.organizationId && startup.id) {
                              router.push(`/organization/${startup.organizationId}/startup/${startup.id}`);
                            }
                          }}
                          style={{
                            padding: '16px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#4262FF';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(66, 98, 255, 0.1)';
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
                マトリクスデータがありません。
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
              部署関係性図は準備中です。
            </div>
          )}
        </div>
      )}
    </>
  );
}

