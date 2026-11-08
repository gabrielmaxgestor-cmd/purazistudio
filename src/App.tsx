import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BookingDrawer } from './components/BookingDrawer';
import { ConsultAppointmentModal } from './components/ConsultAppointmentModal';
import { BarberAdminPanel } from './components/BarberAdminPanel';
import { Navbar } from './components/Navbar';
import { IntroSplash } from './components/IntroSplash';
import { MagneticButton } from './components/MagneticButton';
import { DoubtsSection } from './components/DoubtsSection';
import { Service, BarberSettings, DEFAULT_BARBER_SETTINGS } from './utils/bookingLogic';
import { getStoredServices, getStoredBarberSettings } from './utils/storage';
import { SITE, MAPS_LINK, MAPS_EMBED, whatsappLink } from './utils/siteConfig';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/* ---------- helpers de exibição ---------- */

const formatTime = (t: string) => {
  const [h, m] = t.split(':');
  return m === '00' ? `${h}h` : `${h}h${m}`;
};

// Ex.: folga no domingo -> "Seg a Sáb"
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const formatOpenDays = (off: number[]) => {
  const names: Record<number, string> = { 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb', 0: 'Dom' };
  const open = WEEK.filter((d) => !off.includes(d));
  const runs: number[][] = [];
  open.forEach((d) => {
    const last = runs[runs.length - 1];
    if (last && WEEK.indexOf(d) === WEEK.indexOf(last[last.length - 1]) + 1) last.push(d);
    else runs.push([d]);
  });
  return runs
    .map((r) => (r.length >= 3 ? `${names[r[0]]} a ${names[r[r.length - 1]]}` : r.map((d) => names[d]).join(', ')))
    .join(' · ');
};

/* Divide um texto em palavras para animar cada uma subindo (efeito "split text") */
const SplitWords: React.FC<{ text: string; attr: string }> = ({ text, attr }) => (
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

/* Pin de localização vermelho do design */
const LocationPin: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 140" className={className} aria-hidden="true">
    <path d="M50 0C22.4 0 0 22.4 0 50c0 37.5 50 90 50 90s50-52.5 50-90C100 22.4 77.6 0 50 0z" fill="#ff1414" />
    <path d="M50 0C22.4 0 0 22.4 0 50c0 37.5 50 90 50 90V0z" fill="#c70f17" />
    <circle cx="50" cy="48" r="21" fill="#212025" />
  </svg>
);

const LETTERS = ['p', 'u', 'r', 'a', 'z', 'i'];

export default function App() {
  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [introDone, setIntroDone] = useState(prefersReduced);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [mapActive, setMapActive] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<BarberSettings>(DEFAULT_BARBER_SETTINGS);
  const [refreshKey, setRefreshKey] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const heroTl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    setServices(getStoredServices());
    setSettings(getStoredBarberSettings());
  }, [refreshKey]);

  /* ======================= ANIMAÇÕES (GSAP) ======================= */
  useLayoutEffect(() => {
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      // ---- Hero: entrada orquestrada (fica pausada até a abertura terminar) ----
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
      tl.from('[data-hero-photo]', { opacity: 0, scale: 1.08, duration: 2, ease: 'power2.out' }, 0)
        .from('[data-hero-word]', { yPercent: 115, opacity: 0, filter: 'blur(10px)', duration: 1.2, stagger: 0.09 }, 0.2)
        .from('[data-hero-logo]', { opacity: 0, y: 26, duration: 1.1 }, 0.9)
        .from('[data-nav]', { y: -36, opacity: 0, duration: 1 }, 0.5);
      heroTl.current = tl;

      // parallax suave do hero ao rolar
      gsap.to('[data-hero-photo-wrap]', {
        yPercent: 7,
        ease: 'none',
        scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('[data-hero-text]', {
        y: -50,
        ease: 'none',
        scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true },
      });

      // ---- Letras do PURAZI vertical: revelam em sequência e flutuam levemente ----
      gsap.utils.toArray<HTMLElement>('[data-letter]').forEach((el, i) => {
        gsap.from(el, {
          opacity: 0,
          x: -44,
          filter: 'blur(10px)',
          duration: 1.3,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        });
        gsap.to(el, {
          y: i % 2 ? -26 : 26,
          ease: 'none',
          scrollTrigger: { trigger: '[data-wrap]', start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });

      // ---- Palavras que sobem (títulos) ----
      gsap.utils.toArray<HTMLElement>('[data-split]').forEach((el) => {
        gsap.from(el.querySelectorAll('[data-word]'), {
          yPercent: 115,
          opacity: 0,
          filter: 'blur(10px)',
          duration: 1.2,
          stagger: 0.07,
          ease: 'power4.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        });
      });

      // ---- Revelações genéricas ----
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        const dir = el.dataset.reveal;
        gsap.from(el, {
          opacity: 0,
          y: dir === 'up' ? 38 : 0,
          x: dir === 'left' ? -44 : dir === 'right' ? 44 : 0,
          duration: 1.15,
          delay: parseFloat(el.dataset.delay || '0'),
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
      });

      // ---- Foto da máquina: a "luz acende" e ela sobe em parallax ----
      gsap.fromTo(
        '[data-clipper]',
        { opacity: 0, scale: 1.14, filter: 'brightness(0.2)' },
        {
          opacity: 1,
          scale: 1,
          filter: 'brightness(1)',
          duration: 2,
          ease: 'power2.out',
          scrollTrigger: { trigger: '[data-clipper-wrap]', start: 'top 80%', once: true },
        }
      );
      gsap.to('[data-clipper]', {
        yPercent: -7,
        ease: 'none',
        scrollTrigger: { trigger: '[data-clipper-wrap]', start: 'top bottom', end: 'bottom top', scrub: true },
      });

      // ---- Localização: pin cai com quique e o mapa abre em "cortina" ----
      gsap.from('[data-pin]', {
        y: -90,
        opacity: 0,
        duration: 1.5,
        ease: 'bounce.out',
        scrollTrigger: { trigger: '[data-pin]', start: 'top 90%', once: true },
      });
      gsap.fromTo(
        '[data-map]',
        { clipPath: 'inset(0% 0% 0% 100%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.5,
          ease: 'power4.inOut',
          scrollTrigger: { trigger: '[data-map]', start: 'top 85%', once: true },
        }
      );
    }, rootRef);

    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);
    return () => {
      window.removeEventListener('load', onLoad);
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Acesso ao painel do barbeiro: somente pelo link privado  seusite.com/#barbeiro  (não há botão público)
  useEffect(() => {
    const check = () => {
      if (window.location.hash === '#barbeiro') setAdminOpen(true);
    };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, []);

  const closeAdmin = () => {
    setAdminOpen(false);
    if (window.location.hash === '#barbeiro') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  // Quando a abertura termina, o hero entra em cena
  useEffect(() => {
    if (introDone) heroTl.current?.play();
  }, [introDone]);

  // Luz suave que segue o cursor nas áreas escuras (cinematográfico)
  useEffect(() => {
    const wrap = document.querySelector<HTMLElement>('[data-wrap]');
    if (!wrap || prefersReduced || window.matchMedia('(hover: none)').matches) return;
    const pos = { x: 0, y: 0 };
    const move = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      gsap.to(pos, {
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        duration: 0.8,
        ease: 'power3.out',
        onUpdate: () => {
          wrap.style.setProperty('--mx', `${pos.x}px`);
          wrap.style.setProperty('--my', `${pos.y}px`);
        },
      });
    };
    wrap.addEventListener('pointermove', move);
    return () => wrap.removeEventListener('pointermove', move);
  }, [prefersReduced]);

  const handleOpenBookingWithService = (serviceId?: string) => {
    setSelectedServiceId(serviceId || null);
    setBookingOpen(true);
  };

  const handleDataChanged = () => setRefreshKey((prev) => prev + 1);

  const spotMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--sx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--sy', `${e.clientY - r.top}px`);
  };

  const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const openDays = formatOpenDays(settings.fixedOffDays);
  const hoursLabel = `${openDays ? openDays + ' · ' : ''}${formatTime(settings.workStart)} às ${formatTime(settings.workEnd)}`;

  const footerLink =
    'text-neutral-300 hover:text-white text-xs sm:text-sm tracking-wide transition-colors text-left cursor-pointer';

  return (
    <div ref={rootRef} id="top" className="min-h-screen bg-[#0e0e0e] text-white">
      {!introDone && <IntroSplash onDone={() => setIntroDone(true)} />}

      <Navbar
        onOpenBooking={() => handleOpenBookingWithService()}
        onOpenConsult={() => setConsultOpen(true)}
        onOpenServices={() => handleOpenBookingWithService()}
      />

      <main>
        <h1 className="sr">PURAZI Studio — {SITE.tagline} Barbearia em Valença/RJ</h1>

        {/* ============ 1. HERO: foto + slogan num único fundo de concreto ============ */}
        <section data-hero className="relative bg-concrete overflow-hidden pt-[4.5rem] sm:pt-24">
          {/* sombra leve no topo: garante leitura da barra transparente */}
          <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/30 to-transparent pointer-events-none z-10" />

          <div className="relative max-w-[1366px] mx-auto grid grid-cols-[46%_1fr] items-start">
            <div data-hero-photo-wrap className="self-end">
              <img
                data-hero-photo
                src="/assets/barber-photo-clean.webp"
                alt="Barbeiro do PURAZI Studio sorrindo"
                width={600}
                height={640}
                loading="eager"
                className="fade-portrait block w-full h-auto"
              />
            </div>

            <div data-hero-text className="text-right pr-[7%] pt-[6%] sm:pt-[8%] pb-10">
              <p className="font-display font-extrabold text-black tracking-tight leading-[1.16] text-[clamp(1.2rem,3.9vw,3.4rem)] ml-auto max-w-[11.2em]">
                <SplitWords text="Aqui, cada detalhe valoriza sua melhor versão." attr="data-hero-word" />
              </p>
              <img
                data-hero-logo
                src="/assets/logo-purazi-black.png"
                alt="PURAZI Studio"
                className="ml-auto mt-[9%] w-[clamp(92px,17vw,230px)] h-auto"
              />
            </div>
          </div>

          {/* degradê: o concreto escurece suavemente até o grafite da próxima seção */}
          <div className="absolute inset-x-0 bottom-0 h-[34%] min-h-[110px] bg-gradient-to-b from-transparent via-[#212025]/55 to-[#212025] pointer-events-none z-10" />
        </section>

        {/* ===== 2. BLOCO ÚNICO: agenda + máquina + localização, com o PURAZI vertical contínuo ===== */}
        <div
          data-wrap
          className="relative isolate bg-night grain overflow-hidden"
          style={{ ['--mx' as string]: '50%', ['--my' as string]: '20%' }}
        >
          {/* luz que segue o cursor */}
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{ background: 'radial-gradient(520px circle at var(--mx) var(--my), rgba(255,255,255,0.055), transparent 62%)' }}
          />

          {/* fundo de pontos que acende perto do cursor + feixes de luz lentos */}
          <div
            className="absolute inset-0 pointer-events-none bg-dots"
            style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 8%, #000 92%, transparent)', maskImage: 'linear-gradient(to bottom, transparent, #000 8%, #000 92%, transparent)' }}
          />
          <div className="absolute inset-0 pointer-events-none bg-dots-live" />
          <div className="light-beam" />
          <div className="light-beam b2" />

          <div className="relative max-w-[1366px] mx-auto grid grid-cols-[clamp(66px,13vw,190px)_1fr]">
            {/* PURAZI vertical: letras distribuídas do início ao fim das 3 seções */}
            <aside
              className="flex flex-col items-stretch justify-between pl-[14%] pr-[4%] py-[clamp(4.5rem,9vw,8rem)] self-stretch"
              aria-hidden="true"
            >
              {LETTERS.map((l) => (
                <img
                  key={l}
                  data-letter
                  src={`/assets/letters/${l}.png`}
                  alt=""
                  draggable={false}
                  className="w-full h-auto select-none"
                />
              ))}
            </aside>

            <div className="min-w-0 pr-5 sm:pr-10 lg:pr-20 pl-3 sm:pl-6">
              {/* ---------- Agenda ---------- */}
              <section className="relative flex flex-col items-center justify-center text-center py-16 sm:py-24">
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90%,760px)] aspect-[2/1] pointer-events-none"
                  style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.06), transparent)' }}
                />
                <h2
                  data-split
                  className="relative font-serif font-light text-[clamp(1.9rem,5vw,4rem)] leading-[1.12]"
                >
                  <SplitWords text="Agende seu horário abaixo:" attr="data-word" />
                </h2>
                <p data-reveal="up" data-delay="0.15" className="relative mt-4 max-w-md text-[clamp(0.75rem,1.3vw,0.95rem)] text-neutral-400">
                  Rápido, prático e sem intermediários. Escolha o serviço e confirme em 1 minuto.
                </p>
                <div data-reveal="up" data-delay="0.3" className="relative mt-12">
                  <MagneticButton
                    onClick={() => handleOpenBookingWithService()}
                    icon={null}
                    ariaLabel="Abrir agenda online"
                  >
                    Agendar horário
                    <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
                  </MagneticButton>
                </div>
              </section>

              {/* ---------- Máquina ---------- */}
              <section data-clipper-wrap className="relative -my-4 sm:-my-10">
                <img
                  data-clipper
                  src="/assets/clipper-clean.webp"
                  alt="Máquina de corte profissional"
                  loading="lazy"
                  className="fade-edges w-full h-auto"
                />
              </section>

              {/* ---------- Localização ---------- */}
              <section id="secao-localizacao" className="relative py-14 sm:py-24 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-14 items-center">
                <div className="min-w-0">
                  <p data-reveal="up" className="shiny-text text-[11px] uppercase tracking-[0.4em] font-semibold">
                    Localização
                  </p>

                  <div className="mt-6 flex items-center gap-4 sm:gap-6">
                    <div data-pin className="relative shrink-0 w-[clamp(44px,6vw,84px)]">
                      <LocationPin className="w-full h-auto" />
                      <span className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-7 h-2 rounded-full bg-red-500/40 animate-ping" />
                    </div>
                    <p data-reveal="left" data-delay="0.2" className="font-serif font-light leading-[1.2] text-[clamp(1.35rem,2.55vw,2.35rem)]">
                      <span className="block whitespace-nowrap">Avenida Nilo Peçanha,</span>
                      <span className="block whitespace-nowrap">1027 - Valença/RJ</span>
                    </p>
                  </div>

                  <p data-reveal="up" data-delay="0.25" className="mt-8 text-[11px] sm:text-xs uppercase tracking-[0.22em] text-neutral-500">
                    {hoursLabel}
                  </p>

                  <a
                    data-reveal="up"
                    data-delay="0.3"
                    href={MAPS_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white border-b border-white/30 hover:border-white pb-1 transition-colors"
                  >
                    Como chegar
                    <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                </div>

                {/* mini mapa integrado */}
                <div data-map onMouseMove={spotMove} className="spot beam relative h-[300px] sm:h-[380px] border border-white/10 bg-[#111113] overflow-hidden">
                  <iframe
                    title="Mapa do PURAZI Studio"
                    src={MAPS_EMBED}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="absolute inset-0 w-full h-full border-0"
                    style={{ filter: 'grayscale(1) invert(0.92) contrast(0.92) brightness(0.95)' }}
                  />
                  <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_70px_rgba(0,0,0,0.65)]" />
                  {!mapActive && (
                    <button
                      onClick={() => setMapActive(true)}
                      className="absolute inset-0 z-10 cursor-pointer"
                      aria-label="Ativar o mapa para interagir"
                    >
                      <span className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-white/80">
                        Toque para explorar o mapa
                      </span>
                    </button>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* ===================== 3. DÚVIDAS (carrossel em 2 linhas) ===================== */}
        <DoubtsSection />
      </main>

      {/* ============================ RODAPÉ ============================= */}
      <footer className="bg-[#0e0e0e] pt-12 sm:pt-16 pb-8 px-6 sm:px-10 lg:px-16 text-neutral-300">
        <div className="max-w-[1366px] mx-auto grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10 lg:gap-14">
          <div data-reveal="up">
            <img src="/assets/logo-purazi-white.png" alt="PURAZI Studio" className="h-14 sm:h-[4.5rem] w-auto mb-6" />
            <p className="text-xs sm:text-sm leading-relaxed max-w-sm mb-4">
              {SITE.tagline} Barbearia moderna com agendamento online inteligente, pontualidade e técnicas de visagismo sob medida.
            </p>
            <p className="font-serif text-sm text-neutral-400">Valença · Rio de Janeiro</p>
          </div>

          <div data-reveal="up" data-delay="0.1">
            <h3 className="font-serif text-lg sm:text-xl font-semibold text-white mb-4">Acesso Rápido</h3>
            <nav className="flex flex-col gap-2.5">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className={footerLink}>Início</button>
              <button onClick={() => handleOpenBookingWithService()} className={footerLink}>Agendar Horário</button>
              <button onClick={() => scrollToId('secao-localizacao')} className={footerLink}>Localização &amp; Estrutura</button>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className={footerLink}>Falar no WhatsApp</a>
              <button onClick={() => setConsultOpen(true)} className={footerLink}>Consultar Meu Agendamento</button>
            </nav>
          </div>

          <div data-reveal="up" data-delay="0.2">
            <h3 className="font-serif text-lg sm:text-xl font-semibold text-white mb-4">Contato e Gestão</h3>
            <div className="flex flex-col gap-3 text-xs sm:text-sm">
              <a href={MAPS_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                {SITE.address} · {SITE.city}
              </a>
              <a href={`tel:+${SITE.whatsappNumber}`} className="text-white hover:text-neutral-300 transition-colors">
                {SITE.phoneDisplay}
              </a>
              <a href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Instagram {SITE.instagramHandle}
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-[1366px] mx-auto mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-500">
          <span>© {new Date().getFullYear()} PURAZI Studio. Todos os direitos reservados.</span>
          <span>Valença · RJ · Barbearia &amp; Visagismo</span>
        </div>
      </footer>

      <BookingDrawer
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        services={services}
        preselectedServiceId={selectedServiceId}
        initialDay={null}
        initialTime={null}
        onBookingComplete={handleDataChanged}
      />

      <ConsultAppointmentModal isOpen={consultOpen} onClose={() => setConsultOpen(false)} />

      <BarberAdminPanel
        isOpen={adminOpen}
        onClose={closeAdmin}
        onDataChanged={handleDataChanged}
      />
    </div>
  );
}
