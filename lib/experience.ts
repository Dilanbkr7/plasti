import { create } from "zustand";

export const colors = [
  { id: "nogal", name: "Nogal", hex: "#70503a" },
  { id: "carbon", name: "Carbón", hex: "#343935" },
  { id: "arena", name: "Arena", hex: "#a38b67" },
] as const;
export const sizes = ["S", "M", "L"] as const;
export const finishes = ["Natural", "Cepillado"] as const;
export type ProductColor = (typeof colors)[number]["id"];
export type ProductSize = (typeof sizes)[number];
export type ProductFinish = (typeof finishes)[number];
interface ExperienceState {
  color: ProductColor;
  size: ProductSize;
  finish: ProductFinish;
  activeScene: number;
  paused: boolean;
  reducedMotion: boolean;
  turn: number;
  modelStatus: "preview" | "loading" | "ready" | "error";
  setColor: (color: ProductColor) => void;
  setSize: (size: ProductSize) => void;
  setFinish: (finish: ProductFinish) => void;
  setScene: (activeScene: number) => void;
  setPaused: (paused: boolean) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  rotate: () => void;
  setModelStatus: (modelStatus: ExperienceState["modelStatus"]) => void;
}
export const useExperience = create<ExperienceState>((set) => ({
  color: "nogal",
  size: "M",
  finish: "Natural",
  activeScene: 0,
  paused: false,
  reducedMotion: false,
  turn: 0,
  modelStatus: "preview",
  setColor: (color) => set({ color }),
  setSize: (size) => set({ size }),
  setFinish: (finish) => set({ finish }),
  setScene: (activeScene) => set({ activeScene }),
  setPaused: (paused) => set({ paused }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  rotate: () => set((state) => ({ turn: state.turn + 1 })),
  setModelStatus: (modelStatus) => set({ modelStatus }),
}));
export const chapters = [
  { id: "origen", label: "El origen" },
  { id: "diseno", label: "El diseño" },
  { id: "personaliza", label: "Tu esencia" },
  { id: "naturaleza", label: "Por naturaleza" },
  { id: "espacio", label: "Tu espacio" },
  { id: "contacto", label: "El siguiente paso" },
] as const;
// GSAP writes these values; R3F reads them without rendering React on each frame.
export const sceneMotion = {
  cameraX: 0,
  cameraY: 1.15,
  cameraZ: 7.7,
  cameraRX: -0.075,
  cameraRY: 0,
  cameraRZ: 0,
  modelX: 0,
  modelY: -0.1,
  modelZ: 0,
  modelRX: 0,
  modelRY: 0.48,
  modelRZ: 0,
  scale: 0.96,
};
export const sceneKeyframes = [
  { ...sceneMotion },
  {
    ...sceneMotion,
    cameraX: 0.6,
    cameraZ: 7.1,
    cameraRY: 0.075,
    modelRY: 1.25,
    scale: 1.03,
  },
  { ...sceneMotion, cameraZ: 7.8, modelRY: Math.PI * 2 + 0.48, scale: 0.96 },
  {
    ...sceneMotion,
    cameraX: -0.4,
    cameraZ: 6.8,
    cameraRY: -0.055,
    modelRY: Math.PI * 2 + 0.9,
    scale: 1.04,
  },
  {
    ...sceneMotion,
    cameraY: 1.4,
    cameraZ: 8.6,
    cameraRX: -0.11,
    modelRY: Math.PI * 2 + 0.2,
    scale: 0.87,
  },
  { ...sceneMotion, cameraZ: 7.1, modelRY: Math.PI * 4 + 0.48, scale: 1.08 },
];
