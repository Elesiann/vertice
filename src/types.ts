export type Bank =
  | "nubank"
  | "itau"
  | "bradesco"
  | "santander"
  | "bb"
  | "c6"
  | "inter"
  | "xp"
  | "other";

export type ProgramId =
  | "smiles"
  | "latam-pass"
  | "tudoazul"
  | "livelo"
  | "esfera"
  | "cashback"
  | "inter-loop"
  | "uau-caixa"
  | "atomos"
  | "btg-points"
  | "aadvantage"
  | "tap-miles-and-go"
  | "pao-de-acucar-mais"
  | "cresol-pontos"
  | "coopera"
  | "sisprime-pontos"
  | "unicred-unico"
  | "safra-rewards"
  | "porto-plus"
  | "nomad-pass"
  | "revpoints"
  | "iberia-club"
  | "ba-club"
  | "qatar-privilege-club"
  | "turkish-miles-smiles"
  | "finnair-plus"
  | "aer-lingus-aerclub"
  | "vueling-club"
  | "flying-blue"
  | "etihad-guest";

export type RelationshipLevel = "open" | "checking" | "investment" | "private";
export type LiquidityLevel = "high" | "medium" | "low";

export interface CardOption {
  id: string;
  name: string;
  bank: Bank;
  minInvestmentBrl?: number;
  minInvestmentUsd?: number;
  investmentFeeWaiverBrl?: number;
  requiredInvestmentBrl?: number;
  requiredInvestmentUsd?: number;
}

export type RedemptionPreference =
  | { kind: "miles"; program: ProgramId }
  | { kind: "cashback" }
  | { kind: "any" };

export interface SpendingProfile {
  monthlyDomesticBrl: number;
  monthlyInternationalUsd: number;
  monthlyIncomeBrl?: number;
  availableToInvestBrl?: number;
  redemption: RedemptionPreference;
  currentCardIds?: string[];
  tripsPerYear?: number;
}

export interface CardAllocation {
  cardId: string;
  monthlyDomesticBrl: number;
  monthlyInternationalUsd: number;
}

export interface PublicStackCard {
  id: string;
  name: string;
  bank: Bank;
  pointsProgram: ProgramId;
  requiresRelationship?: RelationshipLevel;
  minInvestmentBrl?: number;
  minInvestmentUsd?: number;
  investmentFeeWaiverBrl?: number;
  requiredInvestmentBrl?: number;
  requiredInvestmentUsd?: number;
}

export interface StackEvaluation {
  cards: PublicStackCard[];
  allocation: CardAllocation[];
  liquidity: LiquidityLevel;
  yearOneAnnualFeeBrl: number;
  yearOneWelcomeBonusPoints: number;
  yearOneEarnedPoints: number;
  yearOneTotalPoints: number;
  yearOneTotalValueBrl: number;
  yearOneNetValueBrl: number;
  warnings: string[];
  confidence: "high" | "medium" | "low";
  scoreLab?: ScoreLabStack;
}

export type ScoreCategory =
  | "economicReturnCurrent"
  | "conditionFit"
  | "costSafety"
  | "objectiveAlignment"
  | "allocationEfficiency"
  | "productReliability"
  | "dataConfidence";

export interface ScoreComponent {
  raw: number;
  weight: number;
  weighted: number;
}

export type ScoreBreakdown = Record<ScoreCategory, ScoreComponent>;

// Per-component benefit breakdown. Mirrors the API's ScoreLabBenefitBreakdown.
export interface BenefitComponentValue {
  count: number; // visits applied (lounge) or trips applied (insurance/baggage); 0 when component contributes nothing
  unitBrl: number; // R$ per visit/trip — lounge: 200; insurance: card-level value; baggage: 200
  totalBrl: number; // count * unitBrl, rounded
}
export interface BenefitBreakdown {
  lounge: BenefitComponentValue;
  insurance: BenefitComponentValue;
  baggage: BenefitComponentValue;
  totalBrl: number;
}

