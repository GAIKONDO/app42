import { callTauriCommand } from './localFirebase';
import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';
import type { OrgNodeData, MemberInfo } from '@/components/OrgChart';
import { sortMembersByPosition } from './memberSort';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from './firestore';
import type { TopicSemanticCategory } from '@/types/topicMetadata';
import * as path from 'path';

// OrgNodeDataを再エクスポート（他のファイルから使用できるように）
export type { OrgNodeData, MemberInfo };

/**
 * JSONファイルのパスを取得するヘルパー関数
 */
async function getInitiativeJsonPath(initiativeId: string): Promise<string> {
  try {
    // アプリデータディレクトリのパスを取得
    const appDataPath = await callTauriCommand('get_path', {}) as string;
    const initiativesDir = path.join(appDataPath, 'focusInitiatives');
    return path.join(initiativesDir, `${initiativeId}.json`);
  } catch (error) {
    console.error('アプリデータディレクトリの取得に失敗しました:', error);
    throw error;
  }
}

/**
 * JSONファイルに保存
 */
export async function saveInitiativeToJson(initiative: FocusInitiative): Promise<void> {
  try {
    const filePath = await getInitiativeJsonPath(initiative.id);
    
    // JSON文字列に変換
    const jsonString = JSON.stringify(initiative, null, 2);
    
    // ファイルに書き込み（write_fileコマンドが親ディレクトリを自動的に作成する）
    // Tauri 2.0では引数名が自動的にキャメルケースに変換されるため、filePathとdataを使用
    const result = await callTauriCommand('write_file', {
      filePath: filePath,
      data: jsonString,
    });
    
    if (!result.success) {
      throw new Error(result.error || 'JSONファイルの保存に失敗しました');
    }
    
    console.log('✅ [saveInitiativeToJson] JSONファイルに保存成功:', filePath);
  } catch (error: any) {
    console.error('❌ [saveInitiativeToJson] JSONファイルの保存に失敗しました:', error);
    throw error;
  }
}

/**
 * JSONファイルから読み込み
 */
async function loadInitiativeFromJson(initiativeId: string): Promise<FocusInitiative | null> {
  try {
    const filePath = await getInitiativeJsonPath(initiativeId);
    
    // ファイルが存在するか確認
    // Tauri 2.0では引数名が自動的にキャメルケースに変換されるため、filePathを使用
    const exists = await callTauriCommand('file_exists', { filePath: filePath });
    if (!exists.exists) {
      console.log('📖 [loadInitiativeFromJson] JSONファイルが存在しません:', filePath);
      return null;
    }
    
    // ファイルを読み込み
    const result = await callTauriCommand('read_file', { filePath: filePath });
    
    if (!result.success) {
      console.error('❌ [loadInitiativeFromJson] JSONファイルの読み込みに失敗しました:', result.error);
      return null;
    }
    
    // JSON文字列をパース
    const data = JSON.parse(result.data);
    
    console.log('✅ [loadInitiativeFromJson] JSONファイルから読み込み成功:', {
      id: data.id,
      title: data.title,
      assignee: data.assignee,
      description: data.description,
    });
    
    return data as FocusInitiative;
  } catch (error: any) {
    console.error('❌ [loadInitiativeFromJson] JSONファイルの読み込みに失敗しました:', error);
    return null;
  }
}

/**
 * データベースから組織データを取得してOrgNodeData形式に変換
 */
