import { z } from "zod";
import type {
  AxisLeaderboard,
  Bank,
  BenefitBreakdown,
  CardBrand,
  CardCatalogResponse,
  CardFxSource,
  CardOption,
  CardTier,
  CardTravelInsuranceLevel,
  CardVerifiedTier,
  LeaderboardAxisId,
  LiquidityLevel,
  ProgramId,
  PublicCardDetail,
  PublicCatalogCard,
  PublicLoungeAccess,
  PublicStackCard,
  Recommendation,
  RecommendationEnvelope,
  RelationshipLevel,
  ScoreBreakdown,
  ScoreCategory,
  ScoreLabBenefit,
  ScoreLabForeignExchangeCost,
  ScoreLabModeledAnnual,
  ScoreLabPotentialAnnual,
  ScoreLabRequirement,
  ScoreLabStack,
  ScoreLabVerdict,
  ScoreLabVerdictKind,
  SolverError,
  SolverErrorCode,
  StackEvaluation,
  TravelTranslation,
} from "@/types";

const finiteNumber = z.number();
const nonNegativeNumber = finiteNumber.min(0);

const stringAs = <T extends string>() =>
  z
    .string()
    .min(1)
    .transform((value) => value as T);

const optionalNonNegative = nonNegativeNumber.optional();

const bankSchema = z.enum([
  "nubank",
  "itau",
  "bradesco",
  "santander",
  "bb",
  "c6",
  "inter",
  "xp",
  "other",
]) satisfies z.ZodType<Bank>;

const programIdSchema = stringAs<ProgramId>();
const relationshipLevelSchema = z.enum([
  "open",
  "checking",
  "investment",
  "private",
]) satisfies z.ZodType<RelationshipLevel>;
const liquidityLevelSchema = z.enum(["high", "medium", "low"]) satisfies z.ZodType<LiquidityLevel>;
const cardBrandSchema = stringAs<CardBrand>();
const cardTierSchema = stringAs<CardTier>();
const cardFxSourceSchema = z.enum([
  "official",
  "secondary",
  "assumption",
  "mixed",
]) satisfies z.ZodType<CardFxSource>;
const cardTravelInsuranceLevelSchema = stringAs<CardTravelInsuranceLevel>();
const cardVerifiedTierSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]) satisfies z.ZodType<CardVerifiedTier>;

const scoreCategorySchema = z.enum([
  "economicReturnCurrent",
  "conditionFit",
  "costSafety",
  "objectiveAlignment",
  "allocationEfficiency",
  "productReliability",
  "dataConfidence",
]) satisfies z.ZodType<ScoreCategory>;

const scoreComponentSchema = z
  .object({
    raw: finiteNumber,
    weight: finiteNumber,
    weighted: finiteNumber,
  })
  .loose();

const zeroScoreBreakdown = (): ScoreBreakdown => ({
  economicReturnCurrent: { raw: 0, weight: 0, weighted: 0 },
  conditionFit: { raw: 0, weight: 0, weighted: 0 },
  costSafety: { raw: 0, weight: 0, weighted: 0 },
  objectiveAlignment: { raw: 0, weight: 0, weighted: 0 },
  allocationEfficiency: { raw: 0, weight: 0, weighted: 0 },
  productReliability: { raw: 0, weight: 0, weighted: 0 },
  dataConfidence: { raw: 0, weight: 0, weighted: 0 },
});

const emptyModeledAnnual = (): ScoreLabModeledAnnual => ({
  earnedPoints: 0,
  welcomeBonusPoints: 0,
  totalPoints: 0,
  grossValueBrl: 0,
  benefitUtilityBrl: 0,
  recurringAnnualFeeBrl: 0,
  internationalCostBrl: 0,
  netReturnBrl: 0,
});

const emptyPotentialAnnual = (): ScoreLabPotentialAnnual => ({
  grossValueBrl: 0,
  benefitUtilityBrl: 0,
  recurringAnnualFeeBrl: 0,
  internationalCostBrl: 0,
  netReturnBrl: 0,
  incrementalNetReturnBrl: 0,
});

