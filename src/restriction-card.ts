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

    return html`
      <div>
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
                class="${classMap({
                  blocked: this._config.restrictions ? this._matchRestriction(this._config.restrictions.block) : false,
                })}"
              >
                <ha-icon
                  icon="${this._unlocked ? this._config.unlocked_icon! : this._config.locked_icon!}"
                  id="lock"
                  class="${classMap({
                    row: Boolean(this._config.row),
                  })}"
                ></ha-icon>
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
        <div id="card" class=${classMap({ 'card-row': this._config.row === true })}>
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

        lock.classList.add('invalid');
        window.setTimeout(() => {
          if (lock) {
            lock.classList.remove('invalid');
          }
        }, 3000);
        return;
      }

      if (this._config.restrictions.pin && this._matchRestriction(this._config.restrictions.pin)) {
        const codeFormat = Number.isNaN(this._config.restrictions.pin.code) ? 'text' : 'number';
        const pin = await this._helpers.showEnterCodeDialog(lock, {
          codeFormat: codeFormat,
          title: this._config.restrictions.pin.text || 'Input pin code',
          submitText: 'OK',
        });

        // tslint:disable-next-line: triple-equals
        if (pin != this._config.restrictions.pin.code) {
          lock.classList.add('invalid');
          this._delay = Boolean(this._config.restrictions.pin.retry_delay);
          if (this._config.restrictions.pin.max_retries) {
            this._retries++;
          }

          if (this._config.restrictions.pin.max_retries && this._retries >= this._config.restrictions.pin.max_retries) {
            this._maxed = true;

            window.setTimeout(
              () => {
                if (lock) {
                  lock.classList.remove('invalid');
                }
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

                if (lock && !this._maxed) {
                  lock.classList.remove('invalid');
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

    const overlay = this.shadowRoot.getElementById('overlay') as LitElement;
    overlay.style.setProperty('pointer-events', 'none');
    if (this._config.unlocked_icon) {
      this._unlocked = true;
    } else {
      lock.classList.add('hidden');
    }
    window.setTimeout(() => {
      overlay.style.setProperty('pointer-events', '');
      if (this._config?.unlocked_icon) {
        this._unlocked = false;
      }
      if (lock) {
        lock.classList.remove('hidden');
      }
    }, this._config.duration * 1000);
  }

  static get styles(): CSSResult {
    return css`
      :host {
        position: relative;
        --regular-lock-color: var(--restriction-regular-lock-color, var(--primary-text-color, #212121));
        --success-lock-color: var(--restriction-success-lock-color, var(--primary-color, #03a9f4));
        --blocked-lock-color: var(--restriction-blocked-lock-color, var(--error-state-color, #db4437));
        --invalid-lock-color: var(--restriction-invalid--color, var(--error-state-color, #db4437));
        --lock-margin-left: var(--restriction-lock-margin-left, 0px);
        --lock-row-margin-left: var(--restriction-lock-row-margin-left, 24px);
        --lock-row-margin-top: var(--restriction-lock-row-margin-top, 0px);
        --lock-icon-size: var(--restriction-lock-icon-size, var(--mdc-icon-size, 24px));
        --lock-opacity: var(--restriction-lock-opacity, 0.5);
      }
      div:has(#card) {
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
        color: var(--regular-lock-color);
        background: var(--restriction-overlay-background, unset);
      }
      #overlay:has(.hidden) {
        opacity: 0 !important;
        transition: opacity 2s linear;
      }
      #overlay:not(:has(.hidden)):has(+ #card.card-row) {
        outline: var(--restriction-overlay-row-outline, none);
        border-radius: var(--restriction-overlay-row-border-radius, 0);
      }
      #overlay:not(:has(+ #card.card-row)) {
        border-radius: var(--ha-card-border-radius, 12px);
      }
      #overlay.blocked {
        background: var(--restriction-overlay-background-blocked, unset);
      }
      #overlay.blocked:has(+ #card.card-row) {
        outline: var(--restriction-overlay-row-outline-blocked, none);
      }
      #card {
        height: 100%;
      }
      #overlay:not(:has(.hidden)) {
        overflow: clip;
      }
      #overlay:not(:has(.hidden)) + #card.card-row {
        overflow: clip;
      }
      .blocked {
        color: var(--blocked-lock-color) !important;
      }
      #lock {
        margin-inline-start: var(--lock-margin-left);
        opacity: var(--lock-opacity);
      }
      .row {
        margin-inline-start: var(--lock-row-margin-left) !important;
        margin-top: var(--lock-row-margin-top) !important;
        position: inherit;
      }
      .hidden {
        visibility: hidden;
        opacity: 0 !important;
        transition: visibility 0s 2s, opacity 2s linear;
        color: var(--success-lock-color);
      }
      @keyframes blinker {
        50% {
          opacity: 0;
        }
      }
      .invalid {
        animation: blinker 1s linear infinite;
        color: var(--invalid-lock-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'restriction-card': RestrictionCard;
  }
}
