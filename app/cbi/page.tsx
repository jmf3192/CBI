const nav = [
  ["Inicio", "/#inicio"],
  ["Quiénes somos", "/#nosotros"],
  ["Financiación y Consultoría", "/#financiacion"],
  ["Servicios Jurídicos", "/#juridicos"],
  ["Clientes", "/#clientes"],
  ["Probono", "/#probono"],
  ["Convenios", "/#convenios"],
  ["Contacto", "/#contacto"],
  ["CBI", "/cbi"],
];

export default function CbiPage() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Conasoc inicio">
          <img src="/assets/logo-conasoc.png" alt="CONASOC" />
        </a>
        <nav className="main-nav" aria-label="Navegación principal">
          {nav.map(([label, href]) => (
            <a key={label} href={href} aria-current={label === "CBI" ? "page" : undefined}>
              {label}
            </a>
          ))}
        </nav>
      </header>

      <section className="cbi-minimal section-band">
        <div className="section-inner two-column">
          <div className="section-kicker">CBI</div>
          <div>
            <h1>Conasoc Business Intelligence</h1>
            <p>
              Acceso privado a las herramientas de convocatorias, usuarios,
              evaluación de proyectos y administración.
            </p>
            <a className="text-link" href="/cbi/interfaces/acceso.html">
              Entrar en CBI
            </a>
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
          <nav aria-label="Pie de página">
            <a href="/">Inicio</a>
            <a href="/#contacto">Contacto</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
