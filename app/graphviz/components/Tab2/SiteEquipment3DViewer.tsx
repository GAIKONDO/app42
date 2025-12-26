/**
 * 棟内機器構成の3D表示コンポーネント
 * 複数ラックを3D空間に配置し、ラック内の機器を表示
 */

'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { ThreeScene } from '../utils/3d/ThreeScene';
import {
  parseUnitPosition,
  unitTo3DHeight,
  rackLocationTo3D,
  equipmentTo3DPosition,
  calculateFreeUs,
  RACK_DIMENSIONS,
  RACK_SPACING,
  U_HEIGHT_M,
} from '../utils/3d';
import type { SiteEquipment, Rack, Equipment } from '@/lib/graphvizHierarchyApi';

interface SiteEquipment3DViewerProps {
  siteEquipment: SiteEquipment | null | any; // YAMLから読み込んだデータも受け入れる
  onRackClick?: (rackId: string) => void;
  onEquipmentClick?: (equipmentId: string) => void;
  width?: number;
  height?: number;
}

export function SiteEquipment3DViewer({
  siteEquipment,
  onRackClick,
  onEquipmentClick,
  width,
  height = 600,
}: SiteEquipment3DViewerProps) {
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // ラックリストを取得
  const racks = siteEquipment?.racks || [];

  const handleSceneReady = (
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer
  ) => {
    // レイキャスターを初期化
    raycasterRef.current = new THREE.Raycaster();

    // ラックの境界を計算（カメラ位置の調整用）
    let minX = 0, maxX = 0, minY = 0, maxY = 0, minZ = 0, maxZ = 0;
    let hasRacks = false;

    // 各ラックを配置
    racks.forEach((rack: any, index: number) => {
      const rackCapacity = rack.capacity?.units || 42;
      const rackHeight = rackCapacity * U_HEIGHT_M;

      // ラックの位置を3D座標に変換
      const rackPos = rackLocationTo3D(rack.location || {});

      // 境界を更新
      if (!hasRacks) {
        minX = maxX = rackPos.x;
        minY = maxY = rackPos.y;
        minZ = maxZ = rackPos.z;
        hasRacks = true;
      } else {
        minX = Math.min(minX, rackPos.x);
        maxX = Math.max(maxX, rackPos.x);
        minY = Math.min(minY, rackPos.y);
        maxY = Math.max(maxY, rackPos.y + rackHeight);
        minZ = Math.min(minZ, rackPos.z);
        maxZ = Math.max(maxZ, rackPos.z);
      }

      // ラックの3Dモデルを作成
      const rackGeometry = new THREE.BoxGeometry(
        RACK_DIMENSIONS.width,
        rackHeight,
        RACK_DIMENSIONS.depth
      );

      // ラックの外枠（ワイヤーフレーム）
      const rackEdges = new THREE.EdgesGeometry(rackGeometry);
      const rackLine = new THREE.LineSegments(
        rackEdges,
        new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 })
      );
      rackLine.position.set(
        rackPos.x,
        rackPos.y + rackHeight / 2,
        rackPos.z
      );
      scene.add(rackLine);

      // ラックの前面（薄い板）
      const rackFrontGeometry = new THREE.PlaneGeometry(
        RACK_DIMENSIONS.width,
        rackHeight
      );
      const rackFrontMaterial = new THREE.MeshBasicMaterial({
        color: 0xe0e0e0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.2,
      });
      const rackFront = new THREE.Mesh(rackFrontGeometry, rackFrontMaterial);
      rackFront.position.set(
        rackPos.x,
        rackPos.y + rackHeight / 2,
        rackPos.z + RACK_DIMENSIONS.depth / 2
      );
      scene.add(rackFront);

      // ラックラベル
      const rackLabel = new Text();
      rackLabel.text = rack.label || rack.id;
      rackLabel.fontSize = 0.03;
      rackLabel.color = 0x333333;
      rackLabel.anchorX = 'center';
      rackLabel.anchorY = 'bottom';
      rackLabel.position.set(
        rackPos.x,
        rackPos.y + rackHeight + 0.05,
        rackPos.z
      );
      rackLabel.sync();
      scene.add(rackLabel);

      // ラック内の機器を配置
      const equipment = rack.equipment || [];
      equipment.forEach((eq: any, eqIndex: number) => {
        if (!eq.position?.unit) return;

        const devicePos = equipmentTo3DPosition(eq, rackCapacity);
        if (!devicePos) return;

        // 機器の3Dモデル
        const equipmentGeometry = new THREE.BoxGeometry(
          RACK_DIMENSIONS.width * 0.92,
          devicePos.height * 0.98,
          RACK_DIMENSIONS.depth * 0.7
        );

        // 機器の色（タイプに応じて）
        const equipmentColors: Record<string, number> = {
          server: 0x2563eb,    // 青
          switch: 0x16a34a,     // 緑
          router: 0xdc2626,     // 赤
          firewall: 0xea580c,   // オレンジ
          storage: 0x9333ea,    // 紫
        };
        const equipmentColor = equipmentColors[eq.type] || 0x6b7280; // デフォルト: グレー

        const equipmentMaterial = new THREE.MeshStandardMaterial({
          color: equipmentColor,
          metalness: 0.2,
          roughness: 0.8,
          emissive: equipmentColor,
          emissiveIntensity: 0.1,
        });

        const equipmentMesh = new THREE.Mesh(equipmentGeometry, equipmentMaterial);
        equipmentMesh.position.set(
          rackPos.x,
          rackPos.y + devicePos.y + devicePos.height / 2,
          rackPos.z + RACK_DIMENSIONS.depth * 0.15
        );

        // 機器の輪郭線
        const equipmentEdges = new THREE.EdgesGeometry(equipmentGeometry);
        const equipmentEdgeLine = new THREE.LineSegments(
          equipmentEdges,
          new THREE.LineBasicMaterial({
            color: 0x000000,
            linewidth: 2,
            opacity: 0.8,
            transparent: true,
          })
        );
        equipmentEdgeLine.position.copy(equipmentMesh.position);
        scene.add(equipmentEdgeLine);

        // 機器ラベル
        const equipmentLabel = new Text();
        equipmentLabel.text = eq.label || eq.id;
        equipmentLabel.fontSize = Math.min(devicePos.height * 0.15, 0.015);
        equipmentLabel.color = 0xffffff;
        equipmentLabel.anchorX = 'center';
        equipmentLabel.anchorY = 'middle';
        equipmentLabel.maxWidth = RACK_DIMENSIONS.width * 0.8;
        equipmentLabel.position.set(
          rackPos.x,
          rackPos.y + devicePos.y + devicePos.height / 2,
          rackPos.z + RACK_DIMENSIONS.depth * 0.5
        );
        equipmentLabel.sync();
        scene.add(equipmentLabel);

        // 機器IDをカスタムプロパティに保存
        equipmentMesh.userData = {
          type: 'equipment',
          equipmentId: eq.id,
          equipmentLabel: eq.label,
          rackId: rack.id,
        };
        equipmentLabel.userData = equipmentMesh.userData;

        scene.add(equipmentMesh);
        meshRefs.current.set(eq.id, equipmentMesh);
      });

      // 空きUを表示
      const freeUs = calculateFreeUs(equipment, rackCapacity);
      freeUs.forEach((freeU) => {
        const freeUHeight = (freeU.end - freeU.start + 1) * U_HEIGHT_M;
        const freeUY = (freeU.start - 1) * U_HEIGHT_M;

        const freeUGeometry = new THREE.BoxGeometry(
          RACK_DIMENSIONS.width * 0.9,
          freeUHeight,
          RACK_DIMENSIONS.depth * 0.3
        );
        const freeUMaterial = new THREE.MeshBasicMaterial({
          color: 0x90ee90, // 薄い緑
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide,
        });
        const freeUMesh = new THREE.Mesh(freeUGeometry, freeUMaterial);
        freeUMesh.position.set(
          rackPos.x,
          rackPos.y + freeUY + freeUHeight / 2,
          rackPos.z + RACK_DIMENSIONS.depth * 0.1
        );
        scene.add(freeUMesh);
      });

      // ラックIDをカスタムプロパティに保存（ラック自体もクリック可能にする）
      rackLine.userData = {
        type: 'rack',
        rackId: rack.id,
        rackLabel: rack.label,
      };
      rackFront.userData = rackLine.userData;
    });

    // カメラ位置を調整
    if (camera instanceof THREE.PerspectiveCamera && hasRacks) {
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const centerZ = (minZ + maxZ) / 2;

      const sizeX = maxX - minX + RACK_DIMENSIONS.width;
      const sizeY = maxY - minY;
      const sizeZ = maxZ - minZ + RACK_DIMENSIONS.depth;

      const maxSize = Math.max(sizeX, sizeY, sizeZ);
      const distance = maxSize * 1.5;

      camera.position.set(
        centerX + distance * 0.7,
        centerY + distance * 0.5,
        centerZ + distance * 0.7
      );
      camera.lookAt(centerX, centerY, centerZ);
    }

    // マウスクリックイベント
    const handleClick = (event: MouseEvent) => {
      if (!raycasterRef.current || !camera || !renderer) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      // すべてのクリック可能なオブジェクトをチェック
      const allObjects: THREE.Object3D[] = Array.from(meshRefs.current.values());
      scene.traverse((object) => {
        if (object.userData && (object.userData.type === 'equipment' || object.userData.type === 'rack')) {
          if (!allObjects.includes(object)) {
            allObjects.push(object);
          }
        }
      });

      const intersects = raycasterRef.current.intersectObjects(allObjects);

      if (intersects.length > 0) {
        const clickedObject = intersects[0].object as THREE.Mesh;
        const userData = clickedObject.userData;

        if (userData.type === 'equipment' && userData.equipmentId && onEquipmentClick) {
          onEquipmentClick(userData.equipmentId);
        } else if (userData.type === 'rack' && userData.rackId && onRackClick) {
          onRackClick(userData.rackId);
        }
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    return () => {
      renderer.domElement.removeEventListener('click', handleClick);
    };
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ThreeScene
        width={width}
        height={height}
        backgroundColor="#f5f5f5"
        enableOrbitControls={true}
        showControls={true}
        showInstructions={true}
        onSceneReady={handleSceneReady}
        style={{ border: '1px solid #e0e0e0', borderRadius: '8px' }}
      />
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>
          {siteEquipment?.label || '棟内機器構成'}
        </div>
        <div style={{ color: '#666' }}>
          ラック数: {racks.length} | 総機器数: {racks.reduce((sum: number, rack: any) => sum + (rack.equipment?.length || 0), 0)}
        </div>
      </div>
    </div>
  );
}

