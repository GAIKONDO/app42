/**
 * Graphviz階層データ管理API
 * タブ0（全体俯瞰UI）用のデータ取得と整合性チェック
 */

import * as yaml from 'js-yaml';
import { getAllGraphvizYamlFiles, type GraphvizYamlFile } from './graphvizApi';

// ============================================================================
// 型定義
// ============================================================================

export interface SiteTopology {
  id: string;
  label: string;
  description?: string;
  type: 'site-topology';
  sites?: Site[];
  connections?: Connection[];
  fileId: string;
}

export interface Site {
  id: string;
  label: string;
  location?: {
    lat?: number;
    lon?: number;
    address?: string;
  };
  capacity?: {
    racks?: number;
    power?: number;
  };
}

export interface Connection {
  id: string;
  from: string; // site ID
  to: string; // site ID
  type?: string;
  bandwidth?: string;
  latency?: string;
  provider?: string;
  description?: string;
}

export interface SiteEquipment {
  id: string;
  label: string;
  description?: string;
  type: 'site-equipment';
  siteId: string; // タブ1のsite IDを参照
  racks?: Rack[];
  connections?: EquipmentConnection[];
  fileId: string;
}

export interface Rack {
  id: string;
  label: string;
  location?: {
    floor?: number;
    row?: string;
    position?: number;
  };
  capacity?: {
    units?: number;
    power?: number;
  };
  equipment?: Equipment[];
}

export interface Equipment {
  id: string;
  type: 'server' | 'switch' | 'router' | 'firewall' | 'storage';
  label: string;
  model?: string;
  position?: {
    unit?: string;
  };
  ports?: Port[];
}

export interface Port {
  id: string;
  label: string;
  type?: string; // ethernet, fiber, etc.
  speed?: string;
  role?: string; // management, public, internal, storage, backup, unused
}

export interface EquipmentConnection {
  id: string;
  from: {
    device: string;
    port: string;
  };
  to: {
    device: string;
    port: string;
  };
  network?: string;
  description?: string;
}

export interface RackServers {
  id: string;
  label: string;
  description?: string;
  type: 'rack-servers';
  rackId: string; // タブ2のrack IDを参照
  servers?: Server[];
  fileId: string;
}

export interface Server {
  id: string;
  label: string;
  model?: string;
  specs?: {
    cpu?: {
      model?: string;
      cores?: number;
    };
    memory?: {
      total?: string;
      slots?: number;
    };
    storage?: {
      type?: string;
      capacity?: string;
    };
  };
  ports?: DetailedPort[];
  connections?: ServerConnection[];
}

export interface DetailedPort {
  id: string;
  label: string;
  type?: string; // ethernet, fiber, etc.
  speed?: string;
  role?: string; // management, public, internal, storage, backup, unused
  mac?: string;
  ip?: string;
  vlan?: number;
  description?: string;
}

export interface ServerConnection {
  from: {
    port: string;
  };
  to: {
    device: string;
    port: string;
  };
  type?: string;
  description?: string;
}

export interface ServerDetails {
  id: string;
  label: string;
  description?: string;
  type: 'server-details';
  serverId: string; // タブ3のserver IDを参照
  os?: {
    type?: string;
    distribution?: string;
    kernel?: string;
    description?: string;
  };
  middleware?: Array<{
    name: string;
    version?: string;
    config?: string;
    description?: string;
  }>;
  applications?: Array<{
    name: string;
    port?: number;
    environment?: string;
    env_vars?: Record<string, string>;
    description?: string;
  }>;
  sequences?: Array<{
    id: string;
    label: string;
    description?: string;
    participants: string[];
    steps: Array<{
      from: string;
      to: string;
      message: string;
      description?: string;
    }>;
  }>;
  fileId: string;
}

// ============================================================================
// データ整合性チェック
// ============================================================================

export interface ValidationError {
  type: 'missing_reference' | 'circular_reference' | 'invalid_id' | 'missing_field';
  message: string;
  data: {
    sourceType: 'site-equipment' | 'rack-servers' | 'server-details';
    sourceId: string;
    sourceLabel: string;
    fileId?: string;
    fileName?: string;
    missingReferenceType?: 'site' | 'rack' | 'server';
    missingReferenceId?: string;
    missingField?: string;
  };
}

