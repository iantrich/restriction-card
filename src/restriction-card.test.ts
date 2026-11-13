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

const mountPinCard = async (config: RestrictionCardConfig, enteredPin: string | null): Promise<PinTestCard> => {
  const card = document.createElement('restriction-card') as unknown as PinTestCard;
  card.setConfig(config);
  card._helpers = {
    createCardElement: () => document.createElement('div'),
    createRowElement: () => document.createElement('div'),
    showEnterCodeDialog: vi.fn().mockResolvedValue(enteredPin),
  };
  card.hass = createHass('on');
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

  it('does not count a dismissed dialog as a failed attempt', async () => {
    const card = await mountPinCard(pinConfig('1234', { max_retries: 3 }), null);
    await card._handleRestriction();
    expect(card._unlocked).toBe(false);
    expect(card._retries).toBe(0);
  });
});
