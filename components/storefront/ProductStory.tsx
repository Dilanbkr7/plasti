"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import s from "./LandingFeatures.module.css";
export function ProductStory() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add(
      "(min-width: 761px) and (prefers-reduced-motion: no-preference)",
      () => {
        const context = gsap.context(() => {
          gsap.fromTo(
            "[data-story-image]",
            { scale: 1.04, y: 12 },
            {
              scale: 1.15,
              y: -12,
              ease: "none",
              scrollTrigger: {
                trigger: root.current,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
          gsap.utils.toArray<HTMLElement>("[data-story-copy]").forEach((el) =>
            gsap.fromTo(
              el,
              { opacity: 0.35, y: 20 },
              {
                opacity: 1,
                y: 0,
                scrollTrigger: {
                  trigger: el,
                  start: "top 85%",
                  end: "top 45%",
                  scrub: true,
                },
              },
            ),
          );
        }, root);
        return () => context.revert();
      },
    );
    return () => media.revert();
  }, []);
  return (
    <section ref={root} className={s.story} id="nuestra-historia">
      <div className={s.storyImage}>
        <Image
          data-story-image
          src="/images/coleccion/facetada.webp"
          alt="Maceta Facetada de la colección PLASTIMAD"
          fill
          sizes="(max-width:760px) 90vw, 45vw"
        />
        <span>PLASTIMAD / DISEÑO CON CARÁCTER</span>
      </div>
      <div className={s.storyText}>
        <article data-story-copy>
          <span className={s.kicker}>01 / EL ORIGEN</span>
          <h2>
            Una nueva historia
            <br />
            <em>para el plástico.</em>
          </h2>
          <p>
            PLASTIMAD desarrolla soluciones con plástico reciclado para integrar
            diseño y naturaleza en espacios residenciales, comerciales y
            urbanos.
          </p>
        </article>
        <article data-story-copy>
          <span className={s.kicker}>02 / EL DISEÑO</span>
          <h2>
            Una forma de
            <br />
            <em>mirar diferente.</em>
          </h2>
          <p>
            Las seis formas del catálogo exploran curvas, líneas y superficies
            con textura. Encuentra la silueta que acompaña tu proyecto.
          </p>
        </article>
        <article data-story-copy>
          <span className={s.kicker}>03 / TU PERSPECTIVA</span>
          <h2>
            Explora una
            <br />
            <em>nueva dimensión.</em>
          </h2>
          <p>
            Explora Cónica, Semiesférica y Facetada en el recorrido del hero. En
            la colección encontrarás los seis modelos y sus fichas.
          </p>
          <Link className={s.textLink} href="#coleccion">
            Explorar las seis macetas ↗
          </Link>
          <small>
            Fotografías de los productos del catálogo. Consulta colores y
            características en cada ficha.
          </small>
        </article>
      </div>
    </section>
  );
}
