/**
 * 組織作成Agent
 * 組織の一覧を提示されたら、親組織や子組織の関係を把握して組織を作成するAgent
 */

import { BaseAgent } from '../agent';
import type { Task, TaskExecutionContext, Agent, A2AMessage, A2AMessageType } from '../types';
import { AgentRole, TaskType } from '../types';
import { A2AMessageType as AMT } from '../types';
import { callLLMAPI } from '../llmHelper';

/**
 * 組織作成Agent
 */
export class OrganizationCreationAgent extends BaseAgent {
  constructor(agent?: Partial<Agent>) {
    const defaultAgent: Agent = {
      id: agent?.id || 'organization-creation-agent',
      name: agent?.name || '組織作成Agent',
      description: agent?.description || '組織の一覧を提示されたら、親組織や子組織の関係を把握して組織を作成するAgent。ルート組織IDを指定すると、その組織の傘下で組織を作成します。',
      role: agent?.role || AgentRole.GENERATOR,
      capabilities: agent?.capabilities || [TaskType.GENERATION],
      tools: agent?.tools || ['get_organization_tree', 'create_organization'],
      modelType: agent?.modelType || 'gpt',
      selectedModel: agent?.selectedModel,
      systemPrompt: agent?.systemPrompt || `あなたは組織作成専門のAIエージェントです。
ユーザーから組織の一覧を提示されたら、親組織や子組織の関係を把握して、適切な階層構造で組織を作成します。

**主な機能:**
1. ルート組織IDまたは親組織IDを受け取り、その組織の傘下の組織構造を把握する
2. ユーザーから提示された組織の一覧を解析し、親子関係を理解する
3. 適切な階層構造で組織を作成する（複数の組織を同時に作成可能）

**重要な指示:**
1. **親組織IDの確認:**
   - ユーザーから親組織ID（parentOrganizationId）が指定された場合、その組織の傘下で子組織を作成します
   - ルート組織ID（rootOrganizationId）が指定された場合、その組織の傘下で組織を作成します
   - 親組織IDとルート組織IDの両方が指定された場合、親組織IDを優先します
   - どちらも指定されていない場合、まず組織ツリーを取得して、適切な親組織を確認してください
   - 親組織が見つからない場合、ユーザーに親組織IDを尋ねるか、既存の組織ツリーを確認して適切な親組織を決定してください

2. **組織構造の把握:**
   - get_organization_tree Toolを使用して、指定された親組織またはルート組織の組織ツリーを取得してください
   - 既存の組織構造を確認し、新しい組織をどこに配置すべきかを判断してください
   - 親組織IDが指定されている場合、その組織の直接の子組織として作成してください

3. **組織の作成:**
   - ユーザーから提示された組織の一覧を解析し、親子関係を理解してください
   - 組織名から親子関係を推測する（例: 「営業部」と「営業部第一課」の場合、「営業部」が親、「営業部第一課」が子）
   - 親組織IDが指定されている場合、すべての組織をその親組織の直接の子組織として作成してください
   - 組織の階層レベル（level）を適切に設定してください（親組織のレベル+1）
   - create_organization Toolを使用して、組織を作成してください
   - 親組織を作成してから、その子組織を作成する順序で実行してください
   - 複数の組織を同時に作成できます（同じ親組織の下に複数の子組織を作成）

4. **組織名の解析:**
   - 組織名から親子関係を推測する際は、以下のパターンを考慮してください：
     - 「部」「課」「グループ」「チーム」などの階層を示すキーワード
     - 組織名の包含関係（例: 「営業部」と「営業部第一課」）
     - ユーザーが明示的に親子関係を指定している場合
   - 親組織IDが指定されている場合、提示された組織はすべてその親組織の直接の子組織として扱ってください

5. **エラーハンドリング:**
   - 組織の作成に失敗した場合、エラーメッセージを確認してユーザーに報告してください
   - 親組織が見つからない場合、まず親組織を作成するか、ユーザーに確認してください

**Toolの使用方法:**
- get_organization_tree: 組織ツリーを取得（rootIdを指定可能）
- create_organization: 組織を作成（parentId, name, title, description, level, levelName, position, orgTypeを指定）

**出力形式:**
- 作成された組織の一覧を返してください
- 各組織のID、名前、親組織ID、レベルを含めてください`,
      config: agent?.config || {
        maxConcurrentTasks: 2,
        defaultTimeout: 60000,
        retryPolicy: {
          maxRetries: 1,
          retryDelay: 2000,
          backoffMultiplier: 2,
        },
      },
      createdAt: agent?.createdAt || Date.now(),
      updatedAt: agent?.updatedAt || Date.now(),
    };

    super(defaultAgent);
  }

