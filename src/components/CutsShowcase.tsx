import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Cada palavra vem acompanhada de um corte real que a ilustra:
 *  Precisão -> degradê simétrico na nuca | Estilo -> franja marcada | Detalhe -> acabamento na orelha
 */
const STEPS = [
  { n: '01', title: 'Precisão', text: 'Linhas milimétricas, do início ao fim.', photo: '/assets/carousel/corte-04.webp', blur: '/assets/carousel/blur-04.webp', alt: 'Degradê na nuca com acabamento simétrico', tilt: -2 },
  { n: '02', title: 'Estilo', text: 'O corte certo para o seu rosto.', photo: '/assets/carousel/corte-09.webp', blur: '/assets/carousel/blur-09.webp', alt: 'Corte com franja marcada e degradê lateral', tilt: 2.2 },
  { n: '03', title: 'Detalhe', text: 'Acabamento que faz a diferença.', photo: '/assets/carousel/corte-06.webp', blur: '/assets/carousel/blur-06.webp', alt: 'Acabamento limpo ao redor da orelha', tilt: -1.6 },
] as const;

/**
 * Seção "cinematográfica": o palco fica fixo enquanto você rola e três cortes se sucedem,
 * cada um com sua palavra. Em cada etapa a foto avança devagar (push-in) e o fundo muda de tom.
 */
const StaticCuts: React.FC = () => (
  <div className="bleed-mobile relative py-12 px-6 sm:px-10 space-y-16">
    {STEPS.map((s) => (
      <div key={s.n} className="flex flex-col items-center text-center">
        <div className="relative w-[min(66vw,300px)] aspect-[4/5]">
          <div className="absolute -inset-2 translate-x-2.5 translate-y-2.5 border border-white/25" aria-hidden="true" />
          <img src={s.photo} alt={s.alt} loading="lazy" className="relative w-full h-full object-cover grayscale contrast-110 border border-white/15" />
        </div>
        <p className="mt-10 text-xs uppercase tracking-[0.4em] text-white/60 font-semibold">{s.n}</p>
        <h3 className="mt-3 font-serif font-light text-[3rem] leading-none">{s.title}</h3>
        <p className="mt-4 max-w-[17rem] text-base text-white/70">{s.text}</p>
      </div>
    ))}
  </div>
);

export const CutsShowcase: React.FC = () => {
  if (reduced()) return <StaticCuts />;
  return <AnimatedCuts />;
};

const AnimatedCuts: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
          onUpdate: (self) => {
            const idx = Math.min(2, Math.floor(self.progress * 3));
            if (counter.current) counter.current.textContent = `0${idx + 1}`;
          },
        },
      });

      const third = 1 / 3;
      STEPS.forEach((s, i) => {
        const start = i * third;
        const card = `[data-card="${i}"]`;
        const cap = `[data-cap="${i}"]`;
        const bg = `[data-bg="${i}"]`;
        const img = `[data-img="${i}"]`;
        const tilt = s.tilt;

        // avanço lento da foto durante toda a etapa
        tl.fromTo(img, { scale: 1 }, { scale: 1.14, duration: third, immediateRender: false }, start);

        if (i > 0) {
          const t = start - 0.025;
          tl.fromTo(card, { opacity: 0, y: 70, scale: 0.92, rotate: tilt + 5 }, { opacity: 1, y: 0, scale: 1, rotate: tilt, duration: 0.085 }, t);
          tl.fromTo(cap, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.07 }, t + 0.02);
          tl.fromTo(bg, { opacity: 0 }, { opacity: 1, duration: 0.09 }, t);
        }
        if (i < STEPS.length - 1) {
          const t = start + third - 0.065;
          tl.fromTo(card, { opacity: 1, y: 0, scale: 1 }, { opacity: 0, y: -60, scale: 1.04, duration: 0.065, immediateRender: false }, t);
          tl.fromTo(cap, { opacity: 1, y: 0 }, { opacity: 0, y: -26, duration: 0.055, immediateRender: false }, t);
          tl.fromTo(bg, { opacity: 1 }, { opacity: 0, duration: 0.07, immediateRender: false }, t + 0.02);
        }
      });
      tl.fromTo('[data-bar]', { scaleY: 0, transformOrigin: 'top center' }, { scaleY: 1, duration: 1 }, 0);
      tl.to({}, { duration: 0.0001 }, 1); // garante a duração total de 1
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="bleed-mobile relative h-[260svh] sm:h-[230svh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* fundo: versões desfocadas das próprias fotos, em fusão suave */}
        <div className="absolute inset-0 fade-y">
          {STEPS.map((s, i) => (
            <img
              key={s.blur}
              data-bg={i}
              src={s.blur}
              alt=""
              aria-hidden="true"
              className={`absolute inset-0 w-full h-full object-cover scale-125 saturate-50 ${i === 0 ? '' : 'opacity-0'}`}
            />
          ))}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 38%, rgba(24,23,28,0.15) 0%, rgba(24,23,28,0.82) 100%)' }} />
        </div>

        {/* contador e barra de progresso */}
        <div className="absolute top-24 sm:top-28 right-5 sm:right-10 flex items-center gap-3 font-mono text-xs tracking-[0.2em] text-white/70">
          <span ref={counter}>01</span>
          <span className="text-white/30">/ 03</span>
        </div>
        <div className="absolute top-40 sm:top-44 right-[1.6rem] sm:right-[2.7rem] bottom-28 w-px bg-white/15 overflow-hidden" aria-hidden="true">
          <span data-bar className="block h-full w-full bg-white" />
        </div>

        {/* conteúdo centralizado na área à direita das letras (no celular) */}
        <div className="absolute inset-0 pl-[clamp(78px,13vw,190px)] sm:pl-0">
          {/* cartas com os cortes */}
          <div className="absolute inset-x-0 top-[16svh] sm:top-[16svh] flex justify-center">
            <div className="relative w-[min(72vw,320px)] sm:w-[min(24vw,320px)] aspect-[4/5]">
              {STEPS.map((s, i) => (
                <div
                  key={s.photo}
                  data-card={i}
                  className={`absolute inset-0 ${i === 0 ? '' : 'opacity-0'}`}
                  style={{ transform: `rotate(${s.tilt}deg)` }}
                >
                  {/* moldura deslocada (mesma linguagem do topo do site) */}
                  <div className="absolute -inset-2 translate-x-2.5 translate-y-2.5 border border-white/25" aria-hidden="true" />
                  <div className="relative w-full h-full overflow-hidden border border-white/15 bg-neutral-900 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.95)]">
                    <img
                      data-img={i}
                      src={s.photo}
                      alt={s.alt}
                      loading="lazy"
                      draggable={false}
                      className="w-full h-full object-cover grayscale contrast-110 will-change-transform"
                    />
                    <div className="light-sweep" aria-hidden="true" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* legendas */}
          <div className="absolute inset-x-0 bottom-[8svh] sm:bottom-[7svh] px-6 sm:px-10 text-center">
            <div className="relative h-40 sm:h-44">
              {STEPS.map((s, i) => (
                <div key={s.n} data-cap={i} className={`absolute inset-0 flex flex-col items-center justify-center ${i === 0 ? '' : 'opacity-0'}`}>
                  <p className="shiny-text text-xs uppercase tracking-[0.4em] font-semibold">{s.n}</p>
                  <h3 className="mt-3 font-serif font-light text-[3rem] sm:text-6xl leading-none">{s.title}</h3>
                  <p className="mt-4 max-w-[17rem] sm:max-w-md text-base sm:text-lg text-white/70">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