export async function getOrgTreeFromDb(rootId?: string): Promise<OrgNodeData | null> {
  // Supabase専用（環境変数チェック不要）
  try {
    try {
      console.log('🔍 [getOrgTreeFromDb] Supabase経由で組織ツリーを取得します');
      const { getDataSourceInstance } = await import('./dataSource');
      const dataSource = getDataSourceInstance();
      
      // すべての組織を取得
      const allOrgs = await dataSource.collection_get('organizations');
      
      if (!allOrgs || allOrgs.length === 0) {
        return null;
      }
      
      // 組織メンバーを取得（PostgreSQLでは引用符なしのテーブル名は小文字になる）
      let allMembers: any[] = [];
      try {
        const { getCollectionViaDataSource } = await import('./dataSourceAdapter');
        // PostgreSQLではorganizationMembersはorganizationmembers（小文字）として作成される
        allMembers = await getCollectionViaDataSource('organizationmembers');
      } catch (error: any) {
        // organizationmembersが見つからない場合は、organizationMembers（キャメルケース）を試す
        if (error?.message?.includes('Could not find the table') || error?.message?.includes('schema cache')) {
          console.warn('⚠️ [getOrgTreeFromDb] organizationmembersテーブルが見つかりません。organizationMembers（キャメルケース）を試します。');
          try {
            const { getCollectionViaDataSource } = await import('./dataSourceAdapter');
            allMembers = await getCollectionViaDataSource('organizationMembers');
          } catch (fallbackError) {
            console.warn('⚠️ [getOrgTreeFromDb] organizationMembersテーブルも見つかりません。メンバーなしで続行します。', fallbackError);
            allMembers = [];
          }
        } else {
          throw error;
        }
      }
      
      // メンバーを組織IDでグループ化
      const membersByOrgId = new Map<string, any[]>();
      for (const member of allMembers) {
        const orgId = member.organizationId;
        if (!membersByOrgId.has(orgId)) {
          membersByOrgId.set(orgId, []);
        }
        membersByOrgId.get(orgId)!.push(member);
      }
      
      // 階層構造を構築
      const orgMap = new Map<string, any>();
      const rootOrgs: any[] = [];
      
      // まずすべての組織をマップに追加
      for (const org of allOrgs) {
        const orgId = org.id;
        const parentId = org.parentId || org.parent_id || null;
        
        // Supabaseから取得したデータをTauriコマンド形式に変換
        const orgWithMembers = {
          organization: {
            id: orgId,
            name: org.name,
            title: org.title,
            description: org.description,
            level: org.level || 0,
            levelName: org.levelName || org.level_name || '組織',
            position: org.position || 0,
            type: org.type || 'organization',
            parent_id: parentId,
            parentId: parentId,
          },
          members: membersByOrgId.get(orgId) || [],
          children: [],
        };
        
        orgMap.set(orgId, orgWithMembers);
        
        // ルート組織を特定
        if (!parentId) {
          rootOrgs.push(orgWithMembers);
        }
      }
      
      // 親子関係を構築
      for (const org of allOrgs) {
        const orgId = org.id;
        const parentId = org.parentId || org.parent_id || null;
        
        if (parentId) {
          const parent = orgMap.get(parentId);
          const child = orgMap.get(orgId);
          if (parent && child) {
            parent.children.push(child);
          }
        }
      }
      
      // rootIdが指定されている場合は、該当する組織を返す
      if (rootId) {
        const found = orgMap.get(rootId);
        if (found) {
          return convertToOrgNodeData(found);
        }
        // 見つからない場合は最初のルート組織を返す
        if (rootOrgs.length > 0) {
          return convertToOrgNodeData(rootOrgs[0]);
        }
        return null;
      }
      
      // 複数のルート組織がある場合、全てを子ノードとして持つ仮想的なルートノードを作成
      if (rootOrgs.length > 1) {
        console.log(`⚠️ [getOrgTreeFromDb] 複数のルート組織が見つかりました (${rootOrgs.length}件)。全て表示します。`);
        const convertedRoots = rootOrgs.map((org: any) => convertToOrgNodeData(org));
        
        const virtualRoot: OrgNodeData = {
          id: 'virtual-root',
          name: `全組織 (${rootOrgs.length}件のルート組織)`,
          title: `All Organizations (${rootOrgs.length} root organizations)`,
          description: '複数のルート組織が存在します。重複している可能性があります。',
          children: convertedRoots,
          members: [],
        };
        
        return virtualRoot;
      }
      
      // 1つだけの場合はそのまま返す
      if (rootOrgs.length === 1) {
        return convertToOrgNodeData(rootOrgs[0]);
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ [getOrgTreeFromDb] Supabase経由の取得に失敗:', error);
      throw error;
    }
  } catch (error: any) {
    console.error('❌ [getOrgTreeFromDb] エラー:', error);
    throw error;
  }
}

/**
 * 組織ツリーからすべての組織をフラットなリストとして取得
 */
export function getAllOrganizationsFromTree(orgTree: OrgNodeData | null): Array<{ id: string; name: string; title?: string }> {
  if (!orgTree) return [];
  
  const organizations: Array<{ id: string; name: string; title?: string }> = [];
  
  function traverse(node: OrgNodeData) {
    if (!node.id) return;
    organizations.push({
      id: node.id,
      name: node.name || node.title || node.id, // nameが日本語、titleが英語
      title: node.title, // 英語名を保持
    });
    
    if (node.children) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }
  
  traverse(orgTree);
  return organizations;
}

/**
 * 組織ツリーから指定されたIDの組織を検索
 */
export function findOrganizationById(orgTree: OrgNodeData | null, orgId: string): OrgNodeData | null {
  if (!orgTree) return null;
  
  function traverse(node: OrgNodeData): OrgNodeData | null {
    if (node.id === orgId) {
      return node;
    }
    
    if (node.children) {
      for (const child of node.children) {
        const found = traverse(child);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  return traverse(orgTree);
}

/**
 * データベースのOrganizationWithMembers形式をOrgNodeData形式に変換
 */
function convertToOrgNodeData(dbOrg: any): OrgNodeData {
  // データ構造を確認（organizationプロパティがある場合とない場合の両方に対応）
  // #[serde(flatten)]により、organizationのフィールドがトップレベルにフラット化されている可能性がある
  const org = dbOrg.organization || dbOrg;
  
  // IDを取得（トップレベルとorganizationオブジェクトの両方を確認）
  const orgId = dbOrg.id || org.id || org.name;
  
  // デバッグ: ID取得の過程をログ出力
  if (!dbOrg.id && !org.id) {
    console.warn('⚠️ [convertToOrgNodeData] IDが存在しないため、nameをIDとして使用:', {
      orgName: org.name || dbOrg.name,
      dbOrgKeys: Object.keys(dbOrg),
      orgKeys: Object.keys(org),
      hasDbOrgId: !!dbOrg.id,
      hasOrgId: !!org.id,
      finalOrgId: orgId,
    });
  } else {
    console.log('✅ [convertToOrgNodeData] IDを取得:', {
      dbOrgId: dbOrg.id,
      orgId: org.id,
      finalOrgId: orgId,
      orgName: org.name || dbOrg.name,
    });
  }
  
  // IDが存在しない場合のデバッグログ
  if (!dbOrg.id && !org.id) {
    console.warn('⚠️ [convertToOrgNodeData] 組織IDが存在しません:', {
      orgName: org.name || dbOrg.name,
      dbOrgKeys: Object.keys(dbOrg),
      orgKeys: Object.keys(org),
      hasDbOrgId: !!dbOrg.id,
      hasOrgId: !!org.id,
      dbOrgSample: {
        id: dbOrg.id,
        name: dbOrg.name,
        hasOrganization: !!dbOrg.organization,
      },
    });
  }
  
  // childrenをpositionでソート
  const sortedChildren = (dbOrg.children || []).sort((a: any, b: any) => {
    const orgA = a.organization || a;
    const orgB = b.organization || b;
    const posA = orgA.position || 0;
    const posB = orgB.position || 0;
    return posA - posB;
  });
  const children: OrgNodeData[] = sortedChildren.map((child: any) => convertToOrgNodeData(child));
  
  const members: MemberInfo[] = (dbOrg.members || []).map((member: any): MemberInfo => ({
    name: member.name,
    title: member.position || undefined,
    nameRomaji: member.nameRomaji || undefined,
    department: member.department || undefined,
    extension: member.extension || undefined,
    companyPhone: member.companyPhone || undefined,
    mobilePhone: member.mobilePhone || undefined,
    email: member.email || undefined,
    itochuEmail: member.itochuEmail || undefined,
    teams: member.teams || undefined,
    employeeType: member.employeeType || undefined,
    roleName: member.roleName || undefined,
    indicator: member.indicator || undefined,
    location: member.location || undefined,
    floorDoorNo: member.floorDoorNo || undefined,
    previousName: member.previousName || undefined,
  }));
  
  // メンバーを役職順にソート（情報・通信部門の場合は部門長を最上位にする）
  const sortedMembers = sortMembersByPosition(members, org.name);
  
  return {
    id: orgId,
    name: org.name,
    title: org.title || '',
    description: org.description || undefined,
    level: org.level !== undefined ? org.level : (org.levelName ? parseInt(org.levelName.replace('階層レベル ', '')) || 0 : 0),
    levelName: org.levelName || undefined,
    position: org.position !== undefined ? org.position : 0,
    type: org.org_type || org.type || dbOrg.org_type || dbOrg.type || 'organization', // type情報を追加（Rust側ではorg_typeとして返される）
    members: sortedMembers.length > 0 ? sortedMembers : undefined,
    children: children.length > 0 ? children : undefined,
  };
}

/**
 * 組織を作成
 */
export async function createOrg(
  parentId: string | null,
  name: string,
  title: string | null,
  description: string | null,
  level: number,
  levelName: string,
  position: number,
  orgType?: string
): Promise<any> {
  // Supabase専用（環境変数チェック不要）
  try {
    console.log('🔍 [createOrg] Supabase経由で組織を作成します');
    const { getDataSourceInstance } = await import('./dataSource');
    const dataSource = getDataSourceInstance();
    
    // parentIdが指定されている場合、親組織が存在するか確認
    if (parentId) {
      const parentOrg = await dataSource.doc_get('organizations', parentId);
      if (!parentOrg) {
        throw new Error(`親組織が見つかりません: ${parentId}`);
      }
    }
    
    // 組織データを準備（Supabaseのスキーマに合わせてカラム名を調整）
    const orgData: any = {
      name,
      level,
      levelName,
      position,
      type: orgType || 'organization',
    };
    
    // NULLでない値のみ追加
    if (parentId) {
      orgData.parentId = parentId; // Supabaseスキーマでは"parentId"（引用符付き）
    }
    if (title) {
      orgData.title = title;
    }
    if (description) {
      orgData.description = description;
    }
    
    // SupabaseDataSource経由で作成
    const orgId = await dataSource.collection_add('organizations', orgData);
    
    // 作成された組織を取得して返す
    const createdOrg = await dataSource.doc_get('organizations', orgId);
    
    if (!createdOrg) {
      throw new Error('組織の作成に失敗しました: 作成後の取得に失敗');
    }
    
    console.log('✅ [createOrg] Supabase経由で組織を作成成功:', {
      id: createdOrg.id,
      name: createdOrg.name,
      parentId: createdOrg.parentId || null,
    });
    
    return createdOrg;
  } catch (error: any) {
    console.error('❌ [createOrg] Supabase経由の作成に失敗:', error);
    throw error;
  }
}

/**
 * 組織を更新（Supabase対応）
 */
export async function updateOrg(
  id: string,
  name?: string,
  title?: string,
  description?: string,
  position?: number
): Promise<any> {
  // lib/orgApi/organizations.tsのupdateOrg関数を使用
  const { updateOrg: updateOrgFromOrganizations } = await import('./orgApi/organizations');
  return await updateOrgFromOrganizations(id, name, title, description, position);
}

/**
 * 組織の親IDを更新（Supabase対応）
 */
export async function updateOrgParent(
  id: string,
  parentId: string | null
): Promise<any> {
  // Supabase専用（環境変数チェック不要）
  console.log('🔄 [updateOrgParent] 組織の親IDを更新開始（Supabase経由）:', {
    id,
    parentId,
  });
  
  try {
    const { getDataSourceInstance } = await import('./dataSource');
    const dataSource = getDataSourceInstance();
    
    // 既存の組織データを取得
    let existingOrg: any = null;
    try {
      existingOrg = await dataSource.doc_get('organizations', id);
      if (existingOrg) {
        console.log('📖 [updateOrgParent] 既存の組織データを取得:', existingOrg);
      }
    } catch (getError: any) {
      const errorMessage = getError?.message || '';
      // レコードが見つからないエラーの場合は警告のみ（更新を試みる）
      if (errorMessage.includes('Query returned no rows') || 
          errorMessage.includes('ドキュメント取得エラー') ||
          getError?.code === 'PGRST116') {
        console.warn(`⚠️ [updateOrgParent] 既存の組織データを取得できませんでしたが、更新を試みます: ${id}`);
      } else {
        // その他のエラーの場合は警告のみ（更新を試みる）
        console.warn(`⚠️ [updateOrgParent] 既存の組織データの取得でエラーが発生しましたが、更新を試みます:`, getError);
      }
    }
    
    // 更新データを準備
    const now = new Date().toISOString();
    const updateData: any = {
      id,
      updatedAt: now,
    };
    
    // 既存データがある場合はマージ、ない場合は新規作成として扱う
    if (existingOrg) {
      // 既存データを保持しつつ、parentIdのみ更新
      const { levelName, levelname, ...existingOrgWithoutLevelName } = existingOrg;
      Object.assign(updateData, existingOrgWithoutLevelName, { updatedAt: now });
    } else {
      // 既存データがない場合は、最低限のデータを設定
      updateData.createdAt = now;
    }
    
    // parentIdを更新（nullの場合は明示的にnullを設定）
    updateData.parentId = parentId;
    
    console.log('💾 [updateOrgParent] Supabaseに更新するデータ:', updateData);
    
    // SupabaseDataSource経由で更新（doc_setを使用して、存在しない場合は作成、存在する場合は更新）
    try {
      await dataSource.doc_set('organizations', id, updateData);
      console.log('✅ [updateOrgParent] Supabase経由で組織の親IDを更新/作成成功:', id);
    } catch (updateError: any) {
      const updateErrorMessage = updateError?.message || '';
      // レコードが見つからないエラーの場合は、doc_setで再試行（新規作成として扱う）
      if (updateErrorMessage.includes('Query returned no rows') || 
          updateErrorMessage.includes('No rows found') ||
          updateError?.code === 'PGRST116') {
        console.log('ℹ️ [updateOrgParent] 組織が見つからないため、新規作成として処理します:', id);
        await dataSource.doc_set('organizations', id, updateData);
      } else {
        throw updateError;
      }
    }
    
    console.log('✅ [updateOrgParent] Supabase経由で組織の親IDを更新成功:', id);
    
    // 更新後の組織データを取得して返す
    await new Promise(resolve => setTimeout(resolve, 200));
    
    let updatedOrg: any = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries && !updatedOrg) {
      try {
        updatedOrg = await dataSource.doc_get('organizations', id);
        if (updatedOrg) {
          break;
        }
      } catch (getError: any) {
        console.warn(`⚠️ [updateOrgParent] 更新後の組織取得に失敗（再試行 ${retryCount + 1}/${maxRetries}）:`, getError);
        if (retryCount < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      retryCount++;
    }
    
    if (!updatedOrg) {
      // 取得に失敗した場合でも、更新データを返す
      console.warn('⚠️ [updateOrgParent] 更新後の組織取得に失敗しましたが、更新データを返します:', id);
      return updateData;
    }
    
    return updatedOrg;
  } catch (error: any) {
    console.error('❌ [updateOrgParent] Supabase経由の更新に失敗:', error);
    throw error;
  }
}

/**
 * 名前で組織を検索（部分一致）
 */
export async function searchOrgsByName(namePattern: string): Promise<any[]> {
  try {
    // Rust API経由で検索
    return await apiGet<any[]>('/api/organizations/search', { name: namePattern });
  } catch (error) {
    // フォールバック: Tauriコマンド経由
    console.warn('Rust API経由の検索に失敗、Tauriコマンドにフォールバック:', error);
    return callTauriCommand('search_orgs_by_name', {
      namePattern,
    });
  }
}


export async function deleteOrg(id: string): Promise<void> {
  // Supabase専用（環境変数チェック不要）
  console.log('🗑️ [deleteOrg] 削除開始（Supabase経由）:', id);
  
  try {
    // lib/orgApi/organizations.tsのdeleteOrg関数を使用
    const { deleteOrg: deleteOrgFromOrganizations } = await import('./orgApi/organizations');
    await deleteOrgFromOrganizations(id);
  } catch (error: any) {
    console.error('❌ [deleteOrg] Supabase経由での削除が失敗しました:', error);
    throw error;
  }
}

/**
 * メンバーを追加（詳細情報対応、Supabase対応）
 */
export async function addOrgMember(
  organizationId: string,
  memberInfo: MemberInfo
): Promise<any> {
  // Supabase専用（環境変数チェック不要）
  console.log('🔄 [addOrgMember] メンバーを追加開始（Supabase経由）:', {
    organizationId,
    name: memberInfo.name,
  });
  
  try {
    const { getDataSourceInstance } = await import('./dataSource');
    const dataSource = getDataSourceInstance();
    
    // メンバーIDを生成（crypto.randomUUIDを使用、フォールバックとしてDateベースのID）
    const memberId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // メンバーデータを準備
    // createdAtとupdatedAtはdoc_set関数内で自動設定されるため、ここでは設定しない
    const memberData: any = {
      id: memberId,
      organizationId,
      name: memberInfo.name,
      position: memberInfo.title || null,
      nameRomaji: memberInfo.nameRomaji || null,
      department: memberInfo.department || null,
      extension: memberInfo.extension || null,
      companyPhone: memberInfo.companyPhone || null,
      mobilePhone: memberInfo.mobilePhone || null,
      email: memberInfo.email || null,
      itochuEmail: memberInfo.itochuEmail || null,
      teams: memberInfo.teams || null,
      employeeType: memberInfo.employeeType || null,
      roleName: memberInfo.roleName || null,
      indicator: memberInfo.indicator || null,
      location: memberInfo.location || null,
      floorDoorNo: memberInfo.floorDoorNo || null,
      previousName: memberInfo.previousName || null,
      displayOrder: (memberInfo as any).displayOrder !== undefined ? (memberInfo as any).displayOrder : null,
    };
    
    console.log('💾 [addOrgMember] Supabaseに追加するデータ:', memberData);
    console.log('🔍 [addOrgMember] テーブル名: organizationMembers, メンバーID:', memberId);
    
    // SupabaseDataSource経由で追加
    await dataSource.doc_set('organizationMembers', memberId, memberData);
    console.log('✅ [addOrgMember] Supabase経由でメンバーを追加成功:', memberId);
    
    // 追加されたメンバーを確認
    const addedMember = await dataSource.doc_get('organizationMembers', memberId);
    console.log('🔍 [addOrgMember] 追加されたメンバーを確認:', addedMember);
    
    return memberData;
  } catch (error: any) {
    console.error('❌ [addOrgMember] Supabase経由の追加に失敗:', error);
    throw error;
  }
}

/**
 * メンバーを更新（詳細情報対応、Supabase対応）
 */
export async function updateOrgMember(
  id: string,
  memberInfo: Partial<MemberInfo>
): Promise<any> {
  // Supabase専用（環境変数チェック不要）
  console.log('🔄 [updateOrgMember] メンバーを更新開始（Supabase経由）:', {
    id,
    name: memberInfo.name,
  });
  
  try {
    const { getDataSourceInstance } = await import('./dataSource');
    const dataSource = getDataSourceInstance();
    
    // 既存のメンバーデータを取得
    let existingMember: any = null;
    try {
      existingMember = await dataSource.doc_get('organizationMembers', id);
      if (existingMember) {
        console.log('📖 [updateOrgMember] 既存のメンバーデータを取得:', existingMember);
      }
    } catch (getError: any) {
      console.warn('⚠️ [updateOrgMember] 既存のメンバーデータを取得できませんでしたが、更新を試みます:', getError);
    }
    
    // 更新データを準備（既存データをマージ）
    const updateData: any = {
      id,
      ...(existingMember || {}),
    };
    
    // 指定されたフィールドのみ更新
    if (memberInfo.name !== undefined) {
      updateData.name = memberInfo.name;
    }
    if (memberInfo.title !== undefined) {
      updateData.position = memberInfo.title || null;
    }
    if (memberInfo.nameRomaji !== undefined) {
      updateData.nameRomaji = memberInfo.nameRomaji || null;
    }
    if (memberInfo.department !== undefined) {
      updateData.department = memberInfo.department || null;
    }
    if (memberInfo.extension !== undefined) {
      updateData.extension = memberInfo.extension || null;
    }
    if (memberInfo.companyPhone !== undefined) {
      updateData.companyPhone = memberInfo.companyPhone || null;
    }
    if (memberInfo.mobilePhone !== undefined) {
      updateData.mobilePhone = memberInfo.mobilePhone || null;
    }
    if (memberInfo.email !== undefined) {
      updateData.email = memberInfo.email || null;
    }
    if (memberInfo.itochuEmail !== undefined) {
      updateData.itochuEmail = memberInfo.itochuEmail || null;
    }
    if (memberInfo.teams !== undefined) {
      updateData.teams = memberInfo.teams || null;
    }
    if (memberInfo.employeeType !== undefined) {
      updateData.employeeType = memberInfo.employeeType || null;
    }
    if (memberInfo.roleName !== undefined) {
      updateData.roleName = memberInfo.roleName || null;
    }
    if (memberInfo.indicator !== undefined) {
      updateData.indicator = memberInfo.indicator || null;
    }
    if (memberInfo.location !== undefined) {
      updateData.location = memberInfo.location || null;
    }
    if (memberInfo.floorDoorNo !== undefined) {
      updateData.floorDoorNo = memberInfo.floorDoorNo || null;
    }
    if (memberInfo.previousName !== undefined) {
      updateData.previousName = memberInfo.previousName || null;
    }
    if ((memberInfo as any).displayOrder !== undefined) {
      updateData.displayOrder = (memberInfo as any).displayOrder !== null ? (memberInfo as any).displayOrder : null;
    }
    
    console.log('💾 [updateOrgMember] Supabaseに更新するデータ:', updateData);
    
    // SupabaseDataSource経由で更新
    await dataSource.doc_set('organizationMembers', id, updateData);
    console.log('✅ [updateOrgMember] Supabase経由でメンバーを更新成功:', id);
    
    return updateData;
  } catch (error: any) {
    console.error('❌ [updateOrgMember] Supabase経由の更新に失敗:', error);
    throw error;
  }
}

/**
 * メンバーを削除
 */
export async function deleteOrgMember(id: string): Promise<void> {
  try {
    // Rust API経由で削除（organizationIdが必要）
    // 暫定的にTauriコマンドにフォールバック
    // TODO: organizationIdを取得する方法を実装する必要がある
    throw new Error('organizationId is required for Rust API');
  } catch (error) {
    // フォールバック: Tauriコマンド経由
    console.warn('Rust API経由の削除に失敗、Tauriコマンドにフォールバック:', error);
    return callTauriCommand('delete_org_member', { id });
  }
}

/**
 * 組織のメンバー一覧を取得（idを含む）
 */
export async function getOrgMembers(organizationId: string): Promise<any[]> {
  console.log('🔍 [getOrgMembers] メンバー取得開始:', { organizationId });
  
  // virtual-rootは仮想組織なので、メンバーを取得しない
  if (organizationId === 'virtual-root') {
    console.log('⚠️ [getOrgMembers] virtual-rootは仮想組織のため、メンバーを返しません');
    return [];
  }
  
  // Supabase専用（環境変数チェック不要）
  try {
    const { getDataSourceInstance } = await import('./dataSource');
    const dataSource = getDataSourceInstance();
    
    // organizationIdでフィルタリングしてから取得（クライアント側でのフィルタリングを回避）
    // normalizeFieldNameで自動的に小文字に変換されるため、organizationId（キャメルケース）を使用可能
    // displayOrderカラムが存在しない場合に備えて、まずpositionでソートを試みる
    let result: any[] = [];
    try {
      // まずdisplayOrderでソートを試みる
      result = await dataSource.collection_get('organizationMembers', {
        filters: [
          { field: 'organizationId', operator: 'eq', value: organizationId }
        ],
        orderBy: 'displayOrder',
        orderDirection: 'asc'
      });
    } catch (error: any) {
      // displayOrderカラムが存在しない場合は、positionでソート
      if (error?.code === '42703' || error?.message?.includes('displayOrder does not exist')) {
        console.warn('⚠️ [getOrgMembers] displayOrderカラムが存在しないため、positionでソートします');
        result = await dataSource.collection_get('organizationMembers', {
          filters: [
            { field: 'organizationId', operator: 'eq', value: organizationId }
          ],
          orderBy: 'position',
          orderDirection: 'asc'
        });
      } else {
        throw error;
      }
    }
    
    // displayOrderがnullの場合は、positionでソート（後方互換性のため）
    if (result && result.length > 0) {
      const hasDisplayOrder = result.some((m: any) => m.displayOrder !== null && m.displayOrder !== undefined);
      if (!hasDisplayOrder) {
        // displayOrderが設定されていない場合は、positionでソート
        result.sort((a: any, b: any) => {
          const posA = a.position || '';
          const posB = b.position || '';
          if (posA !== posB) {
            return posA.localeCompare(posB, 'ja');
          }
          const nameA = a.name || '';
          const nameB = b.name || '';
          return nameA.localeCompare(nameB, 'ja');
        });
      } else {
        // displayOrderでソート（nullは最後に）
        result.sort((a: any, b: any) => {
          const orderA = a.displayOrder !== null && a.displayOrder !== undefined ? a.displayOrder : 999999;
          const orderB = b.displayOrder !== null && b.displayOrder !== undefined ? b.displayOrder : 999999;
          return orderA - orderB;
        });
      }
    }
    
    console.log('✅ [getOrgMembers] Supabase経由でメンバー取得成功:', { 
      organizationId, 
      count: result?.length || 0
    });
    return result || [];
  } catch (error: any) {
    console.error('❌ [getOrgMembers] Supabase経由の取得に失敗:', { 
      organizationId, 
      error: error?.message 
    });
    // ネットワークエラーやCORSエラー、TypeError（fetch失敗）の場合は空配列を返す
    const isNetworkError = 
      error instanceof TypeError || 
      error?.message?.includes('network') || 
      error?.message?.includes('CORS') || 
      error?.message?.includes('access control') ||
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('network connection was lost');
    
    if (isNetworkError) {
      console.warn('⚠️ [getOrgMembers] Rust APIサーバーへの接続失敗、Tauriコマンドにフォールバック:', { organizationId, error: error?.message });
    } else {
      console.warn('⚠️ [getOrgMembers] Rust API経由の取得に失敗、Tauriコマンドにフォールバック:', { organizationId, error: error?.message });
    }
    
    // フォールバック: Tauriコマンド経由
    try {
      const result = await callTauriCommand('get_org_members', { organizationId });
      console.log('✅ [getOrgMembers] Tauriコマンド経由でメンバー取得成功:', { 
        organizationId, 
        count: result?.length || 0,
        result 
      });
      return result || [];
    } catch (fallbackError: any) {
      // フォールバックも失敗した場合は警告のみ（エラーを無視）
      console.warn('⚠️ [getOrgMembers] メンバー取得エラー（無視します）:', { 
        organizationId, 
        error: fallbackError?.message
      });
      return [];
    }
  }
}

/**
 * 組織コンテンツの型定義
 */
export interface OrganizationContent {
  organizationId: string;
  introduction?: string; // 組織紹介
  focusAreas?: string; // 注力領域
  meetingNotes?: string; // 議事録アーカイブ
  createdAt?: any;
  updatedAt?: any;
}

/**
 * テーマの型定義
 */
export interface Theme {
  id: string;
  title: string;
  description?: string;
  initiativeIds?: string[]; // 関連する注力施策のIDリスト
  position?: number; // 表示順序
  createdAt?: any;
  updatedAt?: any;
}

export interface Category {
  id: string;
  title: string;
  description?: string;
  parentCategoryId?: string; // 親カテゴリーID（サブカテゴリーの場合）
  position?: number; // 表示順序
  createdAt?: any;
  updatedAt?: any;
}

/**
 * 注力施策の型定義
 */
export interface FocusInitiative {
  id: string;
  organizationId?: string;
  companyId?: string;
  title: string;
  description?: string;
  content?: string; // 詳細コンテンツ（マークダウン）
  assignee?: string; // 担当者
  method?: string[]; // 手法（複数選択可能）
  methodOther?: string; // 手法（その他）
  methodDetails?: Record<string, any>; // 手法の詳細情報（各手法ごとのテーブルデータ）
  means?: string[]; // 手段（複数選択可能）
  meansOther?: string; // 手段（その他）
  objective?: string; // 目標
  considerationPeriod?: string; // 検討期間
  executionPeriod?: string; // 実行期間
  monetizationPeriod?: string; // 収益化期間
  relatedOrganizations?: string[]; // 関連組織
  relatedGroupCompanies?: string[]; // 関連グループ会社
  monetizationDiagram?: string; // マネタイズ図（Mermaid図）
  monetizationDiagramId?: string; // マネタイズ図のユニークID
  relationDiagram?: string; // 相関図（Mermaid図）
  relationDiagramId?: string; // 相関図のユニークID
  causeEffectDiagramId?: string; // 特性要因図のユニークID
  themeId?: string; // 関連するテーマID（後方互換性のため残す）
  themeIds?: string[]; // 関連するテーマIDの配列（複数のテーマにリンク可能）
  topicIds?: string[]; // 関連する個別トピックIDの配列（複数のトピックにリンク可能）
  createdAt?: any;
  updatedAt?: any;
}

/**
 * ユニークIDを生成
 */
export function generateUniqueId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `init_${timestamp}_${randomPart}`;
}

/**
 * 注力施策のユニークIDを生成（エクスポート）
 */
export function generateUniqueInitiativeId(): string {
  return generateUniqueId();
}

/**
 * 議事録のユニークIDを生成
 */
function generateMeetingNoteId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `meeting_${timestamp}_${randomPart}`;
}

/**
 * 議事録のユニークIDを生成（エクスポート）
 */
export function generateUniqueMeetingNoteId(): string {
  return generateMeetingNoteId();
}

/**
 * 議事録の型定義
 */
export interface MeetingNote {
  id: string;
  organizationId: string;
  companyId?: string; // 事業会社ID（事業会社の議事録の場合）
  title: string;
  description?: string;
  content?: string; // 詳細コンテンツ（マークダウン）
  createdAt?: any;
  updatedAt?: any;
}

/**
 * 制度のIDを生成（内部関数）
 */
function generateRegulationId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `regulation_${timestamp}_${randomPart}`;
}

/**
 * 制度のユニークIDを生成（エクスポート）
 */
export function generateUniqueRegulationId(): string {
  return generateRegulationId();
}

/**
 * 制度の型定義
 */
export interface Regulation {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  content?: string; // 詳細コンテンツ（今後追加予定）
  createdAt?: any;
  updatedAt?: any;
}

/**
 * スタートアップのIDを生成
 */
function generateStartupId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 11);
  return `startup_${timestamp}_${randomPart}`;
}

