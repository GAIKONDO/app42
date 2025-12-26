'use client';

import React from 'react';
import { CollapsibleSection } from '../common/CollapsibleSection';

/**
 * AIアシスタントセクション
 */
export function AIAssistantSection() {
  return (
    <div>
      <CollapsibleSection 
        title="① モデル選択" 
        defaultExpanded={false}
        id="model-selection-section"
      >
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
            概要
          </h4>
          <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
            AIアシスタントでは、4種類のモデルタイプから選択できます。モデルタイプと具体的なモデルを選択することで、
            異なるAIプロバイダーやローカル環境のモデルを使用できます。
          </p>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            モデルタイプ
          </h4>
          <div style={{ marginBottom: '16px' }}>
            <h5 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
              GPT（OpenAI）
            </h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
              <li>OpenAIのGPTモデルを使用</li>
              <li>デフォルトモデル: <code>gpt-5-mini</code></li>
              <li>利用可能なモデル: <code>gpt-5-mini</code>, <code>gpt-5</code>, <code>gpt-4o</code>, <code>gpt-4o-mini</code>, <code>gpt-4-turbo</code>, <code>gpt-4</code>, <code>gpt-3.5-turbo</code></li>
              <li>APIキーが必要（設定ページで設定）</li>
              <li>クラウドベースで高速な応答</li>
            </ul>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <h5 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
              Gemini（Google）
            </h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
              <li>GoogleのGeminiモデルを使用</li>
              <li>デフォルトモデル: <code>gemini-2.0-flash-exp</code></li>
              <li>利用可能なモデル: <code>gemini-2.0-flash-exp</code>, <code>gemini-1.5-pro</code>, <code>gemini-1.5-flash</code>, <code>gemini-pro</code></li>
              <li>APIキーが必要（設定ページで設定）</li>
              <li>クラウドベースで高速な応答</li>
            </ul>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <h5 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
              Claude（Anthropic）
            </h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
              <li>AnthropicのClaudeモデルを使用</li>
              <li>デフォルトモデル: <code>claude-3-5-sonnet-20241022</code></li>
              <li>利用可能なモデル: <code>claude-3-5-sonnet-20241022</code>, <code>claude-3-5-haiku-20241022</code>, <code>claude-3-opus-20240229</code>, <code>claude-3-sonnet-20240229</code>, <code>claude-3-haiku-20240307</code></li>
              <li>APIキーが必要（設定ページで設定）</li>
              <li>クラウドベースで高速な応答</li>
            </ul>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <h5 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
              ローカル（Ollama）
            </h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
              <li>ローカル環境で実行されるOllamaモデルを使用</li>
              <li>Ollamaサーバーが必要（デフォルト: <code>http://localhost:11434</code>）</li>
              <li>利用可能なモデルはOllamaから動的に取得</li>
              <li>APIキー不要、完全にローカルで実行</li>
              <li>プライバシー保護、オフライン動作可能</li>
            </ul>
          </div>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            モデル選択の流れ
          </h4>
          <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong>モデルタイプ選択:</strong> GPT、Gemini、Claude、またはローカルのいずれかを選択
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>モデル一覧取得:</strong>
              <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                <li>GPT: 定義済みのモデル一覧から選択（<code>components/AIAssistantPanel/constants.ts</code>）</li>
                <li>Gemini: 定義済みのモデル一覧から選択（<code>components/AIAssistantPanel/constants.ts</code>）</li>
                <li>Claude: 定義済みのモデル一覧から選択（<code>components/AIAssistantPanel/constants.ts</code>）</li>
                <li>ローカル: Ollama API（<code>http://localhost:11434/api/tags</code>）から利用可能なモデルを取得</li>
              </ul>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>モデル選択:</strong> 利用可能なモデル一覧から選択
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>状態保存:</strong> 選択したモデルタイプとモデル名を<code>localStorage</code>に保存
              <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                <li><code>aiAssistantModelType</code>: モデルタイプ（gpt/gemini/claude/local）</li>
                <li><code>aiAssistantSelectedModel</code>: 選択されたモデル名</li>
              </ul>
            </li>
          </ol>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            主要な関数・コンポーネント
          </h4>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
            <li><code>useModelSelector()</code>: モデル選択の状態管理フック（<code>components/AIAssistantPanel/hooks/useModelSelector.ts</code>）</li>
            <li><code>ModelSelector</code>: モデル選択UIコンポーネント（<code>components/AIAssistantPanel/components/ModelSelector.tsx</code>）</li>
            <li><code>getAvailableOllamaModels()</code>: Ollamaから利用可能なモデル一覧を取得（<code>lib/pageGeneration.ts</code>）</li>
            <li><code>GPT_MODELS</code>: GPTモデルの定義（<code>components/AIAssistantPanel/constants.ts</code>）</li>
          </ul>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            ローカルモデルの取得
          </h4>
          <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
            ローカルモデルタイプが選択され、モデルセレクターが開かれたときに、Ollama APIから利用可能なモデル一覧を取得します。
          </p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
            <li>APIエンドポイント: <code>http://localhost:11434/api/tags</code>（デフォルト）</li>
            <li>取得したモデル名をフォーマット（例: "qwen2.5:7b" → "Qwen 2.5 7B"）</li>
            <li>モデル一覧が空の場合はエラーメッセージを表示</li>
            <li>最初のモデルを自動選択</li>
          </ul>
        </div>
      </CollapsibleSection>

      <CollapsibleSection 
        title="② AI Agentの選択方法" 
        defaultExpanded={false}
        id="agent-selection-section"
      >
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
            概要
          </h4>
          <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
            AI Agentは、特定のタスクや役割に特化したAIアシスタントです。Agentを選択することで、
            そのAgentのシステムプロンプト、ツール、能力が適用され、より専門的な回答や操作が可能になります。
          </p>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            Agentの種類
          </h4>
          <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '12px', color: 'var(--color-text)' }}>
            システムには以下のデフォルトAgentが用意されています：
          </p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong>汎用Agent（general-agent）:</strong> 様々なタスクタイプに対応できる汎用Agent
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>検索Agent（search-agent）:</strong> 検索タスクに特化したAgent。RAG検索やナレッジグラフ検索を実行
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>分析Agent（analysis-agent）:</strong> 分析タスクに特化したAgent。データやトピックを分析して洞察を抽出
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>生成Agent（generation-agent）:</strong> コンテンツ生成タスクに特化したAgent。テキストやドキュメントの生成を実行
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>検証Agent（validation-agent）:</strong> 検証タスクに特化したAgent。データの整合性や品質を検証
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>議事録Agent（meeting-note-agent）:</strong> 議事録の整形、保存、管理に特化。format_meeting_note_contentツールを使用
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>組織作成Agent（organization-creation-agent）:</strong> 組織情報の作成・管理に特化。create_organizationツールを使用
            </li>
          </ul>
          <p style={{ fontSize: '14px', lineHeight: '1.8', marginTop: '16px', marginBottom: '12px', color: 'var(--color-text)' }}>
            その他：
          </p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong>カスタムAgent:</strong> ユーザーが独自に作成したAgent（/agentsページで作成可能）
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>なし（通常モード）:</strong> Agentを使用せず、汎用的なAIアシスタントとして動作
            </li>
          </ul>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            Agentの読み込み方法
          </h4>
          <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
            Agent一覧は、以下の優先順位で取得されます：
          </p>
          <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong>メモリ内のAgent定義:</strong> <code>agentRegistry.getAllDefinitions()</code>でメモリ内のAgent定義を取得
              <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                <li>アプリ起動時にAgentレジストリに登録されたAgent</li>
                <li>高速に取得可能</li>
              </ul>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>データベースからの取得:</strong> メモリ内にAgentがない場合、SQLiteから取得
              <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                <li><code>loadAllAgents()</code>で<code>agents</code>テーブルから全Agentを取得</li>
                <li>カスタムAgentやユーザーが作成したAgentを含む</li>
              </ul>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>保存されたAgent IDの復元:</strong> <code>localStorage</code>に保存されたAgent IDがあれば、Agent一覧から該当Agentを検索して設定
            </li>
          </ol>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            Agent選択の流れ
          </h4>
          <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong>Agent一覧の読み込み:</strong> アプリ起動時またはAgentセレクターを開いたときにAgent一覧を取得
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>Agent選択:</strong> AgentセレクターからAgentを選択、または「なし」を選択
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>システムプロンプトの適用:</strong> 選択されたAgentのシステムプロンプトがAIアシスタントに適用される
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>ツールの有効化:</strong> Agentが持つツール（MCP Tools）が有効化される
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>状態保存:</strong> 選択されたAgent IDを<code>localStorage</code>に保存（<code>aiAssistantSelectedAgentId</code>）
            </li>
          </ol>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            Agentの構成要素
          </h4>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
            <li><strong>id:</strong> Agentの一意のID</li>
            <li><strong>name:</strong> Agentの名前</li>
            <li><strong>description:</strong> Agentの説明</li>
            <li><strong>role:</strong> Agentの役割</li>
            <li><strong>systemPrompt:</strong> システムプロンプト（Agentの動作を定義）</li>
            <li><strong>tools:</strong> 使用可能なツール（MCP Tools）のリスト</li>
            <li><strong>capabilities:</strong> Agentの能力の説明</li>
            <li><strong>modelType:</strong> 推奨モデルタイプ（gpt/local）</li>
            <li><strong>selectedModel:</strong> 推奨モデル名</li>
          </ul>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            主要な関数・コンポーネント
          </h4>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
            <li><code>useAgentSelector()</code>: Agent選択の状態管理フック（<code>components/AIAssistantPanel/hooks/useAgentSelector.ts</code>）</li>
            <li><code>AgentSelector</code>: Agent選択UIコンポーネント（<code>components/AIAssistantPanel/components/AgentSelector.tsx</code>）</li>
            <li><code>agentRegistry.getAllDefinitions()</code>: メモリ内のAgent定義を取得（<code>lib/agent-system/agentRegistry.ts</code>）</li>
            <li><code>loadAllAgents()</code>: データベースから全Agentを取得（<code>lib/agent-system/agentStorage.ts</code>）</li>
          </ul>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            Agentの作成・管理
          </h4>
          <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
            Agentは<code>/agents</code>ページで作成・編集・削除できます。作成されたAgentは<code>agents</code>テーブルに保存され、
            AIアシスタントのAgentセレクターで選択可能になります。
          </p>
        </div>
      </CollapsibleSection>
    </div>
  );
}

