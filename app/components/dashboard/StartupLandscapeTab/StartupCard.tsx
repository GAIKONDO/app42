'use client';

import React from 'react';
import type { StartupCardProps } from './types';

export default function StartupCard({ startup, bizDevPhases, statuses }: StartupCardProps) {
  const bizDevPhase = startup.bizDevPhase 
    ? bizDevPhases.find(p => p.id === startup.bizDevPhase)
    : null;
  const handleClick = () => {
    if (startup.organizationId && startup.id) {
      window.location.href = `/organization/startup?organizationId=${startup.organizationId}&startupId=${startup.id}`;
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        padding: '16px',
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        cursor: startup.organizationId ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      onMouseEnter={(e) => {
        if (startup.organizationId) {
          e.currentTarget.style.borderColor = '#3B82F6';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.12)';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.backgroundColor = '#FFFFFF';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#E5E7EB';
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.backgroundColor = '#F9FAFB';
      }}
    >
      <div style={{
        fontSize: '15px',
        fontWeight: '600',
        color: '#1A1A1A',
        lineHeight: '1.4',
        marginBottom: '12px',
      }}>
        {startup.title}
      </div>
      
      {bizDevPhase && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
        }}>
          <span style={{
            padding: '4px 10px',
            backgroundColor: '#EFF6FF',
            color: '#1E40AF',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '500',
          }}>
            {bizDevPhase.title}
          </span>
        </div>
      )}
    </div>
  );
}

