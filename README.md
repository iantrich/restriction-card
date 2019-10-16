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

| Name         | Type   | Requirement  | Description                                                                                                  |
| ------------ | ------ | ------------ | ------------------------------------------------------------------------------------------------------------ |
| type         | string | **Required** | `custom:restriction-card`                                                                                    |
| card         | object | **Required** | Card to render within `restriction-card`. Note: core cards must be defined as `custom:hui-{card name}-card`. |
| restrictions | object | **Optional** | Additional restrictions. See restriction types below.                                                        |
| exemptions   | list   | **Optional** | List of exemption objects. See exemption object below.                                                       |

## Restrictions Options

| Name    | Type   | Requirement  | Description                          |
| ------- | ------ | ------------ | ------------------------------------ |
| confirm | object | **Optional** | Confirmation restriction. See below. |
| pin     | object | **Optional** | Pin restriction. See below.          |
| block   | object | **Optional** | Block restriction. See below.        |

## Confirm Options

| Name       | Type | Requirement  | Description                                            |
| ---------- | ---- | ------------ | ------------------------------------------------------ |
| exemptions | list | **Optional** | List of exemption objects. See exemption object below. |

## Pin Options

| Name       | Type   | Requirement  | Description                                            |
| ---------- | ------ | ------------ | ------------------------------------------------------ |
| pin        | string | **Required** | Pin code the user needs to enter to unlock             |
| exemptions | list   | **Optional** | List of exemption objects. See exemption object below. |

## Block Options

| Name       | Type | Requirement  | Description                                            |
| ---------- | ---- | ------------ | ------------------------------------------------------ |
| exemptions | list | **Optional** | List of exemption objects. See exemption object below. |

## Exemption Options

| Name | Type   | Requirement  | Description                                                |
| ---- | ------ | ------------ | ---------------------------------------------------------- |
| user | string | **Required** | User id to exempt. This is found in the user profile `ID`. |

## Example Configurations

Simple Lock example

![lock](lock.gif)

```yaml
type: restriction
card:
  type: thermostat
  entity: climate.house
```

More complex example

![complex](pin.gif)

```yaml
type: restriction
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
  type: thermostat
  entity: climate.house
```

[Troubleshooting](https://github.com/thomasloven/hass-config/wiki/Lovelace-Plugins)

[commits-shield]: https://img.shields.io/github/commit-activity/y/custom-cards/restriction-card.svg?style=for-the-badge
[commits]: https://github.com/custom-cards/restriction-card/commits/master
[discord]: https://discord.gg/5e9yvq
[discord-shield]: https://img.shields.io/discord/330944238910963714.svg?style=for-the-badge
[forum-shield]: https://img.shields.io/badge/community-forum-brightgreen.svg?style=for-the-badge
[forum]: https://community.home-assistant.io/c/projects/frontend
[license-shield]: https://img.shields.io/github/license/custom-cards/restriction-card.svg?style=for-the-badge
[maintenance-shield]: https://img.shields.io/maintenance/yes/2019.svg?style=for-the-badge
[releases-shield]: https://img.shields.io/github/release/custom-cards/restriction-card.svg?style=for-the-badge
[releases]: https://github.com/custom-cards/restriction-card/releases
