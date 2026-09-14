# Recovery v0.5.2

This package intentionally contains NO `.github/workflows` files.
It repairs runtime data modules, CI scripts and package scripts without asking an Actions token to rewrite workflow definitions.
The postinstall/test reconcile script handles the temporary race with the legacy fast updater by aligning the validated workspace to `origin/main` when the recovery marker has already been committed.
