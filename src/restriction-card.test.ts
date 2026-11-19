/* @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PropertyValues } from 'lit';
import type { HomeAssistant } from 'custom-card-helpers';
import type { RestrictionCardConfig } from './types';
import './restriction-card';

interface RestrictionCardElementForTest extends HTMLElement {
  _initialized: boolean;
  _hass?: HomeAssistant;
  _config?: RestrictionCardConfig;
  shouldUpdate(changedProps: PropertyValues): boolean;
}

const createHass = (sensorState: string): HomeAssistant =>
  ({
    states: {
      'binary_sensor.test': { state: sensorState },
    },
  }) as unknown as HomeAssistant;

const createHassWithEntityState = (entityState: { state: string }): HomeAssistant =>
  ({
    states: {
      'binary_sensor.test': entityState,
    },
  }) as unknown as HomeAssistant;

const createBaseConfig = (): RestrictionCardConfig => ({
  type: 'custom:restriction-card',
  card: {
    type: 'entity',
    entity: 'binary_sensor.test',
  },
});

const createCard = (): RestrictionCardElementForTest => {
  const card = document.createElement('restriction-card') as unknown as RestrictionCardElementForTest;
  card._initialized = true;
  card._config = createBaseConfig();
  card._hass = createHass('on');
  return card;
};

const changedProps = (entries: Array<[PropertyKey, unknown]>): PropertyValues => new Map(entries);

describe('restriction-card shouldUpdate', () => {
  it('returns true when config changed', () => {
    const card = createCard();

    expect(
      card.shouldUpdate(
        changedProps([
          ['_config', {}],
          ['_hass', createHass('off')],
        ]),
      ),
    ).toBe(true);
  });

  it('returns true when old hass is missing', () => {
    const card = createCard();

    expect(card.shouldUpdate(changedProps([]))).toBe(true);
  });

  it('returns true when top-level condition entity state changed', () => {
    const card = createCard();
    card._config = {
      ...createBaseConfig(),
      condition: {
        entity: 'binary_sensor.test',
        operator: '==',
        value: 'on',
      },
    };

    const previousHass = createHass('on');
    (card as RestrictionCardElementForTest & { hass?: HomeAssistant }).hass = createHass('off');

    expect(card.shouldUpdate(changedProps([['hass', previousHass]]))).toBe(true);
  });

  it('returns true when block restriction condition entity state changed', () => {
    const card = createCard();
    card._config = {
      ...createBaseConfig(),
      restrictions: {
        block: {
          condition: {
            entity: 'binary_sensor.test',
            operator: '==',
            value: 'on',
          },
        },
      },
    };
    card._hass = createHass('off');

    expect(card.shouldUpdate(changedProps([['hass', createHass('on')]]))).toBe(true);
  });

  it('returns true when hide restriction condition entity state changed', () => {
    const card = createCard();
    card._config = {
      ...createBaseConfig(),
      restrictions: {
        hide: {
          condition: {
            entity: 'binary_sensor.test',
            operator: '==',
            value: 'on',
          },
        },
      },
    };
    card._hass = createHass('off');

    expect(card.shouldUpdate(changedProps([['hass', createHass('on')]]))).toBe(true);
  });

  it('returns false when watched entity object did not change', () => {
    const card = createCard();
    const sameStateObject = { state: 'on' };
    card._config = {
      ...createBaseConfig(),
      condition: {
        entity: 'binary_sensor.test',
        operator: '==',
        value: 'on',
      },
    };
    card._hass = createHassWithEntityState(sameStateObject);

    expect(card.shouldUpdate(changedProps([['hass', createHassWithEntityState(sameStateObject)]]))).toBe(false);
  });
});

describe('restriction-card shouldUpdate with multiple condition entities', () => {
  it('returns true when a non-first condition entity changed', () => {
    const card = createCard();
    card._config = {
      ...createBaseConfig(),
      condition: { entity: 'binary_sensor.test', operator: '==', value: 'on' },
      restrictions: {
        block: { condition: { entity: 'binary_sensor.other', operator: '==', value: 'on' } },
      },
    };
    const shared = { state: 'on' };
    const previousHass = {
      states: { 'binary_sensor.test': shared, 'binary_sensor.other': { state: 'off' } },
    } as unknown as HomeAssistant;
    card._hass = {
      states: { 'binary_sensor.test': shared, 'binary_sensor.other': { state: 'on' } },
    } as unknown as HomeAssistant;

    expect(card.shouldUpdate(changedProps([['hass', previousHass]]))).toBe(true);
  });
});

interface PinTestCard extends HTMLElement {
  setConfig(config: RestrictionCardConfig): void;
  hass: HomeAssistant;
  _helpers?: unknown;
  _unlocked: boolean;
  _retries: number;
  _handleRestriction(): Promise<void>;
  updateComplete: Promise<boolean>;
}

const pinConfig = (code: string | string[], extra: Record<string, unknown> = {}): RestrictionCardConfig => ({
  ...createBaseConfig(),
  restrictions: { pin: { code, ...extra } },
});

const mountPinCard = async (
  config: RestrictionCardConfig,
  enteredPin: string | null,
  userId?: string,
): Promise<PinTestCard> => {
  const card = document.createElement('restriction-card') as unknown as PinTestCard;
  card.setConfig(config);
  card._helpers = {
    createCardElement: () => document.createElement('div'),
    createRowElement: () => document.createElement('div'),
    showEnterCodeDialog: vi.fn().mockResolvedValue(enteredPin),
  };
  card.hass = { ...createHass('on'), user: userId ? { id: userId } : undefined } as unknown as HomeAssistant;
  document.body.appendChild(card);
  await card.updateComplete;
  return card;
};

describe('restriction-card pin restriction', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it.each([[''], [[]], [['', '  '.trim()]]])('rejects empty pin code %j in setConfig', (code) => {
    const card = document.createElement('restriction-card') as unknown as PinTestCard;
    expect(() => card.setConfig(pinConfig(code as string | string[]))).toThrow('A pin code is required');
  });

  it('unlocks with a correct single code (numeric YAML value)', async () => {
    const card = await mountPinCard(pinConfig(1234 as unknown as string), '1234');
    await card._handleRestriction();
    expect(card._unlocked).toBe(true);
  });

  it('unlocks with any code from a list', async () => {
    const card = await mountPinCard(pinConfig(['1111', '2222']), '2222');
    await card._handleRestriction();
    expect(card._unlocked).toBe(true);
  });

  it('stays locked with a wrong code and counts the retry', async () => {
    const card = await mountPinCard(pinConfig(['1111', '2222'], { max_retries: 3 }), '9999');
    await card._handleRestriction();
    expect(card._unlocked).toBe(false);
    expect(card._retries).toBe(1);
  });

  describe('per-user codes', () => {
    const perUser = (extra: Record<string, unknown> = {}): RestrictionCardConfig =>
      pinConfig(
        [
          { user: 'alice', code: '1111' },
          { user: 'bob', code: ['2222', 3333] },
        ] as unknown as string[],
        extra,
      );

    it('unlocks a user with their own code', async () => {
      const card = await mountPinCard(perUser(), '1111', 'alice');
      await card._handleRestriction();
      expect(card._unlocked).toBe(true);
    });

    it('accepts any of a user’s listed codes, including numeric ones', async () => {
      const card = await mountPinCard(perUser(), '3333', 'bob');
      await card._handleRestriction();
      expect(card._unlocked).toBe(true);
    });

    it('rejects another user’s code', async () => {
      const card = await mountPinCard(perUser({ max_retries: 3 }), '2222', 'alice');
      await card._handleRestriction();
      expect(card._unlocked).toBe(false);
      expect(card._retries).toBe(1);
    });

    it('still accepts shared codes alongside per-user codes', async () => {
      const config = pinConfig(['0000', { user: 'alice', code: '1111' }] as unknown as string[]);
      const card = await mountPinCard(config, '0000', 'carol');
      await card._handleRestriction();
      expect(card._unlocked).toBe(true);
    });

    it('renders the card as blocked for a user with no applicable code', async () => {
      const card = await mountPinCard(perUser(), null, 'carol');
      expect(card.shadowRoot!.getElementById('overlay')!.classList.contains('blocked')).toBe(true);
      expect(card.shadowRoot!.getElementById('lock')!.classList.contains('icon-blocked')).toBe(true);
    });

    it('renders the card as locked (not blocked) for a listed user', async () => {
      const card = await mountPinCard(perUser(), null, 'alice');
      expect(card.shadowRoot!.getElementById('overlay')!.classList.contains('blocked')).toBe(false);
    });

    it('does not prompt a user who has no applicable code', async () => {
      const card = await mountPinCard(perUser(), '1111', 'carol');
      const dialog = (card._helpers as { showEnterCodeDialog: ReturnType<typeof vi.fn> }).showEnterCodeDialog;
      await card._handleRestriction();
      expect(dialog).not.toHaveBeenCalled();
      expect(card._unlocked).toBe(false);
    });

    it.each([
      [[{ code: '1111' }], 'needs a user'],
      [[{ user: 'alice', code: '' }], 'required for user alice'],
    ])('rejects malformed per-user entry %j', (code, message) => {
      const card = document.createElement('restriction-card') as unknown as PinTestCard;
      expect(() => card.setConfig(pinConfig(code as unknown as string[]))).toThrow(message);
    });
  });

  it('does not count a dismissed dialog as a failed attempt', async () => {
    const card = await mountPinCard(pinConfig('1234', { max_retries: 3 }), null);
    await card._handleRestriction();
    expect(card._unlocked).toBe(false);
    expect(card._retries).toBe(0);
  });
});

const lockIcon = (card: PinTestCard): HTMLElement => card.shadowRoot!.getElementById('lock') as HTMLElement;
const overlayEl = (card: PinTestCard): HTMLElement => card.shadowRoot!.getElementById('overlay') as HTMLElement;

describe('restriction-card unlock rendering', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('swaps to unlocked_icon and keeps it visible while unlocked', async () => {
    const card = await mountPinCard(
      { ...pinConfig('1234'), locked_icon: 'mdi:bell-cancel', unlocked_icon: 'mdi:bell' },
      '1234',
    );
    await card._handleRestriction();
    await card.updateComplete;

    const lock = lockIcon(card);
    expect(lock.getAttribute('icon')).toBe('mdi:bell');
    expect(lock.classList.contains('icon-hidden')).toBe(false);
    expect(lock.classList.contains('icon-unlocked')).toBe(true);
    expect(overlayEl(card).classList.contains('unlocked')).toBe(false);
  });

  it('fades the lock away when no unlocked_icon is configured', async () => {
    const card = await mountPinCard({ ...pinConfig('1234'), locked_icon: 'mdi:lock' }, '1234');
    await card._handleRestriction();
    await card.updateComplete;

    const lock = lockIcon(card);
    expect(lock.getAttribute('icon')).toBe('mdi:lock');
    expect(lock.classList.contains('icon-hidden')).toBe(true);
    expect(overlayEl(card).classList.contains('unlocked')).toBe(true);
  });

  it('relocks after the duration', async () => {
    vi.useFakeTimers();
    try {
      const card = await mountPinCard({ ...pinConfig('1234'), unlocked_icon: 'mdi:bell', duration: 1 }, '1234');
      await card._handleRestriction();
      vi.advanceTimersByTime(1000);
      await card.updateComplete;

      expect(card._unlocked).toBe(false);
      expect(lockIcon(card).classList.contains('icon-unlocked')).toBe(false);
      expect(overlayEl(card).classList.contains('locked')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('restriction-card hide restriction', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const hideConfig = (): RestrictionCardConfig => ({
    ...createBaseConfig(),
    restrictions: { hide: { condition: { entity: 'binary_sensor.test', operator: '==', value: 'on' } } },
  });

  it('sets the hidden attribute and fires card-visibility-changed when hidden', async () => {
    const card = document.createElement('restriction-card') as unknown as PinTestCard;
    card.setConfig(hideConfig());
    card._helpers = { createCardElement: () => document.createElement('div') };
    const events: boolean[] = [];
    card.addEventListener('card-visibility-changed', (e) => events.push((e as CustomEvent).detail.value));
    card.hass = createHass('on');
    document.body.appendChild(card);
    await card.updateComplete;

    expect(card.hasAttribute('hidden')).toBe(true);
    expect(events).toEqual([false]);

    card.hass = createHass('off');
    await card.updateComplete;
    expect(card.hasAttribute('hidden')).toBe(false);
    expect(events).toEqual([false, true]);
  });
});

describe('restriction-card condition evaluation', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const mountWithStates = async (
    config: RestrictionCardConfig,
    states: Record<string, { state: string; attributes?: Record<string, unknown> }>,
  ): Promise<PinTestCard> => {
    const card = document.createElement('restriction-card') as unknown as PinTestCard;
    card.setConfig(config);
    card._helpers = { createCardElement: () => document.createElement('div') };
    card.hass = { states } as unknown as HomeAssistant;
    document.body.appendChild(card);
    await card.updateComplete;
    return card;
  };

  const levelConfig = (): RestrictionCardConfig => ({
    ...createBaseConfig(),
    condition: { entity: 'input_number.level', operator: '>', value: '60' },
  });

  it('compares numeric states as numbers for the top-level condition', async () => {
    const high = await mountWithStates(levelConfig(), { 'input_number.level': { state: '100.0' } });
    expect(high.shadowRoot?.getElementById('overlay')).not.toBeNull();

    const low = await mountWithStates(levelConfig(), { 'input_number.level': { state: '7.0' } });
    expect(low.shadowRoot?.getElementById('overlay')).toBeNull();
  });

  it('matches a numeric attribute against a string value', async () => {
    const card = await mountWithStates(
      {
        ...createBaseConfig(),
        condition: { entity: 'input_number.level', attribute: 'max', operator: '==', value: '100' },
      },
      { 'input_number.level': { state: '50.0', attributes: { max: 100 } } },
    );
    expect(card.shadowRoot?.getElementById('overlay')).not.toBeNull();
  });

  it('still renders the wrapped card when a condition entity does not exist', async () => {
    const card = await mountWithStates(
      {
        ...createBaseConfig(),
        condition: { entity: 'sensor.does_not_exist', operator: '==', value: 'on' },
        restrictions: { block: { condition: { entity: 'sensor.also_missing', operator: '==', value: 'on' } } },
      },
      {},
    );
    expect(card.shadowRoot?.getElementById('card')).not.toBeNull();
    expect(card.shadowRoot?.getElementById('overlay')).toBeNull();
  });
});

describe('restriction-card confirm restriction', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const mountConfirmCard = async (confirm: Record<string, unknown>) => {
    const card = document.createElement('restriction-card') as unknown as PinTestCard;
    card.setConfig({ ...createBaseConfig(), restrictions: { confirm } });
    const showConfirmationDialog = vi.fn().mockResolvedValue(true);
    card._helpers = { createCardElement: () => document.createElement('div'), showConfirmationDialog };
    card.hass = {
      ...createHass('on'),
      // Mimic HA, whose generic action confirmation reads "...run action 'OK'?"
      localize: (key: string, args?: Record<string, string>) =>
        key === 'ui.panel.lovelace.cards.actions.action_confirmation'
          ? `Are you sure you want to run action '${args?.action}'?`
          : key === 'ui.dialogs.generic.default_confirmation_title'
            ? 'Are you sure?'
            : '',
    } as unknown as HomeAssistant;
    document.body.appendChild(card);
    await card.updateComplete;
    return { card, showConfirmationDialog };
  };

  it('asks to unlock by default instead of naming the OK button as an action', async () => {
    const { card, showConfirmationDialog } = await mountConfirmCard({});
    await card._handleRestriction();

    expect(showConfirmationDialog).toHaveBeenCalledWith(
      card,
      expect.objectContaining({ title: 'Are you sure?', text: 'Are you sure you want to unlock?' }),
    );
    expect(card._unlocked).toBe(true);
  });

  it('uses the configured text when set', async () => {
    const { card, showConfirmationDialog } = await mountConfirmCard({ text: 'Really?' });
    await card._handleRestriction();

    expect(showConfirmationDialog).toHaveBeenCalledWith(card, expect.objectContaining({ text: 'Really?' }));
  });
});
