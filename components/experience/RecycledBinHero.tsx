"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import styles from "./RecycledBinHero.module.css";

const source =
  "https://www.wwf.org.ec/?389213/Ecuador-lidera-una-historica-hoja-de-ruta-para-reducir-la-contaminacion--por-plasticos";
const chapters = ["El origen", "El problema", "La transformación"];

export function RecycledBinHero() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, CustomEase);
    const videoEase = CustomEase.create("bin-video", "0.43,-0.01,0.14,1");
    const finalEase = CustomEase.create("bin-video-final", "0.41,-0.01,0.14,1");
    const media = gsap.matchMedia();
    media.add(
      {
        mobile: "(max-width: 700px)",
        desktop: "(min-width: 701px)",
        reduce: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const el = root.current;
        if (!el) return;
        const mobile = !!context.conditions?.mobile;
        const reduce = !!context.conditions?.reduce;
        setReduced(reduce);
        if (reduce) return;
        const copies = el.querySelectorAll<HTMLElement>("[data-copy]");
        const product = el.querySelector<HTMLElement>("[data-product]");
        const background = el.querySelector<HTMLElement>("[data-background]");
        const blur = el.querySelector<HTMLElement>("[data-blur]");
        const shade = el.querySelector<HTMLElement>("[data-shade]");
        const progress = el.querySelector<HTMLElement>("[data-progress]");
        const hint = el.querySelector<HTMLElement>("[data-hint]");
        const mobileTop = (index: number) =>
          Math.max(
            window.innerHeight * 0.45,
            copies[index].offsetTop + copies[index].offsetHeight + 24,
          );
        const mobileSize = (index: number) =>
          Math.max(
            120,
            Math.min(
              window.innerWidth * 0.78,
              window.innerHeight * 0.43,
              window.innerHeight - mobileTop(index) - 72,
            ),
          );
        gsap.set(copies, { autoAlpha: 0, y: 90 });
        gsap.set(copies[0], { autoAlpha: 1, y: 0 });
        gsap.set(product, {
          x: 0,
          xPercent: -50,
          left: "50%",
          top: mobile ? "72%" : "75%",
          width: mobile ? "74vw" : "min(43vw, 62svh)",
        });
        gsap.set(background, { y: 0 });
        let last = -1;
        const updateStage = (progress: number) => {
          const next = progress < 0.31 ? 0 : progress < 0.68 ? 1 : 2;
          if (next !== last) {
            last = next;
            setActive(next);
          }
        };
        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.45,
            invalidateOnRefresh: true,
            onUpdate: (self) => updateStage(self.progress),
            onRefresh: (self) => updateStage(self.progress),
          },
        });
        // A positive translation moves Fondo DOWN as the page scrolls down.
        timeline.to(
          background,
          {
            y: () => window.innerHeight * (mobile ? 0.3 : 0.44),
            ease: "none",
            duration: 3,
          },
          0,
        );
        timeline.to(progress, { scaleX: 1, ease: "none", duration: 3 }, 0);
        timeline.to(hint, { autoAlpha: 0, duration: 0.2 }, 0.1);
        timeline.to(
          copies[0],
          {
            y: mobile ? -220 : -360,
            autoAlpha: 0,
            duration: 0.55,
            ease: "power2.inOut",
          },
          0.25,
        );
        timeline.to(
          product,
          {
            top: () => (mobile ? `${mobileTop(1)}px` : "16%"),
            left: mobile ? "50%" : "68%",
            width: () => (mobile ? `${mobileSize(1)}px` : "min(48vw, 75svh)"),
            ease: videoEase,
            duration: 0.9,
          },
          0.25,
        );
        timeline.to(shade, { opacity: 1, duration: 0.6 }, 0.4);
        timeline.to(copies[1], { y: 0, autoAlpha: 1, duration: 0.5 }, 0.8);
        timeline.to(blur, { opacity: 0.65, duration: 0.7 }, 0.8);
        timeline.to(copies[1], { y: -150, autoAlpha: 0, duration: 0.4 }, 1.7);
        timeline.to(
          product,
          {
            top: () => (mobile ? `${mobileTop(2)}px` : "12%"),
            left: mobile ? "50%" : "77%",
            width: () => (mobile ? `${mobileSize(2)}px` : "min(51vw, 83svh)"),
            ease: finalEase,
            duration: 0.85,
          },
          1.7,
        );
        timeline.to(copies[2], { y: 0, autoAlpha: 1, duration: 0.55 }, 2.0);
        timeline.to(blur, { opacity: 1, duration: 0.6 }, 1.9);
        ScrollTrigger.refresh();
      },
      root,
    );
    return () => media.revert();
  }, []);

  return (
    <main ref={root} className={styles.hero} data-stage={active} id="origen">
      <a className="skip-link" href="#producto">
        Saltar al producto
      </a>
      <div className={styles.viewport}>
        <div className={styles.background} data-background aria-hidden="true">
          <Image
            src="/images/hero-bosque.webp"
            alt=""
            fill
            preload
            sizes="100vw"
            className={styles.landscape}
          />
          <div className={styles.blur} data-blur>
            <Image
              src="/images/hero-bosque.webp"
              alt=""
              fill
              sizes="100vw"
              className={styles.landscape}
            />
          </div>
        </div>
        <div className={styles.baseShade} aria-hidden="true" />
        <div className={styles.readingShade} data-shade aria-hidden="true" />
        <header className={styles.header}>
          <Link
            className={styles.brand}
            href="/"
            aria-label="PLASTIMAD, inicio"
          >
            PLASTIMAD<span>OTRA VIDA PARA EL PLÁSTICO</span>
          </Link>
          <nav aria-label="Navegación principal">
            <Link href="/catalogo">La colección ↗</Link>
            <Link href="/acceso">Mi cuenta</Link>
          </nav>
        </header>
        <div className={styles.product} data-product aria-hidden="true">
          <Image
            src="/images/hero-basurero.webp"
            alt=""
            width={1254}
            height={1254}
            sizes="(max-width: 700px) 80vw, 55vw"
            preload
          />
        </div>
        <div className={styles.copies}>
          <section
            className={`${styles.copy} ${styles.intro}`}
            data-copy
            aria-hidden={!reduced && active !== 0}
            inert={!reduced && active !== 0}
            aria-labelledby="bin-title"
          >
            <p className={styles.eyebrow}>UN MATERIAL. OTRA HISTORIA.</p>
            <h1 id="bin-title">
              El plástico merece
              <br />
              <em>otra historia.</em>
            </h1>
            <p className={styles.description}>
              Basureros hechos con plástico reciclado.
              <br />
              Una segunda vida para el material.
            </p>
            <Image
              className={styles.staticProduct}
              src="/images/hero-basurero.webp"
              alt="Basurero gris de plástico reciclado con abertura circular"
              width={1254}
              height={1254}
            />
          </section>
          <section
            className={`${styles.copy} ${styles.problem}`}
            data-copy
            aria-hidden={!reduced && active !== 1}
            inert={!reduced && active !== 1}
            aria-labelledby="bin-problem"
          >
            <p className={styles.eyebrow}>02 / ECUADOR · EL DESAFÍO</p>
            <h2 id="bin-problem">
              <span>627.000</span>
              <br />
              toneladas.
            </h2>
            <p className={styles.description}>
              Residuos plásticos municipales generados en Ecuador en 2022.
            </p>
            <p className={styles.stat}>
              Solo el <strong>7,7 %</strong> se recicló.
            </p>
            <a
              className={styles.source}
              href={source}
              target="_blank"
              rel="noreferrer"
            >
              WWF Ecuador · Publicado en 2024 · Datos de 2022 ↗
            </a>
            <Image
              className={styles.staticProduct}
              src="/images/hero-basurero.webp"
              alt="Basurero de plástico reciclado"
              width={1254}
              height={1254}
            />
          </section>
          <section
            id="hero-final"
            className={`${styles.copy} ${styles.final}`}
            data-copy
            aria-hidden={!reduced && active !== 2}
            inert={!reduced && active !== 2}
            aria-labelledby="bin-final"
          >
            <p className={styles.eyebrow}>03 / DEL MATERIAL AL OBJETO</p>
            <h2 id="bin-final">
              El cambio
              <br />
              <em>toma forma.</em>
            </h2>
            <p className={styles.description}>
              Plástico reciclado convertido en un basurero. Una nueva función
              para el material. Un nuevo objeto para tu espacio.
            </p>
            <Link className={styles.contact} href="/catalogo">
              Explora el catálogo <span>↗</span>
            </Link>
            <Image
              className={styles.staticProduct}
              src="/images/hero-basurero.webp"
              alt="Detalle del basurero gris reciclado"
              width={1254}
              height={1254}
            />
          </section>
        </div>
        <div className={styles.scrollHint} data-hint aria-hidden="true">
          <span />
          DESLIZA PARA DESCUBRIR
        </div>
        <footer className={styles.footer}>
          <span>{chapters[active]}</span>
          <span>
            0{active + 1} <i>/ 03</i>
          </span>
          <div className={styles.track}>
            <div data-progress />
          </div>
        </footer>
      </div>
      <div className={styles.endAnchor} id="producto" aria-hidden="true" />
    </main>
  );
}