const emptyVerdict = (): ScoreLabVerdict => ({
  kind: "viable",
  label: "",
  detail: "",
});

const scoreBreakdownSchema = z
  .object({
    economicReturnCurrent: scoreComponentSchema,
    conditionFit: scoreComponentSchema,
    costSafety: scoreComponentSchema,
    objectiveAlignment: scoreComponentSchema,
    allocationEfficiency: scoreComponentSchema,
    productReliability: scoreComponentSchema,
    dataConfidence: scoreComponentSchema,
  })
  .loose() as unknown as z.ZodType<ScoreBreakdown>;

const benefitComponentValueSchema = z
  .object({
    count: finiteNumber,
    demanded: finiteNumber.optional(),
    unitBrl: finiteNumber,
    totalBrl: finiteNumber,
  })
  .loose();

const benefitBreakdownSchema = z
  .object({
    lounge: benefitComponentValueSchema,
    insurance: benefitComponentValueSchema,
    baggage: benefitComponentValueSchema,
    totalBrl: finiteNumber,
  })
  .loose() as unknown as z.ZodType<BenefitBreakdown>;

const scoreLabModeledAnnualSchema = z
  .object({
    earnedPoints: finiteNumber.default(0),
    welcomeBonusPoints: finiteNumber.default(0),
    totalPoints: finiteNumber.default(0),
    grossValueBrl: finiteNumber.default(0),
    benefitUtilityBrl: finiteNumber.default(0),
    benefitBreakdown: benefitBreakdownSchema.optional(),
    recurringAnnualFeeBrl: finiteNumber.default(0),
    internationalCostBrl: finiteNumber.default(0),
    netReturnBrl: finiteNumber.default(0),
  })
  .loose() as unknown as z.ZodType<ScoreLabModeledAnnual>;

const scoreLabPotentialAnnualSchema = z
  .object({
    grossValueBrl: finiteNumber.default(0),
    benefitUtilityBrl: finiteNumber.default(0),
    benefitBreakdown: benefitBreakdownSchema.optional(),
    recurringAnnualFeeBrl: finiteNumber.default(0),
    internationalCostBrl: finiteNumber.default(0),
    netReturnBrl: finiteNumber.default(0),
    incrementalNetReturnBrl: finiteNumber.default(0),
  })
  .loose() as unknown as z.ZodType<ScoreLabPotentialAnnual>;

const scoreLabRequirementSchema = z
  .object({
    cardId: z.string().default(""),
    kind: z
      .enum([
        "min-investment",
        "min-income",
        "investment-fee-waiver",
        "spend-fee-waiver",
        "welcome-bonus-spend",
      ])
      .default("min-investment"),
    label: z.string().default(""),
    required: finiteNumber.default(0),
    available: finiteNumber.default(0),
    gap: finiteNumber.default(0),
    unit: z.enum(["BRL", "USD", "BRL/month", "BRL/window"]).default("BRL"),
    satisfied: z.boolean().default(false),
    fit: finiteNumber.default(0),
  })
  .loose() as unknown as z.ZodType<ScoreLabRequirement>;

const scoreLabForeignExchangeCostSchema = z
  .object({
    cardId: z.string().default(""),
    annualInternationalSpendBrl: finiteNumber.default(0),
    spreadPercent: finiteNumber.default(0),
    iofRatePercent: finiteNumber.default(0),
    annualCostBrl: finiteNumber.default(0),
    source: cardFxSourceSchema.default("assumption"),
    notes: z.array(z.string()).default([]),
  })
  .loose() as unknown as z.ZodType<ScoreLabForeignExchangeCost>;

const scoreLabBenefitSchema = z
  .object({
    cardId: z.string().default(""),
    kind: z.enum(["annual-fee-waiver", "welcome-bonus"]).default("annual-fee-waiver"),
    label: z.string().default(""),
    valueBrl: finiteNumber.default(0),
    requirement: scoreLabRequirementSchema.optional(),
  })
  .loose() as unknown as z.ZodType<ScoreLabBenefit>;