export interface ScoreLabModeledAnnual {
  earnedPoints: number;
  welcomeBonusPoints: number;
  totalPoints: number;
  grossValueBrl: number;
  benefitUtilityBrl: number;
  benefitBreakdown?: BenefitBreakdown;
  recurringAnnualFeeBrl: number;
  internationalCostBrl: number;
  netReturnBrl: number;
}

export interface ScoreLabPotentialAnnual {
  grossValueBrl: number;
  benefitUtilityBrl: number;
  benefitBreakdown?: BenefitBreakdown;
  recurringAnnualFeeBrl: number;
  internationalCostBrl: number;
  netReturnBrl: number;
  incrementalNetReturnBrl: number;
}

export interface ScoreLabRequirement {
  cardId: string;
  kind:
    | "min-investment"
    | "min-income"
    | "investment-fee-waiver"
    | "spend-fee-waiver"
    | "welcome-bonus-spend";
  label: string;
  required: number;
  available: number;
  gap: number;
  unit: "BRL" | "USD" | "BRL/month" | "BRL/window";
  satisfied: boolean;
  fit: number;
}

export interface ScoreLabForeignExchangeCost {
  cardId: string;
  annualInternationalSpendBrl: number;
  spreadPercent: number;
  iofRatePercent: number;
  annualCostBrl: number;
  source: CardFxSource;
  notes: string[];
}

export interface ScoreLabBenefit {
  cardId: string;
  kind: "annual-fee-waiver" | "welcome-bonus";
  label: string;
  valueBrl: number;
  requirement?: ScoreLabRequirement;
}

export type ScoreLabVerdictKind = "strong" | "viable" | "negative";

export interface ScoreLabVerdict {
  kind: ScoreLabVerdictKind;
  label: string;
  detail: string;
}

export interface ScoreLabStack {
  stackId: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  modeledAnnual: ScoreLabModeledAnnual;
  potentialAnnual: ScoreLabPotentialAnnual;
  productReliabilityScore: number;
  requirements: ScoreLabRequirement[];
  foreignExchangeCosts: ScoreLabForeignExchangeCost[];
  benefitsApplied: ScoreLabBenefit[];
  benefitsNotApplied: ScoreLabBenefit[];
  reasons: string[];
  verdict: ScoreLabVerdict;
  breakEvenMonthlySpendBrl: number | null;
  roiMultiple: number | null;
}

export interface TravelTranslation {
  program: ProgramId;
  flight: string;
  pointsRequired: number;
  compatiblePoints: number;
  trips: number;
  remainingPoints: number;
}

export type LeaderboardAxisId =
  | "net-return"
  | "liquidity"
  | "annual-fee"
  | "simplicity"
  | "accessibility";

export interface AxisLeaderboard {
  axisId: LeaderboardAxisId;
  title: string;
  stacks: StackEvaluation[];
}

export interface ScoreLabDecisionTracks {
  recommendedNow: StackEvaluation | null;
  actionable: StackEvaluation | null;
  nearUnlock: StackEvaluation | null;
  stretch: StackEvaluation | null;
  conditionalUpside: StackEvaluation;
  closestActionableSubstitute: {
    stack: StackEvaluation;
    similarity: number;
    reasons: string[];
  } | null;
  noRecommendationReason?: "no-positive-actionable-return" | "insufficient-access-data";
}

