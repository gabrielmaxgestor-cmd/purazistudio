import React, { useEffect, useRef } from 'react';
import { MessageCircle, Sparkles, ArrowUpRight } from 'lucide-react';
import gsap from 'gsap';

// Curated high-resolution professional barbershop and haircut photography
const ROW_1_PHOTOS = [
  {
    url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&auto=format&fit=crop&q=80',
    title: 'Fade Clássico',
    tag: 'Degradê Navalhado',
  },
  {
    url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop&q=80',
    title: 'Barba Esculpida',
    tag: 'Barboterapia',
  },
  {
    url: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=600&auto=format&fit=crop&q=80',
    title: 'Textured Crop',
    tag: 'Corte Moderno',
  },
  {
    url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&auto=format&fit=crop&q=80',
    title: 'Alinhamento & Navalha',
    tag: 'Precisão',
  },
  {
    url: 'https://images.unsplash.com/photo-1517832606589-7929c392f566?w=600&auto=format&fit=crop&q=80',
    title: 'Pompadour Taper',
    tag: 'Estilo Vintage',
  },
  {
    url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600&auto=format&fit=crop&q=80',
    title: 'Skin Fade Low',
    tag: 'Visagismo',
  },
  {
    url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&auto=format&fit=crop&q=80',
    title: 'Acabamento & Linhas',
    tag: 'Detalhe',
  },
];

const ROW_2_PHOTOS = [
  {
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    title: 'Visagismo Masculino',
    tag: 'Harmonização',
  },
  {
    url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&auto=format&fit=crop&q=80',
    title: 'Slick Back Undercut',
    tag: 'Pomada Matte',
  },
  {
    url: 'https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=600&auto=format&fit=crop&q=80',
    title: 'Barba Desenhada',
    tag: 'Navalha Tradicional',
  },
  {
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80',
    title: 'Mid Fade Alinhado',
    tag: 'Corte Contemporâneo',
  },
  {
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80',
    title: 'Corte Executivo',
    tag: 'Social Premium',
  },
  {
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80',
    title: 'Buzz Cut + Lineup',
    tag: 'Estilo Urbano',
  },
  {
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
    title: 'Tesoura & Movimento',
    tag: 'Finalização',
  },
];

