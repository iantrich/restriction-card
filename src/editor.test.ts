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
    expectRequired(fields, 'Shared PIN code(s) — one per line');
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

describe('restriction-card-editor per-user pin codes', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const mountWithCode = async (code: unknown) => {
    const editor = document.createElement('restriction-card-editor') as unknown as EditorForTest;
    editor.hass = { states: {}, localize: () => '' };
    editor.setConfig({ ...config, restrictions: { pin: { code } } } as RestrictionCardConfig);
    document.body.appendChild(editor);
    await editor.updateComplete;
    const changes: RestrictionCardConfig[] = [];
    editor.addEventListener('config-changed', (ev) => {
      changes.push((ev as CustomEvent<{ config: RestrictionCardConfig }>).detail.config);
    });
    const fields = await openRestriction(editor, 'pin');
    const lastCode = () => changes[changes.length - 1]?.restrictions?.pin?.code;
    return { editor, fields, lastCode };
  };

  const change = (field: SelectorForTest | undefined, value: string) =>
    field!.dispatchEvent(new CustomEvent('value-changed', { detail: { value } }));

  it('renders shared and per-user codes in separate fields', async () => {
    const { fields } = await mountWithCode(['0000', { user: 'alice', code: ['1111', 2222] }]);
    expect(fields.get('Shared PIN code(s) — one per line')!.value).toBe('0000');
    expect(fields.get('PIN user ID 1')!.value).toBe('alice');
    expect(fields.get('PIN code(s) for user 1')!.value).toBe('1111\n2222');
  });

  it('edits shared codes and keeps per-user entries', async () => {
    const { fields, lastCode } = await mountWithCode(['0000', { user: 'alice', code: '1111' }]);
    change(fields.get('Shared PIN code(s) — one per line'), '0000\n9999');
    expect(lastCode()).toEqual(['0000', '9999', { user: 'alice', code: '1111' }]);
  });

  it('edits a user’s id and codes', async () => {
    const { editor, fields, lastCode } = await mountWithCode([{ user: 'alice', code: '1111' }]);
    change(fields.get('PIN user ID 1'), ' bob ');
    expect(lastCode()).toEqual([{ user: 'bob', code: '1111' }]);
    await editor.updateComplete;
    change(selectors(editor).get('PIN code(s) for user 1'), '3333\n4444');
    expect(lastCode()).toEqual([{ user: 'bob', code: ['3333', '4444'] }]);
  });

  it('makes shared codes optional only when per-user codes exist', async () => {
    const withUsers = await mountWithCode([{ user: 'alice', code: '1111' }]);
    expect(withUsers.fields.get('Shared PIN code(s) — one per line')!.required).toBe(false);
    document.body.innerHTML = '';
    const sharedOnly = await mountWithCode('1234');
    expect(sharedOnly.fields.get('Shared PIN code(s) — one per line')!.required).toBe(true);
  });

  it('adds and removes per-user rows', async () => {
    const { editor, lastCode } = await mountWithCode('1234');
    const button = [...editor.shadowRoot!.querySelectorAll('ha-button')].find((b) =>
      b.textContent?.includes('Add per-user code'),
    ) as HTMLElement;
    button.click();
    expect(lastCode()).toEqual(['1234', { user: '', code: '' }]);
    await editor.updateComplete;
    (editor.shadowRoot!.querySelector('.user-pin-row ha-icon-button') as HTMLElement).click();
    expect(lastCode()).toBe('1234');
  });
});
