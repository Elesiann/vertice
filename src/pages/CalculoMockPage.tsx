import { type JSX } from "react";

// Throwaway mockup for the "Como chegamos ao líquido" redesign of the old "Ver cálculo completo"
// section. Not linked anywhere — visit /mock/calculo. Delete once the real section ships.

interface Line {
  label: string;
  caption: string;
  valueBrl: number; // signed: positive adds, negative subtracts
}

const fmt = (v: number): string =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const Waterfall = ({
  title,
  netLabel,
  lines,
  netBrl,
  footnotes,
}: {
  title: string;
  netLabel: string;
  lines: Line[];
  netBrl: number;
  footnotes: string[];
}): JSX.Element => (
  <section className="border-line border-b py-8">
    <h2 className="text-heading text-ink">{title}</h2>
    <dl className="divide-line mt-6 divide-y">
      {lines.map((line) => {
        const add = line.valueBrl >= 0;
        return (
          <div
            key={line.label}
            className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-3.5"
          >
            <dt className="text-ink text-sm font-medium">{line.label}</dt>
            <dd
              className={`text-num tabular text-sm font-semibold ${add ? "text-accent" : "text-ink"}`}
            >
              {add ? "+" : "−"} {fmt(Math.abs(line.valueBrl))}
            </dd>
            <p className="text-ink-subtle col-span-2 text-xs leading-relaxed">{line.caption}</p>
          </div>
        );
      })}
      <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 py-4">
        <dt className="text-ink text-sm font-semibold">{netLabel}</dt>
        <dd className="text-kpi text-accent tabular">{fmt(netBrl)}</dd>
      </div>
    </dl>
    <ul className="text-ink-muted mt-4 space-y-1.5 text-xs leading-relaxed">
      {footnotes.map((f) => (
        <li key={f} className="flex gap-2">
          <span aria-hidden className="text-ink-subtle/60">
            ·
          </span>
          <span>{f}</span>
        </li>
      ))}
    </ul>
  </section>
);

export const CalculoMockPage = (): JSX.Element => (
  <main className="bg-surface text-ink-muted min-h-screen">
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6 md:py-12">
      <p className="text-caption text-ink-subtle">Mockup — não é a página real</p>
      <h1 className="text-display-3 text-ink mt-2">Redesenho da seção “Ver cálculo completo”</h1>
      <p className="text-ink-subtle mt-2 max-w-xl text-sm">
        Substitui o despejo de internals (Score-lab, retorno bruto cru, liquidez, alternativa
        institucional) por um “waterfall” que mostra como o líquido foi formado. Dois cenários
        abaixo: anuidade isenta (estado B do seu print) e cartão com anuidade + custo no exterior.
      </p>

      <div className="mt-8">
        <Waterfall
          title="Como chegamos ao líquido"
          netLabel="Líquido estimado em 12 meses"
          lines={[
            {
              label: "Valor em pontos",
              caption: "37.200 pts acumulados · ~R$ 0,032/pt no programa Smiles",
              valueBrl: 1200,
            },
            {
              label: "Benefícios de viagem",
              caption: "sala VIP R$ 400,00 · seguro viagem R$ 350,00",
              valueBrl: 750,
            },
            {
              label: "Custo no exterior",
              caption: "US$ 2.400,00/ano · câmbio R$ 4,90 + IOF",
              valueBrl: -444,
            },
            {
              label: "Anuidade",
              caption: "isenta com gasto a partir de R$ 3.000,00/mês",
              valueBrl: 0,
            },
          ]}
          netBrl={1009.2}
          footnotes={[
            "Câmbio: R$ 4,90 por US$ 1 — PTAX de 12/05/2026",
            "Acesso: exige R$ 150.000,00 investidos no emissor",
            "Se paga a partir de R$ 1.250,00/mês de gasto · cada R$ 1 de anuidade rende R$ 3,40",
          ]}
        />
      </div>

      <div className="mt-8">
        <Waterfall
          title="Como chegamos ao líquido"
          netLabel="Líquido estimado em 12 meses"
          lines={[
            {
              label: "Cashback",
              caption: "1,5% sobre R$ 60.000,00 de gasto no ano",
              valueBrl: 900,
            },
            {
              label: "Benefícios de viagem",
              caption: "sala VIP R$ 200,00",
              valueBrl: 200,
            },
            {
              label: "Custo no exterior",
              caption: "US$ 1.200,00/ano · câmbio R$ 4,90 + IOF",
              valueBrl: -222,
            },
            {
              label: "Anuidade",
              caption: "R$ 396,00/ano — não isenta no seu cenário",
              valueBrl: -396,
            },
          ]}
          netBrl={482}
          footnotes={[
            "Câmbio: R$ 4,90 por US$ 1 — PTAX de 12/05/2026",
            "Acesso: sem exigência financeira",
            "Se paga a partir de R$ 2.200,00/mês de gasto · cada R$ 1 de anuidade rende R$ 2,20",
          ]}
        />
      </div>

      <p className="text-ink-subtle mt-8 max-w-xl text-xs leading-relaxed">
        Add-on opcional (não mockado): uma linha final com o que o cartão oferece mas seu perfil não
        aciona — “também tem sala VIP ilimitada, mas seu volume de viagem não usa o valor cheio”.
      </p>
    </div>
  </main>
);
