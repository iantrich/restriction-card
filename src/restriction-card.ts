/* eslint-disable @typescript-eslint/no-explicit-any */
import { TemplateResult, customElement, LitElement, property, html, CSSResult, css, PropertyValues } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

import { RestrictionCardConfig } from './types';
import { HomeAssistant, LovelaceCard, computeCardSize, LovelaceCardConfig, evaluateFilter } from 'custom-card-helpers';
import { CARD_VERSION } from './const';
import { actionHandler } from './action-handler-directive';

/* eslint no-console: 0 */
console.info(
  `%c  RESTRICTION-CARD  \n%c  Version ${CARD_VERSION}     `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

@customElement('restriction-card')
class RestrictionCard extends LitElement implements LovelaceCard {
  @property() protected _config?: RestrictionCardConfig;
  @property() protected _hass?: HomeAssistant;
  @property() private _helpers?: any;
  @property() private _unlocked = false;
  private _initialized = false;
  private _delay = false;
  private _maxed = false;
  private _retries = 0;

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    if (this.shadowRoot) {
      const element = this.shadowRoot.querySelector('#card > *') as LovelaceCard;
      if (element) {
        element.hass = hass;
      }
    }
  }

  public getCardSize(): number {
    if (this.shadowRoot) {
      const element = this.shadowRoot.querySelector('#card > *') as LovelaceCard;
      if (element) {
        return computeCardSize(element);
      }
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

    this._config = {
      duration: 5,
      action: 'tap',
      locked_icon: 'mdi:lock-outline',
      ...config,
    };

    this.loadCardHelpers();
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this._initialized) {
      this._initialize();
    }

    const oldHass = changedProps.get('_hass') as HomeAssistant | undefined;

    if (changedProps.has('_config') || !oldHass) {
      return true;
    }

    if (this._hass && this._config && this._config.condition && this._config.condition.entity) {
      return oldHass.states[this._config.condition.entity] !== this._hass.states[this._config.condition.entity];
    } else {
      return false;
    }
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this._hass || !this._config.card || !this._helpers) {
      return html``;
    }

    if (this._config.restrictions && this._matchRestriction(this._config.restrictions.hide)) {
      return html``;
    }

    const isBlocked = this._config.restrictions ? this._matchRestriction(this._config.restrictions.block) : false;
    return html`
      <div id="mainContainer">
        ${(this._config.exemptions &&
          this._config.exemptions.some(e => (this._hass && this._hass.user ? e.user === this._hass.user.id : false))) ||
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
                  locked: !Boolean(this._unlocked) && !Boolean(isBlocked),
                  blocked: Boolean(isBlocked),
                  'has-row': Boolean(this._config.row),
                })}
              >
              <div id="subContainer">
                <ha-icon
                  icon=${Boolean(this._unlocked)
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
        ${this.renderCard(this._config.card)}
      </div>
    `;
  }

  private _initialize(): void {
    if (this.hass === undefined) return;
    if (this._config === undefined) return;
    if (this._helpers === undefined) return;
    this._initialized = true;
  }

  private async loadCardHelpers(): Promise<void> {
    this._helpers = await (window as any).loadCardHelpers();
  }

  private renderCard(config: LovelaceCardConfig): TemplateResult {
    if (this._hass && this._config && this._helpers) {
      const element = this._config.row
        ? this._helpers.createRowElement(config)
        : this._helpers.createCardElement(config);
      element.hass = this._hass;

      return html`
        <div id="card" class=${classMap({ 'is-row': Boolean(this._config.row) })}>
          ${element}
        </div>
      `;
    }

    return html``;
  }

  private _matchRestriction(restriction): boolean {
    return (
      this._hass &&
      restriction &&
      (!restriction.exemptions ||
        !restriction.exemptions.some(e => (this._hass && this._hass.user ? e.user === this._hass.user.id : false))) &&
      (!restriction.condition || evaluateFilter(this._hass.states[restriction.condition.entity], restriction.condition))
    );
  }

  private _handleAction(ev): void {
    if (this._config?.action === ev.detail.action) {
      this._handleRestriction();
    }
  }

  private async _handleRestriction(): Promise<void> {
    if (!this._config || !this.shadowRoot || this._delay || this._maxed || !this._helpers) {
      return;
    }

    const lock = this.shadowRoot.getElementById('lock') as LitElement;

    if (this._config.restrictions) {
      if (this._config.restrictions.block && this._matchRestriction(this._config.restrictions.block)) {
        if (this._config.restrictions.block.text) {
          alert(this._config.restrictions.block.text);
        }

        lock.classList.add('icon-invalid');
        window.setTimeout(() => {
          lock.classList.remove('icon-invalid');
        }, 3000);
        return;
      }

      if (this._config.restrictions.pin && this._matchRestriction(this._config.restrictions.pin)) {
        const isMultiplePins = Array.isArray(this._config.restrictions.pin.code);
        const regex = /^\d+$/;
        let codeFormat;
        if (!isMultiplePins) {
          const asString = this._config.restrictions.pin.code as string;
          codeFormat = regex.test(asString) ? 'number' : 'text';
        } else {
          const asArray = this._config.restrictions.pin.code as string[];
          codeFormat = regex.test(asArray.join('')) ? 'number' : 'text';
        }
        const pin = await this._helpers.showEnterCodeDialog(lock, {
          codeFormat: codeFormat,
          title: this._config.restrictions.pin.text || 'Input pin code',
          submitText: 'OK',
        });

        let conditionString = false;
        if (!isMultiplePins) conditionString = pin != (this._config.restrictions.pin.code as string);

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
          this._delay = Boolean(this._config.restrictions.pin.retry_delay);
          if (this._config.restrictions.pin.max_retries) {
            this._retries++;
          }

          if (this._config.restrictions.pin.max_retries && this._retries >= this._config.restrictions.pin.max_retries) {
            this._maxed = true;

            window.setTimeout(
              () => {
                lock.classList.remove('icon-invalid');
                this._retries = 0;
                this._maxed = false;
                this._delay = false;
              },
              this._config.restrictions.pin.max_retries_delay
                ? this._config.restrictions.pin.max_retries_delay * 1000
                : 5000,
            );
          } else {
            window.setTimeout(
              () => {
                this._delay = false;

                if (!this._maxed) {
                  lock.classList.remove('icon-invalid');
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
        if (!confirm(this._config.restrictions.confirm.text || 'Are you sure you want to unlock?')) {
          return;
        }
      }
    }

    this._unlocked = true;
    const overlay = this.shadowRoot.getElementById('overlay') as LitElement;
    overlay.style.setProperty('pointer-events', 'none');
    const useUnlockedIcon = Boolean(this._config.unlocked_icon!);
    if (!useUnlockedIcon) {
      lock.classList.add('icon-hidden');
    }
    overlay.classList.add('unlocked');
    overlay.classList.remove('locked');

    window.setTimeout(() => {
      this._unlocked = false;
      overlay.style.setProperty('pointer-events', '');
      if (!useUnlockedIcon) {
        lock.classList.remove('icon-hidden');
      }
      overlay.classList.remove('unlocked');
      overlay.classList.add('locked');
    }, this._config.duration * 1000);
  }

  static get styles(): CSSResult {
    return css`
      :host {
        position: relative;
        --lock-icon-size: var(--restriction-lock-icon-size, var(--mdc-icon-size, 24px));
      }
      #mainContainer {
        height: 100%;
        position: relative;
      }
      ha-icon {
        --mdc-icon-size: var(--lock-icon-size);
      }
      #overlay {
        padding: 8px 7px;
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        z-index: 1;
      }
      #subContainer {
        height: 100%;
        border-radius: var(--ha-card-border-radius, 12px);
        background: var(--restriction-overlay-background, unset);
      }
      #overlay.has-row #subContainer {
        border-radius: var(--restriction-overlay-row-border-radius, 0) !important;
        border: var(--restriction-overlay-row-outline, none);
      }
      #overlay.unlocked #subContainer {
        border-color: transparent;
        opacity: 0 !important;
        transition: border-color 2s, opacity 2s linear;
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
        overflow: hidden; /********************************************************************************/
      }
      #lock {
        margin-inline-start: var(--restriction-lock-margin-left, 0px);
        opacity: var(--restriction-lock-opacity, 0.5);
        color: var(--restriction-regular-lock-color, var(--primary-text-color, #212121));
      }
      .icon-in-row {
        margin-inline-start: var(--restriction-lock-row-margin-left, 24px) !important;
        margin-top: var(--restriction-lock-row-margin-top, 0px) !important;
        position: inherit;
      }
      .icon-hidden {
        opacity: 0 !important;
        transition: visibility 0s 2s, opacity 2s linear;
      }
      .icon-unlocked {
        color: var(--restriction-success-lock-color, var(--primary-color, #03a9f4)) !important;
      }
      .icon-blocked {
        color: var(--restriction-blocked-lock-color, var(--error-state-color, #db4437)) !important;
      }
      .icon-invalid {
        animation: blinker 1s linear infinite;
        color: var(--restriction-invalid-lock-color, var(--error-state-color, #db4437)) !important;
      }
      @keyframes blinker {
        50% {
          opacity: 0;
        }
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'restriction-card': RestrictionCard;
  }
}
