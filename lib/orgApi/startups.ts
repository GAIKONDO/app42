import { doc, getDoc, setDoc } from '../firestore';
import type { Startup } from './types';
import { generateUniqueStartupId } from './utils';

/**
 * スタートアップを取得
 */
export async function getStartups(organizationId: string): Promise<Startup[]> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('📖 [getStartups] 開始（Supabaseから取得）:', { organizationId });
    
    try {
        // パフォーマンス最適化: organizationIdでフィルタリングしてから取得
        const { getDataSourceInstance } = await import('../dataSource');
        const dataSource = getDataSourceInstance();
        
        // organizationIdでフィルタリング（クライアント側でのフィルタリングを回避）
        // startupsテーブルでは"createdAt"（引用符付き）が使用されているため、createdAt（キャメルケース）を使用可能
        const result = await dataSource.collection_get('startups', {
          filters: [
            { field: 'organizationId', operator: 'eq', value: organizationId }
          ],
          orderBy: 'createdAt',
          orderDirection: 'desc'
        });
        
        // Supabaseから取得したデータは既に配列形式でフィルタリング済み
        const allStartups = Array.isArray(result) ? result : [];
        console.log('📖 [getStartups] Supabaseから取得（フィルタリング済み）:', allStartups.length, '件');
        
        // JSON配列をパースするヘルパー関数
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
        const filtered = allStartups
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
            
            return {
              id: data.id,
              organizationId: data.organizationId,
              companyId: data.companyId,
              title: data.title || '',
              description: data.description || '',
              content: data.content || '',
              assignee: parseJsonArray(data.assignee),
              method: parseJsonArray(data.method),
              methodOther: data.methodOther,
              methodDetails: data.methodDetails ? (typeof data.methodDetails === 'string' ? JSON.parse(data.methodDetails) : data.methodDetails) : {},
              means: parseJsonArray(data.means),
              meansOther: data.meansOther,
              categoryIds: parseJsonArray(data.categoryIds),
              status: data.status,
              agencyContractMonth: data.agencyContractMonth,
              engagementLevel: data.engagementLevel,
              bizDevPhase: data.bizDevPhase,
              relatedVCS: parseJsonArray(data.relatedVCS),
              responsibleDepartments: parseJsonArray(data.responsibleDepartments),
              hpUrl: data.hpUrl,
              asanaUrl: data.asanaUrl,
              boxUrl: data.boxUrl,
              objective: data.objective,
              evaluation: data.evaluation,
              evaluationChart: data.evaluationChart ? (typeof data.evaluationChart === 'string' ? JSON.parse(data.evaluationChart) : data.evaluationChart) : null,
              evaluationChartSnapshots: parseJsonArray(data.evaluationChartSnapshots),
              considerationPeriod: data.considerationPeriod,
              executionPeriod: data.executionPeriod,
              monetizationPeriod: data.monetizationPeriod,
              monetizationRenewalNotRequired: data.monetizationRenewalNotRequired === 1 ? true : false,
              relatedOrganizations: parseJsonArray(data.relatedOrganizations),
              relatedGroupCompanies: parseJsonArray(data.relatedGroupCompanies),
              monetizationDiagram: data.monetizationDiagram,
              monetizationDiagramId: data.monetizationDiagramId,
              relationDiagram: data.relationDiagram,
              relationDiagramId: data.relationDiagramId,
              causeEffectDiagramId: data.causeEffectDiagramId,
              themeId: data.themeId,
              themeIds: parseJsonArray(data.themeIds),
              topicIds: parseJsonArray(data.topicIds),
              competitorComparison: data.competitorComparison ? (typeof data.competitorComparison === 'string' ? JSON.parse(data.competitorComparison) : data.competitorComparison) : undefined,
              deepSearch: data.deepSearch ? (typeof data.deepSearch === 'string' ? JSON.parse(data.deepSearch) : data.deepSearch) : undefined,
              isFavorite: data.isFavorite === 1 || data.isFavorite === true,
              createdAt: createdAt,
              updatedAt: updatedAt,
            } as Startup;
          });
      
      console.log('📖 [getStartups] マッピング後:', {
        count: filtered.length,
        ids: filtered.map(s => s.id),
      });
      
      // 既にソートされているので、そのまま返す
      const sorted = filtered;
      
        console.log('📖 [getStartups] 最終結果（Supabaseから取得）:', {
          count: sorted.length,
          startups: sorted.map(s => ({ id: s.id, title: s.title, organizationId: s.organizationId })),
        });
        return sorted;
      } catch (error: any) {
        console.error('❌ [getStartups] Supabase取得エラー:', error);
        throw error;
      }
  } catch (error: any) {
    console.error('❌ [getStartups] エラー:', {
      error,
      errorMessage: error?.message,
      errorStack: error?.stack,
      organizationId,
    });
    throw error;
  }
}

