const nav = [
  ["Inicio", "#inicio"],
  ["Quiénes somos", "#nosotros"],
  ["Financiación y Consultoría", "#financiacion"],
  ["Servicios Jurídicos", "#juridicos"],
  ["Clientes", "#clientes"],
  ["Probono", "#probono"],
  ["Convenios", "#convenios"],
  ["Contacto", "#contacto"],
  ["CBI", "/cbi"],
];

const financingServices = [
  {
    title: "Financiación pública",
    text: "Financiación para creación de nuevas empresas, renovación de activos, ampliación de centros productivos y estrategias público-privadas a medio y largo plazo.",
  },
  {
    title: "Deducciones I+D+i",
    text: "Gestión de deducciones en el Impuesto de Sociedades, informes técnicos y deducciones adicionales por personal investigador.",
  },
  {
    title: "Proyectos I+D+i",
    text: "Búsqueda de financiación para proyectos de todos los sectores y grados de innovación, con preparación técnica, contable, administrativa y jurídica.",
  },
  {
    title: "Licitaciones",
    text: "Gestión documental y procesal, alertas de oportunidades y defensa en el ámbito de la contratación pública.",
  },
  {
    title: "Internacionalización",
    text: "Financiación para proyectos productivos y comerciales en el extranjero, análisis previos y planes de inversión.",
  },
];

const legalServices = [
  "Reclamar denegaciones improcedentes.",
  "Recurrir excesos de la administración durante solicitud y concesión.",
  "Defensa en reclamaciones judiciales relacionadas con la ayuda.",
  "Gestión de ayudas en fase de justificación.",
  "Asesoramiento legal durante todas las fases del procedimiento.",
];

const processSteps = [
  "Reunión previa para conocer vuestro proyecto.",
  "Búsqueda de posibles ayudas o financiación.",
  "Redacción y preparación de solicitudes.",
  "Envío de solicitudes y control de subsanaciones.",
  "Aprobación de ayudas y seguimiento de condiciones.",
  "Control y monitorización de la ejecución del proyecto.",
  "Preparación de justificación técnica y contable.",
  "Envío de justificación y cobro de la ayuda.",
];

