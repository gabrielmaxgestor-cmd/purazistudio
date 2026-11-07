import React, { useState, useEffect } from 'react';
import { BookingDrawer } from './components/BookingDrawer';
import { ConsultAppointmentModal } from './components/ConsultAppointmentModal';
import { BarberAdminPanel } from './components/BarberAdminPanel';
import { Navbar } from './components/Navbar';
import { Service, DayOption, BarberSettings, DEFAULT_BARBER_SETTINGS } from './utils/bookingLogic';
import { getStoredServices, getStoredBarberSettings } from './utils/storage';
import { SITE, MAPS_LINK, whatsappLink } from './utils/siteConfig';
import { ArrowRight } from 'lucide-react';

/* ---------- helpers de exibição ---------- */

const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

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

/* Pin de localização vermelho do design (SVG, nítido em qualquer tela) */
const LocationPin: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 140" className={className} aria-hidden="true">
    <path d="M50 0C22.4 0 0 22.4 0 50c0 37.5 50 90 50 90s50-52.5 50-90C100 22.4 77.6 0 50 0z" fill="#ff1414" />
    <path d="M50 0C22.4 0 0 22.4 0 50c0 37.5 50 90 50 90V0z" fill="#c70f17" />
    <circle cx="50" cy="48" r="21" fill="#212025" />
  </svg>
);

