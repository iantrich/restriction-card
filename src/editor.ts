/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css } from 'lit';
import { HomeAssistant, fireEvent, LovelaceCardEditor, LovelaceCardConfig } from 'custom-card-helpers';
import { property, state } from 'lit/decorators.js';
import {
  RestrictionCardConfig,
  ConditionConfig,
  ExemptionConfig,
  PinRestrictionConfig,
  ConfirmRestrictionConfig,
  BlockRestrictionConfig,
  HideRestrictionConfig,
  RestrictionBaseConfig,
} from './types';

// ---------------------------------------------------------------------------
// Types for sub-sections
// ---------------------------------------------------------------------------

type RestrictionKey = 'confirm' | 'pin' | 'block' | 'hide';

const OPERATORS = ['==', '!=', '<', '<=', '>', '>=', 'regex'] as const;

// ---------------------------------------------------------------------------
// Editor element
// ---------------------------------------------------------------------------

export class RestrictionCardEditor extends LitElement implements LovelaceCardEditor {
  private _hass!: HomeAssistant;

  @property({ attribute: false })
  get hass(): HomeAssistant {
    return this._hass;
  }
  set hass(hass: HomeAssistant) {
    this._hass = hass;
    // Push hass updates to the sub-card editor if loaded.
    if (this._cardEditorElement) {
      (this._cardEditorElement as any).hass = hass;
    }
  }

  @state() private _config?: RestrictionCardConfig;

  /** Track which top-level accordion is open. */
  @state() private _openSection = 'card';

  /** Track which restriction sub-section is open. */
  @state() private _openRestriction = '';

  /** Dynamically-loaded sub-card editor element (the inner card's own visual editor). */
  @state() private _cardEditorElement?: HTMLElement;

  /** Card type for which the current _cardEditorElement was loaded. */
  private _cardEditorType?: string;

  /** Error string when sub-card editor fails to load. */
  @state() private _cardEditorError?: string;

  // -------------------------------------------------------------------------
  // LovelaceCardEditor interface
  // -------------------------------------------------------------------------

  public setConfig(config: RestrictionCardConfig): void {
    this._config = structuredClone(config);
    this.requestUpdate();
  }