const scoreLabVerdictKindSchema = z.enum([
  "strong",
  "viable",
  "negative",
]) satisfies z.ZodType<ScoreLabVerdictKind>;

const scoreLabVerdictSchema = z
  .object({
    kind: scoreLabVerdictKindSchema.default("viable"),
    label: z.string().default(""),
    detail: z.string().default(""),
  })
  .loose() as unknown as z.ZodType<ScoreLabVerdict>;

const scoreLabStackSchema = z
  .object({
    stackId: z.string().default(""),
    score: finiteNumber.default(0),
    scoreBreakdown: scoreBreakdownSchema.default(zeroScoreBreakdown),
    modeledAnnual: scoreLabModeledAnnualSchema.default(emptyModeledAnnual),
    potentialAnnual: scoreLabPotentialAnnualSchema.default(emptyPotentialAnnual),
    productReliabilityScore: finiteNumber.default(0),
    requirements: z.array(scoreLabRequirementSchema).default([]),
    foreignExchangeCosts: z.array(scoreLabForeignExchangeCostSchema).default([]),
    benefitsApplied: z.array(scoreLabBenefitSchema).default([]),
    benefitsNotApplied: z.array(scoreLabBenefitSchema).default([]),
    reasons: z.array(z.string()).default([]),
    verdict: scoreLabVerdictSchema.default(emptyVerdict),
    breakEvenMonthlySpendBrl: finiteNumber.nullable().default(null),
    roiMultiple: finiteNumber.nullable().default(null),
  })
  .loose() as unknown as z.ZodType<ScoreLabStack>;

const publicStackCardSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    imagePath: z.string().optional(),
    bank: bankSchema.default("other"),
    pointsProgram: programIdSchema.default("cashback" as ProgramId),
    requiresRelationship: relationshipLevelSchema.optional(),
    minInvestmentBrl: optionalNonNegative,
    minInvestmentUsd: optionalNonNegative,
    investmentFeeWaiverBrl: optionalNonNegative,
    requiredInvestmentBrl: optionalNonNegative,
    requiredInvestmentUsd: optionalNonNegative,
  })
  .loose() as unknown as z.ZodType<PublicStackCard>;

const cardAllocationSchema = z
  .object({
    cardId: z.string().min(1),
    monthlyDomesticBrl: finiteNumber.default(0),
    monthlyInternationalUsd: finiteNumber.default(0),
  })
  .loose();

const stackEvaluationSchema = z.lazy(() =>
  z
    .object({
      cards: z.array(publicStackCardSchema).min(1),
      allocation: z.array(cardAllocationSchema).default([]),
      liquidity: liquidityLevelSchema.default("medium"),
      yearOneAnnualFeeBrl: finiteNumber.optional(),
      yearOneWelcomeBonusPoints: finiteNumber.default(0),
      yearOneEarnedPoints: finiteNumber.default(0),
      yearOneTotalPoints: finiteNumber.default(0),
      yearOneTotalValueBrl: finiteNumber.optional(),
      yearOneNetValueBrl: finiteNumber,
      warnings: z.array(z.string()).default([]),
      confidence: z.enum(["high", "medium", "low"]).default("medium"),
      scoreLab: scoreLabStackSchema.optional(),
    })
    .loose()
    .transform((stack) => {
      const modeledAnnual = stack.scoreLab?.modeledAnnual;
      return {
        ...stack,
        yearOneAnnualFeeBrl: stack.yearOneAnnualFeeBrl ?? modeledAnnual?.recurringAnnualFeeBrl ?? 0,
        yearOneTotalValueBrl: stack.yearOneTotalValueBrl ?? modeledAnnual?.grossValueBrl ?? 0,
        yearOneWelcomeBonusPoints: stack.yearOneWelcomeBonusPoints,
        yearOneEarnedPoints: stack.yearOneEarnedPoints,
        yearOneTotalPoints: stack.yearOneTotalPoints,
      };
    }),
) as unknown as z.ZodType<StackEvaluation>;

