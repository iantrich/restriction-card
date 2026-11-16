/* @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import type { RestrictionCardConfig } from './types';
import './editor';

interface EditorForTest extends HTMLElement {
  setConfig(config: RestrictionCardConfig): void;
  hass?: unknown;
  _openRestriction: string;
  updateComplete: Promise<boolean>;
}

interface SelectorForTest extends HTMLElement {
  label?: string;
  required?: boolean;
  value?: unknown;
}

const config: RestrictionCardConfig = {
  type: 'custom:restriction-card',
  card: { type: 'button', entity: 'light.kitchen' },
  condition: { entity: 'input_boolean.gate', operator: '==', value: 'on' },
  exemptions: [{ user: 'abc' }],
  restrictions: {
    block: { condition: { entity: 'input_boolean.gate', operator: '==', value: 'on' } },
    pin: { code: '1234' },
    confirm: {},
  },
};

const mountEditor = async (): Promise<EditorForTest> => {
  const editor = document.createElement('restriction-card-editor') as unknown as EditorForTest;
  editor.hass = { states: {}, localize: () => '' };
  editor.setConfig(config);
  document.body.appendChild(editor);
  await editor.updateComplete;
  return editor;
};

/** Collect every ha-selector currently rendered, keyed by label (attribute or property). */
const selectors = (editor: EditorForTest): Map<string, SelectorForTest> => {
  const map = new Map<string, SelectorForTest>();
  editor.shadowRoot!.querySelectorAll('ha-selector').forEach((el) => {
    const sel = el as SelectorForTest;
    const label = sel.getAttribute('label') ?? sel.label ?? '';
    map.set(label, sel);
  });
  return map;
};

const openRestriction = async (editor: EditorForTest, key: string): Promise<Map<string, SelectorForTest>> => {
  editor._openRestriction = key;
  await editor.updateComplete;
  return selectors(editor);
};

describe('restriction-card-editor field requirements', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  // ha-selector is required by default, which shows a "*" on the label
  const expectOptional = (fields: Map<string, SelectorForTest>, label: string) => {
    expect(fields.get(label), `missing field "${label}"`).toBeDefined();
    expect(fields.get(label)!.required, `"${label}" should be optional`).toBe(false);
  };
  const expectRequired = (fields: Map<string, SelectorForTest>, label: string) => {
    expect(fields.get(label), `missing field "${label}"`).toBeDefined();
    expect(fields.get(label)!.required, `"${label}" should be required`).not.toBe(false);
  };

  it('marks top-level optional fields as optional', async () => {
    const fields = selectors(await mountEditor());
    for (const label of [
      'Unlock trigger',
      'Unlock duration (seconds)',
      'Condition entity',
      'Operator',
      'Attribute (optional)',
    ]) {
      expectOptional(fields, label);
    }
    expectRequired(fields, 'Value');
    expectRequired(fields, 'User ID 1');
  });

  it('marks optional PIN fields as optional and keeps the code required', async () => {
    const editor = await mountEditor();
    const fields = await openRestriction(editor, 'pin');
    expectRequired(fields, 'PIN code(s) — one per line for multiple codes');
    for (const label of [
      'Prompt text (optional)',
      'Retry delay (seconds)',
      'Max retries (0 = unlimited)',
      'Lockout duration after max retries (seconds)',
    ]) {
      expectOptional(fields, label);
    }
  });

  it('shows the runtime default lockout duration when none is set', async () => {
    const editor = await mountEditor();
    const fields = await openRestriction(editor, 'pin');
    expect(fields.get('Lockout duration after max retries (seconds)')!.value).toBe(5);
  });

  it('marks block and confirm text as optional', async () => {
    const editor = await mountEditor();
    expectOptional(await openRestriction(editor, 'block'), 'Message shown when blocked (optional)');
    expectOptional(await openRestriction(editor, 'confirm'), 'Confirm dialog text (optional)');
  });
});
