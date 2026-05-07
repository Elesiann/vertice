import { useEffect, useState, type JSX } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/context/SessionContext";
import { fetchCardOptions } from "@/lib/api";
import { ROUTES } from "@/routes";
import type { CardOption, ProgramId, RedemptionPreference, SpendingProfile } from "@/types";

const MILES_PROGRAMS = ["smiles", "latam-pass", "tudoazul"] as const satisfies ProgramId[];

const REDEMPTION_OPTIONS: { value: string; label: string }[] = [
  { value: "any", label: "Sem preferência" },
  { value: "miles:smiles", label: "Milhas Smiles (GOL)" },
  { value: "miles:latam-pass", label: "Milhas Latam Pass" },
  { value: "miles:tudoazul", label: "Milhas TudoAzul" },
  { value: "cashback", label: "Cashback" },
];

const inputSchema = z.object({
  monthlyDomesticBrl: z.coerce.number().min(0, "Não pode ser negativo"),
  monthlyInternationalUsd: z.coerce.number().min(0, "Não pode ser negativo"),
  monthlyIncomeBrl: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
    z.number().min(0, "Não pode ser negativo").optional(),
  ),
  availableToInvestBrl: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
    z.number().min(0, "Não pode ser negativo").optional(),
  ),
  redemptionRaw: z.string().min(1, "Selecione uma preferência"),
  currentCardIds: z.array(z.string()),
});

type InputFormInput = z.input<typeof inputSchema>;
type InputFormValues = z.output<typeof inputSchema>;

const isMilesProgram = (value: string): value is (typeof MILES_PROGRAMS)[number] =>
  (MILES_PROGRAMS as readonly string[]).includes(value);

const parseRedemption = (raw: string): RedemptionPreference => {
  if (raw === "cashback") return { kind: "cashback" };
  if (raw.startsWith("miles:")) {
    const program = raw.slice("miles:".length);
    if (isMilesProgram(program)) return { kind: "miles", program };
  }
  return { kind: "any" };
};

const selectedCardsLabel = (selectedCount: number): string =>
  selectedCount > 0
    ? `${String(selectedCount)} cartão${selectedCount > 1 ? "ões" : ""} selecionado${selectedCount > 1 ? "s" : ""}`
    : "Selecionar cartões";

