import { useEffect } from 'react';
import { getTextsInRect, setOrgIdOnRects } from './plantUMLUtils';

interface UseSelectedNodeHighlightProps {
  selectedNodeId: string | null | undefined;
  svgContent: string;
  containerRef: React.RefObject<HTMLDivElement>;
  orgNameToIdMap?: Map<string, string>;
}

export function useSelectedNodeHighlight({
  selectedNodeId,
  svgContent,
  containerRef,
  orgNameToIdMap,
}: UseSelectedNodeHighlightProps) {
  useEffect(() => {
    if (!svgContent || !containerRef.current) return;

    const svgElement = containerRef.current?.querySelector('svg');
    if (!svgElement) return;

    // rect要素に組織IDをdata属性として保存（組織名からIDを逆引き）
    if (orgNameToIdMap) {
      setOrgIdOnRects(svgElement, orgNameToIdMap);
    }

    // すべてのrectとtextを取得
    const rects = svgElement.querySelectorAll('rect');
    const texts = svgElement.querySelectorAll('text');

    // まず、すべての選択を解除（選択色が適用されているノードのみ）
    rects.forEach((rect) => {
      const currentFill = rect.getAttribute('fill');
      if (currentFill === '#1976D2') {
        const originalFill = rect.getAttribute('data-original-fill');
        const originalStroke = rect.getAttribute('data-original-stroke');
        const originalStrokeWidth = rect.getAttribute('data-original-stroke-width');
        
        // 元のスタイルを復元
        if (originalFill && originalFill !== '#1976D2') {
          rect.setAttribute('fill', originalFill);
        } else {
          rect.setAttribute('fill', '#E5E7EB');
        }
        
        if (originalStroke && originalStroke !== '#1976D2') {
          rect.setAttribute('stroke', originalStroke);
        } else {
          rect.setAttribute('stroke', '#9CA3AF');
        }
        
        if (originalStrokeWidth) {
          rect.setAttribute('stroke-width', originalStrokeWidth);
        } else {
          rect.setAttribute('stroke-width', '1');
        }
      }
    });
    
    texts.forEach((text) => {
      const currentFill = text.getAttribute('fill');
      if (currentFill === '#FFFFFF') {
        const originalFill = text.getAttribute('data-original-fill');
        if (originalFill && originalFill !== '#FFFFFF') {
          text.setAttribute('fill', originalFill);
        } else {
          text.setAttribute('fill', '#000000');
        }
      }
    });

    // selectedNodeIdがnullの場合は、ここで終了
    if (!selectedNodeId) {
      return;
    }

    // selectedNodeIdに一致するノードを探す
    // まず組織名からIDを逆引きして判定、その後data属性からIDを取得して判定
    let targetRect: SVGRectElement | null = null;
    let targetTexts: SVGTextElement[] = [];


    // 各rectについて、組織名とIDの両方で判定
    rects.forEach((rect) => {
      let rectOrgId: string | null = null;
      
      // まず組織名からIDを逆引き（優先）
      if (orgNameToIdMap) {
        const rectBox = rect.getBBox();
        const allTexts = Array.from(svgElement.querySelectorAll('text'));
        const textsInRect = allTexts.filter((t) => {
          const textBox = t.getBBox();
          return (
            textBox.x >= rectBox.x - 5 &&
            textBox.x + textBox.width <= rectBox.x + rectBox.width + 5 &&
            textBox.y >= rectBox.y - 5 &&
            textBox.y + textBox.height <= rectBox.y + rectBox.height + 5
          );
        });
        
        const fullText = textsInRect
          .map((t) => t.textContent?.trim() || '')
          .join(' ')
          .trim();
        
        const idFromName = orgNameToIdMap.get(fullText);
        if (idFromName) {
          rectOrgId = idFromName;
        } else if (fullText.endsWith('...')) {
          // 省略された名前の場合も試す
          const prefix = fullText.substring(0, fullText.length - 3);
          for (const [name, mapId] of orgNameToIdMap.entries()) {
            if (name.startsWith(prefix)) {
              rectOrgId = mapId;
              break;
            }
          }
        }
      }
      
      // 組織名からIDを取得できなかった場合、data属性からIDを取得（フォールバック）
      if (!rectOrgId) {
        const dataOrgId = rect.getAttribute('data-org-id');
        if (dataOrgId) {
          rectOrgId = dataOrgId;
        }
      }
      
      // IDが一致するか確認（完全一致のみ）
      const isMatch = rectOrgId === selectedNodeId;
      
      if (isMatch && rectOrgId) {
        targetRect = rect;
        targetTexts = getTextsInRect(rect, svgElement);
      }
    });

    // 見つかったノードを青くする
    if (targetRect) {
      // 元のスタイルを保存（まだ保存されていない場合のみ）
      if (!targetRect.hasAttribute('data-original-fill')) {
        const currentFill = targetRect.getAttribute('fill');
        const currentStroke = targetRect.getAttribute('stroke');
        const currentStrokeWidth = targetRect.getAttribute('stroke-width');
        
        // 現在のスタイルが選択色でない場合のみ、元のスタイルとして保存
        if (currentFill !== '#1976D2') {
          targetRect.setAttribute('data-original-fill', currentFill || '#E5E7EB');
        } else {
          targetRect.setAttribute('data-original-fill', '#E5E7EB');
        }
        
        if (currentStroke !== '#1976D2') {
          targetRect.setAttribute('data-original-stroke', currentStroke || '#9CA3AF');
        } else {
          targetRect.setAttribute('data-original-stroke', '#9CA3AF');
        }
        
        // stroke-widthが選択状態（+3されている）の場合は、元の値を計算
        if (currentStrokeWidth && parseFloat(currentStrokeWidth) > 3) {
          const originalWidth = String(parseFloat(currentStrokeWidth) - 3);
          targetRect.setAttribute('data-original-stroke-width', originalWidth);
        } else {
          targetRect.setAttribute('data-original-stroke-width', currentStrokeWidth || '1');
        }
      }
      
      // text要素の処理
      if (targetTexts.length === 0) {
        // text要素が見つからない場合、rect内のすべてのtext要素を探す
        const rectBox = targetRect.getBBox();
        const allTexts = Array.from(svgElement.querySelectorAll('text'));
        const textsInRect = allTexts.filter((t) => {
          const textBox = t.getBBox();
          return (
            textBox.x >= rectBox.x - 5 &&
            textBox.x + textBox.width <= rectBox.x + rectBox.width + 5 &&
            textBox.y >= rectBox.y - 5 &&
            textBox.y + textBox.height <= rectBox.y + rectBox.height + 5
          );
        }) as SVGTextElement[];
        
        targetTexts.push(...textsInRect);
      }
      
      // すべてのtext要素の元のスタイルを保存
      targetTexts.forEach((text) => {
        if (!text.hasAttribute('data-original-fill')) {
          const currentTextFill = text.getAttribute('fill');
          if (currentTextFill !== '#FFFFFF') {
            text.setAttribute('data-original-fill', currentTextFill || '#000000');
          } else {
            text.setAttribute('data-original-fill', '#000000');
          }
        }
      });

      // 選択状態のスタイルを適用
      targetRect.setAttribute('stroke', '#1976D2');
      targetRect.setAttribute('stroke-width', String(parseFloat(targetRect.getAttribute('data-original-stroke-width') || '1') + 3));
      targetRect.setAttribute('fill', '#1976D2');
      
      // すべてのtext要素を白にする
      targetTexts.forEach((text) => {
        text.setAttribute('fill', '#FFFFFF');
      });
    }
  }, [selectedNodeId, svgContent, containerRef, orgNameToIdMap]);
}

