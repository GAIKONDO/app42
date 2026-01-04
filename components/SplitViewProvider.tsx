'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface SplitViewContextType {
  isSplitViewEnabled: boolean;
  splitRatio: number; // 0-1の値（左パネルの幅の割合）
  toggleSplitView: () => void;
  setSplitRatio: (ratio: number) => void;
  leftPanelActiveTabId: string | null;
  rightPanelActiveTabId: string | null;
  setLeftPanelActiveTabId: (tabId: string | null) => void;
  setRightPanelActiveTabId: (tabId: string | null) => void;
}

const SplitViewContext = createContext<SplitViewContextType | undefined>(undefined);

export function useSplitView() {
  const context = useContext(SplitViewContext);
  if (!context) {
    throw new Error('useSplitView must be used within SplitViewProvider');
  }
  return context;
}

interface SplitViewProviderProps {
  children: React.ReactNode;
}

export function SplitViewProvider({ children }: SplitViewProviderProps) {
  const [isSplitViewEnabled, setIsSplitViewEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('splitViewEnabled');
      return saved === 'true';
    }
    return false;
  });

  const [splitRatio, setSplitRatioState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('splitViewRatio');
      return saved ? parseFloat(saved) : 0.5;
    }
    return 0.5;
  });

  const [leftPanelActiveTabId, setLeftPanelActiveTabId] = useState<string | null>(null);
  const [rightPanelActiveTabId, setRightPanelActiveTabId] = useState<string | null>(null);

  // localStorageに保存
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('splitViewEnabled', isSplitViewEnabled.toString());
    }
  }, [isSplitViewEnabled]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('splitViewRatio', splitRatio.toString());
    }
  }, [splitRatio]);

  const toggleSplitView = useCallback(() => {
    setIsSplitViewEnabled((prev) => !prev);
  }, []);

  const setSplitRatio = useCallback((ratio: number) => {
    // 0.2から0.8の範囲に制限
    const clampedRatio = Math.max(0.2, Math.min(0.8, ratio));
    setSplitRatioState(clampedRatio);
  }, []);

  const value: SplitViewContextType = {
    isSplitViewEnabled,
    splitRatio,
    toggleSplitView,
    setSplitRatio,
    leftPanelActiveTabId,
    rightPanelActiveTabId,
    setLeftPanelActiveTabId,
    setRightPanelActiveTabId,
  };

  return <SplitViewContext.Provider value={value}>{children}</SplitViewContext.Provider>;
}

