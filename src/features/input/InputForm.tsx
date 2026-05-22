import { useEffect, useState, type JSX, type ReactNode } from "react";
import { useForm, Controller, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { m } from "framer-motion";
import { z } from "zod";
import {
  Button,
  Field,
  Input,
  RevealBlock,
  RevealGroup,
  Select,
  revealItemVariants,
} from "@/components/ui";
import { useSession } from "@/context/SessionContext";
import { clearRecommendationCache } from "@/hooks/useRecommendation";
import { fetchCardOptions } from "@/lib/api";
import { ROUTES } from "@/routes";
import { CardCombobox } from "@/features/input/CardCombobox";
import { CurrentCardsAnnualFeeList } from "@/features/input/CurrentCardsAnnualFeeList";
import type { CardOption, ProgramId, RedemptionPreference, SpendingProfile } from "@/types";

const MAX_CURRENT_CARDS = 4;

const MILES_PROGRAMS = ["smiles", "latam-pass", "tudoazul"] as const satisfies ProgramId[];

const REDEMPTION_OPTIONS: { value: string; label: string }[] = [
  { value: "any", label: "Sem preferência" },
  { value: "miles:smiles", label: "Milhas Smiles (GOL)" },
  { value: "miles:latam-pass", label: "Milhas Latam Pass" },
  { value: "miles:tudoazul", label: "Milhas TudoAzul" },
  { value: "cashback", label: "Cashback" },
];

const inputSchema = z.object({
  monthlyDomesticBrl: z.coerce.number().min(0, "O valor não pode ser negativo."),
  monthlyIncomeBrl: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
    z.number().min(0, "O valor não pode ser negativo.").optional(),
  ),
  availableToInvestBrl: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
    z.number().min(0, "O valor não pode ser negativo.").optional(),
  ),
  redemptionRaw: z.string().min(1, "Selecione uma preferência."),
  tripsPerYear: z.coerce.number().int().min(0).max(50),
  currentCardIds: z
    .array(z.string())
    .max(MAX_CURRENT_CARDS, `Selecione no máximo ${String(MAX_CURRENT_CARDS)} cartões.`),
  currentCardAnnualFee: z.record(z.string(), z.boolean()),
});

type InputFormInput = z.input<typeof inputSchema>;
type InputFormValues = z.output<typeof inputSchema>;

const FORM_DEFAULTS: Partial<InputFormInput> = {
  monthlyDomesticBrl: 5000,
  redemptionRaw: "any",
  tripsPerYear: 0,
  currentCardIds: [],
  currentCardAnnualFee: {},
};

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

const redemptionToRaw = (preference: RedemptionPreference): string => {
  if (preference.kind === "cashback") return "cashback";
  if (preference.kind === "miles") return `miles:${preference.program}`;
  return "any";
};

const profileToFormDefaults = (profile: SpendingProfile | null): Partial<InputFormInput> => {
  if (profile === null) return FORM_DEFAULTS;
  return {
    monthlyDomesticBrl: profile.monthlyDomesticBrl,
    ...(profile.monthlyIncomeBrl !== undefined
      ? { monthlyIncomeBrl: profile.monthlyIncomeBrl }
      : {}),
    ...(profile.availableToInvestBrl !== undefined
      ? { availableToInvestBrl: profile.availableToInvestBrl }
      : {}),
    redemptionRaw: redemptionToRaw(profile.redemption),
    tripsPerYear: profile.tripsPerYear ?? 0,
    currentCardIds: profile.currentCardIds ?? [],
    currentCardAnnualFee: profile.currentCardAnnualFee ?? {},
  };
};

const formatRelative = (savedAt: string, now: number = Date.now()): string => {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return "agora";
  const diffMs = Math.max(0, now - date.getTime());
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "agora há pouco";
  if (minutes < 60) return `há ${String(minutes)} minuto${minutes > 1 ? "s" : ""}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${String(hours)} hora${hours > 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${String(days)} dia${days > 1 ? "s" : ""}`;
  return date.toLocaleDateString("pt-BR");
};

interface FieldGroupProps {
  index: string;
  title: string;
  hint?: string;
  columns?: 1 | 2 | 3;
  children: ReactNode;
}

const MobileBackLink = (): JSX.Element => (
  <Link
    to={ROUTES.HOME}
    aria-label="Voltar para a home"
    className="border-line text-ink-muted hover:border-line-strong hover:text-accent focus-visible:ring-accent inline-flex size-8 shrink-0 items-center justify-center rounded-md border transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:hidden"
  >
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </Link>
);

