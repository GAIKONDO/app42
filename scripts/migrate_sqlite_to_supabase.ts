/**
 * SQLiteからSupabaseへのデータ移行スクリプト
 * 
 * 使用方法:
 *   npx tsx scripts/migrate_sqlite_to_supabase.ts
 * 
 * 前提条件:
 *   - .env.localにSupabase設定が含まれていること
 *   - data/app.dbが存在すること
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// .env.localファイルを読み込む
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// 環境変数の確認
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ エラー: Supabase環境変数が設定されていません');
  console.error('   NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// SQLiteデータベースのパス
const sqliteDbPath = path.join(process.cwd(), 'data', 'app.db');

if (!fs.existsSync(sqliteDbPath)) {
  console.error(`❌ エラー: SQLiteデータベースが見つかりません: ${sqliteDbPath}`);
  process.exit(1);
}

const db = new Database(sqliteDbPath, { readonly: true });

// テーブルのインポート順序（外部キー制約を考慮）
const importOrder = [
  // 1. ユーザー管理（依存なし）
  'users',
  'approvalRequests',
  
  // 2. 組織管理（自己参照あり）
  'organizations',
  'organizationMembers',
  'organizationContents',
  'companyContents',
  
  // 3. 議事録・施策（organizationsに依存）
  'meetingNotes',
  'startups', // スタートアップ（organizationsに依存）
  'focusInitiatives',
  'themes',
  'themeHierarchyConfigs',
  
  // 4. ナレッジグラフ（organizations, entities, topicsに依存）
  'entities',
  'topics',
  'relations',
  'topicFiles',
  
  // 5. システム設計ドキュメント（依存なし）
  'designDocSections',
  'designDocSectionRelations',
  
  // 6. Agentシステム（依存なし）
  'agents',
  'tasks',
  'taskExecutions',
  'taskChains',
  'a2aMessages',
  'agent_prompt_versions',
  'mcp_tools',
  
  // 7. その他（依存なし）
  'aiSettings',
  'backupHistory',
  
  // 8. その他のテーブル（上記に含まれていないもの）
  'categories',
  'statuses',
  'departments',
  'engagementLevels',
  'bizDevPhases',
  'categoryBizDevPhaseSnapshots',
  'vcs',
  'graphvizDotFiles',
  'graphvizYamlFiles',
  'graphvizYamlFileAttachments',
];

// テーブルのカラム情報を取得
function getTableColumns(tableName: string): string[] {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
  return columns.map(col => col.name);
}

// UnixタイムスタンプをISO 8601形式に変換
function convertTimestamp(value: any): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  
  // 数値の場合（Unixタイムスタンプ）
  if (typeof value === 'number') {
    // 秒単位のタイムスタンプ（10桁）またはミリ秒単位（13桁）を判定
    const timestamp = value.toString().length === 10 ? value * 1000 : value;
    return new Date(timestamp).toISOString();
  }
  
  // 文字列の場合
  if (typeof value === 'string') {
    // Unixタイムスタンプ（数値文字列）の場合
    if (/^\d+$/.test(value)) {
      const numValue = parseInt(value, 10);
      const timestamp = value.length === 10 ? numValue * 1000 : numValue;
      return new Date(timestamp).toISOString();
    }
    
    // 既にISO 8601形式の場合
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return value;
    }
  }
  
  return value;
}

// SQLiteのデータ型をPostgreSQLに変換
function convertValue(value: any, columnType: string, columnName: string): any {
  if (value === null || value === undefined) {
    return null;
  }

  // 日時カラムの変換（ただし、monetizationRenewalNotRequiredなどのboolean/integerカラムは除外）
  const isDateTimeColumn = (columnName.toLowerCase().includes('at') ||
      columnName.toLowerCase() === 'timestamp' ||
      columnName.toLowerCase() === 'date') &&
      !columnName.toLowerCase().includes('renewal') &&
      !columnName.toLowerCase().includes('notrequired');
  
  if (isDateTimeColumn) {
    return convertTimestamp(value);
  }

  // INTEGER型の変換
  if (columnType === 'INTEGER') {
    // 既にISO 8601形式の文字列の場合は、日時として扱わない
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      // これは日時文字列だが、INTEGER型のカラムなので変換しない
      // monetizationRenewalNotRequiredなどのboolean/integerカラムの場合
      return null; // または適切なデフォルト値
    }
    return typeof value === 'string' ? parseInt(value, 10) : value;
  }

  // REAL型の変換
  if (columnType === 'REAL') {
    return typeof value === 'string' ? parseFloat(value) : value;
  }

  // TEXT型はそのまま
  if (columnType === 'TEXT') {
    return value;
  }

  // BLOB型はBase64エンコード（必要に応じて）
  if (columnType === 'BLOB') {
    return Buffer.from(value).toString('base64');
  }

  return value;
}

// カラム名のマッピング（SQLite → PostgreSQL）
const columnMapping: Record<string, Record<string, string>> = {
  users: {
    // PostgreSQLでは大文字小文字を区別するため、引用符付きカラム名を使用
  },
  organizations: {
    parentId: 'parentId', // 引用符付き
    levelName: 'levelName', // 引用符付き
    createdAt: 'createdAt', // 引用符付き
    updatedAt: 'updatedAt', // 引用符付き
  },
};

// 除外するカラム（Supabaseスキーマに存在しないカラム）
const excludedColumns: Record<string, string[]> = {
  topics: ['topicDate'], // Supabaseスキーマに存在しないカラム
};

// テーブルのデータを取得
function getTableData(tableName: string): any[] {
  try {
    const columns = getTableColumns(tableName);
    const columnInfo = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
    const columnMap = new Map(columnInfo.map(col => [col.name, col.type]));
    
    const rows = db.prepare(`SELECT * FROM ${tableName}`).all() as any[];
    const mapping = columnMapping[tableName] || {};
    const excluded = excludedColumns[tableName] || [];
    
    return rows.map(row => {
      const convertedRow: any = {};
      for (const column of columns) {
        // 除外リストに含まれているカラムはスキップ
        if (excluded.includes(column)) {
          continue;
        }
        
        const columnType = columnMap.get(column) || 'TEXT';
        // マッピングがある場合はそれを使用、ない場合は元のカラム名を使用
        const targetColumn = mapping[column] || column;
        convertedRow[targetColumn] = convertValue(row[column], columnType, column);
      }
      return convertedRow;
    });
  } catch (error: any) {
    console.error(`  ⚠️  テーブル "${tableName}" のデータ取得エラー:`, error.message);
    return [];
  }
}

// テーブルが存在するか確認
function tableExists(tableName: string): boolean {
  try {
    const result = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
    ).get(tableName);
    return !!result;
  } catch {
    return false;
  }
}

// テーブルがSupabaseに存在するか確認（大文字小文字を考慮）
async function tableExistsInSupabase(tableName: string): Promise<string | null> {
  // まず元のテーブル名で試行
  try {
    const { error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);
    
    if (!error) {
      return tableName;
    }
    
    // エラーメッセージをチェック
    if (error.message.includes('does not exist') || 
        error.message.includes('Could not find the table')) {
      // 小文字版を試行
      const lowerTableName = tableName.toLowerCase();
      if (lowerTableName !== tableName) {
        try {
          const { error: lowerError } = await supabase
            .from(lowerTableName)
            .select('id')
            .limit(1);
          
          if (!lowerError) {
            return lowerTableName;
          }
        } catch {
          // 小文字版も失敗
        }
      }
      
      return null;
    }
    
    // その他のエラー（データがない場合など）はテーブルが存在するとみなす
    return tableName;
  } catch {
    // 小文字版を試行
    const lowerTableName = tableName.toLowerCase();
    if (lowerTableName !== tableName) {
      try {
        const { error } = await supabase
          .from(lowerTableName)
          .select('id')
          .limit(1);
        
        if (!error) {
          return lowerTableName;
        }
      } catch {
        // 小文字版も失敗
      }
    }
    
    return null;
  }
}

// Supabaseテーブルのカラム一覧を取得
async function getSupabaseColumns(tableName: string): Promise<Set<string>> {
  try {
    // 1件だけ取得してカラム名を確認
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      // テーブルが存在しない場合
      if (error.message.includes('does not exist') || 
          error.message.includes('Could not find the table')) {
        return new Set();
      }
      // データがない場合でもカラム情報は取得できる
      // エラーメッセージからカラム情報を推測できないため、空のセットを返す
      return new Set();
    }
    
    if (data && data.length > 0) {
      // カラム名の大文字小文字を保持したセットを作成
      const columns = new Set<string>();
      for (const key of Object.keys(data[0])) {
        columns.add(key);
        // 小文字版も追加（大文字小文字の違いに対応）
        columns.add(key.toLowerCase());
      }
      return columns;
    }
    
    // データがない場合、スキーマからカラム情報を取得する方法がないため、
    // 試行錯誤でカラムを確認する
    return new Set();
  } catch {
    return new Set();
  }
}

// データをSupabaseにインポート
async function importTableData(tableName: string, data: any[]): Promise<number> {
  if (data.length === 0) {
    return 0;
  }
  
  // テーブルがSupabaseに存在するか確認（正しいテーブル名を取得）
  const actualTableName = await tableExistsInSupabase(tableName);
  if (!actualTableName) {
    console.log(`  ⚠️  テーブル "${tableName}" はSupabaseに存在しません（スキップ）`);
    return 0;
  }
  
  // テーブル名が変更された場合はログ出力
  if (actualTableName !== tableName) {
    console.log(`  ℹ️  テーブル名を "${tableName}" → "${actualTableName}" に変更しました`);
  }
  
  try {
    // 最初のレコードでカラムを確認
    if (data.length > 0) {
      const testRecord = data[0];
      const supabaseColumns = await getSupabaseColumns(actualTableName);
      
      // 存在しないカラムをフィルタリング
      const filteredData = data.map(record => {
        const filtered: any = {};
        for (const [key, value] of Object.entries(record)) {
          // カラム名の大文字小文字を考慮
          // まず元のキーで確認、次に小文字版で確認
          const keyLower = key.toLowerCase();
          let columnExists = false;
          let targetKey = key;
          
          // 完全一致
          if (supabaseColumns.has(key)) {
            columnExists = true;
            targetKey = key;
          }
          // 小文字版で一致
          else if (supabaseColumns.has(keyLower)) {
            columnExists = true;
            targetKey = keyLower;
          }
          // idカラムは常に含める
          else if (key === 'id') {
            columnExists = true;
            targetKey = key;
          }
          // カラム情報が取得できない場合は全て含める（後でエラー時に除外）
          else if (supabaseColumns.size === 0) {
            columnExists = true;
            targetKey = key;
          }
          
          if (columnExists) {
            filtered[targetKey] = value;
          }
        }
        return filtered;
      });
      
      data = filteredData;
    }
    
    // バッチサイズ（Supabaseの制限を考慮）
    const batchSize = 1000;
    let imported = 0;
    let retryCount = 0;
    const maxRetries = 5;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      // Supabaseのupsertはカラム名をそのまま使用（PostgreSQLのスキーマで引用符が設定されている）
      const { error } = await supabase
        .from(actualTableName)
        .upsert(batch, { onConflict: 'id' });
      
      if (error) {
        // カラム名のエラーの場合、存在しないカラムを除外して再試行
        if (error.message.includes('Could not find the') && error.message.includes('column')) {
          const columnMatch = error.message.match(/column ['"]([^'"]+)['"]/);
          if (columnMatch && retryCount < maxRetries) {
            const missingColumn = columnMatch[1];
            const missingLower = missingColumn.toLowerCase();
            const hasUpperCase = missingColumn !== missingLower;
            
            console.log(`  ⚠️  カラム "${missingColumn}" が見つかりません。小文字版を試すか、除外して再試行します。`);
            
            // まず、小文字版のカラム名で再試行（大文字小文字が混在している場合）
            if (hasUpperCase) {
              const dataWithLowerColumn = data.map(record => {
                const filtered: any = {};
                for (const [key, value] of Object.entries(record)) {
                  const keyLower = key.toLowerCase();
                  // 元のキーと小文字版の両方をチェック
                  if (key === missingColumn) {
                    // 大文字小文字が混在しているカラムを小文字版に変換
                    filtered[missingLower] = value;
                  } else if (keyLower !== missingLower) {
                    // その他のカラムはそのまま
                    filtered[key] = value;
                  }
                }
                return filtered;
              });
              
              // 小文字版で再試行
              const { error: retryError } = await supabase
                .from(actualTableName)
                .upsert(dataWithLowerColumn.slice(i, i + batchSize), { onConflict: 'id' });
              
              if (!retryError) {
                // 小文字版で成功した場合、残りのデータも小文字版に変換
                data = dataWithLowerColumn;
                imported += batch.length;
                retryCount = 0;
                continue;
              }
            }
            
            // 小文字版でも失敗した場合、カラムを除外
            console.log(`  ⚠️  カラム "${missingColumn}" を除外して再試行します。`);
            
            // 存在しないカラムを除外（すべてのバッチに適用）
            const filteredData = data.map(record => {
              const filtered: any = {};
              for (const [key, value] of Object.entries(record)) {
                // 大文字小文字を考慮して除外
                const keyLower = key.toLowerCase();
                const missingLower = missingColumn.toLowerCase();
                // 元のキーと小文字版の両方をチェック
                if (key !== missingColumn && 
                    keyLower !== missingLower &&
                    key !== missingLower &&
                    keyLower !== missingColumn) {
                  filtered[key] = value;
                }
              }
              return filtered;
            });
            
            // フィルタリングしたデータで再度インポート
            data = filteredData;
            i = -batchSize; // ループを最初からやり直す
            retryCount++;
            continue;
          }
        }
        
        // リトライ回数を超えた場合、またはその他のエラーの場合
        if (retryCount >= maxRetries) {
          console.error(`  ⚠️  最大リトライ回数（${maxRetries}回）に達しました。エラーをスキップします。`);
          // エラーを無視して続行（部分的な移行を許可）
          continue;
        }
        
        throw error;
      }
      
      // 成功した場合はリトライカウントをリセット
      retryCount = 0;
      
      imported += batch.length;
    }
    
    return imported;
  } catch (error: any) {
    console.error(`  ❌ インポートエラー:`, error.message);
    throw error;
  }
}

// メイン処理
async function main() {
  console.log('🚀 SQLiteからSupabaseへのデータ移行を開始します...\n');
  
  // 接続確認
  try {
    const { data, error } = await supabase.from('organizations').select('id').limit(1);
    if (error) {
      throw error;
    }
    console.log('✅ Supabase接続確認成功\n');
  } catch (error: any) {
    console.error('❌ Supabase接続エラー:', error.message);
    process.exit(1);
  }
  
  // 各テーブルを順番にインポート
  const results: { table: string; count: number; imported: number }[] = [];
  
  for (const tableName of importOrder) {
    if (!tableExists(tableName)) {
      console.log(`⏭️  テーブル "${tableName}" は存在しません（スキップ）`);
      continue;
    }
    
    console.log(`📦 テーブル "${tableName}" を処理中...`);
    
    try {
      const data = getTableData(tableName);
      const count = data.length;
      
      if (count === 0) {
        console.log(`  ℹ️  データがありません（スキップ）\n`);
        continue;
      }
      
      console.log(`  📊 ${count}件のレコードを取得しました`);
      
      const imported = await importTableData(tableName, data);
      console.log(`  ✅ ${imported}件のレコードをインポートしました\n`);
      
      results.push({ table: tableName, count, imported });
    } catch (error: any) {
      console.error(`  ❌ エラー: ${error.message}\n`);
      results.push({ table: tableName, count: 0, imported: 0 });
    }
  }
  
  // 結果サマリー
  console.log('\n📊 移行結果サマリー:');
  console.log('='.repeat(60));
  
  let totalCount = 0;
  let totalImported = 0;
  
  for (const result of results) {
    if (result.count > 0) {
      const status = result.imported === result.count ? '✅' : '⚠️';
      console.log(`${status} ${result.table}: ${result.imported}/${result.count}件`);
      totalCount += result.count;
      totalImported += result.imported;
    }
  }
  
  console.log('='.repeat(60));
  console.log(`合計: ${totalImported}/${totalCount}件のレコードをインポートしました`);
  
  if (totalImported === totalCount) {
    console.log('\n✅ データ移行が正常に完了しました！');
  } else {
    console.log('\n⚠️  一部のデータの移行に失敗しました。エラーログを確認してください。');
  }
  
  db.close();
}

// 実行
main().catch(error => {
  console.error('❌ 予期しないエラー:', error);
  db.close();
  process.exit(1);
});

