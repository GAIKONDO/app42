/**
 * 議事録編集Agent詳細コンポーネント
 */

'use client';

import React from 'react';
import type { Agent } from '@/lib/agent-system/types';
import { AgentModelEditor } from './AgentModelEditor';
import { AgentSystemPromptEditor } from './AgentSystemPromptEditor';
import { AgentConfigEditor } from './AgentConfigEditor';
import { ZoomableMermaidDiagram } from '@/components/design/common/ZoomableMermaidDiagram';

interface MeetingNoteAgentDetailProps {
  agent: Agent;
  onUpdate: (updatedAgent: Agent) => void;
}

export function MeetingNoteAgentDetail({ agent, onUpdate }: MeetingNoteAgentDetailProps) {
  const codeSnippet = `export class MeetingNoteAgent extends BaseAgent {
  async executeTask(task: Task, context: TaskExecutionContext): Promise<any> {
    const meetingNoteId = task.parameters?.meetingNoteId as string | undefined;
    const rawContent = task.parameters?.rawContent as string | undefined;

    // format_meeting_note_content Toolを呼び出す
    const toolResult = await executeTool({
      tool: 'format_meeting_note_content',
      arguments: {
        rawContent: rawContent || '',
        meetingNoteId: meetingNoteId,
        options: {
          splitTopics: true,
          generateSummaries: true,
          extractKeywords: true,
          generateSemanticCategory: true,
        },
        modelType: this.agent.modelType,
        selectedModel: this.agent.selectedModel || 'gpt-5-mini',
      },
    });

    return {
      success: true,
      data: toolResult.data,
      message: '議事録の整形とトピック分割が完了しました',
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
    participant MNA as MeetingNoteAgent
    participant Tool as format_meeting_note_content
    participant DB as データベース
    participant LLM as LLM API

    User->>AI: 議事録IDを指定して指示
    AI->>AI: 議事録IDを抽出
    AI->>MNA: Agent実行要求
    MNA->>MNA: パラメータ取得<br/>(meetingNoteId/rawContent)
    alt meetingNoteIdが指定されている場合
        MNA->>DB: getMeetingNoteById(meetingNoteId)
        DB-->>MNA: 議事録データ
        MNA->>MNA: 議事録コンテンツを抽出
    end
    MNA->>Tool: format_meeting_note_content呼び出し
    Tool->>LLM: 議事録整形プロンプト送信
    LLM->>LLM: 整形・トピック分割・メタデータ生成
    LLM-->>Tool: JSON形式の結果
    Tool->>Tool: 結果をパース
    Tool-->>MNA: {formattedContent, topics}
    MNA-->>AI: 整形結果
    AI-->>User: 整形された議事録とトピック一覧`}
            diagramId="meeting-note-agent-flow"
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

    subgraph MeetingNoteAgent["MeetingNoteAgent"]
        direction TB
        MNA1[executeTask]
        MNA2[handleMessage]
    end

    subgraph MCPTool["MCP Tool"]
        direction TB
        TOOL1[format_meeting_note_content]
        TOOL2[議事録取得]
        TOOL3[AI呼び出し]
        TOOL4[結果パース]
    end

    subgraph LLM["LLM API"]
        direction TB
        LLM1[GPT-4]
        LLM2[GPT-5-mini]
        LLM3[Local Model]
    end

    subgraph Database["データベース"]
        direction TB
        DB1[議事録データ]
        DB2[トピックデータ]
    end

    BaseAgent -->|継承| MeetingNoteAgent
    MeetingNoteAgent -->|使用| MCPTool
    MCPTool -->|呼び出し| LLM
    MCPTool -->|読み込み| Database
    TOOL2 -->|取得| DB1
    TOOL3 -->|使用| LLM1
    TOOL3 -->|使用| LLM2
    TOOL3 -->|使用| LLM3
    TOOL4 -->|保存| DB2`}
            diagramId="meeting-note-agent-architecture"
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
            AIアシスタントパネルのAgent選択アイコンから「議事録編集Agent」を選択します。
          </p>

          <p style={{ marginBottom: '12px' }}>
            <strong>2. 議事録IDを指定して指示を出す</strong>
          </p>
          <p style={{ marginBottom: '12px' }}>
            以下のような形式で指示を出します：
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
            <code>この議事録を整形して。議事録ID: meeting-123</code>
          </div>

          <p style={{ marginBottom: '12px' }}>
            <strong>3. 自動処理</strong>
          </p>
          <ul style={{ marginLeft: '20px', marginBottom: '12px' }}>
            <li>AIが議事録IDを抽出</li>
            <li>format_meeting_note_content Toolを自動的に呼び出し</li>
            <li>議事録を整形し、トピックに分割</li>
            <li>各トピックの説明文、キーワード、セマンティックカテゴリを生成</li>
          </ul>

          <p style={{ marginBottom: '12px' }}>
            <strong>4. 議事録IDが指定されていない場合</strong>
          </p>
          <p>
            AIが利用可能な議事録一覧を提示し、ユーザーに議事録IDを尋ねます。
          </p>
        </div>
      </section>
    </div>
  );
}

