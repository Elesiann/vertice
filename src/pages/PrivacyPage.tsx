import type { JSX } from "react";
import { PageMeta } from "@/components/seo/PageMeta";

export const PrivacyPage = (): JSX.Element => (
  <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
    <PageMeta
      title="Privacidade — Vértice"
      description="Como o Vértice trata seus dados: tudo fica no navegador, nada é armazenado em servidor próprio, sem cookies de marketing."
    />
    <p className="text-caption text-ink-subtle">Política</p>
    <h1 className="text-display-3 text-ink mt-2">Privacidade</h1>

    <div className="text-ink-muted text-body mt-8 space-y-6 leading-relaxed">
      <p>
        O Vértice é um app local. Tudo que você preenche fica no seu navegador, no{" "}
        <code className="bg-surface-sunken text-ink rounded px-1 py-0.5 text-sm">localStorage</code>
        . O perfil sai do dispositivo apenas no momento em que você gera uma recomendação, e é
        descartado pelo servidor imediatamente após o cálculo.
      </p>

      <section>
        <h2 className="text-heading text-ink mt-10 mb-3">O que fica armazenado no seu navegador</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-ink">Perfil de gasto</strong> (valores mensais, programa
            preferido, cartões atuais), na chave{" "}
            <code className="bg-surface-sunken text-ink rounded px-1 py-0.5 text-sm">
              vertice.profile.v1
            </code>
            .
          </li>
          <li>
            <strong className="text-ink">Recomendação calculada</strong>, em cache até o catálogo
            mudar, na chave{" "}
            <code className="bg-surface-sunken text-ink rounded px-1 py-0.5 text-sm">
              vertice.recommendation.v2
            </code>
            .
          </li>
          <li>
            <strong className="text-ink">Preferência de tema</strong> (claro ou escuro), na chave{" "}
            <code className="bg-surface-sunken text-ink rounded px-1 py-0.5 text-sm">
              vertice.theme.v1
            </code>
            .
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-heading text-ink mt-10 mb-3">O que o servidor recebe</h2>
        <p>
          Quando você gera uma recomendação, o perfil é enviado a{" "}
          <code className="bg-surface-sunken text-ink rounded px-1 py-0.5 text-sm">
            api.vertice.cards
          </code>{" "}
          apenas para o cálculo. O servidor calcula e responde — não persiste o perfil em banco,
          arquivo ou cache.
        </p>
      </section>

      <section>
        <h2 className="text-heading text-ink mt-10 mb-3">Observabilidade</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-ink">Erros não tratados</strong> são enviados ao Sentry sem
            dados pessoais — apenas o tipo de erro e a stack. IP, nome e identificadores permanecem
            omitidos.
          </li>
          <li>
            <strong className="text-ink">Métricas de uso</strong> vêm do Cloudflare Web Analytics,
            cookieless e agregadas. Sem fingerprinting do navegador.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-heading text-ink mt-10 mb-3">Como apagar tudo</h2>
        <p>Três opções, todas no seu dispositivo:</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>
            Botão <strong className="text-ink">Limpar dados e recarregar</strong> disponível em
            qualquer tela de erro.
          </li>
          <li>DevTools do navegador → Application → Local Storage → site → Clear.</li>
          <li>Limpar dados do site nas configurações do navegador.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-heading text-ink mt-10 mb-3">LGPD</h2>
        <p>
          A Lei Geral de Proteção de Dados garante acesso, correção e exclusão dos seus dados
          pessoais. Como o Vértice não armazena dados em servidor próprio, esses direitos se
          resolvem limpando o{" "}
          <code className="bg-surface-sunken text-ink rounded px-1 py-0.5 text-sm">
            localStorage
          </code>{" "}
          pelas opções acima.
        </p>
      </section>

      <p className="text-ink-subtle mt-12 text-sm">Última revisão: 16 de maio de 2026.</p>
    </div>
  </main>
);