  protected shouldUpdate(): boolean {
    return true;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  protected render(): TemplateResult | void {
    if (!this._config) {
      return html`<div>Loading...</div>`;
    }

    return html`
      ${this._config.row ? '' : this._renderSection('card', 'Card', this._renderCardSection())}
      ${this._renderSection('options', 'Options', this._renderOptionsSection())}
      ${this._renderSection('restrictions', 'Restrictions', this._renderRestrictionsSection())}
      ${this._renderSection(
        'condition',
        'Global Condition',
        this._renderConditionFields(this._config.condition, (cond) => this._updateTop('condition', cond || undefined)),
      )}
      ${this._renderSection(
        'exemptions',
        'Global Exemptions',
        this._renderExemptionsFields(this._config.exemptions, (exs) =>
          this._updateTop('exemptions', exs?.length ? exs : undefined),
        ),
      )}
    `;
  }

  // -------------------------------------------------------------------------
  // Section renderers
  // -------------------------------------------------------------------------

  /** Nested card — card type picker + dynamic sub-card editor. */
  private _renderCardSection(): TemplateResult {
    const cardConfig = this._config?.card;
    const cardType = cardConfig?.type ?? '';

    return html`
      <p class="hint">Choose the card to protect with restriction logic.</p>
      <ha-textfield
        label="Card type (e.g. button, entities, custom:mushroom-entity-card)"
        .value=${cardType}
        @input=${this._cardTypeChanged}
      ></ha-textfield>
      ${cardType ? this._renderSubCardEditor(cardConfig!) : ''}
    `;
  }

  /** Render the sub-card's own visual editor, or a fallback message. */
  private _renderSubCardEditor(cardConfig: LovelaceCardConfig): TemplateResult {
    // Lazily load / swap the sub-card editor when type changes.
    if (cardConfig.type !== this._cardEditorType) {
      this._loadSubCardEditor(cardConfig);
    }

    if (this._cardEditorError) {
      return html`<p class="hint">${this._cardEditorError}</p>`;
    }

    if (!this._cardEditorElement) {
      return html`<p class="hint">Loading editor…</p>`;
    }

    return html`${this._cardEditorElement}`;
  }

  /** Dynamically load the inner card's editor element. */
  private async _loadSubCardEditor(cardConfig: LovelaceCardConfig): Promise<void> {
    const type = cardConfig.type;
    // Avoid re-loading for the same type.
    if (type === this._cardEditorType) return;
    this._cardEditorType = type;
    this._cardEditorElement = undefined;
    this._cardEditorError = undefined;

    try {
      // Determine the editor element tag name.
      let tag: string;
      if (type.startsWith('custom:')) {
        // Custom card editors follow the convention: <card-tag>-editor
        tag = type.replace(/^custom:/, '') + '-editor';
      } else {
        // Built-in HA cards: hui-<type>-card-editor
        tag = `hui-${type}-card-editor`;
      }

      // Ensure the element is defined (HA lazy-loads most editors).
      if (!customElements.get(tag)) {
        // Try loading via card helpers — creating a card element triggers HA's
        // lazy-load of the card and its editor module.
        const helpers = await (window as any).loadCardHelpers?.();
        if (helpers) {
          try {
            const tmpCard = await helpers.createCardElement(cardConfig);
            // Some cards register their editor in a static getter.
            if (tmpCard?.constructor?.getConfigElement) {
              const editorEl = await tmpCard.constructor.getConfigElement();
              if (editorEl) {
                tag = editorEl.localName ?? tag;
              }
            }
          } catch {
            // ignore — we'll fall back below
          }
        }
        // Wait for the custom element to register, with a timeout so we don't hang forever.
        await Promise.race([customElements.whenDefined(tag), new Promise((resolve) => setTimeout(resolve, 5000))]);
      }

      if (!customElements.get(tag)) {
        this._cardEditorError = `No visual editor found for "${type}". Edit the card YAML directly in the code editor.`;
        return;
      }

      const el = document.createElement(tag);
      (el as any).hass = this.hass;
      (el as any).setConfig?.(cardConfig);
      el.addEventListener('config-changed', ((ev: CustomEvent) => {
        ev.stopPropagation();
        if (!this._config) return;
        this._config = { ...this._config, card: ev.detail.config };
        fireEvent(this, 'config-changed', { config: this._config });
      }) as EventListener);

      this._cardEditorElement = el;
    } catch (err) {
      this._cardEditorError = `Failed to load editor for "${type}": ${err}`;
    }
  }

  private _renderOptionsSection(): TemplateResult {
    return html`
      <!-- Unlock trigger -->
      <ha-selector
        .hass=${this.hass}
        .selector=${{
          select: {
            options: [
              { value: 'tap', label: 'Tap' },
              { value: 'double_tap', label: 'Double tap' },
              { value: 'hold', label: 'Hold' },
            ],
            mode: 'list',
          },
        }}
        .value=${this._config?.action ?? 'tap'}
        label="Unlock trigger"
        .configValue=${'action'}
        @value-changed=${this._selectorChanged}
      ></ha-selector>

      <!-- Unlock duration -->
      <ha-selector
        .hass=${this.hass}
        .selector=${{ number: { min: 1, max: 600, step: 1, unit_of_measurement: 's', mode: 'box' } }}
        .value=${this._config?.duration ?? 5}
        label="Unlock duration (seconds)"
        .configValue=${'duration'}
        @value-changed=${this._selectorChanged}
      ></ha-selector>

      <!-- Row mode -->
      <ha-formfield label="Row mode (entity row instead of card)">
        <ha-switch
          .checked=${this._config?.row ?? false}
          .configValue=${'row'}
          @change=${this._switchChanged}
        ></ha-switch>
      </ha-formfield>

      <!-- Icons -->
      <ha-icon-picker
        .hass=${this.hass}
        .value=${this._config?.locked_icon ?? 'mdi:lock-outline'}
        label="Locked icon"
        .configValue=${'locked_icon'}
        @value-changed=${this._valueChanged}
      ></ha-icon-picker>

      <ha-icon-picker
        .hass=${this.hass}
        .value=${this._config?.unlocked_icon ?? ''}
        label="Unlocked icon (optional — defaults to fading away)"
        .configValue=${'unlocked_icon'}
        @value-changed=${this._valueChanged}
      ></ha-icon-picker>

      <!-- Force generic dialog -->
      <ha-formfield label="Use browser prompt for PIN (not HA dialog)">
        <ha-switch
          .checked=${this._config?.force_generic_dialog ?? false}
          .configValue=${'force_generic_dialog'}
          @change=${this._switchChanged}
        ></ha-switch>
      </ha-formfield>`;
  }

  private _renderRestrictionsSection(): TemplateResult {
    const restrictions = this._config?.restrictions ?? {};

    return html`
      <p class="hint">
        Enable one or more restriction types. Restrictions are evaluated in order: hide → block → pin → confirm.
      </p>

      ${this._renderRestrictionSubSection('hide', 'Hide', restrictions.hide, this._renderHideFields.bind(this))}
      ${this._renderRestrictionSubSection('block', 'Block', restrictions.block, this._renderBlockFields.bind(this))}
      ${this._renderRestrictionSubSection('pin', 'PIN', restrictions.pin, this._renderPinFields.bind(this))}
      ${this._renderRestrictionSubSection(
        'confirm',
        'Confirm',
        restrictions.confirm,
        this._renderConfirmFields.bind(this),
      )}
    `;
  }

  // -------------------------------------------------------------------------
  // Restriction sub-section helpers
  // -------------------------------------------------------------------------

  private _renderRestrictionSubSection(
    key: RestrictionKey,
    title: string,
    current: RestrictionBaseConfig | PinRestrictionConfig | undefined,

    renderFields: (key: any, config: any) => TemplateResult,
  ): TemplateResult {
    const enabled = current !== undefined;
    const isOpen = this._openRestriction === key && enabled;
    return html`
      <div class="restriction-row">
        <ha-formfield .label=${title}>
          <ha-switch
            .checked=${enabled}
            @change=${(ev: Event) => this._toggleRestriction(key, (ev.target as HTMLInputElement).checked)}
          ></ha-switch>
        </ha-formfield>
        ${enabled
          ? html`
              <button
                type="button"
                class="sub-accordion__header"
                @click=${() => this._toggleRestrictionOpen(key)}
                aria-expanded=${isOpen}
              >
                <span>${isOpen ? 'Hide settings' : 'Show settings'}</span>
                <ha-icon icon=${isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}></ha-icon>
              </button>
            `
          : ''}
      </div>
      ${enabled && isOpen ? html` <div class="sub-accordion__content">${renderFields(key, current)}</div> ` : ''}
    `;
  }

  private _renderHideFields(key: 'hide', config: HideRestrictionConfig): TemplateResult {
    return html`
      ${this._renderConditionFields(config.condition, (cond) =>
        this._updateRestriction(key, { ...config, condition: cond || undefined }),
      )}
      ${this._renderExemptionsFields(config.exemptions, (exs) =>
        this._updateRestriction(key, { ...config, exemptions: exs?.length ? exs : undefined }),
      )}
    `;
  }

  private _renderBlockFields(key: 'block', config: BlockRestrictionConfig): TemplateResult {
    return html`
      <ha-textfield
        label="Message shown when blocked (optional)"
        .value=${config.text ?? ''}
        @input=${(ev: InputEvent) =>
          this._updateRestriction(key, {
            ...config,
            text: (ev.target as HTMLInputElement).value || undefined,
          })}
      ></ha-textfield>
      ${this._renderConditionFields(config.condition, (cond) =>
        this._updateRestriction(key, { ...config, condition: cond || undefined }),
      )}
      ${this._renderExemptionsFields(config.exemptions, (exs) =>
        this._updateRestriction(key, { ...config, exemptions: exs?.length ? exs : undefined }),
      )}
    `;
  }

  private _renderPinFields(key: 'pin', config: PinRestrictionConfig): TemplateResult {
    // Normalise code to a newline-separated string for the textarea
    const codeRaw = config.code ?? '';
    const codeText = Array.isArray(codeRaw) ? codeRaw.join('\n') : String(codeRaw);

    return html`
      <ha-textfield
        label="PIN code(s) — one per line for multiple codes"
        .value=${codeText}
        helper-text="Enter one or more valid PIN codes. Each line is a separate code."
        @input=${(ev: InputEvent) => {
          const raw = (ev.target as HTMLInputElement).value;
          const lines = raw
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean);
          const code = lines.length === 1 ? lines[0] : lines;
          this._updateRestriction(key, { ...config, code });
        }}
      ></ha-textfield>

      <ha-textfield
        label="Prompt text (optional)"
        .value=${config.text ?? ''}
        @input=${(ev: InputEvent) =>
          this._updateRestriction(key, {
            ...config,
            text: (ev.target as HTMLInputElement).value || undefined,
          })}
      ></ha-textfield>

      <ha-selector
        .hass=${this.hass}
        .selector=${{ number: { min: 0, max: 300, step: 1, unit_of_measurement: 's', mode: 'box' } }}
        .value=${config.retry_delay ?? 0}
        label="Retry delay (seconds)"
        @value-changed=${(ev: CustomEvent) =>
          this._updateRestriction(key, { ...config, retry_delay: ev.detail.value || undefined })}
      ></ha-selector>

      <ha-selector
        .hass=${this.hass}
        .selector=${{ number: { min: 0, max: 100, step: 1, mode: 'box' } }}
        .value=${config.max_retries ?? 0}
        label="Max retries (0 = unlimited)"
        @value-changed=${(ev: CustomEvent) =>
          this._updateRestriction(key, { ...config, max_retries: ev.detail.value || undefined })}
      ></ha-selector>

      <ha-selector
        .hass=${this.hass}
        .selector=${{ number: { min: 0, max: 3600, step: 1, unit_of_measurement: 's', mode: 'box' } }}
        .value=${config.max_retries_delay ?? 0}
        label="Lockout duration after max retries (seconds)"
        @value-changed=${(ev: CustomEvent) =>
          this._updateRestriction(key, {
            ...config,
            max_retries_delay: ev.detail.value || undefined,
          })}
      ></ha-selector>

      ${this._renderConditionFields(config.condition, (cond) =>
        this._updateRestriction(key, { ...config, condition: cond || undefined }),
      )}
      ${this._renderExemptionsFields(config.exemptions, (exs) =>
        this._updateRestriction(key, { ...config, exemptions: exs?.length ? exs : undefined }),
      )}
    `;
  }

  private _renderConfirmFields(key: 'confirm', config: ConfirmRestrictionConfig): TemplateResult {
    return html`
      <ha-textfield
        label="Confirm dialog text (optional)"
        .value=${config.text ?? ''}
        @input=${(ev: InputEvent) =>
          this._updateRestriction(key, {
            ...config,
            text: (ev.target as HTMLInputElement).value || undefined,
          })}
      ></ha-textfield>
      ${this._renderConditionFields(config.condition, (cond) =>
        this._updateRestriction(key, { ...config, condition: cond || undefined }),
      )}
      ${this._renderExemptionsFields(config.exemptions, (exs) =>
        this._updateRestriction(key, { ...config, exemptions: exs?.length ? exs : undefined }),
      )}
    `;
  }

  // -------------------------------------------------------------------------
  // Shared field renderers: condition & exemptions
  // -------------------------------------------------------------------------

  private _renderConditionFields(
    condition: ConditionConfig | undefined,
    onChange: (cond: ConditionConfig | null) => void,
  ): TemplateResult {
    return html`
      <div class="subsection-label">Condition (optional)</div>
      <ha-selector
        .hass=${this.hass}
        .selector=${{ entity: {} }}
        .value=${condition?.entity ?? ''}
        label="Condition entity"
        @value-changed=${(ev: CustomEvent) => {
          if (!condition && !ev.detail.value) return;
          onChange(ev.detail.value ? { ...this._emptyCondition(condition), entity: ev.detail.value } : null);
        }}
      ></ha-selector>
      ${condition?.entity
        ? html`
            <ha-selector
              .hass=${this.hass}
              .selector=${{
                select: {
                  options: OPERATORS.map((o) => ({ value: o, label: o })),
                  mode: 'dropdown',
                },
              }}
              .value=${condition?.operator ?? '=='}
              label="Operator"
              @value-changed=${(ev: CustomEvent) =>
                onChange({ ...this._emptyCondition(condition), operator: ev.detail.value })}
            ></ha-selector>
            <ha-textfield
              label="Value"
              .value=${condition?.value ?? ''}
              @input=${(ev: InputEvent) =>
                onChange({
                  ...this._emptyCondition(condition),
                  value: (ev.target as HTMLInputElement).value,
                })}
            ></ha-textfield>
            <ha-textfield
              label="Attribute (optional)"
              .value=${condition?.attribute ?? ''}
              @input=${(ev: InputEvent) =>
                onChange({
                  ...this._emptyCondition(condition),
                  attribute: (ev.target as HTMLInputElement).value || undefined,
                })}
            ></ha-textfield>
          `
        : ''}
    `;
  }

  private _emptyCondition(existing?: ConditionConfig): ConditionConfig {
    return {
      entity: existing?.entity ?? '',
      operator: existing?.operator ?? '==',
      value: existing?.value ?? '',
      attribute: existing?.attribute,
    };
  }

  private _renderExemptionsFields(
    exemptions: ExemptionConfig[] | undefined,
    onChange: (exs: ExemptionConfig[] | null) => void,
  ): TemplateResult {
    const list = exemptions ?? [];
    return html`
      <div class="subsection-label">Exemptions (optional)</div>
      ${list.map(
        (ex, i) => html`
          <div class="exemption-row">
            <ha-textfield
              label="User ID ${i + 1}"
              .value=${ex.user}
              @input=${(ev: InputEvent) => {
                const updated = [...list];
                updated[i] = { user: (ev.target as HTMLInputElement).value };
                onChange(updated);
              }}
            ></ha-textfield>
            <ha-icon-button
              .label=${'Remove'}
              @click=${() => {
                const updated = list.filter((_, idx) => idx !== i);
                onChange(updated.length ? updated : null);
              }}
            >
              <ha-icon icon="mdi:delete"></ha-icon>
            </ha-icon-button>
          </div>
        `,
      )}
      <mwc-button @click=${() => onChange([...list, { user: '' }])}>
        <ha-icon icon="mdi:plus"></ha-icon>
        Add exemption
      </mwc-button>
    `;
  }

  // -------------------------------------------------------------------------
  // Accordion helpers
  // -------------------------------------------------------------------------

  private _renderSection(id: string, title: string, content: TemplateResult): TemplateResult {
    const isOpen = this._openSection === id;
    return html`
      <div class="accordion ${isOpen ? 'accordion--open' : ''}">
        <button
          type="button"
          class="accordion__header"
          @click=${(ev: Event) => this._toggleSection(ev, id)}
          aria-expanded=${isOpen}
        >
          <span>${title}</span>
          <ha-icon icon=${isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}></ha-icon>
        </button>
        <div class="accordion__body">
          <div class="accordion__content">${content}</div>
        </div>
      </div>
    `;
  }

  private _toggleSection(ev: Event, id: string): void {
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    this._openSection = this._openSection === id ? '' : id;
    this.requestUpdate();
  }

  private _toggleRestrictionOpen(key: RestrictionKey): void {
    this._openRestriction = this._openRestriction === key ? '' : key;
    this.requestUpdate();
  }

  // -------------------------------------------------------------------------
  // Config mutators
  // -------------------------------------------------------------------------

  /** Called when the card type text field changes. */
  private _cardTypeChanged(ev: InputEvent): void {
    ev.stopPropagation();
    if (!this._config) return;
    const type = ((ev.target as HTMLInputElement).value ?? '').trim();
    if (!type) {
      // Remove the card config entirely when type is cleared.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { card: _, ...rest } = this._config;
      this._config = rest as RestrictionCardConfig;
      this._cardEditorElement = undefined;
      this._cardEditorType = undefined;
      this._cardEditorError = undefined;
    } else {
      this._config = {
        ...this._config,
        card: { ...(this._config.card ?? {}), type },
      };
    }
    fireEvent(this, 'config-changed', { config: this._config });
    this.requestUpdate();
  }

  /** Toggle a restriction type on/off. */
  private _toggleRestriction(key: RestrictionKey, enabled: boolean): void {
    if (!this._config) return;
    const restrictions = { ...(this._config.restrictions ?? {}) };

    if (enabled) {
      // Provide a minimal default for the newly enabled restriction
      if (key === 'pin') {
        (restrictions as any)[key] = { code: '' };
      } else {
        (restrictions as any)[key] = {};
      }
      this._openRestriction = key;
    } else {
      delete (restrictions as any)[key];
      if (this._openRestriction === key) this._openRestriction = '';
    }

    const hasAny = Object.keys(restrictions).length > 0;
    this._config = {
      ...this._config,
      restrictions: hasAny ? restrictions : undefined,
    };
    fireEvent(this, 'config-changed', { config: this._config });
    this.requestUpdate();
  }

  /** Update a specific restriction's config object. */
  private _updateRestriction(key: RestrictionKey, value: RestrictionBaseConfig | PinRestrictionConfig): void {
    if (!this._config) return;
    this._config = {
      ...this._config,
      restrictions: {
        ...(this._config.restrictions ?? {}),
        [key]: value,
      },
    };
    fireEvent(this, 'config-changed', { config: this._config });
    this.requestUpdate();
  }

  /** Update a top-level config key. */
  private _updateTop(key: keyof RestrictionCardConfig, value: unknown): void {
    if (!this._config) return;
    if (value === undefined || value === null || value === '') {
      const copy = { ...this._config };
      delete (copy as any)[key];
      this._config = copy;
    } else {
      this._config = { ...this._config, [key]: value };
    }
    fireEvent(this, 'config-changed', { config: this._config });
    this.requestUpdate();
  }

  /** ha-selector value-changed → scalar config key. */
  private _selectorChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const target = ev.target as any;
    const configValue = target.configValue as keyof RestrictionCardConfig;
    if (!configValue || !this._config) return;
    this._updateTop(configValue, ev.detail.value);
  }

