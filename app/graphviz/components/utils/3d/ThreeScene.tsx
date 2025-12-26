/**
 * Three.jsシーンの共通ラッパーコンポーネント
 * 各タブの3D表示で共通して使用
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CameraControls, CameraInstructions } from './CameraControls';

interface ThreeSceneProps {
  children?: React.ReactNode;
  width?: number;
  height?: number;
  backgroundColor?: string;
  enableOrbitControls?: boolean;
  onSceneReady?: (scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer, controls?: any) => void;
  onRender?: (scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) => void;
  showControls?: boolean;
  showInstructions?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function ThreeScene({
  children,
  width,
  height,
  backgroundColor = '#f0f0f0',
  enableOrbitControls = true,
  onSceneReady,
  onRender,
  showControls = false,
  showInstructions = false,
  style,
  className,
}: ThreeSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = width || container.clientWidth;
    const containerHeight = height || container.clientHeight;

    // シーン作成
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(backgroundColor);
    sceneRef.current = scene;

    // カメラ作成（PerspectiveCamera）
    const camera = new THREE.PerspectiveCamera(
      75, // FOV
      containerWidth / containerHeight,
      0.1, // near
      1000 // far
    );
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // レンダラー作成
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerWidth, containerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // ライト追加
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // OrbitControls（必要に応じて）
    let controls: any = null;
    if (enableOrbitControls) {
      // OrbitControlsは動的インポート（Next.jsの最適化のため）
      import('three/examples/jsm/controls/OrbitControls.js').then((module) => {
        const OrbitControls = module.OrbitControls;
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 0, 0);
        controls.minDistance = 0.5;
        controls.maxDistance = 100;
        controlsRef.current = controls;
        
        // コールバックを再度呼び出し（controlsが設定された後）
        if (onSceneReady) {
          onSceneReady(scene, camera, renderer, controls);
        }
      });
    }

    // リサイズハンドラー
    const handleResize = () => {
      if (!container || !camera || !renderer) return;

      const newWidth = width || container.clientWidth;
      const newHeight = height || container.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // レンダーループ
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (controls) {
        controls.update();
      }

      if (onRender && scene && camera && renderer) {
        onRender(scene, camera, renderer);
      }

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };

    animate();

    // コールバック呼び出し（controlsが無い場合のみ）
    if (onSceneReady && !enableOrbitControls) {
      onSceneReady(scene, camera, renderer);
    }

    setIsReady(true);

    // クリーンアップ
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (controls) {
        controls.dispose();
      }

      if (renderer) {
        renderer.dispose();
        if (container && renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      }

      // シーンのリソースをクリーンアップ
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    };
  }, [width, height, backgroundColor, enableOrbitControls, onSceneReady, onRender, showControls, showInstructions]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: width || '100%',
        height: height || '100%',
        position: 'relative',
        ...style,
      }}
    >
      {!isReady && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#6B7280',
            fontSize: '14px',
          }}
        >
          読み込み中...
        </div>
      )}
      {showControls && isReady && (
        <CameraControls
          camera={cameraRef.current}
          controls={controlsRef.current}
        />
      )}
      {showInstructions && isReady && <CameraInstructions />}
      {children}
    </div>
  );
}


