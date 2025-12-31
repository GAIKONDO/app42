/**
 * リアルタイム同期機能
 * Supabase Realtimeを使用してデータ変更をリアルタイムで同期
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';

    if (!useSupabase || !supabaseUrl || !supabaseAnonKey) {
      console.warn('RealtimeSync: Supabase環境変数が設定されていません。リアルタイム同期は無効です。');
      // ダミーのSupabaseクライアントを作成（エラーを防ぐため）
      this.supabase = createClient('https://dummy.supabase.co', 'dummy-key');
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  /**
   * テーブルの変更を購読
   * @param table テーブル名
   * @param callback 変更時のコールバック関数
   * @returns 購読解除関数
   */
  subscribe(table: string, callback: (payload: RealtimePayload) => void): () => void {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    
    if (!useSupabase) {
      console.warn(`RealtimeSync: Supabaseが無効です。テーブル "${table}" の購読をスキップします。`);
      return () => {};
    }

    // 既存の購読を解除
    this.unsubscribe(table);

    console.log(`RealtimeSync: テーブル "${table}" の購読を開始します`);

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
          console.log(`RealtimeSync: テーブル "${table}" で変更を検出`, payload);
          
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
          console.log(`RealtimeSync: テーブル "${table}" の購読に成功しました`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`RealtimeSync: テーブル "${table}" の購読エラー`);
        } else {
          console.log(`RealtimeSync: テーブル "${table}" の購読ステータス: ${status}`);
        }
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
      console.log(`RealtimeSync: テーブル "${table}" の購読を解除します`);
      this.supabase.removeChannel(channel);
      this.channels.delete(table);
    } else {
      console.warn(`RealtimeSync: テーブル "${table}" の購読が見つかりません`);
    }
  }

  /**
   * 全ての購読を解除
   */
  unsubscribeAll(): void {
    console.log('RealtimeSync: すべての購読を解除します');
    for (const [table, channel] of this.channels.entries()) {
      this.supabase.removeChannel(channel);
      console.log(`RealtimeSync: テーブル "${table}" の購読を解除しました`);
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
