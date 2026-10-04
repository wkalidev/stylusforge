'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MathUtils, type Group, type Mesh, type ShaderMaterial } from 'three';
import { createHaloMaterial } from '@/components/hero/haloMaterial';
import { createIngotGeometry } from '@/components/hero/ingotGeometry';
import { createMoltenMaterial } from '@/components/hero/moltenMaterial';

export interface LessonIngotSceneProps {
  /** 0 (cold steel) to 1 (molten): the share of the lesson's objectives that are met. */
  heat: number;
  /** prefers-reduced-motion: a still ingot whose heat changes without easing. */
  reducedMotion: boolean;
  /** False while the header is off-screen: rendering pauses. */
  active: boolean;
}

const HALO_INTENSITY = 0.55;

function HeatedIngot({ heat, animate }: { heat: number; animate: boolean }) {
  const group = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);
  const geometry = useMemo(() => createIngotGeometry(), []);
  const material = useMemo(() => createMoltenMaterial(0), []);
  const haloMaterial = useMemo(() => createHaloMaterial(), []);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      haloMaterial.dispose();
    },
    [geometry, material, haloMaterial],
  );

  // Without animation the frame loop runs on demand: apply the new heat and draw once.
  useEffect(() => {
    if (animate || !mesh.current || !halo.current) return;
    (mesh.current.material as ShaderMaterial).uniforms.uHeat.value = heat;
    (halo.current.material as ShaderMaterial).uniforms.uIntensity.value = HALO_INTENSITY * heat;
    invalidate();
  }, [heat, animate, invalidate]);

  useFrame((_, delta) => {
    if (!animate || !mesh.current || !halo.current || !group.current) return;
    const step = Math.min(delta, 0.05);
    const metal = (mesh.current.material as ShaderMaterial).uniforms;
    metal.uTime.value += step;
    // Heat rises and falls over about a second, like metal in and out of the fire.
    metal.uHeat.value = MathUtils.damp(metal.uHeat.value, heat, 2.2, step);
    (halo.current.material as ShaderMaterial).uniforms.uIntensity.value = HALO_INTENSITY * metal.uHeat.value;
    group.current.rotation.y += step * 0.25;
  });

  return (
    <>
      <mesh ref={halo} material={haloMaterial} position={[0, 0, -0.8]} scale={4.2}>
        <planeGeometry />
      </mesh>
      <group ref={group} rotation={[0.45, -0.55, 0]}>
        <mesh ref={mesh} geometry={geometry} material={material} />
      </group>
    </>
  );
}

/** The lesson header's ingot: it heats from cold steel to molten as objectives are met. */
export default function LessonIngotScene({ heat, reducedMotion, active }: LessonIngotSceneProps) {
  return (
    <Canvas
      aria-hidden='true'
      style={{ pointerEvents: 'none' }}
      frameloop={reducedMotion ? 'demand' : active ? 'always' : 'never'}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.2, 4.2], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
    >
      <HeatedIngot heat={heat} animate={!reducedMotion} />
    </Canvas>
  );
}
