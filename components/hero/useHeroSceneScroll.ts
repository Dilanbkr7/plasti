"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { chapterProgress, heroSettings, heroStageInset } from "./hero-content";

/** One wheel burst or vertical swipe advances one complete scene. */
export function useHeroSceneScroll(
  root: RefObject<HTMLElement | null>,
  instant: boolean,
) {
  const navigate = useRef<((index: number) => void) | null>(null);
  useEffect(() => {
    const element = root.current;
    const stage = element?.querySelector<HTMLElement>("[data-hero-stage]");
    if (!element || !stage) return;
    let animation: gsap.core.Tween | null = null;
    let lastWheel = -Infinity;
    let releasedWheel = false;
    let touchStart: { x: number; y: number } | null = null;
    const bounds = () => {
      const rect = element.getBoundingClientRect();
      const inset = heroStageInset(stage);
      const stageHeight = stage.offsetHeight;
      return {
        top: rect.top + window.scrollY - inset,
        travel: element.offsetHeight - stageHeight,
        inside: rect.top <= inset + 2 && rect.bottom >= inset + stageHeight - 2,
      };
    };
    const excluded = (target: EventTarget | null) =>
      target instanceof Element &&
      Boolean(
        target.closest("dialog, input, textarea, select, [data-lenis-prevent]"),
      );
    const nextTarget = (direction: number) => {
      const { top, travel, inside } = bounds();
      if (!inside || travel <= 0) return null;
      const current = Math.round(
        chapterProgress((window.scrollY - top) / travel),
      );
      const next = current + direction;
      if (next < 0 || next >= heroSettings.sceneStops.length) return null;
      return top + travel * heroSettings.sceneStops[next];
    };
    const move = (target: number) => {
      animation?.kill();
      const playhead = { y: window.scrollY };
      animation = gsap.to(playhead, {
        y: target,
        duration: instant ? 0 : heroSettings.sceneStepDuration,
        ease: "power2.out",
        onUpdate: () =>
          window.scrollTo({ top: playhead.y, behavior: "instant" }),
        onComplete: () => {
          animation = null;
        },
      });
    };
    navigate.current = (index) => {
      const { top, travel } = bounds();
      if (index >= 0 && index < heroSettings.sceneStops.length)
        move(top + travel * heroSettings.sceneStops[index]);
    };
    const wheel = (event: WheelEvent) => {
      if (
        event.ctrlKey ||
        excluded(event.target) ||
        Math.abs(event.deltaY) <= Math.abs(event.deltaX) ||
        !bounds().inside
      )
        return;
      const now = performance.now();
      const sameGesture = now - lastWheel < heroSettings.wheelGestureGap;
      lastWheel = now;
      if (!sameGesture) releasedWheel = false;
      if (releasedWheel && !animation?.isActive()) return;
      if (animation?.isActive() || sameGesture) {
        event.preventDefault();
        return;
      }
      const target = nextTarget(Math.sign(event.deltaY));
      // At either end, release normal scrolling to the header or catalog.
      if (target === null) {
        releasedWheel = true;
        return;
      }
      event.preventDefault();
      move(target);
    };
    const startTouch = (event: TouchEvent) => {
      if (
        event.touches.length !== 1 ||
        excluded(event.target) ||
        !bounds().inside
      ) {
        touchStart = null;
        return;
      }
      touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    };
    const touchMove = (event: TouchEvent) => {
      if (!touchStart || event.touches.length !== 1) return;
      const dy = touchStart.y - event.touches[0].clientY;
      const dx = touchStart.x - event.touches[0].clientX;
      if (
        Math.abs(dy) > Math.abs(dx) &&
        (animation?.isActive() || nextTarget(Math.sign(dy)) !== null)
      )
        event.preventDefault();
    };
    const endTouch = (event: TouchEvent) => {
      if (!touchStart) return;
      const start = touchStart;
      touchStart = null;
      const touch = event.changedTouches[0];
      if (!touch || animation?.isActive()) return;
      const dy = start.y - touch.clientY;
      if (
        Math.abs(dy) < 24 ||
        Math.abs(dy) <= Math.abs(start.x - touch.clientX)
      )
        return;
      const target = nextTarget(Math.sign(dy));
      if (target !== null) move(target);
    };
    const cancelTouch = () => {
      touchStart = null;
    };
    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("touchstart", startTouch, { passive: true });
    window.addEventListener("touchmove", touchMove, { passive: false });
    window.addEventListener("touchend", endTouch, { passive: true });
    window.addEventListener("touchcancel", cancelTouch, { passive: true });
    return () => {
      navigate.current = null;
      animation?.kill();
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("touchstart", startTouch);
      window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("touchend", endTouch);
      window.removeEventListener("touchcancel", cancelTouch);
    };
  }, [root, instant]);
  return useCallback((index: number) => navigate.current?.(index), []);
}
