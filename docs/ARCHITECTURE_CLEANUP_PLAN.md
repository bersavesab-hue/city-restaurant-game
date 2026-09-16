# Architecture Cleanup

## Module boundaries

- core: state, save, events, lifecycle
- restaurant: dishes, recipes, ratings, upgrades
- staff: employees, skills, training
- economy: money, market, supply
- ui: presentation only

## Principles

- Data driven systems
- Avoid duplicate patch logic
- Keep expansion compatibility
- Preserve build pipeline
