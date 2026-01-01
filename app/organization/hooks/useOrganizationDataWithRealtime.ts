/**
 * リアルタイム同期対応の組織データフック
 * 既存のuseOrganizationDataにリアルタイム同期機能を追加したバージョン
 */

import { useOrganizationData } from './useOrganizationData';
import { useOrganizationRealtimeSync } from './useOrganizationRealtimeSync';

/**
 * リアルタイム同期対応の組織データフック
 * 
 * @example
 * ```tsx
 * const {
 *   selectedNode,
 *   setSelectedNode,
 *   orgData,
 *   setOrgData,
 *   loading,
 *   error,
 *   selectedNodeMembers,
 *   setSelectedNodeMembers,
 *   refreshOrgData,
 * } = useOrganizationDataWithRealtime();
 * ```
 */
export function useOrganizationDataWithRealtime() {
  const organizationData = useOrganizationData();

  // リアルタイム同期を有効化（Supabase使用時のみ）
  useOrganizationRealtimeSync({
    orgData: organizationData.orgData,
    setOrgData: organizationData.setOrgData,
    enabled: true, // Supabase専用
  });

  return organizationData;
}

