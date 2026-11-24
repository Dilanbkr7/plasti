/** Imágenes, textos y ritmo del hero. Usa fotos cuadradas de productos del catálogo. */
export const heroSettings = {
  landscape: "/images/hero-bosque.webp",
  landscapeBrightness: 0.58,
  productExposure: 1.5,
  scrollHeight: "300svh", // Una pantalla para la escena y dos para las transiciones.
  scrollScrub: true as boolean | number, // true = inmediato; 0.15 = suavizado de 150 ms.
  sceneStops: [0, 0.48, 0.9] as readonly number[],
  sceneStepDuration: 0.14,
  transitionResponse: 7, // Suavizado de textos, maceta y fondo: mayor = más rápido (7 ≈ 0,4 s).
  wheelGestureGap: 100, // Una ráfaga de eventos de trackpad cuenta como un gesto.
  orbIntensity: 0.48,
  cameraTravel: 0.28,
  sideRays: {
    rayColor1: "#c1ad7b",
    rayColor2: "#8db9be",
    intensity: 2.8,
    opacity: 0.9,
    scrollBoost: 0.675, // Pulso al 50 % de la intensidad anterior; 0 lo desactiva.
    speed: 0.45,
    spread: 2.4,
    density: 5,
    sharpness: 0.3,
    response: 20,
  },
};
export const heroChapters = [
  {
    id: "conica",
    name: "Cónica",
    eyebrow: "01 / UNA PRESENCIA QUE CRECE",
    title: ["Dale altura.", "Dale vida."],
    description:
      "Una silueta que se abre a nuevas posibilidades. Descubre la Cónica y encuentra un nuevo punto de atención para tu espacio.",
    detail: "Maceta Cónica · Colección PLASTIMAD",
    image: "/images/coleccion/conica.webp",
    accent: "#c1ad7b",
    orbColors: ["#c1ad7b", "#a0b88b", "#203327"],
    word: "CRECE",
  },
  {
    id: "semiesferica",
    name: "Semiesférica",
    eyebrow: "02 / EL EQUILIBRIO DE LAS CURVAS",
    title: ["Baja el ritmo.", "Abre tu espacio."],
    description:
      "Curvas suaves y una boca amplia. La Semiesférica invita a construir una composición que se siente en equilibrio.",
    detail: "Maceta Semiesférica · Colección PLASTIMAD",
    image: "/images/coleccion/semiesferica.webp",
    accent: "#b9cda2",
    orbColors: ["#b9cda2", "#d0d8bc", "#203b32"],
    word: "RESPIRA",
  },
  {
    id: "facetada",
    name: "Facetada",
    eyebrow: "03 / UNA FORMA DE SER DIFERENTE",
    title: ["Diseño que destaca.", "Naturaleza que inspira."],
    description:
      "Planos, luces y sombras. La Facetada convierte la geometría en una presencia con carácter para tu próximo rincón verde.",
    detail: "Maceta Facetada · Colección PLASTIMAD",
    image: "/images/coleccion/facetada.webp",
    accent: "#d1bc91",
    orbColors: ["#d1bc91", "#b4c79c", "#23382a"],
    word: "DESTACA",
  },
] as const;
export type HeroMotion = {
  progress: number;
  pointerX: number;
  pointerY: number;
  energy: number;
};
export function heroStageInset(stage: HTMLElement) {
  return Number.parseFloat(getComputedStyle(stage).top) || 0;
}
/** Read actual page geometry, including a reload at a section anchor. */
export function heroScrollProgress(
  top: number,
  heroHeight: number,
  stageHeight: number,
  topInset = 0,
) {
  const travel = heroHeight - stageHeight;
  return travel > 0 ? Math.max(0, Math.min(1, (topInset - top) / travel)) : 0;
}
/** Cambios rápidos entre 26–34 % y 59–67 % del recorrido. */
export function chapterProgress(scroll: number) {
  if (scroll < 0.26) return 0;
  if (scroll < 0.34) return (scroll - 0.26) / 0.08;
  if (scroll < 0.59) return 1;
  if (scroll < 0.67) return 1 + (scroll - 0.59) / 0.08;
  return 2;
}