export const InputForm = (): JSX.Element => {
  const { setProfile } = useSession();
  const navigate = useNavigate();
  const [cardOptions, setCardOptions] = useState<CardOption[]>([]);
  const [cardOptionsError, setCardOptionsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchCardOptions()
      .then((cards) => {
        if (cancelled) return;
        setCardOptions(cards);
        setCardOptionsError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCardOptions([]);
        setCardOptionsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<InputFormInput, unknown, InputFormValues>({
    resolver: zodResolver(inputSchema),
    defaultValues: {
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      redemptionRaw: "any",
      currentCardIds: [],
    },
  });

  const onSubmit = (values: InputFormValues): void => {
    const profile: SpendingProfile = {
      monthlyDomesticBrl: values.monthlyDomesticBrl,
      monthlyInternationalUsd: values.monthlyInternationalUsd,
      ...(values.monthlyIncomeBrl !== undefined
        ? { monthlyIncomeBrl: values.monthlyIncomeBrl }
        : {}),
      ...(values.availableToInvestBrl !== undefined
        ? { availableToInvestBrl: values.availableToInvestBrl }
        : {}),
      redemption: parseRedemption(values.redemptionRaw),
      ...(values.currentCardIds.length > 0 ? { currentCardIds: values.currentCardIds } : {}),
    };
    setProfile(profile);
    void navigate(ROUTES.RESULTS);
  };

  return (
    <main className="app-shell">
      <div className="app-container max-w-4xl">
        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          className="panel space-y-8 p-6 sm:p-8"
          noValidate
        >
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-[-0.01em] text-ink">Diga seu gasto</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
              Preencha os campos para receber uma recomendação objetiva por retorno, liquidez,
              anuidade, simplicidade e acessibilidade.
            </p>
          </header>

          <section className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="brl" className="field-label">
                Gasto doméstico por mês (R$)
              </label>
              <input
                id="brl"
                type="number"
                step="100"
                min="0"
                aria-invalid={errors.monthlyDomesticBrl ? true : undefined}
                aria-describedby={errors.monthlyDomesticBrl ? "brl-error" : undefined}
                className="field-control tabular"
                {...register("monthlyDomesticBrl")}
              />
              {errors.monthlyDomesticBrl ? (
                <p id="brl-error" role="alert" className="mt-1.5 text-sm text-rose-700">
                  {errors.monthlyDomesticBrl.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="usd" className="field-label">
                Gasto internacional por mês (US$)
              </label>
              <input
                id="usd"
                type="number"
                step="10"
                min="0"
                aria-invalid={errors.monthlyInternationalUsd ? true : undefined}
                aria-describedby={errors.monthlyInternationalUsd ? "usd-error" : undefined}
                className="field-control tabular"
                {...register("monthlyInternationalUsd")}
              />
              {errors.monthlyInternationalUsd ? (
                <p id="usd-error" role="alert" className="mt-1.5 text-sm text-rose-700">
                  {errors.monthlyInternationalUsd.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="income" className="field-label">
                Renda mensal (R$) - opcional
              </label>
              <input
                id="income"
                type="number"
                step="500"
                min="0"
                aria-invalid={errors.monthlyIncomeBrl ? true : undefined}
                aria-describedby={errors.monthlyIncomeBrl ? "income-error" : undefined}
                className="field-control tabular"
                {...register("monthlyIncomeBrl")}
              />
              {errors.monthlyIncomeBrl ? (
                <p id="income-error" role="alert" className="mt-1.5 text-sm text-rose-700">
                  {errors.monthlyIncomeBrl.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="available-investment" className="field-label">
                Quanto você tem disponível para investir? (R$) - opcional
              </label>
              <input
                id="available-investment"
                type="number"
                step="1000"
                min="0"
                aria-invalid={errors.availableToInvestBrl ? true : undefined}
                aria-describedby={
                  errors.availableToInvestBrl ? "available-investment-error" : undefined
                }
                className="field-control tabular"
                {...register("availableToInvestBrl")}
              />
              {errors.availableToInvestBrl ? (
                <p
                  id="available-investment-error"
                  role="alert"
                  className="mt-1.5 text-sm text-rose-700"
                >
                  {errors.availableToInvestBrl.message}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="redemption" className="field-label">
                Como você prefere resgatar?
              </label>
              <select id="redemption" className="field-control" {...register("redemptionRaw")}>
                {REDEMPTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="space-y-2">
            <span className="field-label">Cartões que você já tem (opcional)</span>
            <p className="text-sm text-ink-muted">
              Quando preenchido, comparamos seu stack atual com o recomendado.
            </p>
            <Controller
              control={control}
              name="currentCardIds"
              render={({ field }) => (
                <details className="panel-muted">
                  <summary className="details-summary px-4 py-3">
                    {selectedCardsLabel(field.value.length)}
                  </summary>
                  <div className="max-h-64 space-y-1.5 overflow-y-auto border-t border-line/50 px-4 py-3">
                    {cardOptions.map((card) => {
                      const checked = field.value.includes(card.id);
                      return (
                        <label key={card.id} className="flex items-start gap-2.5 text-sm text-ink">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...field.value, card.id]
                                : field.value.filter((id) => id !== card.id);
                              field.onChange(next);
                            }}
                            className="mt-1 rounded border-line text-accent focus:ring-accent"
                          />
                          <span>
                            {card.name} <span className="text-ink-subtle">({card.bank})</span>
                          </span>
                        </label>
                      );
                    })}
                    {cardOptions.length === 0 ? (
                      <p
                        className={`rounded-md border px-3 py-2 text-sm ${cardOptionsError ? "border-rose-300 bg-rose-50/80 text-rose-800" : "border-line/60 bg-surface-raised text-ink-subtle"}`}
                      >
                        {cardOptionsError
                          ? "Não foi possível carregar a lista de cartões."
                          : "Carregando cartões..."}
                      </p>
                    ) : null}
                  </div>
                </details>
              )}
            />
          </section>

          <footer className="flex flex-col-reverse items-start justify-between gap-3 border-t border-line/60 pt-5 sm:flex-row sm:items-center">
            <Link to={ROUTES.HOME} className="plain-link">
              Voltar para a home
            </Link>
            <Button type="submit">Ver análise</Button>
          </footer>
        </form>
      </div>
    </main>
  );
};
