import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { SITE } from '../utils/siteConfig';

/** Texto que "embaralha" e se resolve ao passar o mouse (inspirado em Decrypted Text / React Bits) */
const ScrambleText: React.FC<{ text: string }> = ({ text }) => {
  const [out, setOut] = useState(text);
  const [width, setWidth] = useState<number | undefined>();
  const ref = useRef<HTMLSpanElement>(null);
  const raf = useRef(0);

  useLayoutEffect(() => {
    if (ref.current) setWidth(ref.current.offsetWidth);
  }, [text]);

  const run = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    cancelAnimationFrame(raf.current);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const total = 16;
    let frame = 0;
    const tick = () => {
      frame++;
      const progress = (frame / total) * text.length;
      setOut(text.split('').map((c, i) => (c === ' ' || i < progress ? c : chars[Math.floor(Math.random() * chars.length)])).join(''));
      if (frame < total) raf.current = requestAnimationFrame(tick);
      else setOut(text);
    };
    raf.current = requestAnimationFrame(tick);
  };

  return (
    <span ref={ref} onMouseEnter={run} className="inline-block text-left" style={{ width }} aria-label={text}>
      <span aria-hidden="true">{out}</span>
    </span>
  );
};

interface NavbarProps {
  onOpenBooking: () => void;
  onOpenConsult: () => void;
  onOpenServices: () => void;
  onOpenAdmin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenBooking, onOpenConsult, onOpenServices }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Previne rolagem de fundo quando o menu mobile está aberto
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const scrollToLocation = () => {
    document.getElementById('secao-localizacao')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Link com sublinhado que cresce no hover
  const linkClass =
    'group relative text-[11px] uppercase tracking-[0.24em] font-semibold text-white/85 hover:text-white transition-colors cursor-pointer whitespace-nowrap py-2 ' +
    "after:content-[''] after:absolute after:left-0 after:bottom-0.5 after:h-px after:w-full after:bg-white after:origin-left after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-500";

  const mobileLinkClass =
    'menu-item text-left font-serif text-[2.4rem] leading-tight py-3.5 border-b border-white/10 hover:text-neutral-400 transition-colors cursor-pointer';

  return (
    <>
      {/* Fixa e discreta: transparente sobre o cinza da primeira dobra; ao rolar vira grafite com desfoque */}
      <header
        data-nav
        className={`fixed top-0 left-0 right-0 z-40 pt-[env(safe-area-inset-top,0px)] border-b transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 ease-out ${
          isScrolled
            ? 'bg-[#161618]/80 backdrop-blur-md border-white/10 shadow-[0_14px_34px_-16px_rgba(0,0,0,0.7)]'
            : 'bg-transparent border-transparent'
        }`}
      >
        {/* no celular: sombra atrás da barra enquanto está transparente, para logo e menu nunca sumirem no cinza */}
        <div
          aria-hidden="true"
          className={`absolute inset-x-0 top-0 h-[150%] bg-gradient-to-b from-black/60 via-black/30 to-transparent pointer-events-none transition-opacity duration-500 md:hidden ${isScrolled ? 'opacity-0' : 'opacity-100'}`}
        />
        <div className="relative max-w-[1366px] mx-auto h-20 sm:h-24 px-5 sm:px-10 flex items-center justify-between gap-4 sm:gap-6">
          {/* Logo maior, sempre fixa à esquerda */}
          <a href="#top" className="flex items-center shrink-0 cursor-pointer" aria-label="PURAZI Studio — início">
            <img
              src="/assets/logo-purazi-white.png"
              alt="PURAZI Studio"
              className="h-12 sm:h-[3.4rem] w-auto object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:drop-shadow-[0_1px_10px_rgba(0,0,0,0.25)]"
            />
          </a>

          {/* Links + Agendar agrupados à direita */}
          <div className="flex items-center gap-3 sm:gap-10">
            <nav className="hidden md:flex items-center gap-9" style={{ textShadow: isScrolled ? 'none' : '0 1px 12px rgba(0,0,0,0.35)' }}>
              <button onClick={onOpenServices} className={linkClass}><ScrambleText text="Serviços" /></button>
              <button onClick={scrollToLocation} className={linkClass}><ScrambleText text="Localização" /></button>
              <button onClick={onOpenConsult} className={linkClass}><ScrambleText text="Consultar agendamento" /></button>
            </nav>

            <button
              onClick={onOpenBooking}
              className="beam inline-flex items-center justify-center h-12 sm:h-11 px-6 sm:px-8 bg-black text-white border border-white/25 hover:bg-white hover:text-black hover:border-white text-[13px] sm:text-xs tracking-[0.22em] uppercase font-bold transition-colors duration-300 cursor-pointer"
            >
              Agendar
            </button>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden h-12 w-12 -mr-2 inline-flex items-center justify-center text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] hover:text-neutral-300 transition-colors cursor-pointer"
              aria-label="Abrir menu de navegação"
            >
              <Menu className="w-9 h-9" strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </header>

      {/* Menu mobile em tela cheia, grafite, links grandes em serifada */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#161618] text-white flex flex-col px-6 pb-6 pt-[max(1rem,env(safe-area-inset-top,0px))] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal"
        >
          <div className="flex items-center justify-between h-[4.5rem] shrink-0">
            <img src="/assets/logo-purazi-white.png" alt="PURAZI Studio" className="h-12 w-auto object-contain" />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-white/70 hover:text-white p-2 -mr-2 transition-colors cursor-pointer"
              aria-label="Fechar menu"
            >
              <X className="w-9 h-9" />
            </button>
          </div>

          <nav className="flex flex-col my-auto py-6">
            <button style={{ animationDelay: '60ms' }} onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={mobileLinkClass}>Início</button>
            <button style={{ animationDelay: '120ms' }} onClick={() => { setMobileMenuOpen(false); onOpenServices(); }} className={mobileLinkClass}>Serviços</button>
            <button style={{ animationDelay: '180ms' }} onClick={() => { setMobileMenuOpen(false); scrollToLocation(); }} className={mobileLinkClass}>Localização</button>
            <button style={{ animationDelay: '240ms' }} onClick={() => { setMobileMenuOpen(false); onOpenConsult(); }} className={mobileLinkClass}>Meu agendamento</button>
          </nav>

          <div className="shrink-0 pt-5 border-t border-white/10 flex flex-col gap-4 pb-[env(safe-area-inset-bottom,0px)]">
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenBooking(); }}
              className="w-full h-14 bg-white text-black hover:bg-neutral-200 uppercase tracking-[0.24em] text-xs font-bold transition-colors cursor-pointer"
            >
              Agendar horário
            </button>
            <p className="text-center text-[11px] text-white/40 tracking-[0.18em] uppercase">
              {SITE.address} · {SITE.city}
            </p>
          </div>
        </div>
      )}
    </>
  );
};
