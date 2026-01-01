/**
 * 組織管理用のリアルタイム同期フック
 * 既存の組織管理コンポーネントに統合する例
 */

import { useEffect, useCallback } from 'react';
import { useRealtimeSync } from '@/lib/hooks';
import type { OrgNodeData } from '@/components/OrgChart';

/**
 * 組織データをリアルタイム同期するフック
 * 
 * @example
 * ```tsx
 * const { orgData, setOrgData } = useOrganizationData();
 * 
 * useOrganizationRealtimeSync({
 *   orgData,
 *   setOrgData,
 *   enabled: true, // Supabase使用時のみ有効化
 * });
 * ```
 */
export function useOrganizationRealtimeSync({
  orgData,
  setOrgData,
  enabled = true, // Supabase専用
}: {
  orgData: OrgNodeData | null;
  setOrgData: (data: OrgNodeData | null) => void;
  enabled?: boolean;
}) {
  // 組織ツリーを再構築する関数
  const rebuildOrgTree = useCallback(async () => {
    // 既存のgetOrgTreeFromDbを使用して組織ツリーを再取得
    try {
      const { getOrgTreeFromDb } = await import('@/lib/orgApi');
      const tree = await getOrgTreeFromDb();
      setOrgData(tree);
    } catch (error) {
      console.error('組織ツリーの再構築エラー:', error);
    }
  }, [setOrgData]);

  // リアルタイム同期を有効化
  useRealtimeSync({
    table: 'organizations',
    enabled,
    onInsert: (payload) => {
      console.log('🆕 新しい組織が追加されました:', payload.new);
      // 組織ツリーを再構築
      rebuildOrgTree();
    },
    onUpdate: (payload) => {
      console.log('🔄 組織が更新されました:', payload.new);
      // 組織ツリーを再構築
      rebuildOrgTree();
    },
    onDelete: (payload) => {
      console.log('🗑️ 組織が削除されました:', payload.old);
      // 組織ツリーを再構築
      rebuildOrgTree();
    },
  });

  // 初回マウント時にSupabase使用時のみ有効化
  useEffect(() => {
    if (enabled) {
      console.log('✅ 組織のリアルタイム同期を有効化しました');
    }
  }, [enabled]);
}