/**
 * スタートアップのユニークIDを生成（エクスポート）
 */
export function generateUniqueStartupId(): string {
  return generateStartupId();
}

/**
 * スタートアップの型定義
 */
// 評価チャート関連の型定義
export interface EvaluationAxis {
  id: string;
  label: string;
  priority: '高' | '中' | '低';
  weight: number;
  score: number; // 0-5
  maxValue: number; // 通常は5
  basis?: string; // 比較の根拠
}

export interface EvaluationChartData {
  axes: EvaluationAxis[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EvaluationChartSnapshot {
  id: string;
  name: string;
  date: string;
  data: EvaluationChartData;
}

export interface Startup {
  id: string;
  organizationId?: string;
  companyId?: string;
  title: string;
  description?: string;
  content?: string; // 詳細コンテンツ（マークダウン）
  assignee?: string; // 担当者
  method?: string[]; // 手法（複数選択可能）
  methodOther?: string; // 手法（その他）
  methodDetails?: Record<string, any>; // 手法の詳細情報（各手法ごとのテーブルデータ）
  means?: string[]; // 手段（複数選択可能）
  meansOther?: string; // 手段（その他）
  objective?: string; // 目標
  evaluation?: string; // 評価
  evaluationChart?: EvaluationChartData; // 評価チャートデータ
  evaluationChartSnapshots?: EvaluationChartSnapshot[]; // 評価チャートのスナップショット
  considerationPeriod?: string; // 検討期間
  executionPeriod?: string; // 実行期間
  monetizationPeriod?: string; // 収益化期間
  relatedOrganizations?: string[]; // 関連組織
  relatedGroupCompanies?: string[]; // 関連グループ会社
  monetizationDiagram?: string; // マネタイズ図（Mermaid図）
  monetizationDiagramId?: string; // マネタイズ図のユニークID
  relationDiagram?: string; // 相関図（Mermaid図）
  relationDiagramId?: string; // 相関図のユニークID
  causeEffectDiagramId?: string; // 特性要因図のユニークID
  themeId?: string; // 関連するテーマID（後方互換性のため残す）
  themeIds?: string[]; // 関連するテーマIDの配列（複数のテーマにリンク可能）
  topicIds?: string[]; // 関連する個別トピックIDの配列（複数のトピックにリンク可能）
  categoryIds?: string[]; // 関連するカテゴリーIDの配列（複数選択可能）
  relatedVCS?: string[]; // 関連VCの配列（複数選択可能）
  responsibleDepartments?: string[]; // 主管事業部署の配列（複数選択可能）
  isFavorite?: boolean; // お気に入りフラグ
  createdAt?: any;
  updatedAt?: any;
}

// 注力施策関連の関数は lib/orgApi/focusInitiatives.ts に移動しました
// focusInitiatives.tsから再エクスポート（後方互換性のため）
export {
  getFocusInitiatives,
  getFocusInitiativeByCauseEffectDiagramId,
  getFocusInitiativeById,
  saveFocusInitiative,
  deleteFocusInitiative,
} from './orgApi/focusInitiatives';

/**
 * Tauriダイアログを使用した確認
 * Tauri環境では、window.confirmを直接使用します（Tauriのネイティブダイアログは設定が必要なため）
 */
export async function tauriConfirm(message: string, title: string = '確認'): Promise<boolean> {
  try {
    console.log('🔔 [tauriConfirm] 開始:', { title, message: message.substring(0, 100) });
    
    // Tauri環境かどうかを確認
    const isTauri = typeof window !== 'undefined' && (
      '__TAURI__' in window || 
      window.location.port === '3010' ||
      (window.location.hostname === 'localhost' && window.location.port === '3010')
    );

    console.log('🔔 [tauriConfirm] 環境確認:', { isTauri, hasWindow: typeof window !== 'undefined' });

    // window.confirmは同期的な関数なので、Promiseでラップする必要はありませんが、
    // 非同期関数として扱うためにPromiseでラップします
    const fullMessage = `${title}\n\n${message}`;
    
    // Promiseでラップして、確実にbooleanを返すようにします
    return new Promise<boolean>((resolve) => {
      try {
        console.log('🔔 [tauriConfirm] window.confirmを呼び出します');
        const result = window.confirm(fullMessage);
        console.log('🔔 [tauriConfirm] window.confirmの結果:', result);
        resolve(result);
      } catch (error) {
        console.error('❌ [tauriConfirm] window.confirmでエラー:', error);
        // エラーが発生した場合は、デフォルトでfalseを返す
        resolve(false);
      }
    });
  } catch (error) {
    console.error('❌ [tauriConfirm] 確認ダイアログの表示に失敗しました:', error);
    // エラーが発生した場合は、デフォルトでfalseを返す
    return false;
  }
}

/**
 * Tauriダイアログを使用したアラート
 * Tauri環境では、window.alertを直接使用します（Tauriのネイティブダイアログは設定が必要なため）
 */
export async function tauriAlert(message: string, title: string = 'お知らせ'): Promise<void> {
  try {
    const isTauri = typeof window !== 'undefined' && (
      '__TAURI__' in window || 
      window.location.port === '3010' ||
      (window.location.hostname === 'localhost' && window.location.port === '3010')
    );

    if (isTauri) {
      // Tauri環境では、window.alertを直接使用
      // Tauriのネイティブダイアログを使用する場合は、プラグインの設定が必要です
      window.alert(`${title}\n\n${message}`);
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } catch (error) {
    console.warn('⚠️ [tauriAlert] アラートダイアログの表示に失敗しました。フォールバックを使用します。', error);
    window.alert(message);
  }
}

// 注力施策関連の関数は lib/orgApi/focusInitiatives.ts に移動しました
// deleteFocusInitiative は lib/orgApi/focusInitiatives.ts から再エクスポートされています

// 議事録関連の関数は lib/orgApi/meetingNotes.ts に移動しました
// 制度関連の関数は lib/orgApi/regulations.ts に移動しました
// スタートアップ関連の関数は lib/orgApi/startups.ts に移動しました
// テーマ関連の関数は lib/orgApi/themes.ts に移動しました
// トピック関連の関数は lib/orgApi/topics.ts に移動しました

// 組織コンテンツ関連の関数は lib/orgApi/organizations.ts に移動しました
// 議事録関連の関数は lib/orgApi/meetingNotes.ts に移動しました
// 制度関連の関数は lib/orgApi/regulations.ts に移動しました
// スタートアップ関連の関数は lib/orgApi/startups.ts に移動しました
// テーマ関連の関数は lib/orgApi/themes.ts に移動しました
// トピック関連の関数は lib/orgApi/topics.ts に移動しました

// 以下、移動済みの関数は削除されました
// 制度関連: getRegulations, saveRegulation, getRegulationById, deleteRegulation
// スタートアップ関連: getStartups, saveStartup, getStartupById, deleteStartup
// テーマ関連: getThemes, getThemeById, saveTheme, deleteTheme, updateThemePositions
// トピック関連: getTopicsByMeetingNote, getTopicsByRegulation, getAllTopics, getAllTopicsBatch

// すべての移動済み関数は lib/orgApi/index.ts から再エクスポートされています

// 注力施策関連の関数（まだ移動していない関数）
// 以下、移動済みの関数の不完全な実装は削除されました

// 注力施策関連の関数は lib/orgApi/focusInitiatives.ts に移動しました

// 以下、移動済みの関数の不完全な実装は削除されました
// スタートアップ関連、テーマ関連、トピック関連の関数も削除されました

// 注力施策関連の関数は lib/orgApi/focusInitiatives.ts に移動しました
// すべての移動済み関数は lib/orgApi/index.ts から再エクスポートされています
// 注力施策関連の関数は上記（1230行目）で再エクスポートされています

// 注力施策関連の関数は lib/orgApi/focusInitiatives.ts に移動しました

// 以下、移動済みの関数の不完全な実装は削除されました
// 制度関連、スタートアップ関連、テーマ関連、トピック関連の関数も削除されました

// 以下、移動済みの関数は削除されました
// 制度関連、スタートアップ関連、テーマ関連、トピック関連の関数は lib/orgApi/index.ts から再エクスポートされています

// 注力施策関連の関数は lib/orgApi/focusInitiatives.ts に移動しました

// 以下、移動済みの関数は削除されました
// スタートアップ関連、テーマ関連、トピック関連の関数は lib/orgApi/index.ts から再エクスポートされています

// 注力施策関連の関数は lib/orgApi/focusInitiatives.ts に移動しました

// テーマ関連、トピック関連の関数は削除されました
// これらは lib/orgApi/themes.ts, lib/orgApi/topics.ts に移動しました
// すべての移動済み関数は lib/orgApi/index.ts から再エクスポートされています

/**
 * 全組織のメンバーを一括取得（パフォーマンス最適化版）
 * 組織IDのリストを受け取り、並列で取得
 */
export async function getAllMembersBatch(organizationIds: string[]): Promise<Array<{ id: string; name: string; position?: string; organizationId: string }>> {
  try {
    console.log('📖 [getAllMembersBatch] 開始:', { organizationCount: organizationIds.length });
    
    // 並列で全組織のメンバーを取得（エラーは個別に処理）
    const memberPromises = organizationIds.map(async (orgId) => {
      try {
        const members = await getOrgMembers(orgId);
        return members.map(m => ({
          id: m.id,
          name: m.name,
          position: m.position,
          organizationId: orgId,
        }));
      } catch (error) {
        // エラーは警告のみ（処理は続行）
        console.warn('⚠️ [getAllMembersBatch] 組織のメンバー取得エラー（無視します）:', { orgId, error });
        return [];
      }
    });
    
    // Promise.allSettledを使用して、一部のリクエストが失敗しても続行
    const results = await Promise.allSettled(memberPromises);
    const allMembersArrays = results
      .filter((result) => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<Array<{ id: string; name: string; position?: string; organizationId: string }>>).value);
    const allMembers = allMembersArrays.flat();
    
    console.log('✅ [getAllMembersBatch] 取得成功:', allMembers.length, '件');
    return allMembers;
  } catch (error: any) {
    // 予期しないエラーでも空配列を返して処理を続行
    console.warn('⚠️ [getAllMembersBatch] エラー（無視します）:', error);
    return [];
  }
}

// 注意: importOrganizationMasterFromCSV関数は削除されました（organization_masterテーブルが削除されたため）

// 削除された関数を他のモジュールから再エクスポート（後方互換性のため）
// これらの関数は各モジュールから直接再エクスポートされています

// 議事録関連
export {
  getAllMeetingNotes,
  getMeetingNotes,
  saveMeetingNote,
  getMeetingNoteById,
  deleteMeetingNote,
} from './orgApi/meetingNotes';

// 制度関連
export {
  getRegulations,
  saveRegulation,
  getRegulationById,
  deleteRegulation,
} from './orgApi/regulations';

// スタートアップ関連
export {
  getStartups,
  saveStartup,
  getStartupById,
  deleteStartup,
  toggleStartupFavorite,
} from './orgApi/startups';

// テーマ関連
export {
  getThemes,
  getThemeById,
  saveTheme,
  deleteTheme,
  updateThemePositions,
} from './orgApi/themes';

// カテゴリー関連
export {
  getCategories,
  getCategoryById,
  saveCategory,
  deleteCategory,
  updateCategoryPositions,
} from './orgApi/categories';

// トピック関連
export {
  getTopicsByMeetingNote,
  getTopicsByRegulation,
  getAllTopics,
  getAllTopicsBatch,
} from './orgApi/topics';

// 組織コンテンツ関連
export {
  getOrganizationContent,
  saveOrganizationContent,
  getDeletionTargets,
} from './orgApi/organizations';

// lib/orgApi/index.tsからすべてを再エクスポート（カテゴリー関連を含む）
export * from './orgApi/index';
