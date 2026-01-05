'use client';

import React from 'react';
import type { EvaluationChartData } from '@/lib/orgApi';

interface EvaluationDetailTableProps {
  chartData: EvaluationChartData | null;
}

const EVALUATION_AXES = [
  { id: 'tech_superiority', label: '技術優位性・独自性' },
  { id: 'concept_clarity', label: 'コンセプトの分かりやすさ' },
  { id: 'relationship_value', label: '関係値' },
  { id: 'japan_readiness', label: '日本進出準備度' },
  { id: 'vc_recommendation', label: 'VC推薦・推し' },
  { id: 'front_interest', label: 'フロント部署の興味度' },
  { id: 'responsible_interest', label: '主管部署の興味度' },
  { id: 'customer_interest', label: '顧客の興味度' },
  { id: 'poc_pipeline', label: 'PoC/案件のパイプライン' },
  { id: 'poc_amount', label: 'PoC/案件の見込み金額規模' },
  { id: 'affinity', label: '既存商材との親和性' },
  { id: 'sales_impact', label: '売上インパクト/戦略性' },
];

export default function EvaluationDetailTable({ chartData }: EvaluationDetailTableProps) {
  if (!chartData || !chartData.axes || chartData.axes.length === 0) {
    return null;
  }

  const axesData = EVALUATION_AXES.map(axis => {
    const axisData = chartData.axes.find(a => a.id === axis.id);
    if (!axisData) return null;
    
    const totalScore = axisData.score * axisData.weight;
    const evaluation = (axisData.score / axisData.maxValue) * 100;
    
    return {
      ...axis,
      ...axisData,
      totalScore,
      evaluation: Math.round(evaluation),
    };
  }).filter(Boolean) as Array<{
    id: string;
    label: string;
    priority: '高' | '中' | '低';
    weight: number;
    score: number;
    maxValue: number;
    basis?: string;
    totalScore: number;
    evaluation: number;
  }>;

  const overallTotalScore = axesData.reduce((sum, axis) => sum + axis.totalScore, 0);
  const overallEvaluation = axesData.length > 0 
    ? Math.round((overallTotalScore / axesData.reduce((sum, axis) => sum + axis.weight * axis.maxValue, 0)) * 100)
    : 0;

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid #E5E7EB',
        }}>
          <thead>
            <tr style={{ backgroundColor: '#F9FAFB' }}>
              <th style={{ 
                padding: '12px', 
                textAlign: 'left', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#374151',
                borderBottom: '1px solid #E5E7EB',
              }}>
                比較選定軸
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'center', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#374151',
                borderBottom: '1px solid #E5E7EB',
              }}>
                優先度
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'center', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#374151',
                borderBottom: '1px solid #E5E7EB',
              }}>
                選定軸のウエイト
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'center', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#374151',
                borderBottom: '1px solid #E5E7EB',
              }}>
                得点
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'center', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#374151',
                borderBottom: '1px solid #E5E7EB',
              }}>
                最大値
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'center', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#374151',
                borderBottom: '1px solid #E5E7EB',
              }}>
                合計スコア
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'center', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#374151',
                borderBottom: '1px solid #E5E7EB',
              }}>
                評価
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'left', 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#374151',
                borderBottom: '1px solid #E5E7EB',
              }}>
                比較の根拠
              </th>
            </tr>
          </thead>
          <tbody>
            {axesData.map((axis, index) => (
              <tr key={axis.id} style={{ 
                borderBottom: index < axesData.length - 1 ? '1px solid #F3F4F6' : 'none',
              }}>
                <td style={{ padding: '12px', fontSize: '13px', color: '#374151' }}>
                  {axis.label}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#374151' }}>
                  {axis.priority}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#374151' }}>
                  {axis.weight}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#374151' }}>
                  {axis.score}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#374151' }}>
                  {axis.maxValue}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#374151' }}>
                  {axis.totalScore.toFixed(1)}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#374151' }}>
                  {axis.evaluation}%
                </td>
                <td style={{ padding: '12px', fontSize: '13px', color: '#6B7280' }}>
                  {axis.basis || '評価待ち'}
                </td>
              </tr>
            ))}
            <tr style={{ backgroundColor: '#F9FAFB', fontWeight: '600' }}>
              <td colSpan={5} style={{ padding: '12px', fontSize: '13px', color: '#374151', textAlign: 'right' }}>
                総合評価
              </td>
              <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#374151' }}>
                {overallTotalScore.toFixed(1)}
              </td>
              <td style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#374151' }}>
                {overallEvaluation}%
              </td>
              <td style={{ padding: '12px', fontSize: '13px', color: '#6B7280' }}>
                -
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

