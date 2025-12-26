/**
 * Graphviz YAMLファイル用のメタデータ抽出
 * 議事録の個別トピックと同じ仕組みを使用
 */

import { extractEntities, extractRelations, generateSemanticCategory, generateKeywords, generateSummary } from './topicMetadataGeneration';
import type { Entity, Relation } from '@/types/entity';
import type { CreateEntityInput } from '@/types/entity';
import type { CreateRelationInput, RelationType } from '@/types/relation';
import { createEntity } from './entityApi';
import { createRelation } from './relationApi';
import { updateGraphvizYamlFile, getGraphvizYamlFile } from './graphvizApi';
import { saveGraphvizCardAsTopic } from './graphvizCardEmbeddings';

/**
 * extractRelationsの戻り値の型（エンティティ名ベース）
 */
interface ExtractedRelation {
  sourceEntityName: string;
  targetEntityName: string;
  relationType: RelationType;
  description?: string;
  confidence?: number;
  metadata?: any;
}

/**
 * YAMLファイルからエンティティとリレーションを抽出して保存
 * @param yamlFileId YAMLファイルID
 * @param yamlName YAMLファイル名（タイトルとして使用）
 * @param yamlContent YAMLコンテンツ（内容として使用）
 * @param organizationId 組織ID（オプション）
 * @param model AIモデル名（デフォルト: 'gpt-4o-mini'）
 * @param dotContent Graphviz DOTコード（オプション、リレーション抽出に使用）
 * @returns 抽出されたエンティティとリレーションのID配列
 */
