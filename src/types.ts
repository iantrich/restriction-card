import { ActionConfig, LovelaceCardConfig } from "custom-card-helpers";

export interface RestrictionCardConfig extends LovelaceCardConfig {
  restrictions?: RestrictionsConfig;
  exemptions?: ExemptionConfig[];
  card?: LovelaceCardConfig;
}

export interface RestrictionsConfig {
  confirm?: ConfirmRestrictionConfig;
  pin?: PinRestrictionConfig;
  block?: BlockRestrictionConfig;
  hide?: HideRestrictionConfig;
}

export interface ConfirmRestrictionConfig {
  exemptions?: ExemptionConfig[];
}

export interface BlockRestrictionConfig {
  exemptions?: ExemptionConfig[];
}

export interface HideRestrictionConfig {
  exemptions?: ExemptionConfig[];
}

export interface PinRestrictionConfig {
  code: string;
  exemptions?: ExemptionConfig[];
}

export interface ExemptionConfig {
  user: string;
}

export interface LongPressOptions {
  hasDoubleClick?: boolean;
}