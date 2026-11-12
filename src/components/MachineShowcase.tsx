import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export type MachineVariant = 'a' | 'b' | 'c';

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Palavras que sobem uma a uma (efeito "split text") */
const Words: React.FC<{ text: string; attr: string }> = ({ text, attr }) => (
  <>
    {text.split(' ').map((w, i, arr) => (
      <React.Fragment key={i}>
        <span className="inline-block overflow-hidden align-bottom pb-[0.16em] -mb-[0.16em]">
          <span className="inline-block will-change-transform" {...{ [attr]: '' }}>
            {w}
          </span>
        </span>
        {i < arr.length - 1 ? ' ' : ''}
      </React.Fragment>
    ))}
  </>
);

/* ═════════════════════════════════════════════════════════════════
   OPÇÃO A — "Macro": a foto ocupa a tela inteira e percorre a máquina
   ao rolar (como uma câmera passando rente ao metal).
   ═════════════════════════════════════════════════════════════════ */
const MacroA: React.FC = () => {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (reduced()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-a-img]',
        { objectPosition: '10% 58%', scale: 1.04 },
        {
          objectPosition: '90% 58%',
          scale: 1,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: 0.7 },
        }
      );
      gsap.from('[data-a-word]', {
        yPercent: 115,
        opacity: 0,
        filter: 'blur(10px)',
        duration: 1.15,
        stagger: 0.08,
        ease: 'power4.out',
        scrollTrigger: { trigger: '[data-a-cap]', start: 'top 92%', once: true },
      });
      gsap.from('[data-a-fade]', {
        opacity: 0,
        y: 22,
        duration: 1,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: '[data-a-cap]', start: 'top 92%', once: true },
      });
      gsap.from('[data-a-line]', {
        scaleX: 0,
        transformOrigin: 'left center',
        duration: 1.4,
        ease: 'power3.inOut',
        scrollTrigger: { trigger: '[data-a-cap]', start: 'top 92%', once: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="bleed-mobile relative h-[76svh] min-h-[500px] sm:h-[600px] my-4 sm:my-8">
      {/* mídia com bordas dissolvidas (mistura com o fundo, sem "quadrado") */}
      <div className="absolute inset-0 fade-y overflow-hidden">
        <img
          data-a-img
          src="/assets/clipper-clean.webp"
          alt="Máquina de corte profissional em detalhe"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover will-change-transform"
          style={{ objectPosition: '10% 58%' }}
        />
        <div className="light-sweep" aria-hidden="true" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(24,23,28,0.6) 100%)' }}
        />
      </div>

      <div data-a-cap className="absolute inset-x-0 bottom-0 px-6 sm:px-10 pb-10 sm:pb-14">
        <p data-a-fade className="shiny-text text-xs sm:text-[11px] uppercase tracking-[0.4em] font-semibold">
          Visagismo
        </p>
        <h3 className="mt-3 font-serif font-light text-[2.7rem] sm:text-6xl leading-[1.04] max-w-[10em]">
          <Words text="Precisão em cada detalhe." attr="data-a-word" />
        </h3>
        <span data-a-line className="mt-5 block h-px w-24 bg-white/60" />
      </div>
    </section>
  );
};

/* ═════════════════════════════════════════════════════════════════
   OPÇÃO B — "Zoom cinematográfico": a tela fica fixa enquanto você rola;
   a câmera entra na máquina e três palavras aparecem em sequência.
   ═════════════════════════════════════════════════════════════════ */
const STEPS = [
  { n: '01', title: 'Precisão', text: 'Linhas milimétricas, do início ao fim.' },
  { n: '02', title: 'Estilo', text: 'O corte certo para o seu rosto.' },
  { n: '03', title: 'Detalhe', text: 'Acabamento que faz a diferença.' },
];

