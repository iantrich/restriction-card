import {
  LitElement,
  html,
  css,
  CSSResult,
  TemplateResult,
  customElement,
  property
} from "lit-element";
import { HomeAssistant } from "custom-card-helpers";

import { ConfirmationDialogParams } from "./show-dialog-confirmation";

@customElement("dialog-confirmation")
class DialogConfirmation extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _params?: ConfirmationDialogParams;

  public async showDialog(params: ConfirmationDialogParams): Promise<void> {
    this._params = params;
  }

  protected render(): TemplateResult | void {
    if (!this._params) {
      return html``;
    }

    return html`
      <ha-paper-dialog
        with-backdrop
        opened
        @opened-changed="${this._openedChanged}"
      >
        <h2>
          ${this._params.title}
        </h2>
        <paper-dialog-scrollable>
          <p>${this._params.text}</p>
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <mwc-button @click="${this._dismiss}">
            ${this._params.cancel || "Cancel"}
          </mwc-button>
          <mwc-button @click="${this._confirm}">
            ${this._params.okay || "Okay"}
          </mwc-button>
        </div>
      </ha-paper-dialog>
    `;
  }

  private async _dismiss(): Promise<void> {
    if (this._params!.dismiss) {
      this._params!.dismiss();
    }
    this._params = undefined;
  }

  private async _confirm(): Promise<void> {
    if (this._params!.confirm) {
      this._params!.confirm();
    }
    this._params = undefined;
  }

  private _openedChanged(ev): void {
    if (!(ev.detail as any).value) {
      this._params = undefined;
    }
  }

  static get styles(): CSSResult[] {
    return [
      css`
        /* prevent clipping of positioned elements */
        paper-dialog-scrollable {
          --paper-dialog-scrollable: {
            -webkit-overflow-scrolling: auto;
          }
        }

        /* force smooth scrolling for iOS 10 */
        paper-dialog-scrollable.can-scroll {
          --paper-dialog-scrollable: {
            -webkit-overflow-scrolling: touch;
          }
        }

        .paper-dialog-buttons {
          align-items: flex-end;
          padding: 8px;
        }

        .paper-dialog-buttons .warning {
          --mdc-theme-primary: var(--google-red-500);
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          paper-dialog,
          ha-paper-dialog {
            margin: 0;
            width: 100% !important;
            max-height: calc(100% - 64px);

            position: fixed !important;
            bottom: 0px;
            left: 0px;
            right: 0px;
            overflow: scroll;
            border-bottom-left-radius: 0px;
            border-bottom-right-radius: 0px;
          }
        }
        ha-paper-dialog {
          min-width: 400px;
          max-width: 500px;
        }
        @media (max-width: 400px) {
          ha-paper-dialog {
            min-width: initial;
          }
        }
        p {
          margin: 0;
          padding-top: 6px;
          padding-bottom: 24px;
          color: var(--primary-text-color);
        }
        .secondary {
          color: var(--secondary-text-color);
        }
      `
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-confirmation": DialogConfirmation;
  }
}
