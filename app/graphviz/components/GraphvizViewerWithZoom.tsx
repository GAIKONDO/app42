/**
 * Graphviz DOTコードをレンダリングするコンポーネント（全画面表示・ズーム機能付き）
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface GraphvizViewerWithZoomProps {
  dotCode: string;
  error?: string;
}

export function GraphvizViewerWithZoom({ dotCode, error }: GraphvizViewerWithZoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenScrollContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenContentRef = useRef<HTMLDivElement>(null);

  // 通常表示用のレンダリング
  useEffect(() => {
    console.log('🔄 [GraphvizViewerWithZoom] useEffect実行', {
      hasDotCode: !!dotCode,
      dotCodeLength: dotCode?.length || 0,
      hasError: !!error,
      error: error,
    });
    
    setRenderError(null);
    
    if (error || !dotCode || dotCode.trim() === '') {
      console.warn('⚠️ [GraphvizViewerWithZoom] DOTコードが空またはエラーがあります', {
        hasError: !!error,
        error: error,
        hasDotCode: !!dotCode,
        dotCodeLength: dotCode?.length || 0,
      });
      return;
    }

    const renderGraph = async () => {
      if (!containerRef.current) return;

      setIsLoading(true);
      setRenderError(null);

      try {
        // viz.jsを動的インポート
        let Viz: any;
        let Module: any;
        let render: any;

        try {
          const vizModule = await import('viz.js');
          Viz = vizModule.default || vizModule;
          
          const fullRenderModule = await import('viz.js/full.render.js');
          Module = fullRenderModule.Module;
          render = fullRenderModule.render;
        } catch (importError: any) {
          if (importError.message?.includes("Can't resolve") || importError.code === 'MODULE_NOT_FOUND') {
            throw new Error('viz.jsがインストールされていません。ターミナルで「npm install viz.js @types/viz.js」を実行してください。');
          }
          throw new Error(`viz.jsの読み込みに失敗しました: ${importError.message}`);
        }
        
        const viz = new Viz({ Module, render });
        let svgString = await viz.renderString(dotCode);

        // SVGをコンテナの幅に合わせて調整
        if (containerRef.current) {
          const container = containerRef.current;
          // 親要素の幅を取得（padding分を考慮）
          const parentElement = container.parentElement?.parentElement;
          const containerWidth = parentElement?.clientWidth || container.offsetWidth || 800;
          const availableWidth = containerWidth - 32; // padding分を引く
          
          // SVGのwidth属性とheight属性を取得
          const widthMatch = svgString.match(/width="([^"]+)"/);
          const heightMatch = svgString.match(/height="([^"]+)"/);
          
          if (widthMatch && heightMatch) {
            const originalWidth = parseFloat(widthMatch[1]);
            const originalHeight = parseFloat(heightMatch[1]);
            
            if (originalWidth > 0) {
              // コンテナの幅に合わせてスケール
              const scale = Math.min(1, availableWidth / originalWidth);
              const newWidth = originalWidth * scale;
              const newHeight = originalHeight * scale;
              
              // widthとheightを更新
              svgString = svgString.replace(
                /width="([^"]+)"/,
                `width="${newWidth}"`
              );
              svgString = svgString.replace(
                /height="([^"]+)"/,
                `height="${newHeight}"`
              );
            }
          }
          
          // viewBoxを追加してレスポンシブにする（既存のviewBoxがある場合は保持）
          if (!svgString.includes('viewBox=')) {
            const widthMatch = svgString.match(/width="([^"]+)"/);
            const heightMatch = svgString.match(/height="([^"]+)"/);
            if (widthMatch && heightMatch) {
              const width = widthMatch[1];
              const height = heightMatch[1];
              svgString = svgString.replace(
                /<svg/,
                `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet"`
              );
            }
          }
          
          // SVGにスタイルを追加してレスポンシブにする
          if (svgString.includes('style=')) {
            svgString = svgString.replace(
              /style="([^"]*)"/,
              `style="$1 max-width: 100%; height: auto;"`
            );
          } else {
            svgString = svgString.replace(
              /<svg/,
              `<svg style="max-width: 100%; height: auto;"`
            );
          }
          
          container.innerHTML = svgString;
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

  // 全画面表示用のレンダリング
  useEffect(() => {
    if (!isFullscreen || !fullscreenContentRef.current || error || !dotCode || dotCode.trim() === '') {
      return;
    }

    const renderFullscreenGraph = async () => {
      try {
        let Viz: any;
        let Module: any;
        let render: any;

        try {
          const vizModule = await import('viz.js');
          Viz = vizModule.default || vizModule;
          
          const fullRenderModule = await import('viz.js/full.render.js');
          Module = fullRenderModule.Module;
          render = fullRenderModule.render;
        } catch (importError: any) {
          return; // エラーは通常表示で処理済み
        }
        
        const viz = new Viz({ Module, render });
        let svgString = await viz.renderString(dotCode);

        // 全画面表示用のSVGも調整
        if (fullscreenContentRef.current) {
          const container = fullscreenContentRef.current;
          
          // SVGにmax-widthを設定（全画面では元のサイズを維持）
          svgString = svgString.replace(
            /<svg/,
            `<svg style="max-width: 100%; height: auto;"`
          );
          
          // viewBoxを追加してレスポンシブにする
          if (!svgString.includes('viewBox')) {
            const widthMatch = svgString.match(/width="([^"]+)"/);
            const heightMatch = svgString.match(/height="([^"]+)"/);
            if (widthMatch && heightMatch) {
              const width = widthMatch[1];
              const height = heightMatch[1];
              svgString = svgString.replace(
                /<svg/,
                `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet"`
              );
            }
          }
          
          container.innerHTML = svgString;
        }
      } catch (err: any) {
        console.error('全画面表示レンダリングエラー:', err);
      }
    };

    renderFullscreenGraph();
  }, [isFullscreen, dotCode, error]);

  // 全画面表示時のズーム処理
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.25));
  };

  const handleZoomReset = () => {
    setZoom(1);
    setTranslateX(0);
    setTranslateY(0);
  };

  // ドラッグ処理
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - translateX,
        y: e.clientY - translateY,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setTranslateX(e.clientX - dragStartRef.current.x);
      setTranslateY(e.clientY - dragStartRef.current.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // ESCキーで全画面を閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

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
      </div>
    );
  }

  return (
    <>
      {/* 通常表示 */}
      <div style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* 全画面表示ボタン - 常に表示されるように固定 */}
        <button
          onClick={() => setIsFullscreen(true)}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            padding: '8px 12px',
            backgroundColor: '#4262FF',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            zIndex: 10,
            whiteSpace: 'nowrap',
          }}
          title="全画面表示 (ESCで閉じる)"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3352E6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#4262FF';
          }}
        >
          <span>⛶</span> 全画面
        </button>
        
        {/* スクロール可能なコンテンツエリア */}
        <div style={{
          width: '100%',
          height: '100%',
          overflow: 'auto',
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
              maxWidth: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        </div>
      </div>

      {/* 全画面表示モーダル */}
      {isFullscreen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsFullscreen(false);
            }
          }}
        >
          {/* ヘッダー */}
          <div style={{
            padding: '16px',
            backgroundColor: '#1F2937',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #374151',
          }}>
            <div style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 600 }}>
              Graphviz 全画面表示
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {/* ズームコントロール */}
              <div style={{
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
                backgroundColor: '#374151',
                padding: '4px',
                borderRadius: '4px',
              }}>
                <button
                  onClick={handleZoomOut}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#4B5563',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  −
                </button>
                <span style={{ color: '#FFFFFF', fontSize: '14px', minWidth: '60px', textAlign: 'center' }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#4B5563',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                }}
                >
                  +
                </button>
                <button
                  onClick={handleZoomReset}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#4B5563',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    marginLeft: '4px',
                  }}
                >
                  リセット
                </button>
              </div>
              <button
                onClick={() => setIsFullscreen(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                閉じる (ESC)
              </button>
            </div>
          </div>

          {/* コンテンツエリア */}
          <div
            ref={fullscreenContainerRef}
            style={{
              flex: 1,
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: '#111827',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              ref={fullscreenScrollContainerRef}
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'auto',
                cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div
                ref={fullscreenContentRef}
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '40px',
                  borderRadius: '8px',
                  transform: `scale(${zoom}) translate(${translateX}px, ${translateY}px)`,
                  transformOrigin: 'top left',
                  transition: isDragging ? 'none' : 'transform 0.1s ease',
                  minHeight: '200px',
                  userSelect: 'none',
                  display: 'inline-block',
                  margin: '20px',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

