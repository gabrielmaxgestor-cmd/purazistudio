import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { SITE } from '../utils/siteConfig';

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
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
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

  const linkClass =
    'text-[11px] uppercase tracking-[0.24em] font-semibold text-neutral-700 hover:text-black transition-colors cursor-pointer whitespace-nowrap';

  const mobileLinkClass =
    'text-left hover:text-neutral-400 transition-colors py-4 flex items-center justify-between border-b border-white/10 cursor-pointer';

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 bg-[#dcdcd8]/95 backdrop-blur-md border-b transition-colors duration-300 pt-[env(safe-area-inset-top,0px)] ${
          isScrolled ? 'border-black/15' : 'border-transparent'
        }`}
      >
        <div className="max-w-[1200px] mx-auto h-16 sm:h-20 px-6 sm:px-10 grid grid-cols-[auto_1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Logo à esquerda */}
          <a
            href="#top"
            className="flex items-center justify-self-start cursor-pointer"
            aria-label="PURAZI Studio — início"
          >
            <img src="/assets/logo-purazi-black.png" alt="PURAZI Studio" className="h-7 sm:h-9 w-auto object-contain" />
          </a>

          {/* Links centralizados (coluna central do grid) */}
          <nav className="hidden md:flex items-center justify-center gap-10">
            <button onClick={onOpenServices} className={linkClass}>Serviços</button>
            <button onClick={scrollToLocation} className={linkClass}>Localização</button>
            <button onClick={onOpenConsult} className={linkClass}>Meu agendamento</button>
          </nav>

          {/* Ações à direita */}
          <div className="col-start-3 flex items-center justify-self-end gap-2 sm:gap-3">
            <button
              onClick={onOpenBooking}
              className="inline-flex items-center justify-center h-10 px-5 sm:px-7 bg-black text-white hover:bg-neutral-800 text-[11px] tracking-[0.22em] uppercase font-bold transition-colors cursor-pointer"
            >
              Agendar
            </button>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden h-10 w-10 inline-flex items-center justify-center text-black hover:text-neutral-600 transition-colors cursor-pointer"
              aria-label="Abrir menu de navegação"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Menu mobile em tela cheia */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#17171a] text-white flex flex-col px-6 py-6 pt-[max(1.5rem,env(safe-area-inset-top,0px))]"
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal"
        >
          <div className="flex items-center justify-between h-10">
            <img src="/assets/logo-purazi-white.png" alt="PURAZI Studio" className="h-7 w-auto object-contain" />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-[#9a968f] hover:text-white p-2 -mr-2 transition-colors cursor-pointer"
              aria-label="Fechar menu"
            >
              <X className="w-7 h-7" />
            </button>
          </div>

          <nav className="flex flex-col my-auto font-serif text-3xl">
            <button onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={mobileLinkClass}>
              <span>Início</span>
            </button>
            <button onClick={() => { setMobileMenuOpen(false); onOpenServices(); }} className={mobileLinkClass}>
              <span>Serviços</span>
            </button>
            <button onClick={() => { setMobileMenuOpen(false); scrollToLocation(); }} className={mobileLinkClass}>
              <span>Localização</span>
            </button>
            <button onClick={() => { setMobileMenuOpen(false); onOpenConsult(); }} className={mobileLinkClass}>
              <span>Meu agendamento</span>
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenAdmin(); }}
              className="text-left py-4 text-xl text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
            >
              Área do barbeiro
            </button>
          </nav>

          <div className="pt-6 border-t border-white/10 flex flex-col gap-4 pb-[env(safe-area-inset-bottom,0px)]">
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenBooking(); }}
              className="w-full h-14 bg-white text-black hover:bg-neutral-200 uppercase tracking-[0.24em] text-xs font-semibold transition-colors cursor-pointer"
            >
              Agendar horário
            </button>
            <p className="text-center text-[11px] text-[#6f6b65] tracking-[0.18em] uppercase">
              {SITE.address} · {SITE.city}
            </p>
          </div>
        </div>
      )}
    </>
  );
};
