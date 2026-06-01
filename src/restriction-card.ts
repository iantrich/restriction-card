import { TemplateResult, LitElement, html, CSSResult, css, PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { RestrictionBaseConfig, RestrictionCardConfig, CardHelpers, WindowWithCardHelpers } from './types';
import {
  HomeAssistant,
  LovelaceCard,
  LovelaceCardEditor,
  computeCardSize,
  evaluateFilter,
  fireEvent,
} from 'custom-card-helpers';
import { CARD_VERSION } from './const';
import { actionHandler } from './action-handler-directive';

/* eslint no-console: 0 */
console.info(
  `%c  RESTRICTION-CARD  \n%c  Version ${CARD_VERSION}     `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

interface WindowWithCustomCards extends Window {
  customCards: Array<{ type: string; name: string; description: string; preview?: boolean }>;
}
(window as unknown as WindowWithCustomCards).customCards =
  (window as unknown as WindowWithCustomCards).customCards || [];
(window as unknown as WindowWithCustomCards).customCards.push({
  type: 'restriction-card',
  name: 'Restriction Card',
  description: 'Wrap any card with access restriction: PIN, confirmation, block, or hide based on conditions.',
  preview: false,
});

class RestrictionCard extends LitElement implements LovelaceCard {
  private static readonly _HELPERS_TIMEOUT_MS = 10000;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor');
    return document.createElement('restriction-card-editor') as unknown as LovelaceCardEditor;
  }

  /** Minimal stub config shown in the card picker before the editor is opened. */
  public static getStubConfig(): Record<string, unknown> {
    return {
      card: { type: 'button' },
      restrictions: { confirm: {} },
    };
  }

  @state() private _config?: RestrictionCardConfig;
  @state() private _helpers?: CardHelpers;
  private _cardElement?: LovelaceCard;
  @state() private _unlocked = false;
  private _prevHidden = false;
  private _delay = false;
  private _maxed = false;
  private _retries = 0;
  private _timers: number[] = [];
  private _cancelWaitForHelpers?: () => void;
  private _hass?: HomeAssistant;

  @property({ attribute: false })
  get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    // Push hass updates directly to the cached element
    if (this._cardElement) {
      this._cardElement.hass = hass;
    }
  }

  public getCardSize(): number | Promise<number> {
    if (this._cardElement) {
      return computeCardSize(this._cardElement);
    }

    return 1;
  }

  public setConfig(config: RestrictionCardConfig): void {
    if (!config.card) {
      throw new Error('Error in card configuration.');
    }

    if (config.restrictions && config.restrictions.pin && !config.restrictions.pin.code) {
      throw new Error('A pin code is required for pin restrictions');
    }

    const legacyDelay = (config as { delay?: unknown }).delay;
    const rawDuration = config.duration ?? legacyDelay ?? 5;
    const coercedDuration = Number(rawDuration);

    this._config = {
      duration: Number.isFinite(coercedDuration) && coercedDuration > 0 ? coercedDuration : 5,
      action: 'tap',
      locked_icon: 'mdi:lock-outline',
      ...config,
    };
    // Keep validated duration in case YAML input is null/blank/invalid
    this._config.duration = Number.isFinite(coercedDuration) && coercedDuration > 0 ? coercedDuration : 5;
    // Clear cached element so it is rebuilt with the new config
    this._cardElement = undefined;

    if (!this._helpers) {
      this.loadCardHelpers();
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    // Always render when config or helpers changes
    if (changedProps.has('_config') || changedProps.has('_helpers')) {
      return true;
    }

    const oldHass = changedProps.get('hass') as HomeAssistant | undefined;

    // First render (no previous hass value)
    if (!oldHass) {
      return true;
    }

    if (!this._hass || !this._config) {
      return false;
    }

    const entity = this._getConditionEntity();
    if (entity) {
      const changed = oldHass.states[entity] !== this._hass.states[entity];
      return changed;
    }

    return false;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this._hass || !this._config.card || !this._helpers) {
      console.info('[RC] render() → bailing early (missing required state)');
      return html``;
    }

    if (this._config.restrictions && this._matchRestriction(this._config.restrictions.hide)) {
      this.checkVisibilityChanged(true);
      return html``;
    } else {
      this.checkVisibilityChanged(false);
    }

    const isBlocked = this._config.restrictions ? this._matchRestriction(this._config.restrictions.block) : false;
    return html`
      <div id="mainContainer" style=${ifDefined(styleMap(this._config.css_variables || {}))}>
        ${(this._config.exemptions &&
          this._config.exemptions.some((e) =>
            this._hass && this._hass.user ? e.user === this._hass.user.id : false,
          )) ||
        (this._config.condition &&
          !evaluateFilter(this._hass.states[this._config.condition.entity], this._config.condition))
          ? ''
          : html`
              <div
                @action=${this._handleAction}
                .actionHandler=${actionHandler({
                  hasHold: this._config.action === 'hold',
                  hasDoubleClick: this._config.action === 'double_tap',
                })}
                id="overlay"
                class=${classMap({
                  locked: !this._unlocked && !isBlocked,
                  blocked: Boolean(isBlocked),
                  'has-row': Boolean(this._config.row),
                  'fill-available': true,
                })}
              >
                <div id="subContainer" class=${classMap({ 'fill-available': true })}>
                  <ha-icon
                    icon=${this._unlocked
                      ? this._config.unlocked_icon
                        ? this._config.unlocked_icon
                        : this._config.locked_icon
                      : this._config.locked_icon}
                    id="lock"
                    class=${classMap({
                      'icon-blocked': Boolean(isBlocked),
                      'icon-in-row': Boolean(this._config.row),
                    })}
                  ></ha-icon>
                </div>
              </div>
            `}
        ${this.renderCard()}
      </div>
    `;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._cancelWaitForHelpers?.();
    this._cancelWaitForHelpers = undefined;
    for (const id of this._timers) {
      window.clearTimeout(id);
    }
    this._timers = [];
  }

  private checkVisibilityChanged(hidden: boolean) {
    const visibilityChanged = this._prevHidden !== hidden;
    if (visibilityChanged) {
      this._prevHidden = hidden;
      if (this._config!.row) {
        fireEvent(this, 'row-visibility-changed', { row: this, value: !hidden });
      } else {
        this.toggleAttribute('hidden', hidden);
        fireEvent(this, 'card-visibility-changed', { value: !hidden });
      }
    }
  }

  private _getConditionEntity(): string | undefined {
    const r = this._config?.restrictions;
    return (
      this._config?.condition?.entity ??
      r?.block?.condition?.entity ??
      r?.hide?.condition?.entity ??
      r?.pin?.condition?.entity ??
      r?.confirm?.condition?.entity
    );
  }

  private _buildCardElement(): void {
    if (!this._hass || !this._config?.card || !this._helpers) {
      return;
    }
    if (this._cardElement) {
      return;
    }
    const element = this._config.row
      ? this._helpers.createRowElement(this._config.card)
      : this._helpers.createCardElement(this._config.card);
    element.hass = this._hass;
    this._cardElement = element;
  }

  private _scheduleTimeout(fn: () => void, ms: number): number {
    const id = window.setTimeout(() => {
      this._timers = this._timers.filter((t) => t !== id);
      fn();
    }, ms);
    this._timers.push(id);
    return id;
  }

  private _clearScheduledTimeout(id: number | undefined): void {
    if (id === undefined) {
      return;
    }
    window.clearTimeout(id);
    this._timers = this._timers.filter((t) => t !== id);
  }

  private async loadCardHelpers(): Promise<void> {
    try {
      const helpersFactory = await this._waitForCardHelpers(RestrictionCard._HELPERS_TIMEOUT_MS);
      let resolveTimeoutId: number | undefined;
      this._helpers = await Promise.race<CardHelpers>([
        helpersFactory(),
        new Promise<CardHelpers>((_, reject) => {
          resolveTimeoutId = this._scheduleTimeout(
            () => reject(new Error('Timed out while resolving card helpers')),
            RestrictionCard._HELPERS_TIMEOUT_MS,
          );
        }),
      ]);
      this._clearScheduledTimeout(resolveTimeoutId);
      this.requestUpdate();
    } catch (error) {
      console.error('Unable to load Home Assistant card helpers', error);
    }
  }

  private _waitForCardHelpers(timeoutMs: number): Promise<() => Promise<CardHelpers>> {
    const win = window as WindowWithCardHelpers;

    // If already available synchronously, resolve immediately with no delay
    if (typeof win.loadCardHelpers === 'function') {
      return Promise.resolve(win.loadCardHelpers);
    }

    // Otherwise wait for it to appear, falling back to a timeout
    return new Promise((resolve, reject) => {
      let cancelled = false;
      let pollId: number | undefined;
      let deadlineId: number | undefined;

      const cleanup = () => {
        cancelled = true;
        window.removeEventListener('load', check);
        this._clearScheduledTimeout(pollId);
        this._clearScheduledTimeout(deadlineId);
        if (this._cancelWaitForHelpers === cancelWait) {
          this._cancelWaitForHelpers = undefined;
        }
      };

      const resolveOnce = (helpersFactory: () => Promise<CardHelpers>) => {
        if (cancelled) {
          return;
        }
        cleanup();
        resolve(helpersFactory);
      };

      const rejectOnce = (error: Error) => {
        if (cancelled) {
          return;
        }
        cleanup();
        reject(error);
      };

      const scheduleCheck = (delay: number) => {
        if (cancelled) {
          return;
        }
        pollId = this._scheduleTimeout(check, delay);
      };

      const check = () => {
        if (cancelled) {
          return;
        }
        if (!this.isConnected) {
          rejectOnce(new Error('Restriction card disconnected before card helpers became available'));
          return;
        }
        if (typeof win.loadCardHelpers === 'function') {
          resolveOnce(win.loadCardHelpers);
        } else {
          // Poll infrequently as a fallback; the load event handles the common case
          scheduleCheck(500);
        }
      };

      const cancelWait = () => {
        rejectOnce(new Error('Restriction card disconnected before card helpers became available'));
      };
      this._cancelWaitForHelpers = cancelWait;

      deadlineId = this._scheduleTimeout(
        () => rejectOnce(new Error('window.loadCardHelpers was not available in time')),
        timeoutMs,
      );

      // HA fires a 'load' event on window when its JS modules finish loading
      window.addEventListener('load', check);
      // Also start a single delayed check in case the event already fired
      scheduleCheck(0);
    });
  }

  private renderCard(): TemplateResult {
    // Build element lazily here - all required values are guaranteed present by render()'s guard
    this._buildCardElement();
    if (!this._cardElement) {
      return html``;
    }
    return html`<div id="card" class=${classMap({ 'is-row': Boolean(this._config?.row) })}>${this._cardElement}</div>`;
  }

  private _matchRestriction(restriction?: RestrictionBaseConfig): boolean {
    if (!this._hass || !restriction) {
      return false;
    }

    return (
      (!restriction.exemptions ||
        !restriction.exemptions.some((e) => (this._hass && this._hass.user ? e.user === this._hass.user.id : false))) &&
      (!restriction.condition || evaluateFilter(this._hass.states[restriction.condition.entity], restriction.condition))
    );
  }

  private _handleAction(ev: CustomEvent<{ action: string }>): void {
    if (this._config?.action === ev.detail.action) {
      this._handleRestriction();
    }
  }

  private async _handleRestriction(): Promise<void> {
    if (!this._config || !this.shadowRoot || this._delay || this._maxed || !this._helpers) {
      return;
    }

    const lock = this.shadowRoot.getElementById('lock');
    const overlay = this.shadowRoot.getElementById('overlay');

    if (!lock || !overlay) {
      return;
    }

    if (this._config.restrictions) {
      if (this._config.restrictions.block && this._matchRestriction(this._config.restrictions.block)) {
        if (this._config.restrictions.block.text) {
          this.dispatchEvent(
            new CustomEvent('hass-notification', {
              bubbles: true,
              composed: true,
              detail: { message: this._config.restrictions.block.text },
            }),
          );
        }

        lock.classList.add('icon-invalid');
        overlay.classList.add('overlay-invalid');
        this._scheduleTimeout(() => {
          lock.classList.remove('icon-invalid');
          overlay.classList.remove('overlay-invalid');
        }, 3000);
        return;
      }

      if (this._config.restrictions.pin && this._matchRestriction(this._config.restrictions.pin)) {
        const isMultiplePins = Array.isArray(this._config.restrictions.pin.code);
        let pin;
        const titleDialog = this._config.restrictions.pin.text || 'Input pin code';
        if (this._helpers?.showEnterCodeDialog) {
          const regex = /^\d+$/;
          let codeFormat: 'number' | 'text';
          if (!isMultiplePins) {
            const asString = this._config.restrictions.pin.code as string;
            codeFormat = regex.test(asString) ? 'number' : 'text';
          } else {
            const asArray = this._config.restrictions.pin.code as string[];
            codeFormat = regex.test(asArray.join('')) ? 'number' : 'text';
          }
          pin = await this._helpers.showEnterCodeDialog(lock, {
            codeFormat: codeFormat,
            title: titleDialog,
            submitText: 'OK',
          });
        } else {
          pin = prompt(titleDialog);
        }

        let conditionString = false;
        if (!isMultiplePins) conditionString = pin !== String(this._config.restrictions.pin.code);

        let conditionArray = false;
        if (isMultiplePins)
          for (const pinElement of this._config.restrictions.pin.code) {
            if (String(pinElement) === pin) {
              conditionArray = false;
              break;
            } else conditionArray = true;
          }

        if (conditionString || conditionArray) {
          lock.classList.add('icon-invalid');
          overlay.classList.add('overlay-invalid');
          this._delay = Boolean(this._config.restrictions.pin.retry_delay);
          if (this._config.restrictions.pin.max_retries) {
            this._retries++;
          }

          if (this._config.restrictions.pin.max_retries && this._retries >= this._config.restrictions.pin.max_retries) {
            this._maxed = true;

            this._scheduleTimeout(
              () => {
                lock.classList.remove('icon-invalid');
                overlay.classList.remove('overlay-invalid');
                this._retries = 0;
                this._maxed = false;
                this._delay = false;
              },
              this._config.restrictions.pin.max_retries_delay
                ? this._config.restrictions.pin.max_retries_delay * 1000
                : 5000,
            );
          } else {
            this._scheduleTimeout(
              () => {
                this._delay = false;

                if (!this._maxed) {
                  lock.classList.remove('icon-invalid');
                  overlay.classList.remove('overlay-invalid');
                }
              },
              this._config.restrictions.pin.retry_delay ? this._config.restrictions.pin.retry_delay * 1000 : 3000,
            );
          }

          return;
        } else {
          this._retries = 0;
        }
      }

      if (this._config.restrictions.confirm && this._matchRestriction(this._config.restrictions.confirm)) {
        const confirmTitle = this._hass?.localize('ui.dialogs.generic.default_confirmation_title') || 'Confirm';
        const confirmButtonText = this._hass?.localize('ui.common.ok') || 'OK';
        const dismissButtonText = this._hass?.localize('ui.common.cancel') || 'Cancel';
        const defaultConfirmText =
          this._hass?.localize('ui.panel.lovelace.cards.actions.action_confirmation', {
            action: confirmButtonText,
          }) || 'Are you sure you want to unlock?';
        const confirmText = this._config.restrictions.confirm.text || defaultConfirmText;
        let isConfirmed = false;

        if (this._helpers?.showConfirmationDialog) {
          isConfirmed = await this._helpers.showConfirmationDialog(this, {
            title: confirmTitle,
            text: confirmText,
            confirmText: confirmButtonText,
            dismissText: dismissButtonText,
          });
        } else {
          isConfirmed = confirm(confirmText);
        }

        if (!isConfirmed) {
          return;
        }
      }
    }

    this._unlocked = true;
    overlay.style.setProperty('pointer-events', 'none');
    lock.classList.add('icon-hidden');
    overlay.classList.add('unlocked');
    overlay.classList.remove('locked');

    this._scheduleTimeout(
      () => {
        this._unlocked = false;
        overlay.style.setProperty('pointer-events', '');
        lock.classList.remove('icon-hidden');
        overlay.classList.remove('unlocked');
        overlay.classList.add('locked');
      },
      (this._config.duration ?? 5) * 1000,
    );
  }

  static get styles(): CSSResult {
    return css`
      :host {
        position: relative;
      }
      #mainContainer {
        height: 100%;
        position: relative;
      }
      ha-icon {
        --mdc-icon-size: var(--lock-icon-size);
      }
      .fill-available {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
      }
      #overlay {
        z-index: 1;
      }
      #subContainer {
        padding: 8px 7px;
        border-radius: var(--ha-card-border-radius, 12px);
        background: var(--restriction-overlay-background, unset);
        --lock-icon-size: var(--restriction-lock-icon-size, var(--mdc-icon-size, 24px));
      }
      #overlay.has-row #subContainer {
        border-radius: var(--restriction-overlay-row-border-radius, 0) !important;
        border: var(--restriction-overlay-row-outline, none);
      }
      #overlay.unlocked #subContainer {
        border-color: transparent;
        opacity: 0 !important;
        transition:
          border-color 2s,
          opacity 2s linear;
      }
      #overlay.blocked #subContainer {
        background: var(--restriction-overlay-background-blocked, unset) !important;
      }
      #overlay.has-row.blocked #subContainer {
        border: var(--restriction-overlay-row-outline-blocked, none);
        border-radius: var(--restriction-overlay-row-border-radius, 0) !important;
      }
      #card {
        height: 100%;
      }
      #overlay:not(.unlocked) {
        overflow: hidden;
      }
      #overlay:not(.unlocked) + #card.is-row {
        overflow: hidden;
      }
      #lock {
        margin-inline-start: var(--restriction-lock-margin-left, 0px);
        margin-top: var(--restriction-lock-margin-top, 0px);
        opacity: var(--restriction-lock-opacity, 0.5);
        color: var(--restriction-regular-lock-color, var(--primary-text-color, #212121));
        position: inherit;
      }
      .icon-in-row {
        margin-inline-start: var(--restriction-lock-row-margin-left, 24px) !important;
        margin-top: var(--restriction-lock-row-margin-top, 0px) !important;
      }
      .icon-hidden {
        opacity: 0 !important;
        transition:
          visibility 0s 2s,
          opacity 2s linear;
        color: var(--restriction-success-lock-color, var(--primary-color, #03a9f4)) !important;
      }
      .icon-blocked {
        color: var(--restriction-blocked-lock-color, var(--error-state-color, #db4437)) !important;
      }
      .icon-invalid {
        animation: blinker 1s linear infinite;
        color: var(--restriction-invalid-lock-color, var(--error-state-color, #db4437)) !important;
      }
      .overlay-invalid {
        animation: blinker 1s linear infinite;
      }
      @keyframes blinker {
        50% {
          opacity: 0;
        }
      }
    `;
  }
}

if (!customElements.get('restriction-card')) {
  customElements.define('restriction-card', RestrictionCard);
}

declare global {
  interface HTMLElementTagNameMap {
    'restriction-card': RestrictionCard;
  }
}