/**
 * スタートアップを保存
 */
export async function saveStartup(startup: Partial<Startup>): Promise<string> {
  try {
    const startupId = startup.id || generateUniqueStartupId();
    console.log('💾 [saveStartup] 開始:', { startupId, organizationId: startup.organizationId, title: startup.title });
    
    if (startup.organizationId) {
      try {
        const orgDocRef = doc(null, 'organizations', startup.organizationId);
        const orgDoc = await getDoc(orgDocRef);
        if (!orgDoc.exists()) {
          throw new Error(`組織ID "${startup.organizationId}" がorganizationsテーブルに存在しません`);
        }
        console.log('✅ [saveStartup] 組織IDの存在確認成功:', startup.organizationId);
      } catch (orgCheckError: any) {
        const errorMessage = orgCheckError?.message || String(orgCheckError || '');
        if (errorMessage.includes('存在しません')) {
          throw new Error(`組織ID "${startup.organizationId}" がorganizationsテーブルに存在しません。組織一覧ページから正しい組織を選択してください。`);
        }
        console.warn('⚠️ [saveStartup] 組織IDの存在確認でエラー（続行します）:', errorMessage);
      }
    } else {
      throw new Error('organizationIdが指定されていません');
    }
    
    const docRef = doc(null, 'startups', startupId);
    const now = new Date().toISOString();
    
    const data: any = {
      id: startupId,
      organizationId: startup.organizationId!,
      title: startup.title || '',
      description: startup.description || '',
      content: startup.content || '',
      assignee: startup.assignee || '',
      method: startup.method || [],
      methodOther: startup.methodOther || '',
      methodDetails: startup.methodDetails || {},
      means: startup.means || [],
      meansOther: startup.meansOther || '',
      objective: startup.objective || '',
      evaluation: startup.evaluation || '',
      evaluationChart: startup.evaluationChart || null,
      evaluationChartSnapshots: startup.evaluationChartSnapshots || [],
      considerationPeriod: startup.considerationPeriod || '',
      executionPeriod: startup.executionPeriod || '',
      monetizationPeriod: startup.monetizationPeriod || '',
      monetizationRenewalNotRequired: (() => {
        const value = startup.monetizationRenewalNotRequired;
        // データベースから読み込んだ値が1の場合はtrue、0の場合はfalseに変換
        if (value === 1) {
          return true;
        } else if (value === 0) {
          return false;
        } else if (value === true) {
          return true;
        } else if (value === false) {
          return false;
        } else {
          return false;
        }
      })(),
      relatedOrganizations: startup.relatedOrganizations || [],
      relatedGroupCompanies: startup.relatedGroupCompanies || [],
      monetizationDiagram: startup.monetizationDiagram || '',
      monetizationDiagramId: startup.monetizationDiagramId || '',
      relationDiagram: startup.relationDiagram || '',
      relationDiagramId: startup.relationDiagramId || '',
      causeEffectDiagramId: startup.causeEffectDiagramId || '',
      themeId: startup.themeId || '',
      themeIds: Array.isArray(startup.themeIds) ? startup.themeIds : (startup.themeIds ? [startup.themeIds] : []),
      topicIds: Array.isArray(startup.topicIds) ? startup.topicIds : (startup.topicIds ? [startup.topicIds] : []),
      categoryIds: Array.isArray(startup.categoryIds) ? startup.categoryIds : [],
      relatedVCS: Array.isArray(startup.relatedVCS) ? startup.relatedVCS : [],
      responsibleDepartments: Array.isArray(startup.responsibleDepartments) ? startup.responsibleDepartments : [],
      status: startup.status || undefined,
      agencyContractMonth: startup.agencyContractMonth || undefined,
      engagementLevel: startup.engagementLevel || undefined,
      bizDevPhase: startup.bizDevPhase || undefined,
      hpUrl: startup.hpUrl || undefined,
      asanaUrl: startup.asanaUrl || undefined,
      boxUrl: startup.boxUrl || undefined,
      competitorComparison: startup.competitorComparison || undefined,
      deepSearch: startup.deepSearch || undefined,
      updatedAt: now,
    };
    
    let existingData: Startup | null = null;
    try {
      const existingDoc = await getDoc(docRef);
      if (existingDoc.exists()) {
        existingData = existingDoc.data() as Startup;
        if (existingData?.createdAt) {
          data.createdAt = typeof existingData.createdAt === 'string' 
            ? existingData.createdAt 
            : (existingData.createdAt.toMillis ? new Date(existingData.createdAt.toMillis()).toISOString() : now);
        } else {
          data.createdAt = now;
        }
        if (!data.evaluationChart && existingData?.evaluationChart) {
          if (typeof existingData.evaluationChart === 'string') {
            try {
              data.evaluationChart = JSON.parse(existingData.evaluationChart);
              console.log('💾 [saveStartup] 既存のevaluationChartを保持（JSON文字列からパース）');
            } catch (e) {
              console.warn('⚠️ [saveStartup] 既存のevaluationChartのパースに失敗:', e);
              data.evaluationChart = existingData.evaluationChart as any;
            }
          } else {
            data.evaluationChart = existingData.evaluationChart;
            console.log('💾 [saveStartup] 既存のevaluationChartを保持');
          }
        }
        if ((!data.evaluationChartSnapshots || data.evaluationChartSnapshots.length === 0) && existingData?.evaluationChartSnapshots) {
          if (typeof existingData.evaluationChartSnapshots === 'string') {
            try {
              const parsed = JSON.parse(existingData.evaluationChartSnapshots);
              if (Array.isArray(parsed) && parsed.length > 0) {
                data.evaluationChartSnapshots = parsed;
                console.log('💾 [saveStartup] 既存のevaluationChartSnapshotsを保持（JSON文字列からパース）');
              }
            } catch (e) {
              console.warn('⚠️ [saveStartup] 既存のevaluationChartSnapshotsのパースに失敗:', e);
            }
          } else if (Array.isArray(existingData.evaluationChartSnapshots) && existingData.evaluationChartSnapshots.length > 0) {
            data.evaluationChartSnapshots = existingData.evaluationChartSnapshots;
            console.log('💾 [saveStartup] 既存のevaluationChartSnapshotsを保持');
          }
        }
        console.log('💾 [saveStartup] 既存ドキュメントを更新:', startupId);
      } else {
        data.createdAt = now;
        console.log('💾 [saveStartup] 新規ドキュメントを作成:', startupId);
      }
    } catch (getDocError: any) {
      console.warn('⚠️ [saveStartup] 既存ドキュメント確認エラー（新規作成として続行）:', getDocError?.message || getDocError);
      data.createdAt = now;
    }
    
    console.log('💾 [saveStartup] setDoc呼び出し前:', { 
      collectionName: 'startups', 
      docId: startupId, 
      data: {
        id: data.id,
        organizationId: data.organizationId,
        title: data.title,
        description: data.description ? data.description.substring(0, 50) + '...' : '',
        content: data.content ? data.content.substring(0, 50) + '...' : '',
        hasEvaluationChart: !!data.evaluationChart,
        evaluationChartAxesCount: data.evaluationChart?.axes?.length || 0,
        hasEvaluationChartSnapshots: Array.isArray(data.evaluationChartSnapshots) && data.evaluationChartSnapshots.length > 0,
        evaluationChartSnapshotsCount: Array.isArray(data.evaluationChartSnapshots) ? data.evaluationChartSnapshots.length : 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        allDataKeys: Object.keys(data),
        evaluationChartInData: 'evaluationChart' in data,
        evaluationChartSnapshotsInData: 'evaluationChartSnapshots' in data,
      }
    });
    
    try {
      // Supabase専用（環境変数チェック不要）
      console.log('🔍 [saveStartup] Supabase経由でスタートアップを保存します');
        const { getDataSourceInstance } = await import('../dataSource');
        const dataSource = getDataSourceInstance();
        
        // Supabaseのスキーマに合わせてデータを準備（カラム名は引用符付き）
        const supabaseData: any = {
          id: startupId,
          organizationId: data.organizationId, // Supabaseでは"organizationId"として保存される
          companyId: null, // CHECK制約により、organizationIdとcompanyIdのどちらか一方が必須
          title: data.title || '',
          description: data.description || null,
          content: data.content || null,
          status: data.status || null,
          agencyContractMonth: data.agencyContractMonth || null,
          engagementLevel: data.engagementLevel || null,
          bizDevPhase: data.bizDevPhase || null,
          hpUrl: data.hpUrl || null,
          asanaUrl: data.asanaUrl || null,
          boxUrl: data.boxUrl || null,
          objective: data.objective || null,
          evaluation: data.evaluation || null,
          considerationPeriod: data.considerationPeriod || null,
          executionPeriod: data.executionPeriod || null,
          monetizationPeriod: data.monetizationPeriod || null,
          monetizationRenewalNotRequired: data.monetizationRenewalNotRequired === true ? 1 : 0,
          monetizationDiagram: data.monetizationDiagram || null,
          monetizationDiagramId: data.monetizationDiagramId || null,
          relationDiagram: data.relationDiagram || null,
          relationDiagramId: data.relationDiagramId || null,
          causeEffectDiagramId: data.causeEffectDiagramId || null,
          themeId: data.themeId || null,
          isFavorite: startup.isFavorite === true ? 1 : (startup.isFavorite === false ? 0 : (existingData?.isFavorite === 1 ? 1 : 0)),
          updatedAt: data.updatedAt,
          createdAt: data.createdAt,
        };
        
        // JSON配列形式のフィールドを文字列化（Supabaseスキーマに合わせてカラム名を調整）
        if (Array.isArray(data.method) && data.method.length > 0) {
          supabaseData.method = JSON.stringify(data.method);
        }
        if (data.methodOther) {
          supabaseData.methodOther = data.methodOther;
        }
        if (data.methodDetails && Object.keys(data.methodDetails).length > 0) {
          supabaseData.methodDetails = JSON.stringify(data.methodDetails);
        }
        if (Array.isArray(data.means) && data.means.length > 0) {
          supabaseData.means = JSON.stringify(data.means);
        }
        if (data.meansOther) {
          supabaseData.meansOther = data.meansOther;
        }
        if (Array.isArray(data.categoryIds) && data.categoryIds.length > 0) {
          supabaseData.categoryIds = JSON.stringify(data.categoryIds);
        }
        // themeIdsは空配列の場合も明示的に保存（nullではなく空配列として保存）
        if (Array.isArray(data.themeIds)) {
          supabaseData.themeIds = data.themeIds.length > 0 ? JSON.stringify(data.themeIds) : '[]';
        } else {
          supabaseData.themeIds = '[]';
        }
        if (Array.isArray(data.topicIds) && data.topicIds.length > 0) {
          supabaseData.topicIds = JSON.stringify(data.topicIds);
        }
        if (Array.isArray(data.relatedVCS) && data.relatedVCS.length > 0) {
          supabaseData.relatedVCS = JSON.stringify(data.relatedVCS);
        }
        if (Array.isArray(data.responsibleDepartments) && data.responsibleDepartments.length > 0) {
          supabaseData.responsibleDepartments = JSON.stringify(data.responsibleDepartments);
        }
        if (Array.isArray(data.relatedOrganizations) && data.relatedOrganizations.length > 0) {
          supabaseData.relatedOrganizations = JSON.stringify(data.relatedOrganizations);
        }
        if (Array.isArray(data.relatedGroupCompanies) && data.relatedGroupCompanies.length > 0) {
          supabaseData.relatedGroupCompanies = JSON.stringify(data.relatedGroupCompanies);
        }
        if (data.evaluationChart) {
          supabaseData.evaluationChart = JSON.stringify(data.evaluationChart);
        }
        if (Array.isArray(data.evaluationChartSnapshots) && data.evaluationChartSnapshots.length > 0) {
          supabaseData.evaluationChartSnapshots = JSON.stringify(data.evaluationChartSnapshots);
        }
        if (data.competitorComparison) {
          supabaseData.competitorComparison = JSON.stringify(data.competitorComparison);
        }
        if (data.deepSearch) {
          supabaseData.deepSearch = JSON.stringify(data.deepSearch);
        }
        if (Array.isArray(data.assignee) && data.assignee.length > 0) {
          supabaseData.assignee = JSON.stringify(data.assignee);
        }
        
        // organizationIdが存在するか確認（外部キー制約のため）
        if (supabaseData.organizationId) {
          const parentOrg = await dataSource.doc_get('organizations', supabaseData.organizationId);
          if (!parentOrg) {
            throw new Error(`組織ID "${supabaseData.organizationId}" がorganizationsテーブルに存在しません`);
          }
        }
        
        // SupabaseDataSource経由で保存
        try {
          console.log('💾 [saveStartup] Supabaseに保存するデータ:', {
            id: supabaseData.id,
            organizationId: supabaseData.organizationId,
            companyId: supabaseData.companyId,
            title: supabaseData.title,
            hasTitle: !!supabaseData.title,
            titleLength: supabaseData.title?.length || 0,
            dataKeys: Object.keys(supabaseData),
          });
          
          await dataSource.doc_set('startups', startupId, supabaseData);
          
          console.log('✅ [saveStartup] Supabase経由でスタートアップを保存成功:', startupId, {
            title: supabaseData.title,
            organizationId: supabaseData.organizationId,
          });
        } catch (saveError: any) {
          console.error('❌ [saveStartup] Supabase保存エラー:', {
            error: saveError,
            errorMessage: saveError?.message,
            errorCode: saveError?.code,
            errorDetails: saveError?.details,
            errorHint: saveError?.hint,
            startupId,
            organizationId: supabaseData.organizationId,
            title: supabaseData.title,
            dataKeys: Object.keys(supabaseData),
          });
          throw saveError;
        }
    } catch (setDocError: any) {
      console.error('❌ [saveStartup] setDoc呼び出しエラー:', {
        error: setDocError,
        errorMessage: setDocError?.message,
        errorStack: setDocError?.stack,
        collectionName: 'startups',
        docId: startupId,
        dataKeys: Object.keys(data),
      });
      throw new Error(`スタートアップの保存に失敗しました: ${setDocError?.message || '不明なエラー'}`);
    }
    
    return startupId;
  } catch (error: any) {
    console.error('❌ [saveStartup] 保存失敗:', error);
    throw error;
  }
}

