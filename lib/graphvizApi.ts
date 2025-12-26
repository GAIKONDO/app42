/**
 * Graphviz YAML/DOTファイル管理API
 * Tauriコマンド経由でデータベースにアクセス
 */

import { invoke } from '@tauri-apps/api/core';

export interface GraphvizYamlFile {
  id: string;
  name: string;
  description?: string;
  yamlContent: string;
  yamlSchema?: string;
  yamlType?: string;
  organizationId?: string;
  tags?: string; // JSON配列文字列
  version: number;
  parentYamlFileId?: string;
  searchableText?: string;
  semanticCategory?: string;
  keywords?: string; // JSON配列文字列
  contentSummary?: string;
  chromaSynced: number;
  chromaSyncError?: string;
  lastChromaSyncAttempt?: string;
  lastSearchDate?: string;
  searchCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GraphvizDotFile {
  id: string;
  yamlFileId: string;
  name: string;
  description?: string;
  dotContent: string;
  graphType: string;
  viewType?: string;
  nodeCount?: number;
  edgeCount?: number;
  organizationId?: string;
  tags?: string; // JSON配列文字列
  version: number;
  parentDotFileId?: string;
  searchableText?: string;
  chromaSynced: number;
  chromaSyncError?: string;
  lastChromaSyncAttempt?: string;
  lastSearchDate?: string;
  searchCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * YAMLファイルを作成
 */
export async function createGraphvizYamlFile(
  name: string,
  yamlContent: string,
  options?: {
    description?: string;
    yamlSchema?: string;
    yamlType?: string;
    organizationId?: string;
    tags?: string[];
  }
): Promise<GraphvizYamlFile> {
  try {
    const result = await invoke<GraphvizYamlFile>('create_graphviz_yaml_file_cmd', {
      name,
      description: options?.description || null,
      yamlContent: yamlContent,
      yamlSchema: options?.yamlSchema || null,
      yamlType: options?.yamlType || null,
      organizationId: options?.organizationId || null,
      tags: options?.tags || null,
    });
    return result;
  } catch (error: any) {
    console.error('❌ [createGraphvizYamlFile] YAMLファイルの作成に失敗:', error);
    throw new Error(`YAMLファイルの作成に失敗しました: ${error.message || error}`);
  }
}

/**
 * YAMLファイルを更新
 */
export async function updateGraphvizYamlFile(
  id: string,
  updates: {
    name?: string;
    description?: string;
    yamlContent?: string;
    yamlSchema?: string;
    yamlType?: string;
    tags?: string[];
    semanticCategory?: string;
    keywords?: string; // JSON配列文字列
    contentSummary?: string;
  }
): Promise<GraphvizYamlFile> {
  try {
    const result = await invoke<GraphvizYamlFile>('update_graphviz_yaml_file_cmd', {
      id,
      name: updates.name || null,
      description: updates.description || null,
      yamlContent: updates.yamlContent || null,
      yamlSchema: updates.yamlSchema || null,
      yamlType: updates.yamlType || null,
      tags: updates.tags || null,
      semanticCategory: updates.semanticCategory || null,
      keywords: updates.keywords || null,
      contentSummary: updates.contentSummary || null,
    });
    return result;
  } catch (error: any) {
    console.error('❌ [updateGraphvizYamlFile] YAMLファイルの更新に失敗:', error);
    throw new Error(`YAMLファイルの更新に失敗しました: ${error.message || error}`);
  }
}

/**
 * IDでYAMLファイルを取得
 */
export async function getGraphvizYamlFile(id: string): Promise<GraphvizYamlFile> {
  try {
    const result = await invoke<GraphvizYamlFile>('get_graphviz_yaml_file_cmd', { id });
    return result;
  } catch (error: any) {
    console.error('❌ [getGraphvizYamlFile] YAMLファイルの取得に失敗:', error);
    throw new Error(`YAMLファイルの取得に失敗しました: ${error.message || error}`);
  }
}

/**
 * すべてのYAMLファイルを取得
 */
export async function getAllGraphvizYamlFiles(organizationId?: string): Promise<GraphvizYamlFile[]> {
  try {
    const result = await invoke<GraphvizYamlFile[]>('get_all_graphviz_yaml_files_cmd', {
      organizationId: organizationId || null,
    });
    return result;
  } catch (error: any) {
    console.error('❌ [getAllGraphvizYamlFiles] YAMLファイル一覧の取得に失敗:', error);
    throw new Error(`YAMLファイル一覧の取得に失敗しました: ${error.message || error}`);
  }
}

/**
 * YAMLファイルを削除
 */
export async function deleteGraphvizYamlFile(id: string): Promise<void> {
  try {
    await invoke('delete_graphviz_yaml_file_cmd', { id });
  } catch (error: any) {
    console.error('❌ [deleteGraphvizYamlFile] YAMLファイルの削除に失敗:', error);
    throw new Error(`YAMLファイルの削除に失敗しました: ${error.message || error}`);
  }
}

/**
 * DOTファイルを作成
 */
export async function createGraphvizDotFile(
  yamlFileId: string,
  name: string,
  dotContent: string,
  graphType: string,
  options?: {
    description?: string;
    viewType?: string;
    nodeCount?: number;
    edgeCount?: number;
    organizationId?: string;
    tags?: string[];
  }
): Promise<GraphvizDotFile> {
  try {
    const result = await invoke<GraphvizDotFile>('create_graphviz_dot_file_cmd', {
      yamlFileId,
      name,
      description: options?.description || null,
      dotContent,
      graphType,
      viewType: options?.viewType || null,
      nodeCount: options?.nodeCount || null,
      edgeCount: options?.edgeCount || null,
      organizationId: options?.organizationId || null,
      tags: options?.tags || null,
    });
    return result;
  } catch (error: any) {
    console.error('❌ [createGraphvizDotFile] DOTファイルの作成に失敗:', error);
    throw new Error(`DOTファイルの作成に失敗しました: ${error.message || error}`);
  }
}

/**
 * YAMLファイルIDでDOTファイルを取得
 */
export async function getGraphvizDotFile(yamlFileId: string): Promise<GraphvizDotFile | null> {
  try {
    const result = await invoke<GraphvizDotFile | null>('get_graphviz_dot_file_cmd', {
      yamlFileId,
    });
    return result;
  } catch (error: any) {
    console.error('❌ [getGraphvizDotFile] DOTファイルの取得に失敗:', error);
    throw new Error(`DOTファイルの取得に失敗しました: ${error.message || error}`);
  }
}

/**
 * Graphviz YAMLファイルに関連ファイルを保存
 */
export async function saveGraphvizYamlFileAttachment(
  organizationId: string,
  yamlFileId: string,
  file: File,
  description?: string,
  detailedDescription?: string
): Promise<{ success: boolean; filePath?: string; fileId?: string; error?: string }> {
  try {
    // ファイルをバイナリデータに変換
    const fileBytes = await new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(new Uint8Array(reader.result));
        } else {
          reject(new Error('ファイルの読み込みに失敗しました'));
        }
      };
      reader.onerror = () => reject(new Error('ファイルの読み込みエラー'));
      reader.readAsArrayBuffer(file);
    });
    
    // ファイル名を生成
    const timestamp = Date.now();
    const originalName = file.name || 'file';
    const fileName = `${timestamp}_${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    const result = await invoke<{ success: boolean; file_path?: string; file_id?: string; error?: string }>('save_graphviz_yaml_file_attachment', {
      organizationId,
      yamlFileId,
      fileBytes: Array.from(fileBytes),
      fileName,
      description: description || null,
      detailedDescription: detailedDescription || null,
      mimeType: file.type || null,
    });
    
    if (result.success) {
      return {
        success: true,
        filePath: result.file_path,
        fileId: result.file_id,
      };
    } else {
      return {
        success: false,
        error: result.error || 'ファイルの保存に失敗しました',
      };
    }
  } catch (error: any) {
    console.error('❌ [saveGraphvizYamlFileAttachment] ファイルの保存に失敗:', error);
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}

/**
 * Graphviz YAMLファイルの関連ファイル一覧を取得
 */
export async function getGraphvizYamlFileAttachments(yamlFileId: string): Promise<Array<{ path: string; description?: string; detailedDescription?: string; id?: string; fileName?: string; mimeType?: string; fileSize?: number }>> {
  try {
    const { callTauriCommand } = await import('@/lib/localFirebase');
    const result = await callTauriCommand('query_get', {
      collectionName: 'graphvizYamlFileAttachments',
      conditions: { yamlFileId },
    });
    
    if (result && Array.isArray(result) && result.length > 0) {
      return result.map((item: any) => {
        const file = item.data || item;
        return {
          path: file.filePath || file.path,
          description: file.description,
          detailedDescription: file.detailedDescription,
          id: item.id || file.id,
          fileName: file.fileName,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
        };
      });
    }
    
    return [];
  } catch (error: any) {
    console.error('❌ [getGraphvizYamlFileAttachments] 関連ファイルの取得に失敗:', error);
    return [];
  }
}

/**
 * Graphviz YAMLファイルの関連ファイルを削除
 */
export async function deleteGraphvizYamlFileAttachment(
  organizationId: string,
  yamlFileId: string,
  filePath: string
): Promise<void> {
  try {
    const { callTauriCommand } = await import('@/lib/localFirebase');
    
    // ファイルIDを取得
    const attachments = await getGraphvizYamlFileAttachments(yamlFileId);
    const attachment = attachments.find(a => a.path === filePath);
    
    if (attachment && attachment.id) {
      // データベースから削除
      await callTauriCommand('doc_delete', {
        collectionName: 'graphvizYamlFileAttachments',
        docId: attachment.id,
      });
      
      // 物理ファイルはデータベースから削除するだけで、ファイルシステム上のファイルは残す
      // （後で必要に応じて手動で削除可能）
    } else {
      throw new Error('ファイルが見つかりません');
    }
  } catch (error: any) {
    console.error('❌ [deleteGraphvizYamlFileAttachment] ファイルの削除に失敗:', error);
    throw new Error(`ファイルの削除に失敗しました: ${error.message || error}`);
  }
}

