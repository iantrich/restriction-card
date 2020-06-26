import { LovelaceCardConfig } from 'custom-card-helpers';

export interface RestrictionCardConfig extends LovelaceCardConfig {
  restrictions?: RestrictionsConfig;
  exemptions?: ExemptionConfig[];
  condition?: ConditionConfig;
  card?: LovelaceCardConfig;
  row?: boolean;
  delay?: number;
  action?: string;
}

export interface RestrictionsConfig {
  confirm?: ConfirmRestrictionConfig;
  pin?: PinRestrictionConfig;
  block?: BlockRestrictionConfig;
  hide?: HideRestrictionConfig;
}

export interface ConfirmRestrictionConfig {
  text?: string;
  exemptions?: ExemptionConfig[];
  condition?: ConditionConfig;
}

export interface BlockRestrictionConfig {
  text?: string;
  exemptions?: ExemptionConfig[];
  condition?: ConditionConfig;
}

export interface HideRestrictionConfig {
  exemptions?: ExemptionConfig[];
  condition?: ConditionConfig;
}

export interface PinRestrictionConfig {
  code: string;
  text?: string;
  exemptions?: ExemptionConfig[];
  condition?: ConditionConfig;
}

export interface ExemptionConfig {
  user: string;
}

export interface ConditionConfig {
  value: string;
  operator: string;
  entity: string;
  attribute?: string;
}
