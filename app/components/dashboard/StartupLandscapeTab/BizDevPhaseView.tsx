'use client';

import React from 'react';
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
        
        return (
          <div key={phaseId} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
              paddingBottom: '8px',
              borderBottom: '1px solid #E5E7EB',
            }}>
              <h4 style={{ 
                fontSize: '14px', 
                fontWeight: 600, 
                color: '#6B7280',
                margin: 0,
              }}>
                {phaseTitle} ({phaseData.startups.length}件)
              </h4>
            </div>
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
          </div>
        );
      })}
    </div>
  );
}