const axisLeaderboardSchema = z
  .object({
    axisId: scoreCategorySchema
      .or(z.enum(["net-return", "liquidity", "annual-fee", "simplicity", "accessibility"]))
      .transform((value) => value as LeaderboardAxisId)
      .default("net-return"),
    title: z.string().default(""),
    stacks: z.array(stackEvaluationSchema).default([]),
  })
  .loose() as unknown as z.ZodType<AxisLeaderboard>;

const travelTranslationSchema = z
  .object({
    kind: z.enum(["cashback", "value", "redemption"]),
  })
  .loose()
  .transform((value) => value as TravelTranslation) as unknown as z.ZodType<TravelTranslation>;

const scoreLabDecisionTracksSchema = z.lazy(() =>
  z
    .object({
      recommendedNow: stackEvaluationSchema.nullable().optional(),
      actionable: stackEvaluationSchema.nullable(),
      nearUnlock: stackEvaluationSchema.nullable(),
      stretch: stackEvaluationSchema.nullable(),
      conditionalUpside: stackEvaluationSchema,
      closestActionableSubstitute: z
        .object({
          stack: stackEvaluationSchema,
          similarity: finiteNumber.default(0),
          reasons: z.array(z.string()).default([]),
        })
        .loose()
        .nullable(),
      noRecommendationReason: z
        .enum(["no-positive-actionable-return", "insufficient-access-data"])
        .optional(),
    })
    .loose(),
);

const recommendationSchema = z.lazy(() =>
  z
    .object({
      topStack: stackEvaluationSchema,
      alternatives: z.array(stackEvaluationSchema).default([]),
      leaderboardsByAxis: z.array(axisLeaderboardSchema).default([]),
      isReturnDecisionTight: z.boolean().default(false),
      currentStack: stackEvaluationSchema.optional(),
      moneyOnTheTableBrl: finiteNumber.optional(),
      travelTranslation: travelTranslationSchema,
      shoutout: z.string().default(""),
      scoreLab: z
        .object({
          scenarioId: z.string().default(""),
          preference: z.enum(["any", "cashback", "miles"]).default("any"),
          ptaxRate: finiteNumber.default(0),
          ptaxSource: z.enum(["awesomeapi", "fallback", "manual"]).default("fallback"),
          ptaxFetchedAt: z.string().default(""),
          scoreLabVersion: z.string().default(""),
          evaluatedStacks: finiteNumber.default(0),
          netReturnLeaderDiffers: z.boolean().default(false),
          netReturnLeader: stackEvaluationSchema,
          institutionalAlternative: z
            .object({
              stack: stackEvaluationSchema,
              score: finiteNumber.default(0),
              netReturnBrl: finiteNumber.default(0),
              netReturnDeltaBrl: finiteNumber.default(0),
              scoreDelta: finiteNumber.default(0),
              reason: z.string().default(""),
            })
            .loose()
            .optional(),
          decisionTracks: scoreLabDecisionTracksSchema.optional(),
          nearUnlocks: z.array(stackEvaluationSchema).default([]),
          singleCardNetReturnByCardId: z.record(z.string(), finiteNumber).optional(),
          notes: z.array(z.string()).default([]),
        })
        .loose()
        .optional(),
    })
    .loose(),
) as unknown as z.ZodType<Recommendation>;

const solverErrorSchema = z
  .object({
    code: stringAs<SolverErrorCode>(),
    message: z.string().min(1),
  })
  .loose() as unknown as z.ZodType<SolverError>;

const recommendationSuccessResponseSchema = z
  .object({
    ok: z.literal(true),
    data: recommendationSchema,
    catalogVersion: z.string().min(1),
    solverVersion: z.string().min(1),
  })
  .loose()
  .transform((body): { ok: true; envelope: RecommendationEnvelope } => ({
    ok: true,
    envelope: {
      recommendation: body.data,
      catalogVersion: body.catalogVersion,
      solverVersion: body.solverVersion,
    },
  }));

const recommendationErrorResponseSchema = z
  .object({
    ok: z.literal(false),
    error: solverErrorSchema,
  })
  .loose();

export const recommendationResponseSchema = z.union([
  recommendationSuccessResponseSchema,
  recommendationErrorResponseSchema,
]);

