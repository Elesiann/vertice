import type { JSX } from "react";
import { PageMeta } from "@/components/seo/PageMeta";
import { ROUTES } from "@/lib/routes-constants";
import { Link } from "react-router-dom";

export const AboutPage = (): JSX.Element => (
  <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
    <PageMeta
      title="Sobre — Vértice"
      description="O Vértice é um recomendador independente de cartões de crédito brasileiros, com cálculo aberto e catálogo curado."
    />
    <p className="text-caption text-ink-subtle">Sobre</p>
    <h1 className="text-display-3 text-ink mt-2">O Vértice</h1>

    <div className="text-ink-muted text-body mt-8 space-y-6 leading-relaxed">
      <p>
        O Vértice é um recomendador independente de cartões de crédito brasileiros. Você preenche um
        perfil de gasto, e o cálculo retorna a combinação de cartões com o maior retorno líquido em
        12 meses para esse perfil.
      </p>

      <section>
        <h2 className="text-heading text-ink mt-10 mb-3">Como funciona</h2>
        <p>
          Seis campos no{" "}
          <Link to={ROUTES.INPUT} className="text-ink underline underline-offset-4">
            formulário
          </Link>
          : gasto doméstico, renda, valor investível, programa preferido, cartões atuais, viagens
          por ano. A partir disso, o algorítmo avalia todas as combinações válidas do catálogo,
          decompõe o retorno em anuidade, pontos, cashback, sala VIP, seguro e IOF, e ordena por
          líquido anual.
        </p>
      </section>

      <section>
        <h2 className="text-heading text-ink mt-10 mb-3">Por que existe</h2>
        <p>
          Cartões brasileiros são otimizáveis e quase ninguém otimiza. As ferramentas que aparecem
          em busca são tomadas por sites com comissão de afiliado, então a recomendação não é
          neutra. O Vértice existe pra fazer o cálculo aberto, sem incentivo financeiro pra
          recomendar um cartão em vez de outro.
        </p>
      </section>

      <section>
        <h2 className="text-heading text-ink mt-10 mb-3">Quem fez</h2>
        <p>
          Construído por{" "}
          <a
            href="https://www.linkedin.com/in/giovanimachado/"
            className="text-ink underline underline-offset-4"
            target="_blank"
            rel="noreferrer noopener"
          >
            Giovani Corrêa
          </a>
          .
        </p>
      </section>
    </div>
  </main>
);
