import { ActionConfig, LovelaceCardConfig } from "custom-card-helpers";

export interface RestrictionCardConfig extends LovelaceCardConfig {
  restrictions?: RestrictionsConfig;
  exemptions?: RestrictionTypeConfig[];
  card?: LovelaceCardConfig;
}

export interface RestrictionsConfig {
  confirm?: ConfirmRestrictionTypeConfig;
  pin?: PinRestrictionConfig;
  block?: BlockTypeConfig;
}

export interface ConfirmRestrictionTypeConfig {
  exemptions?: RestrictionTypeConfig[];
}

export interface BlockTypeConfig {
  exemptions?: RestrictionTypeConfig[];
}

export interface PinRestrictionConfig {
  code: string;
  exemptions?: RestrictionTypeConfig[];
}

export interface RestrictionTypeConfig {
  user: string;
}

export interface LongPressOptions {
  hasDoubleClick?: boolean;
}