export const HaircutCarouselSection: React.FC = () => {
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // GSAP continuous smooth marquee animation
    // Row 1: passes from Left to Right (x translation increasing)
    // Row 2: passes in the opposite direction: from Right to Left (x translation decreasing)
    const ctx = gsap.context(() => {
      if (row1Ref.current) {
        // Double the list for infinite seamless loop
        gsap.to(row1Ref.current, {
          xPercent: 50,
          repeat: -1,
          duration: 35,
          ease: 'none',
        });
      }

      if (row2Ref.current) {
        gsap.to(row2Ref.current, {
          xPercent: -50,
          repeat: -1,
          duration: 35,
          ease: 'none',
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <section
      id="secao-duvida-whatsapp"
      className="relative w-full overflow-hidden bg-[#0d0d0f] py-12 sm:py-16 md:py-20 flex flex-col items-center justify-center"
      aria-label="Galeria de cortes e atendimento WhatsApp"
    >
      {/* Background Animated Dual-Row Photo Carousel - Opacity adjusted for perfect readability */}
      <div className="absolute inset-0 flex flex-col justify-center gap-4 sm:gap-6 opacity-40 pointer-events-none select-none">
        {/* Row 1: Left to Right (começa recuado e move suavemente para a direita) */}
        <div className="flex overflow-hidden w-full">
          <div
            ref={row1Ref}
            className="flex gap-4 sm:gap-6 flex-nowrap shrink-0 -translate-x-1/2"
            style={{ width: 'max-content' }}
          >
            {/* Doubled list for seamless infinite loop */}
            {[...ROW_1_PHOTOS, ...ROW_1_PHOTOS, ...ROW_1_PHOTOS].map((photo, idx) => (
              <div
                key={`row1-${idx}`}
                className="w-48 sm:w-60 h-64 sm:h-72 shrink-0 bg-neutral-900 border border-white/10 overflow-hidden relative group"
              >
                <img
                  src={photo.url}
                  alt={photo.title}
                  loading="lazy"
                  className="w-full h-full object-cover grayscale contrast-110 group-hover:grayscale-0 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-left">
                  <span className="text-[10px] uppercase tracking-wider text-amber-300 font-mono block">
                    {photo.tag}
                  </span>
                  <p className="text-xs font-semibold text-white truncate font-sans">
                    {photo.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: Right to Left (move suavemente para a esquerda) */}
        <div className="flex overflow-hidden w-full">
          <div
            ref={row2Ref}
            className="flex gap-4 sm:gap-6 flex-nowrap shrink-0"
            style={{ width: 'max-content' }}
          >
            {[...ROW_2_PHOTOS, ...ROW_2_PHOTOS, ...ROW_2_PHOTOS].map((photo, idx) => (
              <div
                key={`row2-${idx}`}
                className="w-48 sm:w-60 h-64 sm:h-72 shrink-0 bg-neutral-900 border border-white/10 overflow-hidden relative group"
              >
                <img
                  src={photo.url}
                  alt={photo.title}
                  loading="lazy"
                  className="w-full h-full object-cover grayscale contrast-110 group-hover:grayscale-0 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-left">
                  <span className="text-[10px] uppercase tracking-wider text-amber-300 font-mono block">
                    {photo.tag}
                  </span>
                  <p className="text-xs font-semibold text-white truncate font-sans">
                    {photo.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dark gradient vignettes top & bottom to blend seamlessly into canvas */}
      <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[#0f0f0f] to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0a0a0c] to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 left-0 w-24 sm:w-36 bg-gradient-to-r from-[#0d0d0f] to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 right-0 w-24 sm:w-36 bg-gradient-to-l from-[#0d0d0f] to-transparent pointer-events-none z-10" />

      {/* Overlaid Center Content Card: High Contrast, 100% Legible, Pure Luxury Design */}
      <div className="relative z-20 max-w-2xl mx-4 sm:mx-auto text-center bg-[#111114]/95 backdrop-blur-xl p-8 sm:p-14 border border-neutral-700/80 shadow-[0_20px_60px_rgba(0,0,0,0.95)]">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs uppercase tracking-[0.3em] text-amber-400 font-mono font-bold block">
            ATENDIMENTO &amp; VISAGISMO
          </span>
        </div>

        {/* The exact text requested: "Dúvida? Chama no WhatsApp." */}
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight font-sans leading-tight mb-4 drop-shadow-md">
          Dúvida? Chama no WhatsApp.
        </h2>

        <p className="text-sm sm:text-base text-neutral-200 font-sans leading-relaxed max-w-lg mx-auto mb-8 font-normal">
          Quer saber qual corte combina mais com seu formato de rosto ou tem alguma dúvida sobre horários e serviços?
          Fale diretamente com o nosso barbeiro em tempo real.
        </p>

        {/* WhatsApp Button - High impact CTA */}
        <a
          href="https://wa.me/5524999999999?text=Ol%C3%A1%21%20Gostaria%20de%20tirar%20uma%20d%C3%BAvida%20sobre%20os%20servi%C3%A7os%20da%20PURAZI%20Studio."
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-black font-extrabold py-4 sm:py-5 px-8 sm:px-12 text-xs sm:text-sm uppercase tracking-[0.22em] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 shadow-[0_10px_30px_rgba(37,211,102,0.35)] hover:shadow-[0_15px_40px_rgba(37,211,102,0.55)] rounded-none group cursor-pointer"
        >
          <MessageCircle className="w-5 h-5 fill-current" />
          <span>Falar no WhatsApp</span>
          <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>

        <div className="mt-5 text-xs text-neutral-400 font-sans flex items-center justify-center gap-2">
          <span className="font-semibold text-neutral-200 font-mono">(24) 99999-9999</span>
          <span>•</span>
          <span>Atendimento rápido de Seg a Sáb</span>
        </div>
      </div>
    </section>
  );
};
