'use client';

import React from 'react';

interface UrlSectionProps {
  isEditing: boolean;
  localHpUrl: string;
  setLocalHpUrl: (url: string) => void;
  localAsanaUrl: string;
  setLocalAsanaUrl: (url: string) => void;
  localBoxUrl: string;
  setLocalBoxUrl: (url: string) => void;
}

interface UrlFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  isEditing: boolean;
}

function UrlField({ label, value, onChange, placeholder, isEditing }: UrlFieldProps) {
  const [isEditingUrl, setIsEditingUrl] = React.useState(false);

  const handleUrlClick = async (url: string) => {
    try {
      const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
      if (isTauri) {
        const { callTauriCommand } = await import('@/lib/localFirebase');
        const result = await callTauriCommand('open_url', { url });
        if (!result || !result.success) {
          console.error('URLを開くエラー:', result?.error || '不明なエラー');
        }
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('URLを開くエラー:', error);
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (fallbackError) {
        console.error('フォールバックでもURLを開けませんでした:', fallbackError);
      }
    }
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#374151' }}>
        {label}
      </label>
      {isEditing || isEditingUrl ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '600px' }}>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#FFFFFF',
            }}
            onBlur={() => setIsEditingUrl(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setIsEditingUrl(false);
              }
            }}
            autoFocus
          />
          <button
            onClick={() => setIsEditingUrl(false)}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              color: '#6B7280',
              backgroundColor: '#F3F4F6',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E5E7EB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
          >
            完了
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '600px' }}>
          {value ? (
            <div
              onClick={() => handleUrlClick(value)}
              style={{
                flex: 1,
                color: '#4262FF',
                textDecoration: 'none',
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              {value}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </div>
          ) : (
            <span style={{ flex: 1, color: '#9CA3AF', fontSize: '14px' }}>未設定</span>
          )}
          <button
            onClick={() => setIsEditingUrl(true)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              color: '#9CA3AF',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              opacity: 0.6,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.6';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="編集"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default function UrlSection({
  isEditing,
  localHpUrl,
  setLocalHpUrl,
  localAsanaUrl,
  setLocalAsanaUrl,
  localBoxUrl,
  setLocalBoxUrl,
}: UrlSectionProps) {
  return (
    <>
      <UrlField
        label="HP URL"
        value={localHpUrl}
        onChange={setLocalHpUrl}
        placeholder="https://example.com"
        isEditing={isEditing}
      />
      <UrlField
        label="Asana URL"
        value={localAsanaUrl}
        onChange={setLocalAsanaUrl}
        placeholder="https://app.asana.com/..."
        isEditing={isEditing}
      />
      <UrlField
        label="Box URL"
        value={localBoxUrl}
        onChange={setLocalBoxUrl}
        placeholder="https://app.box.com/..."
        isEditing={isEditing}
      />
    </>
  );
}

