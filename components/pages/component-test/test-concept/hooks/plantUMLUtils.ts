/**
 * PlantUMLDiagramで使用するユーティリティ関数
 */

/**
 * rect要素から組織IDを取得する関数
 */
export function extractNodeId(
  rectElement: SVGRectElement,
  svgElement: SVGElement,
  orgNameToIdMap?: Map<string, string>
): string {
  // まず組織名からIDを逆引き（優先）
  if (orgNameToIdMap) {
    const rectBox = rectElement.getBBox();
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
    
    const id = orgNameToIdMap.get(fullText);
    if (id) {
      return id;
    }
    
    // 省略された名前の場合も試す
    if (fullText.endsWith('...')) {
      const prefix = fullText.substring(0, fullText.length - 3);
      for (const [name, mapId] of orgNameToIdMap.entries()) {
        if (name.startsWith(prefix)) {
          return mapId;
        }
      }
    }
  }
  
  // 組織名からIDを取得できなかった場合、data属性からIDを取得（フォールバック）
  const orgId = rectElement.getAttribute('data-org-id');
  if (orgId) {
    return orgId;
  }
  
  return '';
}

/**
 * rect要素に対応するtext要素を見つける
 */
export function findTextForRect(
  rect: SVGRectElement,
  svgElement: SVGElement
): SVGTextElement | null {
  const rectBox = rect.getBBox();
  const rectCenterX = rectBox.x + rectBox.width / 2;
  const rectCenterY = rectBox.y + rectBox.height / 2;
  
  // すべてのtext要素を取得して、rectの中心に最も近いものを探す
  const allTexts = svgElement.querySelectorAll('text');
  let minDistance = Infinity;
  let closestText: SVGTextElement | null = null;
  
  for (let i = 0; i < allTexts.length; i++) {
    const textBox = allTexts[i].getBBox();
    const textCenterX = textBox.x + textBox.width / 2;
    const textCenterY = textBox.y + textBox.height / 2;
    
    // rectの中心とtextの中心の距離を計算
    const distance = Math.sqrt(
      Math.pow(textCenterX - rectCenterX, 2) + 
      Math.pow(textCenterY - rectCenterY, 2)
    );
    
    // rectの範囲内にあるtext要素を優先的に探す
    const isInsideRect = 
      textCenterX >= rectBox.x && 
      textCenterX <= rectBox.x + rectBox.width &&
      textCenterY >= rectBox.y && 
      textCenterY <= rectBox.y + rectBox.height;
    
    // rectの範囲内にあるtext要素で、距離が最小のものを選択
    if (isInsideRect && distance < minDistance) {
      minDistance = distance;
      closestText = allTexts[i] as SVGTextElement;
    }
  }
  
  // rectの範囲内にtextが見つからなかった場合、近いものを探す（フォールバック）
  if (!closestText) {
    for (let i = 0; i < allTexts.length; i++) {
      const textBox = allTexts[i].getBBox();
      const textCenterX = textBox.x + textBox.width / 2;
      const textCenterY = textBox.y + textBox.height / 2;
      
      const distance = Math.sqrt(
        Math.pow(textCenterX - rectCenterX, 2) + 
        Math.pow(textCenterY - rectCenterY, 2)
      );
      
      // rectのサイズを考慮した閾値（rectの対角線の長さの半分以内）
      const threshold = Math.sqrt(rectBox.width * rectBox.width + rectBox.height * rectBox.height) / 2;
      
      if (distance < threshold && distance < minDistance) {
        minDistance = distance;
        closestText = allTexts[i] as SVGTextElement;
      }
    }
  }
  
  return closestText;
}

/**
 * rect要素内のすべてのtext要素を取得
 */
export function getTextsInRect(
  rect: SVGRectElement,
  svgElement: SVGElement
): SVGTextElement[] {
  const rectBox = rect.getBBox();
  const allTexts = Array.from(svgElement.querySelectorAll('text'));
  
  return allTexts.filter((text) => {
    const textBox = text.getBBox();
    return (
      textBox.x >= rectBox.x - 5 &&
      textBox.x + textBox.width <= rectBox.x + rectBox.width + 5 &&
      textBox.y >= rectBox.y - 5 &&
      textBox.y + textBox.height <= rectBox.y + rectBox.height + 5
    );
  }) as SVGTextElement[];
}

/**
 * rect要素に組織IDをdata属性として保存
 */
export function setOrgIdOnRects(
  svgElement: SVGElement,
  orgNameToIdMap: Map<string, string>
): void {
  const rects = svgElement.querySelectorAll('rect');
  const texts = svgElement.querySelectorAll('text');
  
  rects.forEach((rect, index) => {
    const rectBox = rect.getBBox();
    const allTexts = Array.from(texts);
    const textsInRect = allTexts.filter((t) => {
      const textBox = t.getBBox();
      return (
        textBox.x >= rectBox.x - 5 &&
        textBox.x + textBox.width <= rectBox.x + rectBox.width + 5 &&
        textBox.y >= rectBox.y - 5 &&
        textBox.y + textBox.height <= rectBox.y + rectBox.height + 5
      );
    });
    
    // すべてのtext要素の内容を結合（組織名を取得）
    const fullText = textsInRect
      .map((t) => t.textContent?.trim() || '')
      .join(' ')
      .trim();
    
    // 組織名からIDを取得
    const orgId = orgNameToIdMap.get(fullText);
    if (orgId) {
      rect.setAttribute('data-org-id', orgId);
      console.log('✅ [PlantUMLDiagram] rect要素にIDを保存:', { index, orgName: fullText, orgId });
    } else {
      // 省略された名前の場合も試す
      if (fullText.endsWith('...')) {
        const prefix = fullText.substring(0, fullText.length - 3);
        for (const [name, id] of orgNameToIdMap.entries()) {
          if (name.startsWith(prefix)) {
            rect.setAttribute('data-org-id', id);
            console.log('✅ [PlantUMLDiagram] rect要素にIDを保存（省略名）:', { index, orgName: fullText, orgId: id });
            break;
          }
        }
      }
    }
  });
}

