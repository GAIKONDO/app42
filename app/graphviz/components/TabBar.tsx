/**
 * Graphvizページ用タブバーコンポーネント
 */

'use client';

interface GraphvizTabBarProps {
  activeTab: 'tab0' | 'tab1' | 'tab2' | 'tab3' | 'tab4';
  onTabChange: (tab: 'tab0' | 'tab1' | 'tab2' | 'tab3' | 'tab4') => void;
  availableTabs?: ('tab0' | 'tab1' | 'tab2' | 'tab3' | 'tab4')[]; // 利用可能なタブのリスト
}

export function GraphvizTabBar({ activeTab, onTabChange, availableTabs }: GraphvizTabBarProps) {
  const allTabs = [
    { id: 'tab0' as const, label: 'タブ0: 全体俯瞰', description: 'すべての棟・ラック・機器を一つのビューで確認' },
    { id: 'tab1' as const, label: 'タブ1: 棟間ネットワーク', description: '複数棟間のネットワーク接続関係' },
    { id: 'tab2' as const, label: 'タブ2: 棟内機器構成', description: '棟内のラック・機器配置と接続' },
    { id: 'tab3' as const, label: 'タブ3: ラック内サーバー', description: 'ラック内のサーバー・ポート詳細' },
    { id: 'tab4' as const, label: 'タブ4: 機器詳細', description: '機器の詳細設定・シーケンス' },
  ];
  
  // 利用可能なタブのみをフィルタリング（指定がない場合はすべて表示）
  const tabs = availableTabs 
    ? allTabs.filter(tab => availableTabs.includes(tab.id))
    : allTabs;

  return (
    <div style={{ 
      display: 'flex', 
      gap: '8px', 
      marginBottom: '24px', 
      borderBottom: '1px solid #E0E0E0' 
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          title={tab.description}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'transparent',
            color: activeTab === tab.id ? '#4262FF' : '#808080',
            borderBottom: activeTab === tab.id ? '2px solid #4262FF' : '2px solid transparent',
            cursor: 'pointer',
            fontWeight: activeTab === tab.id ? 600 : 400,
            fontSize: '14px',
            fontFamily: 'var(--font-inter), var(--font-noto), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            transition: 'all 150ms',
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.color = '#1A1A1A';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.color = '#808080';
            }
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

