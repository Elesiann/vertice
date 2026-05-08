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

// Frequência declarada de viagens internacionais. Espelha o backend
// (src/domain/types.ts) — alimenta defaults para visitas a salas VIP e
// número de viagens/ano nos cálculos de benefitUtilityBrl.
export type TravelFrequency = "none" | "occasional" | "frequent";

export interface SpendingProfile {
  monthlyDomesticBrl: number;
  monthlyInternationalUsd: number;
  monthlyIncomeBrl?: number;
  availableToInvestBrl?: number;
  redemption: RedemptionPreference;
  currentCardIds?: string[];
  travelFrequency?: TravelFrequency;
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

export interface BenefitBreakdown {
  loungeValueBrl: number;
  insuranceValueBrl: number;
  baggageValueBrl: number;
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
  source: "official" | "secondary" | "assumption" | "mixed";
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
    nearUnlocks: StackEvaluation[];
    notes: string[];
  };
}

export type SolverErrorCode =
  | "EMPTY_CATALOG"
  | "NO_ELIGIBLE_CARDS"
  | "INVALID_PROFILE"
  | "INVALID_REQUEST"
  | "NETWORK_ERROR";

export interface SolverError {
  code: SolverErrorCode;
  message: string;
}
