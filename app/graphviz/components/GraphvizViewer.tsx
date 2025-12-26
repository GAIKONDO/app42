/**
 * Graphviz DOTコードをレンダリングするコンポーネント
 * viz.jsを使用してブラウザ上でGraphvizをレンダリング
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface GraphvizViewerProps {
  dotCode: string;
  error?: string;
}

export function GraphvizViewer({ dotCode, error }: GraphvizViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setRenderError(null);
    
    if (error || !dotCode || dotCode.trim() === '') {
      return;
    }

    const renderGraph = async () => {
      if (!containerRef.current) return;

      setIsLoading(true);
      setRenderError(null);

      try {
        // viz.jsを動的インポート
        // 注意: viz.jsのインポート方法はバージョンによって異なる可能性があります
        let Viz: any;
        let Module: any;
        let render: any;

        try {
          // まずviz.jsをインポート
          const vizModule = await import('viz.js');
          Viz = vizModule.default || vizModule;
          
          // full.render.jsを動的インポート
          const fullRenderModule = await import('viz.js/full.render.js');
          Module = fullRenderModule.Module;
          render = fullRenderModule.render;
        } catch (importError: any) {
          // モジュールが見つからない場合は、インストールが必要であることを示す
          if (importError.message?.includes("Can't resolve") || importError.code === 'MODULE_NOT_FOUND') {
            throw new Error('viz.jsがインストールされていません。ターミナルで「npm install viz.js @types/viz.js」を実行してください。');
          }
          throw new Error(`viz.jsの読み込みに失敗しました: ${importError.message}`);
        }
        
        // Graphvizエンジンを初期化
        const viz = new Viz({ Module, render });
        
        // DOTコードをSVGに変換
        const svgString = await viz.renderString(dotCode);

        // コンテナにSVGを設定
        if (containerRef.current) {
          containerRef.current.innerHTML = svgString;
        }
      } catch (err: any) {
        console.error('Graphvizレンダリングエラー:', err);
        const errorMessage = err.message || 'Graphvizのレンダリングに失敗しました。';
        setRenderError(errorMessage);
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      } finally {
        setIsLoading(false);
      }
    };

    renderGraph();
  }, [dotCode, error]);

  if (error) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#FEF2F2',
        border: '1px solid #FCA5A5',
        borderRadius: '8px',
        color: '#991B1B',
        fontSize: '14px',
      }}>
        <strong>エラー:</strong> {error}
      </div>
    );
  }

  if (!dotCode || dotCode.trim() === '') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#999',
        fontSize: '14px',
      }}>
        DOTコードがありません。YAMLを入力してください。
      </div>
    );
  }

  if (renderError) {
    const isInstallError = renderError.includes('インストールされていません') || renderError.includes("Can't resolve");
    
    return (
      <div style={{
        padding: '20px',
        backgroundColor: isInstallError ? '#FEF3C7' : '#FEF2F2',
        border: `1px solid ${isInstallError ? '#FCD34D' : '#FCA5A5'}`,
        borderRadius: '8px',
        color: isInstallError ? '#92400E' : '#991B1B',
        fontSize: '14px',
      }}>
        <strong>{isInstallError ? 'ライブラリ未インストール:' : 'レンダリングエラー:'}</strong> {renderError}
        {isInstallError && (
          <>
            <br />
            <br />
            <div style={{
              padding: '12px',
              backgroundColor: '#FFFFFF',
              borderRadius: '4px',
              marginTop: '8px',
            }}>
              <strong>インストール手順:</strong>
              <ol style={{ marginTop: '8px', paddingLeft: '20px' }}>
                <li>ターミナルを開く</li>
                <li>プロジェクトのルートディレクトリに移動</li>
                <li>以下のコマンドを実行:
                  <pre style={{
                    marginTop: '4px',
                    padding: '8px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                  }}>
                    npm install viz.js @types/viz.js
                  </pre>
                </li>
                <li>開発サーバーを再起動</li>
              </ol>
            </div>
          </>
        )}
        <br />
        <details style={{ marginTop: '8px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 500 }}>DOTコードを表示</summary>
          <pre style={{
            marginTop: '8px',
            padding: '12px',
            backgroundColor: '#F9FAFB',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px',
            fontFamily: 'monospace',
          }}>
            {dotCode}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflow: 'auto',
      border: '1px solid #E5E7EB',
      borderRadius: '8px',
      backgroundColor: '#FFFFFF',
      padding: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {isLoading && (
        <div style={{
          color: '#666',
          fontSize: '14px',
        }}>
          レンダリング中...
        </div>
      )}
      <div 
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    </div>
  );
}
