import type { JSX } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/context/SessionContext";
import { catalog } from "@/data/catalog";
import { ROUTES } from "@/routes";
import type { ProgramId, RedemptionPreference, SpendingProfile } from "@/types";

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
  redemptionRaw: z.string().min(1, "Selecione uma preferência"),
  currentCardIds: z.array(z.string()),
});

type InputFormValues = z.infer<typeof inputSchema>;

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

export const InputForm = (): JSX.Element => {
  const { setProfile } = useSession();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<InputFormValues>({
    resolver: zodResolver(inputSchema),
    defaultValues: {
      monthlyDomesticBrl: 5000,
      monthlyInternationalUsd: 200,
      monthlyIncomeBrl: undefined,
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
      redemption: parseRedemption(values.redemptionRaw),
      ...(values.currentCardIds.length > 0 ? { currentCardIds: values.currentCardIds } : {}),
    };
    setProfile(profile);
    void navigate(ROUTES.RESULTS);
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(onSubmit)(e);
      }}
      className="mx-auto max-w-2xl space-y-6 p-6"
      noValidate
    >
      <header>
        <h1 className="text-2xl font-semibold text-ink">Diga seu gasto</h1>
        <p className="mt-1 text-ink-muted">
          Com estes campos, calculamos seu stack por perfil. Tudo é local.
        </p>
      </header>

      <div className="space-y-4">
        <div>
          <label htmlFor="brl" className="block text-sm font-medium text-ink">
            Gasto doméstico por mês (R$)
          </label>
          <input
            id="brl"
            type="number"
            step="100"
            min="0"
            aria-invalid={errors.monthlyDomesticBrl ? true : undefined}
            aria-describedby={errors.monthlyDomesticBrl ? "brl-error" : undefined}
            className="mt-1 w-full rounded-md border border-ink-subtle/40 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent aria-[invalid=true]:border-rose-700"
            {...register("monthlyDomesticBrl")}
          />
          {errors.monthlyDomesticBrl ? (
            <p id="brl-error" role="alert" className="mt-1 text-sm text-rose-700">
              {errors.monthlyDomesticBrl.message}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="usd" className="block text-sm font-medium text-ink">
            Gasto internacional por mês (US$)
          </label>
          <input
            id="usd"
            type="number"
            step="10"
            min="0"
            aria-invalid={errors.monthlyInternationalUsd ? true : undefined}
            aria-describedby={errors.monthlyInternationalUsd ? "usd-error" : undefined}
            className="mt-1 w-full rounded-md border border-ink-subtle/40 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent aria-[invalid=true]:border-rose-700"
            {...register("monthlyInternationalUsd")}
          />
          {errors.monthlyInternationalUsd ? (
            <p id="usd-error" role="alert" className="mt-1 text-sm text-rose-700">
              {errors.monthlyInternationalUsd.message}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="income" className="block text-sm font-medium text-ink">
            Renda mensal (R$) — opcional
          </label>
          <input
            id="income"
            type="number"
            step="500"
            min="0"
            aria-invalid={errors.monthlyIncomeBrl ? true : undefined}
            aria-describedby={errors.monthlyIncomeBrl ? "income-error" : undefined}
            className="mt-1 w-full rounded-md border border-ink-subtle/40 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent aria-[invalid=true]:border-rose-700"
            {...register("monthlyIncomeBrl")}
          />
          {errors.monthlyIncomeBrl ? (
            <p id="income-error" role="alert" className="mt-1 text-sm text-rose-700">
              {errors.monthlyIncomeBrl.message}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="redemption" className="block text-sm font-medium text-ink">
            Como você prefere resgatar?
          </label>
          <select
            id="redemption"
            className="mt-1 w-full rounded-md border border-ink-subtle/40 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            {...register("redemptionRaw")}
          >
            {REDEMPTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="block text-sm font-medium text-ink">
            Cartões que você já tem (opcional)
          </span>
          <p className="text-sm text-ink-subtle">
            Quando preenchido, mostramos quanto você está deixando de ganhar.
          </p>
          <Controller
            control={control}
            name="currentCardIds"
            render={({ field }) => (
              <div className="mt-2 space-y-1">
                {catalog.cards.map((card) => {
                  const checked = field.value.includes(card.id);
                  return (
                    <label key={card.id} className="flex items-start gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...field.value, card.id]
                            : field.value.filter((id) => id !== card.id);
                          field.onChange(next);
                        }}
                        className="mt-1"
                      />
                      <span>
                        {card.name} <span className="text-ink-subtle">({card.bank})</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">Ver minha análise →</Button>
      </div>
    </form>
  );
};
