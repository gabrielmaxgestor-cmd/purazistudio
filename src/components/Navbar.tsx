import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onOpenBooking: () => void;
  onOpenConsult: () => void;
  onOpenServices: () => void;
  onOpenAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenBooking,
  onOpenConsult,
  onOpenServices,
  onOpenAdmin,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 35);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const scrollToLocation = () => {
    const el = document.getElementById('secao-localizacao');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.open(
        'https://www.google.com/maps/search/?api=1&query=Avenida+Nilo+Pe%C3%A7anha+1027+Valen%C3%A7a+RJ',
        '_blank'
      );
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 bg-[#141416]/95 backdrop-blur-md border-b border-white/10 transition-shadow duration-300 pt-[env(safe-area-inset-top,0px)] ${
          isScrolled ? 'shadow-2xl' : 'shadow-none'
        }`}
      >
        <div className="max-w-[1366px] mx-auto h-16 sm:h-20 px-4 sm:px-10 grid grid-cols-[auto_1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Logo à esquerda */}
          <a
            href="#top"
            className="flex items-center justify-self-start cursor-pointer"
            aria-label="PURAZI Studio Início"
          >
            <img
              src="/assets/logo-purazi-white.png"
              alt="PURΛZI Studio"
              className="h-7 sm:h-10 w-auto object-contain"
            />
          </a>

          {/* Links centralizados de verdade (coluna central do grid) */}
          <nav className="hidden md:flex items-center justify-center gap-6 lg:gap-8">
            <button
              onClick={onOpenServices}
              className="text-xs uppercase tracking-[0.2em] font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Serviços
            </button>
            <span className="text-xs select-none text-neutral-600" aria-hidden="true">·</span>
            <button
              onClick={scrollToLocation}
              className="text-xs uppercase tracking-[0.2em] font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Localização
            </button>
            <span className="text-xs select-none text-neutral-600" aria-hidden="true">·</span>
            <button
              onClick={onOpenConsult}
              className="text-xs uppercase tracking-[0.2em] font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Consultar agendamento
            </button>
          </nav>

          {/* Ações à direita: Agendar + menu mobile */}
          <div className="col-start-3 flex items-center justify-self-end gap-2 sm:gap-3">
            <button
              onClick={onOpenBooking}
              className="inline-flex items-center justify-center gap-2 h-10 sm:h-11 bg-black text-white hover:bg-amber-400 hover:text-black text-[11px] sm:text-xs tracking-[0.2em] uppercase font-bold px-4 sm:px-7 border-2 border-amber-400/90 hover:border-amber-400 transition-colors duration-300 cursor-pointer group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 group-hover:bg-black transition-colors animate-pulse" />
              <span>Agendar</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden h-10 w-10 inline-flex items-center justify-center text-white hover:text-neutral-300 transition-colors focus:outline-none cursor-pointer"
              aria-label="Abrir menu de navegação"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Fullscreen (grafite, com os links grandes em serifada) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#161618] flex flex-col justify-between px-6 sm:px-8 py-8 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal"
        >
          {/* Top Bar with Logo and Close */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-5">
            <img
              src="/assets/logo-purazi-white.png"
              alt="PURΛZI Studio"
              className="h-6 w-auto object-contain"
            />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-neutral-400 hover:text-white p-2 transition-colors cursor-pointer"
              aria-label="Fechar menu"
            >
              <X className="w-7 h-7" />
            </button>
          </div>

          {/* Large Serif Links */}
          <nav className="flex flex-col gap-6 my-auto font-['Cormorant_Garamond',serif] text-3xl sm:text-4xl text-neutral-200">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-left hover:text-amber-200 transition-colors py-2 flex items-center justify-between border-b border-neutral-800/60 cursor-pointer"
            >
              <span>Início</span>
              <span className="text-xs font-sans tracking-widest text-neutral-500 uppercase">01</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenServices();
              }}
              className="text-left hover:text-amber-200 transition-colors py-2 flex items-center justify-between border-b border-neutral-800/60 cursor-pointer"
            >
              <span>Serviços &amp; Valores</span>
              <span className="text-xs font-sans tracking-widest text-neutral-500 uppercase">02</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                scrollToLocation();
              }}
              className="text-left hover:text-amber-200 transition-colors py-2 flex items-center justify-between border-b border-neutral-800/60 cursor-pointer"
            >
              <span>Localização</span>
              <span className="text-xs font-sans tracking-widest text-neutral-500 uppercase">03</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenConsult();
              }}
              className="text-left hover:text-amber-200 transition-colors py-2 flex items-center justify-between border-b border-neutral-800/60 cursor-pointer"
            >
              <span>Consultar Agendamento</span>
              <span className="text-xs font-sans tracking-widest text-neutral-500 uppercase">04</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAdmin();
              }}
              className="text-left hover:text-amber-200 transition-colors py-2 flex items-center justify-between text-neutral-400 cursor-pointer"
            >
              <span className="text-2xl">Painel Administrativo</span>
              <span className="text-xs font-sans tracking-widest text-neutral-600 uppercase">Barbeiro</span>
            </button>
          </nav>

          {/* Bottom Action in Mobile Menu */}
          <div className="pt-6 border-t border-neutral-800 flex flex-col gap-3">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBooking();
              }}
              className="w-full bg-white text-black hover:bg-neutral-200 py-3.5 font-sans uppercase tracking-[0.25em] text-xs font-bold rounded-none transition-colors cursor-pointer"
            >
              Agendar Agora
            </button>
            <p className="text-center text-[11px] text-neutral-500 tracking-wider uppercase font-sans">
              Av. Nilo Peçanha, 1027 • Valença/RJ
            </p>
          </div>
        </div>
      )}
    </>
  );
};
