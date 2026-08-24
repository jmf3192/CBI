const services = [
  {
    title: "Financiación pública",
    text: "Búsqueda, selección y tramitación de ayudas estatales, autonómicas, regionales y europeas para proyectos empresariales.",
    points: [
      "Nuevas empresas y ampliaciones",
      "Renovación de activos",
      "Nuevos centros productivos",
      "Gestión integral e informes",
    ],
  },
  {
    title: "Innovación e I+D+i",
    text: "Estrategias de financiación para proyectos innovadores, deducciones fiscales y documentación técnica alineada con cada convocatoria.",
    points: [
      "Deducciones en Impuesto de Sociedades",
      "Proyectos I+D+i sectoriales",
      "Justificación técnica y contable",
      "Análisis de requisitos mínimos",
    ],
  },
  {
    title: "Servicios jurídicos",
    text: "Asesoramiento legal especializado en procedimientos de ayudas públicas, reclamaciones y contratación pública.",
    points: [
      "Reclamación de denegaciones",
      "Defensa administrativa y judicial",
      "Gestión de ayudas en justificación",
      "Licitaciones y oportunidades",
    ],
  },
  {
    title: "CBI",
    text: "Área de business intelligence para estimar la competitividad de proyectos frente a convocatorias y datos comparativos.",
    points: [
      "Convocatorias activas por permiso",
      "Cuestionarios de evaluación",
      "Comparativa frente a competidores",
      "Datasets CSV versionados",
    ],
  },
];

const processSteps = [
  ["01", "Sesión inicial", "Reunión previa para conocer vuestro proyecto."],
  ["02", "Investigación", "Búsqueda de posibles ayudas o financiación."],
  ["03", "Preparación", "Redacción y preparación de solicitudes."],
  ["04", "Envío", "Presentación y control de subsanaciones."],
  ["05", "Resolución", "Seguimiento de aprobaciones y condiciones."],
  ["06", "Ejecución", "Monitorización técnica y económica del proyecto."],
  ["07", "Justificación", "Preparación documental, técnica y contable."],
  ["08", "Cobro", "Envío de justificación y cierre de la ayuda."],
];

const sectors = [
  "Aeronáutica",
  "Agroalimentario",
  "Automoción",
  "Digitalización",
  "Energías renovables",
  "Ingeniería",
  "Médico / Hospitalario",
  "Químico",
  "Software / Hardware",
  "Telecomunicaciones",
  "Textil",
  "Turismo",
];

