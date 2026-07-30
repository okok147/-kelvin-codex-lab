"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "@/app/art-portfolio.module.css";

const sceneOrder = [
  "OPENING",
  "PROOF MODE",
  "PROOF LEDGER",
  "PROJECTS",
  "CASE ATLAS",
  "FIELD CASE",
  "SYSTEM DNA",
  "ROLE FIT",
  "PRINCIPLES",
];

export function AuteurMotion() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState(sceneOrder[0]);

  useEffect(() => {
    const ring = ringRef.current;
    const dot = dotRef.current;
    const site = ring?.closest<HTMLElement>("main");
    if (!ring || !dot || !site) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let ringX = targetX;
    let ringY = targetY;
    let cursorFrame = 0;
    let scrollFrame = 0;

    site.setAttribute("data-motion-ready", "true");

    const renderCursor = () => {
      ringX += (targetX - ringX) * 0.16;
      ringY += (targetY - ringY) * 0.16;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      cursorFrame = window.requestAnimationFrame(renderCursor);
    };

    const onPointerMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      site.style.setProperty("--auteur-x", `${targetX}px`);
      site.style.setProperty("--auteur-y", `${targetY}px`);
      site.setAttribute("data-cursor-visible", "true");
    };

    const onPointerOver = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      site.toggleAttribute("data-cursor-active", Boolean(target?.closest("a, button, [role='button']")));
    };

    const updateProgress = () => {
      scrollFrame = 0;
      const available = document.documentElement.scrollHeight - window.innerHeight;
      const progress = available > 0 ? Math.min(1, window.scrollY / available) : 0;
      site.style.setProperty("--page-progress", String(progress));
    };

    const onScroll = () => {
      if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateProgress);
    };

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.setAttribute("data-visible", "true");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -12%", threshold: 0.08 });

    const sceneObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const nextScene = visible?.target.getAttribute("data-scene");
      if (nextScene) setScene(nextScene);
    }, { rootMargin: "-34% 0px -52%", threshold: [0, 0.1, 0.35] });

    site.querySelectorAll("[data-reveal]").forEach((element) => {
      if (reducedMotion) element.setAttribute("data-visible", "true");
      else revealObserver.observe(element);
    });
    site.querySelectorAll("[data-scene]").forEach((element) => sceneObserver.observe(element));

    updateProgress();
    if (finePointer && !reducedMotion) {
      cursorFrame = window.requestAnimationFrame(renderCursor);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerover", onPointerOver, { passive: true });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.cancelAnimationFrame(cursorFrame);
      window.cancelAnimationFrame(scrollFrame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerover", onPointerOver);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      revealObserver.disconnect();
      sceneObserver.disconnect();
      site.removeAttribute("data-motion-ready");
      site.removeAttribute("data-cursor-visible");
      site.removeAttribute("data-cursor-active");
    };
  }, []);

  const sceneIndex = Math.max(0, sceneOrder.indexOf(scene));

  return (
    <>
      <div className={styles.auteurCursorRing} ref={ringRef} aria-hidden="true"><i /></div>
      <div className={styles.auteurCursorDot} ref={dotRef} aria-hidden="true" />
      <aside className={styles.sceneRail} aria-hidden="true" style={{ "--scene-index": sceneIndex } as CSSProperties}>
        <span>{String(sceneIndex + 1).padStart(2, "0")}</span>
        <div><i /></div>
        <strong>{scene}</strong>
      </aside>
    </>
  );
}
