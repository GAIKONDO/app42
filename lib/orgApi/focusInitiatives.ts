import { doc, getDoc, setDoc } from '../firestore';
import type { FocusInitiative } from './types';
import { generateUniqueId, saveInitiativeToJson, loadInitiativeFromJson } from './utils';

/**
 * 注力施策を取得
 */
export async function getFocusInitiatives(organizationId: string): Promise<FocusInitiative[]> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('📖 [getFocusInitiatives] 開始（Supabaseから取得）:', { organizationId });
    
    try {
        // パフォーマンス最適化: organizationIdでフィルタリングしてから取得
        const { getDataSourceInstance } = await import('../dataSource');
        const dataSource = getDataSourceInstance();
        
        // organizationIdでフィルタリング（クライアント側でのフィルタリングを回避）
        // focusInitiativesテーブルでは"organizationId"（引用符付き）が使用されているため、organizationId（キャメルケース）を使用
        // ただし、createdAt/updatedAtは引用符なしのため、createdat（小文字）を使用
        const result = await dataSource.collection_get('focusInitiatives', {
          filters: [
            { field: 'organizationId', operator: 'eq', value: organizationId }
          ],
          orderBy: 'createdat',
          orderDirection: 'desc'
        });
        
        // Supabaseから取得したデータは既に配列形式でフィルタリング済み
        const allInitiatives = Array.isArray(result) ? result : [];
        console.log('📖 [getFocusInitiatives] Supabaseから取得（フィルタリング済み）:', allInitiatives.length, '件');
        
        const parseJsonArray = (value: any): string[] => {
          if (Array.isArray(value)) return value;
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              return [];
            }
          }
          return [];
        };
        
        // 既にフィルタリングされているので、そのままマッピング
        const filtered = allInitiatives
          .map((item: any) => {
            // Supabaseから取得したデータは直接オブジェクト形式
            const data = item;
            
            // 日付の変換
            let createdAt: any = null;
            let updatedAt: any = null;
            
            if (data.createdAt) {
              if (data.createdAt.seconds) {
                createdAt = new Date(data.createdAt.seconds * 1000).toISOString();
              } else if (typeof data.createdAt === 'string') {
                createdAt = data.createdAt;
              }
            }
            
            if (data.updatedAt) {
              if (data.updatedAt.seconds) {
                updatedAt = new Date(data.updatedAt.seconds * 1000).toISOString();
              } else if (typeof data.updatedAt === 'string') {
                updatedAt = data.updatedAt;
              }
            }
            
            // PostgreSQLでは引用符なしの識別子は小文字に変換されるため、
            // organizationIdとcompanyIdはorganizationidとcompanyidとして保存されています
            return {
              id: data.id,
              organizationId: data.organizationid || data.organizationId || null, // 小文字とキャメルケースの両方をサポート
              companyId: data.companyid || data.companyId || null, // 小文字とキャメルケースの両方をサポート
              title: data.title || '',
              description: data.description || '',
              content: data.content || '',
              themeIds: parseJsonArray(data.themeIds) || [],
              topicIds: parseJsonArray(data.topicIds) || [],
              createdAt: createdAt,
              updatedAt: updatedAt,
            } as FocusInitiative;
          });
        
        console.log('📖 [getFocusInitiatives] マッピング後:', filtered.length, '件');
        
        // 既にソートされているので、そのまま返す
        const sorted = filtered;
        
        console.log('📖 [getFocusInitiatives] 最終結果（Supabaseから取得）:', sorted.length, '件');
        return sorted;
      } catch (error: any) {
        console.error('❌ [getFocusInitiatives] Supabase取得エラー:', error);
        throw error;
      }
  } catch (error: any) {
    console.error('❌ [getFocusInitiatives] エラー:', error);
    throw error;
  }
}

/**
 * 特性要因図IDで注力施策を取得
 */