  /** ha-icon-picker / ha-textfield value-changed → scalar config key. */
  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const target = ev.target as any;
    const configValue = target.configValue as keyof RestrictionCardConfig;
    if (!configValue || !this._config) return;
    this._updateTop(configValue, ev.detail.value ?? (target as HTMLInputElement).value);
  }

  /** ha-switch change → boolean config key. */
  private _switchChanged(ev: Event): void {
    const target = ev.target as HTMLInputElement & { configValue?: keyof RestrictionCardConfig };
    if (!target.configValue || !this._config) return;
    this._updateTop(target.configValue, target.checked);
  }

  // -------------------------------------------------------------------------
  // Styles
  // -------------------------------------------------------------------------

  static get styles() {
    return css`
      ha-selector,
      ha-textfield,
      ha-icon-picker,
      ha-formfield,
      mwc-button {
        display: block;
        margin-bottom: 12px;
      }

      ha-formfield {
        padding: 8px 0;
        margin-bottom: 4px;
      }

      /* ── Top-level accordion ── */
      .accordion {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        margin-bottom: 8px;
        overflow: hidden;
      }

      .accordion__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 12px 16px;
        background: var(--secondary-background-color);
        border: none;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: var(--primary-text-color);
        text-align: left;
        transition: background 0.15s ease;
      }

      .accordion__header:hover {
        background: var(--divider-color);
      }

      .accordion--open .accordion__header {
        border-bottom: 1px solid var(--divider-color);
      }

      .accordion__body {
        display: grid;
        grid-template-rows: 0fr;
        transition: grid-template-rows 0.25s ease;
      }

      .accordion--open .accordion__body {
        grid-template-rows: 1fr;
      }

      .accordion__content {
        overflow: hidden;
        padding: 0 16px;
      }

      .accordion--open .accordion__content {
        padding: 16px;
      }

      /* ── Restriction row ── */
      .restriction-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        flex-wrap: wrap;
      }

      .restriction-row ha-formfield {
        flex: 1;
        margin-bottom: 0;
        padding: 0;
      }

      /* ── Restriction sub-accordion trigger ── */
      .sub-accordion__header {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        border: 1px solid var(--divider-color);
        border-radius: 16px;
        background: none;
        cursor: pointer;
        font-size: 12px;
        color: var(--secondary-text-color);
      }

      .sub-accordion__content {
        padding: 12px;
        margin-bottom: 8px;
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        background: var(--secondary-background-color);
      }

      /* ── Exemption row ── */
      .exemption-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .exemption-row ha-textfield {
        flex: 1;
        margin-bottom: 0;
      }

      /* ── Subsection labels ── */
      .subsection-label {
        font-size: 12px;
        font-weight: 500;
        color: var(--secondary-text-color);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin: 12px 0 8px;
      }

      /* ── Hints ── */
      .hint {
        font-size: 13px;
        color: var(--secondary-text-color);
        margin: 0 0 12px;
        line-height: 1.4;
      }

      hui-card-element-editor {
        display: block;
      }
    `;
  }
}

// Fallback explicit registration
if (!customElements.get('restriction-card-editor')) {
  customElements.define('restriction-card-editor', RestrictionCardEditor);
}
