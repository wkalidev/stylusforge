'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Float } from '@react-three/drei';
import { MathUtils, type Group, type Mesh, type Points, type ShaderMaterial } from 'three';
import { createHaloMaterial } from './haloMaterial';
import { createIngotGeometry } from './ingotGeometry';
import { createMoltenMaterial } from './moltenMaterial';
import { createSparksGeometry, createSparksMaterial } from './sparks';

export interface HeroSceneProps {
  /** prefers-reduced-motion: a still ingot, no sparks. */
  reducedMotion: boolean;
  /** Phones and touch screens: fewer sparks, lower pixel ratio, no antialiasing. */
  constrained: boolean;
  /** False while the hero is off-screen: rendering pauses. */
  active: boolean;
}

/** Pointer position over the whole window, normalized to [-1, 1]. */
function useWindowPointer() {
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
  return pointer;
}

function Ingot({ animate }: { animate: boolean }) {
  const group = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  const geometry = useMemo(() => createIngotGeometry(), []);
  const material = useMemo(() => createMoltenMaterial(), []);
  const halo = useMemo(() => createHaloMaterial(), []);
  const pointer = useWindowPointer();

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      halo.dispose();
    },
    [geometry, material, halo],
  );

  useFrame((_, delta) => {
    if (!animate || !group.current || !mesh.current) {
      return;
    }
    const step = Math.min(delta, 0.05);
    // Per-frame updates go through refs: the materials are three.js objects owned by the scene.
    (mesh.current.material as ShaderMaterial).uniforms.uTime.value += step;
    const ingot = group.current;
    ingot.rotation.y += step * 0.18;
    // Lean towards the pointer, easing so the motion stays heavy, like metal.
    ingot.rotation.x = MathUtils.damp(ingot.rotation.x, 0.42 + pointer.current.y * 0.18, 2.5, step);
    ingot.rotation.z = MathUtils.damp(ingot.rotation.z, -pointer.current.x * 0.14, 2.5, step);
  });

  return (
    <Float speed={animate ? 1.4 : 0} rotationIntensity={animate ? 0.15 : 0} floatIntensity={animate ? 0.5 : 0}>
      <Billboard position={[0, 0, -0.8]}>
        <mesh material={halo} scale={5.2}>
          <planeGeometry />
        </mesh>
      </Billboard>
      <group ref={group} rotation={[0.42, -0.55, 0]}>
        <mesh ref={mesh} geometry={geometry} material={material} />
      </group>
    </Float>
  );
}

function Sparks({ count }: { count: number }) {
  const pixelRatio = useThree((state) => state.viewport.dpr);
  const geometry = useMemo(() => createSparksGeometry(count), [count]);
  const material = useMemo(() => createSparksMaterial(pixelRatio), [pixelRatio]);
  const points = useRef<Points>(null);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((_, delta) => {
    if (points.current) {
      (points.current.material as ShaderMaterial).uniforms.uTime.value += Math.min(delta, 0.05);
    }
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}

/** The landing hero: a molten ingot floating over the forge, throwing sparks. */
export default function HeroScene({ reducedMotion, constrained, active }: HeroSceneProps) {
  return (
    <Canvas
      aria-hidden='true'
      // The ingot follows a window-level pointer listener; the canvas never needs pointer events,
      // so touches and clicks pass straight through to the page.
      style={{ pointerEvents: 'none' }}
      frameloop={reducedMotion ? 'demand' : active ? 'always' : 'never'}
      dpr={[1, constrained ? 1.25 : 1.75]}
      camera={{ position: [0, 0.35, 4.6], fov: 36 }}
      gl={{ antialias: !constrained, alpha: true, powerPreference: 'high-performance' }}
    >
      <Ingot animate={!reducedMotion} />
      {!reducedMotion && <Sparks count={constrained ? 90 : 320} />}
    </Canvas>
  );
}
