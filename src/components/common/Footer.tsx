import { SIBLING_APPS } from "../../data/siblingApps";
import "./Footer.css";

interface FooterLabels {
  siblingsHeading: string;
  hub: string;
  orcid: string;
}

interface FooterProps {
  currentAppId: string;
  disclaimer: string;
  labels: FooterLabels;
}

function Footer({ currentAppId, disclaimer, labels }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="app-footer-siblings">
        <span className="app-footer-siblings-label">{labels.siblingsHeading}</span>
        <nav className="app-footer-sibling-links">
          {SIBLING_APPS.map((app) =>
            app.id === currentAppId ? (
              <span key={app.id} className="app-footer-sibling-current">
                {app.name}
              </span>
            ) : (
              <a key={app.id} href={app.url} className="app-footer-sibling-link">
                {app.name}
              </a>
            )
          )}
        </nav>
      </div>

      <div className="app-footer-meta">
        <a
          href="https://phtlab.org"
          className="app-footer-hub-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {labels.hub}
        </a>
        <span className="app-footer-sep">&middot;</span>
        <a
          href="https://orcid.org/0009-0005-1866-8257"
          className="app-footer-orcid-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {labels.orcid}
        </a>
        <span className="app-footer-sep">&middot;</span>
        <span className="app-footer-copyright">&copy; {year} Won Ho Lee &middot; PHT Lab</span>
      </div>

      <p className="app-footer-disclaimer">{disclaimer}</p>
    </footer>
  );
}

export default Footer;