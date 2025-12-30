'use client';

import React, { useMemo } from 'react';
import type { EvaluationChartData, EvaluationChartSnapshot } from '@/lib/orgApi';

interface EvaluationChartProps {
  chartData: EvaluationChartData | null;
  snapshots: EvaluationChartSnapshot[];
  onSaveSnapshot: (name: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onScoreChange?: (axisId: string, score: number) => void;
}

const CHART_SIZE = 600;
const CHART_CENTER = CHART_SIZE / 2;
const CHART_RADIUS = 250;
const MAX_SCORE = 5;

// 12の評価軸の定義（3つ時計回りに進めた順番）
const EVALUATION_AXES = [
  { id: 'tech_superiority', label: '技術優位性・独自性', angle: 0 },
  { id: 'concept_clarity', label: 'コンセプトの分かりやすさ', angle: 30 },
  { id: 'relationship_value', label: '関係値', angle: 60 },
  { id: 'japan_readiness', label: '日本進出準備度', angle: 90 },
  { id: 'vc_recommendation', label: 'VC推薦・推し', angle: 120 },
  { id: 'front_interest', label: 'フロント部署の興味度', angle: 150 },
  { id: 'responsible_interest', label: '主管部署の興味度', angle: 180 },
  { id: 'customer_interest', label: '顧客の興味度', angle: 210 },
  { id: 'poc_pipeline', label: 'PoC/案件のパイプライン', angle: 240 },
  { id: 'poc_amount', label: 'PoC/案件の見込み金額規模', angle: 270 },
  { id: 'affinity', label: '既存商材との親和性', angle: 300 },
  { id: 'sales_impact', label: '売上インパクト/戦略性', angle: 330 },
];

export default function EvaluationChart({
  chartData,
  snapshots = [],
  onSaveSnapshot,
  onDeleteSnapshot,
  isEditing,
  onEdit,
  onSave,
  onScoreChange,
}: EvaluationChartProps) {
  const [showSnapshotModal, setShowSnapshotModal] = React.useState(false);
  const [snapshotName, setSnapshotName] = React.useState('');
  const [draggingAxisId, setDraggingAxisId] = React.useState<string | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  // チャートのパスを計算
  const chartPath = useMemo(() => {
    if (!chartData || !chartData.axes || chartData.axes.length === 0) return null;

    const points = EVALUATION_AXES.map((axis, index) => {
      const axisData = chartData.axes.find(a => a.id === axis.id);
      const score = axisData?.score || 0;
      const maxValue = axisData?.maxValue || MAX_SCORE;
      const normalizedScore = (score / maxValue) * CHART_RADIUS;
      const angle = (axis.angle * Math.PI) / 180;
      const x = CHART_CENTER + normalizedScore * Math.sin(angle);
      const y = CHART_CENTER - normalizedScore * Math.cos(angle);
      return { x, y };
    });

    if (points.length === 0) return null;

    const pathData = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ') + ' Z';

    return pathData;
  }, [chartData, draggingAxisId]);

  // スナップショットのパスを計算
  const snapshotPaths = useMemo(() => {
    if (!snapshots || !Array.isArray(snapshots)) return [];
    return snapshots.map(snapshot => {
      if (!snapshot.data || !snapshot.data.axes || snapshot.data.axes.length === 0) return null;

      const points = EVALUATION_AXES.map((axis, index) => {
        const axisData = snapshot.data.axes.find(a => a.id === axis.id);
        const score = axisData?.score || 0;
        const normalizedScore = (score / MAX_SCORE) * CHART_RADIUS;
        const angle = (axis.angle * Math.PI) / 180;
        const x = CHART_CENTER + normalizedScore * Math.sin(angle);
        const y = CHART_CENTER - normalizedScore * Math.cos(angle);
        return { x, y };
      });

      if (points.length === 0) return null;

      const pathData = points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
        .join(' ') + ' Z';

      return { id: snapshot.id, path: pathData, name: snapshot.name, date: snapshot.date };
    }).filter(Boolean) as Array<{ id: string; path: string; name: string; date: string }>;
  }, [snapshots]);

  const handleSaveSnapshot = () => {
    if (snapshotName.trim() && chartData) {
      onSaveSnapshot(snapshotName.trim());
      setSnapshotName('');
      setShowSnapshotModal(false);
    }
  };

  if (!chartData || !chartData.axes || chartData.axes.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>
        <p style={{ marginBottom: '16px' }}>評価チャートデータがありません。</p>
        <button
          onClick={onEdit}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            padding: 0,
            backgroundColor: 'transparent',
            color: '#10B981',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            opacity: 0.6,
            transition: 'all 0.2s ease',
            margin: '0 auto',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.opacity = '0.6';
          }}
          title="チャートを作成"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#374151', margin: 0 }}>
          評価チャート
        </h3>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {!isEditing && (
            <>
              <button
                onClick={() => setShowSnapshotModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  padding: 0,
                  backgroundColor: 'transparent',
                  color: '#6B7280',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  opacity: 0.3,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.08)';
                  e.currentTarget.style.opacity = '0.6';
                  e.currentTarget.style.color = '#6B7280';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.opacity = '0.3';
                  e.currentTarget.style.color = '#6B7280';
                }}
                title="スナップショット保存"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
                  <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                </svg>
              </button>
              <button
                onClick={onEdit}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  padding: 0,
                  backgroundColor: 'transparent',
                  color: '#9CA3AF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  opacity: 0.3,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.08)';
                  e.currentTarget.style.opacity = '0.6';
                  e.currentTarget.style.color = '#6B7280';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.opacity = '0.3';
                  e.currentTarget.style.color = '#9CA3AF';
                }}
                title="編集"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
            </>
          )}
          {isEditing && (
            <button
              onClick={onSave}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                padding: 0,
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: '#10B981',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                opacity: 1,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
              }}
              title="保存"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* レーダーチャート */}
        <div style={{ flex: '1', minWidth: '600px' }}>
          <div style={{ 
            backgroundColor: '#FFFFFF', 
            borderRadius: '8px', 
            padding: '24px',
            border: '1px solid #E5E7EB'
          }}>
            <svg 
              ref={svgRef}
              width={CHART_SIZE} 
              height={CHART_SIZE} 
              style={{ display: 'block', margin: '0 auto', userSelect: 'none' }}
            >
              {/* グリッド線 */}
              {[1, 2, 3, 4, 5].map(level => {
                const radius = (level / MAX_SCORE) * CHART_RADIUS;
                return (
                  <circle
                    key={level}
                    cx={CHART_CENTER}
                    cy={CHART_CENTER}
                    r={radius}
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="1"
                  />
                );
              })}

              {/* 軸線 */}
              {EVALUATION_AXES.map((axis, index) => {
                const angle = (axis.angle * Math.PI) / 180;
                const x = CHART_CENTER + CHART_RADIUS * Math.sin(angle);
                const y = CHART_CENTER - CHART_RADIUS * Math.cos(angle);
                return (
                  <line
                    key={axis.id}
                    x1={CHART_CENTER}
                    y1={CHART_CENTER}
                    x2={x}
                    y2={y}
                    stroke="#D1D5DB"
                    strokeWidth="1"
                  />
                );
              })}

              {/* スナップショットのパス */}
              {snapshotPaths && snapshotPaths.length > 0 && snapshotPaths.map((snapshot, index) => (
                <g key={snapshot.id}>
                  <path
                    d={snapshot.path}
                    fill="rgba(239, 68, 68, 0.1)"
                    stroke="#EF4444"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    opacity="0.6"
                  />
                  {snapshotPaths[index]?.path && (
                    <>
                      {EVALUATION_AXES.map((axis, axisIndex) => {
                        const axisData = snapshots[index]?.data?.axes?.find(a => a.id === axis.id);
                        if (!axisData) return null;
                        const score = axisData.score || 0;
                        const normalizedScore = (score / MAX_SCORE) * CHART_RADIUS;
                        const angle = (axis.angle * Math.PI) / 180;
                        const x = CHART_CENTER + normalizedScore * Math.sin(angle);
                        const y = CHART_CENTER - normalizedScore * Math.cos(angle);
                        return (
                          <circle
                            key={`${snapshot.id}-${axis.id}`}
                            cx={x}
                            cy={y}
                            r="3"
                            fill="#EF4444"
                          />
                        );
                      })}
                    </>
                  )}
                </g>
              ))}

              {/* 現在のデータのパス */}
              {chartPath && (
                <>
                  <path
                    d={chartPath}
                    fill="rgba(59, 130, 246, 0.2)"
                    stroke="#3B82F6"
                    strokeWidth="2"
                  />
                  {EVALUATION_AXES.map((axis) => {
                    const axisData = chartData.axes.find(a => a.id === axis.id);
                    if (!axisData) return null;
                    const score = axisData.score || 0;
                    const maxValue = axisData.maxValue || MAX_SCORE;
                    const normalizedScore = (score / maxValue) * CHART_RADIUS;
                    const angle = (axis.angle * Math.PI) / 180;
                    const x = CHART_CENTER + normalizedScore * Math.sin(angle);
                    const y = CHART_CENTER - normalizedScore * Math.cos(angle);
                    const isDragging = draggingAxisId === axis.id;
                    
                    const handleMouseDown = (e: React.MouseEvent<SVGCircleElement>) => {
                      if (!onScoreChange || !svgRef.current) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setDraggingAxisId(axis.id);
                      
                      const axisAngleRad = (axis.angle * Math.PI) / 180;
                      
                      const handleMouseMove = (moveEvent: MouseEvent) => {
                        if (!svgRef.current) return;
                        const rect = svgRef.current.getBoundingClientRect();
                        const svgX = moveEvent.clientX - rect.left;
                        const svgY = moveEvent.clientY - rect.top;
                        
                        // 中心からの距離と角度を計算
                        const dx = svgX - CHART_CENTER;
                        const dy = svgY - CHART_CENTER;
                        const mouseAngleRad = Math.atan2(dx, -dy);
                        
                        // 軸の角度に投影（軸方向の距離を計算）
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const angleDiff = mouseAngleRad - axisAngleRad;
                        const projectedDistance = distance * Math.cos(angleDiff);
                        
                        // 距離をスコアに変換（最大値で正規化、CHART_RADIUSを超えないように）
                        const clampedDistance = Math.min(Math.max(projectedDistance, 0), CHART_RADIUS);
                        const newScore = (clampedDistance / CHART_RADIUS) * maxValue;
                        
                        // スコアを更新（小数点第1位まで）
                        onScoreChange(axis.id, Math.round(newScore * 10) / 10);
                      };
                      
                      const handleMouseUp = () => {
                        setDraggingAxisId(null);
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    };
                    
                    return (
                      <circle
                        key={axis.id}
                        cx={x}
                        cy={y}
                        r={isDragging ? "8" : "6"}
                        fill={isDragging ? "#2563EB" : "#3B82F6"}
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        style={{
                          cursor: onScoreChange ? 'grab' : 'default',
                          transition: isDragging ? 'none' : 'all 0.2s ease',
                        }}
                        onMouseDown={onScoreChange ? handleMouseDown : undefined}
                        onMouseEnter={(e) => {
                          if (onScoreChange && !isDragging) {
                            e.currentTarget.setAttribute('r', '8');
                            e.currentTarget.setAttribute('fill', '#2563EB');
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isDragging) {
                            e.currentTarget.setAttribute('r', '6');
                            e.currentTarget.setAttribute('fill', '#3B82F6');
                          }
                        }}
                      />
                    );
                  })}
                </>
              )}

              {/* 軸ラベル */}
              {EVALUATION_AXES.map((axis) => {
                const angle = (axis.angle * Math.PI) / 180;
                const labelRadius = CHART_RADIUS + 30;
                const x = CHART_CENTER + labelRadius * Math.sin(angle);
                const y = CHART_CENTER - labelRadius * Math.cos(angle);
                return (
                  <text
                    key={axis.id}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="11"
                    fill="#374151"
                    style={{ fontWeight: 500 }}
                  >
                    {axis.label}
                  </text>
                );
              })}

              {/* グリッドラベル */}
              {[0, 2, 4].map(level => {
                const radius = (level / MAX_SCORE) * CHART_RADIUS;
                const labelX = CHART_CENTER;
                const labelY = CHART_CENTER - radius;
                return (
                  <text
                    key={level}
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    fill="#6B7280"
                  >
                    {level}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* 凡例 */}
        <div style={{ minWidth: '200px' }}>
          <div style={{ 
            backgroundColor: '#F9FAFB', 
            borderRadius: '8px', 
            padding: '16px',
            border: '1px solid #E5E7EB'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
              重ね合わせ表示
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {snapshotPaths.map((snapshot) => (
                <div key={snapshot.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    backgroundColor: '#EF4444',
                    borderRadius: '2px'
                  }} />
                  <span style={{ fontSize: '12px', color: '#374151' }}>
                    {snapshot.name} ({snapshot.date})
                  </span>
                  <button
                    onClick={() => onDeleteSnapshot(snapshot.id)}
                    style={{
                      marginLeft: 'auto',
                      padding: '2px 6px',
                      backgroundColor: 'transparent',
                      color: '#EF4444',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '12px', 
                  height: '12px', 
                  backgroundColor: '#3B82F6',
                  borderRadius: '2px'
                }} />
                <span style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>
                  現在
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* スナップショット保存モーダル */}
      {showSnapshotModal && (
        <div style={{
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
        }} onClick={() => setShowSnapshotModal(false)}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
            padding: '24px',
            minWidth: '400px',
            maxWidth: '90%',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              スナップショットを保存
            </h3>
            <input
              type="text"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              placeholder="スナップショット名（例: スナップショット1）"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                marginBottom: '16px',
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSaveSnapshot();
                }
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSnapshotModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveSnapshot}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

