"use client";

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import {
  Box3,
  Color,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type Material,
} from "three";
import { Icon } from "@/components/ui/Icons";
import { planterColors } from "@/lib/storefront";
import s from "./PlanterModelViewer.module.css";

class ViewerBoundary extends Component<
  { children: ReactNode; onRetry: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className={s.message} role="alert">
        <Icon name="rotate" />
        <strong>No pudimos abrir el modelo 3D.</strong>
        <span>Puedes seguir viendo las fotografías del producto.</span>
        <button onClick={this.props.onRetry}>Volver a intentar</button>
      </div>
    ) : (
      this.props.children
    );
  }
}

function LoadedModel({
  url,
  color,
  onReady,
}: {
  url: string;
  color: string;
  onReady: (height: number) => void;
}) {
  const { scene } = useGLTF(url, "/decoders/draco/", false);
  const { invalidate } = useThree();
  const model = useMemo(() => {
    const object = scene.clone(true);
    const tint = new Color(
      planterColors.find((c) => c.name === color)?.hex || "#30322e",
    );
    const materials: MeshStandardMaterial[] = [];
    object.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const cloneMaterial = (source: Material) => {
        const material = source.clone();
        if (material instanceof MeshStandardMaterial) {
          materials.push(material);
          const preview = color !== "Negro carbón";
          material.onBeforeCompile = (shader) => {
            if (!preview) return;
            shader.uniforms.uPlanterTint = { value: tint };
            shader.fragmentShader =
              "uniform vec3 uPlanterTint;\n" + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <color_fragment>",
              "#include <color_fragment>\nfloat planterLight = dot(diffuseColor.rgb, vec3(0.2126,0.7152,0.0722));\ndiffuseColor.rgb = uPlanterTint * mix(0.55, 1.2, smoothstep(0.0, 0.3, planterLight));",
            );
          };
          material.customProgramCacheKey = () =>
            `plastimad-${preview ? color : "original"}`;
        }
        return material;
      };
      child.material = Array.isArray(child.material)
        ? child.material.map(cloneMaterial)
        : cloneMaterial(child.material);
    });
    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    return {
      object,
      materials,
      scale: 2 / Math.max(size.x, size.y, size.z),
      height: (size.y * 2) / Math.max(size.x, size.y, size.z),
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
    };
  }, [scene, color]);
  useEffect(() => {
    invalidate();
    onReady(model.height);
  }, [model, onReady, invalidate]);
  useEffect(
    () => () => {
      model.materials.forEach((material) => material.dispose());
    },
    [model],
  );
  return (
    <group scale={model.scale}>
      <group position={model.offset}>
        <primitive object={model.object} dispose={null} />
      </group>
    </group>
  );
}

function ContextStatus({ onLost }: { onLost: () => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onLost]);
  return null;
}

export default function PlanterModelViewer({
  url,
  name,
  color,
}: {
  url: string;
  name: string;
  color: string;
}) {
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const probe = document.createElement("canvas");
      try {
        const gl = probe.getContext("webgl2");
        setSupported(Boolean(gl));
        gl?.getExtension("WEBGL_lose_context")?.loseContext();
      } catch {
        setSupported(false);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const [targetHeight, setTargetHeight] = useState(0.9);
  const modelReady = useCallback((height: number) => {
    setTargetHeight(height / 2);
    setReady(true);
  }, []);
  const contextLost = useCallback(() => setLost(true), []);
  const retry = () => {
    useGLTF.clear(url);
    setLost(false);
    setReady(false);
    setAttempt((n) => n + 1);
  };
  return (
    <div
      className={s.viewer}
      role="group"
      aria-label={`Vista 3D interactiva de ${name}`}
    >
      <div className={s.label}>
        <span className={s.liveDot} />
        ESTUDIO 3D <span>/ {name}</span>
      </div>
      <ViewerBoundary key={`${url}-${attempt}`} onRetry={retry}>
        {supported === false ? (
          <div className={s.message} role="status">
            <strong>La vista 3D no está disponible en este navegador.</strong>
            <span>
              Selecciona Vista del producto para continuar con las fotografías.
            </span>
          </div>
        ) : supported === null ? (
          <div className={s.loading} role="status">
            Comprobando la vista 3D…
          </div>
        ) : lost ? (
          <div className={s.message} role="alert">
            <strong>La vista 3D se ha pausado.</strong>
            <button onClick={retry}>Reabrir modelo</button>
          </div>
        ) : (
          <>
            <Canvas
              camera={{
                position: [2.8, 1.9, 2.8],
                fov: 40,
                near: 0.05,
                far: 30,
              }}
              dpr={[1, 1.5]}
              frameloop="demand"
              gl={{
                antialias: true,
                alpha: true,
                powerPreference: "low-power",
              }}
              fallback={
                <div className={s.message}>
                  Tu navegador no admite 3D. Puedes ver las fotografías.
                </div>
              }
            >
              <ContextStatus onLost={contextLost} />
              <ambientLight intensity={1.1} />
              <hemisphereLight args={["#fff8e9", "#536448", 1.6]} />
              <directionalLight position={[3, 5, 3]} intensity={3.5} />
              <directionalLight
                position={[-3, 2, -2]}
                intensity={2}
                color="#d9e5eb"
              />
              <Suspense fallback={null}>
                <LoadedModel url={url} color={color} onReady={modelReady} />
                <ContactShadows
                  position={[0, -0.015, 0]}
                  opacity={0.28}
                  scale={6}
                  blur={2.5}
                  far={4}
                  frames={1}
                  resolution={256}
                />
              </Suspense>
              <OrbitControls
                makeDefault
                enablePan={false}
                enableDamping={false}
                minDistance={2.6}
                maxDistance={7}
                minPolarAngle={0.12}
                maxPolarAngle={Math.PI / 2 - 0.04}
                target={[0, targetHeight, 0]}
              />
            </Canvas>
            {!ready && (
              <div className={s.loading} role="status">
                <span />
                Preparando tu maceta en 3D…
              </div>
            )}
          </>
        )}
      </ViewerBoundary>
      <p className={s.hint}>
        Arrastra para girar · Acerca con la rueda o dos dedos
      </p>
    </div>
  );
}
