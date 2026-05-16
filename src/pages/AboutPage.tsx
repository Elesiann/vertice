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
          Sete campos no{" "}
          <Link to={ROUTES.INPUT} className="text-ink underline underline-offset-4">
            formulário
          </Link>
          : gasto doméstico, gasto internacional, renda, valor investível, programa preferido,
          cartões atuais, viagens por ano. A partir disso, o solver avalia todas as combinações
          válidas do catálogo, decompõe o retorno em anuidade, pontos, cashback, sala VIP, seguro e
          IOF, e ordena por líquido anual.
        </p>
      </section>

      <section>
        <h2 className="text-heading text-ink mt-10 mb-3">Por que existe</h2>
        {/* TODO: escrever motivação pessoal. Tom Mercury — calmo, denso, sem floreio. */}
        <p>
          Cartões brasileiros são otimizáveis e quase ninguém otimiza. As ferramentas que aparecem
          em busca são tomadas por sites com comissão de afiliado, então a recomendação não é
          neutra. O Vértice existe pra fazer o cálculo aberto, sem incentivo financeiro pra
          recomendar um cartão em vez de outro.
        </p>
      </section>

      <section>
        <h2 className="text-heading text-ink mt-10 mb-3">Stack</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Frontend em React 18, Vite, TypeScript e Tailwind, em Cloudflare Pages.</li>
          <li>API em Hono sobre Cloudflare Workers, com cálculo determinístico.</li>
          <li>Catálogo curado em YAML, validado por zod no build.</li>
        </ul>
        <p className="mt-4">
          Sem login, sem cookies de marketing, sem afiliação a emissor. Detalhes em{" "}
          <Link to={ROUTES.PRIVACY} className="text-ink underline underline-offset-4">
            Privacidade
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="text-heading text-ink mt-10 mb-3">Código</h2>
        <p>
          Frontend open-source:{" "}
          <a
            href="https://github.com/Elesiann/vertice"
            className="text-ink underline underline-offset-4"
            target="_blank"
            rel="noreferrer noopener"
          >
            github.com/Elesiann/vertice
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-heading text-ink mt-10 mb-3">Quem fez</h2>
        {/* TODO: nome + LinkedIn ou similar. */}
        <p>
          Construído por{" "}
          <a
            href="https://www.linkedin.com/in/gcorrea-vee"
            className="text-ink underline underline-offset-4"
            target="_blank"
            rel="noreferrer noopener"
          >
            Gio Corrêa
          </a>
          .
        </p>
      </section>
    </div>
  </main>
);
