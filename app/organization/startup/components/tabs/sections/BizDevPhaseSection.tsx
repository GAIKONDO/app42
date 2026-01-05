'use client';

import React from 'react';
import type { BizDevPhase } from '@/lib/orgApi';

interface BizDevPhaseSectionProps {
  localBizDevPhase: string;
  setLocalBizDevPhase: (phase: string) => void;
  bizDevPhases: BizDevPhase[];
}

export default function BizDevPhaseSection({
  localBizDevPhase,
  setLocalBizDevPhase,
  bizDevPhases,
}: BizDevPhaseSectionProps) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '8px', 
        fontWeight: '600', 
        color: '#1A1A1A',
        fontSize: '14px',
        fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
        <span style={{ 
          display: 'inline-block',
          width: '24px',
          height: '24px',
          lineHeight: '24px',
          textAlign: 'center',
          backgroundColor: '#4262FF',
          color: '#FFFFFF',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '700',
          marginRight: '8px',
          verticalAlign: 'middle',
        }}>5</span>
        Biz-Devフェーズ
      </label>
      <div style={{ position: 'relative', maxWidth: '400px' }}>
        <select
          value={localBizDevPhase}
          onChange={(e) => {
            const newValue = e.target.value;
            console.log('🔍 [BizDevPhaseSection] bizDevPhase変更:', { oldValue: localBizDevPhase, newValue });
            setLocalBizDevPhase(newValue);
          }}
          style={{
            width: '100%',
            padding: '10px 40px 10px 14px',
            border: '1.5px solid #E5E7EB',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
            color: localBizDevPhase ? '#1A1A1A' : '#9CA3AF',
            fontWeight: localBizDevPhase ? '500' : '400',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 14px center',
            transition: 'all 0.2s ease',
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
            e.currentTarget.style.borderColor = '#4262FF';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(66, 98, 255, 0.1)';
            e.currentTarget.style.outline = 'none';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#E5E7EB';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <option value="" disabled style={{ color: '#9CA3AF' }}>選択してください</option>
          {bizDevPhases.map((phase) => (
            <option key={phase.id} value={phase.id} style={{ color: '#1A1A1A' }}>
              {phase.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

