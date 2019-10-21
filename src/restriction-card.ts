import {
  TemplateResult,
  customElement,
  LitElement,
  property,
  html,
  CSSResult,
  css,
  PropertyValues
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

import { RestrictionCardConfig } from "./types";
import {
  HomeAssistant,
  createThing,
  LovelaceCard,
  computeCardSize,
  LovelaceCardConfig,
  evaluateFilter
} from "custom-card-helpers";
import { longPress } from "./long-press-directive";

@customElement("restriction-card")
class RestrictionCard extends LitElement implements LovelaceCard {
  @property() protected _config?: RestrictionCardConfig;
  @property() protected _hass?: HomeAssistant;

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    const element = this.shadowRoot!.querySelector("#card > *") as LovelaceCard;
    if (element) {
      element.hass = hass;
    }
  }

  public getCardSize(): number {
    const element = this.shadowRoot!.querySelector("#card > *") as LovelaceCard;
    if (element) {
      return computeCardSize(element);
    }

    return 1;
  }

  public setConfig(config: RestrictionCardConfig): void {
    if (!config.card) {
      throw new Error("Error in card configuration.");
    }

    if (
      config.restrictions &&
      config.restrictions.pin &&
      !config.restrictions.pin.code
    ) {
      throw new Error("A pin code is required for pin restrictions");
    }

    this._config = { duration: 5, action: "tap", ...config };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (changedProps.has("config") || !oldHass) {
      return true;
    }

    if (
      this._config &&
      this._config.condition &&
      this._config.condition.entity
    ) {
      return (
        oldHass.states[this._config.condition.entity] !==
        this._hass!.states[this._config.condition.entity]
      );
    } else {
      return false;
    }
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this._hass) {
      return html``;
    }

    if (
      this._config.restrictions &&
      this._matchRestriction(this._config.restrictions.hide)
    ) {
      return html``;
    }

    return html`
      <div>
        ${(this._config.exemptions &&
          this._config.exemptions.some(e => e.user === this._hass!.user!.id)) ||
        (this._config.condition &&
          !evaluateFilter(
            this._hass.states[this._config.condition.entity],
            this._config.condition
          ))
          ? ""
          : html`
              <div
              @ha-click=${this._handleClick}
              @ha-hold=${this._handleHold}
              @ha-dblclick=${this._handleDblClick}
              .longPress=${longPress({
                hasDoubleClick: this._config!.action === "double_tap",
              })}
                @click=${this._handleClick}
                id="overlay"
                class="${classMap({
                  blocked: this._config.restrictions
                    ? this._matchRestriction(this._config.restrictions.block)
                    : false
                })}"
              >
                <ha-icon
                  icon="mdi:lock-outline"
                  id="lock"
                  class="${classMap({
                    row: Boolean(this._config.row)
                  })}"
                ></ha-icon>
              </div>
            `}
        ${this.renderCard(this._config.card!)}
      </div>
    `;
  }

  private renderCard(config: LovelaceCardConfig): TemplateResult {
    const element = createThing(config);
    if (this._hass) {
      element.hass = this._hass;
    }

    return html`
      <div id="card">
        ${element}
      </div>
    `;
  }

  private _matchRestriction(restriction): boolean {
    return (
      restriction &&
      (!restriction.exemptions ||
        !restriction.exemptions.some(e => e.user === this._hass!.user!.id)) &&
      (!restriction.condition ||
        evaluateFilter(
          this._hass!.states[restriction.condition.entity],
          restriction.condition
        ))
    );
  }

  private _handleClick(): void {
    if (this._config!.action === "tap") {
      this._handleRestriction();
    }
  }

  private _handleDblClick(): void {
    if (this._config!.action === "double_tap") {
      this._handleRestriction();
    }
  }

  private _handleHold() : void {
    if (this._config!.action === "hold") {
      this._handleRestriction();
    }
  }

  private _handleRestriction(): void {
    const lock = this.shadowRoot!.getElementById("lock") as LitElement;

    if (this._config!.restrictions) {
      if (this._matchRestriction(this._config!.restrictions.block)) {
        if (this._config!.restrictions!.block!.text) {
          alert(this._config!.restrictions!.block!.text);
        }

        lock.classList.add("invalid");
        window.setTimeout(() => {
          if (lock) {
            lock.classList.remove("invalid");
          }
        }, 3000);
        return;
      }

      if (this._matchRestriction(this._config!.restrictions.pin)) {
        const pin = prompt(
          this._config!.restrictions!.pin!.text || "Input pin code"
        );

        // tslint:disable-next-line: triple-equals
        if (pin != this._config!.restrictions!.pin!.code) {
          lock.classList.add("invalid");
          window.setTimeout(() => {
            if (lock) {
              lock.classList.remove("invalid");
            }
          }, 3000);
          return;
        }
      }

      if (this._matchRestriction(this._config!.restrictions.confirm)) {
        if (
          !confirm(
            this._config!.restrictions!.confirm!.text ||
              "Are you sure you want to unlock?"
          )
        ) {
          return;
        }
      }
    }

    const overlay = this.shadowRoot!.getElementById("overlay") as LitElement;
    overlay.style.setProperty("pointer-events", "none");
    lock.classList.add("hidden");
    window.setTimeout(() => {
      overlay.style.setProperty("pointer-events", "");
      if (lock) {
        lock.classList.remove("hidden");
      }
    }, this._config!.duration! * 1000);
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        position: relative;
        --regular-lock-color: var(
          --restriction-regular-lock-color,
          var(--primary-text-color, #212121)
        );
        --success-lock-color: var(
          --restriction-success-lock-color,
          var(--primary-color, #03a9f4)
        );
        --blocked-lock-color: var(
          --restriction-blocked-lock-color,
          var(--error-state-color, #db4437)
        );
        --invalid-lock-color: var(
          --restriction-invalid--color,
          var(--error-state-color, #db4437)
        );
        --lock-margin-left: var(--restriction-lock-margin-left, 0px);
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
        margin-left: 24px !important;
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
    "restriction-card": RestrictionCard;
  }
}
