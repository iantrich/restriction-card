# Restriction Card by [@iantrich](https://www.github.com/iantrich)

A card to provide restrictions on Lovelace cards defined within.

## Disclaimer

This card is not to be used as a means to truly protect an instance. Someone with the means and knowledge will be able to bypass the restrictions presented by this card should they choose to.

[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE.md)

![Project Maintenance][maintenance-shield]
[![GitHub Activity][commits-shield]][commits]

[![Discord][discord-shield]][discord]
[![Community Forum][forum-shield]][forum]

## Support

Hey dude! Help me out for a couple of :beers: or a :coffee:!

[![coffee](https://www.buymeacoffee.com/assets/img/custom_images/black_img.png)](https://www.buymeacoffee.com/zJtVxUAgH)

## Options

| Name         | Type    | Requirement  | Description                                                                                                  |
| ------------ | ------- | ------------ | ------------------------------------------------------------------------------------------------------------ |
| type         | string  | **Required** | `custom:restriction-card`                                                                                    |
| card         | map     | **Required** | Card to render within `restriction-card`. Note: core cards must be defined as `custom:hui-{card name}-card`. |
| restrictions | map     | **Optional** | Additional restrictions. See [Restrictions Options](#restrictions-options).                                  |
| exemptions   | list    | **Optional** | List of exemption objects. See [Exemption Options](#exemption-options).                                      |
| condition    | map     | **Optional** | Conditional object to make lock active. See [Condition Options](#condition-options).                         |
| row          | boolean | **Optional** | Set to true to give a default `margin:left: 24px`                                                            |

## Restrictions Options

| Name    | Type | Requirement  | Description                                                               |
| ------- | ---- | ------------ | ------------------------------------------------------------------------- |
| confirm | map  | **Optional** | Confirmation unlock restriction. See [Confirm Options](#confirm-options). |
| pin     | map  | **Optional** | Pin code restriction. See [Pin Options](#pin-options).                    |
| block   | map  | **Optional** | Block interaction restriction. See [Block Options](#block-options).       |
| hide    | map  | **Optional** | Hide card restriction. See [Hide Options](#hide-options)..                |

## Confirm Options

| Name       | Type   | Requirement  | Description                                                                                 |
| ---------- | ------ | ------------ | ------------------------------------------------------------------------------------------- |
| text       | string | **Optional** | Text to display in confirmation dialog                                                      |
| exemptions | list   | **Optional** | List of exemption objects. See [Exemption Options](#exemption-options).                     |
| condition  | map    | **Optional** | Conditional object to make restriction active. See [Condition Options](#condition-options). |

## Pin Options

| Name       | Type   | Requirement  | Description                                                                                 |
| ---------- | ------ | ------------ | ------------------------------------------------------------------------------------------- |
| pin        | string | **Required** | Pin code the user needs to enter to unlock                                                  |
| text       | string | **Optional** | Text to display in prompt dialog                                                            |
| exemptions | list   | **Optional** | List of exemption objects. See [Exemption Options](#exemption-options).                     |
| condition  | map    | **Optional** | Conditional object to make restriction active. See [Condition Options](#condition-options). |

## Block Options

| Name       | Type   | Requirement  | Description                                                                                 |
| ---------- | ------ | ------------ | ------------------------------------------------------------------------------------------- |
| text       | string | **Optional** | Text to display in alert                                                                    |
| exemptions | list   | **Optional** | List of exemption objects. See [Exemption Options](#exemption-options).                     |
| condition  | map    | **Optional** | Conditional object to make restriction active. See [Condition Options](#condition-options). |

## Hide Options

| Name       | Type | Requirement  | Description                                                                                 |
| ---------- | ---- | ------------ | ------------------------------------------------------------------------------------------- |
| exemptions | list | **Optional** | List of exemption objects. See [Exemption Options](#exemption-options).                     |
| condition  | map  | **Optional** | Conditional object to make restriction active. See [Condition Options](#condition-options). |

## Exemption Options

| Name | Type   | Requirement  | Description                                                |
| ---- | ------ | ------------ | ---------------------------------------------------------- |
| user | string | **Required** | User id to exempt. This is found in the user profile `ID`. |

## Condition Options

| Name      | Type   | Requirement  | Description                                                                                         |
| --------- | ------ | ------------ | --------------------------------------------------------------------------------------------------- |
| value     | string | **Required** | String representing the state.                                                                      |
| entity    | string | **Required** | Entity to use condition and is what also causes the card to update                                  |
| attribute | string | **Optional** | Attribute of the entity to use instead of the state.                                                |
| operator  | string | **Optional** | Operator to use in the comparison. Can be `==`,`<=`,`<`,`>=`,`>`,`!=`, or `regex`. Default is `==`. |

## Theme Variables

The following variables are available and can be set in your theme to change the appearance of the lock.
Can be specified by color name, hexadecimal, rgb, rgba, hsl, hsla, basically anything supported by CSS.

| name                             | Default              | Description                                    |
| -------------------------------- | -------------------- | ---------------------------------------------- |
| `restriction-regular-lock-color` | `primary-text-color` | Lock color                                     |
| `restriction-success-lock-color` | `primary-color`      | Lock color when unlocked                       |
| `restriction-blocked-lock-color` | `error-state-color`  | Lock color when card is blocked                |
| `restriction-invalid--color`     | `error-state-color`  | Lock color after an invalid attempt to unlock  |
| `restriction-lock-margin-left`   | `unset`              | Manually bump the left margin of the lock icon |

## Example Configurations

Simple Lock example

![lock](lock.gif)

```yaml
type: custom:restriction-card
card:
  type: custom:hui-thermostat-card
  entity: climate.house
```

More complex example

![complex](pin.gif)

```yaml
type: custom:restriction-card
restrictions:
  confirm:
    exemptions:
      - user: adminid
  pin:
    code: 1234
    exemptions:
      - user: wifeid
      - user: adminid
  block:
    exemptions:
      - user: guestid
      - user: wifeid
      - user: adminid
exemptions:
  - user: ianid
card:
  type: custom:hui-thermostat-card
  entity: climate.house
```

Row example

![row](row.png)

```yaml
type: 'custom:hui-entities-card'
entities:
  - card:
      entity: cover.garage_door
      type: 'custom:hui-cover-entity-row'
    restrictions:
      block: true
    type: 'custom:restriction-card'
    row: true
  - entity: light.kitchen
```

## Installation

This card is available in the [HACS (Home Assistant Community Store)](https://hacs.netlify.com)

## [Troubleshooting](https://github.com/thomasloven/hass-config/wiki/Lovelace-Plugins)

[commits-shield]: https://img.shields.io/github/commit-activity/y/custom-cards/restriction-card.svg?style=for-the-badge
[commits]: https://github.com/custom-cards/restriction-card/commits/master
[discord]: https://discord.gg/5e9yvq
[discord-shield]: https://img.shields.io/discord/330944238910963714.svg?style=for-the-badge
[forum-shield]: https://img.shields.io/badge/community-forum-brightgreen.svg?style=for-the-badge
[forum]: https://community.home-assistant.io/t/lovelace-restriction-card
[license-shield]: https://img.shields.io/github/license/custom-cards/restriction-card.svg?style=for-the-badge
[maintenance-shield]: https://img.shields.io/maintenance/yes/2019.svg?style=for-the-badge
[releases-shield]: https://img.shields.io/github/release/custom-cards/restriction-card.svg?style=for-the-badge
[releases]: https://github.com/custom-cards/restriction-card/releases
