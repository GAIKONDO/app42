/**
 * リアルタイム同期フック
 * コンポーネントでリアルタイム同期を簡単に使用できるReactフック
 */

import { useEffect, useRef } from 'react';
import { getRealtimeSync } from '../realtimeSync';

export interface UseRealtimeSyncOptions {
  table: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  enabled?: boolean;
}

/**
 * リアルタイム同期フック
 * 
 * @example
 * ```tsx
 * useRealtimeSync({
 *   table: 'organizations',
 *   onInsert: (payload) => {
 *     console.log('新しい組織が追加されました:', payload.new);
 *     // UIを更新
 *   },
 *   onUpdate: (payload) => {
 *     console.log('組織が更新されました:', payload.new);
 *     // UIを更新
 *   },
 *   onDelete: (payload) => {
 *     console.log('組織が削除されました:', payload.old);
 *     // UIを更新
 *   },
 * });
 * ```
 */
export function useRealtimeSync(options: UseRealtimeSyncOptions) {
  const {
    table,
    onInsert,
    onUpdate,
    onDelete,
    enabled = true,
  } = options;

  const realtimeSync = getRealtimeSync();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // 購読を開始
    const unsubscribe = realtimeSync.subscribe(table, (payload) => {
      const eventType = payload.eventType;

      switch (eventType) {
        case 'INSERT':
          if (onInsert) {
            onInsert(payload);
          }
          break;
        case 'UPDATE':
          if (onUpdate) {
            onUpdate(payload);
          }
          break;
        case 'DELETE':
          if (onDelete) {
            onDelete(payload);
          }
          break;
        default:
          // 全てのイベントタイプに対応
          if (onInsert && eventType === 'INSERT') {
            onInsert(payload);
          } else if (onUpdate && eventType === 'UPDATE') {
            onUpdate(payload);
          } else if (onDelete && eventType === 'DELETE') {
            onDelete(payload);
          }
      }
    });

    unsubscribeRef.current = unsubscribe;

    // クリーンアップ
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [table, onInsert, onUpdate, onDelete, enabled, realtimeSync]);

  // 手動で購読を解除する関数を返す
  return {
    unsubscribe: () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    },
  };
}