  /**
   * タスクを実行
   */
  async executeTask(
    task: Task,
    context: TaskExecutionContext
  ): Promise<any> {
    console.log(`[OrganizationCreationAgent] タスク実行開始: ${task.id} (${task.name})`);

    try {
      // タスクパラメータから情報を取得
      const rootOrganizationId = task.parameters?.rootOrganizationId as string | undefined;
      const parentOrganizationId = task.parameters?.parentOrganizationId as string | undefined;
      const organizationList = task.parameters?.organizationList as string | string[] | undefined;
      const organizationData = task.parameters?.organizationData as any | undefined;

      // 組織リストまたは組織データのいずれかが必要
      if (!organizationList && !organizationData) {
        throw new Error('組織リストまたは組織データが必要です');
      }

      // 親組織IDを決定（parentOrganizationIdを優先、なければrootOrganizationId）
      const targetParentId = parentOrganizationId || rootOrganizationId || null;

      // 組織ツリーを取得
      // 組織作成Agentでは、明示的に指定された組織IDのみを使用（context.organizationIdは使用しない）
      const { executeTool } = await import('@/lib/mcp/tools');
      const treeResult = await executeTool({
        tool: 'get_organization_tree',
        arguments: {
          rootId: targetParentId || null,
        },
        context: {
          organizationId: targetParentId || rootOrganizationId || null,
        },
      });

      if (!treeResult.success) {
        throw new Error(treeResult.error || '組織ツリーの取得に失敗しました');
      }

      const existingTree = treeResult.data?.tree;

      // 親組織IDが指定されている場合、その組織を確認
      let targetParentOrg: any = null;
      if (targetParentId) {
        targetParentOrg = this.findOrganizationInTree(existingTree, targetParentId);
        if (!targetParentOrg) {
          // 指定された親組織が見つからない場合、直接取得を試みる
          try {
            const { callTauriCommand } = await import('@/lib/localFirebase');
            const orgResult = await callTauriCommand('get_org', { id: targetParentId });
            if (orgResult && (orgResult as any).id) {
              targetParentOrg = orgResult;
            }
          } catch (error) {
            console.warn(`[OrganizationCreationAgent] 親組織の直接取得に失敗: ${targetParentId}`, error);
          }
        }
        if (!targetParentOrg) {
          throw new Error(`指定された親組織が見つかりません: ${targetParentId}`);
        }
      }

      // 組織リストを解析して組織構造を決定
      console.log(`[OrganizationCreationAgent] 組織リスト解析開始:`, {
        hasOrganizationList: !!organizationList,
        hasOrganizationData: !!organizationData,
        organizationListType: organizationList ? (Array.isArray(organizationList) ? 'array' : 'string') : 'none',
        targetParentId,
      });
      
      const organizationsToCreate = await this.parseOrganizationList(
        organizationList,
        organizationData,
        existingTree,
        targetParentId,
        targetParentOrg
      );

      console.log(`[OrganizationCreationAgent] 組織リスト解析完了:`, {
        count: organizationsToCreate.length,
        organizations: organizationsToCreate.map(org => ({ name: org.name, parentId: org.parentId, level: org.level })),
      });

      if (organizationsToCreate.length === 0) {
        throw new Error('作成する組織が見つかりませんでした。組織リストを確認してください。');
      }

      // 組織を作成（親組織から順に作成）
      const createdOrganizations = [];
      const createdOrgMap = new Map<string, any>(); // 作成済み組織のマップ（ID -> 組織情報）

      // 親組織IDが指定されている場合、すべての組織をその親組織の直接の子組織として作成
      // 親組織IDが指定されていない場合、組織間の親子関係を維持して作成
      const sortedOrgs = targetParentId 
        ? organizationsToCreate.sort((a, b) => a.name.localeCompare(b.name)) // 親組織IDが指定されている場合、名前順にソート
        : organizationsToCreate.sort((a, b) => a.level - b.level); // 親組織IDが指定されていない場合、レベル順にソート

      console.log(`[OrganizationCreationAgent] 組織作成開始: ${sortedOrgs.length}件`);
      
      for (const orgData of sortedOrgs) {
        try {
          console.log(`[OrganizationCreationAgent] 組織作成中: ${orgData.name}`, {
            parentId: orgData.parentId,
            level: orgData.level,
            levelName: orgData.levelName,
          });
          
          // 親組織IDを解決
          let parentId: string | null = null;
          
          if (targetParentId) {
            // 親組織IDが指定されている場合、すべての組織をその親組織の直接の子組織として作成
            parentId = targetParentId;
            // レベルを親組織のレベル+1に設定
            if (targetParentOrg) {
              orgData.level = (targetParentOrg.level || 0) + 1;
              // レベル名を自動設定
              if (!orgData.levelName) {
                orgData.levelName = this.getDefaultLevelName(orgData.level);
              }
            }
          } else {
            // 親組織IDが指定されていない場合、組織間の親子関係を維持
            if (orgData.parentId && createdOrgMap.has(orgData.parentId)) {
              // 親組織が既に作成済みの場合、そのIDを使用
              parentId = createdOrgMap.get(orgData.parentId)!.id;
            } else if (orgData.parentId && !createdOrgMap.has(orgData.parentId)) {
              // 親組織がまだ作成されていない場合、既存の組織ツリーから検索
              const parentOrg = this.findOrganizationInTree(existingTree, orgData.parentId);
              if (parentOrg) {
                parentId = parentOrg.id;
              } else {
                console.warn(`[OrganizationCreationAgent] 親組織が見つかりません: ${orgData.parentId}`);
                // 親組織が見つからない場合、ルート組織の下に作成
                parentId = rootOrganizationId || null;
              }
            } else {
              // 親組織IDが指定されていない場合、ルート組織の下に作成
              parentId = rootOrganizationId || null;
            }
          }

          console.log(`[OrganizationCreationAgent] create_organization Tool呼び出し:`, {
            parentId,
            name: orgData.name,
            level: orgData.level,
            levelName: orgData.levelName,
          });

          const createResult = await executeTool({
            tool: 'create_organization',
            arguments: {
              parentId: parentId,
              name: orgData.name,
              title: orgData.title || null,
              description: orgData.description || null,
              level: orgData.level,
              levelName: orgData.levelName || null,
              position: orgData.position || 0,
              orgType: orgData.orgType || null,
            },
            context: {
              // 組織作成Agentでは、明示的に指定された組織IDのみを使用（context.organizationIdは使用しない）
              organizationId: targetParentId || rootOrganizationId || null,
            },
          });

          console.log(`[OrganizationCreationAgent] create_organization Tool結果:`, {
            success: createResult.success,
            error: createResult.error,
            data: createResult.data,
          });

          if (createResult.success) {
            const createdOrg = createResult.data;
            createdOrganizations.push(createdOrg);
            // 作成済み組織のマップに追加（元のIDまたは名前で検索可能にする）
            if (orgData.originalId) {
              createdOrgMap.set(orgData.originalId, createdOrg);
            }
            createdOrgMap.set(orgData.name, createdOrg);
            console.log(`[OrganizationCreationAgent] 組織を作成しました: ${createdOrg.name} (ID: ${createdOrg.id})`);
          } else {
            console.error(`[OrganizationCreationAgent] 組織の作成に失敗: ${orgData.name}`, createResult.error);
            throw new Error(`組織「${orgData.name}」の作成に失敗しました: ${createResult.error}`);
          }
        } catch (error: any) {
          console.error(`[OrganizationCreationAgent] 組織作成エラー: ${orgData.name}`, error);
          throw error;
        }
      }

      return {
        success: true,
        data: {
          createdOrganizations,
          count: createdOrganizations.length,
          message: `${createdOrganizations.length}件の組織を作成しました`,
        },
      };
    } catch (error: any) {
      console.error(`[OrganizationCreationAgent] タスク実行エラー:`, error);
      throw error;
    }
  }

