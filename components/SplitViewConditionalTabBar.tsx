'use client';

import React from 'react';
import { useSplitView } from './SplitViewProvider';
import TabBar from './TabBar';

interface SplitViewConditionalTabBarProps {
  sidebarOpen?: boolean;
  user?: any;
}

export default function SplitViewConditionalTabBar({ sidebarOpen, user }: SplitViewConditionalTabBarProps) {
  const { isSplitViewEnabled } = useSplitView();

  // 分割ビューが有効な場合は表示しない（各パネル内で表示される）
  if (isSplitViewEnabled) {
    return null;
  }

  return <TabBar sidebarOpen={sidebarOpen} user={user} />;
}