export async function extractAndSaveYamlMetadata(
  yamlFileId: string,
  yamlName: string,
  yamlContent: string,
  organizationId?: string,
  model: string = 'gpt-4o-mini',
  dotContent?: string
): Promise<{ entities: Entity[]; relations: Relation[] }> {
  try {
    // メタデータ（セマンティックカテゴリ、キーワード、要約）を生成
    console.log('🤖 [extractAndSaveYamlMetadata] メタデータ生成を開始...');
    const contentForMetadata = dotContent && dotContent.trim()
      ? `${yamlContent}\n\n--- Graphviz DOTコード ---\n${dotContent}`
      : yamlContent;
    
    const [semanticCategory, keywords, summary] = await Promise.all([
      generateSemanticCategory(yamlName, contentForMetadata, model, true),
      generateKeywords(yamlName, contentForMetadata, 10, model),
      generateSummary(yamlName, contentForMetadata, 200, model),
    ]);
    
    console.log('✅ [extractAndSaveYamlMetadata] メタデータ生成完了:', {
      semanticCategory,
      keywordsCount: keywords.length,
      summaryLength: summary.length,
    });
    
    // GraphvizYamlFileにメタデータを保存
    try {
      await updateGraphvizYamlFile(yamlFileId, {
        semanticCategory,
        keywords: keywords.length > 0 ? JSON.stringify(keywords) : undefined,
        contentSummary: summary || undefined,
      });
      console.log('✅ [extractAndSaveYamlMetadata] メタデータを保存しました');
    } catch (error: any) {
      console.warn('⚠️ [extractAndSaveYamlMetadata] メタデータの保存に失敗（続行）:', error);
    }
    
    // GraphvizカードをトピックとしてEmbedding化してRAG検索可能にする
    if (organizationId) {
      try {
        // GraphvizYamlFileからdescriptionを取得
        let description: string | undefined;
        let yamlType: string | undefined;
        try {
          const yamlFile = await getGraphvizYamlFile(yamlFileId);
          description = yamlFile.description;
          yamlType = yamlFile.yamlType;
        } catch (error) {
          console.warn('⚠️ [extractAndSaveYamlMetadata] GraphvizYamlFileの取得に失敗（続行）:', error);
        }
        
        // トピックとして保存
        await saveGraphvizCardAsTopic(
          yamlFileId,
          yamlName,
          yamlContent,
          organizationId,
          {
            description,
            summary,
            semanticCategory,
            keywords,
            yamlType,
            dotContent,
          }
        );
        console.log('✅ [extractAndSaveYamlMetadata] Graphvizカードをトピックとして保存しました');
      } catch (error: any) {
        console.warn('⚠️ [extractAndSaveYamlMetadata] Graphvizカードのトピック保存に失敗（続行）:', error);
        // エラーが発生しても続行（メタデータ抽出は成功しているため）
      }
    } else {
      console.warn('⚠️ [extractAndSaveYamlMetadata] organizationIdが指定されていないため、トピックとして保存をスキップします');
    }
    
    // エンティティを抽出（YAMLコンテンツから）
    console.log('🤖 [extractAndSaveYamlMetadata] エンティティ抽出を開始...');
    const extractedEntities = await extractEntities(yamlName, yamlContent, model);
    console.log('✅ [extractAndSaveYamlMetadata] エンティティ抽出完了:', extractedEntities.length, '件');

    // リレーションを抽出（YAMLコンテンツ + DOTコード）
    // DOTコードにはノード間の接続関係が明確に定義されているため、リレーション抽出に有効
    const contentForRelations = dotContent && dotContent.trim()
      ? `${yamlContent}\n\n--- Graphviz DOTコード（接続関係） ---\n${dotContent}`
      : yamlContent;
    
    // extractRelationsはRelation型を返すが、エンティティIDは抽出時の一時IDなので、
    // エンティティ名ベースのリレーションを直接抽出する必要がある
    // そのため、extractRelationsの結果からエンティティ名を取得するか、
    // または別の方法でエンティティ名ベースのリレーションを抽出する
    
    // まず、extractRelationsを呼び出してリレーションを取得
    const extractedRelationsWithIds = extractedEntities.length > 0
      ? await extractRelations(yamlName, contentForRelations, extractedEntities, model)
      : [];
    console.log('✅ [extractAndSaveYamlMetadata] リレーション抽出完了:', extractedRelationsWithIds.length, '件');
    
    // エンティティIDからエンティティ名へのマップを作成（抽出時の一時ID → エンティティ名）
    const entityIdToNameMap = new Map<string, string>();
    extractedEntities.forEach(e => {
      entityIdToNameMap.set(e.id, e.name);
    });
    
    // リレーションをエンティティ名ベースに変換
    const extractedRelations: ExtractedRelation[] = extractedRelationsWithIds
      .filter((r: Relation) => {
        // 無効なリレーションを除外
        if (!r || !r.sourceEntityId || !r.targetEntityId || !r.relationType) {
          console.warn('⚠️ [extractAndSaveYamlMetadata] 無効なリレーションをスキップ:', r);
          return false;
        }
        return true;
      })
      .map((r: Relation) => {
        const sourceName = entityIdToNameMap.get(r.sourceEntityId || '');
        const targetName = entityIdToNameMap.get(r.targetEntityId || '');
        
        if (!sourceName || !targetName) {
          console.warn('⚠️ [extractAndSaveYamlMetadata] リレーションのエンティティ名が見つかりません:', {
            sourceEntityId: r.sourceEntityId,
            targetEntityId: r.targetEntityId,
            availableEntityIds: Array.from(entityIdToNameMap.keys()),
            relationType: r.relationType,
          });
          return null;
        }
        
        return {
          sourceEntityName: sourceName,
          targetEntityName: targetName,
          relationType: r.relationType,
          description: r.description,
          confidence: r.confidence,
          metadata: r.metadata,
        } as ExtractedRelation;
      })
      .filter((r): r is ExtractedRelation => r !== null && r !== undefined);
    
    console.log('✅ [extractAndSaveYamlMetadata] リレーションをエンティティ名ベースに変換完了:', extractedRelations.length, '件');

    // エンティティにorganizationIdとyamlFileIdを設定
    // 注意: organizationIdがundefinedの場合、CHECK制約違反を避けるため、エンティティを作成しない
    if (!organizationId) {
      console.warn('⚠️ [extractAndSaveYamlMetadata] organizationIdが指定されていないため、エンティティを作成できません。');
      return {
        entities: [],
        relations: [],
      };
    }

    const entitiesWithIds: Entity[] = [];
    const entityNameMap = new Map<string, Entity>(); // エンティティ名（正規化）→エンティティのマップ
    
    for (const entity of extractedEntities) {
      const entityInput: CreateEntityInput = {
        ...entity,
        organizationId: organizationId, // organizationIdを明示的に設定
        metadata: {
          ...entity.metadata,
          yamlFileId: yamlFileId,
        },
      };

      try {
        const createdEntity = await createEntity(entityInput);
        entitiesWithIds.push(createdEntity);
        
        // エンティティ名の正規化（空白除去、小文字化）でマップに追加
        const normalizedName = createdEntity.name.trim().toLowerCase();
        entityNameMap.set(normalizedName, createdEntity);
        
        // エイリアスもマップに追加
        if (createdEntity.aliases && Array.isArray(createdEntity.aliases)) {
          for (const alias of createdEntity.aliases) {
            const normalizedAlias = alias.trim().toLowerCase();
            if (!entityNameMap.has(normalizedAlias)) {
              entityNameMap.set(normalizedAlias, createdEntity);
            }
          }
        }
        
        console.log('✅ [extractAndSaveYamlMetadata] エンティティを保存:', {
          id: createdEntity.id,
          name: createdEntity.name,
          normalizedName,
          aliases: createdEntity.aliases,
        });
      } catch (error: any) {
        console.error('❌ [extractAndSaveYamlMetadata] エンティティの保存に失敗:', {
          name: entity.name,
          error: error.message || error,
          stack: error.stack,
        });
        // エラーが発生しても続行
      }
    }
    
    console.log('📊 [extractAndSaveYamlMetadata] 保存されたエンティティ一覧:', {
      count: entitiesWithIds.length,
      names: entitiesWithIds.map(e => e.name),
      normalizedNames: Array.from(entityNameMap.keys()),
    });

    // リレーションにyamlFileIdとorganizationIdを設定
    const relationsWithIds: Relation[] = [];
    for (const relation of extractedRelations) {
      // エンティティ名が存在するかチェック
      if (!relation.sourceEntityName || !relation.targetEntityName) {
        console.warn('⚠️ [extractAndSaveYamlMetadata] リレーションにエンティティ名がありません:', relation);
        continue;
      }
      
      // エンティティ名からIDを取得（正規化して検索）
      const normalizedSourceName = relation.sourceEntityName.trim().toLowerCase();
      const normalizedTargetName = relation.targetEntityName.trim().toLowerCase();
      
      const sourceEntity = entityNameMap.get(normalizedSourceName) || 
                          entitiesWithIds.find(e => {
                            const normalized = e.name.trim().toLowerCase();
                            return normalized === normalizedSourceName ||
                                   (e.aliases && e.aliases.some(alias => alias.trim().toLowerCase() === normalizedSourceName));
                          });
      
      const targetEntity = entityNameMap.get(normalizedTargetName) || 
                          entitiesWithIds.find(e => {
                            const normalized = e.name.trim().toLowerCase();
                            return normalized === normalizedTargetName ||
                                   (e.aliases && e.aliases.some(alias => alias.trim().toLowerCase() === normalizedTargetName));
                          });

      if (!sourceEntity || !targetEntity) {
        console.warn('⚠️ [extractAndSaveYamlMetadata] エンティティが見つかりません:', {
          sourceEntityName: relation.sourceEntityName,
          normalizedSourceName,
          targetEntityName: relation.targetEntityName,
          normalizedTargetName,
          availableEntityNames: entitiesWithIds.map(e => e.name),
          availableNormalizedNames: Array.from(entityNameMap.keys()),
          relationType: relation.relationType,
        });
        continue;
      }
      
      console.log('🔗 [extractAndSaveYamlMetadata] リレーションを作成:', {
        sourceEntityName: relation.sourceEntityName,
        sourceEntityId: sourceEntity.id,
        targetEntityName: relation.targetEntityName,
        targetEntityId: targetEntity.id,
        relationType: relation.relationType,
      });

      const relationInput: CreateRelationInput = {
        yamlFileId: yamlFileId,
        sourceEntityId: sourceEntity.id,
        targetEntityId: targetEntity.id,
        relationType: relation.relationType,
        description: relation.description,
        confidence: relation.confidence,
        metadata: relation.metadata,
        organizationId: organizationId, // organizationIdを明示的に設定（undefinedの場合は既に早期リターンしている）
      };

      try {
        const createdRelation = await createRelation(relationInput);
        relationsWithIds.push(createdRelation);
        console.log('✅ [extractAndSaveYamlMetadata] リレーションを保存:', createdRelation.id);
      } catch (error: any) {
        console.error('❌ [extractAndSaveYamlMetadata] リレーションの保存に失敗:', error);
        // エラーが発生しても続行
      }
    }

    return {
      entities: entitiesWithIds,
      relations: relationsWithIds,
    };
  } catch (error: any) {
    console.error('❌ [extractAndSaveYamlMetadata] メタデータ抽出に失敗:', error);
    throw new Error(`メタデータ抽出に失敗しました: ${error.message || error}`);
  }
}