const ZoomB: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (reduced()) return;
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
      // a câmera entra na máquina
      tl.fromTo('[data-b-img]', { scale: 1, transformOrigin: '34% 66%' }, { scale: 3.1, duration: 1 }, 0);
      tl.fromTo('[data-b-bar]', { scaleY: 0, transformOrigin: 'top center' }, { scaleY: 1, duration: 1 }, 0);
      // legendas em sequência
      tl.fromTo('[data-b-cap="0"]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.07 }, 0.0);
      tl.to('[data-b-cap="0"]', { opacity: 0, y: -24, duration: 0.07 }, 0.26);
      tl.fromTo('[data-b-cap="1"]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.07 }, 0.36);
      tl.to('[data-b-cap="1"]', { opacity: 0, y: -24, duration: 0.07 }, 0.62);
      tl.fromTo('[data-b-cap="2"]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.07 }, 0.72);
      tl.to({}, { duration: 0.0001 }, 1); // garante a duração total de 1
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="bleed-mobile relative h-[250svh] sm:h-[220svh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="absolute inset-0 fade-y">
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              data-b-img
              src="/assets/clipper-clean.webp"
              alt="Máquina de corte profissional"
              loading="lazy"
              className="fade-oval w-[165%] sm:w-[70%] max-w-none h-auto shrink-0 will-change-transform"
            />
          </div>
          <div className="light-sweep" aria-hidden="true" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 25%, rgba(24,23,28,0.75) 100%)' }}
          />
        </div>

        {/* contador e barra de progresso */}
        <div className="absolute top-24 sm:top-28 right-5 sm:right-10 flex items-center gap-3 font-mono text-xs tracking-[0.2em] text-white/70">
          <span ref={counter}>01</span>
          <span className="text-white/30">/ 03</span>
        </div>
        <div className="absolute top-40 sm:top-44 right-[1.6rem] sm:right-[2.7rem] bottom-28 w-px bg-white/15 overflow-hidden" aria-hidden="true">
          <span data-b-bar className="block h-full w-full bg-white" />
        </div>

        {/* legendas */}
        <div className="absolute inset-x-0 bottom-[16svh] px-6 sm:px-10 text-center">
          <div className="relative h-36 sm:h-44">
            {STEPS.map((s, i) => (
              <div key={s.n} data-b-cap={i} className="absolute inset-0 flex flex-col items-center justify-center opacity-0">
                <p className="shiny-text text-xs uppercase tracking-[0.4em] font-semibold">{s.n}</p>
                <h3 className="mt-3 font-serif font-light text-[3.2rem] sm:text-7xl leading-none">{s.title}</h3>
                <p className="mt-4 max-w-[18rem] sm:max-w-md text-base sm:text-lg text-white/70">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════════
   OPÇÃO C — "Pilha de cortes": fotos reais dos cortes em cartas que se
   sucedem sozinhas; também dá para arrastar para o lado.
   ═════════════════════════════════════════════════════════════════ */
const PHOTOS = Array.from({ length: 10 }, (_, i) => `/assets/carousel/corte-${String(i + 1).padStart(2, '0')}.webp`);
const VISIBLE = 5;
const ROT = [0, -3.2, 2.6, -2, 1.6];

const DeckC: React.FC = () => {
  const root = useRef<HTMLElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const order = useRef<number[]>(PHOTOS.map((_, i) => i));
  const busy = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const visible = useRef(true);
  const [current, setCurrent] = useState(1);

  const place = (animate: boolean) => {
    order.current.forEach((cardIdx, pos) => {
      const el = cards.current[cardIdx];
      if (!el) return;
      const shown = pos < VISIBLE;
      const v = {
        x: 0,
        y: Math.min(pos, VISIBLE) * 18,
        scale: shown ? 1 - pos * 0.055 : 1 - VISIBLE * 0.055,
        rotate: shown ? ROT[pos] : 0,
        opacity: shown ? 1 - pos * 0.18 : 0,
        zIndex: 50 - pos,
      };
      if (animate) gsap.to(el, { ...v, duration: 0.7, ease: 'power3.out', overwrite: true });
      else gsap.set(el, v);
    });
  };

  const sendAway = (dir: 1 | -1) => {
    if (busy.current) return;
    busy.current = true;
    const topIdx = order.current[0];
    const top = cards.current[topIdx];
    if (!top) return;
    gsap.to(top, {
      x: `${dir * 125}%`,
      rotate: dir * 16,
      opacity: 0,
      duration: 0.55,
      ease: 'power2.in',
      onComplete: () => {
        order.current.push(order.current.shift() as number);
        gsap.set(top, { x: 0, rotate: 0 });
        place(true);
        setCurrent(order.current[0] + 1);
        busy.current = false;
      },
    });
  };

  useLayoutEffect(() => {
    place(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (reduced()) return;
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting), { threshold: 0.35 });
    if (root.current) io.observe(root.current);
    const start = () => {
      window.clearInterval(timer.current);
      timer.current = window.setInterval(() => visible.current && sendAway(1), 3200);
    };
    start();

    // arrastar a carta do topo
    const area = root.current?.querySelector<HTMLElement>('[data-deck]');
    let startX = 0;
    let dragging = false;
    const down = (e: PointerEvent) => {
      if (busy.current) return;
      dragging = true;
      startX = e.clientX;
      window.clearInterval(timer.current);
      area?.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const top = cards.current[order.current[0]];
      if (top) gsap.set(top, { x: dx, rotate: dx * 0.06 });
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 70) sendAway(dx > 0 ? 1 : -1);
      else place(true);
      start();
    };
    area?.addEventListener('pointerdown', down);
    area?.addEventListener('pointermove', move);
    area?.addEventListener('pointerup', up);
    area?.addEventListener('pointercancel', up);
    return () => {
      window.clearInterval(timer.current);
      io.disconnect();
      area?.removeEventListener('pointerdown', down);
      area?.removeEventListener('pointermove', move);
      area?.removeEventListener('pointerup', up);
      area?.removeEventListener('pointercancel', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (reduced()) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-c-fade]', {
        opacity: 0,
        y: 26,
        duration: 1,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: root.current, start: 'top 80%', once: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative py-10 sm:py-14 text-center">
      <p data-c-fade className="shiny-text text-xs sm:text-[11px] uppercase tracking-[0.4em] font-semibold">
        Nossos cortes
      </p>
      <h3 data-c-fade className="mt-3 font-serif font-light text-[2.3rem] sm:text-5xl leading-tight">
        Precisão em cada detalhe.
      </h3>

      <div
        data-deck
        className="relative mx-auto mt-10 w-[min(68vw,300px)] aspect-[4/5] cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: 'pan-y' }}
        aria-label="Fotos de cortes. Arraste para o lado para ver o próximo."
      >
        {PHOTOS.map((src, i) => (
          <div
            key={src}
            ref={(el) => {
              cards.current[i] = el;
            }}
            className="absolute inset-0 overflow-hidden border border-white/15 bg-neutral-900 shadow-[0_24px_50px_-18px_rgba(0,0,0,0.9)] will-change-transform"
          >
            <img src={src} alt="" draggable={false} loading="lazy" className="w-full h-full object-cover grayscale contrast-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          </div>
        ))}
      </div>

      <div data-c-fade className="mt-14 flex items-center justify-center gap-4 font-mono text-sm tracking-[0.2em]">
        <span className="text-white">{String(current).padStart(2, '0')}</span>
        <span className="h-px w-16 bg-white/25" />
        <span className="text-white/40">{String(PHOTOS.length).padStart(2, '0')}</span>
      </div>
      <p data-c-fade className="mt-3 text-xs uppercase tracking-[0.22em] text-white/45">
        Arraste para ver mais
      </p>
    </section>
  );
};

/* ═════════════════════════════════════════════════════════════════ */

export const MachineShowcase: React.FC<{ variant: MachineVariant }> = ({ variant }) => {
  // key faz o componente reiniciar por completo ao trocar de opção
  if (variant === 'b') return <ZoomB key="b" />;
  if (variant === 'c') return <DeckC key="c" />;
  return <MacroA key="a" />;
};
