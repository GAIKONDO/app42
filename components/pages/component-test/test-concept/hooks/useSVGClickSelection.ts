import { useEffect, useRef } from 'react';
import { extractNodeId, findTextForRect, setOrgIdOnRects } from './plantUMLUtils';

interface UseSVGClickSelectionProps {
  svgContent: string;
  containerRef: React.RefObject<HTMLDivElement>;
  onNodeClick?: (nodeId: string, event: MouseEvent) => void;
  orgNameToIdMap?: Map<string, string>;
}

export function useSVGClickSelection({
  svgContent,
  containerRef,
  onNodeClick,
  orgNameToIdMap,
}: UseSVGClickSelectionProps) {
  // 選択効果を適用する関数
  function applyClickSelection() {
    const svgElement = containerRef.current?.querySelector('svg');
    if (!svgElement) {
      console.log('❌ [PlantUMLDiagram] SVG要素が見つかりません（applyClickSelection）');
      return;
    }

    // pointer-eventsを有効にする
    svgElement.style.pointerEvents = 'all';
    
    // SVG内のすべての要素を取得
    const rects = svgElement.querySelectorAll('rect');
    const texts = svgElement.querySelectorAll('text');

    // rect要素に組織IDをdata属性として保存（組織名からIDを逆引き）
    if (orgNameToIdMap) {
      setOrgIdOnRects(svgElement, orgNameToIdMap);
    }

    console.log('🔍 [PlantUMLDiagram] SVG要素の検出:', {
      rects: rects.length,
      texts: texts.length,
    });

    const cleanupFunctions: Array<() => void> = [];

    // 各rectとtextのペアを見つけて、個別にクリック選択効果を適用
    rects.forEach((rect, index) => {
      // このrectに対応するtext要素を見つける
      const text = findTextForRect(rect, svgElement);
      
      // デバッグログ（開発環境のみ）
      if (process.env.NODE_ENV === 'development' && text) {
        const rectBox = rect.getBBox();
        const rectCenterX = rectBox.x + rectBox.width / 2;
        const rectCenterY = rectBox.y + rectBox.height / 2;
        console.log(`🔍 [PlantUMLDiagram] rect[${index}]とtextの対応:`, {
          rectIndex: index,
          textContent: text.textContent?.trim(),
          rectCenter: { x: rectCenterX, y: rectCenterY },
          textCenter: { x: text.getBBox().x + text.getBBox().width / 2, y: text.getBBox().y + text.getBBox().height / 2 },
        });
      }
      
      // 元のスタイルを保存
      const originalStrokeWidth = rect.getAttribute('stroke-width') || '1';
      rect.setAttribute('data-original-stroke-width', originalStrokeWidth);
      const originalFill = rect.getAttribute('fill') || '';
      rect.setAttribute('data-original-fill', originalFill);
      const originalStroke = rect.getAttribute('stroke') || '';
      rect.setAttribute('data-original-stroke', originalStroke);
      rect.style.pointerEvents = 'all';
      rect.style.cursor = 'pointer';
      
      if (text) {
        const originalFill = text.getAttribute('fill') || '';
        text.setAttribute('data-original-fill', originalFill);
        text.style.pointerEvents = 'all';
        text.style.cursor = 'pointer';
      }

      // rectにクリック効果を適用
      const handleRectClick = (e: Event) => {
        e.stopPropagation();
        console.log('🖱️ [PlantUMLDiagram] rectクリック:', { index });
        
        // 選択状態の管理はuseSelectedNodeHighlightに任せる
        // ここではonNodeClickコールバックのみを呼び出す
        
        // onNodeClickコールバックを呼び出す（組織IDを渡す）
        if (onNodeClick) {
          const nodeId = extractNodeId(rect, svgElement, orgNameToIdMap);
          console.log('🔗 [PlantUMLDiagram] onNodeClick呼び出し:', { nodeId, hasOnNodeClick: !!onNodeClick });
          if (nodeId) {
            onNodeClick(nodeId, e as MouseEvent);
          } else {
            console.warn('⚠️ [PlantUMLDiagram] nodeIdが空です');
          }
        } else {
          console.warn('⚠️ [PlantUMLDiagram] onNodeClickがありません');
        }
      };

      rect.addEventListener('click', handleRectClick);

      cleanupFunctions.push(() => {
        rect.removeEventListener('click', handleRectClick);
      });
    });
    
    // text要素にもクリック効果を適用（rectが見つからなかった場合のフォールバック）
    texts.forEach((text) => {
      if (text.hasAttribute('data-click-applied')) return;
      
      text.setAttribute('data-click-applied', 'true');
      const originalFill = text.getAttribute('fill') || '';
      text.setAttribute('data-original-fill', originalFill);
      text.style.pointerEvents = 'all';
      text.style.cursor = 'pointer';

      const handleTextClick = (e: Event) => {
        e.stopPropagation();
        // 対応するrectを探す（より正確な方法）
        const textBox = text.getBBox();
        const textCenterX = textBox.x + textBox.width / 2;
        const textCenterY = textBox.y + textBox.height / 2;
        
        const allRects = svgElement.querySelectorAll('rect');
        let minDistance = Infinity;
        let closestRect: SVGRectElement | null = null;
        
        for (let i = 0; i < allRects.length; i++) {
          const rectBox = allRects[i].getBBox();
          const rectCenterX = rectBox.x + rectBox.width / 2;
          const rectCenterY = rectBox.y + rectBox.height / 2;
          
          // textの中心とrectの中心の距離を計算
          const distance = Math.sqrt(
            Math.pow(textCenterX - rectCenterX, 2) + 
            Math.pow(textCenterY - rectCenterY, 2)
          );
          
          // textがrectの範囲内にある場合を優先
          const isInsideRect = 
            textCenterX >= rectBox.x && 
            textCenterX <= rectBox.x + rectBox.width &&
            textCenterY >= rectBox.y && 
            textCenterY <= rectBox.y + rectBox.height;
          
          if (isInsideRect && distance < minDistance) {
            minDistance = distance;
            closestRect = allRects[i] as SVGRectElement;
          }
        }
        
        // rectの範囲内にtextが見つからなかった場合、近いものを探す
        if (!closestRect) {
          for (let i = 0; i < allRects.length; i++) {
            const rectBox = allRects[i].getBBox();
            const rectCenterX = rectBox.x + rectBox.width / 2;
            const rectCenterY = rectBox.y + rectBox.height / 2;
            
            const distance = Math.sqrt(
              Math.pow(textCenterX - rectCenterX, 2) + 
              Math.pow(textCenterY - rectCenterY, 2)
            );
            
            const threshold = Math.sqrt(rectBox.width * rectBox.width + rectBox.height * rectBox.height) / 2;
            
            if (distance < threshold && distance < minDistance) {
              minDistance = distance;
              closestRect = allRects[i] as SVGRectElement;
            }
          }
        }
        
        if (closestRect) {
          closestRect.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
      };

      text.addEventListener('click', handleTextClick);

      cleanupFunctions.push(() => {
        text.removeEventListener('click', handleTextClick);
      });
    });
    
    console.log(`✅ [PlantUMLDiagram] ${rects.length}個のrectと${texts.length}個のtextにクリック選択効果を追加しました`);

    // クリーンアップ関数を保存
    (svgElement as any).__cleanupFunctions = cleanupFunctions;
    (svgElement as any).__clickSelectionApplied = true;
    (svgElement as any).__savedRectsCount = rects.length;
  }

  useEffect(() => {
    if (!svgContent || !containerRef.current) return;

    // まず既存のイベントリスナーをクリーンアップ
    const cleanupExisting = () => {
      const svgElement = containerRef.current?.querySelector('svg');
      if (svgElement && (svgElement as any).__cleanupFunctions) {
        (svgElement as any).__cleanupFunctions.forEach((cleanup: () => void) => cleanup());
        (svgElement as any).__cleanupFunctions = [];
        (svgElement as any).__clickSelectionApplied = false;
      }
    };

    cleanupExisting();

    // SVGが完全にレンダリングされるまで待つ（svgContentが変更された場合は少し遅延）
    const applyWithDelay = () => {
      // まず即座にチェック
      const svgElement = containerRef.current?.querySelector('svg');
      if (svgElement && !(svgElement as any).__clickSelectionApplied) {
        console.log('✅ [PlantUMLDiagram] SVG要素が見つかりました（即座に適用）');
        applyClickSelection();
        return;
      }

      // SVG要素が見つからない場合、または既に設定されている場合は少し待ってから再チェック
      const timeoutId = setTimeout(() => {
        const svgElement = containerRef.current?.querySelector('svg');
        if (svgElement) {
          // 既存のイベントリスナーをクリーンアップしてから再設定
          cleanupExisting();
          if (!(svgElement as any).__clickSelectionApplied) {
            console.log('✅ [PlantUMLDiagram] SVG要素が見つかりました（遅延適用）');
            applyClickSelection();
          }
        }
      }, 100);

      return timeoutId;
    };

    // MutationObserverで監視（SVG要素が再挿入された場合）
    const observer = new MutationObserver((mutations, obs) => {
      const svgElement = containerRef.current?.querySelector('svg');
      if (svgElement && !(svgElement as any).__clickSelectionApplied) {
        console.log('✅ [PlantUMLDiagram] SVG要素が再挿入されました（MutationObserver検出）');
        cleanupExisting();
        applyClickSelection();
      }
    });

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
    });

    // 即座に適用を試みる
    const timeoutId = applyWithDelay();

    // クリーンアップ関数を返す
    return () => {
      observer.disconnect();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      cleanupExisting();
    };
  }, [svgContent, onNodeClick, orgNameToIdMap]);
}