export interface Recommendation {
  topStack: StackEvaluation;
  alternatives: StackEvaluation[];
  leaderboardsByAxis: AxisLeaderboard[];
  isReturnDecisionTight: boolean;
  currentStack?: StackEvaluation;
  moneyOnTheTableBrl?: number;
  travelTranslation: TravelTranslation;
  shoutout: string;
  scoreLab?: {
    scenarioId: string;
    preference: "any" | "cashback" | "miles";
    ptaxRate: number;
    ptaxSource: "awesomeapi" | "fallback" | "manual";
    ptaxFetchedAt: string;
    scoreLabVersion: string;
    evaluatedStacks: number;
    netReturnLeaderDiffers: boolean;
    netReturnLeader: StackEvaluation;
    institutionalAlternative?: {
      stack: StackEvaluation;
      score: number;
      netReturnBrl: number;
      netReturnDeltaBrl: number;
      scoreDelta: number;
      reason: string;
    };
    decisionTracks?: ScoreLabDecisionTracks;
    nearUnlocks: StackEvaluation[];
    /**
     * Net return (R$/year) for each card evaluated as a single-card stack
     * against the caller's profile. Used by surfaces that need a per-card
     * modeled return (e.g. the comparator) without re-issuing one request
     * per card. Optional because older backend builds may not include it.
     */
    singleCardNetReturnByCardId?: Record<string, number>;
    notes: string[];
  };
}

export type SolverErrorCode =
  | "EMPTY_CATALOG"
  | "NO_ELIGIBLE_CARDS"
  | "INVALID_PROFILE"
  | "INVALID_REQUEST"
  | "NETWORK_ERROR"
  | "CARD_NOT_FOUND";

export interface SolverError {
  code: SolverErrorCode;
  message: string;
}

export type CardTier = "standard" | "gold" | "platinum" | "black" | "infinite";
export type CardBrand = "visa" | "mastercard" | "amex" | "elo" | "hipercard";
export type CardFxSource = "official" | "secondary" | "assumption" | "mixed";
export type CardTravelInsuranceLevel = "basic" | "premium";
export type CardVerifiedTier = 1 | 2 | 3;

export interface PublicLoungeAccess {
  unlimited?: boolean;
  visitsPerYear?: number;
  conditional?: boolean;
  conditionalMonthlySpendBrl?: number;
  providers: string[];
}

export interface PublicCardBenefit {
  kind: string;
  label: string;
}

export interface PublicCatalogCard {
  id: string;
  name: string;
  bank: Bank;
  brand: CardBrand;
  tier: CardTier;
  pointsProgram: ProgramId;
  annualFeeBrl: number;
  annualFeeWaiverThresholdBrl?: number;
  firstYearAnnualFeeBrl?: number;
  investmentFeeWaiverBrl?: number;
  minInvestmentBrl?: number;
  minInvestmentUsd?: number;
  requiredInvestmentBrl?: number;
  requiredInvestmentUsd?: number;
  requiresRelationship?: RelationshipLevel;
  hasLoungeAccess: boolean;
  hasTravelInsurance: boolean;
  hasFreeCheckedBaggage: boolean;
  hasZeroIof: boolean;
  hasInvestback?: boolean;
  cashbackRatePercent?: number;
  pointsPerUsdDomestic?: number;
  pointsPerUsdInternational?: number;
}

export interface PublicCardDetail extends PublicCatalogCard {
  loungeAccess?: PublicLoungeAccess;
  travelInsuranceLevel?: CardTravelInsuranceLevel;
  freeCheckedBaggage?: boolean;
  foreignExchangeCostSource?: CardFxSource;
  foreignExchangeSpreadPercent?: number;
  pointsExpirationMonths?: number;
  welcomeBonusPoints?: number;
  benefits?: PublicCardBenefit[];
  verifiedTier?: CardVerifiedTier;
  lastVerified?: string;
}

export type CatalogRelationshipFilter = Extract<
  RelationshipLevel,
  "open" | "checking" | "investment"
>;

export interface CatalogFilters {
  bank?: string;
  tier?: string;
  brand?: string;
  hasLounge?: boolean;
  hasCashback?: boolean;
  hasInvestback?: boolean;
  requiresRelationship?: CatalogRelationshipFilter[];
  minAnnualFee?: number;
  maxAnnualFee?: number;
  search?: string;
}

export interface CardCatalogResponse {
  cards: PublicCatalogCard[];
  catalogVersion: string;
  count: number;
  filters: CatalogFilters;
}