/**
 * スタートアップを取得（ID指定）
 */
export async function getStartupById(startupId: string): Promise<Startup | null> {
  try {
    console.log('📖 [getStartupById] 開始:', { startupId });
    
    if (!startupId || startupId.trim() === '') {
      console.warn('📖 [getStartupById] スタートアップIDが空です');
      return null;
    }
    
    // Supabase専用（環境変数チェック不要）
    try {
        const { getDataSourceInstance } = await import('../dataSource');
        const dataSource = getDataSourceInstance();
        
        // Supabaseから直接取得
        console.log('🔍 [getStartupById] Supabaseから取得を試みます:', { startupId });
        const data = await dataSource.doc_get('startups', startupId);
        
        if (data) {
          console.log('✅ [getStartupById] Supabaseから取得成功:', { startupId, hasData: !!data });
          
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
          
          const parseJsonObject = (value: any): any => {
            if (value === null || value === undefined) return null;
            if (typeof value === 'object' && !Array.isArray(value)) return value;
            if (typeof value === 'string') {
              try {
                return JSON.parse(value);
              } catch (e) {
                return null;
              }
            }
            return null;
          };
          
          const startup: Startup = {
            id: data.id || startupId,
            organizationId: data.organizationId,
            companyId: data.companyId,
            title: data.title || '',
            description: data.description || '',
            content: data.content || '',
            assignee: parseJsonArray(data.assignee),
            method: parseJsonArray(data.method),
            methodOther: data.methodOther || '',
            methodDetails: parseJsonObject(data.methodDetails) || {},
            means: parseJsonArray(data.means),
            meansOther: data.meansOther || '',
            objective: data.objective || '',
            evaluation: data.evaluation || '',
            evaluationChart: parseJsonObject(data.evaluationChart),
            evaluationChartSnapshots: parseJsonArray(data.evaluationChartSnapshots),
            considerationPeriod: data.considerationPeriod || '',
            executionPeriod: data.executionPeriod || '',
            monetizationPeriod: data.monetizationPeriod || '',
            monetizationRenewalNotRequired: data.monetizationRenewalNotRequired === 1 ? true : false,
            relatedOrganizations: parseJsonArray(data.relatedOrganizations),
            relatedGroupCompanies: parseJsonArray(data.relatedGroupCompanies),
            monetizationDiagram: data.monetizationDiagram || '',
            monetizationDiagramId: data.monetizationDiagramId || '',
            relationDiagram: data.relationDiagram || '',
            relationDiagramId: data.relationDiagramId || '',
            causeEffectDiagramId: data.causeEffectDiagramId || '',
            themeId: data.themeId || '',
            themeIds: parseJsonArray(data.themeIds),
            topicIds: parseJsonArray(data.topicIds),
            categoryIds: parseJsonArray(data.categoryIds),
            relatedVCS: parseJsonArray(data.relatedVCS),
            responsibleDepartments: parseJsonArray(data.responsibleDepartments),
            status: data.status,
            agencyContractMonth: data.agencyContractMonth,
            engagementLevel: data.engagementLevel,
            bizDevPhase: data.bizDevPhase,
            hpUrl: data.hpUrl,
            asanaUrl: data.asanaUrl,
            boxUrl: data.boxUrl,
            competitorComparison: parseJsonObject(data.competitorComparison),
            deepSearch: parseJsonObject(data.deepSearch),
            isFavorite: data.isFavorite === 1 || data.isFavorite === true,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
          
          return startup;
        }
        
        console.warn('📖 [getStartupById] データが見つかりませんでした');
        return null;
      } catch (error: any) {
        const errorMessage = error?.message || String(error || '');
        console.error('❌ [getStartupById] Supabase取得エラー:', errorMessage);
        return null;
      }
  } catch (error: any) {
    console.error('❌ [getStartupById] エラー:', error);
    return null;
  }
}

/**
 * スタートアップを削除
 */
export async function deleteStartup(startupId: string): Promise<void> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('🗑️ [deleteStartup] 開始（Supabase経由）:', startupId);
    
    const { deleteDocViaDataSource } = await import('../dataSourceAdapter');
    await deleteDocViaDataSource('startups', startupId);
    console.log('✅ [deleteStartup] Supabase経由で削除成功:', startupId);
  } catch (error: any) {
    const errorMessage = error?.message || String(error || '');
    console.error('❌ [deleteStartup] Supabase経由での削除失敗:', {
      error,
      errorMessage,
      startupId,
    });
    throw new Error(`スタートアップの削除に失敗しました: ${errorMessage || '不明なエラー'}`);
  }
}

