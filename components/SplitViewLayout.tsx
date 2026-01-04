'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSplitView } from './SplitViewProvider';
import { useTabs } from './TabProvider';
import TabBar from './TabBar';
import UrlBar from './UrlBar';

// パネルコンテンツコンポーネント
function SplitPanelContent({ panelId }: { panelId: 'left' | 'right' }) {
  const { getActiveTabByPanel, getTabsByPanel } = useTabs();
  const activeTab = getActiveTabByPanel(panelId);
  const panelTabs = getTabsByPanel(panelId);

  // デバッグ用ログ
  useEffect(() => {
    console.log(`SplitPanelContent [${panelId}]:`, {
      activeTab,
      panelTabs,
      panelTabsCount: panelTabs.length,
    });
  }, [panelId, activeTab, panelTabs]);

  if (!activeTab) {
    if (panelTabs.length === 0) {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#9ca3af',
          fontSize: '14px'
        }}>
          タブがありません
        </div>
      );
    }
    // タブはあるがアクティブでない場合は、最初のタブを表示
    const firstTab = panelTabs[0];
    if (!firstTab) {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#9ca3af',
          fontSize: '14px'
        }}>
          タブがありません
        </div>
      );
    }
    // 最初のタブを表示（アクティブでない場合でも）
    const tabToDisplay = firstTab;
    try {
      const url = new URL(tabToDisplay.url);
      return (
        <iframe
          src={tabToDisplay.url}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title={`${panelId}パネル: ${tabToDisplay.title}`}
        />
      );
    } catch (error) {
      console.error('URL解析エラー:', error);
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#dc2626',
          fontSize: '14px'
        }}>
          URLが無効です: {tabToDisplay.url}
        </div>
      );
    }
  }

  try {
    const url = new URL(activeTab.url);
    // 同じオリジンの場合はiframeで表示
    if (url.origin === (typeof window !== 'undefined' ? window.location.origin : '')) {
      return (
        <iframe
          src={activeTab.url}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title={`${panelId}パネル: ${activeTab.title}`}
        />
      );
    } else {
      // 外部URLの場合はiframeで表示
      return (
        <iframe
          src={activeTab.url}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title={`${panelId}パネル: ${activeTab.title}`}
        />
      );
    }
  } catch (error) {
    console.error('URL解析エラー:', error);
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        color: '#dc2626',
        fontSize: '14px'
      }}>
        URLが無効です: {activeTab.url}
      </div>
    );
  }
}

interface SplitViewLayoutProps {
  children: React.ReactNode;
  sidebarOpen?: boolean;
  user?: any;
}

export default function SplitViewLayout({ children, sidebarOpen = false, user }: SplitViewLayoutProps) {
  const { isSplitViewEnabled, splitRatio, setSplitRatio } = useSplitView();
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartXRef = useRef<number>(0);
  const resizeStartRatioRef = useRef<number>(0.5);

  // リサイズ開始
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartXRef.current = e.clientX;
    resizeStartRatioRef.current = splitRatio;
  };

  // リサイズ中
  useEffect(() => {
    if (!isResizing) return;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartXRef.current;
      const windowWidth = window.innerWidth;
      const deltaRatio = deltaX / windowWidth;
      const newRatio = Math.max(0.2, Math.min(0.8, resizeStartRatioRef.current + deltaRatio));
      setSplitRatio(newRatio);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, splitRatio, setSplitRatio]);

  // 分割ビューが無効な場合は、そのままchildrenを返す
  if (!isSplitViewEnabled) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `${splitRatio * 100}% 6px ${(1 - splitRatio) * 100}%`,
        height: '100vh',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 左パネル */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {user && <TabBar sidebarOpen={sidebarOpen} user={user} panelId="left" />}
        {user && <UrlBar sidebarOpen={sidebarOpen} user={user} panelId="left" />}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            marginTop: user ? '76px' : '0',
          }}
        >
          <SplitPanelContent panelId="left" />
        </div>
      </div>

      {/* リサイズハンドル */}
      <div
        onMouseDown={handleResizeStart}
        style={{
          cursor: 'col-resize',
          backgroundColor: isResizing ? 'rgba(59, 130, 246, 0.6)' : 'transparent',
          transition: isResizing ? 'none' : 'background-color 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 100,
        }}
        onMouseEnter={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isResizing) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        title="ドラッグして分割比率を調整"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            alignItems: 'center',
            opacity: isResizing ? 1 : 0.5,
            transition: 'opacity 0.2s ease',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '3px',
                height: '3px',
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '50%',
              }}
            />
          ))}
        </div>
      </div>

      {/* 右パネル */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {user && <TabBar sidebarOpen={sidebarOpen} user={user} panelId="right" />}
        {user && <UrlBar sidebarOpen={sidebarOpen} user={user} panelId="right" />}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            marginTop: user ? '76px' : '0',
          }}
        >
          <SplitPanelContent panelId="right" />
        </div>
      </div>
    </div>
  );
}

