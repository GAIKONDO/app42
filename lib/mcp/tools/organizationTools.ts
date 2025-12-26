/**
 * 組織作成用MCP Tool
 * 組織ツリーの取得と組織の作成を行う
 */

import type { MCPToolImplementation, MCPToolRequest, MCPToolResult } from '../tools';
import { getOrgTreeFromDb, createOrg } from '@/lib/orgApi';
import { callTauriCommand } from '@/lib/localFirebase';

/**
 * 組織ツリー取得Tool
 */
class GetOrganizationTreeTool implements MCPToolImplementation {
  name = 'get_organization_tree';
  description = '指定されたルート組織IDの組織ツリーを取得します。ルート組織IDが指定されない場合は、すべてのルート組織のツリーを取得します。';
  arguments = [
    { name: 'rootId', type: 'string' as const, description: 'ルート組織ID（オプション）', required: false },
  ];
  returns = {
    type: 'object' as const,
    description: '組織ツリー（階層構造を含む）',
  };

  async execute(request: MCPToolRequest): Promise<MCPToolResult> {
    const { rootId } = request.arguments;
    
    try {
      console.log('[GetOrganizationTreeTool] 組織ツリー取得開始:', { rootId });
      
      // 組織ツリーを取得
      const orgTree = await getOrgTreeFromDb(rootId as string | undefined);
      
      if (!orgTree) {
        return {
          success: false,
          error: rootId 
            ? `指定されたルート組織が見つかりません: ${rootId}`
            : '組織ツリーが見つかりませんでした',
        };
      }

      // 組織ツリーを再帰的にシリアライズ（循環参照を避ける）
      const serializeOrgTree = (node: any): any => {
        return {
          id: node.id,
          name: node.name,
          title: node.title || null,
          description: node.description || null,
          level: node.level,
          levelName: node.levelName,
          position: node.position,
          type: node.type || 'organization',
          parentId: node.parentId || null,
          children: node.children ? node.children.map(serializeOrgTree) : [],
          members: node.members || [],
        };
      };

      const serializedTree = serializeOrgTree(orgTree);

      return {
        success: true,
        data: {
          rootId: rootId || null,
          tree: serializedTree,
          message: '組織ツリーを取得しました',
        },
        metadata: {
          source: this.name,
        },
      };
    } catch (error: any) {
      console.error('[GetOrganizationTreeTool] エラー:', error);
      return {
        success: false,
        error: error.message || '組織ツリーの取得に失敗しました',
        metadata: {
          source: this.name,
        },
      };
    }
  }
}

/**
 * 組織作成Tool
 */
class CreateOrganizationTool implements MCPToolImplementation {
  name = 'create_organization';
  description = '新しい組織を作成します。親組織IDを指定すると、その組織の傘下に子組織として作成されます。複数の組織を作成する場合は、このToolを複数回呼び出してください。';
  arguments = [
    { name: 'parentId', type: 'string' as const, description: '親組織ID（ルート組織の場合はnull）。親組織IDを指定すると、その組織の直接の子組織として作成されます。', required: false },
    { name: 'name', type: 'string' as const, description: '組織名（必須）', required: true },
    { name: 'title', type: 'string' as const, description: '組織タイトル（オプション）', required: false },
    { name: 'description', type: 'string' as const, description: '組織の説明（オプション）', required: false },
    { name: 'level', type: 'number' as const, description: '組織レベル（0から開始、デフォルト: 親組織のレベル+1）', required: false },
    { name: 'levelName', type: 'string' as const, description: 'レベル名（例: 本部、部、課、グループ）。指定しない場合は自動設定されます。', required: false },
    { name: 'position', type: 'number' as const, description: '位置（デフォルト: 0）', required: false, default: 0 },
    { name: 'orgType', type: 'string' as const, description: '組織タイプ（デフォルト: organization）', required: false },
  ];
  returns = {
    type: 'object' as const,
    description: '作成された組織情報',
  };

  async execute(request: MCPToolRequest): Promise<MCPToolResult> {
    const { parentId, name, title, description, level, levelName, position, orgType } = request.arguments;
    
    if (!name || (typeof name === 'string' && name.trim().length === 0)) {
      return {
        success: false,
        error: '組織名が必要です',
      };
    }

    try {
      console.log('[CreateOrganizationTool] 組織作成開始:', {
        parentId: parentId as string | null,
        name: name as string,
        title: title as string | null,
        description: description as string | null,
        level: level as number | null,
        levelName: levelName as string | null,
        position: position as number | null,
        orgType: orgType as string | null,
      });

      // 親組織の情報を取得してレベルを決定
      let finalLevel = level as number | null;
      let finalLevelName = levelName as string | null;
      
      if (parentId && typeof parentId === 'string') {
        try {
          // 親組織を取得
          const parentOrg = await callTauriCommand('get_org', { id: parentId });
          if (parentOrg && (parentOrg as any).id) {
            const parent = parentOrg as any;
            // レベルが指定されていない場合、親組織のレベル+1
            if (finalLevel === null || finalLevel === undefined) {
              finalLevel = (parent.level || 0) + 1;
            }
            // レベル名が指定されていない場合、デフォルトのレベル名を生成
            if (!finalLevelName) {
              finalLevelName = getDefaultLevelName(finalLevel);
            }
          }
        } catch (error) {
          console.warn('[CreateOrganizationTool] 親組織の取得に失敗しましたが、続行します:', error);
        }
      } else {
        // ルート組織の場合
        if (finalLevel === null || finalLevel === undefined) {
          finalLevel = 0;
        }
        if (!finalLevelName) {
          finalLevelName = getDefaultLevelName(finalLevel);
        }
      }

      // 組織を作成
      const result = await createOrg(
        (parentId as string) || null,
        name as string,
        title as string || null,
        description as string || null,
        finalLevel || 0,
        finalLevelName || '組織',
        (position as number) || 0,
        orgType as string || undefined
      );

      console.log('[CreateOrganizationTool] 組織作成成功:', {
        id: result.id,
        name: result.name,
        level: result.level,
        parentId: result.parentId || null,
      });

      // 組織作成成功時にカスタムイベントを発火（組織ページの自動更新用）
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('organizationCreated', {
          detail: {
            organizationId: result.id,
            organizationName: result.name,
            parentId: result.parentId || null,
          },
        });
        window.dispatchEvent(event);
        console.log('[CreateOrganizationTool] 組織作成イベントを発火:', {
          organizationId: result.id,
          organizationName: result.name,
        });
      }

      return {
        success: true,
        data: {
          id: result.id,
          name: result.name,
          title: result.title || null,
          description: result.description || null,
          level: result.level,
          levelName: result.levelName,
          position: result.position,
          parentId: result.parentId || null,
          type: result.type || 'organization',
          message: `組織「${result.name}」を作成しました${result.parentId ? `（親組織ID: ${result.parentId}）` : ''}`,
        },
        metadata: {
          source: this.name,
        },
      };
    } catch (error: any) {
      console.error('[CreateOrganizationTool] エラー:', error);
      return {
        success: false,
        error: error.message || '組織の作成に失敗しました',
        metadata: {
          source: this.name,
        },
      };
    }
  }
}

/**
 * デフォルトのレベル名を取得
 */
function getDefaultLevelName(level: number): string {
  const levelNames: { [key: number]: string } = {
    0: '本部',
    1: '部',
    2: '課',
    3: 'グループ',
    4: 'チーム',
  };
  return levelNames[level] || `レベル${level}`;
}

export const getOrganizationTreeTool = new GetOrganizationTreeTool();
export const createOrganizationTool = new CreateOrganizationTool();

