# Module Registry

## Core modules

- core: game state, save, event flow
- restaurant: dishes, menu, operation
- staff: employees, skills, growth
- economy: finance, market, cost

## Dependency rule

UI should call systems, systems should use data models.
Data should not depend on UI.
