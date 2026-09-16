# Save System

Purpose: centralize player progress persistence.

Rules:
- Core state owns save data.
- UI cannot directly modify save files.
- Restaurant, staff and economy modules expose serializable state.

Reserved data:
- restaurant progress
- dishes
- staff
- finance
- achievements
