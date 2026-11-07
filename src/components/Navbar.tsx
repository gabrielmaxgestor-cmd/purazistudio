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
      setIsScrolled(window.scrollY > 30);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Previne rolagem de fundo quando menu mobile em tela cheia estiver aberto
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
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 pt-[env(safe-area-inset-top,0px)] ${
          isScrolled
            ? 'bg-[#161618]/90 backdrop-blur-md border-b border-white/10 shadow-lg py-2.5 sm:py-3.5'
            : 'bg-transparent border-b border-transparent py-3.5 sm:py-5'
        }`}
      >
        <div className="max-w-[1366px] mx-auto px-4 sm:px-10 grid grid-cols-[auto_1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Logo à esquerda com o arquivo de logotipo oficial do anexo */}
          <a
            href="#top"
            className="flex items-center justify-self-start cursor-pointer transition-opacity hover:opacity-85"
            aria-label="PURAZI Studio Início"
          >
            <img
              src="/assets/aistudio/Logotipo_minimalista_PURAZI_studio_586fcc6b.png"
              alt="PURΛZI Studio"
              className={`h-7 sm:h-9 w-auto object-contain transition-all duration-300 ${
                isScrolled ? 'brightness-0 invert' : ''
              }`}
            />
          </a>

          {/* Links centralizados em letras pequenas e espaçadas: Serviços · Localização · Consultar agendamento */}
          <nav className="hidden md:flex items-center justify-center gap-6 lg:gap-8">
            <button
              onClick={onOpenServices}
              style={{
                fontSize: '9px',
                lineHeight: '16px',
                height: '16px',
                marginLeft: '96px',
                marginTop: '0px',
                marginRight: '-45px',
              }}
              className={`uppercase tracking-[0.22em] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isScrolled
                  ? 'text-neutral-300 hover:text-white'
                  : 'text-neutral-900 hover:text-black font-semibold'
              }`}
            >
              Serviços
            </button>
            <span
              className={`text-xs select-none ${
                isScrolled ? 'text-neutral-600' : 'text-neutral-500'
              }`}
              aria-hidden="true"
            >
              ·
            </span>
            <button
              onClick={scrollToLocation}
              style={{
                fontSize: '9px',
                marginTop: '0px',
                marginLeft: '9px',
                marginRight: '-33px',
              }}
              className={`uppercase tracking-[0.22em] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isScrolled
                  ? 'text-neutral-300 hover:text-white'
                  : 'text-neutral-900 hover:text-black font-semibold'
              }`}
            >
              Localização
            </button>
            <span
              className={`text-xs select-none ${
                isScrolled ? 'text-neutral-600' : 'text-neutral-500'
              }`}
              aria-hidden="true"
            >
              ·
            </span>
            <button
              onClick={onOpenConsult}
              style={{
                lineHeight: '14px',
                fontSize: '9px',
                textDecorationLine: 'none',
                textAlign: 'justify',
                marginRight: '-8px',
                marginLeft: '-3px',
              }}
              className={`uppercase tracking-[0.22em] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isScrolled
                  ? 'text-neutral-300 hover:text-white'
                  : 'text-neutral-900 hover:text-black font-semibold'
              }`}
            >
              Consultar agendamento
            </button>
          </nav>

          {/* Ações à direita: botão Agendar (preto com texto branco, cantos retos), sempre visível + menu hamburger no mobile */}
          <div className="col-start-3 flex items-center justify-self-end gap-2 sm:gap-3">
            <button
              onClick={onOpenBooking}
              className={`inline-flex items-center justify-center h-9 sm:h-10 bg-black text-white text-[11px] sm:text-xs tracking-[0.2em] uppercase font-bold px-4 sm:px-6 rounded-none cursor-pointer transition-colors duration-200 ${
                isScrolled
                  ? 'border border-white/20 hover:bg-white hover:text-black'
                  : 'border border-black hover:bg-neutral-800'
              }`}
            >
              Agendar
            </button>

            {/* Menu Hamburger no celular */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`md:hidden h-9 w-9 inline-flex items-center justify-center transition-colors focus:outline-none cursor-pointer ${
                isScrolled ? 'text-white hover:text-neutral-300' : 'text-neutral-900 hover:text-black'
              }`}
              aria-label="Abrir menu de navegação"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Menu no celular que abre em tela cheia, grafite, com os links grandes em serifada */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#161618] text-white flex flex-col justify-between px-6 sm:px-10 py-7 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal"
        >
          {/* Topo do menu com a Logo e botão fechar */}
          <div className="flex items-center justify-between border-b border-neutral-800 pb-5">
            <img
              src="/assets/aistudio/Logotipo_minimalista_PURAZI_studio_586fcc6b.png"
              alt="PURΛZI Studio"
              className="h-6 w-auto object-contain brightness-0 invert"
            />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-neutral-400 hover:text-white p-2 transition-colors cursor-pointer"
              aria-label="Fechar menu"
            >
              <X className="w-7 h-7" />
            </button>
          </div>

          {/* Links grandes em serifada */}
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

          {/* Botão de ação e rodapé do menu mobile */}
          <div className="pt-6 border-t border-neutral-800 flex flex-col gap-3">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBooking();
              }}
              className="w-full bg-black text-white hover:bg-neutral-900 border border-white/20 py-3.5 font-sans uppercase tracking-[0.25em] text-xs font-bold rounded-none transition-colors cursor-pointer"
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
