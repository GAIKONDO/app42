/**
 * リアルタイム同期機能
 * Supabase Realtimeを使用してデータ変更をリアルタイムで同期
 */

import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './utils/supabaseClient';

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
  commitTimestamp: string;
  errors: string[];
  old: { [key: string]: any } | null;
  new: { [key: string]: any } | null;
}

export class RealtimeSync {
  private supabase: SupabaseClient;
  private channels: Map<string, RealtimeChannel> = new Map();

  constructor() {
    // Supabase専用（環境変数チェック不要）
    // シングルトンのSupabaseクライアントを使用
    try {
      this.supabase = getSupabaseClient();
    } catch (error) {
      // Supabaseクライアントの取得に失敗した場合は、ダミークライアントを使用
      console.warn('RealtimeSync: Supabaseクライアントの取得に失敗しました。ダミークライアントを使用します。', error);
      const { createClient } = require('@supabase/supabase-js');
      this.supabase = createClient('https://dummy.supabase.co', 'dummy-key');
    }
  }

  /**
   * テーブルの変更を購読
   * @param table テーブル名
   * @param callback 変更時のコールバック関数
   * @returns 購読解除関数
   */
  subscribe(table: string, callback: (payload: RealtimePayload) => void): () => void {
    // Supabase専用（環境変数チェック不要）

    // 既存の購読を解除
    this.unsubscribe(table);

    const channelName = `${table}-changes`;
    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: table,
        },
        (payload: any) => {
          // Supabaseのpostgres_changesペイロード形式に合わせて変換
          // payload.eventType または payload.type からイベントタイプを取得
          const eventType = payload.eventType || payload.type || 'UNKNOWN';
          
          // ペイロードをRealtimePayload形式に変換
          const realtimePayload: RealtimePayload = {
            eventType: eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            schema: payload.schema || 'public',
            table: payload.table || table,
            commitTimestamp: payload.commit_timestamp || payload.commitTimestamp || new Date().toISOString(),
            errors: payload.errors || [],
            old: payload.old || null,
            new: payload.new || null,
          };
          
          callback(realtimePayload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // 購読成功（ログは出力しない）
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`RealtimeSync: テーブル "${table}" の購読エラー`);
        } else if (status === 'TIMED_OUT') {
          console.warn(`RealtimeSync: テーブル "${table}" の購読がタイムアウトしました`);
        }
        // CLOSED状態は正常な状態なのでログを出力しない
      });

    this.channels.set(table, channel);

    // unsubscribe関数を返す
    return () => {
      this.unsubscribe(table);
    };
  }

  /**
   * テーブルの購読を解除
   * @param table テーブル名
   */
  unsubscribe(table: string): void {
    const channel = this.channels.get(table);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.channels.delete(table);
    }
    // 購読が見つからない場合は何もしない（既に解除済みの可能性があるため、これは正常な状態）
  }

  /**
   * 全ての購読を解除
   */
  unsubscribeAll(): void {
    for (const [table, channel] of this.channels.entries()) {
      this.supabase.removeChannel(channel);
    }
    this.channels.clear();
  }
}

// シングルトンインスタンス
let realtimeSyncInstance: RealtimeSync | null = null;

export function getRealtimeSync(): RealtimeSync {
  if (!realtimeSyncInstance) {
    realtimeSyncInstance = new RealtimeSync();
  }
  return realtimeSyncInstance;
}
