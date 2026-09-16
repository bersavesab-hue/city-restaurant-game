# Data Loader Foundation

## Responsibility

Central loading boundary for all game data.

## Data sources

- dishes
- staff
- restaurants
- economy
- events
- achievements

## Rules

- Systems do not directly edit raw data files.
- Runtime state is separated from static configuration.
- Future save compatibility is handled through versioned loading.
