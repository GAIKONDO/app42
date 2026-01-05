'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AIGenerationComparisonView from './AIGenerationComparisonView';
import EvaluationChart from './EvaluationChart';
import EvaluationChartEditor from './EvaluationChartEditor';
import EvaluationDetailTable from './EvaluationDetailTable';
import type { EvaluationChartData, EvaluationChartSnapshot } from '@/lib/orgApi';
import { generateUniqueId } from '@/lib/orgApi';

interface EvaluationSectionProps {
  localEvaluation: string;
  setLocalEvaluation: (evaluation: string) => void;
  evaluationTextareaId: string;
  isEditingEvaluation: boolean;
  setIsEditingEvaluation: (editing: boolean) => void;
  localEvaluationChart: EvaluationChartData | null;
  setLocalEvaluationChart: (chart: EvaluationChartData | null) => void;
  localEvaluationChartSnapshots: EvaluationChartSnapshot[];
  setLocalEvaluationChartSnapshots: (snapshots: EvaluationChartSnapshot[]) => void;
  isEditingChart: boolean;
  setIsEditingChart: (editing: boolean) => void;
  setAIGenerationTarget: (target: 'description' | 'objective' | 'evaluation' | null) => void;
  setAIGenerationInput: (input: string) => void;
  setSelectedTopicIdsForAI: (ids: string[]) => void;
  setAiSummaryFormat: (format: 'auto' | 'bullet' | 'paragraph' | 'custom') => void;
  setAiSummaryLength: (length: number) => void;
  setAiCustomPrompt: (prompt: string) => void;
  setIsAIGenerationModalOpen: (open: boolean) => void;
  isAIGenerationModalOpen: boolean;
  aiGeneratedTarget: 'description' | 'objective' | 'evaluation' | null;
  aiGeneratedContent: string | null;
  originalContent: string | null;
  setAiGeneratedContent: (content: string | null) => void;
  setAiGeneratedTarget: (target: 'description' | 'objective' | 'evaluation' | null) => void;
  setOriginalContent: (content: string | null) => void;
}

