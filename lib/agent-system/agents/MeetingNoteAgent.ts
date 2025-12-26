/**
 * 議事録編集Agent
 * 議事録の整形、トピック分割、説明文生成に特化したAgent
 */

import { BaseAgent } from '../agent';
import type { Task, TaskExecutionContext, Agent, A2AMessage, A2AMessageType } from '../types';
import { AgentRole, TaskType } from '../types';
import { A2AMessageType as AMT } from '../types';

/**
 * 議事録編集Agent
 */
export class MeetingNoteAgent extends BaseAgent {
  constructor(agent?: Partial<Agent>) {
    const defaultAgent: Agent = {
      id: agent?.id || 'meeting-note-agent',
      name: agent?.name || '議事録編集Agent',
      description: agent?.description || '議事録の内容を整形し、個別トピックに分割するAgent。トピックの説明文、キーワード、セマンティックカテゴリも自動生成します。',
      role: agent?.role || AgentRole.GENERATOR,
      capabilities: agent?.capabilities || [TaskType.GENERATION],
      tools: agent?.tools || ['format_meeting_note_content'],
      modelType: agent?.modelType || 'gpt',
      selectedModel: agent?.selectedModel,
      systemPrompt: agent?.systemPrompt || `あなたは議事録編集専門のAIエージェントです。
ユーザーから提供された議事録テキストを、構造化されたマークダウン形式に整形し、個別トピックに分割します。

**主な機能:**
1. 整形されていない議事録テキストを、読みやすいマークダウン形式に整形
2. 内容を論理的なトピックに分割（---で区切る）
3. 各トピックの説明文（要約）を生成
4. 各トピックのキーワードを抽出
5. 各トピックのセマンティックカテゴリを分類

**出力形式:**
- 整形されたマークダウンテキスト
- トピックは「---」で区切る
- 各トピックには##見出しを付ける
- トピックの説明文、キーワード、カテゴリはメタデータとして管理

**重要な指示:**
- ユーザーから議事録IDが指定された場合、その議事録を編集対象として認識してください
- 議事録IDが指定されていない場合、利用可能な議事録一覧を提示して、ユーザーに議事録IDを尋ねてください
- format_meeting_note_content Toolを使用して、議事録の整形とトピック分割を実行してください`,
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
    console.log(`[MeetingNoteAgent] タスク実行開始: ${task.id} (${task.name})`);

    try {
      // タスクパラメータから議事録IDとコンテンツを取得
      const meetingNoteId = task.parameters?.meetingNoteId as string | undefined;
      const rawContent = task.parameters?.rawContent as string | undefined;

      if (!meetingNoteId && !rawContent) {
        throw new Error('議事録IDまたは生のコンテンツが必要です');
      }

      // format_meeting_note_content Toolを呼び出す
      const { executeTool } = await import('@/lib/mcp/tools');
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
        context: {
          organizationId: context.organizationId,
        },
      });

      if (!toolResult.success) {
        throw new Error(toolResult.error || '議事録整形に失敗しました');
      }

      return {
        success: true,
        data: toolResult.data,
        message: '議事録の整形とトピック分割が完了しました',
      };
    } catch (error: any) {
      console.error(`[MeetingNoteAgent] タスク実行エラー:`, error);
      throw error;
    }
  }
}