export const cardOptionSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    imagePath: z.string().optional(),
    bank: bankSchema,
    minInvestmentBrl: optionalNonNegative,
    minInvestmentUsd: optionalNonNegative,
    investmentFeeWaiverBrl: optionalNonNegative,
    requiredInvestmentBrl: optionalNonNegative,
    requiredInvestmentUsd: optionalNonNegative,
  })
  .loose() as unknown as z.ZodType<CardOption>;

export const cardsOptionsResponseSchema = z
  .object({
    cards: z.array(cardOptionSchema),
    catalogVersion: z.string().min(1),
  })
  .loose();

export const publicCatalogCardSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    imagePath: z.string().optional(),
    bank: bankSchema,
    brand: cardBrandSchema,
    tier: cardTierSchema,
    pointsProgram: programIdSchema,
    annualFeeBrl: nonNegativeNumber,
    annualFeeWaiverThresholdBrl: optionalNonNegative,
    firstYearAnnualFeeBrl: optionalNonNegative,
    investmentFeeWaiverBrl: optionalNonNegative,
    minInvestmentBrl: optionalNonNegative,
    minInvestmentUsd: optionalNonNegative,
    requiredInvestmentBrl: optionalNonNegative,
    requiredInvestmentUsd: optionalNonNegative,
    requiresRelationship: relationshipLevelSchema.optional(),
    hasLoungeAccess: z.boolean(),
    hasTravelInsurance: z.boolean(),
    hasFreeCheckedBaggage: z.boolean(),
    hasZeroIof: z.boolean(),
    hasInvestback: z.boolean().optional(),
    cashbackRatePercent: optionalNonNegative,
    pointsPerUsdDomestic: optionalNonNegative,
    pointsPerUsdInternational: optionalNonNegative,
  })
  .loose() as unknown as z.ZodType<PublicCatalogCard>;

const publicLoungeAccessSchema = z
  .object({
    unlimited: z.boolean().optional(),
    visitsPerYear: nonNegativeNumber.optional(),
    conditional: z.boolean().optional(),
    conditionalMonthlySpendBrl: nonNegativeNumber.optional(),
    providers: z.array(z.string()).default([]),
  })
  .loose() as unknown as z.ZodType<PublicLoungeAccess>;

export const publicCardDetailSchema = publicCatalogCardSchema
  .and(
    z
      .object({
        loungeAccess: publicLoungeAccessSchema.optional(),
        travelInsuranceLevel: cardTravelInsuranceLevelSchema.optional(),
        freeCheckedBaggage: z.boolean().optional(),
        foreignExchangeCostSource: cardFxSourceSchema.optional(),
        foreignExchangeSpreadPercent: optionalNonNegative,
        pointsExpirationMonths: nonNegativeNumber.optional(),
        welcomeBonusPoints: nonNegativeNumber.optional(),
        benefits: z
          .array(
            z
              .object({
                kind: z.string().min(1),
                label: z.string().min(1),
              })
              .loose(),
          )
          .optional(),
        verifiedTier: cardVerifiedTierSchema.optional(),
        lastVerified: z.string().optional(),
      })
      .loose(),
  )
  .transform((value) => value as PublicCardDetail) as unknown as z.ZodType<PublicCardDetail>;

const catalogFiltersSchema = z
  .object({
    bank: z.string().optional(),
    tier: z.string().optional(),
    brand: z.string().optional(),
    hasLounge: z.boolean().optional(),
    hasCashback: z.boolean().optional(),
    hasInvestback: z.boolean().optional(),
    requiresRelationship: z.array(z.enum(["open", "checking", "investment"])).optional(),
    minAnnualFee: nonNegativeNumber.optional(),
    maxAnnualFee: nonNegativeNumber.optional(),
    search: z.string().optional(),
  })
  .loose();

export const cardCatalogResponseSchema = z
  .object({
    cards: z.array(publicCatalogCardSchema),
    catalogVersion: z.string().min(1),
    count: z.number().int().min(0),
    filters: catalogFiltersSchema.default({}),
  })
  .loose() as unknown as z.ZodType<CardCatalogResponse>;
