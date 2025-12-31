/**
 * Supabaseデータソース実装
 * Supabase SDKを使用してDataSourceインターフェースを実装
 */

import { DataSource } from './dataSource';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { logSupabaseError } from './utils/supabaseErrorHandler';

export class SupabaseDataSource implements DataSource {
  private supabase: SupabaseClient;
  private channels: Map<string, RealtimeChannel> = new Map();

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Supabase環境変数が設定されていません。\n' +
        'NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。'
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  async doc_get(collectionName: string, docId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from(collectionName)
      .select('*')
      .eq('id', docId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // レコードが見つからない場合
        return null;
      }
      const errorInfo = logSupabaseError(error, 'doc_get');
      throw new Error(errorInfo.message);
    }

    return data;
  }

  async doc_set(collectionName: string, docId: string, data: any): Promise<void> {
    // 既存レコードをチェック
    const existing = await this.doc_get(collectionName, docId);

    const now = new Date().toISOString();
    const record = {
      ...data,
      id: docId,
      updatedAt: now,
      ...(existing ? {} : { createdAt: now }),
    };

    if (existing) {
      // 更新
      const { error } = await this.supabase
        .from(collectionName)
        .update(record)
        .eq('id', docId);

      if (error) {
        const errorInfo = logSupabaseError(error, 'doc_set (update)');
        throw new Error(errorInfo.message);
      }
    } else {
      // 挿入
      const { error } = await this.supabase
        .from(collectionName)
        .insert(record);

      if (error) {
        const errorInfo = logSupabaseError(error, 'doc_set (insert)');
        throw new Error(errorInfo.message);
      }
    }
  }

  async doc_update(collectionName: string, docId: string, data: any): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await this.supabase
      .from(collectionName)
      .update({
        ...data,
        updatedAt: now,
      })
      .eq('id', docId);

    if (error) {
      const errorInfo = logSupabaseError(error, 'doc_update');
      throw new Error(errorInfo.message);
    }
  }

  async doc_delete(collectionName: string, docId: string): Promise<void> {
    const { error } = await this.supabase
      .from(collectionName)
      .delete()
      .eq('id', docId);

    if (error) {
      const errorInfo = logSupabaseError(error, 'doc_delete');
      throw new Error(errorInfo.message);
    }
  }

  async collection_get(collectionName: string, conditions?: any): Promise<any[]> {
    let query = this.supabase.from(collectionName).select('*');

    // 条件を適用
    if (conditions) {
      // WHERE条件
      if (conditions.field && conditions.operator && conditions.value !== undefined) {
        const operator = conditions.operator === '==' ? 'eq' : conditions.operator;
        query = query.filter(conditions.field, operator, conditions.value);
      }

      // ORDER BY
      if (conditions.orderBy) {
        const ascending = conditions.orderDirection !== 'desc';
        query = query.order(conditions.orderBy, { ascending });
      }

      // LIMIT
      if (conditions.limit) {
        query = query.limit(conditions.limit);
      }
    }

    const { data, error } = await query;

    if (error) {
      const errorInfo = logSupabaseError(error, 'collection_get');
      throw new Error(errorInfo.message);
    }

    return data || [];
  }

  async collection_add(collectionName: string, data: any): Promise<string> {
    // UUIDを生成（crypto.randomUUIDを使用、フォールバックとしてDateベースのID）
    const docId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const record = {
      ...data,
      id: docId,
      createdAt: now,
      updatedAt: now,
    };

    const { error } = await this.supabase
      .from(collectionName)
      .insert(record);

    if (error) {
      const errorInfo = logSupabaseError(error, 'collection_add');
      throw new Error(errorInfo.message);
    }

    return docId;
  }

  async query_get(collectionName: string, conditions?: any): Promise<any[]> {
    // collection_getと同じ実装
    return this.collection_get(collectionName, conditions);
  }

  async sign_in(email: string, password: string): Promise<any> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const errorInfo = logSupabaseError(error, 'sign_in');
      throw new Error(errorInfo.message);
    }

    return {
      user: {
        uid: data.user?.id,
        email: data.user?.email,
        emailVerified: data.user?.email_confirmed_at !== null,
      },
    };
  }

  async sign_up(email: string, password: string): Promise<any> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      const errorInfo = logSupabaseError(error, 'sign_up');
      throw new Error(errorInfo.message);
    }

    return {
      user: {
        uid: data.user?.id,
        email: data.user?.email,
        emailVerified: data.user?.email_confirmed_at !== null,
      },
    };
  }

  async sign_out(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      const errorInfo = logSupabaseError(error, 'sign_out');
      throw new Error(errorInfo.message);
    }
  }

  async get_current_user(): Promise<any | null> {
    const { data: { user }, error } = await this.supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      uid: user.id,
      email: user.email,
      emailVerified: user.email_confirmed_at !== null,
    };
  }

  // リアルタイム同期
  subscribe(table: string, callback: (payload: any) => void): () => void {
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
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    this.channels.set(table, channel);

    // unsubscribe関数を返す
    return () => {
      this.unsubscribe(table);
    };
  }

  unsubscribe(table: string): void {
    const channel = this.channels.get(table);
    if (channel) {
      this.supabase.removeChannel(channel);
      this.channels.delete(table);
    }
  }
}

