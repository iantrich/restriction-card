import{_ as a,p as i,c as o,L as t,h as r,a as s}from"./lit-element-bc66e600.js";let e=class extends t{async showDialog(a){this._params=a}render(){return this._params?r`
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
            ${this._params.cancel||"Cancel"}
          </mwc-button>
          <mwc-button @click="${this._confirm}">
            ${this._params.okay||"Okay"}
          </mwc-button>
        </div>
      </ha-paper-dialog>
    `:r``}async _dismiss(){this._params.dismiss&&this._params.dismiss(),this._params=void 0}async _confirm(){this._params.confirm&&this._params.confirm(),this._params=void 0}_openedChanged(a){a.detail.value||(this._params=void 0)}static get styles(){return[s`
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
      `]}};a([i()],e.prototype,"hass",void 0),a([i()],e.prototype,"_params",void 0),e=a([o("dialog-confirmation")],e);
