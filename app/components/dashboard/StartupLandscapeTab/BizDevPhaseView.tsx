'use client';

import React, { useState, useMemo } from 'react';
import type { BizDevPhaseViewProps } from './types';
import CompactStartupItem from './CompactStartupItem';
import type { Startup, BizDevPhase } from '@/lib/orgApi';

export default function BizDevPhaseView({ filteredStartups, bizDevPhases, statuses }: BizDevPhaseViewProps) {
  // スタートアップをBiz-Devフェーズでグループ化
  const startupsByPhase = new Map<string, { phase: BizDevPhase | null; startups: Startup[] }>();
  
  // フェーズごとにグループ化
  for (const startup of filteredStartups) {
    const phaseId = startup.bizDevPhase || 'none';
    if (!startupsByPhase.has(phaseId)) {
      const phase = phaseId === 'none' ? null : bizDevPhases.find(p => p.id === phaseId) || null;
      startupsByPhase.set(phaseId, { phase, startups: [] });
    }
    startupsByPhase.get(phaseId)!.startups.push(startup);
  }

  // 管理タブと同じ順番で表示（getBizDevPhases()が返す順番 = position順）
  // まず、bizDevPhasesの順番に従ってフェーズIDを並べ、その後「未設定」を追加
  const sortedPhaseIds: string[] = [];
  
  // bizDevPhasesの順番に従って追加（getBizDevPhases()は既にpositionでソート済み）
  for (const phase of bizDevPhases) {
    if (startupsByPhase.has(phase.id) && startupsByPhase.get(phase.id)!.startups.length > 0) {
      sortedPhaseIds.push(phase.id);
    }
  }
  
  // 未設定のフェーズを最後に追加
  if (startupsByPhase.has('none') && startupsByPhase.get('none')!.startups.length > 0) {
    sortedPhaseIds.push('none');
  }

  // 各セクションの開閉状態を管理
  // 初期状態で「全社取扱商材」と「CTCA関連」を含むセクションは閉じる
  const initialExpandedState = useMemo(() => {
    const state: Record<string, boolean> = {};
    sortedPhaseIds.forEach((phaseId) => {
      const phaseData = startupsByPhase.get(phaseId);
      if (phaseData?.phase) {
        const phaseTitle = phaseData.phase.title;
        // 全社取扱商材またはCTCA関連を含む場合は初期状態で閉じる
        const shouldBeCollapsed = 
          phaseTitle.includes('全社取扱商材') || 
          phaseTitle.includes('CTCA関連');
        state[phaseId] = !shouldBeCollapsed;
      } else {
        // 未設定のフェーズは開いた状態
        state[phaseId] = true;
      }
    });
    return state;
  }, [sortedPhaseIds, startupsByPhase]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(initialExpandedState);

  // セクションの開閉を切り替える
  const toggleSection = (phaseId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }));
  };

  if (sortedPhaseIds.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        color: '#6B7280',
        fontSize: '14px',
      }}>
        スタートアップが登録されていません
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {sortedPhaseIds.map((phaseId) => {
        const phaseData = startupsByPhase.get(phaseId);
        if (!phaseData || phaseData.startups.length === 0) return null;
        
        const phaseTitle = phaseData.phase ? phaseData.phase.title : 'Biz-Devフェーズ未設定';
        const isExpanded = expandedSections[phaseId] ?? true;
        
        return (
          <div key={phaseId} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div 
              style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
                paddingBottom: '8px',
                borderBottom: '1px solid #E5E7EB',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              onClick={() => toggleSection(phaseId)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <h4 style={{ 
                fontSize: '14px', 
                fontWeight: 600, 
                color: '#6B7280',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  lineHeight: '16px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#6B7280',
                  transition: 'transform 0.2s ease',
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                }}>
                  ▶
                </span>
                {phaseTitle} ({phaseData.startups.length}件)
              </h4>
            </div>
            {isExpanded && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 
                    ? 'repeat(auto-fill, minmax(140px, 1fr))'
                    : 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '12px',
                }}
              >
                {phaseData.startups.map((startup) => (
                  <CompactStartupItem
                    key={startup.id}
                    startup={startup}
                    bizDevPhases={bizDevPhases}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

