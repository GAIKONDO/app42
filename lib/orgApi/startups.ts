import { doc, getDoc, setDoc } from '../firestore';
import type { Startup } from './types';
import { generateUniqueStartupId } from './utils';

/**
 * スタートアップを取得
 */
export async function getStartups(organizationId: string): Promise<Startup[]> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`📖 [getStartups] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から取得）:`, { organizationId });
    
    // Supabase使用時はDataSource経由で取得
    if (useSupabase) {
      try {
        const { getCollectionViaDataSource } = await import('../dataSourceAdapter');
        const result = await getCollectionViaDataSource('startups');
        
        // Supabaseから取得したデータは既に配列形式
        const allStartups = Array.isArray(result) ? result : [];
        console.log('📖 [getStartups] Supabaseから取得:', allStartups.length, '件');
        
        const filtered = allStartups
          .filter((item: any) => {
            // Supabaseから取得したデータは直接オブジェクト形式
            const data = item;
            const matches = data.organizationId === organizationId;
            return matches;
          })
          .map((item: any) => {
            const data = item;
            return {
              id: data.id,
              organizationId: data.organizationId,
              title: data.title || '',
              description: data.description || '',
              content: data.content || '',
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            } as Startup;
          });
      
      console.log('📖 [getStartups] フィルタ後:', {
        filteredCount: filtered.length,
        filteredIds: filtered.map(s => s.id),
      });
      
      const sorted = filtered.sort((a, b) => {
        const aTime = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt.toMillis ? a.createdAt.toMillis() : 0)) : 0;
        const bTime = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt.toMillis ? b.createdAt.toMillis() : 0)) : 0;
        return bTime - aTime;
      });
      
        console.log('📖 [getStartups] 最終結果（Supabaseから取得）:', {
          count: sorted.length,
          startups: sorted.map(s => ({ id: s.id, title: s.title, organizationId: s.organizationId })),
        });
        return sorted;
      } catch (error: any) {
        console.error('❌ [getStartups] Supabase取得エラー:', error);
        // フォールバック: Tauriコマンド経由
        console.warn('⚠️ [getStartups] Supabase取得に失敗、Tauriコマンドにフォールバック:', error);
      }
    }
    
    // ローカルSQLite使用時またはフォールバック時はTauriコマンド経由
    const { callTauriCommand } = await import('../localFirebase');
    
    try {
      console.log('📖 [getStartups] collection_get呼び出し前:', { collectionName: 'startups' });
      const result = await callTauriCommand('collection_get', {
        collectionName: 'startups',
      });
      
      console.log('📖 [getStartups] collection_get結果:', {
        resultType: typeof result,
        isArray: Array.isArray(result),
        resultLength: Array.isArray(result) ? result.length : 'N/A',
      });
      
      const allStartups = Array.isArray(result) ? result : [];
      console.log('📖 [getStartups] 全データ数:', allStartups.length);
      
      const filtered = allStartups
        .filter((item: any) => {
          const data = item.data || item;
          const matches = data.organizationId === organizationId;
          if (!matches && allStartups.length > 0) {
            console.log('📖 [getStartups] フィルタ除外:', {
              itemId: data.id || item.id,
              itemOrganizationId: data.organizationId,
              targetOrganizationId: organizationId,
              match: matches,
            });
          }
          return matches;
        })
        .map((item: any) => {
          const data = item.data || item;
          return {
            id: data.id || item.id,
            organizationId: data.organizationId,
            title: data.title || '',
            description: data.description || '',
            content: data.content || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as Startup;
        });
      
      console.log('📖 [getStartups] フィルタ後:', {
        filteredCount: filtered.length,
        filteredIds: filtered.map(s => s.id),
      });
      
      const sorted = filtered.sort((a, b) => {
        const aTime = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt.toMillis ? a.createdAt.toMillis() : 0)) : 0;
        const bTime = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt.toMillis ? b.createdAt.toMillis() : 0)) : 0;
        return bTime - aTime;
      });
      
      console.log('📖 [getStartups] 最終結果:', {
        count: sorted.length,
        startups: sorted.map(s => ({ id: s.id, title: s.title, organizationId: s.organizationId })),
      });
      return sorted;
    } catch (collectionError: any) {
      console.error('📖 [getStartups] collection_getエラー:', {
        error: collectionError,
        errorMessage: collectionError?.message,
        errorStack: collectionError?.stack,
        collectionName: 'startups',
      });
      return [];
    }
  } catch (error: any) {
    console.error('❌ [getStartups] エラー:', {
      error,
      errorMessage: error?.message,
      errorStack: error?.stack,
      organizationId,
    });
    return [];
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
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        const { callTauriCommand } = await import('../localFirebase');
        
        const dataForDb: any = {
          ...data,
          method: Array.isArray(data.method) && data.method.length > 0 ? JSON.stringify(data.method) : null,
          means: Array.isArray(data.means) && data.means.length > 0 ? JSON.stringify(data.means) : null,
          relatedOrganizations: Array.isArray(data.relatedOrganizations) && data.relatedOrganizations.length > 0 ? JSON.stringify(data.relatedOrganizations) : null,
          relatedGroupCompanies: Array.isArray(data.relatedGroupCompanies) && data.relatedGroupCompanies.length > 0 ? JSON.stringify(data.relatedGroupCompanies) : null,
          methodDetails: data.methodDetails && Object.keys(data.methodDetails).length > 0 ? JSON.stringify(data.methodDetails) : null,
          themeIds: Array.isArray(data.themeIds) ? (data.themeIds.length > 0 ? JSON.stringify(data.themeIds) : '[]') : '[]',
          topicIds: Array.isArray(data.topicIds) ? (data.topicIds.length > 0 ? JSON.stringify(data.topicIds) : '[]') : '[]',
          categoryIds: Array.isArray(data.categoryIds) ? (data.categoryIds.length > 0 ? JSON.stringify(data.categoryIds) : '[]') : '[]',
          relatedVCS: Array.isArray(data.relatedVCS) ? (data.relatedVCS.length > 0 ? JSON.stringify(data.relatedVCS) : '[]') : '[]',
          responsibleDepartments: Array.isArray(data.responsibleDepartments) ? (data.responsibleDepartments.length > 0 ? JSON.stringify(data.responsibleDepartments) : '[]') : '[]',
          evaluationChart: data.evaluationChart ? JSON.stringify(data.evaluationChart) : null,
          evaluationChartSnapshots: Array.isArray(data.evaluationChartSnapshots) && data.evaluationChartSnapshots.length > 0 ? JSON.stringify(data.evaluationChartSnapshots) : null,
          competitorComparison: data.competitorComparison ? JSON.stringify(data.competitorComparison) : null,
          deepSearch: data.deepSearch ? JSON.stringify(data.deepSearch) : null,
          monetizationRenewalNotRequired: (() => {
            const value = data.monetizationRenewalNotRequired;
            console.log('💾 [saveStartup] monetizationRenewalNotRequired保存:', {
              rawValue: value,
              type: typeof value,
              isUndefined: value === undefined,
              isNull: value === null,
              isTrue: value === true,
              isFalse: value === false,
              result: value !== undefined ? value : undefined
            });
            // Tauriのdoc_setでboolean値が正しく保存されない可能性があるため、
            // trueの場合は1、falseの場合は0に変換して保存する
            if (value === true) {
              return 1;
            } else if (value === false) {
              return 0;
            } else {
              return undefined;
            }
          })(),
        };
        
        // dataForDb構築直後にcompetitorComparisonを確認
        console.log('💾 [saveStartup] dataForDb構築直後確認:', {
          hasCompetitorComparisonInData: !!data.competitorComparison,
          competitorComparisonInData: data.competitorComparison,
          competitorComparisonInDataId: data.competitorComparison?.id,
          hasCompetitorComparisonInDataForDb: 'competitorComparison' in dataForDb,
          competitorComparisonInDataForDb: dataForDb.competitorComparison,
          competitorComparisonInDataForDbType: typeof dataForDb.competitorComparison,
          competitorComparisonInDataForDbIsNull: dataForDb.competitorComparison === null,
          competitorComparisonInDataForDbIsUndefined: dataForDb.competitorComparison === undefined,
        });
        
        // monetizationRenewalNotRequiredの確認
        console.log('💾 [saveStartup] monetizationRenewalNotRequired確認:', {
          inData: data.monetizationRenewalNotRequired,
          inDataForDb: dataForDb.monetizationRenewalNotRequired,
          inDataForDbType: typeof dataForDb.monetizationRenewalNotRequired,
          hasInDataForDb: 'monetizationRenewalNotRequired' in dataForDb,
          dataForDbKeys: Object.keys(dataForDb),
          hasMonetizationRenewalNotRequiredInKeys: Object.keys(dataForDb).includes('monetizationRenewalNotRequired'),
        });
        
        console.log('💾 [saveStartup] dataForDb確認:', {
          hasEvaluationChart: !!dataForDb.evaluationChart,
          evaluationChartType: typeof dataForDb.evaluationChart,
          evaluationChartLength: typeof dataForDb.evaluationChart === 'string' ? dataForDb.evaluationChart.length : 'N/A',
          evaluationChartPreview: typeof dataForDb.evaluationChart === 'string' ? dataForDb.evaluationChart.substring(0, 200) : dataForDb.evaluationChart,
          hasEvaluationChartSnapshots: !!dataForDb.evaluationChartSnapshots,
          evaluationChartSnapshotsType: typeof dataForDb.evaluationChartSnapshots,
          dataForDbKeys: Object.keys(dataForDb),
          evaluationChartInDataForDb: 'evaluationChart' in dataForDb,
          evaluationChartSnapshotsInDataForDb: 'evaluationChartSnapshots' in dataForDb,
          hasCategoryIds: 'categoryIds' in dataForDb,
          categoryIds: dataForDb.categoryIds,
          categoryIdsType: typeof dataForDb.categoryIds,
          categoryIdsValue: data.categoryIds,
          categoryIdsValueLength: Array.isArray(data.categoryIds) ? data.categoryIds.length : 0,
          hasRelatedVCS: 'relatedVCS' in dataForDb,
          relatedVCS: dataForDb.relatedVCS,
          relatedVCSType: typeof dataForDb.relatedVCS,
          relatedVCSValue: data.relatedVCS,
          relatedVCSValueLength: Array.isArray(data.relatedVCS) ? data.relatedVCS.length : 0,
          hasResponsibleDepartments: 'responsibleDepartments' in dataForDb,
          responsibleDepartments: dataForDb.responsibleDepartments,
          responsibleDepartmentsType: typeof dataForDb.responsibleDepartments,
          responsibleDepartmentsValue: data.responsibleDepartments,
          responsibleDepartmentsValueLength: Array.isArray(data.responsibleDepartments) ? data.responsibleDepartments.length : 0,
          hasCompetitorComparison: 'competitorComparison' in dataForDb,
          competitorComparison: dataForDb.competitorComparison,
          competitorComparisonType: typeof dataForDb.competitorComparison,
          competitorComparisonValue: data.competitorComparison,
          competitorComparisonValueId: data.competitorComparison?.id,
        });
        
        // doc_setに渡すデータを確認
        console.log('💾 [saveStartup] doc_set呼び出し前のデータ確認:', {
          hasMonetizationRenewalNotRequired: 'monetizationRenewalNotRequired' in dataForDb,
          monetizationRenewalNotRequiredValue: dataForDb.monetizationRenewalNotRequired,
          monetizationRenewalNotRequiredType: typeof dataForDb.monetizationRenewalNotRequired,
          dataForDbKeys: Object.keys(dataForDb),
          dataForDbKeysCount: Object.keys(dataForDb).length,
          dataForDbMonetizationRenewalNotRequired: dataForDb.monetizationRenewalNotRequired,
        });
        
        // doc_setに渡すデータのJSON文字列化（デバッグ用）
        const dataForDbString = JSON.stringify(dataForDb);
        console.log('💾 [saveStartup] doc_setに渡すデータ（JSON）:', {
          dataLength: dataForDbString.length,
          hasMonetizationRenewalNotRequired: dataForDbString.includes('monetizationRenewalNotRequired'),
          monetizationRenewalNotRequiredIndex: dataForDbString.indexOf('monetizationRenewalNotRequired'),
          preview: dataForDbString.substring(Math.max(0, dataForDbString.indexOf('monetizationRenewalNotRequired') - 50), Math.min(dataForDbString.length, dataForDbString.indexOf('monetizationRenewalNotRequired') + 100)),
        });
        
        await callTauriCommand('doc_set', {
          collectionName: 'startups',
          docId: startupId,
          data: dataForDb,
        });
        
        console.log('💾 [saveStartup] doc_set呼び出し後:', {
          dataForDbKeys: Object.keys(dataForDb),
          dataForDbKeysCount: Object.keys(dataForDb).length,
          evaluationChartInDataForDb: 'evaluationChart' in dataForDb,
          competitorComparisonInDataForDb: 'competitorComparison' in dataForDb,
          competitorComparisonValue: dataForDb.competitorComparison,
          competitorComparisonType: typeof dataForDb.competitorComparison,
          competitorComparisonValueLength: typeof dataForDb.competitorComparison === 'string' ? dataForDb.competitorComparison.length : 'N/A',
          competitorComparisonValuePreview: typeof dataForDb.competitorComparison === 'string' ? dataForDb.competitorComparison.substring(0, 200) : dataForDb.competitorComparison,
        });
        console.log('✅ [saveStartup] データベース保存成功（Tauri）:', startupId, {
          title: data.title,
          organizationId: data.organizationId,
          hasEvaluationChart: !!data.evaluationChart,
          hasEvaluationChartSnapshots: Array.isArray(data.evaluationChartSnapshots) && data.evaluationChartSnapshots.length > 0,
          categoryIds: data.categoryIds,
          categoryIdsLength: Array.isArray(data.categoryIds) ? data.categoryIds.length : 0,
          categoryIdsInDataForDb: dataForDb.categoryIds,
          status: data.status,
          engagementLevel: data.engagementLevel,
          bizDevPhase: data.bizDevPhase,
          agencyContractMonth: data.agencyContractMonth,
          hpUrl: data.hpUrl,
          asanaUrl: data.asanaUrl,
          boxUrl: data.boxUrl,
          relatedVCS: data.relatedVCS,
          relatedVCSLength: Array.isArray(data.relatedVCS) ? data.relatedVCS.length : 0,
          relatedVCSInDataForDb: dataForDb.relatedVCS,
          responsibleDepartments: data.responsibleDepartments,
          responsibleDepartmentsLength: Array.isArray(data.responsibleDepartments) ? data.responsibleDepartments.length : 0,
          responsibleDepartmentsInDataForDb: dataForDb.responsibleDepartments,
          hasCompetitorComparison: !!data.competitorComparison,
          competitorComparisonId: data.competitorComparison?.id,
          competitorComparisonAxesCount: data.competitorComparison?.axes?.length || 0,
          competitorComparisonInDataForDb: dataForDb.competitorComparison,
          competitorComparisonInDataForDbType: typeof dataForDb.competitorComparison,
        });
      } else {
        await setDoc(docRef, data);
        console.log('✅ [saveStartup] データベース保存成功（Firestore）:', startupId, {
          title: data.title,
          hasEvaluationChart: !!data.evaluationChart,
          hasEvaluationChartSnapshots: Array.isArray(data.evaluationChartSnapshots) && data.evaluationChartSnapshots.length > 0,
        });
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
    
    const { callTauriCommand } = await import('../localFirebase');
    
    try {
      const result = await callTauriCommand('doc_get', {
        collectionName: 'startups',
        docId: startupId,
      });
      
      if (result && result.exists) {
        const data = result.data || result;
        
        // データベースから読み込んだデータのJSON文字列化（デバッグ用）
        const dataString = JSON.stringify(data);
        console.log('📖 [getStartupById] データベースから読み込んだデータ（JSON）:', {
          dataLength: dataString.length,
          hasMonetizationRenewalNotRequired: dataString.includes('monetizationRenewalNotRequired'),
          monetizationRenewalNotRequiredIndex: dataString.indexOf('monetizationRenewalNotRequired'),
          preview: dataString.indexOf('monetizationRenewalNotRequired') >= 0 ? dataString.substring(Math.max(0, dataString.indexOf('monetizationRenewalNotRequired') - 50), Math.min(dataString.length, dataString.indexOf('monetizationRenewalNotRequired') + 100)) : 'not found',
        });
        
        const allDataKeys = Object.keys(data);
        const hasCompetitorComparisonInData = 'competitorComparison' in data;
        const competitorComparisonInAllDataKeys = allDataKeys.includes('competitorComparison');
        console.log('📖 [getStartupById] 生データ確認:', {
          hasEvaluationChart: !!data.evaluationChart,
          evaluationChartType: typeof data.evaluationChart,
          evaluationChartValue: data.evaluationChart ? (typeof data.evaluationChart === 'string' ? data.evaluationChart.substring(0, 100) : data.evaluationChart) : null,
          evaluationChartLength: typeof data.evaluationChart === 'string' ? data.evaluationChart.length : 'N/A',
          hasEvaluationChartSnapshots: !!data.evaluationChartSnapshots,
          evaluationChartSnapshotsType: typeof data.evaluationChartSnapshots,
          allDataKeys,
          allDataKeysCount: allDataKeys.length,
          allDataKeysString: allDataKeys.join(', '),
          hasCompetitorComparisonInData,
          competitorComparisonInAllDataKeys,
          hasCategoryIds: 'categoryIds' in data,
          categoryIds: data.categoryIds,
          categoryIdsType: typeof data.categoryIds,
          categoryIdsValue: data.categoryIds ? (typeof data.categoryIds === 'string' ? data.categoryIds.substring(0, 200) : JSON.stringify(data.categoryIds).substring(0, 200)) : null,
          categoryIdsLength: typeof data.categoryIds === 'string' ? data.categoryIds.length : (Array.isArray(data.categoryIds) ? data.categoryIds.length : 'N/A'),
          competitorComparison: data.competitorComparison,
          competitorComparisonType: typeof data.competitorComparison,
          competitorComparisonValue: data.competitorComparison ? (typeof data.competitorComparison === 'string' ? data.competitorComparison.substring(0, 200) : JSON.stringify(data.competitorComparison).substring(0, 200)) : null,
          competitorComparisonLength: typeof data.competitorComparison === 'string' ? data.competitorComparison.length : (typeof data.competitorComparison === 'object' ? 'object' : 'N/A'),
        });
        console.log('📖 [getStartupById] allDataKeys詳細:', allDataKeys);
        console.log('📖 [getStartupById] competitorComparison存在確認:', {
          hasCompetitorComparisonInData,
          competitorComparisonInData: data.competitorComparison,
          competitorComparisonType: typeof data.competitorComparison,
          competitorComparisonIsNull: data.competitorComparison === null,
          competitorComparisonIsUndefined: data.competitorComparison === undefined,
        });
        console.log('📖 [getStartupById] monetizationRenewalNotRequired存在確認:', {
          hasMonetizationRenewalNotRequiredInData: 'monetizationRenewalNotRequired' in data,
          monetizationRenewalNotRequiredInAllDataKeys: allDataKeys.includes('monetizationRenewalNotRequired'),
          monetizationRenewalNotRequiredValue: data.monetizationRenewalNotRequired,
          monetizationRenewalNotRequiredType: typeof data.monetizationRenewalNotRequired,
        });
        
        const parseJsonArray = (value: any, fieldName: string = 'unknown'): string[] => {
          if (Array.isArray(value)) {
            console.log(`📖 [getStartupById] parseJsonArray(${fieldName}): 既に配列`, value);
            return value;
          }
          if (typeof value === 'string') {
            try {
              const parsed = JSON.parse(value);
              console.log(`📖 [getStartupById] parseJsonArray(${fieldName}): JSONパース成功`, parsed);
              return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              console.warn(`⚠️ [getStartupById] parseJsonArray(${fieldName}) JSONパースエラー:`, e, 'value:', value);
              return [];
            }
          }
          if (value === null || value === undefined) {
            console.log(`📖 [getStartupById] parseJsonArray(${fieldName}): null/undefined`);
            return [];
          }
          console.log(`📖 [getStartupById] parseJsonArray(${fieldName}): その他の型`, typeof value, value);
          return [];
        };
        
        const parseJsonObject = (value: any): any => {
          if (value === null || value === undefined) {
            return null;
          }
          if (typeof value === 'object' && !Array.isArray(value)) {
            return value;
          }
          if (typeof value === 'string') {
            try {
              return JSON.parse(value);
            } catch (e) {
              console.warn('⚠️ [getStartupById] JSONパースエラー:', e, 'value:', value);
              return null;
            }
          }
          return null;
        };
        
        const startup: Startup = {
          id: data.id || startupId,
          organizationId: data.organizationId,
          title: data.title || '',
          description: data.description || '',
          content: data.content || '',
          assignee: data.assignee || '',
          method: parseJsonArray(data.method),
          methodOther: data.methodOther || '',
          methodDetails: parseJsonObject(data.methodDetails) || {},
          means: parseJsonArray(data.means),
          meansOther: data.meansOther || '',
          objective: data.objective || '',
          evaluation: data.evaluation || '',
          evaluationChart: parseJsonObject(data.evaluationChart),
          evaluationChartSnapshots: (() => {
            if (!data.evaluationChartSnapshots) {
              return [];
            }
            if (Array.isArray(data.evaluationChartSnapshots)) {
              return data.evaluationChartSnapshots;
            }
            if (typeof data.evaluationChartSnapshots === 'string') {
              try {
                const parsed = JSON.parse(data.evaluationChartSnapshots);
                return Array.isArray(parsed) ? parsed : [];
              } catch (e) {
                console.warn('⚠️ [getStartupById] evaluationChartSnapshots JSONパースエラー:', e);
                return [];
              }
            }
            return [];
          })(),
          considerationPeriod: data.considerationPeriod || '',
          executionPeriod: data.executionPeriod || '',
          monetizationPeriod: data.monetizationPeriod || '',
          monetizationRenewalNotRequired: (() => {
            const value = data.monetizationRenewalNotRequired;
            console.log('📖 [getStartupById] monetizationRenewalNotRequired読み込み:', {
              rawValue: value,
              type: typeof value,
              isUndefined: value === undefined,
              isNull: value === null,
              isTrue: value === true,
              isFalse: value === false,
              isOne: value === 1,
              isZero: value === 0,
              result: value !== undefined ? (value === 1 ? true : (value === 0 ? false : value)) : false
            });
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
          monetizationDiagram: data.monetizationDiagram || '',
          monetizationDiagramId: data.monetizationDiagramId || '',
          relationDiagram: data.relationDiagram || '',
          relationDiagramId: data.relationDiagramId || '',
          causeEffectDiagramId: data.causeEffectDiagramId || '',
          themeId: data.themeId || '',
          themeIds: parseJsonArray(data.themeIds, 'themeIds'),
          topicIds: parseJsonArray(data.topicIds, 'topicIds'),
          categoryIds: parseJsonArray(data.categoryIds, 'categoryIds'),
          relatedVCS: parseJsonArray(data.relatedVCS, 'relatedVCS'),
          responsibleDepartments: parseJsonArray(data.responsibleDepartments, 'responsibleDepartments'),
          status: data.status,
          agencyContractMonth: data.agencyContractMonth,
          engagementLevel: data.engagementLevel,
          bizDevPhase: data.bizDevPhase,
          hpUrl: data.hpUrl,
          asanaUrl: data.asanaUrl,
          boxUrl: data.boxUrl,
          competitorComparison: (() => {
            console.log('📖 [getStartupById] competitorComparisonパース開始:', {
              hasCompetitorComparison: 'competitorComparison' in data,
              competitorComparison: data.competitorComparison,
              competitorComparisonType: typeof data.competitorComparison,
              competitorComparisonIsNull: data.competitorComparison === null,
              competitorComparisonIsUndefined: data.competitorComparison === undefined,
            });
            if (!data.competitorComparison) {
              console.log('📖 [getStartupById] competitorComparison: null/undefinedのためundefinedを返す');
              return undefined;
            }
            if (typeof data.competitorComparison === 'object' && !Array.isArray(data.competitorComparison)) {
              console.log('📖 [getStartupById] competitorComparison: 既にオブジェクト', {
                id: (data.competitorComparison as any)?.id,
                axesCount: (data.competitorComparison as any)?.axes?.length || 0,
              });
              return data.competitorComparison as any;
            }
            if (typeof data.competitorComparison === 'string') {
              try {
                const parsed = JSON.parse(data.competitorComparison);
                console.log('📖 [getStartupById] competitorComparison JSONパース成功:', {
                  id: parsed?.id,
                  axesCount: parsed?.axes?.length || 0,
                  selectedStartupsCount: parsed?.selectedStartupIds?.length || 0,
                });
                return parsed;
              } catch (e) {
                console.warn('⚠️ [getStartupById] competitorComparison JSONパースエラー:', e, 'value:', data.competitorComparison);
                return undefined;
              }
            }
            console.log('📖 [getStartupById] competitorComparison: その他の型', typeof data.competitorComparison, data.competitorComparison);
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
                console.warn('⚠️ [getStartupById] deepSearch JSONパースエラー:', e);
                return undefined;
              }
            }
            return undefined;
          })(),
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        
        console.log('✅ [getStartupById] 取得成功:', {
          id: startup.id,
          title: startup.title,
          organizationId: startup.organizationId,
          hasEvaluationChart: !!startup.evaluationChart,
          evaluationChartAxesCount: startup.evaluationChart?.axes?.length || 0,
          evaluationChartSnapshotsCount: startup.evaluationChartSnapshots?.length || 0,
          evaluationChartType: typeof startup.evaluationChart,
          evaluationChartSnapshotsType: typeof startup.evaluationChartSnapshots,
          rawEvaluationChartType: typeof data.evaluationChart,
          rawEvaluationChartSnapshotsType: typeof data.evaluationChartSnapshots,
          categoryIds: startup.categoryIds,
          categoryIdsLength: startup.categoryIds?.length || 0,
          relatedVCS: startup.relatedVCS,
          relatedVCSLength: startup.relatedVCS?.length || 0,
          responsibleDepartments: startup.responsibleDepartments,
          responsibleDepartmentsLength: startup.responsibleDepartments?.length || 0,
          status: startup.status,
          engagementLevel: startup.engagementLevel,
          bizDevPhase: startup.bizDevPhase,
          agencyContractMonth: startup.agencyContractMonth,
          hpUrl: startup.hpUrl,
          asanaUrl: startup.asanaUrl,
          boxUrl: startup.boxUrl,
          rawStatus: data.status,
          rawEngagementLevel: data.engagementLevel,
          rawBizDevPhase: data.bizDevPhase,
          hasCompetitorComparison: !!startup.competitorComparison,
          competitorComparisonId: startup.competitorComparison?.id,
          competitorComparisonAxesCount: startup.competitorComparison?.axes?.length || 0,
          rawCompetitorComparisonType: typeof data.competitorComparison,
          rawCompetitorComparisonExists: 'competitorComparison' in data,
        });
        
        return startup;
      }
      
      console.warn('📖 [getStartupById] データが見つかりませんでした。result:', result);
      return null;
    } catch (docError: any) {
      console.error('📖 [getStartupById] doc_getエラー:', docError);
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
    console.log('🗑️ [deleteStartup] 開始:', startupId);
    
    const { callTauriCommand } = await import('../localFirebase');
    
    try {
      await callTauriCommand('doc_delete', {
        collectionName: 'startups',
        docId: startupId,
      });
      
      console.log('✅ [deleteStartup] 削除成功:', startupId);
    } catch (deleteError: any) {
      const errorMessage = deleteError?.message || String(deleteError || '');
      console.error('❌ [deleteStartup] 削除失敗:', {
        error: deleteError,
        errorMessage,
        startupId,
      });
      throw new Error(`スタートアップの削除に失敗しました: ${errorMessage || '不明なエラー'}`);
    }
  } catch (error: any) {
    console.error('❌ [deleteStartup] エラー:', error);
    throw error;
  }
}

/**
 * すべてのスタートアップを取得（組織ID指定なし）
 */
export async function getAllStartups(): Promise<Startup[]> {
  try {
    const useSupabase = process.env.NEXT_PUBLIC_USE_SUPABASE === 'true';
    console.log(`📖 [getAllStartups] 開始（${useSupabase ? 'Supabase' : 'SQLite'}から取得）`);
    
    // Supabase使用時はDataSource経由で取得
    if (useSupabase) {
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
        // フォールバック: Tauriコマンド経由
        console.warn('⚠️ [getAllStartups] Supabase取得に失敗、Tauriコマンドにフォールバック:', error);
      }
    }
    
    // ローカルSQLite使用時またはフォールバック時はTauriコマンド経由
    const { callTauriCommand } = await import('../localFirebase');
    
    try {
      const result = await callTauriCommand('collection_get', {
        collectionName: 'startups',
      });
      
      // 結果が配列でない場合（オブジェクトの場合）、配列に変換
      let resultArray: any[] = [];
      if (Array.isArray(result)) {
        resultArray = result;
      } else if (result && typeof result === 'object') {
        resultArray = Object.values(result);
      } else {
        return [];
      }
      
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
        const data = item.data || item;
        const itemId = item.id || data.id;
        
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
          createdAt: createdAt,
          updatedAt: updatedAt,
        } as Startup;
      });
      
      const sorted = startups.sort((a, b) => {
        const aTime = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0) : 0;
        const bTime = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0) : 0;
        return bTime - aTime;
      });
      
      console.log('✅ [getAllStartups] 取得成功（SQLiteから取得）:', sorted.length, '件');
      return sorted;
    } catch (collectionError: any) {
      console.error('📖 [getAllStartups] collection_getエラー:', collectionError);
      return [];
    }
  } catch (error: any) {
    console.error('❌ [getAllStartups] エラー:', error);
    return [];
  }
}

