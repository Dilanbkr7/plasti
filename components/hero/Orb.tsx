"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, MathUtils, ShaderMaterial, Vector2 } from "three";
import { heroChapters, heroSettings, type HeroMotion } from "./hero-content";
import { orbFragment } from "./orb-shader";

const vertexShader = `varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

/** The supplied Orb GLSL, rendered inside the existing R3F canvas. */
export function Orb({
  scene,
  size,
  paused,
}: {
  scene: RefObject<HeroMotion>;
  size: number;
  paused: boolean;
}) {
  const material = useRef<ShaderMaterial>(null);
  const elapsed = useRef(0);
  const colors = useMemo(
    () => heroChapters.map((c) => c.orbColors.map((hex) => new Color(hex))),
    [],
  );
  const uniforms = useMemo(
    () => ({
      uResolution: { value: new Vector2(1, 1) },
      uTime: { value: 0 },
      uRotation: { value: 0 },
      uReach: { value: new Vector2() },
      uNear: { value: 0 },
      uAwake: { value: 0 },
      uBackground: { value: new Color(0) },
      uColor1: { value: new Color() },
      uColor2: { value: new Color() },
      uColor3: { value: new Color() },
      uScale: { value: 1 },
      uWobble: { value: 0.8 },
      uGlow: { value: 0.7 },
      uBleed: { value: 0.4 },
      uHighlight: { value: 0.7 },
      uSwirl: { value: 0 },
      uOrbit: { value: 0 },
      uEcho: { value: new Vector2(0, 0) },
      uReveal: { value: 1 },
      uOpacity: { value: heroSettings.orbIntensity },
      uTrail: { value: 0.7 },
      uTilt: { value: new Vector2(-0.12, 0.14) },
    }),
    [],
  );

  useFrame((_, delta) => {
    if (!material.current) return;
    const state = scene.current;
    const t = MathUtils.clamp(state.progress, 0, 2);
    const a = Math.floor(t),
      b = Math.min(a + 1, 2);
    const mix = t - a;
    const u = material.current.uniforms;
    for (let i = 0; i < 3; i++)
      (u[`uColor${i + 1}`].value as Color)
        .copy(colors[a][i])
        .lerp(colors[b][i], mix);
    if (!paused) elapsed.current += Math.min(delta, 0.05) * 0.35;
    u.uTime.value = elapsed.current;
    u.uSwirl.value = elapsed.current * 1.2;
    u.uOrbit.value = -elapsed.current + (paused ? 0 : state.pointerX * 0.4);
    u.uRotation.value = elapsed.current * 0.09;
    u.uReach.value.set(
      paused ? 0 : state.pointerX * 0.045,
      paused ? 0 : state.pointerY * 0.045,
    );
    u.uAwake.value = MathUtils.damp(
      u.uAwake.value,
      paused ? 0 : state.energy * 0.3,
      4,
      delta,
    );
  });
  return (
    <mesh position={[0, 0.25, -1]} scale={[size, size, 1]} renderOrder={1}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertexShader}
        fragmentShader={orbFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
