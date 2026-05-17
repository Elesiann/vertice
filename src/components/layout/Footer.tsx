import type { JSX } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/lib/routes-constants";
import packageJson from "../../../package.json";

const YEAR = new Date().getFullYear();

export const Footer = (): JSX.Element => (
  <footer className="border-line bg-surface mt-12 border-t">
    <div className="text-ink-subtle mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
      <p className="max-w-xl leading-relaxed">
        O Vértice não é serviço de consultoria financeira. Os cálculos são estimativas baseadas em
        catálogo curado. Confirme com o emissor antes de contratar. Logos e nomes de cartões
        pertencem aos respectivos emissores.
      </p>
      <nav aria-label="Rodapé" className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link to={ROUTES.ABOUT} className="hover:text-ink transition-colors">
          Sobre
        </Link>
        <Link to={ROUTES.PRIVACY} className="hover:text-ink transition-colors">
          Privacidade
        </Link>
        <Link to={ROUTES.TERMS} className="hover:text-ink transition-colors">
          Termos
        </Link>
        <span aria-hidden>·</span>
        <span>
          {YEAR} · v{packageJson.version}
        </span>
      </nav>
    </div>
  </footer>
);
