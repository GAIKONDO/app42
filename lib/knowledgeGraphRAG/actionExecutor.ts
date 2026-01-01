/**
 * アクション実行エンジン
 * クエリ意図に応じて適切なアクションを実行
 */

import type { QueryIntentAnalysis, TargetType } from './queryIntentAnalyzer';
import type { SearchFilters } from './types';

/**
 * アクション実行結果
 */
export interface ActionResult {
  type: 'count' | 'list' | 'search' | 'get';
  data: any;
  metadata?: {
    totalCount?: number;
    filteredCount?: number;
    executionTime?: number;
    targetType?: TargetType;
  };
}

/**
 * アクション実行エンジン
 */
export class ActionExecutor {
  /**
   * クエリ意図に応じてアクションを実行
   */
  async execute(
    intent: QueryIntentAnalysis,
    queryText: string,
    filters?: SearchFilters
  ): Promise<ActionResult> {
    const startTime = Date.now();
    
    try {
      switch (intent.actionType) {
        case 'count':
          return await this.executeCount(intent, filters);
        case 'list':
          return await this.executeList(intent, filters);
        case 'search':
          // 検索は既存のsearchKnowledgeGraphを使用
          return {
            type: 'search',
            data: null,
            metadata: {
              targetType: intent.targetType,
            },
          };
        case 'get':
          return await this.executeGet(intent, filters);
        default:
          // デフォルトは検索
          return {
            type: 'search',
            data: null,
            metadata: {
              targetType: intent.targetType,
            },
          };
      }
    } finally {
      const executionTime = Date.now() - startTime;
      console.log(`[ActionExecutor] アクション実行完了: ${intent.actionType} (${executionTime}ms)`);
    }
  }

  /**
   * カウント取得を実行
   */
  private async executeCount(
    intent: QueryIntentAnalysis,
    filters?: SearchFilters
  ): Promise<ActionResult> {
    const targetType = intent.targetType || 'all';
    const organizationId = filters?.organizationId;
    
    console.log('[ActionExecutor] カウント取得開始:', { targetType, organizationId });
    
    try {
      switch (targetType) {
        case 'startup': {
          const { getStartups, getAllStartups } = await import('../orgApi/startups');
          const startups = organizationId 
            ? await getStartups(organizationId)
            : await getAllStartups();
          return {
            type: 'count',
            data: { count: startups.length },
            metadata: {
              totalCount: startups.length,
              targetType: 'startup',
            },
          };
        }
        
        case 'entity': {
          const { getAllEntities } = await import('../entityApi');
          const allEntities = await getAllEntities();
          // organizationIdでフィルタリング
          const entities = organizationId 
            ? allEntities.filter(e => e.organizationId === organizationId)
            : allEntities;
          return {
            type: 'count',
            data: { count: entities.length },
            metadata: {
              totalCount: entities.length,
              filteredCount: organizationId ? entities.length : allEntities.length,
              targetType: 'entity',
            },
          };
        }
        
        case 'relation': {
          const { getAllRelations } = await import('../relationApi');
          const allRelations = await getAllRelations();
          // organizationIdでフィルタリング
          const relations = organizationId 
            ? allRelations.filter(r => r.organizationId === organizationId)
            : allRelations;
          return {
            type: 'count',
            data: { count: relations.length },
            metadata: {
              totalCount: relations.length,
              filteredCount: organizationId ? relations.length : allRelations.length,
              targetType: 'relation',
            },
          };
        }
        
        case 'topic': {
          // トピックのカウント取得（実装が必要）
          // 現時点では検索結果から推測する必要がある
          return {
            type: 'count',
            data: { count: 0, note: 'トピックのカウント取得は未実装です' },
            metadata: {
              targetType: 'topic',
            },
          };
        }
        
        case 'focusInitiative': {
          const { getDataSourceInstance } = await import('../dataSource');
          const dataSource = getDataSourceInstance();
          const result = await dataSource.collection_get('focusinitiatives', {
            filters: organizationId 
              ? [{ field: 'organizationId', operator: 'eq', value: organizationId }]
              : [],
          });
          const count = Array.isArray(result) ? result.length : 0;
          return {
            type: 'count',
            data: { count },
            metadata: {
              totalCount: count,
              targetType: 'focusInitiative',
            },
          };
        }
        
        case 'meetingNote': {
          const { getAllMeetingNotes } = await import('../orgApi/meetingNotes');
          const allMeetingNotes = await getAllMeetingNotes();
          // organizationIdでフィルタリング
          const meetingNotes = organizationId 
            ? allMeetingNotes.filter(n => n.organizationId === organizationId)
            : allMeetingNotes;
          return {
            type: 'count',
            data: { count: meetingNotes.length },
            metadata: {
              totalCount: meetingNotes.length,
              filteredCount: organizationId ? meetingNotes.length : allMeetingNotes.length,
              targetType: 'meetingNote',
            },
          };
        }
        
        case 'regulation': {
          const { getDataSourceInstance } = await import('../dataSource');
          const dataSource = getDataSourceInstance();
          try {
            const result = await dataSource.collection_get('regulations', {
              filters: organizationId 
                ? [{ field: 'organizationId', operator: 'eq', value: organizationId }]
                : [],
            });
            const count = Array.isArray(result) ? result.length : 0;
            return {
              type: 'count',
              data: { count },
              metadata: {
                totalCount: count,
                targetType: 'regulation',
              },
            };
          } catch (error: any) {
            // regulationsテーブルが存在しない場合
            if (error?.code === 'PGRST205') {
              return {
                type: 'count',
                data: { count: 0 },
                metadata: {
                  totalCount: 0,
                  targetType: 'regulation',
                },
              };
            }
            throw error;
          }
        }
        
        case 'all': {
          // すべてのタイプのカウントを取得
          const counts = await Promise.all([
            this.executeCount({ ...intent, targetType: 'startup' }, filters),
            this.executeCount({ ...intent, targetType: 'entity' }, filters),
            this.executeCount({ ...intent, targetType: 'relation' }, filters),
            this.executeCount({ ...intent, targetType: 'focusInitiative' }, filters),
            this.executeCount({ ...intent, targetType: 'meetingNote' }, filters),
            this.executeCount({ ...intent, targetType: 'regulation' }, filters),
          ]);
          
          const totalCount = counts.reduce((sum, result) => {
            return sum + (result.data.count || 0);
          }, 0);
          
          return {
            type: 'count',
            data: {
              total: totalCount,
              breakdown: {
                startup: counts[0].data.count || 0,
                entity: counts[1].data.count || 0,
                relation: counts[2].data.count || 0,
                focusInitiative: counts[3].data.count || 0,
                meetingNote: counts[4].data.count || 0,
                regulation: counts[5].data.count || 0,
              },
            },
            metadata: {
              totalCount,
              targetType: 'all',
            },
          };
        }
        
        default:
          return {
            type: 'count',
            data: { count: 0, note: `未対応のターゲットタイプ: ${targetType}` },
            metadata: {
              targetType,
            },
          };
      }
    } catch (error) {
      console.error('[ActionExecutor] カウント取得エラー:', error);
      throw error;
    }
  }