/**
 * スタートアップのお気に入り状態を切り替え
 */
export async function toggleStartupFavorite(startupId: string): Promise<boolean> {
  try {
    console.log('⭐ [toggleStartupFavorite] 開始:', { startupId });
    
    // 既存のスタートアップデータを取得
    const existingStartup = await getStartupById(startupId);
    
    if (!existingStartup) {
      throw new Error(`スタートアップID "${startupId}" が見つかりません`);
    }
    
    // お気に入り状態を反転
    const newFavoriteStatus = !existingStartup.isFavorite;
    
    console.log('⭐ [toggleStartupFavorite] お気に入り状態を切り替え:', {
      startupId,
      currentStatus: existingStartup.isFavorite,
      newStatus: newFavoriteStatus,
    });
    
    // Supabase専用（環境変数チェック不要）
    const { getDataSourceInstance } = await import('../dataSource');
    const dataSource = getDataSourceInstance();
    
    // 既存データを取得して、isFavoriteだけを更新
    const existingData = await dataSource.doc_get('startups', startupId);
    
    if (!existingData) {
      throw new Error(`スタートアップID "${startupId}" のデータが見つかりません`);
    }
    
    // 既存データをコピーして、isFavoriteだけを更新
    const updateData = {
      ...existingData,
      isFavorite: newFavoriteStatus ? 1 : 0,
      updatedAt: new Date().toISOString(),
    };
    
    // Supabaseに保存
    await dataSource.doc_set('startups', startupId, updateData);
    
    console.log('✅ [toggleStartupFavorite] お気に入り状態の切り替え成功:', {
      startupId,
      newStatus: newFavoriteStatus,
    });
    
    return newFavoriteStatus;
  } catch (error: any) {
    const errorMessage = error?.message || String(error || '');
    console.error('❌ [toggleStartupFavorite] お気に入り状態の切り替え失敗:', {
      error,
      errorMessage,
      startupId,
    });
    throw new Error(`お気に入り状態の切り替えに失敗しました: ${errorMessage || '不明なエラー'}`);
  }
}

