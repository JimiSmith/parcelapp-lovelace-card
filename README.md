# ParcelApp Delivery Card

A Lovelace frontend card for ParcelApp delivery entities.

## Installation (HACS)

1. Open HACS.
2. Add this repository as a custom repository of type **Dashboard**.
3. Install **ParcelApp Delivery Card**.
4. Reload the browser.

## Card type

`custom:parcelapp-delivery-card`

## Example

```yaml
type: custom:parcelapp-delivery-card
entity: sensor.parcelapp_ups_1z123456789
layout: hero
events_limit: 4
show_expected: true
show_carrier: true
show_progress_rail: true
show_route: true
show_decorations: true
action: more-info
```

## Auto-Entities usage

When used with `custom:auto-entities`, pass the generated entity:

```yaml
options:
  type: custom:parcelapp-delivery-card
  entity: this.entity_id
```
