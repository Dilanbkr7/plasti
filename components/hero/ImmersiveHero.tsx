"use client";

import {
  Component,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion, MotionConfig } from "framer-motion";
import {
  chapterProgress,
  heroChapters,
  heroSettings,
  heroScrollProgress,
  heroStageInset,
  type HeroMotion,
} from "./hero-content";
import s from "./ImmersiveHero.module.css";
import { useHeroSceneScroll } from "./useHeroSceneScroll";

const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });
const SideRays = dynamic(() => import("./SideRays"), { ssr: false });

class SceneBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function ImmersiveHero() {
  const root = useRef<HTMLElement>(null);
  const scene = useRef<HeroMotion>({
    progress: 0,
    pointerX: 0,
    pointerY: 0,
    energy: 0,
  });
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [supported, setSupported] = useState(false);
  const goToChapter = useHeroSceneScroll(root, reduced);
  const sceneReady = useCallback(() => setReady(true), []);
  const sceneFailed = useCallback(() => {
    setReady(false);
    setSupported(false);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => setReduced(media.matches);
    preference();
    media.addEventListener("change", preference);
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    setSupported(Boolean(gl));
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    let intersects = false;
    const visibility = () => setVisible(intersects && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersects = entry.isIntersecting;
      visibility();
    });
    observer.observe(el);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", preference);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const el = root.current;
    const stage = el?.querySelector<HTMLElement>("[data-hero-stage]");
    if (!el || !stage) return;
    const copies = el.querySelectorAll<HTMLElement>("[data-hero-copy]");
    const landscape = el.querySelector("[data-landscape]");
    const line = el.querySelector("[data-hero-progress]");
    let disposed = false;
    let release = () => {};
    const instant = reduced;
    const context = gsap.context(() => {
      // The scroll sets the target; a frame-rate independent ease draws the
      // scene toward it, so a quick wheel step becomes a visible crossfade.
      const target = { scroll: 0, chapter: 0 };
      const shown = { scroll: 0, chapter: 0 };
      let settled = false;
      let current = -1;
      const draw = () => {
        const progress = shown.chapter;
        const index = Math.round(progress);
        scene.current.progress = instant ? index : progress;
        if (index !== current) {
          current = index;
          setActive(index);
        }
        copies.forEach((copy, i) => {
          const distance = i - progress;
          const blur = Math.min(8, Math.abs(distance) * 7);
          gsap.set(copy, {
            autoAlpha: instant
              ? Number(i === index)
              : Math.max(0, 1 - Math.abs(distance) * 1.8),
            y: instant ? 0 : distance * 65,
            filter: instant || blur < 0.05 ? "none" : `blur(${blur}px)`,
          });
        });
        gsap.set(line, { scaleX: shown.scroll });
        gsap.set(landscape, {
          scale: instant ? 1.08 : 1.08 + shown.scroll * 0.12,
          yPercent: instant ? 0 : shown.scroll * -5,
        });
      };
      const sync = () => {
        if (disposed) return;
        target.scroll = heroScrollProgress(
          el.getBoundingClientRect().top,
          el.offsetHeight,
          stage.offsetHeight,
          heroStageInset(stage),
        );
        target.chapter = chapterProgress(target.scroll);
        if (instant || !settled) {
          settled = true;
          Object.assign(shown, target);
          draw();
        }
      };
      const ease = (_time: number, deltaMs: number) => {
        if (disposed || instant) return;
        const chapterGap = target.chapter - shown.chapter;
        const scrollGap = target.scroll - shown.scroll;
        if (chapterGap === 0 && scrollGap === 0) return;
        if (Math.abs(chapterGap) < 0.001 && Math.abs(scrollGap) < 0.001)
          Object.assign(shown, target);
        else {
          const step =
            1 -
            Math.exp(
              (-heroSettings.transitionResponse * Math.min(deltaMs, 64)) /
                1000,
            );
          shown.chapter += chapterGap * step;
          shown.scroll += scrollGap * step;
        }
        draw();
      };
      gsap.ticker.add(ease);
      const trigger = ScrollTrigger.create({
        trigger: el,
        start: () => `top ${heroStageInset(stage)}px`,
        end: () => `bottom ${heroStageInset(stage) + stage.offsetHeight}px`,
        onUpdate: sync,
        onRefresh: sync,
        snap: {
          snapTo: [...heroSettings.sceneStops, 1],
          delay: 0.08,
          duration: reduced ? 0 : 0.1,
          inertia: false,
        },
      });
      const refresh = () => {
        if (!disposed) {
          trigger.refresh();
          sync();
        }
      };
      const resume = () => {
        if (!document.hidden) refresh();
      };
      // Native scroll remains authoritative after hash navigation, tab resume and hot reload.
      window.addEventListener("scroll", sync, { passive: true });
      window.addEventListener("resize", refresh);
      window.addEventListener("pageshow", refresh);
      window.addEventListener("load", refresh);
      document.addEventListener("visibilitychange", resume);
      const frame = requestAnimationFrame(refresh);
      void document.fonts.ready.then(refresh);
      sync();
      release = () => {
        gsap.ticker.remove(ease);
        cancelAnimationFrame(frame);
        window.removeEventListener("scroll", sync);
        window.removeEventListener("resize", refresh);
        window.removeEventListener("pageshow", refresh);
        window.removeEventListener("load", refresh);
        document.removeEventListener("visibilitychange", resume);
        trigger.kill();
      };
    }, el);
    return () => {
      disposed = true;
      release();
      context.revert();
    };
  }, [reduced]);

  return (
    <MotionConfig reducedMotion="user">
      <section
        ref={root}
        className={s.hero}
        aria-label="La colección PLASTIMAD, una nueva vida"
        style={
          {
            "--hero-height": heroSettings.scrollHeight,
            "--accent": heroChapters[active].accent,
            "--landscape-brightness": heroSettings.landscapeBrightness,
          } as CSSProperties
        }
      >
        <div
          className={s.stage}
          data-hero-stage
          onPointerMove={(event) => {
            if (reduced || event.pointerType !== "mouse") return;
            const rect = event.currentTarget.getBoundingClientRect();
            scene.current.pointerX =
              ((event.clientX - rect.left) / rect.width - 0.5) * 2;
            scene.current.pointerY =
              -((event.clientY - rect.top) / rect.height - 0.5) * 2;
          }}
          onPointerLeave={() => {
            scene.current.pointerX = 0;
            scene.current.pointerY = 0;
          }}
        >
          <div className={s.landscape} data-landscape>
            <Image
              src={heroSettings.landscape}
              fill
              preload
              sizes="100vw"
              alt=""
            />
          </div>
          <div className={s.shade} />
          <div className={s.focusVeil} aria-hidden="true" />
          <div className={s.sideLighting} aria-hidden="true">
            <SideRays
              {...heroSettings.sideRays}
              origin="top-right"
              speed={
                reduced || !visible ? 0 : heroSettings.sideRays.speed
              }
              followMouse={!reduced}
              mouseInfluence={0.12}
              falloff={1.4}
              glow={0.65}
              saturation={0.65}
              intro={false}
              maxDevicePixelRatio={1.25}
              style={{}}
            />
          </div>
          <div
            className={s.productStage}
            aria-label={`Maceta ${heroChapters[active].name}`}
          >
            <div
              className={s.productFallback}
              style={{ opacity: ready && supported && !reduced ? 0 : 1 }}
              aria-hidden="true"
            >
              <svg width="0" height="0" aria-hidden="true">
                <defs>
                  <filter
                    id="hero-product-cutout"
                    colorInterpolationFilters="sRGB"
                  >
                    <feColorMatrix
                      type="matrix"
                      values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -0.333 -0.333 -0.333 0 1"
                    />
                  </filter>
                </defs>
              </svg>
              <Image
                src={heroChapters[active].image}
                fill
                sizes="(max-width:760px) 78vw, 49vh"
                alt=""
                preload
              />
            </div>
            {supported && !reduced && (
              <div className={s.canvas} aria-hidden="true">
                <SceneBoundary onFailure={sceneFailed}>
                  <HeroScene
                    scene={scene}
                    active={visible}
                    chapter={active}
                    onReady={sceneReady}
                    onFailure={sceneFailed}
                  />
                </SceneBoundary>
              </div>
            )}
          </div>
          <div className={s.topline}>
            <span>PLASTIMAD / OBJETOS CON OTRA VIDA</span>
            <a href="#coleccion">Saltar a la colección ↗</a>
          </div>
          <div className={s.copyArea}>
            {heroChapters.map((chapter, index) => (
              <article
                key={chapter.id}
                data-hero-copy
                className={s.copy}
                aria-hidden={active !== index}
                inert={active !== index}
              >
                <p className={s.eyebrow}>{chapter.eyebrow}</p>
                <h2 aria-label={chapter.title.join(" ")}>
                  {chapter.title.map((line, j) => (
                    <span
                      key={line}
                      className={j === 1 ? s.accentLine : s.titleLine}
                      aria-hidden="true"
                    >
                      {line.split(" ").map((word) => (
                        <motion.span
                          key={word}
                          className={s.interactiveWord}
                          whileHover={
                            reduced
                              ? undefined
                              : {
                                  y: -7,
                                  rotate: -2,
                                  textShadow: `0 0 28px ${chapter.accent}`,
                                }
                          }
                          transition={{
                            type: "spring",
                            stiffness: 450,
                            damping: 26,
                          }}
                          onHoverStart={() => {
                            if (!reduced) scene.current.energy = 1;
                          }}
                          onHoverEnd={() => {
                            scene.current.energy = 0;
                          }}
                        >
                          {word}{" "}
                        </motion.span>
                      ))}
                    </span>
                  ))}
                </h2>
                <p className={s.description}>{chapter.description}</p>
                <a className={s.cta} href="#coleccion">
                  Descubre la colección <span>↗</span>
                </a>
              </article>
            ))}
          </div>
          <div className={s.productLabel} aria-live="polite">
            <span className={s.labelDot} />
            {heroChapters[active].name}
            <small>{heroChapters[active].detail}</small>
          </div>
          <div className={s.bottomline}>
            <span className={s.scrollHint}>
              SCROLL PARA DESCUBRIR <span>↓</span>
            </span>
            <nav className={s.chapters} aria-label="Escenas de la colección">
              {heroChapters.map((chapter, i) => (
                <button
                  key={chapter.id}
                  onClick={() => goToChapter(i)}
                  aria-label={`Ver maceta ${chapter.name}`}
                  aria-current={active === i ? "step" : undefined}
                >
                  <span>0{i + 1}</span>
                  <span>{chapter.name}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className={s.progress}>
            <span data-hero-progress />
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
