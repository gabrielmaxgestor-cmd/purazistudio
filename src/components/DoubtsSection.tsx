import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MessageCircle } from 'lucide-react';
import { MagneticButton } from './MagneticButton';
import { whatsappLink } from '../utils/siteConfig';

gsap.registerPlugin(ScrollTrigger);

const PHOTOS = Array.from({ length: 10 }, (_, i) => `/assets/carousel/corte-${String(i + 1).padStart(2, '0')}.webp`);

// linhas com ordens diferentes para não repetir a mesma sequência
const ROW_TOP = PHOTOS;
const ROW_BOTTOM = [...PHOTOS.slice(5), ...PHOTOS.slice(0, 5)].reverse();

const Row: React.FC<{ photos: string[]; rowRef: React.RefObject<HTMLDivElement | null> }> = ({ photos, rowRef }) => (
  <div className="relative flex-1 min-h-0 overflow-hidden">
    <div ref={rowRef} className="flex h-full w-max will-change-transform">
      {[...photos, ...photos].map((src, i) => (
        <div key={i} className="h-full aspect-[199/223] shrink-0 mr-3 sm:mr-4 overflow-hidden bg-neutral-900">
          <img
            src={src}
            alt=""
            loading="lazy"
            draggable={false}
            className="w-full h-full object-cover grayscale brightness-[0.55] contrast-110 transition-[filter] duration-700 hover:brightness-90"
          />
        </div>
      ))}
    </div>
  </div>
);

export const DoubtsSection: React.FC = () => {
  const section = useRef<HTMLElement>(null);
  const topRow = useRef<HTMLDivElement>(null);
  const bottomRow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      // linha de cima: esquerda -> direita | linha de baixo: direita -> esquerda (contínuas)
      const t1 = gsap.fromTo(topRow.current, { xPercent: -50 }, { xPercent: 0, duration: 75, ease: 'none', repeat: -1 });
      const t2 = gsap.fromTo(bottomRow.current, { xPercent: 0 }, { xPercent: -50, duration: 85, ease: 'none', repeat: -1 });

      // a rolagem da página acelera o carrossel e ele desacelera suavemente (scroll velocity)
      const proxy = { v: 1 };
      ScrollTrigger.create({
        trigger: section.current,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          const target = 1 + Math.min(Math.abs(self.getVelocity()) / 450, 5);
          if (target > proxy.v) proxy.v = target;
        },
      });
      const tick = () => {
        proxy.v += (1 - proxy.v) * 0.05;
        t1.timeScale(proxy.v);
        t2.timeScale(proxy.v);
      };
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={section} id="duvidas" className="relative isolate overflow-hidden bg-[#0a0a0b] grain">
      {/* carrossel de fundo: duas linhas em sentidos opostos */}
      <div className="absolute inset-0 flex flex-col gap-3 sm:gap-4 py-0">
        <Row photos={ROW_TOP} rowRef={topRow} />
        <Row photos={ROW_BOTTOM} rowRef={bottomRow} />
      </div>

      {/* escurecimento + vinheta para o texto respirar */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 62% at 50% 50%, rgba(10,10,11,0.94) 0%, rgba(10,10,11,0.72) 55%, rgba(10,10,11,0.35) 100%)',
        }}
      />
      {/* degradês de transição: de cima (bloco anterior) e para baixo (rodapé) */}
      <div className="absolute inset-x-0 top-0 h-40 sm:h-56 bg-gradient-to-b from-[#1d1c21] to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-40 sm:h-56 bg-gradient-to-t from-[#0e0e0e] to-transparent pointer-events-none" />

      <div className="relative z-10 min-h-[680px] sm:min-h-[760px] flex flex-col items-center justify-center text-center px-6 py-28">
        <p data-reveal="up" className="text-[11px] uppercase tracking-[0.45em] text-white/60">
          Dúvidas
        </p>
        <h2
          data-reveal="up"
          data-delay="0.1"
          className="mt-6 font-['Cormorant_Garamond',serif] font-normal text-[clamp(2.6rem,6.4vw,5.4rem)] leading-[1.04] max-w-[12em]"
        >
          Ficou com alguma dúvida?
        </h2>
        <p
          data-reveal="up"
          data-delay="0.2"
          className="mt-7 max-w-md text-[15px] leading-relaxed text-white/60"
        >
          Fale direto com o barbeiro pelo WhatsApp. Respondemos sobre cortes, horários e serviços.
        </p>
        <div data-reveal="up" data-delay="0.3" className="mt-10">
          <MagneticButton
            variant="outline"
            href={whatsappLink()}
            icon={<MessageCircle className="w-4 h-4" />}
            ariaLabel="Falar com o barbeiro no WhatsApp"
          >
            Falar no WhatsApp
          </MagneticButton>
        </div>
      </div>
    </section>
  );
};
