import { TemplateResult, customElement, LitElement, property, html, CSSResult, css, PropertyValues } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';

import { RestrictionCardConfig } from './types';
import {
  HomeAssistant,
  createThing,
  LovelaceCard,
  computeCardSize,
  LovelaceCardConfig,
  evaluateFilter,
} from 'custom-card-helpers';
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

    this._config = { duration: 5, action: 'tap', ...config };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
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
    if (!this._config || !this._hass || !this._config.card) {
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
                  hasDoubleTap: this._config.action === 'double_tap',
                })}
                id="overlay"
                class="${classMap({
                  blocked: this._config.restrictions ? this._matchRestriction(this._config.restrictions.block) : false,
                })}"
              >
                <ha-icon
                  icon="mdi:lock-outline"
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

  private renderCard(config: LovelaceCardConfig): TemplateResult {
    if (this._hass && this._config) {
      const element = createThing(config, this._config.row);
      element.hass = this._hass;

      return html`
        <div id="card">
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
    if (this._config && this._config.action === ev.detail.action) {
      this._handleRestriction();
    }
  }

  private _handleRestriction(): void {
    if (!this._config || !this.shadowRoot) {
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
        const pin = prompt(this._config.restrictions.pin.text || 'Input pin code');

        // tslint:disable-next-line: triple-equals
        if (pin != this._config.restrictions.pin.code) {
          lock.classList.add('invalid');
          window.setTimeout(() => {
            if (lock) {
              lock.classList.remove('invalid');
            }
          }, 3000);
          return;
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
    lock.classList.add('hidden');
    window.setTimeout(() => {
      overlay.style.setProperty('pointer-events', '');
      if (lock) {
        lock.classList.remove('hidden');
      }
    }, this._config.duration * 1000);
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        position: relative;
        --regular-lock-color: var(--restriction-regular-lock-color, var(--primary-text-color, #212121));
        --success-lock-color: var(--restriction-success-lock-color, var(--primary-color, #03a9f4));
        --blocked-lock-color: var(--restriction-blocked-lock-color, var(--error-state-color, #db4437));
        --invalid-lock-color: var(--restriction-invalid--color, var(--error-state-color, #db4437));
        --lock-margin-left: var(--restriction-lock-margin-left, 0px);
        --lock-row-margin-left: var(--restriction-lock-row-margin-left, 24px);
        --lock-icon-height: var(--restriction-lock-icon-height, var(--iron-icon-height, 24px));
        --lock-icon-width: var(--restriction-lock-icon-width, var(--iron-icon-width, 24px));
      }
      ha-icon {
        --iron-icon-height: var(--lock-icon-height);
        --iron-icon-width: var(--lock-icon-width);
      }
      #overlay {
        align-items: flex-start;
        padding: 8px 7px;
        opacity: 0.5;
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        z-index: 50;
        display: flex;
        color: var(--regular-lock-color);
      }
      .blocked {
        color: var(--blocked-lock-color) !important;
      }
      #lock {
        margin-left: var(--lock-margin-left);
      }
      .row {
        margin-left: var(--lock-row-margin-left) !important;
      }
      .hidden {
        visibility: hidden;
        opacity: 0;
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
