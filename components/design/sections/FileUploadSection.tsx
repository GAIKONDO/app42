'use client';

import React from 'react';
import { CollapsibleSection } from '../common/CollapsibleSection';

/**
 * ファイルアップロードセクション
 */
export function FileUploadSection() {
  return (
    <div>
      <CollapsibleSection 
        title="① 個別トピックでのファイルアップロード機能" 
        defaultExpanded={false}
        id="file-upload-topic-section"
      >
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
            概要
          </h4>
          <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
            個別トピックにファイル（画像、PDF、Excel、その他すべてのファイルタイプ）をアップロードする機能です。
            アップロードされたファイルは、トピックに関連付けられ、RAG検索やナレッジグラフで活用できます。
          </p>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            ファイル保存の流れ
          </h4>
          <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong>ファイル選択:</strong> ユーザーがトピックモーダルでファイルを選択
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>ファイル変換:</strong> フロントエンドでファイルを<code>Uint8Array</code>に変換
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>Tauriコマンド呼び出し:</strong> <code>save_topic_file</code>コマンドを呼び出してRust側にファイルデータを送信
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>ファイル保存:</strong> Rust側で以下のディレクトリ構造でファイルを保存
              <pre style={{ 
                backgroundColor: '#1F2937', 
                color: '#FFFFFF', 
                padding: '12px', 
                borderRadius: '6px', 
                fontSize: '12px',
                marginTop: '8px',
                overflowX: 'auto'
              }}>
{`app_data_dir/
  mission-ai-local[-dev]/
    images/
      topics/
        {organizationId}/
          {topicId}/
            {timestamp}_{filename}`}
              </pre>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>SQLite保存:</strong> <code>topicFiles</code>テーブルにファイル情報を保存
              <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                <li>id: ファイルID（主キー）</li>
                <li>topicId: トピックID（外部キー）</li>
                <li>parentTopicId: 親トピックID（階層構造用、NULL可能）</li>
                <li>filePath: ファイルパス</li>
                <li>fileName: ファイル名</li>
                <li>mimeType: MIMEタイプ</li>
                <li>description: ファイルの説明（RAG検索用）</li>
                <li>detailedDescription: 詳細解説（画像の場合、VLMで自動生成可能）</li>
                <li>fileSize: ファイルサイズ（バイト）</li>
                <li>organizationId: 組織ID</li>
                <li>companyId: 事業会社ID</li>
                <li>meetingNoteId: 議事録ID</li>
              </ul>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>topicsテーブル更新:</strong> <code>topics.imagePaths</code>にファイルパスを追加（JSON配列形式）
            </li>
          </ol>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            対応ファイルタイプ
          </h4>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
            <li><strong>画像:</strong> JPEG, PNG, GIF, WebP, SVG</li>
            <li><strong>ドキュメント:</strong> PDF, Word, Excel, PowerPoint</li>
            <li><strong>その他:</strong> すべてのファイルタイプに対応</li>
          </ul>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            主要な関数・コマンド
          </h4>
          <div style={{ marginBottom: '16px' }}>
            <h5 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
              フロントエンド（TypeScript）
            </h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
              <li><code>saveTopicFile()</code>: ファイルをトピックに保存（<code>lib/topicImages.ts</code>）</li>
              <li><code>getTopicImagePaths()</code>: トピックに紐づくファイルパスを取得</li>
              <li><code>getChildTopicFiles()</code>: 子トピックとして扱われるファイルを取得</li>
              <li><code>deleteTopicImage()</code>: ファイルを削除</li>
            </ul>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <h5 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
              バックエンド（Rust）
            </h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
              <li><code>save_topic_file</code>: Tauriコマンド（<code>src-tauri/src/commands/fs.rs</code>）</li>
              <li>ファイルをディスクに保存</li>
              <li>SQLiteの<code>topicFiles</code>テーブルにメタデータを保存</li>
            </ul>
          </div>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            階層構造のサポート
          </h4>
          <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
            ファイルは<code>parentTopicId</code>を使用して、親トピックの子トピックとして扱うことができます。
            これにより、トピックの階層構造を構築し、ファイルを整理できます。
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection 
        title="② 画像ファイルの説明の追加の仕組み" 
        defaultExpanded={false}
        id="image-description-section"
      >
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text)' }}>
            概要
          </h4>
          <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
            画像ファイルには、RAG検索で使用される説明文（<code>description</code>）と詳細解説（<code>detailedDescription</code>）を追加できます。
            説明文は手動入力またはVLM（Vision Language Model）で自動生成できます。
          </p>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            説明文の種類
          </h4>
          <div style={{ marginBottom: '16px' }}>
            <h5 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
              description（簡潔な説明）
            </h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
              <li>RAG検索で使用される簡潔な説明文</li>
              <li>100文字程度を推奨</li>
              <li>重要なキーワードを含める</li>
              <li>検索しやすい形式</li>
            </ul>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <h5 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text)' }}>
              detailedDescription（詳細解説）
            </h5>
            <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
              <li>画像の詳細な分析結果</li>
              <li>主要な被写体、背景、視覚的特徴、文脈などを含む</li>
              <li>VLMで自動生成される場合、包括的な説明が生成される</li>
            </ul>
          </div>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            VLMによる自動生成
          </h4>
          <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
            画像ファイルをアップロードする際、<code>autoGenerateDescription</code>オプションを有効にすると、
            VLM（Vision Language Model）を使用して画像の説明を自動生成できます。
          </p>

          <h5 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', marginTop: '16px', color: 'var(--color-text)' }}>
            対応VLM
          </h5>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
            <li><strong>GPT-4 Vision（OpenAI）:</strong> デフォルト、高精度な説明を生成</li>
            <li><strong>Liquid AI（ローカルVLM）:</strong> Ollama経由または直接使用</li>
            <li><strong>LFM2-VL-1.6B:</strong> ローカル実行可能な軽量モデル</li>
          </ul>

          <h5 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', marginTop: '16px', color: 'var(--color-text)' }}>
            自動生成の流れ
          </h5>
          <ol style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong>画像をBase64エンコード:</strong> フロントエンドで画像をBase64形式に変換
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>VLM API呼び出し:</strong> 選択されたVLM（GPT-4 VisionまたはLiquid AI）に画像とプロンプトを送信
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>説明文生成:</strong> VLMが画像を分析して説明文を生成
              <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                <li>GPT-4 Vision: 簡潔な説明と詳細解説の2つを生成</li>
                <li>Liquid AI: 簡潔な説明を生成（詳細解説は手動入力）</li>
              </ul>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>説明文保存:</strong> 生成された説明文を<code>topicFiles</code>テーブルに保存
            </li>
          </ol>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            既存画像への説明追加
          </h4>
          <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
            既にアップロードされた画像ファイルに対して、後から説明を追加または更新できます。
          </p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
            <li><code>generateDescriptionForExistingImage()</code>: 既存画像の説明をVLMで自動生成</li>
            <li><code>updateTopicFileDescription()</code>: 説明文を手動で更新</li>
          </ul>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            RAG検索での活用
          </h4>
          <p style={{ fontSize: '14px', lineHeight: '1.8', marginBottom: '16px', color: 'var(--color-text)' }}>
            画像の説明文は、RAG検索で活用されます。説明文に含まれるキーワードで画像を検索できるため、
            適切な説明文を追加することで、画像の検索性が向上します。
          </p>

          <h4 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', marginTop: '24px', color: 'var(--color-text)' }}>
            主要な関数
          </h4>
          <ul style={{ marginLeft: '20px', lineHeight: '1.8', fontSize: '14px', color: 'var(--color-text)' }}>
            <li><code>generateImageDescription()</code>: 画像の説明をVLMで生成（<code>lib/topicImages.ts</code>）</li>
            <li><code>generateImageDescriptionWithGPT4Vision()</code>: GPT-4 Visionで説明を生成</li>
            <li><code>generateImageDescriptionWithLiquidAI()</code>: Liquid AIで説明を生成</li>
            <li><code>generateDescriptionForExistingImage()</code>: 既存画像の説明を生成</li>
            <li><code>updateTopicFileDescription()</code>: 説明文を更新</li>
          </ul>
        </div>
      </CollapsibleSection>
    </div>
  );
}

