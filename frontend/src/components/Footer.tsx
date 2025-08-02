import "./Footer.css";

type FooterLink = {
  name: string;
  href: string;
  external?: boolean;
};

const footerLinks: Record<string, FooterLink[]> = {
  Produto: [
    { name: "Início", href: "/" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Preços", href: "/pricing" },
    { name: "Documentação", href: "/docs" },
  ],
  Recursos: [
    { name: "GitHub", href: "https://github.com/Fegue3/NebulaBox", external: true },
    { name: "API", href: "/api" },
    { name: "Tutoriais", href: "/tutorials" },
    { name: "Estado", href: "/status" },
  ],
  Empresa: [
    { name: "Privacidade", href: "/privacy" },
    { name: "Termos", href: "/terms" },
    { name: "Contacto", href: "/contact" },
  ],
};


export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-columns">
        {Object.entries(footerLinks).map(([section, links]) => (
          <div key={section} className="footer-section">
            <h4>{section}</h4>
            {links.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target={link.external ? "_blank" : "_self"}
                rel={link.external ? "noopener noreferrer" : undefined}
              >
                {link.name}
              </a>
            ))}
          </div>
        ))}
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Keeply. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
