import React, { useState, useEffect } from 'react';
import { Menu, X, Scissors, MapPin, Calendar, Clock, ShieldCheck } from 'lucide-react';

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
    const el = document.getElementById('localizacao-mapa');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.open('https://www.google.com/maps/search/?api=1&query=Avenida+Nilo+Pe%C3%A7anha+1027+Valen%C3%A7a+RJ', '_blank');
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#18181b]/90 backdrop-blur-md border-b border-white/10 shadow-lg py-3.5'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-[1366px] mx-auto px-4 sm:px-8 flex items-center justify-between">
          {/* Logo PURΛZI */}
          <a
            href="#"
            className={`flex items-center gap-2 transition-colors group ${
              isScrolled ? 'text-white' : 'text-neutral-950'
            }`}
            aria-label="PURAZI Studio Início"
          >
            <span className="font-['Cinzel'] tracking-[0.22em] text-lg sm:text-xl font-bold uppercase transition-transform group-hover:scale-105">
              PUR<span className="text-amber-500 sm:text-amber-400">Λ</span>ZI
            </span>
            <span className={`text-[9px] uppercase tracking-[0.3em] font-medium hidden sm:inline-block border-l pl-2 ${
              isScrolled ? 'text-neutral-400 border-neutral-700' : 'text-neutral-600 border-neutral-400'
            }`}>
              Studio
            </span>
          </a>

          {/* Desktop Links (pequenas e espaçadas: Serviços · Localização · Consultar agendamento) */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <button
              onClick={onOpenServices}
              className={`text-xs uppercase tracking-[0.25em] font-semibold transition-colors cursor-pointer ${
                isScrolled ? 'text-neutral-300 hover:text-white' : 'text-neutral-900 hover:text-black'
              }`}
            >
              Serviços
            </button>
            <span className={`text-xs ${isScrolled ? 'text-neutral-600' : 'text-neutral-400'}`}>·</span>
            <button
              onClick={scrollToLocation}
              className={`text-xs uppercase tracking-[0.25em] font-semibold transition-colors cursor-pointer ${
                isScrolled ? 'text-neutral-300 hover:text-white' : 'text-neutral-900 hover:text-black'
              }`}
            >
              Localização
            </button>
            <span className={`text-xs ${isScrolled ? 'text-neutral-600' : 'text-neutral-400'}`}>·</span>
            <button
              onClick={onOpenConsult}
              className={`text-xs uppercase tracking-[0.25em] font-semibold transition-colors cursor-pointer ${
                isScrolled ? 'text-neutral-300 hover:text-white' : 'text-neutral-900 hover:text-black'
              }`}
            >
              Consultar agendamento
            </button>
          </nav>

          {/* Botão de Ação: Agendar (preto com texto branco, cantos retos) */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenBooking}
              className="bg-black text-white hover:bg-neutral-800 text-xs tracking-[0.2em] uppercase font-semibold px-5 py-2.5 rounded-none border border-white/20 transition-all cursor-pointer shadow-md hover:border-white/50 active:scale-95"
            >
              Agendar
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`md:hidden p-2 transition-colors focus:outline-none ${
                isScrolled ? 'text-white hover:text-neutral-300' : 'text-neutral-950 hover:text-neutral-700'
              }`}
              aria-label="Abrir menu de navegação"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fullscreen Menu (grafite, com os links grandes em serifada) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#161618] flex flex-col justify-between px-8 py-8 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal"
        >
          {/* Top Bar with Logo and Close */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-5">
            <span className="font-['Cinzel'] tracking-[0.22em] text-xl font-bold uppercase text-white">
              PUR<span className="text-amber-200">Λ</span>ZI
            </span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-neutral-400 hover:text-white p-2 transition-colors focus:outline-none"
              aria-label="Fechar menu"
            >
              <X className="w-7 h-7" />
            </button>
          </div>

          {/* Large Serif Links */}
          <nav className="flex flex-col gap-6 my-auto font-['Cormorant_Garamond'] text-3xl sm:text-4xl text-neutral-200">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-left hover:text-amber-200 transition-colors py-2 flex items-center justify-between border-b border-neutral-800/60"
            >
              <span>Início</span>
              <span className="text-sm font-sans tracking-widest text-neutral-500 uppercase">01</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenServices();
              }}
              className="text-left hover:text-amber-200 transition-colors py-2 flex items-center justify-between border-b border-neutral-800/60"
            >
              <span>Serviços &amp; Valores</span>
              <span className="text-sm font-sans tracking-widest text-neutral-500 uppercase">02</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                scrollToLocation();
              }}
              className="text-left hover:text-amber-200 transition-colors py-2 flex items-center justify-between border-b border-neutral-800/60"
            >
              <span>Localização &amp; Estacionamento</span>
              <span className="text-sm font-sans tracking-widest text-neutral-500 uppercase">03</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenConsult();
              }}
              className="text-left hover:text-amber-200 transition-colors py-2 flex items-center justify-between border-b border-neutral-800/60"
            >
              <span>Consultar Agendamento</span>
              <span className="text-sm font-sans tracking-widest text-neutral-500 uppercase">04</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAdmin();
              }}
              className="text-left hover:text-amber-200 transition-colors py-2 flex items-center justify-between text-neutral-400"
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
              className="w-full bg-white text-black hover:bg-neutral-200 py-4 font-sans uppercase tracking-[0.25em] text-xs font-bold rounded-none transition-colors"
            >
              Agendar Agora
            </button>
            <p className="text-center text-[10px] text-neutral-500 tracking-wider uppercase font-sans">
              Av. Nilo Peçanha, 1027 • Valença/RJ
            </p>
          </div>
        </div>
      )}
    </>
  );
};