export default function EvaluationSection({
  localEvaluation,
  setLocalEvaluation,
  evaluationTextareaId,
  isEditingEvaluation,
  setIsEditingEvaluation,
  localEvaluationChart,
  setLocalEvaluationChart,
  localEvaluationChartSnapshots,
  setLocalEvaluationChartSnapshots,
  isEditingChart,
  setIsEditingChart,
  setAIGenerationTarget,
  setAIGenerationInput,
  setSelectedTopicIdsForAI,
  setAiSummaryFormat,
  setAiSummaryLength,
  setAiCustomPrompt,
  setIsAIGenerationModalOpen,
  isAIGenerationModalOpen,
  aiGeneratedTarget,
  aiGeneratedContent,
  originalContent,
  setAiGeneratedContent,
  setAiGeneratedTarget,
  setOriginalContent,
}: EvaluationSectionProps) {
  const [viewMode, setViewMode] = React.useState<'text' | 'chart'>('chart');
  const [isDetailTableExpanded, setIsDetailTableExpanded] = React.useState(false);
  const handleOpenAIModal = () => {
    setAIGenerationTarget('evaluation');
    setAIGenerationInput('');
    setSelectedTopicIdsForAI([]);
    setAiSummaryFormat('auto');
    setAiSummaryLength(500);
    setAiCustomPrompt('');
    setIsAIGenerationModalOpen(true);
  };

  const handleUndo = () => {
    setLocalEvaluation(originalContent || '');
    setAiGeneratedContent(null);
    setAiGeneratedTarget(null);
    setOriginalContent(null);
  };

  const handleKeep = () => {
    setAiGeneratedContent(null);
    setAiGeneratedTarget(null);
    setOriginalContent(null);
  };

  const handleSaveSnapshot = (name: string) => {
    if (localEvaluationChart) {
      const snapshot: EvaluationChartSnapshot = {
        id: generateUniqueId(),
        name,
        date: new Date().toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
        data: JSON.parse(JSON.stringify(localEvaluationChart)),
      };
      setLocalEvaluationChartSnapshots([...localEvaluationChartSnapshots, snapshot]);
    }
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
    setLocalEvaluationChartSnapshots(localEvaluationChartSnapshots.filter(s => s.id !== snapshotId));
  };

  const handleSaveChart = (data: EvaluationChartData) => {
    setLocalEvaluationChart(data);
    setIsEditingChart(false);
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontWeight: '600', color: '#374151' }}>
            評価
          </label>
          {isEditingEvaluation && (
            <span style={{ fontSize: '12px', color: '#6B7280', fontFamily: 'monospace', backgroundColor: '#F3F4F6', padding: '2px 8px', borderRadius: '4px' }}>
              ID: {evaluationTextareaId}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* 表示モード切り替え */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '6px' }}>
            <button
              onClick={() => setViewMode('text')}
              style={{
                padding: '4px 12px',
                backgroundColor: viewMode === 'text' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'text' ? '#374151' : '#6B7280',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: viewMode === 'text' ? 500 : 400,
                cursor: 'pointer',
              }}
            >
              テキスト
            </button>
            <button
              onClick={() => setViewMode('chart')}
              style={{
                padding: '4px 12px',
                backgroundColor: viewMode === 'chart' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'chart' ? '#374151' : '#6B7280',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: viewMode === 'chart' ? 500 : 400,
                cursor: 'pointer',
              }}
            >
              チャート
            </button>
          </div>
          
          {viewMode === 'text' && !isEditingEvaluation && (
            <button
              onClick={handleOpenAIModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                padding: 0,
                backgroundColor: 'transparent',
                color: '#3B82F6',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                opacity: 0.6,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.opacity = '0.6';
              }}
              title="AIで作文"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          {viewMode === 'text' && (
            <button
              onClick={() => {
                setIsEditingEvaluation(!isEditingEvaluation);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                padding: 0,
                backgroundColor: isEditingEvaluation ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                color: isEditingEvaluation ? '#10B981' : '#9CA3AF',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                opacity: isEditingEvaluation ? 1 : 0.3,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isEditingEvaluation) {
                  e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.08)';
                  e.currentTarget.style.opacity = '0.6';
                  e.currentTarget.style.color = '#6B7280';
                }
              }}
              onMouseLeave={(e) => {
                if (!isEditingEvaluation) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.opacity = '0.3';
                  e.currentTarget.style.color = '#9CA3AF';
                }
              }}
              title={isEditingEvaluation ? '完了' : '編集'}
            >
              {isEditingEvaluation ? (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style={{ display: 'block' }}>
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* AI生成結果の比較ビュー（モーダルが閉じている時のみ表示） */}
      {viewMode === 'text' && !isAIGenerationModalOpen && aiGeneratedTarget === 'evaluation' && (
        <AIGenerationComparisonView
          aiGeneratedContent={aiGeneratedContent}
          originalContent={originalContent}
          onUndo={handleUndo}
          onKeep={handleKeep}
        />
      )}
      
      {viewMode === 'text' && (
        <>
          {isEditingEvaluation ? (
            <textarea
              id={evaluationTextareaId}
              value={localEvaluation}
              onChange={(e) => setLocalEvaluation(e.target.value)}
              placeholder="スタートアップの評価を入力（マークダウン記法対応）"
              rows={8}
              style={{
                width: '100%',
                padding: '12px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace',
                resize: 'vertical',
                lineHeight: '1.6',
              }}
            />
          ) : (
            <div
              style={{
                padding: '16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
                minHeight: '100px',
              }}
            >
              {localEvaluation ? (
                <div
                  className="markdown-content"
                  style={{
                    fontSize: '15px',
                    lineHeight: '1.8',
                    color: '#374151',
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {localEvaluation}
                  </ReactMarkdown>
                </div>
              ) : (
                <p style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '14px' }}>
                  評価が入力されていません。「編集」ボタンから追加してください。
                </p>
              )}
            </div>
          )}
        </>
      )}

      {viewMode === 'chart' && (
        <>
          {isEditingChart ? (
            <EvaluationChartEditor
              chartData={localEvaluationChart}
              onSave={handleSaveChart}
              onCancel={() => setIsEditingChart(false)}
            />
          ) : (
            <>
              <EvaluationChart
                chartData={localEvaluationChart}
                snapshots={localEvaluationChartSnapshots || []}
                onSaveSnapshot={handleSaveSnapshot}
                onDeleteSnapshot={handleDeleteSnapshot}
                isEditing={isEditingChart}
                onEdit={() => setIsEditingChart(true)}
                onSave={() => {}}
                onScoreChange={(axisId: string, score: number) => {
                  if (localEvaluationChart && localEvaluationChart.axes) {
                    const updatedAxes = localEvaluationChart.axes.map(axis => 
                      axis.id === axisId ? { ...axis, score: Math.max(0, Math.min(score, axis.maxValue || 5)) } : axis
                    );
                    setLocalEvaluationChart({
                      ...localEvaluationChart,
                      axes: updatedAxes,
                      updatedAt: new Date().toISOString(),
                    });
                  }
                }}
              />
              {localEvaluationChart && (
                <div style={{ marginTop: '24px' }}>
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      marginBottom: '12px',
                      cursor: 'pointer',
                    }}
                    onClick={() => setIsDetailTableExpanded(!isDetailTableExpanded)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', transition: 'transform 0.2s', transform: isDetailTableExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                        ▶
                      </span>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>
                        評価詳細
                      </h4>
                    </div>
                  </div>
                  {isDetailTableExpanded && (
                    <EvaluationDetailTable chartData={localEvaluationChart} />
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

