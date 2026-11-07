import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * Abertura (≈3s): tela totalmente escura -> uma luz e uma fumaça atravessam por trás
 * da logo e a revelam. No fim, o site aparece de forma instantânea (corte seco).
 */
export const IntroSplash: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const root = useRef<HTMLDivElement>(null);
  const logoWrap = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden';

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      html.style.overflow = prevOverflow;
      onDone();
    };

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: finish });

      // fumaça e luz entram imediatamente
      tl.to('[data-smoke]', { opacity: 1, duration: 0.5, ease: 'power1.out' }, 0)
        .fromTo('[data-smoke-svg]', { xPercent: -14 }, { xPercent: 14, duration: 2.7, ease: 'none' }, 0)
        .fromTo('[data-blob]', { x: '-75vw' }, { x: '75vw', duration: 2.3, ease: 'power1.inOut', stagger: 0.16 }, 0)
        // a luz varre a logo da esquerda p/ direita e a vai revelando
        .fromTo(logoWrap.current, { '--p': '-25%' }, { '--p': '130%', duration: 1.9, ease: 'power2.inOut' }, 0.1)
        .fromTo(logoWrap.current, { scale: 1.05 }, { scale: 1, duration: 2.6, ease: 'power1.out' }, 0)
        .fromTo('[data-glow]', { opacity: 0 }, { opacity: 1, duration: 1.6, ease: 'power2.out' }, 0.4)
        .to({}, { duration: 0.1 }); // respiro final  -> total ≈ 3s
    }, root);

    // segurança: a abertura nunca passa de 4s
    const safety = window.setTimeout(finish, 3800);

    return () => {
      window.clearTimeout(safety);
      ctx.revert();
      html.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mask = 'linear-gradient(100deg, #000 calc(var(--p) - 24%), transparent var(--p))';

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[200] bg-black overflow-hidden flex items-center justify-center"
      role="presentation"
      aria-hidden="true"
    >
      {/* fumaça: ruído fractal em movimento */}
      <div
        data-smoke
        className="absolute inset-0 opacity-0"
        style={{
          WebkitMaskImage: 'radial-gradient(ellipse 65% 55% at 50% 50%, #000 20%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 65% 55% at 50% 50%, #000 20%, transparent 100%)',
        }}
      >
        <svg data-smoke-svg className="absolute -inset-x-1/2 inset-y-0 w-[200%] h-full" preserveAspectRatio="none">
          <filter id="intro-smoke" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.013" numOctaves="4" seed="7" />
            <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.9 -0.78" />
          </filter>
          <rect width="100%" height="100%" filter="url(#intro-smoke)" opacity="0.4" />
        </svg>
      </div>

      {/* nuvens de luz suaves cruzando */}
      {[
        { top: '22%', size: 'w-[62vw] h-[34vw]', o: 'bg-white/[0.10]' },
        { top: '40%', size: 'w-[50vw] h-[30vw]', o: 'bg-white/[0.13]' },
        { top: '58%', size: 'w-[70vw] h-[32vw]', o: 'bg-white/[0.08]' },
      ].map((b, i) => (
        <div
          key={i}
          data-blob
          className={`absolute left-1/2 -ml-[30vw] rounded-full blur-[90px] ${b.size} ${b.o}`}
          style={{ top: b.top }}
        />
      ))}

      {/* brilho de fundo que cresce conforme a logo aparece */}
      <div
        data-glow
        className="absolute left-1/2 top-1/2 w-[min(110vw,900px)] h-[min(60vw,420px)] -translate-x-1/2 -translate-y-1/2 opacity-0"
        style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.16), transparent)' }}
      />

      {/* logo revelada por uma máscara que acompanha o feixe de luz */}
      <div ref={logoWrap} className="relative w-[min(70vw,520px)]" style={{ ['--p' as string]: '-25%' }}>
        <img
          src="/assets/logo-purazi-white.png"
          alt=""
          className="w-full h-auto select-none"
          style={{ WebkitMaskImage: mask, maskImage: mask }}
          draggable={false}
        />
        <div
          className="absolute top-1/2 h-[260%] w-[38%] pointer-events-none"
          style={{
            left: 'var(--p)',
            transform: 'translate(-50%, -50%) skewX(-14deg)',
            background:
              'radial-gradient(ellipse at center, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 38%, transparent 70%)',
            filter: 'blur(16px)',
          }}
        />
      </div>
    </div>
  );
};
