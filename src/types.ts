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
  investmentFeeWaiverBrl?: number;
  requiredInvestmentBrl?: number;
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
  investmentFeeWaiverBrl?: number;
  requiredInvestmentBrl?: number;
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