const nav = [
  ["Inicio", "#inicio"],
  ["Quiénes somos", "#nosotros"],
  ["Servicios", "#servicios"],
  ["Cómo trabajamos", "#proceso"],
  ["CBI", "/cbi"],
  ["Contacto", "#contacto"],
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

      <section className="hero section-band" id="inicio">
        <img
          className="hero-asset"
          src="/assets/conasoc-nosotros.png"
          alt=""
          aria-hidden="true"
        />
        <div className="section-inner hero-inner">
          <p className="eyebrow">Consultoría en financiación pública</p>
          <h1>Conasoc</h1>
          <p className="hero-lede">
            Más de 30 años ayudando a empresas a conseguir subvenciones,
            financiación pública y apoyo experto en cada fase del procedimiento.
          </p>
          <div className="hero-actions" aria-label="Acciones principales">
            <a className="button primary" href="#contacto">
              Contacta con nosotros
            </a>
            <a className="button secondary" href="/cbi">
              Entrar en CBI
            </a>
          </div>
        </div>
      </section>

      <section className="metrics section-band" aria-label="Indicadores">
        <div className="section-inner metrics-grid">
          <article>
            <strong>+300 M€</strong>
            <span>en financiación pública obtenida para clientes</span>
          </article>
          <article>
            <strong>1996</strong>
            <span>inicio de una trayectoria especializada</span>
          </article>
          <article>
            <strong>30+</strong>
            <span>años de experiencia en ayudas y subvenciones</span>
          </article>
          <article>
            <strong>España + UE</strong>
            <span>convocatorias estatales, autonómicas y europeas</span>
          </article>
        </div>
      </section>

      <section className="intro section-band" id="nosotros">
        <div className="section-inner split">
          <div>
            <p className="eyebrow">Quiénes somos</p>
            <h2>Especialistas que liberan tiempo para tu negocio.</h2>
          </div>
          <div className="copy-stack">
            <p>
              Conasoc concentra la experiencia de Apoyo e Iniciativas
              Empresariales S.L. y Consultores Asociados de Andalucía S.L. en
              asesoramiento financiero, subvenciones públicas y defensa
              jurídico-administrativa.
            </p>
            <p>
              El valor de la nueva web debe ser claro: explicar qué hacemos,
              demostrar solvencia, abrir una vía directa de contacto y dar
              entrada a CBI como área privada de análisis competitivo.
            </p>
          </div>
        </div>
      </section>

      <section className="services section-band" id="servicios">
        <div className="section-inner">
          <div className="section-heading">
            <p className="eyebrow">Servicios</p>
            <h2>Todo lo que podemos hacer por tu proyecto.</h2>
          </div>
          <div className="service-grid">
            {services.map((service, index) => (
              <article className="service-card" key={service.title}>
                <span className="service-index">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                <ul>
                  {service.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="process section-band" id="proceso">
        <div className="section-inner">
          <div className="section-heading">
            <p className="eyebrow">Cómo trabajamos</p>
            <h2>Un proceso completo desde la idea hasta el cobro.</h2>
          </div>
          <div className="process-grid">
            {processSteps.map(([number, title, text]) => (
              <article className="process-step" key={`${number}-${title}`}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cbi-feature section-band" id="cbi">
        <div className="section-inner cbi-layout">
          <div>
            <p className="eyebrow">Conasoc Business Intelligence</p>
            <h2>CBI pasa a ser una pestaña dentro de Conasoc.</h2>
            <p>
              El proyecto CBI queda integrado como área privada para evaluar
              proyectos frente a convocatorias, comparar competidores y trabajar
              con datos CSV versionados.
            </p>
            <a className="button primary" href="/cbi">
              Abrir área CBI
            </a>
          </div>
          <div className="cbi-panel" aria-label="Vista resumida CBI">
            <div className="panel-header">
              <span>CBI</span>
              <small>Convocatorias activas</small>
            </div>
            <div className="panel-list">
              <span>Innovación empresarial</span>
              <span>Digitalización y datos</span>
              <span>Sostenibilidad e impacto</span>
            </div>
            <div className="panel-score">
              <strong>82</strong>
              <span>puntuación estimada</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sectors section-band" id="clientes">
        <div className="section-inner">
          <div className="section-heading compact">
            <p className="eyebrow">Clientes y sectores</p>
            <h2>Experiencia transversal con más de 300 clientes.</h2>
          </div>
          <div className="sector-list" aria-label="Sectores trabajados">
            {sectors.map((sector) => (
              <span key={sector}>{sector}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="opportunities section-band">
        <div className="section-inner opportunity-grid">
          <article>
            <p className="eyebrow">Pro bono</p>
            <h2>Apoyo a startups y emprendedores.</h2>
            <p>
              Un espacio para proyectos con potencial que necesitan orientación
              inicial antes de competir por financiación pública.
            </p>
          </article>
          <article>
            <p className="eyebrow">Convenios</p>
            <h2>Trabaja con nosotros.</h2>
            <p>
              Colaboraciones con empresas, entidades y compañeros de camino
              para crear proyectos financiables y objetivos compartidos.
            </p>
          </article>
        </div>
      </section>

      <section className="contact section-band" id="contacto">
        <div className="section-inner contact-layout">
          <div>
            <p className="eyebrow">Contacto</p>
            <h2>Cuéntanos tu proyecto y vemos las opciones.</h2>
            <p>
              Escríbenos con una primera descripción de la inversión,
              convocatoria o necesidad jurídica. Te responderemos cuanto antes.
            </p>
          </div>
          <address>
            <a href="tel:+34638841238">638 84 12 38</a>
            <a href="mailto:con-asoc@con-asociados.com">
              con-asoc@con-asociados.com
            </a>
            <a href="mailto:Jorgemoreno@con-asociados.com">
              Jorgemoreno@con-asociados.com
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
          <nav aria-label="Legal">
            <a href="#contacto">Contacto</a>
            <a href="/cbi">CBI</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