export async function getFocusInitiativeByCauseEffectDiagramId(causeEffectDiagramId: string): Promise<FocusInitiative | null> {
  try {
    console.log('📖 [getFocusInitiativeByCauseEffectDiagramId] 開始:', { causeEffectDiagramId });
    
    // Supabase専用（環境変数チェック不要）
    const { queryGetViaDataSource } = await import('../dataSourceAdapter');
    
    try {
      const results = await queryGetViaDataSource('focusInitiatives', {
        filters: [{ field: 'causeEffectDiagramId', operator: 'eq', value: causeEffectDiagramId }]
      });
      
      const found = results && results.length > 0 ? results[0] : null;
      
      if (found) {
        const data = found;
        
        const parseJsonArray = (value: any): string[] => {
          if (Array.isArray(value)) {
            return value;
          }
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              console.warn('⚠️ [getFocusInitiativeByCauseEffectDiagramId] JSONパースエラー:', e, 'value:', value);
              return [];
            }
          }
          return [];
        };
        
        const initiative: FocusInitiative = {
          id: data.id || found.id,
          organizationId: data.organizationId,
          title: data.title || '',
          description: data.description || '',
          content: data.content || '',
          assignee: data.assignee || '',
          method: data.method || [],
          methodOther: data.methodOther || '',
          methodDetails: data.methodDetails || {},
          means: data.means || [],
          meansOther: data.meansOther || '',
          objective: data.objective || '',
          considerationPeriod: data.considerationPeriod || '',
          executionPeriod: data.executionPeriod || '',
          monetizationPeriod: data.monetizationPeriod || '',
          relatedOrganizations: data.relatedOrganizations || [],
          relatedGroupCompanies: data.relatedGroupCompanies || [],
          monetizationDiagram: data.monetizationDiagram || '',
          relationDiagram: data.relationDiagram || '',
          causeEffectDiagramId: data.causeEffectDiagramId,
          themeId: data.themeId,
          themeIds: parseJsonArray(data.themeIds) || [],
          topicIds: parseJsonArray(data.topicIds) || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        
        console.log('✅ [getFocusInitiativeByCauseEffectDiagramId] 見つかりました:', initiative.id);
        return initiative;
      }
      
      console.warn('⚠️ [getFocusInitiativeByCauseEffectDiagramId] 見つかりませんでした');
      return null;
    } catch (error: any) {
      console.error('❌ [getFocusInitiativeByCauseEffectDiagramId] エラー:', error);
      return null;
    }
  } catch (error: any) {
    console.error('❌ [getFocusInitiativeByCauseEffectDiagramId] エラー:', error);
    return null;
  }
}

/**
 * 注力施策を取得（ID指定）
 */
export async function getFocusInitiativeById(initiativeId: string): Promise<FocusInitiative | null> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('📖 [getFocusInitiativeById] 開始:', { initiativeId });
    
    const { getDataSourceInstance } = await import('../dataSource');
    const dataSource = getDataSourceInstance();
    
    // Supabaseから直接取得（テーブル名はnormalizeTableNameで小文字に変換される）
    console.log('🔍 [getFocusInitiativeById] Supabaseから取得を試みます:', { initiativeId });
    const data = await dataSource.doc_get('focusInitiatives', initiativeId);
    
    if (data) {
      console.log('✅ [getFocusInitiativeById] Supabaseから取得成功:', { initiativeId, hasData: !!data });
      
      const parseJsonArray = (value: any): string[] => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            return [];
          }
        }
        return [];
      };
      
      // PostgreSQLでは引用符なしの識別子は小文字に変換されるため、両方をチェック
      const initiative: FocusInitiative = {
        id: data.id || initiativeId,
        organizationId: data.organizationid || data.organizationId || null,
        companyId: data.companyid || data.companyId || null,
        title: data.title || '',
        description: data.description || '',
        content: data.content || '',
        assignee: data.assignee || '',
        method: parseJsonArray(data.method),
        methodOther: data.methodOther || '',
        methodDetails: data.methodDetails ? (typeof data.methodDetails === 'string' ? JSON.parse(data.methodDetails) : data.methodDetails) : {},
        means: parseJsonArray(data.means),
        meansOther: data.meansOther || '',
        objective: data.objective || '',
        considerationPeriod: data.considerationPeriod || '',
        executionPeriod: data.executionPeriod || '',
        monetizationPeriod: data.monetizationPeriod || '',
        relatedOrganizations: parseJsonArray(data.relatedOrganizations),
        relatedGroupCompanies: parseJsonArray(data.relatedGroupCompanies),
        monetizationDiagram: data.monetizationDiagram || '',
        relationDiagram: data.relationDiagram || '',
        causeEffectDiagramId: data.causeEffectDiagramId,
        themeId: data.themeId,
        themeIds: parseJsonArray(data.themeIds) || (data.themeId ? [data.themeId] : []),
        topicIds: parseJsonArray(data.topicIds) || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      
      return initiative;
    }
    
    console.warn('📖 [getFocusInitiativeById] Supabaseからデータが見つかりませんでした:', { initiativeId });
    return null;
  } catch (error: any) {
    console.error('❌ [getFocusInitiativeById] Supabase取得エラー:', {
      error,
      errorMessage: error?.message,
      errorCode: error?.code,
      initiativeId,
    });
    return null;
  }
}