const FieldGroup = ({
  index,
  title,
  hint,
  columns = 2,
  children,
}: FieldGroupProps): JSX.Element => {
  const colsClass = columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "";
  return (
    <m.section className="mt-10 first:mt-0 sm:mt-12" variants={revealItemVariants}>
      <header className="mb-4 flex items-baseline gap-3">
        <span className="text-num text-ink-subtle hidden text-base sm:inline">{index}</span>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h2 className="text-heading text-ink">{title}</h2>
          {hint !== undefined ? (
            <p className="text-ink-muted text-sm leading-relaxed">{hint}</p>
          ) : null}
        </div>
      </header>
      <div className={`grid gap-3 ${colsClass}`.trim()}>{children}</div>
    </m.section>
  );
};

interface CurrentCardsAnnualFeeListFieldProps {
  control: Control<InputFormInput>;
  options: CardOption[];
}

const CurrentCardsAnnualFeeListField = ({
  control,
  options,
}: CurrentCardsAnnualFeeListFieldProps): JSX.Element | null => {
  const selectedIds = useWatch({ control, name: "currentCardIds" });
  if (selectedIds.length === 0) return null;
  return (
    <Controller
      control={control}
      name="currentCardAnnualFee"
      render={({ field }) => (
        <CurrentCardsAnnualFeeList
          selectedIds={selectedIds}
          options={options}
          value={field.value}
          onChange={field.onChange}
        />
      )}
    />
  );
};