  /**
   * 一覧取得を実行
   */
  private async executeList(
    intent: QueryIntentAnalysis,
    filters?: SearchFilters
  ): Promise<ActionResult> {
    const targetType = intent.targetType || 'all';
    const organizationId = filters?.organizationId;
    
    console.log('[ActionExecutor] 一覧取得開始:', { targetType, organizationId });
    
    try {
      switch (targetType) {
        case 'startup': {
          const { getStartups, getAllStartups } = await import('../orgApi/startups');
          const startups = organizationId 
            ? await getStartups(organizationId)
            : await getAllStartups();
          return {
            type: 'list',
            data: startups.map(s => ({
              id: s.id,
              title: s.title,
              description: s.description,
            })),
            metadata: {
              totalCount: startups.length,
              targetType: 'startup',
            },
          };
        }
        
        case 'entity': {
          const { getAllEntities } = await import('../entityApi');
          const allEntities = await getAllEntities();
          // organizationIdでフィルタリング
          const entities = organizationId 
            ? allEntities.filter(e => e.organizationId === organizationId)
            : allEntities;
          return {
            type: 'list',
            data: entities.map(e => ({
              id: e.id,
              name: e.name,
              type: e.type,
            })),
            metadata: {
              totalCount: entities.length,
              filteredCount: organizationId ? entities.length : allEntities.length,
              targetType: 'entity',
            },
          };
        }
        
        case 'relation': {
          const { getAllRelations } = await import('../relationApi');
          const allRelations = await getAllRelations();
          // organizationIdでフィルタリング
          const relations = organizationId 
            ? allRelations.filter(r => r.organizationId === organizationId)
            : allRelations;
          return {
            type: 'list',
            data: relations.map(r => ({
              id: r.id,
              relationType: r.relationType,
              sourceEntityId: r.sourceEntityId,
              targetEntityId: r.targetEntityId,
            })),
            metadata: {
              totalCount: relations.length,
              filteredCount: organizationId ? relations.length : allRelations.length,
              targetType: 'relation',
            },
          };
        }
        
        default:
          return {
            type: 'list',
            data: [],
            metadata: {
              targetType,
            },
          };
      }
    } catch (error) {
      console.error('[ActionExecutor] 一覧取得エラー:', error);
      throw error;
    }
  }

  /**
   * 特定IDでの取得を実行（将来実装）
   */
  private async executeGet(
    intent: QueryIntentAnalysis,
    filters?: SearchFilters
  ): Promise<ActionResult> {
    // 将来実装
    return {
      type: 'get',
      data: null,
      metadata: {
        targetType: intent.targetType,
      },
    };
  }
}

