import { useMemo } from 'react';
import type { RelationshipNode, RelationshipLink } from '../../RelationshipDiagram2D';

export function useHierarchyData(
  nodes: RelationshipNode[],
  links: RelationshipLink[],
  showTopics: boolean
) {
  return useMemo(() => {
    // テーマノードまたはカテゴリーノードを取得
    const themeNodes = nodes.filter(node => node.type === 'theme');
    // 親カテゴリー（categoryTypeが'parent'またはparentCategoryIdがない）を取得
    const categoryNodes = nodes.filter(node => 
      node.type === 'category' && 
      (node.data?.categoryType === 'parent' || !node.data?.parentCategoryId)
    );
    
    // ノードIDからノードを取得するマップを作成
    const nodeMap = new Map<string, RelationshipNode>();
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });
    
    // リンクから親子関係を構築
    const childrenMap = new Map<string, RelationshipNode[]>();
    
    links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      
      if (!childrenMap.has(sourceId)) {
        childrenMap.set(sourceId, []);
      }
      const targetNode = nodeMap.get(targetId);
      if (targetNode) {
        childrenMap.get(sourceId)!.push(targetNode);
      }
    });

    // カテゴリー階層を構築
    const buildCategoryHierarchy = (node: RelationshipNode, depth: number): any => {
      const children = childrenMap.get(node.id) || [];
      
      // 子カテゴリーとスタートアップを分類
      const childCategoryNodes = children.filter(n => n.type === 'category');
      const startupNodes = children.filter(n => n.type === 'startup');
      
      // 子カテゴリーを再帰的に構築
      const childCategories = childCategoryNodes.map(childCategoryNode => {
        return buildCategoryHierarchy(childCategoryNode, depth + 1);
      });
      
      // スタートアップノードを構築
      const startups = startupNodes.map(startupNode => ({
        name: startupNode.label,
        id: startupNode.id,
        value: 1,
        depth: depth + (childCategories.length > 0 ? 2 : 1),
        nodeType: startupNode.type,
        originalData: startupNode,
      }));
      
      // 子カテゴリーとスタートアップを結合
      const allChildren = [...childCategories, ...startups];
      
      return {
        name: node.label,
        id: node.id,
        value: 1,
        depth: depth,
        nodeType: node.type,
        originalData: node,
        children: allChildren.length > 0 ? allChildren : undefined,
      };
    };

    // テーマ階層を構築（既存のロジック）
    const buildThemeHierarchy = (node: RelationshipNode, depth: number): any => {
      const children = childrenMap.get(node.id) || [];
      
      // 子ノードをタイプごとに分類
      const orgChildren = children.filter(n => n.type === 'organization' || n.type === 'company');
      const initiativeChildren = children.filter(n => n.type === 'initiative');
      const startupChildren = children.filter(n => n.type === 'startup'); // テーマから直接リンクされているスタートアップ
      const topicChildren = children.filter(n => n.type === 'topic');
      
      // 組織/事業会社ノードの子として注力施策とスタートアップを配置
      const orgNodesWithInitiatives = orgChildren.map(orgNode => {
        const orgChildren = childrenMap.get(orgNode.id) || [];
        const initiativeChildren = orgChildren.filter(n => n.type === 'initiative');
        const startupChildren = orgChildren.filter(n => n.type === 'startup'); // 組織の子としてリンクされているスタートアップ
        
        // 各注力施策の子としてトピックを配置
        const initiativesWithTopics = initiativeChildren.map(initNode => {
          const initChildren = childrenMap.get(initNode.id) || [];
          const topicChildren = showTopics ? initChildren.filter(n => n.type === 'topic') : [];
          
          return {
            name: initNode.label,
            id: initNode.id,
            value: 1, // 注力施策の基本値
            depth: depth + 2,
            nodeType: initNode.type,
            originalData: initNode,
            children: topicChildren.length > 0 ? topicChildren.map(topicNode => ({
              name: topicNode.label,
              id: topicNode.id,
              value: 1, // トピックの基本値
              depth: depth + 3,
              nodeType: topicNode.type,
              originalData: topicNode,
            })) : undefined,
          };
        });
        
        // スタートアップノードを構築
        const startups = startupChildren.map(startupNode => ({
          name: startupNode.label,
          id: startupNode.id,
          value: 1,
          depth: depth + 2,
          nodeType: startupNode.type,
          originalData: startupNode,
        }));
        
        // 注力施策とスタートアップを結合
        const allChildren = [...initiativesWithTopics, ...startups];
        
        return {
          name: orgNode.label,
          id: orgNode.id,
          value: 1, // 組織の基本値
          depth: depth + 1,
          nodeType: orgNode.type,
          originalData: orgNode,
          children: allChildren.length > 0 ? allChildren : undefined,
        };
      });
      
      // テーマから直接リンクされているスタートアップノードを構築
      const directStartups = startupChildren.map(startupNode => ({
        name: startupNode.label,
        id: startupNode.id,
        value: 1,
        depth: depth + 1,
        nodeType: startupNode.type,
        originalData: startupNode,
      }));
      
      // 組織ノードと直接リンクされているスタートアップノードを結合
      const allThemeChildren = [...orgNodesWithInitiatives, ...directStartups];
      
      return {
        name: node.label,
        id: node.id,
        value: 1, // テーマの基本値
        depth: depth,
        nodeType: node.type,
        originalData: node,
        children: allThemeChildren.length > 0 ? allThemeChildren : undefined,
      };
    };

    // カテゴリーノードがある場合はカテゴリー階層を構築、なければテーマ階層を構築
    if (categoryNodes.length > 0) {
      return {
        name: 'root',
        children: categoryNodes.map(categoryNode => buildCategoryHierarchy(categoryNode, 1)),
      };
    } else {
      return {
        name: 'root',
        children: themeNodes.map(themeNode => buildThemeHierarchy(themeNode, 1)),
      };
    }
  }, [nodes, links, showTopics]);
}