export const InputForm = (): JSX.Element => {
  const { profile, setProfile, profileSavedAt, reset: sessionReset } = useSession();
  const navigate = useNavigate();
  const [cardOptions, setCardOptions] = useState<CardOption[]>([]);
  const [cardOptionsLoading, setCardOptionsLoading] = useState(true);
  const [cardOptionsError, setCardOptionsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCardOptionsLoading(true);
    void fetchCardOptions()
      .then((cards) => {
        if (cancelled) return;
        setCardOptions(cards);
        setCardOptionsError(false);
        setCardOptionsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCardOptions([]);
        setCardOptionsError(true);
        setCardOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    register,
    handleSubmit,
    control,
    reset: resetForm,
    formState: { errors },
  } = useForm<InputFormInput, unknown, InputFormValues>({
    resolver: zodResolver(inputSchema),
    defaultValues: profileToFormDefaults(profile),
  });

  const onSubmit = (values: InputFormValues): void => {
    const next: SpendingProfile = {
      monthlyDomesticBrl: values.monthlyDomesticBrl,
      monthlyInternationalUsd: 0,
      ...(values.monthlyIncomeBrl !== undefined
        ? { monthlyIncomeBrl: values.monthlyIncomeBrl }
        : {}),
      ...(values.availableToInvestBrl !== undefined
        ? { availableToInvestBrl: values.availableToInvestBrl }
        : {}),
      redemption: parseRedemption(values.redemptionRaw),
      ...(values.tripsPerYear > 0 ? { tripsPerYear: values.tripsPerYear } : {}),
      ...(values.currentCardIds.length > 0 ? { currentCardIds: values.currentCardIds } : {}),
      ...(values.currentCardIds.length > 0
        ? {
            currentCardAnnualFee: Object.fromEntries(
              values.currentCardIds
                .filter((id) => {
                  const card = cardOptions.find((o) => o.id === id);
                  return card !== undefined && card.annualFeeBrl > 0;
                })
                .map((id) => [id, values.currentCardAnnualFee[id] !== false]),
            ),
          }
        : {}),
    };
    setProfile(next);
    void navigate(ROUTES.RESULTS);
  };

  const onClearSavedProfile = (): void => {
    sessionReset();
    clearRecommendationCache();
    resetForm(FORM_DEFAULTS);
  };

  return (
    <main className="bg-surface min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-8 sm:pt-10">
        <form
          onSubmit={(e) => {
            void handleSubmit(onSubmit)(e);
          }}
          noValidate
        >
          <RevealGroup>
            {profileSavedAt !== null ? (
              <RevealBlock className="border-line flex items-center gap-3 border-b pb-4">
                <MobileBackLink />
                <div className="flex flex-1 flex-wrap items-center justify-between gap-2">
                  <p className="text-ink-muted text-sm">
                    <span className="text-caption text-ink-subtle mr-2">Última edição</span>
                    <span className="text-ink font-medium">{formatRelative(profileSavedAt)}</span>
                  </p>
                  <button
                    type="button"
                    onClick={onClearSavedProfile}
                    className="text-ink-muted hover:text-accent focus-visible:ring-accent cursor-pointer text-xs font-semibold tracking-wide uppercase transition focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    Limpar
                  </button>
                </div>
              </RevealBlock>
            ) : (
              <RevealBlock>
                <MobileBackLink />
              </RevealBlock>
            )}

            <RevealBlock>
              <header className="mt-6 mb-8 flex flex-col gap-2 sm:mt-8 sm:mb-6">
                <h1 className="text-display-3 text-ink">Vamos calcular.</h1>
                <p className="text-ink-muted max-w-xl text-sm leading-relaxed">
                  O cálculo considera anuidade, retorno por programa, benefícios de viagem e encaixe
                  das condições com seu perfil.
                </p>
              </header>
            </RevealBlock>

            <div className="flex flex-col">
              <FieldGroup index="01" title="Perfil financeiro" columns={3}>
                <Field label="Gasto mensal (R$)" error={errors.monthlyDomesticBrl?.message}>
                  <Input
                    type="number"
                    step="100"
                    min="0"
                    inputMode="numeric"
                    placeholder="5000"
                    className="tabular"
                    {...register("monthlyDomesticBrl")}
                  />
                </Field>

                <Field
                  label={
                    <>
                      Renda mensal (R$){" "}
                      <span className="text-ink-subtle text-xs font-normal">(opcional)</span>
                    </>
                  }
                  error={errors.monthlyIncomeBrl?.message}
                >
                  <Input
                    type="number"
                    step="500"
                    min="0"
                    inputMode="numeric"
                    placeholder="12000"
                    className="tabular"
                    {...register("monthlyIncomeBrl")}
                  />
                </Field>

                <Field
                  label={
                    <>
                      Investimentos
                      <span className="text-ink-subtle text-xs font-normal"> (opcional)</span>
                    </>
                  }
                  hint="Valor que você poderia manter investido no banco para eventual isenção de anuidade."
                  error={errors.availableToInvestBrl?.message}
                >
                  <Input
                    type="number"
                    step="1000"
                    min="0"
                    inputMode="numeric"
                    placeholder="50000"
                    className="tabular"
                    {...register("availableToInvestBrl")}
                  />
                </Field>
              </FieldGroup>

              <FieldGroup index="02" title="Preferências">
                <Field label="Forma de resgate preferida">
                  <Select {...register("redemptionRaw")}>
                    {REDEMPTION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="Quantas viagens internacionais por ano?"
                  hint="Conta cada ida e volta como uma viagem. Vazio ou zero = não viaja."
                  error={errors.tripsPerYear?.message}
                >
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    inputMode="numeric"
                    placeholder="0"
                    className="tabular"
                    {...register("tripsPerYear")}
                  />
                </Field>
              </FieldGroup>

              <FieldGroup
                index="03"
                title="Cartões atuais"
                hint={`Quando preenchido, o Vértice compara seu setup atual com a recomendação. Até ${String(MAX_CURRENT_CARDS)} cartões.`}
                columns={1}
              >
                <Controller
                  control={control}
                  name="currentCardIds"
                  render={({ field }) => (
                    <CardCombobox
                      options={cardOptions}
                      value={field.value}
                      onChange={(next) => {
                        field.onChange(next.slice(0, MAX_CURRENT_CARDS));
                      }}
                      loading={cardOptionsLoading}
                      error={cardOptionsError}
                      maxSelection={MAX_CURRENT_CARDS}
                    />
                  )}
                />
                <CurrentCardsAnnualFeeListField control={control} options={cardOptions} />
              </FieldGroup>
            </div>

            <RevealBlock>
              <footer className="border-line mt-6 flex flex-col-reverse justify-between gap-4 border-t pt-6 sm:mt-6 sm:flex-row sm:items-center">
                <div className="flex max-w-md flex-col gap-2">
                  <Link to={ROUTES.HOME} className="plain-link hidden sm:inline">
                    ← Voltar para a home
                  </Link>
                </div>
                <Button type="submit" size="lg" className="w-full cursor-pointer sm:w-auto">
                  Calcular meu cartão →
                </Button>
              </footer>
            </RevealBlock>
          </RevealGroup>
        </form>
      </div>
    </main>
  );
};
