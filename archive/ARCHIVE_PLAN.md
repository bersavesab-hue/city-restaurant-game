# Archive Plan

## Current cleanup target

- PATCH_MANIFEST_V08xx.json: historical patch records, keep as archive references.
- Old experimental modules: move to deprecated archive after dependency check.
- Active game logic: identify actual entry points before integration.

## Rules

1. Do not delete code before dependency verification.
2. One source of truth for each system.
3. Remove duplicated patch logic after migration.
4. Keep rollback information.

## Next scan

- Project entry
- UI layer
- Data layer
- Save system
- Existing decoration implementation