export default function App() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<BarberSettings>(DEFAULT_BARBER_SETTINGS);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setServices(getStoredServices());
    setSettings(getStoredBarberSettings());
  }, [refreshKey]);

  // Entrada suave das seções (respeita "reduzir movimento" via CSS)
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)'));
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [services.length]);

  const handleOpenBookingWithService = (serviceId?: string) => {
    setSelectedServiceId(serviceId || null);
    setBookingOpen(true);
  };

  const handleDataChanged = () => setRefreshKey((prev) => prev + 1);

  const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const openDays = formatOpenDays(settings.fixedOffDays);
  const hoursLabel = `${openDays ? openDays + ' · ' : ''}${formatTime(settings.workStart)} às ${formatTime(settings.workEnd)}`;

  const footerLink =
    'text-neutral-300 hover:text-white text-xs sm:text-sm tracking-wide transition-colors text-left cursor-pointer';

  return (
    <div id="top" className="min-h-screen bg-[#0e0e0e] text-white">
      <Navbar
        onOpenBooking={() => handleOpenBookingWithService()}
        onOpenConsult={() => setConsultOpen(true)}
        onOpenServices={() => scrollToId('servicos')}
        onOpenAdmin={() => setAdminOpen(true)}
      />
      <div className="nav-spacer" aria-hidden="true" />

      <main>
        <h1 className="sr">PURAZI Studio — {SITE.tagline} Barbearia em Valença/RJ</h1>

        {/* ===================== 1. HERO: retrato + título ===================== */}
        <section className="relative z-10 bg-concrete">
          <div className="max-w-[1366px] mx-auto grid grid-cols-[46%_1fr] items-start">
            <div className="self-end -mb-5 sm:-mb-9 lg:-mb-12">
              <img
                src="/assets/barber-photo-clean.webp"
                alt="Barbeiro do PURAZI Studio sorrindo"
                width={600}
                height={640}
                loading="eager"
                className="block w-full h-auto [mask-image:linear-gradient(to_right,#000_80%,transparent_100%)]"
              />
            </div>

            <div className="text-right pr-[7%] pt-[7%] sm:pt-[9%] pb-6">
              <p className="font-display font-extrabold text-black tracking-tight leading-[1.16] text-[clamp(1.2rem,3.9vw,3.4rem)] ml-auto max-w-[11.2em]">
                Aqui, cada detalhe valoriza sua melhor versão.
              </p>
              <img
                src="/assets/logo-purazi-black.png"
                alt="PURAZI Studio"
                className="ml-auto mt-[9%] w-[clamp(92px,17vw,230px)] h-auto"
              />
            </div>
          </div>
        </section>

        {/* ============ 2. BLOCO ESCURO: agendar, serviços, máquina e endereço ============ */}
        <section className="relative bg-night text-white overflow-hidden">
          <div className="max-w-[1366px] mx-auto grid grid-cols-[clamp(54px,13vw,190px)_1fr]">
            {/* PURAZI vertical (acompanha a rolagem) */}
            <aside className="self-start sticky top-24 pt-10 sm:pt-14 pl-[18%]" aria-hidden="true">
              <img
                src="/assets/purazi-vertical-white.png"
                alt=""
                className="w-full h-auto select-none"
              />
            </aside>

            <div className="pr-5 sm:pr-10 lg:pr-20 pl-3 sm:pl-6 pt-12 sm:pt-20 pb-16 sm:pb-24 min-w-0">
              {/* Agende */}
              <div className="reveal text-center">
                <h2 className="font-serif font-light text-[clamp(1.6rem,4.4vw,3.4rem)] leading-tight">
                  Agende seu horário abaixo:
                </h2>
                <p className="mt-2 text-[clamp(0.68rem,1.2vw,0.9rem)] text-neutral-400">
                  Rápido, prático e sem intermediários. Escolha o serviço e confirme em 1 minuto.
                </p>
                <button
                  onClick={() => handleOpenBookingWithService()}
                  className="group mt-8 inline-flex items-center justify-center gap-3 h-12 sm:h-14 px-7 sm:px-10 bg-white text-black hover:bg-neutral-200 text-[11px] sm:text-xs uppercase tracking-[0.22em] font-bold transition-colors cursor-pointer"
                >
                  Agendar horário
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>

              {/* Serviços */}
              <div id="servicos" className="reveal mt-14 sm:mt-20 max-w-3xl mx-auto">
                <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-500 mb-4 text-center">Serviços</p>
                <ul className="border-t border-white/15">
                  {services.map((service) => (
                    <li key={service.id} className="border-b border-white/15">
                      <button
                        type="button"
                        onClick={() => handleOpenBookingWithService(service.id)}
                        className="group w-full text-left py-4 sm:py-5 flex items-start justify-between gap-4 cursor-pointer"
                      >
                        <span className="min-w-0">
                          <span className="block font-serif text-lg sm:text-2xl group-hover:text-neutral-300 transition-colors">
                            {service.name}
                          </span>
                          {service.description && (
                            <span className="mt-1 block text-xs sm:text-sm leading-relaxed text-neutral-400 max-w-md">
                              {service.description}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-serif text-lg sm:text-2xl">{formatPrice(service.price)}</span>
                          <span className="block text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-neutral-500">
                            {service.durationMinutes} min
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Máquina de corte */}
              <div className="reveal mt-12 sm:mt-20 -mx-3 sm:mx-0">
                <img
                  src="/assets/clipper-clean.webp"
                  alt="Máquina de corte profissional"
                  loading="lazy"
                  className="fade-edges w-full h-auto"
                />
              </div>

              {/* Endereço com pin */}
              <a
                id="secao-localizacao"
                href={MAPS_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="reveal mt-6 sm:mt-10 flex items-center justify-center group"
                aria-label="Abrir endereço no Google Maps"
              >
                <LocationPin className="shrink-0 w-[clamp(46px,9vw,120px)] h-auto -mr-[clamp(14px,3.4vw,46px)]" />
                <span className="font-serif font-light leading-snug text-[clamp(1.2rem,3.9vw,3.1rem)] group-hover:text-neutral-300 transition-colors">
                  Avenida Nilo Peçanha,
                  <br />
                  <span className="pl-[0.9em]">1027 - Valença/RJ</span>
                </span>
              </a>
              <p className="reveal mt-4 text-center text-[11px] sm:text-xs uppercase tracking-[0.22em] text-neutral-500">
                {hoursLabel}
              </p>
            </div>
          </div>
        </section>

        {/* ===================== 3. WHATSAPP + BARBA ===================== */}
        <section className="bg-concrete text-black overflow-hidden">
          <div className="max-w-[1366px] mx-auto grid grid-cols-[1fr_1fr] items-center">
            <div className="reveal pl-[7%] pr-3 py-10">
              <p className="font-serif font-light text-[clamp(1.1rem,3.1vw,2.5rem)] leading-snug">
                Dúvida? Chama no WhatsApp.
              </p>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 sm:mt-8 inline-flex items-center justify-center h-11 sm:h-14 px-4 sm:px-9 bg-black text-white hover:bg-neutral-800 text-[10px] sm:text-xs uppercase tracking-[0.14em] sm:tracking-[0.2em] font-bold whitespace-nowrap transition-colors"
              >
                Falar no WhatsApp
              </a>
            </div>
            <div className="reveal">
              <img
                src="/assets/beard-art.png"
                alt="Ilustração de barba e cabelo estilizados"
                loading="lazy"
                className="block w-full h-auto [mask-image:linear-gradient(to_right,transparent_0%,#000_22%)]"
              />
            </div>
          </div>
        </section>
      </main>

      {/* ============================ RODAPÉ ============================= */}
      <footer className="bg-[#0e0e0e] pt-14 sm:pt-16 pb-8 px-6 sm:px-10 lg:px-16 text-neutral-300">
        <div className="max-w-[1366px] mx-auto grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10 lg:gap-14">
          <div>
            <img src="/assets/logo-purazi-white.png" alt="PURAZI Studio" className="h-8 sm:h-9 w-auto mb-5" />
            <p className="text-xs sm:text-sm leading-relaxed max-w-sm mb-4">
              {SITE.tagline} Barbearia moderna com agendamento online inteligente, pontualidade e técnicas de visagismo sob medida.
            </p>
            <p className="font-serif text-sm text-neutral-400">Valença · Rio de Janeiro</p>
          </div>

          <div>
            <h3 className="font-serif text-lg sm:text-xl font-semibold text-white mb-4">Acesso Rápido</h3>
            <nav className="flex flex-col gap-2.5">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className={footerLink}>Início</button>
              <button onClick={() => handleOpenBookingWithService()} className={footerLink}>Agendar Horário</button>
              <button onClick={() => scrollToId('secao-localizacao')} className={footerLink}>Localização &amp; Estrutura</button>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className={footerLink}>Falar no WhatsApp</a>
              <button onClick={() => setConsultOpen(true)} className={footerLink}>Consultar Meu Agendamento</button>
            </nav>
          </div>

          <div>
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
              <button onClick={() => setAdminOpen(true)} className={footerLink + ' text-neutral-500'}>
                Painel Administrativo do Barbeiro
              </button>
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
        onClose={() => setAdminOpen(false)}
        onDataChanged={handleDataChanged}
      />
    </div>
  );
}
