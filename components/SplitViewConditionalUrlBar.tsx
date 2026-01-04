'use client';

import React from 'react';
import { useSplitView } from './SplitViewProvider';
import UrlBar from './UrlBar';

interface SplitViewConditionalUrlBarProps {
  sidebarOpen?: boolean;
  user?: any;
}

export default function SplitViewConditionalUrlBar({ sidebarOpen, user }: SplitViewConditionalUrlBarProps) {
  const { isSplitViewEnabled } = useSplitView();

  // 分割ビューが有効な場合は表示しない（各パネル内で表示される）
  if (isSplitViewEnabled) {
    return null;
  }

  return <UrlBar sidebarOpen={sidebarOpen} user={user} />;
}