export interface ValidationWarning {
  type: 'orphaned_data' | 'unused_reference';
  message: string;
  data: {
    id: string;
    label: string;
    type: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * 参照整合性をチェック
 */
export async function validateHierarchyReferences(
  organizationId?: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  try {
    // 1. タブ1のデータを取得
    const allFiles = await getAllGraphvizYamlFiles(organizationId);
    const siteTopologies: SiteTopology[] = [];
    const siteEquipmentList: SiteEquipment[] = [];
    const rackServersList: RackServers[] = [];
    const serverDetailsList: ServerDetails[] = [];
    
    // ファイルIDからファイル名へのマップを作成
    const fileIdToNameMap = new Map<string, string>();
    for (const file of allFiles) {
      fileIdToNameMap.set(file.id, file.name);
    }
    
    // ファイルをタイプ別に分類
    for (const file of allFiles) {
      try {
        const parsed = yaml.load(file.yamlContent) as any;
        if (!parsed || typeof parsed !== 'object') continue;
        
        switch (parsed.type) {
          case 'site-topology':
            siteTopologies.push({
              ...parsed,
              fileId: file.id,
            } as SiteTopology);
            break;
          case 'site-equipment':
            siteEquipmentList.push({
              ...parsed,
              fileId: file.id,
            } as SiteEquipment);
            break;
          case 'rack-servers':
            rackServersList.push({
              ...parsed,
              fileId: file.id,
            } as RackServers);
            break;
          case 'server-details':
            serverDetailsList.push({
              ...parsed,
              fileId: file.id,
            } as ServerDetails);
            break;
        }
      } catch (e) {
        console.warn('YAMLパースエラー:', file.id, e);
      }
    }
    
    // 2. 棟IDのセットを作成
    const siteIds = new Set<string>();
    for (const siteTopology of siteTopologies) {
      if (siteTopology.sites && Array.isArray(siteTopology.sites)) {
        for (const site of siteTopology.sites) {
          siteIds.add(site.id);
        }
      }
    }
    
    // 3. タブ2のデータをチェック（siteIdの参照）
    for (const equipment of siteEquipmentList) {
      const fileName = fileIdToNameMap.get(equipment.fileId) || '不明なファイル';
      if (!equipment.siteId) {
        errors.push({
          type: 'missing_field',
          message: `棟内機器構成 "${equipment.label || equipment.id}" にsiteIdが設定されていません（カード: "${fileName}"）`,
          data: {
            sourceType: 'site-equipment',
            sourceId: equipment.id,
            sourceLabel: equipment.label || equipment.id,
            fileId: equipment.fileId,
            fileName: fileName,
            missingField: 'siteId',
          },
        });
        continue;
      }
      
      if (!siteIds.has(equipment.siteId)) {
        errors.push({
          type: 'missing_reference',
          message: `棟内機器構成 "${equipment.label || equipment.id}" が参照する棟 "${equipment.siteId}" が存在しません（カード: "${fileName}"）`,
          data: {
            sourceType: 'site-equipment',
            sourceId: equipment.id,
            sourceLabel: equipment.label || equipment.id,
            fileId: equipment.fileId,
            fileName: fileName,
            missingReferenceType: 'site',
            missingReferenceId: equipment.siteId,
          },
        });
      }
    }
    
    // 4. ラックIDのセットを作成（タブ2のデータから）
    const rackIds = new Set<string>();
    for (const equipment of siteEquipmentList) {
      if (equipment.racks && Array.isArray(equipment.racks)) {
        for (const rack of equipment.racks) {
          rackIds.add(rack.id);
        }
      }
    }
    
    // 5. タブ3のデータをチェック（rackIdの参照）
    for (const rackServers of rackServersList) {
      const fileName = fileIdToNameMap.get(rackServers.fileId) || '不明なファイル';
      if (!rackServers.rackId) {
        errors.push({
          type: 'missing_field',
          message: `ラック内サーバー "${rackServers.label || rackServers.id}" にrackIdが設定されていません（カード: "${fileName}"）`,
          data: {
            sourceType: 'rack-servers',
            sourceId: rackServers.id,
            sourceLabel: rackServers.label || rackServers.id,
            fileId: rackServers.fileId,
            fileName: fileName,
            missingField: 'rackId',
          },
        });
        continue;
      }
      
      if (!rackIds.has(rackServers.rackId)) {
        errors.push({
          type: 'missing_reference',
          message: `ラック内サーバー "${rackServers.label || rackServers.id}" が参照するラック "${rackServers.rackId}" が存在しません（カード: "${fileName}"）`,
          data: {
            sourceType: 'rack-servers',
            sourceId: rackServers.id,
            sourceLabel: rackServers.label || rackServers.id,
            fileId: rackServers.fileId,
            fileName: fileName,
            missingReferenceType: 'rack',
            missingReferenceId: rackServers.rackId,
          },
        });
      }
    }
    
    // 6. サーバーIDのセットを作成（タブ2のequipmentとタブ3のserversの両方から）
    const serverIds = new Set<string>();
    
    // タブ2（site-equipment）のequipmentからサーバーIDを取得
    for (const equipment of siteEquipmentList) {
      if (equipment.racks && Array.isArray(equipment.racks)) {
        for (const rack of equipment.racks) {
          if (rack.equipment && Array.isArray(rack.equipment)) {
            for (const eq of rack.equipment) {
              // equipmentのtypeが'server'の場合、そのIDをサーバーIDとして追加
              if (eq.type === 'server' && eq.id) {
                serverIds.add(eq.id);
              }
            }
          }
        }
      }
    }
    
    // タブ3（rack-servers）のserversからもサーバーIDを取得
    for (const rackServers of rackServersList) {
      if (rackServers.servers && Array.isArray(rackServers.servers)) {
        for (const server of rackServers.servers) {
          if (server.id) {
            serverIds.add(server.id);
          }
        }
      }
    }
    
    // 7. タブ4のデータをチェック（serverIdの参照）
    for (const serverDetails of serverDetailsList) {
      const fileName = fileIdToNameMap.get(serverDetails.fileId) || '不明なファイル';
      if (!serverDetails.serverId) {
        errors.push({
          type: 'missing_field',
          message: `サーバー詳細 "${serverDetails.label || serverDetails.id}" にserverIdが設定されていません（カード: "${fileName}"）`,
          data: {
            sourceType: 'server-details',
            sourceId: serverDetails.id,
            sourceLabel: serverDetails.label || serverDetails.id,
            fileId: serverDetails.fileId,
            fileName: fileName,
            missingField: 'serverId',
          },
        });
        continue;
      }
      
      if (!serverIds.has(serverDetails.serverId)) {
        errors.push({
          type: 'missing_reference',
          message: `サーバー詳細 "${serverDetails.label || serverDetails.id}" が参照するサーバー "${serverDetails.serverId}" が存在しません（カード: "${fileName}"）`,
          data: {
            sourceType: 'server-details',
            sourceId: serverDetails.id,
            sourceLabel: serverDetails.label || serverDetails.id,
            fileId: serverDetails.fileId,
            fileName: fileName,
            missingReferenceType: 'server',
            missingReferenceId: serverDetails.serverId,
          },
        });
      }
    }
    
    // 8. 孤立データの検出（参照されていないデータ）
    // 棟が参照されていない場合（現時点では警告のみ）
    // ラックが参照されていない場合（現時点では警告のみ）
    
  } catch (error: any) {
    console.error('❌ [validateHierarchyReferences] 整合性チェックエラー:', error);
    errors.push({
      type: 'invalid_id',
      message: `整合性チェック中にエラーが発生しました: ${error.message || error}`,
      data: {
        sourceType: 'site-equipment',
        sourceId: '',
        sourceLabel: '',
      },
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// キャッシュ機能
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live (milliseconds)
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    
    // TTLチェック
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
}

const cache = new SimpleCache();

// ============================================================================
// データ取得API（遅延読み込み対応）
// ============================================================================

/**
 * 棟データのみを取得（軽量、遅延読み込み用）
 */
export async function getSitesOnly(
  organizationId?: string
): Promise<SiteTopology[]> {
  try {
    const files = await getAllGraphvizYamlFiles(organizationId);
    const siteTopologies: SiteTopology[] = [];
    
    for (const file of files) {
      try {
        const parsed = yaml.load(file.yamlContent) as any;
        if (parsed?.type === 'site-topology') {
          siteTopologies.push({
            id: parsed.id,
            label: parsed.label,
            description: parsed.description,
            type: 'site-topology',
            sites: parsed.sites,
            connections: parsed.connections,
            fileId: file.id,
          });
        }
      } catch (e) {
        console.warn('YAMLパースエラー:', file.id, e);
      }
    }
    
    return siteTopologies;
  } catch (error: any) {
    console.error('❌ [getSitesOnly] 棟データの取得に失敗:', error);
    throw new Error(`棟データの取得に失敗しました: ${error.message || error}`);
  }
}

/**
 * 棟の機器構成を取得（必要時のみ、キャッシュ対応）
 */
export async function getSiteEquipmentBySiteId(
  siteId: string,
  organizationId?: string
): Promise<SiteEquipment | null> {
  // キャッシュをチェック
  const cacheKey = `site-equipment-${siteId}-${organizationId || 'all'}`;
  const cached = cache.get<SiteEquipment>(cacheKey);
  if (cached) {
    console.log('✅ [getSiteEquipmentBySiteId] キャッシュから取得:', siteId);
    return cached;
  }
  
  try {
    const files = await getAllGraphvizYamlFiles(organizationId);
    
    for (const file of files) {
      try {
        const parsed = yaml.load(file.yamlContent) as any;
        // siteIdの比較時に空白や改行を除去
        const parsedSiteId = parsed?.siteId ? String(parsed.siteId).trim() : null;
        const targetSiteId = siteId.trim();
        if (parsed?.type === 'site-equipment' && parsedSiteId === targetSiteId) {
          const result: SiteEquipment = {
            ...parsed,
            fileId: file.id,
          };
          
          // キャッシュに保存（5分間）
          cache.set(cacheKey, result, 5 * 60 * 1000);
          
          console.log('✅ [getSiteEquipmentBySiteId] データを取得:', siteId);
          return result;
        }
      } catch (e) {
        console.warn('YAMLパースエラー:', file.id, e);
      }
    }
    
    console.warn('⚠️ [getSiteEquipmentBySiteId] データが見つかりません:', siteId);
    return null;
  } catch (error: any) {
    console.error('❌ [getSiteEquipmentBySiteId] データ取得エラー:', error);
    throw new Error(`棟内機器構成の取得に失敗しました: ${error.message || error}`);
  }
}

/**
 * ラックのサーバーを取得（必要時のみ、キャッシュ対応）
 */
export async function getRackServersByRackId(
  rackId: string,
  organizationId?: string
): Promise<RackServers | null> {
  // キャッシュをチェック
  const cacheKey = `rack-servers-${rackId}-${organizationId || 'all'}`;
  const cached = cache.get<RackServers>(cacheKey);
  if (cached) {
    console.log('✅ [getRackServersByRackId] キャッシュから取得:', rackId);
    return cached;
  }
  
  try {
    const files = await getAllGraphvizYamlFiles(organizationId);
    
    console.log('🔄 [getRackServersByRackId] 検索開始:', { rackId, filesCount: files.length });
    
    // デバッグ: rack-serversタイプのファイルをすべてログ出力
    const rackServerFiles = files.filter(file => {
      try {
        const parsed = yaml.load(file.yamlContent) as any;
        return parsed?.type === 'rack-servers';
      } catch {
        return false;
      }
    });
    
    console.log('🔄 [getRackServersByRackId] rack-serversタイプのファイル:', rackServerFiles.length, '件');
    rackServerFiles.forEach(file => {
      try {
        const parsed = yaml.load(file.yamlContent) as any;
        console.log('  - ファイル名:', file.name, 'rackId:', parsed?.rackId, '一致:', parsed?.rackId === rackId);
      } catch (e) {
        console.warn('  - パースエラー:', file.name, e);
      }
    });
    
    for (const file of files) {
      try {
        const parsed = yaml.load(file.yamlContent) as any;
        if (parsed?.type === 'rack-servers') {
          // rackIdの比較時に空白や改行を除去
          const parsedRackId = parsed?.rackId ? String(parsed.rackId).trim() : null;
          const targetRackId = rackId.trim();
          
          console.log('🔄 [getRackServersByRackId] チェック中:', { 
            fileId: file.id, 
            fileName: file.name, 
            parsedRackId: parsedRackId,
            parsedRackIdRaw: parsed?.rackId,
            targetRackId: targetRackId,
            targetRackIdRaw: rackId,
            match: parsedRackId === targetRackId 
          });
          
          if (parsedRackId === targetRackId) {
          const result: RackServers = {
            ...parsed,
            fileId: file.id,
          };
          
          // キャッシュに保存（5分間）
          cache.set(cacheKey, result, 5 * 60 * 1000);
          
            console.log('✅ [getRackServersByRackId] データを取得:', rackId, result);
            return result;
          }
        }
      } catch (e) {
        console.warn('YAMLパースエラー:', file.id, e);
      }
    }
    
    console.warn('⚠️ [getRackServersByRackId] データが見つかりません:', rackId);
    console.warn('⚠️ [getRackServersByRackId] 利用可能なrack-serversファイル:', rackServerFiles.map(f => {
      try {
        const parsed = yaml.load(f.yamlContent) as any;
        return { name: f.name, rackId: parsed?.rackId };
      } catch {
        return { name: f.name, rackId: 'parse-error' };
      }
    }));
    return null;
  } catch (error: any) {
    console.error('❌ [getRackServersByRackId] データ取得エラー:', error);
    throw new Error(`ラック内サーバーの取得に失敗しました: ${error.message || error}`);
  }
}

/**
 * サーバー詳細を取得（必要時のみ、キャッシュ対応）
 */
export async function getServerDetailsByServerId(
  serverId: string,
  organizationId?: string
): Promise<ServerDetails | null> {
  // キャッシュをチェック
  const cacheKey = `server-details-${serverId}-${organizationId || 'all'}`;
  const cached = cache.get<ServerDetails>(cacheKey);
  if (cached) {
    console.log('✅ [getServerDetailsByServerId] キャッシュから取得:', serverId);
    return cached;
  }
  
  try {
    const files = await getAllGraphvizYamlFiles(organizationId);
    
    for (const file of files) {
      try {
        const parsed = yaml.load(file.yamlContent) as any;
        // serverIdの比較時に空白や改行を除去
        const parsedServerId = parsed?.serverId ? String(parsed.serverId).trim() : null;
        const targetServerId = serverId.trim();
        if (parsed?.type === 'server-details' && parsedServerId === targetServerId) {
          const result: ServerDetails = {
            ...parsed,
            fileId: file.id,
          };
          
          // キャッシュに保存（5分間）
          cache.set(cacheKey, result, 5 * 60 * 1000);
          
          console.log('✅ [getServerDetailsByServerId] データを取得:', serverId);
          return result;
        }
      } catch (e) {
        console.warn('YAMLパースエラー:', file.id, e);
      }
    }
    
    console.warn('⚠️ [getServerDetailsByServerId] データが見つかりません:', serverId);
    return null;
  } catch (error: any) {
    console.error('❌ [getServerDetailsByServerId] データ取得エラー:', error);
    throw new Error(`サーバー詳細の取得に失敗しました: ${error.message || error}`);
  }
}

/**
 * キャッシュをクリア
 */
export function clearHierarchyCache(): void {
  cache.clear();
  console.log('✅ [clearHierarchyCache] キャッシュをクリアしました');
}

/**
 * 特定のキーのキャッシュを削除
 */
export function deleteHierarchyCache(key: string): void {
  cache.delete(key);
  console.log('✅ [deleteHierarchyCache] キャッシュを削除しました:', key);
}