const sectors = [
  "Aeronáutica",
  "Agroalimentario",
  "Alimentación y bebidas",
  "Artes gráficas",
  "Automoción",
  "Bienes de equipo",
  "Construcción",
  "Cosmético",
  "Electrónico",
  "Energías renovables",
  "Digitalización",
  "Ingeniería",
  "Materiales",
  "Médico / Hospitalario",
  "Químico",
  "Servicios",
  "Software / Hardware",
  "Telecomunicaciones",
  "Textil",
  "Turismo",
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="Conasoc inicio">
          <img src="/assets/logo-conasoc.png" alt="CONASOC" />
        </a>
        <nav className="main-nav" aria-label="Navegación principal">
          {nav.map(([label, href]) => (
            <a key={label} href={href}>
              {label}
            </a>
          ))}
        </nav>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-image" aria-hidden="true" />
        <div className="section-inner hero-statement">
          <p>30 años de experiencia gestionando subvenciones y financiación pública</p>
          <h1>
            Dedícate a lo que sabes, dedícate a tu empresa.
            <span> Nosotros conseguimos tu financiación.</span>
          </h1>
          <a className="text-link" href="#contacto">
            Contacta con nosotros
          </a>
        </div>
      </section>

      <section className="facts section-band" aria-label="Indicadores Conasoc">
        <div className="section-inner facts-row">
          <p>
            <strong>+300 M€</strong>
            <span>en financiación pública obtenida para nuestros clientes</span>
          </p>
          <p>
            <strong>1996</strong>
            <span>consultoría fundada con actividad especializada</span>
          </p>
          <p>
            <strong>España y Unión Europea</strong>
            <span>convocatorias estatales, autonómicas, regionales y europeas</span>
          </p>
        </div>
      </section>

      <section className="about section-band" id="nosotros">
        <div className="section-inner two-column">
          <div className="section-kicker">Quiénes somos</div>
          <div>
            <h2>Confía en especialistas del sector.</h2>
            <p>
              Somos una empresa de consultoría fundada en 1996, dirigida por
              profesionales con más de 30 años de experiencia especializada en
              asesoramiento financiero y tramitación de subvenciones procedentes
              de distintos organismos, comunidades autónomas, administración
              central y Unión Europea.
            </p>
            <p>
              Nuestro objetivo es que las empresas concentren sus esfuerzos en
              producción, ventas, innovación y objetivos estratégicos, dejando en
              manos de especialistas tareas administrativas complejas y
              altamente burocratizadas.
            </p>
          </div>
        </div>
      </section>

      <section className="financing section-band" id="financiacion">
        <div className="section-inner">
          <div className="section-title-line">
            <span>Financiación y Consultoría</span>
            <h2>Ayudas, deducciones, licitaciones e internacionalización.</h2>
          </div>
          <div className="service-list">
            {financingServices.map((service) => (
              <article key={service.title}>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="legal section-band" id="juridicos">
        <div className="section-inner two-column">
          <div className="section-kicker">Servicios Jurídicos</div>
          <div>
            <h2>Expertos en la gestión y reclamación de ayudas públicas.</h2>
            <p>
              Desde Conasoc llevamos más de 30 años gestionando ayudas y
              procedimientos administrativos. Esa experiencia nos permite
              acompañar también los trámites jurídicos específicos que aparecen
              durante solicitud, concesión, justificación o reclamación.
            </p>
            <ul className="plain-list">
              {legalServices.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="process section-band" id="proceso">
        <div className="section-inner">
          <div className="section-title-line">
            <span>Cómo trabajamos</span>
            <h2>Una operativa clara, adaptable a cada ayuda.</h2>
          </div>
          <ol className="process-list">
            {processSteps.map((step, index) => (
              <li key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="clients section-band" id="clientes">
        <div className="section-inner two-column">
          <div className="section-kicker">Clientes</div>
          <div>
            <h2>Más de 300 clientes de distintos sectores y dimensiones.</h2>
            <p>
              Gracias a nuestra experiencia, empresas de distintas comunidades
              autónomas y sectores han confiado en el Grupo Consultores para el
              estudio, tramitación y obtención de subvenciones, financiación
              externa y servicios asociados.
            </p>
            <div className="sector-columns" aria-label="Sectores trabajados">
              {sectors.map((sector) => (
                <span key={sector}>{sector}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="initiatives section-band">
        <div className="section-inner initiative-columns">
          <article id="probono">
            <span>Probono</span>
            <h2>Apoyo inicial a startups y emprendedores.</h2>
            <p>
              Revisamos proyectos con potencial para orientar los primeros pasos
              de financiación pública y evitar trámites sin recorrido.
            </p>
          </article>
          <article id="convenios">
            <span>Convenios</span>
            <h2>Trabaja con nosotros.</h2>
            <p>
              Colaboramos con entidades, empresas y profesionales para detectar
              oportunidades, preparar proyectos y construir relaciones de largo
              plazo.
            </p>
          </article>
        </div>
      </section>

      <section className="contact section-band" id="contacto">
        <div className="section-inner contact-layout">
          <div>
            <div className="section-kicker">Contacto</div>
            <h2>Preséntanos tu proyecto.</h2>
            <p>
              Estudiaremos tus posibilidades de financiación, tramitación o
              defensa jurídica con una primera revisión clara.
            </p>
          </div>
          <address>
            <a href="tel:+34638841238">Móvil: (+34) 638 84 12 38</a>
            <a href="mailto:con-asoc@con-asociados.com">
              con-asoc@con-asociados.com
            </a>
            <a href="mailto:jorgemoreno@con-asociados.com">
              jorgemoreno@con-asociados.com
            </a>
            <span>C. Santo Domingo, 12. 11500 El Puerto de Sta María, Cádiz</span>
          </address>
        </div>
      </section>

      <footer className="site-footer">
        <div className="section-inner footer-inner">
          <img src="/assets/logo-conasoc.png" alt="CONASOC" />
          <p>
            © 2026 Apoyo e Iniciativas Empresariales S.L. Consultores Asociados
            de Andalucía S.L.
          </p>
          <nav aria-label="Pie de página">
            <a href="#inicio">Inicio</a>
            <a href="#contacto">Contacto</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
