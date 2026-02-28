/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
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
    card._hass = createHass('on');

    expect(card.shouldUpdate(changedProps([['_hass', createHass('off')]]))).toBe(true);
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
    card._hass = createHass('on');

    expect(card.shouldUpdate(changedProps([['_hass', createHass('off')]]))).toBe(true);
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
    card._hass = createHass('on');

    expect(card.shouldUpdate(changedProps([['_hass', createHass('off')]]))).toBe(true);
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

    expect(card.shouldUpdate(changedProps([['_hass', createHassWithEntityState(sameStateObject)]]))).toBe(false);
  });
});
