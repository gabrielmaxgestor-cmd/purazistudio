import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface Props {
  text: string;
  direction?: 1 | -1; // 1 = esquerda → direita | -1 = direita → esquerda
  duration?: number; // segundos para completar um ciclo
  className?: string;
}

/**
 * Faixa de texto "fantasma" em movimento contínuo (inspirada em Scroll Velocity / Marquee do React Bits).
 * Acelera quando o usuário rola a página e desacelera suavemente depois.
 */
export const GhostMarquee: React.FC<Props> = ({ text, direction = 1, duration = 40, className = '' }) => {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tween = gsap.fromTo(
      el,
      { xPercent: direction === 1 ? -50 : 0 },
      { xPercent: direction === 1 ? 0 : -50, duration, ease: 'none', repeat: -1 }
    );

    const proxy = { v: 1 };
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const target = 1 + Math.min(Math.abs(self.getVelocity()) / 500, 4);
        if (target > proxy.v) proxy.v = target;
      },
    });
    const tick = () => {
      proxy.v += (1 - proxy.v) * 0.05;
      tween.timeScale(proxy.v);
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      st.kill();
      tween.kill();
    };
  }, [direction, duration]);

  return (
    <div className={`overflow-hidden whitespace-nowrap select-none pointer-events-none ${className}`} aria-hidden="true">
      <div ref={track} className="inline-flex will-change-transform">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="inline-block px-[0.4em]">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
};
