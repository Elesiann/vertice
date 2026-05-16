import type { JSX } from "react";
import { PageMeta } from "@/components/seo/PageMeta";

export const TermsPage = (): JSX.Element => (
  <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
    <PageMeta
      title="Termos de uso — Vértice"
      description="Termos de uso do Vértice: ferramenta de comparação independente, sem consultoria financeira, sem comissão de emissor."
    />
    <p className="text-caption text-ink-subtle">Termos</p>
    <h1 className="text-display-3 text-ink mt-2">Termos de uso</h1>

    <div className="text-ink-muted text-body mt-8 space-y-6 leading-relaxed">
      <section>
        <h2 className="text-heading text-ink mt-2 mb-3">O que o Vértice é</h2>
        <p>
          O Vértice compara cartões de crédito brasileiros e calcula o retorno modelado de cada
          combinação para um perfil de gasto. O catálogo é curado e verificado linha por linha
          contra os sites dos bancos e regulamentos dos programas de pontos.
        </p>
      </section>

      <section>
        <h2 className="text-heading text-ink mt-10 mb-3">O que o Vértice não é</h2>
        <p>
          O Vértice não é serviço de consultoria financeira nem correspondente bancário. Não há
          parceria com emissor e não há comissão por contratação — o cálculo não muda em função de
          onde você escolhe contratar.
        </p>
      </section>

      <section>
        <h2 className="text-heading text-ink mt-10 mb-3">Limitações</h2>
        <p>
          O catálogo pode conter imprecisões. Confirme anuidade, isenção, programa de pontos e
          benefícios diretamente com o emissor antes de contratar qualquer cartão.
        </p>
        <p>
          Os cálculos de retorno são estimativas baseadas no perfil informado e nas regras do
          catálogo no momento da consulta. Mudanças do emissor (anuidade, multiplicador de pontos,
          condição de isenção) podem invalidar o cálculo a qualquer momento sem aviso.
        </p>
      </section>

      <section>
        <h2 className="text-heading text-ink mt-10 mb-3">Uso</h2>
        <p>
          O Vértice é gratuito e de uso pessoal. A aplicação roda em Cloudflare Pages e Workers no
          plano gratuito; não há garantia de disponibilidade ou SLA.
        </p>
      </section>

      <section>
        <h2 className="text-heading text-ink mt-10 mb-3">Responsabilidade</h2>
        <p>
          A decisão de contratar ou cancelar um cartão é sua. O Vértice oferece um cálculo, não uma
          recomendação contratual.
        </p>
      </section>

      <p className="text-ink-subtle mt-12 text-sm">Última revisão: 16 de maio de 2026.</p>
    </div>
  </main>
);
