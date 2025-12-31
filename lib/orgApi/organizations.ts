import { callTauriCommand } from '../localFirebase';
import { apiGet, apiPost, apiPut } from '../apiClient';
import type { OrgNodeData, MemberInfo } from '@/components/OrgChart';
import { sortMembersByPosition } from '../memberSort';
import { doc, getDoc, setDoc, serverTimestamp } from '../firestore';
import type { OrganizationContent } from './types';

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
 * データベースから組織データを取得してOrgNodeData形式に変換
 * Supabase対応版（最適化済み）
 */
export async function getOrgTreeFromDb(rootId?: string): Promise<OrgNodeData | null> {
  const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
  
  // Supabase使用時はDataSource経由で取得（最適化）
  if (useSupabase) {
    try {
      console.log('🔍 [getOrgTreeFromDb] Supabase経由で組織ツリーを取得します');
      const { getDataSourceInstance } = await import('../dataSource');
      const dataSource = getDataSourceInstance();
      
      // すべての組織を取得
      const allOrgs = await dataSource.collection_get('organizations');
      
      if (!allOrgs || allOrgs.length === 0) {
        return null;
      }
      
      // 組織メンバーを取得（PostgreSQLでは引用符なしのテーブル名は小文字になる）
      let allMembers: any[] = [];
      try {
        const { getCollectionViaDataSource } = await import('../dataSourceAdapter');
        // PostgreSQLではorganizationMembersはorganizationmembers（小文字）として作成される
        allMembers = await getCollectionViaDataSource('organizationmembers');
      } catch (error: any) {
        // organizationmembersが見つからない場合は、organizationMembers（キャメルケース）を試す
        if (error?.message?.includes('Could not find the table') || error?.message?.includes('schema cache')) {
          console.warn('⚠️ [getOrgTreeFromDb] organizationmembersテーブルが見つかりません。organizationMembers（キャメルケース）を試します。');
          try {
            const { getCollectionViaDataSource } = await import('../dataSourceAdapter');
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
        const orgId = member.organizationId || member.organizationid;
        if (orgId) {
          if (!membersByOrgId.has(orgId)) {
            membersByOrgId.set(orgId, []);
          }
          membersByOrgId.get(orgId)!.push(member);
        }
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
    } catch (error) {
      // Supabase使用時はSQLiteにフォールバックしない
      console.error('❌ [getOrgTreeFromDb] Supabase経由の組織データ取得に失敗:', error);
      return null;
    }
  }
  
  // ローカルSQLite使用時はTauriコマンド経由
  try {
    // Tauriコマンド経由で直接取得（APIサーバー経由ではなく）
    console.log('🔍 [getOrgTreeFromDb] Tauriコマンド経由で組織ツリーを取得します');
    const tree = await callTauriCommand('get_org_tree', { rootId: rootId || null });
    
    if (!tree || tree.length === 0) {
      return null;
    }

    // rootIdが指定されている場合は、該当する組織を返す
    if (rootId) {
      const found = tree.find((org: any) => {
        const orgData = org.organization || org;
        return orgData.id === rootId;
      });
      if (found) {
        return convertToOrgNodeData(found);
      }
      // 見つからない場合は最初の1つを返す
      return convertToOrgNodeData(tree[0]);
    }

    // 複数のルート組織がある場合、全てを子ノードとして持つ仮想的なルートノードを作成
    if (tree.length > 1) {
      console.log(`⚠️ [getOrgTreeFromDb] 複数のルート組織が見つかりました (${tree.length}件)。全て表示します。`);
      const convertedRoots = tree.map((org: any) => convertToOrgNodeData(org));
      
      // 仮想的なルートノードを作成（重複を識別しやすくするため）
      const virtualRoot: OrgNodeData = {
        id: 'virtual-root',
        name: `全組織 (${tree.length}件のルート組織)`,
        title: `All Organizations (${tree.length} root organizations)`,
        description: '複数のルート組織が存在します。重複している可能性があります。',
        children: convertedRoots,
        members: [],
      };
      
      // 重複している組織名をログに出力
      const orgNames = convertedRoots.map((org: OrgNodeData) => org.name);
      const duplicateNames = orgNames.filter((name: string, index: number) => orgNames.indexOf(name) !== index);
      if (duplicateNames.length > 0) {
        console.warn(`⚠️ [getOrgTreeFromDb] 重複している組織名:`, [...new Set(duplicateNames)]);
      }
      
      return virtualRoot;
    }

    // 1つだけの場合はそのまま返す
    return convertToOrgNodeData(tree[0]);
  } catch (error) {
    console.error('組織データの取得に失敗しました:', error);
    return null;
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
 * 組織を作成（Supabase対応）
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
  const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
  console.log(`🔍 [createOrg] 組織を作成開始（${useSupabase ? 'Supabase' : 'SQLite'}経由）:`, {
    parentId,
    name,
    level,
    levelName,
    position,
    orgType: orgType || 'organization',
  });
  
  // Supabase使用時はSupabaseDataSource経由で作成
  if (useSupabase) {
    try {
      const { getDataSourceInstance } = await import('../dataSource');
      const dataSource = getDataSourceInstance();
      
      // parentIdが指定されている場合、親組織が存在するか確認
      if (parentId) {
        try {
          const parentOrg = await dataSource.doc_get('organizations', parentId);
          if (!parentOrg) {
            throw new Error(`親組織が見つかりません: ${parentId}`);
          }
        } catch (parentError: any) {
          const errorMessage = parentError?.message || '';
          if (errorMessage.includes('Query returned no rows') || 
              errorMessage.includes('ドキュメント取得エラー') ||
              parentError?.code === 'PGRST116') {
            throw new Error(`親組織が見つかりません: ${parentId}`);
          }
          throw parentError;
        }
      }
      
      // 組織データを準備（Supabaseのスキーマに合わせてカラム名を調整）
      const now = new Date().toISOString();
      const orgData: any = {
        name,
        level,
        levelName,
        position,
        type: orgType || 'organization',
        createdAt: now,
        updatedAt: now,
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
      
      console.log('💾 [createOrg] Supabaseに保存するデータ:', orgData);
      
      // SupabaseDataSource経由で作成
      const orgId = await dataSource.collection_add('organizations', orgData);
      
      console.log('✅ [createOrg] 組織IDを取得:', orgId);
      
      // 作成された組織を取得して返す（少し待ってから取得）
      await new Promise(resolve => setTimeout(resolve, 200));
      
      let createdOrg: any = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries && !createdOrg) {
        try {
          createdOrg = await dataSource.doc_get('organizations', orgId);
          if (createdOrg) {
            break;
          }
        } catch (getError: any) {
          console.warn(`⚠️ [createOrg] 組織の取得に失敗（再試行 ${retryCount + 1}/${maxRetries}）:`, getError);
          if (retryCount < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        retryCount++;
      }
      
      if (!createdOrg) {
        // 取得に失敗した場合でも、IDと基本情報を返す
        console.warn('⚠️ [createOrg] 作成後の組織取得に失敗しましたが、IDを返します:', orgId);
        return {
          id: orgId,
          name,
          parentId: parentId || null,
          parent_id: parentId || null,
          level,
          levelName,
          level_name: levelName,
          position,
          type: orgType || 'organization',
          title: title || null,
          description: description || null,
        };
      }
      
      console.log('✅ [createOrg] Supabase経由で組織を作成成功:', {
        id: createdOrg.id,
        name: createdOrg.name,
        parentId: createdOrg.parentId || createdOrg.parent_id || null,
      });
      
      return createdOrg;
    } catch (error: any) {
      console.error('❌ [createOrg] Supabase経由の作成に失敗:', error);
      throw error;
    }
  }
  
  // ローカルSQLite使用時は従来の方法
  try {
    // Rust API経由で作成
    const payload: any = {
      parent_id: parentId,
      name,
      title: title || null,
      description: description || null,
      level,
      level_name: levelName,
      position,
    };
    if (orgType) {
      payload.type = orgType;
    }
    return await apiPost<any>('/api/organizations', payload);
  } catch (error) {
    // フォールバック: Tauriコマンド経由
    console.warn('Rust API経由の作成に失敗、Tauriコマンドにフォールバック:', error);
    return callTauriCommand('create_org', {
      parentId: parentId,
      name,
      title,
      description,
      level,
      levelName,
      position,
      orgType: orgType || null,
    });
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
  const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
  console.log(`🔄 [updateOrg] 組織を更新開始（${useSupabase ? 'Supabase' : 'SQLite'}経由）:`, {
    id,
    name,
    title,
    description,
    position,
  });
  
  // Supabase使用時はSupabaseDataSource経由で更新
  if (useSupabase) {
    try {
      const { getDataSourceInstance } = await import('../dataSource');
      const dataSource = getDataSourceInstance();
      
      // 既存の組織データを取得（エラーが発生しても更新を試みる）
      let existingOrg: any = null;
      try {
        existingOrg = await dataSource.doc_get('organizations', id);
        if (existingOrg) {
          console.log('📖 [updateOrg] 既存の組織データを取得:', existingOrg);
        }
      } catch (getError: any) {
        const errorMessage = getError?.message || '';
        // レコードが見つからないエラーの場合は警告のみ（更新を試みる）
        if (errorMessage.includes('Query returned no rows') || 
            errorMessage.includes('ドキュメント取得エラー') ||
            getError?.code === 'PGRST116') {
          console.warn(`⚠️ [updateOrg] 既存の組織データを取得できませんでしたが、更新を試みます: ${id}`);
        } else {
          // その他のエラーの場合は警告のみ（更新を試みる）
          console.warn(`⚠️ [updateOrg] 既存の組織データの取得でエラーが発生しましたが、更新を試みます:`, getError);
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
        // 既存データを保持しつつ、指定されたフィールドのみ更新
        Object.assign(updateData, existingOrg, { updatedAt: now });
      } else {
        // 既存データがない場合は、最低限のデータを設定
        updateData.createdAt = now;
      }
      
      // 指定されたフィールドのみ更新
      if (name !== undefined) {
        updateData.name = name;
      }
      if (title !== undefined) {
        updateData.title = title;
      }
      if (description !== undefined) {
        updateData.description = description;
      }
      if (position !== undefined) {
        updateData.position = position;
      }
      
      console.log('💾 [updateOrg] Supabaseに更新するデータ:', updateData);
      
      // SupabaseDataSource経由で更新（doc_setを使用して、存在しない場合は作成、存在する場合は更新）
      try {
        await dataSource.doc_set('organizations', id, updateData);
        console.log('✅ [updateOrg] Supabase経由で組織を更新/作成成功:', id);
      } catch (updateError: any) {
        const updateErrorMessage = updateError?.message || '';
        // レコードが見つからないエラーの場合は、doc_setで再試行（新規作成として扱う）
        if (updateErrorMessage.includes('Query returned no rows') || 
            updateErrorMessage.includes('No rows found') ||
            updateError?.code === 'PGRST116') {
          console.log('ℹ️ [updateOrg] 組織が見つからないため、新規作成として処理します:', id);
          await dataSource.doc_set('organizations', id, updateData);
        } else {
          throw updateError;
        }
      }
      
      console.log('✅ [updateOrg] Supabase経由で組織を更新成功:', id);
      
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
          console.warn(`⚠️ [updateOrg] 更新後の組織取得に失敗（再試行 ${retryCount + 1}/${maxRetries}）:`, getError);
          if (retryCount < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        retryCount++;
      }
      
      if (!updatedOrg) {
        // 取得に失敗した場合でも、更新データを返す
        console.warn('⚠️ [updateOrg] 更新後の組織取得に失敗しましたが、更新データを返します:', id);
        return updateData;
      }
      
      return updatedOrg;
    } catch (error: any) {
      console.error('❌ [updateOrg] Supabase経由の更新に失敗:', error);
      throw error;
    }
  }
  
  // ローカルSQLite使用時は従来の方法
  try {
    // Rust API経由で更新
    return await apiPut<any>(`/api/organizations/${id}`, {
      name: name || null,
      title: title || null,
      description: description || null,
      position: position || null,
    });
  } catch (error) {
    // フォールバック: Tauriコマンド経由
    console.warn('Rust API経由の更新に失敗、Tauriコマンドにフォールバック:', error);
    return callTauriCommand('update_org', {
      id,
      name: name || null,
      title: title || null,
      description: description || null,
      position: position || null,
    });
  }
}

/**
 * 組織の親IDを更新
 */
export async function updateOrgParent(
  id: string,
  parentId: string | null
): Promise<any> {
  return callTauriCommand('update_org_parent', {
    id,
    parentId: parentId || null,
  });
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

/**
 * 削除対象の子組織とメンバーを取得（Supabase対応）
 */
export async function getDeletionTargets(organizationId: string): Promise<{
  childOrganizations: Array<{ id: string; name: string; title?: string; level: number; levelName: string; type?: string }>;
  members: Array<{ id: string; name: string; position?: string; organizationId: string }>;
}> {
  const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
  console.log(`🔍 [getDeletionTargets] 削除対象を取得開始（${useSupabase ? 'Supabase' : 'SQLite'}経由）:`, organizationId);
  
  // Supabase使用時はDataSource経由で取得
  if (useSupabase) {
    try {
      const { getDataSourceInstance } = await import('../dataSource');
      const dataSource = getDataSourceInstance();
      
      // すべての組織を取得
      const allOrgs = await dataSource.collection_get('organizations');
      console.log(`📊 [getDeletionTargets] 全組織数: ${allOrgs.length}件`);
      console.log(`🔍 [getDeletionTargets] 削除対象組織ID: ${organizationId}`);
      
      // デバッグ: すべての組織のIDと親IDを確認
      if (allOrgs.length > 0) {
        console.log(`🔍 [getDeletionTargets] 全組織のIDと親ID一覧:`);
        for (const org of allOrgs) {
          const orgId = org.id;
          // すべての可能なキーを確認
          const keys = Object.keys(org);
          const parentIdKeys = keys.filter(k => k.toLowerCase().includes('parent'));
          const parentIdValue = org.parentId ?? org.parent_id ?? org['parentId'] ?? org['parent_id'] ?? 
            (parentIdKeys.length > 0 ? org[parentIdKeys[0]] : null);
          console.log(`  - ID: ${orgId}, 名前: ${org.name || 'N/A'}, 親IDキー: [${parentIdKeys.join(', ')}], 親ID値: ${parentIdValue || 'null'}`);
        }
        
        // サンプルデータの完全な構造を確認
        console.log(`🔍 [getDeletionTargets] サンプル組織データ（最初の1件の完全な構造）:`, JSON.stringify(allOrgs[0], null, 2));
      }
      
      // 再帰的に子組織を取得
      const childOrganizations: Array<{ id: string; name: string; title?: string; level: number; levelName: string; type?: string }> = [];
      const processedIds = new Set<string>();
      
      const findChildOrgs = (parentId: string) => {
        console.log(`🔍 [getDeletionTargets] 親ID ${parentId} の子組織を検索中...`);
        let foundCount = 0;
        
        for (const org of allOrgs) {
          const orgId = org.id;
          
          // 既に処理済みの場合はスキップ（循環参照を防ぐ）
          if (processedIds.has(orgId)) {
            continue;
          }
          
          // 複数のフィールド名の可能性を考慮（Supabaseでは引用符付きカラム名はキャメルケースのまま）
          // オブジェクトのキーを直接確認（in演算子を使用）
          let orgParentId: string | null = null;
          
          // すべての可能なキー名を試す
          if ('parentId' in org && org.parentId != null) {
            orgParentId = String(org.parentId);
          } else if ('parent_id' in org && org.parent_id != null) {
            orgParentId = String(org.parent_id);
          } else {
            // オブジェクトのキーを動的に確認（大文字小文字を区別しない）
            const keys = Object.keys(org);
            const parentIdKey = keys.find(k => k.toLowerCase() === 'parentid');
            if (parentIdKey && org[parentIdKey] != null) {
              orgParentId = String(org[parentIdKey]);
            }
          }
          
          // 親IDの比較（文字列として比較、null/undefinedも考慮）
          const parentIdStr = parentId ? String(parentId).trim() : null;
          const orgParentIdStr = orgParentId ? String(orgParentId).trim() : null;
          
          // デバッグ: 最初の数件のみ詳細ログ
          if (foundCount < 5) {
            console.log(`  🔍 組織チェック: ID=${orgId}, 名前=${org.name || 'N/A'}, 親ID=${orgParentIdStr}, 対象親ID=${parentIdStr}, マッチ=${parentIdStr && orgParentIdStr && parentIdStr === orgParentIdStr}`);
          }
          
          if (parentIdStr && orgParentIdStr && parentIdStr === orgParentIdStr) {
            foundCount++;
            console.log(`  ✅ 子組織を発見: ID=${orgId}, 名前=${org.name || 'N/A'}, 親ID=${orgParentIdStr}`);
            processedIds.add(orgId);
            childOrganizations.push({
              id: orgId,
              name: org.name || '',
              title: org.title || undefined,
              level: org.level || 0,
              levelName: org.levelName || org.level_name || '',
              type: org.type || 'organization',
            });
            
            // 再帰的に子組織を探す
            findChildOrgs(orgId);
          }
        }
        
        console.log(`  📊 親ID ${parentId} の直接の子組織: ${foundCount}件`);
      };
      
      findChildOrgs(organizationId);
      console.log(`🔍 [getDeletionTargets] 子組織数（再帰的）: ${childOrganizations.length}件`);
      
      // メンバーを取得（指定された組織とその子組織のメンバー）
      const { getCollectionViaDataSource } = await import('../dataSourceAdapter');
      let allMembers: any[] = [];
      try {
        allMembers = await getCollectionViaDataSource('organizationmembers');
      } catch (memberError: any) {
        // organizationmembersが見つからない場合は、organizationMembers（キャメルケース）を試す
        if (memberError?.message?.includes('Could not find the table') || memberError?.message?.includes('schema cache')) {
          try {
            allMembers = await getCollectionViaDataSource('organizationMembers');
          } catch (fallbackError) {
            console.warn('⚠️ [getDeletionTargets] メンバー取得に失敗しました:', fallbackError);
            allMembers = [];
          }
        } else {
          console.warn('⚠️ [getDeletionTargets] メンバー取得に失敗しました:', memberError);
          allMembers = [];
        }
      }
      
      // 指定された組織とその子組織のメンバーをフィルタリング
      const targetOrgIds = new Set([organizationId, ...childOrganizations.map(org => org.id)]);
      const members = allMembers
        .filter((m: any) => {
          const memberOrgId = m.organizationId || m.organizationid;
          return memberOrgId && targetOrgIds.has(memberOrgId);
        })
        .map((m: any) => ({
          id: m.id,
          name: m.name || '',
          position: m.position || undefined,
          organizationId: m.organizationId || m.organizationid || '',
        }));
      
      console.log(`🔍 [getDeletionTargets] メンバー数: ${members.length}件`);
      
      return {
        childOrganizations,
        members,
      };
    } catch (error: any) {
      console.error('❌ [getDeletionTargets] Supabase経由での取得に失敗しました:', error);
      throw new Error(`削除対象の取得に失敗しました: ${error.message || error}`);
    }
  }
  
  // ローカルSQLite使用時はTauriコマンド経由
  try {
    const result = await callTauriCommand('get_deletion_targets_cmd', {
      organizationId,
    }) as {
      childOrganizations: Array<{ id: string; name: string; title?: string; level: number; levelName: string; type?: string }>;
      members: Array<{ id: string; name: string; position?: string; organizationId: string }>;
    };
    return result;
  } catch (error: any) {
    console.error('❌ [getDeletionTargets] 削除対象の取得に失敗しました:', error);
    throw new Error(`削除対象の取得に失敗しました: ${error.message || error}`);
  }
}

/**
 * 組織を削除（Supabase対応）
 */
export async function deleteOrg(id: string): Promise<void> {
  // getOrgTreeFromDbと同じ方法でSupabaseが有効かどうかを判定
  const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
  console.log(`🗑️ [deleteOrg] 削除開始（${useSupabase ? 'Supabase' : 'SQLite'}経由）:`, id);
  console.log(`🔍 [deleteOrg] 環境変数確認: NEXT_PUBLIC_USE_SUPABASE=${process.env.NEXT_PUBLIC_USE_SUPABASE}, useSupabase=${useSupabase}`);
  
  // Supabase使用時はDataSource経由で削除
  if (useSupabase) {
    try {
      const { getDataSourceInstance } = await import('../dataSource');
      const dataSource = getDataSourceInstance();
      
      // 削除前に、該当する組織が存在するか確認（Supabase経由）
      // 注意: エラーが発生しても削除処理は続行する（組織が存在する可能性があるため）
      let orgExists = false;
      let orgName = '';
      try {
        const orgData = await dataSource.doc_get('organizations', id);
        if (orgData) {
          orgExists = true;
          orgName = orgData.name || '';
          console.log('🔍 [deleteOrg] 削除対象の組織を確認:', {
            id,
            name: orgName,
          });
        } else {
          console.warn('⚠️ [deleteOrg] 削除対象の組織が存在しません（nullが返されました）:', id);
          // nullが返された場合でも削除処理は続行（念のため削除を試みる）
        }
      } catch (docGetError: any) {
        // doc_getがエラーを返す場合の処理
        const errorMessage = docGetError?.message || '';
        const errorCode = docGetError?.code || '';
        
        // レコードが見つからないエラーの場合でも削除処理は続行
        // （既に削除されている可能性があるが、念のため削除を試みる）
        if (errorCode === 'PGRST116' || 
            errorMessage.includes('Query returned no rows') || 
            errorMessage.includes('ドキュメント取得エラー') ||
            errorMessage.includes('PGRST116')) {
          console.warn('⚠️ [deleteOrg] 削除前の確認でエラーが発生しました（レコードが見つかりませんが削除処理は続行します）:', {
            id,
            errorMessage,
            errorCode,
          });
        } else {
          // その他のエラーの場合も削除処理は続行
          console.warn('⚠️ [deleteOrg] 削除前の確認でエラーが発生しました（続行します）:', {
            error: docGetError,
            errorMessage,
            errorCode,
          });
        }
        // エラーが発生しても削除処理は続行（組織が存在する可能性があるため）
      }
      
      // 子組織も含めて削除する必要があるため、まず子組織のIDを取得
      // すべての組織を取得して、子組織を特定
      let childOrgIds: string[] = [];
      try {
        const allOrgs = await dataSource.collection_get('organizations');
        
        const findChildOrgs = (parentId: string) => {
          for (const org of allOrgs) {
            const orgParentId = org.parentId || org.parent_id;
            if (orgParentId === parentId) {
              childOrgIds.push(org.id);
              // 再帰的に子組織を探す
              findChildOrgs(org.id);
            }
          }
        };
        
        findChildOrgs(id);
        console.log(`🔍 [deleteOrg] 子組織数: ${childOrgIds.length}件`);
      } catch (collectionError: any) {
        console.warn('⚠️ [deleteOrg] 子組織の取得に失敗しました（続行します）:', collectionError);
        // 子組織の取得に失敗しても削除処理は続行
      }
      
      // 子組織を先に削除（再帰的に）
      const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
      for (const childId of childOrgIds) {
        try {
          console.log(`🗑️ [deleteOrg] 子組織を削除中: ${childId}`);
          await deleteDocViaDataSource('organizations', childId);
          console.log(`✅ [deleteOrg] 子組織を削除: ${childId}`);
        } catch (childError: any) {
          // 子組織の削除エラーは警告のみ（既に削除されている可能性がある）
          const childErrorMessage = childError?.message || '';
          if (childErrorMessage.includes('No rows found') || 
              childErrorMessage.includes('PGRST116') ||
              childErrorMessage.includes('Query returned no rows')) {
            console.log(`ℹ️ [deleteOrg] 子組織は既に削除されています: ${childId}`);
          } else {
            console.warn(`⚠️ [deleteOrg] 子組織の削除に失敗（続行します）: ${childId}`, childError);
          }
        }
      }
      
      // 親組織を削除
      console.log(`🗑️ [deleteOrg] 親組織を削除中: ${id}`);
      try {
        await deleteDocViaDataSource('organizations', id);
        console.log(`✅ [deleteOrg] Supabase経由で削除成功: ${id}`);
      } catch (deleteError: any) {
        const deleteErrorMessage = deleteError?.message || '';
        // レコードが見つからないエラーの場合は成功として扱う（既に削除されている）
        if (deleteErrorMessage.includes('No rows found') || 
            deleteErrorMessage.includes('PGRST116') ||
            deleteErrorMessage.includes('Query returned no rows')) {
          console.log(`ℹ️ [deleteOrg] 組織は既に削除されています: ${id}`);
        } else {
          console.error(`❌ [deleteOrg] 組織の削除に失敗: ${id}`, deleteError);
          throw new Error(`組織の削除に失敗しました: ${deleteErrorMessage || deleteError}`);
        }
      }
      
      // 削除が完了したことを確認（最大3回まで再試行）
      let deleteVerified = false;
      for (let retryCount = 0; retryCount < 3; retryCount++) {
        try {
          await new Promise(resolve => setTimeout(resolve, 300)); // 300ms待機してから確認
          
          const deletedOrg = await dataSource.doc_get('organizations', id).catch(() => null);
          if (!deletedOrg) {
            deleteVerified = true;
            console.log('✅ [deleteOrg] 削除が確認されました。組織はSupabaseから削除されています。');
            break;
          } else {
            console.warn(`⚠️ [deleteOrg] 削除後も組織が存在しています（再試行 ${retryCount + 1}/3）`);
            // 再試行
            try {
              await deleteDocViaDataSource('organizations', id);
            } catch (retryError: any) {
              console.warn(`⚠️ [deleteOrg] 再試行での削除に失敗:`, retryError);
            }
          }
        } catch (verifyError: any) {
          // 確認処理でエラーが発生した場合でも、削除処理自体は成功している可能性がある
          console.warn(`⚠️ [deleteOrg] 削除後の確認でエラーが発生しました（再試行 ${retryCount + 1}/3）:`, verifyError);
          // エラーメッセージが「レコードが見つからない」系の場合は削除成功とみなす
          const errorMessage = verifyError?.message || '';
          if (errorMessage.includes('Query returned no rows') || 
              errorMessage.includes('ドキュメント取得エラー') ||
              verifyError?.code === 'PGRST116') {
            deleteVerified = true;
            console.log('✅ [deleteOrg] 削除が確認されました（エラーメッセージから判断）。');
            break;
          }
        }
      }
      
      if (!deleteVerified) {
        console.warn('⚠️ [deleteOrg] 削除の確認ができませんでしたが、削除処理は実行されました。');
      }
      
      // メンバーも削除（CASCADE制約があれば自動削除されるが、念のため）
      try {
        const { getCollectionViaDataSource } = await import('../dataSourceAdapter');
        const allMembers = await getCollectionViaDataSource('organizationmembers');
        const members = allMembers.filter((m: any) => 
          (m.organizationId === id || m.organizationid === id)
        );
        
        for (const member of members) {
          try {
            await deleteDocViaDataSource('organizationmembers', member.id);
          } catch (memberError: any) {
            // メンバー削除エラーは無視（CASCADE制約で自動削除される可能性があるため）
            console.warn(`⚠️ [deleteOrg] メンバー削除エラー（無視します）: ${member.id}`, memberError);
          }
        }
      } catch (memberError: any) {
        // メンバー取得エラーは無視
        console.warn('⚠️ [deleteOrg] メンバー取得エラー（無視します）:', memberError);
      }
      
    } catch (error: any) {
      console.error('❌ [deleteOrg] Supabase経由での削除が失敗しました:', error);
      throw error;
    }
  } else {
    // 環境変数ではSupabaseが無効だが、getOrgTreeFromDbがSupabaseから取得している可能性がある
    // 念のため、DataSourceを確認してSupabaseが有効な場合はSupabaseから削除
    try {
      const { getDataSourceInstance } = await import('../dataSource');
      const dataSource = getDataSourceInstance();
      // DataSourceがSupabaseDataSourceかどうかを確認
      const dataSourceType = dataSource.constructor.name;
      const isSupabaseDataSource = dataSourceType === 'SupabaseDataSource';
      
      if (isSupabaseDataSource) {
        console.log('🔍 [deleteOrg] 環境変数ではSupabaseが無効ですが、SupabaseDataSourceが検出されました。Supabaseから削除を試みます。');
        try {
          const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
          await deleteDocViaDataSource('organizations', id);
          console.log('✅ [deleteOrg] Supabase経由で削除成功:', id);
          // Supabaseから削除が成功した場合、SQLiteからの削除は不要
          return;
        } catch (supabaseError: any) {
          const supabaseErrorMessage = supabaseError?.message || '';
          // レコードが見つからないエラーの場合は成功として扱う
          if (supabaseErrorMessage.includes('No rows found') || 
              supabaseErrorMessage.includes('PGRST116') ||
              supabaseErrorMessage.includes('Query returned no rows')) {
            console.log('ℹ️ [deleteOrg] Supabaseからは既に削除されています:', id);
            // Supabaseから既に削除されている場合、SQLiteからの削除は不要
            return;
          } else {
            console.warn('⚠️ [deleteOrg] Supabaseからの削除に失敗しました（SQLiteからの削除は続行します）:', supabaseError);
          }
        }
      }
    } catch (dataSourceError: any) {
      // DataSourceが利用できない場合は無視（SQLiteからの削除は続行）
      console.log('ℹ️ [deleteOrg] DataSourceが利用できないため、SQLiteからのみ削除します:', dataSourceError?.message);
    }
    
    // ローカルSQLite使用時はTauriコマンド経由で削除
    
    // 削除前に、該当する組織が存在するか確認
    try {
      try {
        const orgCheck = await callTauriCommand('doc_get', {
          collectionName: 'organizations',
          docId: id,
        });
        console.log('🔍 [deleteOrg] 削除前の組織確認:', {
          id,
          exists: orgCheck?.exists || false,
          data: orgCheck?.data || null,
        });
        
        if (!orgCheck || !orgCheck.exists) {
          console.warn('⚠️ [deleteOrg] 削除対象の組織が存在しません:', id);
          // 組織が存在しない場合は、エラーを投げずに成功として扱う（既に削除されている）
          return;
        }
      } catch (docGetError: any) {
        // doc_getがエラーを返す場合（「Query returned no rows」）は、組織が存在しないことを意味する
        if (docGetError?.message?.includes('Query returned no rows') || 
            docGetError?.message?.includes('ドキュメント取得エラー')) {
          console.warn('⚠️ [deleteOrg] 削除対象の組織が存在しません（doc_getが行を返さない）:', id);
          // 組織が存在しない場合は、エラーを投げずに成功として扱う（既に削除されている）
          return;
        } else {
          // その他のエラーの場合は再スロー
          throw docGetError;
        }
      }
    } catch (checkError: any) {
      console.warn('⚠️ [deleteOrg] 削除前の確認でエラーが発生しました（続行します）:', checkError);
    }
    
    // Tauri環境では直接Tauriコマンドを使用（APIサーバーが起動していない可能性があるため）
    try {
      console.log('🗑️ [deleteOrg] Tauriコマンド経由で削除を試みます');
      await callTauriCommand('delete_org', { id });
      console.log('✅ [deleteOrg] Tauriコマンド経由の削除が成功しました');
      
      // 削除処理は同期的に実行されるため、ポーリングは不要
      // 念のため、削除が完了したことを確認（1回だけ）
      try {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms待機してから確認
        
        const allOrgs = await callTauriCommand('collection_get', {
          collectionName: 'organizations',
        }) as any[];
        
        const orgStillExists = allOrgs?.some((org: any) => {
          const orgId = org.id || org.data?.id;
          return orgId === id;
        }) || false;
        
        if (orgStillExists) {
          console.warn('⚠️ [deleteOrg] 削除後も組織が存在しています。データベースの更新が反映されていない可能性があります。');
          // エラーを投げない（削除処理自体は成功している可能性があるため）
        } else {
          console.log('✅ [deleteOrg] 削除が確認されました。組織はデータベースから削除されています。');
        }
      } catch (verifyError: any) {
        // 削除後の確認で予期しないエラーが発生した場合でも、削除処理自体は成功している可能性がある
        console.warn('⚠️ [deleteOrg] 削除後の確認でエラーが発生しました（削除処理自体は成功している可能性があります）:', verifyError);
        // エラーを再スローしない（削除処理は成功している可能性があるため）
      }
    } catch (error: any) {
      console.error('❌ [deleteOrg] Tauriコマンド経由の削除が失敗しました:', error);
      throw error;
    }
  }
  
  // ChromaDBのコレクションを削除（非同期、エラーは無視）
  (async () => {
    try {
      const { callTauriCommand: chromaCallTauriCommand } = await import('../localFirebase');
      await chromaCallTauriCommand('chromadb_delete_organization_collections', {
        organizationId: id,
      });
      console.log(`✅ [deleteOrg] ChromaDBコレクション削除成功: ${id}`);
    } catch (error: any) {
      console.warn(`⚠️ [deleteOrg] ChromaDBコレクション削除エラー（続行します）: ${id}`, error);
    }
  })();
}

/**
 * 組織コンテンツを取得
 */
export async function getOrganizationContent(organizationId: string): Promise<OrganizationContent | null> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    
    // Supabase使用時はDataSource経由で取得
    if (useSupabase) {
      try {
        const { getDataSourceInstance } = await import('../dataSource');
        const dataSource = getDataSourceInstance();
        // テーブル名はnormalizeTableNameで自動的に小文字に変換される
        // 開発環境でのみログを出力
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [getOrganizationContent] Supabase経由で取得を試みます:', { organizationId, tableName: 'organizationContents' });
        }
        const data = await dataSource.doc_get('organizationContents', organizationId);
        if (process.env.NODE_ENV === 'development' && data) {
          console.log('📖 [getOrganizationContent] Supabaseから取得したデータ:', data);
        }
        if (data) {
          return {
            organizationId: data.organizationId || data.organizationid || organizationId,
            introduction: data.introduction || '',
            focusAreas: data.focusAreas || data.focusareas || '',
            meetingNotes: data.meetingNotes || data.meetingnotes || '',
            createdAt: data.createdAt || data.createdat,
            updatedAt: data.updatedAt || data.updatedat,
          } as OrganizationContent;
        }
        // dataがnullの場合は、406エラーやレコードが見つからない場合
        // doc_get内で既にエラーハンドリングされているので、ここではnullを返すだけ
        // 開発環境でのみログを出力
        if (process.env.NODE_ENV === 'development') {
          console.log('📖 [getOrganizationContent] データが見つかりませんでした（新規作成またはアクセス不可）');
        }
        return null;
      } catch (error: any) {
        console.error('❌ [getOrganizationContent] Supabase取得エラー:', {
          error,
          errorMessage: error?.message,
          errorCode: error?.code,
          errorDetails: error?.details,
          errorHint: error?.hint,
          organizationId,
        });
        // テーブルが存在しない場合や406エラーの場合はnullを返す（エラーをスローしない）
        // ただし、doc_get内で既に406エラーは処理されているので、ここに到達することは稀
        if (error?.code === 'PGRST205' || 
            error?.code === '406' ||
            error?.message?.includes('Could not find the table') ||
            error?.message?.includes('Not Acceptable')) {
          console.warn('⚠️ [getOrganizationContent] テーブルが見つかりませんまたはアクセス不可。新規作成として扱います。');
          return null;
        }
        // その他のエラーの場合はフォールバック
        console.warn('⚠️ [getOrganizationContent] Supabase取得に失敗、Firestoreにフォールバック:', error);
      }
    }
    
    // ローカルSQLite使用時またはフォールバック時はFirestore経由
    const docRef = doc(null, 'organizationContents', organizationId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as OrganizationContent;
    }
    return null;
  } catch (error) {
    console.error('組織コンテンツの取得に失敗しました:', error);
    return null;
  }
}

/**
 * 組織コンテンツを保存
 */
export async function saveOrganizationContent(
  organizationId: string,
  content: Partial<Omit<OrganizationContent, 'organizationId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`💾 [saveOrganizationContent] 開始（${useSupabase ? 'Supabase' : 'SQLite'}経由）:`, { organizationId, content });
    
    // Supabase使用時はDataSource経由で保存
    if (useSupabase) {
      try {
        const { getDocViaDataSource, setDocViaDataSource } = await import('../dataSourceAdapter');
        
        // 既存データを取得
        let existingData: any = null;
        try {
          existingData = await getDocViaDataSource('organizationcontents', organizationId);
          if (existingData) {
            console.log('📖 [saveOrganizationContent] 既存データを取得:', existingData);
          } else {
            console.log('📝 [saveOrganizationContent] 新規作成');
          }
        } catch (getError: any) {
          console.warn('⚠️ [saveOrganizationContent] 既存データ取得エラー（続行します）:', getError);
        }
        
        const now = new Date().toISOString();
        let data: any;
        
        if (existingData) {
          // 既存データを取得してマージ
          data = {
            id: organizationId,
            organizationId,
            introduction: content.introduction !== undefined ? content.introduction : existingData.introduction || '',
            focusAreas: content.focusAreas !== undefined ? content.focusAreas : existingData.focusAreas || '',
            meetingNotes: content.meetingNotes !== undefined ? content.meetingNotes : existingData.meetingNotes || '',
            createdAt: existingData.createdAt || now,
            updatedAt: now,
          };
        } else {
          // 新規作成
          data = {
            id: organizationId,
            organizationId,
            introduction: content.introduction || '',
            focusAreas: content.focusAreas || '',
            meetingNotes: content.meetingNotes || '',
            createdAt: now,
            updatedAt: now,
          };
        }
        
        console.log('💾 [saveOrganizationContent] Supabaseに保存するデータ:', data);
        
        // テーブル名はnormalizeTableNameで自動的に小文字に変換される
        await setDocViaDataSource('organizationContents', organizationId, data);
        console.log('✅ [saveOrganizationContent] Supabase経由で組織コンテンツを保存しました:', organizationId);
      } catch (error: any) {
        console.error('❌ [saveOrganizationContent] Supabase経由での保存に失敗しました:', error);
        throw error;
      }
    } else {
      // ローカルSQLite使用時はFirestore経由
      const docRef = doc(null, 'organizationContents', organizationId);
      
      // 既存データを取得
      let existingData: OrganizationContent | null = null;
      try {
        const existingDoc = await getDoc(docRef);
        if (existingDoc.exists()) {
          existingData = existingDoc.data() as OrganizationContent;
          console.log('📖 [saveOrganizationContent] 既存データを取得:', existingData);
        } else {
          console.log('📝 [saveOrganizationContent] 新規作成');
        }
      } catch (getError: any) {
        console.warn('⚠️ [saveOrganizationContent] 既存データ取得エラー（続行します）:', getError);
      }
      
      let data: any;
      
      if (existingData) {
        // 既存データを取得してマージ
        data = {
          ...existingData,
          ...content,
          organizationId, // organizationIdを確実に設定
          updatedAt: serverTimestamp(),
        };
        // createdAtは既存のものを保持
        if (existingData.createdAt) {
          data.createdAt = existingData.createdAt;
        }
      } else {
        // 新規作成
        data = {
          id: organizationId,
          organizationId,
          introduction: content.introduction || '',
          focusAreas: content.focusAreas || '',
          meetingNotes: content.meetingNotes || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
      }
      
      console.log('💾 [saveOrganizationContent] Firestoreに保存するデータ:', data);
      
      await setDoc(docRef, data);
      console.log('✅ [saveOrganizationContent] Firestore経由で組織コンテンツを保存しました:', organizationId);
    }
  } catch (error: any) {
    console.error('❌ [saveOrganizationContent] 組織コンテンツの保存に失敗しました:', error);
    console.error('❌ [saveOrganizationContent] エラー詳細:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      error: error,
    });
    throw error;
  }
}

