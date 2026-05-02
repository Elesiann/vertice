export type Currency = "BRL" | "USD";

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

export type ProgramId = "smiles" | "latam-pass" | "tudoazul" | "livelo" | "esfera" | "cashback";

export type ProgramKind = "airline-miles" | "bank-points" | "cashback";

export interface ProgramTransfer {
  to: ProgramId;
  ratio: number;
}

export interface PointsProgram {
  id: ProgramId;
  name: string;
  kind: ProgramKind;
  pointValueBrl: number;
  transfersTo?: ProgramTransfer[];
  lastVerified: string;
}

export type CardBrand = "visa" | "mastercard" | "amex" | "elo";
export type CardTier = "standard" | "platinum" | "infinite" | "black" | "elite";

export interface Card {
  id: string;
  name: string;
  bank: Bank;
  brand: CardBrand;
  tier: CardTier;
  annualFeeBrl: number;
  annualFeeWaiverThresholdBrl?: number;
  pointsProgram: ProgramId;
  pointsPerBrlDomestic: number;
  pointsPerUsdInternational: number;
  monthlyPointsCap?: number;
  welcomeBonusPoints?: number;
  welcomeBonusMinSpendBrl?: number;
  welcomeBonusWindowMonths?: number;
  minIncomeBrl?: number;
  benefits: string[];
  lastVerified: string;
}

export type RedemptionPreference =
  | { kind: "miles"; program: ProgramId }
  | { kind: "cashback" }
  | { kind: "any" };

export interface SpendingProfile {
  monthlyDomesticBrl: number;
  monthlyInternationalUsd: number;
  redemption: RedemptionPreference;
  currentCardIds?: string[];
}

export interface CardAllocation {
  cardId: string;
  monthlyDomesticBrl: number;
  monthlyInternationalUsd: number;
}

export interface StackEvaluation {
  cards: Card[];
  allocation: CardAllocation[];
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
  flight: string;
  pointsRequired: number;
  trips: number;
  remainingPoints: number;
}

export interface Recommendation {
  topStack: StackEvaluation;
  alternatives: StackEvaluation[];
  currentStack?: StackEvaluation;
  moneyOnTheTableBrl?: number;
  travelTranslation: TravelTranslation;
  shoutout: string;
}

export interface Catalog {
  cards: Card[];
  programs: PointsProgram[];
}

export type SolverErrorCode = "EMPTY_CATALOG" | "NO_ELIGIBLE_CARDS" | "INVALID_PROFILE";

export interface SolverError {
  code: SolverErrorCode;
  message: string;
}
