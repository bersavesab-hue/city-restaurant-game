# Build Recovery

Current priority is to recover a stable playable version before adding new systems.

## Execution order

1. Freeze unstable patch stacking.
2. Keep existing playable content.
3. Separate patch history from active development.
4. Restore core loop:
   - launch
   - home screen
   - restaurant operation
   - save data
   - decoration entry
5. Add new systems only after the base loop is testable.

## Development rule

Do not add placeholder modules that are not connected to the running game.
Every new feature must have:
- data
- logic
- UI entry
- test path
