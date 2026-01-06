'use client';

import React from 'react';
import type { CompactStartupItemProps } from './types';

export default function CompactStartupItem({ startup, bizDevPhases }: CompactStartupItemProps) {
  const handleClick = () => {
    if (startup.organizationId && startup.id) {
      window.location.href = `/organization/startup?organizationId=${startup.organizationId}&startupId=${startup.id}`;
    }
  };

  // Biz-Devフェーズを取得
  const bizDevPhase = startup.bizDevPhase 
    ? bizDevPhases.find(p => p.id === startup.bizDevPhase)
    : null;
  
  // 特定のBiz-Devフェーズかどうかを判定
  const isSpecialPhase = bizDevPhase && (
    bizDevPhase.title.includes('全社取扱商材') || 
    bizDevPhase.title.includes('CTCA関連')
  );

  const isFavorite = startup.isFavorite === true;
  
  // 色の決定ロジック
  let defaultBgColor: string;
  let defaultBorderColor: string;
  let hoverBgColor: string;
  let hoverBorderColor: string;
  
  if (isFavorite) {
    defaultBgColor = '#FEF3C7';
    defaultBorderColor = '#F59E0B';
    hoverBgColor = '#FDE68A';
    hoverBorderColor = '#F59E0B';
  } else if (isSpecialPhase) {
    // 全社取扱商材またはCTCA関連の場合は青色系
    defaultBgColor = '#EFF6FF';
    defaultBorderColor = '#3B82F6';
    hoverBgColor = '#DBEAFE';
    hoverBorderColor = '#2563EB';
  } else {
    defaultBgColor = '#FFFFFF';
    defaultBorderColor = '#E5E7EB';
    hoverBgColor = '#EFF6FF';
    hoverBorderColor = '#3B82F6';
  }

  return (
    <div
      onClick={handleClick}
      style={{
        padding: '10px 14px',
        backgroundColor: defaultBgColor,
        border: `1px solid ${defaultBorderColor}`,
        borderRadius: '8px',
        cursor: startup.organizationId ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        fontSize: '13px',
        fontWeight: '500',
        color: '#1A1A1A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '44px',
        textAlign: 'center',
        boxShadow: isFavorite 
          ? '0 2px 4px rgba(245, 158, 11, 0.1)' 
          : isSpecialPhase 
            ? '0 2px 4px rgba(59, 130, 246, 0.15)' 
            : 'none',
      }}
      onMouseEnter={(e) => {
        if (startup.organizationId) {
          e.currentTarget.style.borderColor = hoverBorderColor;
          e.currentTarget.style.backgroundColor = hoverBgColor;
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = isFavorite 
            ? '0 4px 12px rgba(245, 158, 11, 0.3)' 
            : isSpecialPhase
              ? '0 4px 12px rgba(59, 130, 246, 0.25)'
              : '0 4px 12px rgba(59, 130, 246, 0.2)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = defaultBorderColor;
        e.currentTarget.style.backgroundColor = defaultBgColor;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = isFavorite 
          ? '0 2px 4px rgba(245, 158, 11, 0.1)' 
          : isSpecialPhase 
            ? '0 2px 4px rgba(59, 130, 246, 0.15)' 
            : 'none';
      }}
    >
      <span style={{
        lineHeight: '1.4',
        wordBreak: 'break-word',
      }}>{startup.title}</span>
    </div>
  );
}

