const modules = [
  {
    title: "Acceso privado",
    text: "Entrada para usuarios autorizados y perfiles administradores.",
  },
  {
    title: "Convocatorias",
    text: "Listado de convocatorias activas visibles según permisos.",
  },
  {
    title: "Evaluaciones",
    text: "Cuestionarios, puntuación estimada y lectura competitiva.",
  },
  {
    title: "Datos CSV",
    text: "Datasets de competencia asociados a cada convocatoria.",
  },
];

export default function CbiPage() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Conasoc inicio">
          <img src="/assets/logo-conasoc.png" alt="CONASOC" />
        </a>
        <nav className="main-nav" aria-label="Navegación principal">
          <a href="/">Inicio</a>
          <a href="/#servicios">Servicios</a>
          <a href="/#proceso">Cómo trabajamos</a>
          <a href="/cbi" aria-current="page">
            CBI
          </a>
          <a href="/#contacto">Contacto</a>
        </nav>
      </header>

      <section className="cbi-hero section-band">
        <div className="section-inner cbi-hero-inner">
          <p className="eyebrow">Conasoc Business Intelligence</p>
          <h1>CBI</h1>
          <p>
            Área privada para evaluar la competitividad de proyectos frente a
            convocatorias de financiación pública, con reglas versionadas y
            datos comparativos.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="/cbi/interfaces/acceso.html">
              Acceder a CBI
            </a>
            <a className="button secondary" href="/#contacto">
              Solicitar acceso
            </a>
          </div>
        </div>
      </section>

      <section className="cbi-modules section-band">
        <div className="section-inner">
          <div className="section-heading">
            <p className="eyebrow">Plataforma</p>
            <h2>Una capa de datos dentro de la web Conasoc.</h2>
          </div>
          <div className="module-grid">
            {modules.map((module) => (
              <article className="module-card" key={module.title}>
                <h3>{module.title}</h3>
                <p>{module.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cbi-access section-band">
        <div className="section-inner access-layout">
          <div>
            <p className="eyebrow">Área privada</p>
            <h2>Acceso a las herramientas CBI.</h2>
            <p>
              Entra al portal, consulta convocatorias activas o revisa el panel
              de administración según el perfil autorizado.
            </p>
          </div>
          <div className="access-links">
            <a href="/cbi/interfaces/acceso.html">Acceso</a>
            <a href="/cbi/interfaces/convocatorias.html">Convocatorias</a>
            <a href="/cbi/interfaces/admin.html">Admin</a>
          </div>
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
            <a href="/">Inicio</a>
            <a href="/#contacto">Contacto</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
