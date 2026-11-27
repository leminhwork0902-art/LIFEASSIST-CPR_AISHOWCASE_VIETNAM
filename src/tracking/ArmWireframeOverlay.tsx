import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ProceduralArmHandRig } from './ProceduralArmHandMesh';
import type { ArmHandFrame } from './types';

interface Props {
  frames: readonly ArmHandFrame[] | null;
  width: number;
  height: number;
  mirrored?: boolean;
}

export const ArmWireframeOverlay: React.FC<Props> = ({
  frames,
  width,
  height,
  mirrored = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rigRef = useRef<ProceduralArmHandRig | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const aspect = (width || 1280) / (height || 720);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.01, 100);
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const rig = new ProceduralArmHandRig(0x22ff66, 0x44ffaa);
    scene.add(rig.group);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    rigRef.current = rig;

    return () => {
      rig.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current || !width || !height) return;
    const aspect = width / height;
    cameraRef.current.left = -aspect;
    cameraRef.current.right = aspect;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  }, [width, height]);

  useEffect(() => {
    if (!frames || !rigRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
      return;
    }
    rigRef.current.update(frames);
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  }, [frames]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        transform: mirrored ? 'scaleX(-1)' : 'none',
      }}
    />
  );
};