  /**
   * 組織リストを解析して組織構造を決定
   */
  private async parseOrganizationList(
    organizationList: string | string[] | undefined,
    organizationData: any | undefined,
    existingTree: any,
    targetParentId: string | null,
    targetParentOrg: any | null
  ): Promise<Array<{
    name: string;
    title?: string;
    description?: string;
    parentId?: string;
    level: number;
    levelName: string;
    position: number;
    orgType?: string;
    originalId?: string;
  }>> {
    console.log(`[OrganizationCreationAgent] parseOrganizationList開始:`, {
      hasOrganizationList: !!organizationList,
      hasOrganizationData: !!organizationData,
      organizationListType: organizationList ? (Array.isArray(organizationList) ? 'array' : 'string') : 'none',
      organizationListLength: organizationList ? (Array.isArray(organizationList) ? organizationList.length : (organizationList as string).split('\n').length) : 0,
      targetParentId,
    });

    // 組織データが指定されている場合、それをそのまま使用
    if (organizationData && Array.isArray(organizationData)) {
      console.log(`[OrganizationCreationAgent] organizationDataを使用: ${organizationData.length}件`);
      return organizationData.map((org: any) => ({
        name: org.name,
        title: org.title,
        description: org.description,
        parentId: org.parentId,
        level: org.level || 0,
        levelName: org.levelName || '組織',
        position: org.position || 0,
        orgType: org.orgType,
        originalId: org.id || org.name,
      }));
    }

    // 組織リストが文字列配列の場合
    if (Array.isArray(organizationList)) {
      console.log(`[OrganizationCreationAgent] 文字列配列を解析: ${organizationList.length}件`);
      // LLMを使用して組織構造を解析
      const result = await this.parseOrganizationListWithLLM(
        organizationList,
        existingTree,
        targetParentId,
        targetParentOrg
      );
      console.log(`[OrganizationCreationAgent] LLM解析結果: ${result.length}件`);
      return result;
    }

    // 組織リストが文字列の場合（改行区切りなど）
    if (typeof organizationList === 'string') {
      const orgNames = organizationList
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      console.log(`[OrganizationCreationAgent] 文字列を解析: ${orgNames.length}件`, orgNames);
      const result = await this.parseOrganizationListWithLLM(
        orgNames,
        existingTree,
        targetParentId,
        targetParentOrg
      );
      console.log(`[OrganizationCreationAgent] LLM解析結果: ${result.length}件`);
      return result;
    }

    console.error(`[OrganizationCreationAgent] 組織リストの形式が正しくありません:`, {
      organizationList,
      organizationData,
    });
    throw new Error('組織リストの形式が正しくありません');
  }

