import { LovelaceCardConfig, LovelaceCard } from 'custom-card-helpers';

export interface RestrictionCardConfig extends LovelaceCardConfig {
  restrictions?: RestrictionsConfig;
  exemptions?: ExemptionConfig[];
  condition?: ConditionConfig;
  card?: LovelaceCardConfig;
  row?: boolean;
  /** Seconds the card stays unlocked after the user authenticates. */
  duration?: number;
  /** @deprecated Use `duration` instead. */
  delay?: number;
  action?: string;
  locked_icon?: string;
  unlocked_icon?: string;
  css_variables?: Record<string, string | number | null | undefined>;
}

export interface RestrictionBaseConfig {
  exemptions?: ExemptionConfig[];
  condition?: ConditionConfig;
}

export interface RestrictionsConfig {
  confirm?: ConfirmRestrictionConfig;
  pin?: PinRestrictionConfig;
  block?: BlockRestrictionConfig;
  hide?: HideRestrictionConfig;
}

export interface ConfirmRestrictionConfig extends RestrictionBaseConfig {
  text?: string;
}

export interface BlockRestrictionConfig extends RestrictionBaseConfig {
  text?: string;
}

export type HideRestrictionConfig = RestrictionBaseConfig;

export interface PinRestrictionConfig extends RestrictionBaseConfig {
  code: string | string[];
  text?: string;
  retry_delay?: number;
  max_retries?: number;
  max_retries_delay?: number;
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

export interface CardHelpers {
  createRowElement(config: LovelaceCardConfig): LovelaceCard;
  createCardElement(config: LovelaceCardConfig): LovelaceCard;
  showConfirmationDialog?: (
    element: HTMLElement,
    options: { title: string; text?: string; confirmText?: string; dismissText?: string },
  ) => Promise<boolean>;
  showEnterCodeDialog?: (
    element: Element,
    options: { codeFormat: 'text' | 'number'; title: string; submitText: string },
  ) => Promise<string | null>;
}

export interface WindowWithCardHelpers extends Window {
  loadCardHelpers?: () => Promise<CardHelpers>;
}
