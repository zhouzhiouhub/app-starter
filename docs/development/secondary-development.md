# Secondary Development Guide

Secondary development should prefer stable extension points over core forks.

## Preferred Order

1. Configuration
2. Theme / Template
3. Custom components
4. Integration adapters
5. Custom API modules
6. Core fork

## Stable Locations

- `apps/web/src/custom`
- `apps/admin/src/custom`
- `services/api/src/custom`
- `packages/custom-components`
- `packages/custom-admin`
- `packages/integration-adapters`
- `themes/custom`
- `extensions/custom-apps`

## Rules

- Do not bypass Identity, Publish, Payment, or Order services.
- Do not read draft data from storefront components.
- Do not hardcode tenant IDs, domains, or secrets.
- Provide contract tests for public extension points.
- Document upgrade impact for every custom module.