/**
 * すべてのスタートアップを取得（組織ID指定なし）
 */
export async function getAllStartups(): Promise<Startup[]> {
  try {
    // Supabase専用（環境変数チェック不要）
    console.log('📖 [getAllStartups] 開始（Supabaseから取得）');
    
    try {
        const { getCollectionViaDataSource } = await import('../dataSourceAdapter');
        const result = await getCollectionViaDataSource('startups');
        
        // Supabaseから取得したデータは既に配列形式
        const resultArray = Array.isArray(result) ? result : [];
        
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
        
        const startups = resultArray.map((item: any) => {
          // Supabaseから取得したデータは直接オブジェクト形式
          const data = item;
          const itemId = data.id;
          
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
          
          return {
          id: itemId,
          organizationId: data.organizationId,
          companyId: data.companyId,
          title: data.title || '',
          description: data.description || '',
          content: data.content || '',
          assignee: parseJsonArray(data.assignee),
          categoryIds: parseJsonArray(data.categoryIds),
          status: data.status,
          agencyContractMonth: data.agencyContractMonth,
          engagementLevel: data.engagementLevel,
          bizDevPhase: data.bizDevPhase,
          relatedVCS: parseJsonArray(data.relatedVCS),
          responsibleDepartments: parseJsonArray(data.responsibleDepartments),
          hpUrl: data.hpUrl,
          asanaUrl: data.asanaUrl,
          boxUrl: data.boxUrl,
          objective: data.objective,
          evaluation: data.evaluation,
          evaluationChart: data.evaluationChart,
          evaluationChartSnapshots: data.evaluationChartSnapshots,
          considerationPeriod: data.considerationPeriod,
          executionPeriod: data.executionPeriod,
          monetizationPeriod: data.monetizationPeriod,
          monetizationRenewalNotRequired: (() => {
            const value = data.monetizationRenewalNotRequired;
            // データベースから読み込んだ値が1の場合はtrue、0の場合はfalseに変換
            if (value === 1) {
              return true;
            } else if (value === 0) {
              return false;
            } else if (value === true) {
              return true;
            } else if (value === false) {
              return false;
            } else {
              return false;
            }
          })(),
          relatedOrganizations: parseJsonArray(data.relatedOrganizations),
          relatedGroupCompanies: parseJsonArray(data.relatedGroupCompanies),
          monetizationDiagram: data.monetizationDiagram,
          monetizationDiagramId: data.monetizationDiagramId,
          relationDiagram: data.relationDiagram,
          relationDiagramId: data.relationDiagramId,
          causeEffectDiagramId: data.causeEffectDiagramId,
          themeId: data.themeId,
          themeIds: parseJsonArray(data.themeIds),
          topicIds: parseJsonArray(data.topicIds),
          competitorComparison: (() => {
            if (!data.competitorComparison) return undefined;
            if (typeof data.competitorComparison === 'object' && !Array.isArray(data.competitorComparison)) {
              return data.competitorComparison as any;
            }
            if (typeof data.competitorComparison === 'string') {
              try {
                return JSON.parse(data.competitorComparison);
              } catch (e) {
                console.warn('⚠️ [getAllStartups] competitorComparison JSONパースエラー:', e);
                return undefined;
              }
            }
            return undefined;
          })(),
          deepSearch: (() => {
            if (!data.deepSearch) return undefined;
            if (typeof data.deepSearch === 'object' && !Array.isArray(data.deepSearch)) {
              return data.deepSearch as any;
            }
            if (typeof data.deepSearch === 'string') {
              try {
                return JSON.parse(data.deepSearch);
              } catch (e) {
                console.warn('⚠️ [getAllStartups] deepSearch JSONパースエラー:', e);
                return undefined;
              }
            }
            return undefined;
          })(),
          isFavorite: data.isFavorite === 1 || data.isFavorite === true,
          createdAt: createdAt,
          updatedAt: updatedAt,
        } as Startup;
      });
      
      const sorted = startups.sort((a, b) => {
        const aTime = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0) : 0;
        const bTime = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0) : 0;
        return bTime - aTime;
      });
      
      console.log('✅ [getAllStartups] 取得成功（Supabaseから取得）:', sorted.length, '件');
      return sorted;
    } catch (error: any) {
      console.error('❌ [getAllStartups] Supabase取得エラー:', error);
      throw error;
    }
  } catch (error: any) {
    console.error('❌ [getAllStartups] エラー:', error);
    throw error;
  }
}