/**
 * 注力施策を保存
 */
export async function saveFocusInitiative(initiative: Partial<FocusInitiative>): Promise<string> {
  try {
    // Supabase専用（環境変数チェック不要）
    const initiativeId = initiative.id || generateUniqueId();
    console.log('💾 [saveFocusInitiative] 開始（Supabase経由）:', { 
      initiativeId, 
      organizationId: initiative.organizationId,
      title: initiative.title,
      hasId: !!initiative.id,
    });
    
    if (!initiative.organizationId && !initiative.companyId) {
      throw new Error('organizationIdまたはcompanyIdが指定されていません');
    }
    
    if (initiative.organizationId) {
      try {
        const { getDocViaDataSource } = await import('../dataSourceAdapter');
        const orgData = await getDocViaDataSource('organizations', initiative.organizationId);
        if (!orgData) {
          throw new Error(`組織ID "${initiative.organizationId}" がorganizationsテーブルに存在しません`);
        }
        console.log('✅ [saveFocusInitiative] 組織IDの存在確認成功（Supabase）:', initiative.organizationId);
      } catch (orgCheckError: any) {
        const errorMessage = orgCheckError?.message || String(orgCheckError || '');
        if (errorMessage.includes('存在しません')) {
          throw new Error(`組織ID "${initiative.organizationId}" がorganizationsテーブルに存在しません。組織一覧ページから正しい組織を選択してください。`);
        }
        console.warn('⚠️ [saveFocusInitiative] 組織IDの存在確認でエラー（続行します）:', errorMessage);
      }
    }
    
    // 事業会社IDの存在確認は削除（companiesテーブルは削除済み、Supabase専用のため）
    // 必要に応じて、Supabaseのcompaniesテーブルで確認する場合は以下を使用:
    // const { getDocViaDataSource } = await import('../dataSourceAdapter');
    // const company = await getDocViaDataSource('companies', initiative.companyId);
    // if (!company) {
    //   throw new Error(`事業会社ID "${initiative.companyId}" が存在しません`);
    // }
    
    let existingData: FocusInitiative | null = null;
    let isNew = true;
    
    // 既存ドキュメントの確認
    try {
      const { getDocViaDataSource } = await import('../dataSourceAdapter');
      existingData = await getDocViaDataSource('focusInitiatives', initiativeId);
      if (existingData) {
        isNew = false;
        console.log('💾 [saveFocusInitiative] 既存ドキュメント確認: 存在します（Supabase）', { 
          id: existingData.id,
          title: existingData.title
        });
      } else {
        console.log('💾 [saveFocusInitiative] 既存ドキュメント確認: 存在しません（新規作成、Supabase）');
      }
    } catch (getDocError: any) {
      const errorMessage = getDocError?.message || String(getDocError || '');
      const isNoRowsError = errorMessage.includes('no rows') || 
                           errorMessage.includes('not found') ||
                           errorMessage.includes('存在しません');
      
      if (isNoRowsError) {
        console.log('💾 [saveFocusInitiative] 既存ドキュメント確認: 存在しません（新規作成） - エラーは無視します', {
          errorMessage
        });
        isNew = true;
      } else {
        console.warn('⚠️ [saveFocusInitiative] 既存ドキュメント確認エラー（続行します）:', {
          error: getDocError,
          errorMessage,
        });
        isNew = true; // エラーが発生しても新規作成として続行
      }
    }
    
    const now = new Date().toISOString();
    
    const data: any = {
      id: initiativeId,
      organizationId: initiative.organizationId || null,
      companyId: initiative.companyId || null,
      title: initiative.title || '',
      description: initiative.description || '',
      content: initiative.content || '',
      assignee: initiative.assignee || '',
      method: initiative.method || [],
      methodOther: initiative.methodOther || '',
      methodDetails: initiative.methodDetails || {},
      means: initiative.means || [],
      meansOther: initiative.meansOther || '',
      objective: initiative.objective || '',
      considerationPeriod: initiative.considerationPeriod || '',
      executionPeriod: initiative.executionPeriod || '',
      monetizationPeriod: initiative.monetizationPeriod || '',
      relatedOrganizations: initiative.relatedOrganizations || [],
      relatedGroupCompanies: initiative.relatedGroupCompanies || [],
      monetizationDiagram: initiative.monetizationDiagram || '',
      relationDiagram: initiative.relationDiagram || '',
      themeId: initiative.themeId || '',
      themeIds: Array.isArray(initiative.themeIds) ? initiative.themeIds : (initiative.themeIds ? [initiative.themeIds] : []),
      topicIds: Array.isArray(initiative.topicIds) ? initiative.topicIds : (initiative.topicIds ? [initiative.topicIds] : []),
      updatedAt: now,
    };
    
    if (initiative.causeEffectDiagramId) {
      data.causeEffectDiagramId = initiative.causeEffectDiagramId;
    } else if (existingData?.causeEffectDiagramId) {
      data.causeEffectDiagramId = existingData.causeEffectDiagramId;
    } else {
      data.causeEffectDiagramId = `ced_${generateUniqueId()}`;
    }
    
    if (isNew) {
      data.createdAt = now;
      console.log('📝 [saveFocusInitiative] 新規作成:', initiativeId, { data });
    } else {
      if (existingData?.createdAt) {
        data.createdAt = typeof existingData.createdAt === 'string' 
          ? existingData.createdAt 
          : (existingData.createdAt.toMillis ? new Date(existingData.createdAt.toMillis()).toISOString() : now);
      } else {
        data.createdAt = now;
      }
      console.log('🔄 [saveFocusInitiative] 更新:', initiativeId, { data });
    }
    
    console.log('💾 [saveFocusInitiative] 保存処理開始:', { 
      collectionName: 'focusInitiatives', 
      docId: initiativeId, 
      dataKeys: Object.keys(data),
      topicIds: data.topicIds,
      themeIds: data.themeIds,
    });
    
    // Supabase専用（DataSource経由で保存）
    try {
      const { getDataSourceInstance } = await import('../dataSource');
      const dataSource = getDataSourceInstance();
      
      // Supabase用のデータを準備
      // 注意: create_schema.sqlでorganizationIdとcompanyIdが引用符なしで定義されているため、
      // PostgreSQLではorganizationidとcompanyid（小文字）として保存されています
      const supabaseData: any = {
        id: initiativeId,
        organizationid: data.organizationId || null, // 小文字に変換
        companyid: data.companyId || null, // 小文字に変換
        title: data.title || '',
        description: data.description || null,
        content: data.content || null,
        assignee: data.assignee || null,
        methodOther: data.methodOther || null,
        meansOther: data.meansOther || null,
        objective: data.objective || null,
        considerationPeriod: data.considerationPeriod || null,
        executionPeriod: data.executionPeriod || null,
        monetizationPeriod: data.monetizationPeriod || null,
        monetizationDiagram: data.monetizationDiagram || null,
        relationDiagram: data.relationDiagram || null,
        causeEffectDiagramId: data.causeEffectDiagramId || null,
        themeId: data.themeId || null,
        updatedAt: data.updatedAt,
        createdAt: data.createdAt,
      };
      
      // JSON配列形式のフィールドを文字列化
      if (Array.isArray(data.method) && data.method.length > 0) {
        supabaseData.method = JSON.stringify(data.method);
      }
      if (data.methodDetails && Object.keys(data.methodDetails).length > 0) {
        supabaseData.methodDetails = JSON.stringify(data.methodDetails);
      }
      if (Array.isArray(data.means) && data.means.length > 0) {
        supabaseData.means = JSON.stringify(data.means);
      }
      if (Array.isArray(data.themeIds) && data.themeIds.length > 0) {
        supabaseData.themeIds = JSON.stringify(data.themeIds);
      }
      if (Array.isArray(data.topicIds) && data.topicIds.length > 0) {
        supabaseData.topicIds = JSON.stringify(data.topicIds);
      }
      if (Array.isArray(data.relatedOrganizations) && data.relatedOrganizations.length > 0) {
        supabaseData.relatedOrganizations = JSON.stringify(data.relatedOrganizations);
      }
      if (Array.isArray(data.relatedGroupCompanies) && data.relatedGroupCompanies.length > 0) {
        supabaseData.relatedGroupCompanies = JSON.stringify(data.relatedGroupCompanies);
      }
      
      // organizationIdが存在するか確認（外部キー制約のため）
      if (supabaseData.organizationid) {
        const parentOrg = await dataSource.doc_get('organizations', supabaseData.organizationid);
        if (!parentOrg) {
          throw new Error(`組織ID "${supabaseData.organizationid}" がorganizationsテーブルに存在しません`);
        }
      }
      
      // SupabaseDataSource経由で保存
      await dataSource.doc_set('focusInitiatives', initiativeId, supabaseData);
      console.log('✅ [saveFocusInitiative] Supabase経由で保存成功:', initiativeId, {
        title: supabaseData.title,
        organizationId: supabaseData.organizationid,
        companyId: supabaseData.companyid,
      });
    } catch (saveError: any) {
      console.error('❌ [saveFocusInitiative] Supabase保存エラー:', {
        error: saveError,
        errorMessage: saveError?.message,
        errorCode: saveError?.code,
        initiativeId,
        organizationId: data.organizationId,
      });
      throw saveError;
    }
    
    try {
      // Supabase専用（環境変数チェック不要）
      const { getDocViaDataSource } = await import('../dataSourceAdapter');
      const verifyResult = await getDocViaDataSource('focusInitiatives', initiativeId);
      const verifyData = (verifyResult && verifyResult.data) ? verifyResult.data : verifyResult;
      console.log('🔍 [saveFocusInitiative] 保存後の確認:', {
        savedTopicIds: verifyData?.topicIds,
        savedThemeIds: verifyData?.themeIds,
        verifyDataKeys: verifyData ? Object.keys(verifyData) : [],
        fullVerifyData: JSON.stringify(verifyData, null, 2),
      });
    } catch (verifyError) {
      console.warn('⚠️ [saveFocusInitiative] 保存後の確認に失敗:', verifyError);
    }
    
    if (data.themeIds && Array.isArray(data.themeIds) && data.themeIds.length > 0) {
      console.log('🔄 [saveFocusInitiative] テーマ側のinitiativeIdsを更新中...', { 
        themeIds: data.themeIds,
        initiativeId,
        existingDataExists: !!existingData,
        existingThemeIds: existingData?.themeIds 
      });
      
      const existingThemeIds = Array.isArray(existingData?.themeIds) ? existingData.themeIds : [];
      const newThemeIds = Array.isArray(data.themeIds) ? data.themeIds.filter((id: any) => id && typeof id === 'string') : [];
      
      const removedThemeIds = existingThemeIds.filter(id => !newThemeIds.includes(id));
      for (const themeId of removedThemeIds) {
        try {
          if (!themeId) continue;
          const themeDocRef = doc(null, 'themes', themeId);
          const themeDoc = await getDoc(themeDocRef);
          if (themeDoc && typeof themeDoc.exists === 'function' && themeDoc.exists()) {
            const themeData = themeDoc.data();
            if (themeData) {
              const updatedInitiativeIds = Array.isArray(themeData.initiativeIds) 
                ? themeData.initiativeIds.filter((id: string) => id !== initiativeId)
                : [];
              
              await setDoc(themeDocRef, {
                ...themeData,
                initiativeIds: updatedInitiativeIds,
                updatedAt: new Date().toISOString(),
              });
              console.log(`✅ [saveFocusInitiative] テーマ「${themeId}」から注力施策IDを削除しました`);
            }
          }
        } catch (error: any) {
          console.warn(`⚠️ [saveFocusInitiative] テーマ「${themeId}」の更新に失敗しました:`, error);
        }
      }
      
      for (const themeId of newThemeIds) {
        try {
          if (!themeId || typeof themeId !== 'string') {
            console.warn(`⚠️ [saveFocusInitiative] 無効なテーマIDをスキップ:`, themeId);
            continue;
          }
          
          console.log(`🔄 [saveFocusInitiative] テーマ「${themeId}」を更新中...`);
          const themeDocRef = doc(null, 'themes', themeId);
          
          if (!themeDocRef) {
            console.warn(`⚠️ [saveFocusInitiative] テーマDocRefの作成に失敗:`, themeId);
            continue;
          }
          
          const themeDoc = await getDoc(themeDocRef);
          
          if (!themeDoc) {
            console.warn(`⚠️ [saveFocusInitiative] テーマドキュメントの取得に失敗:`, themeId);
            continue;
          }
          
          if (typeof themeDoc.exists === 'function' && themeDoc.exists()) {
            const themeData = themeDoc.data();
            if (themeData && typeof themeData === 'object') {
              const existingInitiativeIds = Array.isArray(themeData.initiativeIds) ? themeData.initiativeIds : [];
              
              if (!existingInitiativeIds.includes(initiativeId)) {
                await setDoc(themeDocRef, {
                  ...themeData,
                  initiativeIds: [...existingInitiativeIds, initiativeId],
                  updatedAt: new Date().toISOString(),
                });
                console.log(`✅ [saveFocusInitiative] テーマ「${themeId}」に注力施策IDを追加しました`);
              } else {
                console.log(`ℹ️ [saveFocusInitiative] テーマ「${themeId}」には既に注力施策IDが含まれています`);
              }
            } else {
              console.warn(`⚠️ [saveFocusInitiative] テーマデータが無効です:`, themeId, themeData);
            }
          } else {
            console.warn(`⚠️ [saveFocusInitiative] テーマ「${themeId}」が見つかりません`);
          }
        } catch (error: any) {
          console.error(`❌ [saveFocusInitiative] テーマ「${themeId}」の更新に失敗しました:`, {
            errorMessage: error?.message,
            errorName: error?.name,
            errorStack: error?.stack,
            error: error
          });
        }
      }
    } else if (existingData?.themeIds && Array.isArray(existingData.themeIds) && existingData.themeIds.length > 0) {
      console.log('🔄 [saveFocusInitiative] テーマ関連が削除されました。既存のテーマから注力施策IDを削除中...');
      for (const themeId of existingData.themeIds) {
        try {
          if (!themeId) continue;
          const themeDocRef = doc(null, 'themes', themeId);
          const themeDoc = await getDoc(themeDocRef);
          if (themeDoc && typeof themeDoc.exists === 'function' && themeDoc.exists()) {
            const themeData = themeDoc.data();
            if (themeData) {
              const updatedInitiativeIds = Array.isArray(themeData.initiativeIds) 
                ? themeData.initiativeIds.filter((id: string) => id !== initiativeId)
                : [];
              
              await setDoc(themeDocRef, {
                ...themeData,
                initiativeIds: updatedInitiativeIds,
                updatedAt: new Date().toISOString(),
              });
              console.log(`✅ [saveFocusInitiative] テーマ「${themeId}」から注力施策IDを削除しました`);
            }
          }
        } catch (error: any) {
          console.warn(`⚠️ [saveFocusInitiative] テーマ「${themeId}」の更新に失敗しました:`, error);
        }
      }
    }
    
    try {
      const fullInitiative: FocusInitiative = {
        id: initiativeId,
        organizationId: data.organizationId,
        companyId: data.companyId,
        title: data.title,
        description: data.description,
        content: data.content,
        assignee: data.assignee,
        method: data.method,
        methodOther: data.methodOther,
        methodDetails: data.methodDetails,
        means: data.means,
        meansOther: data.meansOther,
        objective: data.objective,
        considerationPeriod: data.considerationPeriod,
        executionPeriod: data.executionPeriod,
        monetizationPeriod: data.monetizationPeriod,
        relatedOrganizations: data.relatedOrganizations,
        relatedGroupCompanies: data.relatedGroupCompanies,
        monetizationDiagram: data.monetizationDiagram,
        relationDiagram: data.relationDiagram,
        causeEffectDiagramId: data.causeEffectDiagramId,
        themeId: data.themeId,
        themeIds: data.themeIds,
        topicIds: data.topicIds,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      
      await saveInitiativeToJson(fullInitiative);
      console.log('✅ [saveFocusInitiative] JSONファイル保存成功:', initiativeId);
    } catch (jsonError: any) {
      console.warn('⚠️ [saveFocusInitiative] JSONファイルの保存に失敗しました（データベースへの保存は成功）:', jsonError);
    }
    
    return initiativeId;
  } catch (error: any) {
    console.error('❌ [saveFocusInitiative] 保存失敗:', {
      errorMessage: error?.message,
      errorName: error?.name,
      errorStack: error?.stack,
      error: error,
      initiativeId: initiative.id || '未生成',
      organizationId: initiative.organizationId,
    });
    throw error;
  }
}

/**
 * 注力施策を削除
 */
export async function deleteFocusInitiative(initiativeId: string): Promise<void> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('🗑️ [deleteFocusInitiative] 開始（Supabase経由）:', {
      initiativeId,
    });
    
    const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
    await deleteDocViaDataSource('focusInitiatives', initiativeId);
    console.log('✅ [deleteFocusInitiative] Supabase経由で削除成功:', initiativeId);
  } catch (error: any) {
    const errorMessage = error?.message || String(error || '');
    console.error('❌ [deleteFocusInitiative] 削除失敗:', {
      initiativeId,
      errorMessage: error?.message,
      errorName: error?.name,
      errorCode: error?.errorCode,
      errorStack: error?.stack,
      error: error,
    });
    throw new Error(`注力施策の削除に失敗しました: ${errorMessage || '不明なエラー'}`);
  }
}

