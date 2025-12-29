'use client';

interface SubTabBarProps {
  activeTab: 'management' | 'diagram';
  onTabChange: (tab: 'management' | 'diagram') => void;
  managementLabel: string;
  diagramLabel: string;
}

export function SubTabBar({ activeTab, onTabChange, managementLabel, diagramLabel }: SubTabBarProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      marginBottom: '24px',
      borderBottom: '1px solid #E0E0E0',
    }}>
      <button
        type="button"
        onClick={() => onTabChange('diagram')}
        style={{
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: '500',
          color: activeTab === 'diagram' ? '#4262FF' : '#6B7280',
          backgroundColor: 'transparent',
          border: 'none',
          borderBottom: activeTab === 'diagram' ? '2px solid #4262FF' : '2px solid transparent',
          cursor: 'pointer',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {diagramLabel}
      </button>
      <button
        type="button"
        onClick={() => onTabChange('management')}
        style={{
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: '500',
          color: activeTab === 'management' ? '#4262FF' : '#6B7280',
          backgroundColor: 'transparent',
          border: 'none',
          borderBottom: activeTab === 'management' ? '2px solid #4262FF' : '2px solid transparent',
          cursor: 'pointer',
          fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {managementLabel}
      </button>
    </div>
  );
}

