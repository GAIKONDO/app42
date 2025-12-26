/**
 * ラック内サーバーの3D表示コンポーネント
 * 単一ラックを3Dで表示し、サーバーをU位置に配置
 */

'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { ThreeScene } from '../utils/3d/ThreeScene';
import {
  parseUnitPosition,
  unitTo3DHeight,
  calculateFreeUs,
  RACK_DIMENSIONS,
  U_HEIGHT_M,
} from '../utils/3d';
import type { RackServers, Server, Rack } from '@/lib/graphvizHierarchyApi';

interface Rack3DViewerProps {
  rackServers: RackServers | null | any; // YAMLから読み込んだデータも受け入れる
  rack?: Rack | null | any;
  onServerClick?: (serverId: string) => void;
  width?: number;
  height?: number;
}

export function Rack3DViewer({
  rackServers,
  rack,
  onServerClick,
  width,
  height = 600,
}: Rack3DViewerProps) {
  const meshRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // ラック容量を取得（デフォルト: 42U）
  const rackCapacity = rack?.capacity?.units || 42;

  // サーバーリストを取得
  const servers = rackServers?.servers || [];

  // 空きUを計算（Server型をEquipment型に変換）
  const freeUs = calculateFreeUs(
    servers.map((server) => ({
      id: server.id,
      type: 'server' as const,
      label: server.label,
      position: (server as any).position || {},
    })),
    rackCapacity
  );

  const handleSceneReady = (
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer
  ) => {
    // レイキャスターを初期化
    raycasterRef.current = new THREE.Raycaster();

    // カメラ位置を調整
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.position.set(2, rackCapacity * U_HEIGHT_M * 0.5, 3);
      camera.lookAt(0, rackCapacity * U_HEIGHT_M * 0.5, 0);
    }

    // ラックの3Dモデルを作成
    const rackHeight = rackCapacity * U_HEIGHT_M;
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
    rackLine.position.y = rackHeight / 2;
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
      opacity: 0.3,
    });
    const rackFront = new THREE.Mesh(rackFrontGeometry, rackFrontMaterial);
    rackFront.position.set(0, rackHeight / 2, RACK_DIMENSIONS.depth / 2);
    scene.add(rackFront);

    // U位置のマーカー（1Uごと）
    for (let u = 1; u <= rackCapacity; u++) {
      const uY = (u - 1) * U_HEIGHT_M;
      const markerGeometry = new THREE.PlaneGeometry(
        RACK_DIMENSIONS.width * 0.9,
        0.001
      );
      const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0xcccccc,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.2,
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(0, uY, RACK_DIMENSIONS.depth / 2 + 0.01);
      scene.add(marker);
    }

    // サーバーを配置
    servers.forEach((server, index) => {
      // Server型にはpositionがないが、YAMLから読み込んだデータには含まれる
      const serverWithPosition = server as any;
      if (!serverWithPosition.position?.unit) return;

      const uPosition = parseUnitPosition(serverWithPosition.position.unit);
      if (!uPosition) return;

      const devicePos = unitTo3DHeight(
        uPosition.uStart,
        uPosition.uHeight,
        rackCapacity
      );

      // サーバーの3Dモデル（サイズを少し大きく、前面に配置）
      const serverGeometry = new THREE.BoxGeometry(
        RACK_DIMENSIONS.width * 0.92,
        devicePos.height * 0.98,
        RACK_DIMENSIONS.depth * 0.7
      );

      // サーバーの色（より目立つ色に変更、インデックスで色を変える）
      const colors = [
        0x2563eb, // 明るい青
        0xdc2626, // 赤
        0x16a34a, // 緑
        0xea580c, // オレンジ
        0x9333ea, // 紫
        0x0891b2, // シアン
      ];
      const serverColor = colors[index % colors.length];
      const serverMaterial = new THREE.MeshStandardMaterial({
        color: serverColor,
        metalness: 0.2,
        roughness: 0.8,
        emissive: serverColor,
        emissiveIntensity: 0.1,
      });

      const serverMesh = new THREE.Mesh(serverGeometry, serverMaterial);
      serverMesh.position.set(
        0,
        devicePos.y + devicePos.height / 2,
        RACK_DIMENSIONS.depth * 0.15 // 前面に配置
      );

      // サーバーの輪郭線（エッジ）を追加
      const serverEdges = new THREE.EdgesGeometry(serverGeometry);
      const serverEdgeLine = new THREE.LineSegments(
        serverEdges,
        new THREE.LineBasicMaterial({ 
          color: 0x000000, 
          linewidth: 2,
          opacity: 0.8,
          transparent: true,
        })
      );
      serverEdgeLine.position.copy(serverMesh.position);
      scene.add(serverEdgeLine);

      // サーバーにテキストラベルを追加（troika-three-textを使用）
      const label = new Text();
      label.text = server.label || server.id;
      label.fontSize = Math.min(devicePos.height * 0.15, 0.02);
      label.color = 0xffffff;
      label.anchorX = 'center';
      label.anchorY = 'middle';
      label.maxWidth = RACK_DIMENSIONS.width * 0.8;
      label.position.set(
        0,
        devicePos.y + devicePos.height / 2,
        RACK_DIMENSIONS.depth * 0.5 // 前面に配置
      );
      label.sync();
      scene.add(label);

      // サーバーIDをカスタムプロパティに保存
      serverMesh.userData = {
        type: 'server',
        serverId: server.id,
        serverLabel: server.label,
      };
      label.userData = serverMesh.userData; // ラベルもクリック可能にする

      scene.add(serverMesh);
      meshRefs.current.set(server.id, serverMesh);
    });

    // 空きUを表示
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
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const freeUMesh = new THREE.Mesh(freeUGeometry, freeUMaterial);
      freeUMesh.position.set(
        0,
        freeUY + freeUHeight / 2,
        RACK_DIMENSIONS.depth * 0.1
      );
      scene.add(freeUMesh);
    });

    // マウスクリックイベント
    const handleClick = (event: MouseEvent) => {
      if (!raycasterRef.current || !camera || !renderer) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      // サーバーメッシュとラベルを含むすべてのオブジェクトをチェック
      const allObjects: THREE.Object3D[] = Array.from(meshRefs.current.values());
      scene.traverse((object) => {
        if (object.userData && object.userData.type === 'server') {
          if (!allObjects.includes(object)) {
            allObjects.push(object);
          }
        }
      });

      const intersects = raycasterRef.current.intersectObjects(allObjects);

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object as THREE.Mesh;
        const serverId = clickedMesh.userData.serverId;
        if (serverId && onServerClick) {
          onServerClick(serverId);
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
          {rackServers?.label || 'ラック'}
        </div>
        <div style={{ color: '#666' }}>
          容量: {rackCapacity}U | 使用中: {servers.length}台 | 空き: {freeUs.reduce((sum, f) => sum + (f.end - f.start + 1), 0)}U
        </div>
      </div>
    </div>
  );
}

