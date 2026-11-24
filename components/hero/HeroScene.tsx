"use client";

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  Group,
  MathUtils,
  Mesh,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from "three";
import { heroChapters, heroSettings, type HeroMotion } from "./hero-content";

const productVertex = `varying vec2 vUv;
void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
// Presentation-only white key. Source product photographs remain untouched.
const productFragment = `uniform sampler2D uMap; uniform float uOpacity; uniform float uExposure;
varying vec2 vUv;
void main(){
 vec4 photo=texture2D(uMap,vUv);
 float white=min(photo.r,min(photo.g,photo.b));
 float alpha=1.0-smoothstep(0.12,0.42,white);
 if(alpha*uOpacity<0.005)discard;
 gl_FragColor=vec4(photo.rgb*uExposure+vec3(0.025)*alpha,alpha*uOpacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

type Props = {
  scene: RefObject<HeroMotion>;
  active: boolean;
  chapter: number;
  paused: boolean;
  onReady: () => void;
  onFailure: () => void;
};

function PlanterLayers({
  scene,
  paused,
  onReady,
  chapter,
}: Pick<Props, "scene" | "paused" | "onReady" | "chapter">) {
  const textures = useTexture(heroChapters.map((chapter) => chapter.image));
  const uniforms = useMemo(
    () =>
      textures.map((texture, i) => ({
        uMap: { value: texture },
        uOpacity: { value: i === 0 ? 1 : 0 },
        uExposure: { value: heroSettings.productExposure },
      })),
    [textures],
  );
  const meshes = useRef<(Mesh | null)[]>([]);
  const group = useRef<Group>(null);
  const { viewport, invalidate } = useThree();
  const announced = useRef(false);
  useEffect(() => {
    invalidate();
  }, [chapter, invalidate]);
  const height = viewport.height * 0.96;
  const x = 0;
  const y = 0;
  const aim = useMemo(() => new Vector3(), []);
  const time = useRef(0);

  useEffect(() => {
    textures.forEach((texture) => {
      texture.colorSpace = SRGBColorSpace;
      texture.needsUpdate = true;
    });
  }, [textures]);

  useFrame(({ camera }, dt) => {
    const delta = Math.min(dt, 0.05);
    const state = scene.current;
    const p = state.progress;
    const px = paused ? 0 : state.pointerX;
    const py = paused ? 0 : state.pointerY;
    if (!paused) time.current += delta;
    const transition = Math.sin(p * Math.PI);
    camera.position.x = MathUtils.damp(
      camera.position.x,
      px * 0.04 + transition * 0.025,
      16,
      delta,
    );
    camera.position.y = MathUtils.damp(camera.position.y, py * 0.07, 16, delta);
    camera.position.z = MathUtils.damp(
      camera.position.z,
      9 - Math.abs(transition) * 0.35,
      16,
      delta,
    );
    camera.lookAt(aim);
    if (group.current) {
      group.current.position.set(
        x,
        y + (paused ? 0 : Math.sin(time.current * 0.9) * 0.035),
        0,
      );
      group.current.rotation.y = MathUtils.damp(
        group.current.rotation.y,
        px * 0.045,
        18,
        delta,
      );
      group.current.rotation.x = MathUtils.damp(
        group.current.rotation.x,
        -py * 0.018,
        18,
        delta,
      );
    }
    meshes.current.forEach((mesh, i) => {
      if (!mesh) return;
      const offset = i - p;
      const opacity = Math.max(0, 1 - Math.abs(offset));
      (mesh.material as ShaderMaterial).uniforms.uOpacity.value = opacity;
      mesh.visible = opacity > 0.005;
      mesh.position.y = offset * height * 0.11;
      mesh.position.z = -Math.abs(offset) * 0.5;
      mesh.rotation.z = offset * -0.055;
      mesh.scale.setScalar(1 - Math.abs(offset) * 0.12);
    });
    if (!announced.current) {
      announced.current = true;
      onReady();
    }
  });

  return (
    <group ref={group} position={[x, y, 0]}>
      {heroChapters.map((chapter, i) => (
        <mesh
          key={chapter.id}
          ref={(mesh) => {
            meshes.current[i] = mesh;
          }}
          renderOrder={3 + i}
        >
          <planeGeometry args={[height, height]} />
          <shaderMaterial
            vertexShader={productVertex}
            fragmentShader={productFragment}
            uniforms={uniforms[i]}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function ContextEvents({ onFailure }: { onFailure: () => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const failure = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    canvas.addEventListener("webglcontextlost", failure);
    return () => canvas.removeEventListener("webglcontextlost", failure);
  }, [gl, onFailure]);
  return null;
}

export default function HeroScene({
  scene,
  active,
  chapter,
  paused,
  onReady,
  onFailure,
}: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 40 }}
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "demand"}
      gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
      fallback={null}
    >
      <ContextEvents onFailure={onFailure} />
      <Suspense fallback={null}>
        <PlanterLayers
          scene={scene}
          paused={paused}
          onReady={onReady}
          chapter={chapter}
        />
      </Suspense>
    </Canvas>
  );
}