  /**
   * LLMを使用して組織リストを解析
   */
  private async parseOrganizationListWithLLM(
    organizationNames: string[],
    existingTree: any,
    targetParentId: string | null,
    targetParentOrg: any | null
  ): Promise<Array<{
    name: string;
    title?: string;
    description?: string;
    parentId?: string;
    level: number;
    levelName: string;
    position: number;
    orgType?: string;
    originalId?: string;
  }>> {
    const { getModelInfo } = await import('../llmHelper');
    const { modelType, selectedModel } = getModelInfo(
      this.agent.modelType,
      this.agent.selectedModel
    );

    const systemPrompt = `あなたは組織構造を解析する専門家です。
ユーザーから提示された組織名の一覧を解析し、親子関係を把握して、適切な階層構造を決定してください。

**重要な指示:**
1. **親組織IDが指定されている場合:**
   - すべての組織をその親組織の直接の子組織として扱ってください
   - 組織間の親子関係は無視し、すべて同じレベル（親組織のレベル+1）として作成してください
   - すべての組織のparentIdは親組織の名前またはIDを指定してください

2. **親組織IDが指定されていない場合:**
   - 組織名から親子関係を推測してください（例: 「営業部」と「営業部第一課」の場合、「営業部」が親、「営業部第一課」が子）
   - 組織の階層レベル（level）を適切に設定してください（0から開始）
   - 親組織が見つからない場合、ルート組織の下に配置してください

3. **レベル名の設定:**
   - レベル名（levelName）を適切に設定してください（例: 本部、部、課、グループ、チーム）
   - 親組織IDが指定されている場合、親組織のレベル+1に応じたレベル名を設定してください

**出力形式:**
JSON配列で、各組織の情報を返してください。以下の形式で返してください：
[
  {
    "name": "組織名",
    "title": "組織タイトル（オプション）",
    "description": "組織の説明（オプション）",
    "parentId": "親組織の名前またはID（オプション、ルート組織の場合はnull）",
    "level": 0,
    "levelName": "本部",
    "position": 0,
    "orgType": "organization"
  },
  ...
]

**注意:**
- parentIdは親組織の名前を指定してください（後でIDに変換されます）
- 親組織を作成してから子組織を作成する順序で配列を返してください
- JSON形式のみを返し、説明文は不要です`;

    const userPrompt = `以下の組織名の一覧を解析して、親子関係を把握し、適切な階層構造で組織を作成するための情報を返してください。

**組織名一覧:**
${organizationNames.map((name, index) => `${index + 1}. ${name}`).join('\n')}

${existingTree ? `**既存の組織構造:**
${JSON.stringify(existingTree, null, 2).substring(0, 2000)}...` : ''}

${targetParentId ? `**親組織ID:**
${targetParentId}
${targetParentOrg ? `親組織名: ${targetParentOrg.name}
親組織レベル: ${targetParentOrg.level || 0}` : ''}` : rootOrganizationId ? `**ルート組織ID:**
${rootOrganizationId}` : `**親組織ID/ルート組織ID:**
指定されていません（既存の組織ツリーから適切な親組織を決定してください）`}

${targetParentId ? `**重要:** 親組織IDが指定されているため、すべての組織をその親組織の直接の子組織として作成してください。組織間の親子関係は無視し、すべて同じレベル（親組織のレベル+1）として扱ってください。` : ''}

上記の組織名一覧を解析し、親子関係を把握して、JSON配列形式で返してください。`;

    try {
      const { callLLMAPI } = await import('../llmHelper');
      const response = await callLLMAPI(
        userPrompt,
        systemPrompt,
        modelType,
        selectedModel
      );

      // JSON応答をパース
      let parsedResponse: any;
      try {
        // コードブロックを除去
        let jsonText = response.trim();
        if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
        }
        parsedResponse = JSON.parse(jsonText);
      } catch (parseError) {
        console.error('[OrganizationCreationAgent] JSONパースエラー:', parseError);
        throw new Error('LLMからの応答をパースできませんでした');
      }

      if (!Array.isArray(parsedResponse)) {
        throw new Error('LLMからの応答が配列形式ではありません');
      }

      return parsedResponse.map((org: any) => {
        // 親組織IDが指定されている場合、すべての組織をその親組織の直接の子組織として扱う
        const finalParentId = targetParentId ? targetParentId : (org.parentId || null);
        const finalLevel = targetParentId && targetParentOrg 
          ? (targetParentOrg.level || 0) + 1 
          : (org.level || 0);
        const finalLevelName = org.levelName || this.getDefaultLevelName(finalLevel);

        return {
          name: org.name,
          title: org.title,
          description: org.description,
          parentId: finalParentId,
          level: finalLevel,
          levelName: finalLevelName,
          position: org.position || 0,
          orgType: org.orgType || 'organization',
          originalId: org.name,
        };
      });
    } catch (error: any) {
      console.error('[OrganizationCreationAgent] LLM解析エラー:', error);
      throw error;
    }
  }

  /**
   * デフォルトのレベル名を取得
   */
  private getDefaultLevelName(level: number): string {
    const levelNames: { [key: number]: string } = {
      0: '本部',
      1: '部',
      2: '課',
      3: 'グループ',
      4: 'チーム',
    };
    return levelNames[level] || `レベル${level}`;
  }

  /**
   * 組織ツリーから組織を検索
   */
  private findOrganizationInTree(tree: any, searchIdOrName: string): any | null {
    if (!tree) return null;

    // IDまたは名前で一致するか確認
    if (tree.id === searchIdOrName || tree.name === searchIdOrName) {
      return tree;
    }

    // 子組織を再帰的に検索
    if (tree.children && Array.isArray(tree.children)) {
      for (const child of tree.children) {
        const found = this.findOrganizationInTree(child, searchIdOrName);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * メッセージを処理
   */
  async handleMessage(message: A2AMessage): Promise<A2AMessage | null> {
    switch (message.type) {
      case AMT.CONFIRMATION:
        // 確認要求への応答（デフォルトで承認）
        return {
          id: `response-${Date.now()}`,
          from: this.agent.id,
          to: message.from,
          type: AMT.RESPONSE,
          taskId: message.taskId,
          payload: { confirmed: true },
          timestamp: Date.now(),
          responseTo: message.id,
          requiresResponse: false,
        };

      case AMT.REQUEST:
        // リクエストへの応答
        return {
          id: `response-${Date.now()}`,
          from: this.agent.id,
          to: message.from,
          type: AMT.RESPONSE,
          taskId: message.taskId,
          payload: { result: 'リクエストを受信しました' },
          timestamp: Date.now(),
          responseTo: message.id,
          requiresResponse: false,
        };

      case AMT.NOTIFICATION:
        // 通知は応答不要
        console.log(`[OrganizationCreationAgent] 通知を受信: ${message.payload.notification}`);
        return null;

      case AMT.STATUS_UPDATE:
        // 状態更新は応答不要
        console.log(`[OrganizationCreationAgent] 状態更新を受信: ${message.payload.status}`);
        return null;

      default:
        console.warn(`[OrganizationCreationAgent] 未知のメッセージタイプ: ${message.type}`);
        return null;
    }
  }
}

