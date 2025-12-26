/**
 * 組織作成Agent詳細コンポーネント
 */

'use client';

import React from 'react';
import type { Agent } from '@/lib/agent-system/types';
import { AgentModelEditor } from './AgentModelEditor';
import { AgentSystemPromptEditor } from './AgentSystemPromptEditor';
import { AgentConfigEditor } from './AgentConfigEditor';
import { ZoomableMermaidDiagram } from '@/components/design/common/ZoomableMermaidDiagram';

interface OrganizationCreationAgentDetailProps {
  agent: Agent;
  onUpdate: (updatedAgent: Agent) => void;
}

export function OrganizationCreationAgentDetail({ agent, onUpdate }: OrganizationCreationAgentDetailProps) {
  const codeSnippet = `export class OrganizationCreationAgent extends BaseAgent {
  async executeTask(task: Task, context: TaskExecutionContext): Promise<any> {
    const rootOrganizationId = task.parameters?.rootOrganizationId as string | undefined;
    const organizationList = task.parameters?.organizationList as string | string[] | undefined;

    // 組織ツリーを取得
    const treeResult = await executeTool({
      tool: 'get_organization_tree',
      arguments: {
        rootId: rootOrganizationId || null,
      },
    });

    // 組織リストを解析して組織構造を決定
    const organizationsToCreate = await this.parseOrganizationListWithLLM(
      organizationList,
      existingTree,
      rootOrganizationId
    );

    // 組織を作成（親組織から順に作成）
    const createdOrganizations = [];
    for (const orgData of sortedOrgs) {
      const createResult = await executeTool({
        tool: 'create_organization',
        arguments: {
          parentId: orgData.parentId,
          name: orgData.name,
          level: orgData.level,
          levelName: orgData.levelName,
        },
      });
      createdOrganizations.push(createResult.data);
    }

    return {
      success: true,
      data: {
        createdOrganizations,
        count: createdOrganizations.length,
      },
    };
  }
}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 基本情報 */}
      <section>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--color-border-color)',
          }}
        >
          基本情報
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            fontSize: '14px',
          }}
        >
          <div>
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>ID:</span>
            <span style={{ marginLeft: '8px', color: 'var(--color-text)' }}>{agent.id}</span>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>役割:</span>
            <span style={{ marginLeft: '8px', color: 'var(--color-text)' }}>{agent.role}</span>
          </div>
          {onUpdate ? (
            <div>
              <AgentModelEditor agent={agent} onUpdate={onUpdate} />
            </div>
          ) : (
            <div>
              <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>モデル:</span>
              <span style={{ marginLeft: '8px', color: 'var(--color-text)' }}>{agent.modelType}</span>
            </div>
          )}
        </div>
        <div style={{ marginTop: '12px' }}>
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>説明:</span>
          <p style={{ marginTop: '4px', color: 'var(--color-text)', lineHeight: '1.6' }}>
            {agent.description}
          </p>
        </div>
        <div style={{ marginTop: '12px' }}>
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>能力:</span>
          <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {agent.capabilities && agent.capabilities.length > 0 ? (
              agent.capabilities.map((capability) => (
                <span
                  key={capability}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {capability}
                </span>
              ))
            ) : (
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>なし</span>
            )}
          </div>
        </div>
        <div style={{ marginTop: '12px' }}>
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>利用可能なTool:</span>
          <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {agent.tools && agent.tools.length > 0 ? (
              agent.tools.map((tool) => (
                <span
                  key={tool}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: 'var(--color-secondary-light)',
                    color: 'var(--color-secondary)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {tool}
                </span>
              ))
            ) : (
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>なし</span>
            )}
          </div>
        </div>
      </section>

      {/* システムプロンプト */}
      {onUpdate && (
        <section>
          <AgentSystemPromptEditor agent={agent} onUpdate={onUpdate} />
        </section>
      )}

      {/* 設定 */}
      {onUpdate && (
        <section>
          <AgentConfigEditor agent={agent} onUpdate={onUpdate} />
        </section>
      )}

      {/* アクションフロー */}
      <section>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--color-border-color)',
          }}
        >
          アクションフロー
        </h3>
        <div
          style={{
            padding: '16px',
            background: 'var(--color-surface)',
            borderRadius: '8px',
            border: '1px solid var(--color-border-color)',
          }}
        >
          <ZoomableMermaidDiagram
            mermaidCode={`sequenceDiagram
    participant User as ユーザー
    participant AI as AIアシスタント
    participant OCA as OrganizationCreationAgent
    participant TreeTool as get_organization_tree
    participant LLM as LLM API
    participant CreateTool as create_organization
    participant DB as データベース

    User->>AI: 組織一覧を提示
    AI->>AI: ルート組織IDを確認
    AI->>OCA: Agent実行要求
    OCA->>TreeTool: 組織ツリー取得
    TreeTool->>DB: 組織データ取得
    DB-->>TreeTool: 組織ツリー
    TreeTool-->>OCA: 組織ツリー
    OCA->>LLM: 組織リストを解析
    LLM->>LLM: 親子関係を推測
    LLM-->>OCA: 組織構造データ
    OCA->>OCA: レベル順にソート
    loop 各組織を作成
        OCA->>CreateTool: 組織作成
        CreateTool->>DB: 組織を保存
        DB-->>CreateTool: 作成結果
        CreateTool-->>OCA: 作成された組織
    end
    OCA-->>AI: 作成結果
    AI-->>User: 組織作成完了`}
            diagramId="organization-creation-agent-flow"
          />
        </div>
      </section>

      {/* アーキテクチャ */}
      <section>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--color-border-color)',
          }}
        >
          アーキテクチャ
        </h3>
        <div
          style={{
            padding: '16px',
            background: 'var(--color-surface)',
            borderRadius: '8px',
            border: '1px solid var(--color-border-color)',
          }}
        >
          <ZoomableMermaidDiagram
            mermaidCode={`flowchart TB
    subgraph BaseAgent["BaseAgent (基底クラス)"]
        direction TB
        BA1[getAgent]
        BA2[canExecuteTask]
        BA3[addLog]
    end

    subgraph OrganizationCreationAgent["OrganizationCreationAgent"]
        direction TB
        OCA1[executeTask]
        OCA2[parseOrganizationList]
        OCA3[parseOrganizationListWithLLM]
        OCA4[findOrganizationInTree]
        OCA5[handleMessage]
    end

    subgraph MCPTool["MCP Tool"]
        direction TB
        TOOL1[get_organization_tree]
        TOOL2[create_organization]
    end

    subgraph LLM["LLM API"]
        direction TB
        LLM1[GPT-4]
        LLM2[GPT-5-mini]
        LLM3[Local Model]
    end

    subgraph Database["データベース"]
        direction TB
        DB1[組織データ]
        DB2[組織ツリー]
    end

    BaseAgent -->|継承| OrganizationCreationAgent
    OrganizationCreationAgent -->|使用| MCPTool
    OrganizationCreationAgent -->|呼び出し| LLM
    MCPTool -->|読み込み| Database
    TOOL1 -->|取得| DB2
    TOOL2 -->|保存| DB1
    OCA3 -->|使用| LLM1
    OCA3 -->|使用| LLM2
    OCA3 -->|使用| LLM3`}
            diagramId="organization-creation-agent-architecture"
          />
        </div>
      </section>

      {/* 実装コード */}
      <section>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--color-border-color)',
          }}
        >
          実装コード
        </h3>
        <div
          style={{
            backgroundColor: 'var(--color-code-background)',
            borderRadius: '8px',
            padding: '16px',
            overflow: 'auto',
          }}
        >
          <pre
            style={{
              margin: 0,
              fontSize: '13px',
              lineHeight: '1.6',
              color: 'var(--color-code-text)',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            <code>{codeSnippet}</code>
          </pre>
        </div>
      </section>

      {/* 使用方法 */}
      <section>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text)',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid var(--color-border-color)',
          }}
        >
          使用方法
        </h3>
        <div style={{ color: 'var(--color-text)', lineHeight: '1.8', fontSize: '14px' }}>
          <p style={{ marginBottom: '12px' }}>
            <strong>1. AIアシスタントパネルでAgentを選択</strong>
          </p>
          <p style={{ marginBottom: '12px' }}>
            AIアシスタントパネルのAgent選択アイコンから「組織作成Agent」を選択します。
          </p>

          <p style={{ marginBottom: '12px' }}>
            <strong>2. 組織一覧を提示して指示を出す</strong>
          </p>
          <p style={{ marginBottom: '12px' }}>
            以下のような形式で指示を出します：
          </p>
          
          <p style={{ marginBottom: '8px', fontWeight: 500 }}>ルート組織の下に作成する場合:</p>
          <div
            style={{
              backgroundColor: 'var(--color-code-background)',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '12px',
              fontSize: '13px',
              fontFamily: 'monospace',
            }}
          >
            <code>以下の組織を作成して。ルート組織ID: org-123{'\n'}営業部{'\n'}営業部第一課{'\n'}営業部第二課{'\n'}開発部{'\n'}開発部フロントエンドチーム</code>
          </div>

          <p style={{ marginBottom: '8px', fontWeight: 500 }}>特定の組織の下に子組織として作成する場合:</p>
          <div
            style={{
              backgroundColor: 'var(--color-code-background)',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '12px',
              fontSize: '13px',
              fontFamily: 'monospace',
            }}
          >
            <code>以下の組織を作成して。親組織ID: org-456{'\n'}第一課{'\n'}第二課{'\n'}第三課</code>
          </div>
          <p style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            ※ 親組織IDを指定すると、すべての組織がその親組織の直接の子組織として作成されます。複数の組織を同時に作成できます。
          </p>

          <p style={{ marginBottom: '12px' }}>
            <strong>3. 自動処理</strong>
          </p>
          <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
            <li>AIがルート組織IDを抽出（指定されていない場合は既存の組織ツリーを確認）</li>
            <li>get_organization_tree Toolで組織ツリーを取得</li>
            <li>LLMで組織名から親子関係を推測</li>
            <li>親組織から順にcreate_organization Toolで組織を作成</li>
          </ul>

          <p style={{ marginBottom: '12px' }}>
            <strong>4. タスクパラメータ</strong>
          </p>
          <div
            style={{
              backgroundColor: 'var(--color-code-background)',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '12px',
              fontSize: '13px',
              fontFamily: 'monospace',
            }}
          >
            <code>{`{
  rootOrganizationId?: string;  // ルート組織ID（オプション）
  parentOrganizationId?: string;  // 親組織ID（オプション、rootOrganizationIdより優先）
  organizationList?: string | string[];  // 組織名の一覧
  organizationData?: Array<{
    name: string;
    title?: string;
    description?: string;
    parentId?: string;
    level?: number;
    levelName?: string;
    position?: number;
    orgType?: string;
  }>;  // 組織データ（オプション）
}`}</code>
          </div>
          <p style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            ※ parentOrganizationIdが指定されている場合、すべての組織がその親組織の直接の子組織として作成されます。
          </p>
        </div>
      </section>
    </div>
  );
}

