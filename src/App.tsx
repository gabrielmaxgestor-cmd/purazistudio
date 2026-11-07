import React, { useState, useEffect } from 'react';
import { BookingDrawer } from './components/BookingDrawer';
import { ConsultAppointmentModal } from './components/ConsultAppointmentModal';
import { BarberAdminPanel } from './components/BarberAdminPanel';
import { ServicesModal } from './components/ServicesModal';
import { Navbar } from './components/Navbar';
import { MiniBookingAgenda } from './components/MiniBookingAgenda';
import { HaircutCarouselSection } from './components/HaircutCarouselSection';
import { Service, DayOption } from './utils/bookingLogic';
import { getStoredServices } from './utils/storage';
import { ArrowRight } from 'lucide-react';

export default function App() {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayOption | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setServices(getStoredServices());
  }, [refreshKey]);

  const handleOpenBookingWithService = (serviceId?: string) => {
    setSelectedServiceId(serviceId || null);
    setSelectedDay(null);
    setSelectedTime(null);
    setBookingOpen(true);
  };

  const handleMiniAgendaSelect = (day: DayOption, time: string) => {
    setSelectedDay(day);
    setSelectedTime(time);
    setSelectedServiceId(null);
    setBookingOpen(true);
  };

  const handleDataChanged = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const scrollToTop = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div id="top" className="min-h-screen bg-[#0f0f0f] text-white">
      {/* ========================================================================= */}
      {/* 1. BARRA DE NAVEGAÇÃO SUPERIOR CONFORME REQUISITO 1                        */}
      {/* Fixa, discreta, transparente sobre o cinza inicial e grafite com desfoque  */}
      {/* ========================================================================= */}
      <Navbar
        onOpenBooking={() => handleOpenBookingWithService()}
        onOpenConsult={() => setConsultOpen(true)}
        onOpenServices={() => setServicesOpen(true)}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      {/* ========================================================================= */}
      {/* ESTRUTURA ORIGINAL FIEL AO DESIGN ANEXADO PELO USUÁRIO                    */}
      {/* Imagem original com 100% de nitidez, sem manchas ou blocos cortados       */}
      {/* Caixas de textos interativas identificadas e posicionadas com precisão    */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* ESTRUTURA CONTÍNUA E FIEL AO DESIGN ORIGINAL                              */}
      {/* 1. Dobras 1 a 3: Hero + Agendamento Online + Clipper + Localização        */}
      {/* 2. Dobra 4: Dúvidas / WhatsApp com carrossel dinâmico                     */}
      {/* 3. Dobra 5: Rodapé institucional limpo com texto direto no fundo escuro   */}
      {/* ========================================================================= */}
      <main className="w-full bg-[#0f0f0f]">
        <h1 className="sr">PURAZI Studio — Aqui, cada detalhe valoriza sua melhor versão. Barbearia em Valença/RJ</h1>

        {/* ------------------------------------------------------------------------- */}
        {/* PARTE 1: CANVAS SUPERIOR (Hero, Agendamento, Máquina de corte e Mapa)     */}
        {/* ------------------------------------------------------------------------- */}
        <div className="page relative max-w-[1366px] mx-auto leading-none bg-[#0f0f0f]">
          <img
            src="/assets/purazi-top.webp"
            alt="PURAZI Studio — Barbearia &amp; Visagismo em Valença/RJ"
            width={1366}
            height={2254}
            loading="eager"
            className="w-full h-auto block bg-canvas"
          />

          {/* 1. HERO: Título Principal */}
          <div
            className="h pointer-events-auto rounded transition-colors group"
            style={{
              left: '49.78%',
              top: '6.65%',
              width: '42.00%',
              height: '10.15%',
            }}
            title="PURAZI Studio: Aqui, cada detalhe valoriza sua melhor versão."
          >
            <span className="sr">Aqui, cada detalhe valoriza sua melhor versão.</span>
          </div>

          {/* Logotipo Oficial PURAZI Studio no Hero */}
          <a
            href="#top"
            onClick={scrollToTop}
            className="h rounded transition-all duration-200 hover:ring-1 hover:ring-neutral-400/30"
            style={{
              left: '76.13%',
              top: '19.28%',
              width: '16.10%',
              height: '3.75%',
            }}
            title="PURAZI Studio — Voltar ao topo"
            aria-label="PURAZI Studio — Voltar ao topo"
          >
            <span className="sr">PURAZI Studio</span>
          </a>

          {/* 2. DOBRA 2: 'Agende seu horário abaixo:' + Subtítulo */}
          <div
            className="h rounded select-text"
            style={{
              left: '20.00%',
              top: '33.58%',
              width: '60.00%',
              height: '3.90%',
            }}
            title="Agende seu horário abaixo"
          >
            <span className="sr">Agende seu horário abaixo:</span>
          </div>

          <div
            className="h rounded select-text"
            style={{
              left: '20.00%',
              top: '37.48%',
              width: '60.00%',
              height: '2.19%',
            }}
            title="Rápido, prático e sem intermediários. Escolha o serviço, barbeiro e confirme em 1 minuto."
          >
            <span className="sr">Rápido, prático e sem intermediários. Escolha o serviço, barbeiro e confirme em 1 minuto.</span>
          </div>

          {/* Botão Único e Destacado: 'Iniciar agendamento online' - alinhado ao texto com os estilos solicitados */}
          <div
            className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-auto w-full flex justify-center px-4"
            style={{
              top: '42.78%',
            }}
          >
            <button
              type="button"
              onClick={() => handleOpenBookingWithService()}
              style={{
                marginLeft: '100px',
                paddingLeft: '25px',
                paddingRight: '25px',
                paddingTop: '14px',
                paddingBottom: '14px',
                marginTop: '-25px',
                marginBottom: '0px',
              }}
              className="group relative inline-flex items-center justify-center gap-2.5 sm:gap-3.5 bg-black text-white hover:bg-neutral-900 border-2 border-amber-400 hover:border-amber-300 text-[11px] sm:text-sm md:text-base font-bold tracking-[0.12em] sm:tracking-[0.25em] uppercase whitespace-nowrap rounded-none shadow-[0_12px_35px_rgba(0,0,0,0.85),0_0_25px_rgba(251,191,36,0.35)] hover:shadow-[0_15px_45px_rgba(0,0,0,0.95),0_0_35px_rgba(251,191,36,0.6)] transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 cursor-pointer"
              aria-label="Iniciar agendamento online"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 group-hover:scale-125 transition-transform animate-pulse" />
              <span>Iniciar agendamento online</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* 3. DOBRA 3: Localização com Pin e Endereço Avenida Nilo Peçanha */}
          <a
            id="secao-localizacao"
            href="https://www.google.com/maps/search/?api=1&query=Avenida+Nilo+Pe%C3%A7anha+1027+Valen%C3%A7a+RJ"
            target="_blank"
            rel="noopener noreferrer"
            className="h rounded cursor-pointer transition-all duration-200 hover:ring-1 hover:ring-red-400/40 hover:bg-white/[0.02] scroll-mt-24 sm:scroll-mt-28"
            style={{
              left: '24.30%',
              top: '81.21%',
              width: '61.00%',
              height: '13.34%',
            }}
            aria-label="Avenida Nilo Peçanha, 1027 - Valença/RJ. Abrir no Google Maps"
            title="Abrir localização no Google Maps: Avenida Nilo Peçanha, 1027 - Valença/RJ"
          >
            <span className="sr">Avenida Nilo Peçanha, 1027 - Valença/RJ</span>
          </a>
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* PARTE 2: SEÇÃO WHATSAPP & DÚVIDAS (Fluxo contínuo logo abaixo do mapa)    */}
        {/* ------------------------------------------------------------------------- */}
        <HaircutCarouselSection />

        {/* ------------------------------------------------------------------------- */}
        {/* PARTE 3: RODAPÉ INSTITUCIONAL CONTÍNUO (Texto direto no fundo escuro)     */}
        {/* Sem caixas de fundo atrás do texto - limpo, legível e responsivo          */}
        {/* ------------------------------------------------------------------------- */}
        <footer className="w-full bg-[#0a0a0c] border-t border-neutral-800/60 pt-16 pb-12 px-6 sm:px-10 lg:px-16 text-neutral-300">
          <div className="max-w-[1366px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14">
            {/* Coluna 1: Logotipo + Descrição Institucional + Cidade */}
            <div className="flex flex-col items-start">
              <a
                href="#top"
                onClick={scrollToTop}
                className="inline-block transition-opacity duration-200 hover:opacity-85 mb-5"
                title="PURAZI Studio — Voltar ao topo"
                aria-label="PURAZI Studio"
              >
                <img
                  src="/assets/aistudio/Logotipo_minimalista_PURAZI_studio_586fcc6b.png"
                  alt="PURAZI Studio"
                  className="h-8 sm:h-9 w-auto object-contain brightness-0 invert"
                />
              </a>
              <p className="font-sans text-xs sm:text-sm text-neutral-300 leading-relaxed font-normal max-w-sm mb-4">
                Aqui, cada detalhe valoriza sua melhor versão. Barbearia moderna com agendamento online inteligente, pontualidade e técnicas de visagismo sob medida.
              </p>
              <div className="font-sans text-xs sm:text-sm text-white font-medium tracking-wide">
                Valença <span className="text-neutral-500 font-normal">·</span> Rio de Janeiro
              </div>
            </div>

            {/* Coluna 2: Acesso Rápido */}
            <div className="flex flex-col items-start md:items-center">
              <div className="w-full md:max-w-xs">
                <h3 className="font-['Cormorant_Garamond',serif] text-lg sm:text-xl font-bold text-white tracking-wide mb-4">
                  Acesso Rápido
                </h3>
                <nav className="flex flex-col space-y-2.5">
                  <a
                    href="#top"
                    onClick={scrollToTop}
                    className="text-neutral-300 hover:text-white font-sans text-xs sm:text-sm tracking-wide transition-colors text-left"
                  >
                    Início
                  </a>
                  <button
                    type="button"
                    onClick={() => handleOpenBookingWithService()}
                    className="text-neutral-300 hover:text-white font-sans text-xs sm:text-sm tracking-wide transition-colors text-left cursor-pointer"
                  >
                    Agendar Horário
                  </button>
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Avenida+Nilo+Pe%C3%A7anha+1027+Valen%C3%A7a+RJ"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-300 hover:text-white font-sans text-xs sm:text-sm tracking-wide transition-colors text-left"
                  >
                    Localização &amp; Estrutura
                  </a>
                  <a
                    href="https://wa.me/5524999999999?text=Ol%C3%A1!%20Vim%20pelo%20site%20do%20PURAZI%20Studio."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-300 hover:text-emerald-400 font-sans text-xs sm:text-sm tracking-wide transition-colors text-left"
                  >
                    Falar no WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => setConsultOpen(true)}
                    className="text-neutral-300 hover:text-white font-sans text-xs sm:text-sm tracking-wide transition-colors text-left cursor-pointer"
                  >
                    Consultar Meu Agendamento
                  </button>
                </nav>
              </div>
            </div>

            {/* Coluna 3: Contato e Gestão */}
            <div className="flex flex-col items-start md:items-end">
              <div className="w-full md:max-w-xs md:text-right">
                <h3 className="font-['Cormorant_Garamond',serif] text-lg sm:text-xl font-bold text-white tracking-wide mb-4">
                  Contato e Gestão
                </h3>
                <div className="flex flex-col space-y-3">
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Avenida+Nilo+Pe%C3%A7anha+1027+Valen%C3%A7a+RJ"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-300 hover:text-white font-sans text-xs sm:text-sm tracking-wide leading-relaxed transition-colors"
                  >
                    Av. Nilo Peçanha, 1027 · Valença/RJ
                  </a>
                  <a
                    href="tel:+5524999999999"
                    className="text-white hover:text-amber-300 font-mono text-sm sm:text-base font-semibold tracking-wider transition-colors inline-block"
                  >
                    (24) 99999-9999
                  </a>
                  <div>
                    <button
                      type="button"
                      onClick={() => setAdminOpen(true)}
                      className="text-neutral-400 hover:text-amber-400 font-sans text-xs sm:text-sm tracking-wide transition-colors cursor-pointer text-left md:text-right"
                    >
                      Painel Administrativo do Barbeiro
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Linha inferior de copyright */}
          <div className="max-w-[1366px] mx-auto mt-12 pt-6 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-neutral-500">
            <div>© PURAZI STUDIO. TODOS OS DIREITOS RESERVADOS. VALENÇA/RJ</div>
            <div className="tracking-[0.2em] text-[10px] uppercase text-neutral-600">BARBEARIA &amp; VISAGISMO</div>
          </div>
        </footer>
      </main>

      {/* Gaveta interativa de Agendamento */}
      <BookingDrawer
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        services={services}
        preselectedServiceId={selectedServiceId}
        initialDay={selectedDay}
        initialTime={selectedTime}
        onBookingComplete={handleDataChanged}
      />

      {/* Modal de Consulta e Cancelamento de Agendamento */}
      <ConsultAppointmentModal
        isOpen={consultOpen}
        onClose={() => setConsultOpen(false)}
      />

      {/* Modal de Tabela de Serviços e Visagismo */}
      <ServicesModal
        isOpen={servicesOpen}
        onClose={() => setServicesOpen(false)}
        services={services}
        onSelectServiceForBooking={(serviceId) => {
          setServicesOpen(false);
          handleOpenBookingWithService(serviceId);
        }}
      />

      {/* Painel Administrativo do Barbeiro */}
      <BarberAdminPanel
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        onDataChanged={handleDataChanged}
      />
    </div>
  );
}
