'use client';

import { useRef } from 'react';
import { usePlantUMLRendering } from './hooks/usePlantUMLRendering';
import { useSVGClickSelection } from './hooks/useSVGClickSelection';
import { useSelectedNodeHighlight } from './hooks/useSelectedNodeHighlight';

interface PlantUMLDiagramProps {
  diagramCode: string;
  diagramId: string;
  format?: 'svg' | 'png'; // 出力形式（デフォルトはSVG）
  serverUrl?: string; // PlantUMLサーバーのURL（オフライン時のみ使用、デフォルトは公式サーバー）
  useOffline?: boolean; // オフライン実装を使用するか（デフォルト: Tauri環境を自動検出）
  onNodeClick?: (nodeId: string, event: MouseEvent) => void; // ノードクリック時のコールバック（組織IDを渡す）
  selectedNodeId?: string | null; // 選択されたノードのID（このノードを青く表示する）
  orgNameToIdMap?: Map<string, string>; // 組織名からIDへのマッピング（rect要素にIDを保存するために使用）
}

export default function PlantUMLDiagram({
  diagramCode,
  diagramId,
  format = 'svg',
  serverUrl = 'https://www.plantuml.com/plantuml',
  useOffline,
  onNodeClick,
  selectedNodeId,
  orgNameToIdMap,
}: PlantUMLDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // PlantUML図のレンダリング
  const { loading, error, svgContent, imageUrl } = usePlantUMLRendering({
    diagramCode,
    diagramId,
    format,
    serverUrl,
    useOffline,
  });

  // SVGにクリック選択効果を追加
  useSVGClickSelection({
    svgContent,
    containerRef,
    onNodeClick,
    orgNameToIdMap,
  });

  // selectedNodeIdが変更されたときに、該当するノードを青くする
  useSelectedNodeHighlight({
    selectedNodeId,
    svgContent,
    containerRef,
    orgNameToIdMap,
  });

  return (
    <div
      ref={containerRef}
      className="plantuml-diagram-container"
      style={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'auto',
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid var(--color-border-color)',
        marginBottom: '32px',
        minHeight: loading ? '200px' : 'auto',
        display: 'flex',
        alignItems: loading ? 'center' : 'flex-start',
        justifyContent: loading ? 'center' : 'flex-start',
      }}
    >
      {loading && !error && (
        <div style={{
          color: '#6B7280',
          fontSize: '14px',
          textAlign: 'center',
        }}>
          読み込み中...
        </div>
      )}
      
      {error && (
        <div style={{
          padding: '20px',
          color: '#EF4444',
          border: '1px solid #EF4444',
          borderRadius: '6px',
          backgroundColor: '#FEE2E2',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            PlantUML図のレンダリングに失敗しました
          </div>
          <div style={{ fontSize: '14px', marginBottom: '12px', wordBreak: 'break-word' }}>
            {error}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #FCA5A5' }}>
            <div style={{ marginBottom: '4px' }}><strong>対処法:</strong></div>
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              <li>PlantUMLコードの構文を確認してください</li>
              <li>@startuml と @enduml が正しく記述されているか確認してください</li>
              <li>ブラウザのコンソール（F12）で詳細なエラー情報を確認してください</li>
            </ul>
          </div>
        </div>
      )}
      
      {!loading && !error && svgContent && (
        <div
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{
            width: '100%',
            maxWidth: '100%',
          }}
        />
      )}
      
      {!loading && !error && imageUrl && (
        <img
          src={imageUrl}
          alt="PlantUML Diagram"
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: 'block',
          }}
          onLoad={() => {
            // 画像の読み込み完了時の処理（必要に応じて）
          }}
          onError={() => {
            // 画像の読み込みエラー時の処理（必要に応じて）
          }}
        />
      )}
    </div>
  );
}
