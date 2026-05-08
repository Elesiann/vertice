import { useEffect, useState, type JSX } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button, Checkbox, Disclosure, Field, Input, Select } from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { fetchCardOptions } from "@/lib/api";
import { ROUTES } from "@/routes";
import { cn } from "@/lib/cn";
import type {
  CardOption,
  ProgramId,
  RedemptionPreference,
  SpendingProfile,
  TravelFrequency,
} from "@/types";

const MILES_PROGRAMS = ["smiles", "latam-pass", "tudoazul"] as const satisfies ProgramId[];

const REDEMPTION_OPTIONS: { value: string; label: string }[] = [
  { value: "any", label: "Sem preferência" },
  { value: "miles:smiles", label: "Milhas Smiles (GOL)" },
  { value: "miles:latam-pass", label: "Milhas Latam Pass" },
  { value: "miles:tudoazul", label: "Milhas TudoAzul" },
  { value: "cashback", label: "Cashback" },
];

const TRAVEL_FREQUENCY_OPTIONS: { value: TravelFrequency; label: string }[] = [
  { value: "none", label: "Não viajo internacional" },
  { value: "occasional", label: "Esporadicamente (≈2 viagens/ano)" },
  { value: "frequent", label: "Frequentemente (5+ viagens/ano)" },
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
  travelFrequency: z.enum(["none", "occasional", "frequent"]),
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
      travelFrequency: "none",
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
      ...(values.travelFrequency !== "none" ? { travelFrequency: values.travelFrequency } : {}),
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
          className="border-line bg-surface-raised space-y-8 rounded-lg border p-6 sm:p-8"
          noValidate
        >
          <header className="space-y-2">
            <h1 className="text-display-3 text-ink">Diga seu gasto</h1>
            <p className="text-ink-muted max-w-2xl text-sm leading-relaxed">
              Preencha os campos para receber uma recomendação objetiva por retorno, liquidez,
              anuidade, simplicidade e acessibilidade.
            </p>
          </header>

          <section className="grid gap-5 md:grid-cols-2">
            <Field label="Gasto doméstico por mês (R$)" error={errors.monthlyDomesticBrl?.message}>
              <Input
                type="number"
                step="100"
                min="0"
                className="tabular"
                {...register("monthlyDomesticBrl")}
              />
            </Field>

            <Field
              label="Gasto internacional por mês (US$)"
              error={errors.monthlyInternationalUsd?.message}
            >
              <Input
                type="number"
                step="10"
                min="0"
                className="tabular"
                {...register("monthlyInternationalUsd")}
              />
            </Field>

            <Field label="Renda mensal (R$) - opcional" error={errors.monthlyIncomeBrl?.message}>
              <Input
                type="number"
                step="500"
                min="0"
                className="tabular"
                {...register("monthlyIncomeBrl")}
              />
            </Field>

            <Field
              label="Quanto você tem disponível para investir? (R$) - opcional"
              error={errors.availableToInvestBrl?.message}
            >
              <Input
                type="number"
                step="1000"
                min="0"
                className="tabular"
                {...register("availableToInvestBrl")}
              />
            </Field>

            <Field label="Como você prefere resgatar?">
              <Select {...register("redemptionRaw")}>
                {REDEMPTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Com que frequência você viaja?"
              hint="Alimenta o cálculo de benefícios de viagem (sala VIP, seguro, bagagem) na recomendação."
            >
              <Select {...register("travelFrequency")}>
                {TRAVEL_FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
          </section>

          <section className="space-y-2">
            <h2 className="text-ink text-sm font-semibold">Cartões que você já tem (opcional)</h2>
            <p className="text-ink-muted text-sm">
              Quando preenchido, comparamos seu stack atual com o recomendado.
            </p>
            <Controller
              control={control}
              name="currentCardIds"
              render={({ field }) => (
                <Disclosure summary={selectedCardsLabel(field.value.length)}>
                  <div className="border-line/50 max-h-64 space-y-1.5 overflow-y-auto border-t px-4 py-3">
                    {cardOptions.map((card) => {
                      const checked = field.value.includes(card.id);
                      return (
                        <label key={card.id} className="text-ink flex items-start gap-2.5 text-sm">
                          <Checkbox
                            className="mt-1"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...field.value, card.id]
                                : field.value.filter((id) => id !== card.id);
                              field.onChange(next);
                            }}
                          />
                          <span>
                            {card.name} <span className="text-ink-subtle">({card.bank})</span>
                          </span>
                        </label>
                      );
                    })}
                    {cardOptions.length === 0 ? (
                      <p
                        className={cn(
                          "rounded-md border px-3 py-2 text-sm",
                          cardOptionsError
                            ? "border-danger/40 bg-danger-soft text-danger"
                            : "border-line/60 bg-surface-raised text-ink-subtle",
                        )}
                      >
                        {cardOptionsError
                          ? "Não foi possível carregar a lista de cartões."
                          : "Carregando cartões..."}
                      </p>
                    ) : null}
                  </div>
                </Disclosure>
              )}
            />
          </section>

          <footer className="border-line/60 flex flex-col-reverse items-start justify-between gap-3 border-t pt-5 sm:flex-row sm:items-center">
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
