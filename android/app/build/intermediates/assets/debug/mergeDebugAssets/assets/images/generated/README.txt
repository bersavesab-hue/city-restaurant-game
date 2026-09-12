Generated UI asset bundle V1

This directory contains image resources that were already generated for the project.

mockups/
- store_management_v1.png
- district_dashboard_v1.png
- renovation_screen_v1.png
- store_preparation_v1.png
- district_dashboard_alt_v1.png

atlases/
- ui_components_v1.png
- renovation_assets_v1.png

Usage rule:
- Mockups are visual references and should not all be preloaded at startup.
- Atlases are intended for later sprite extraction / selective loading.
- The code manifest is src/ui/generatedAssetManifest.js.
- Android build workflow already copies the full assets directory into the APK.

Editable fields in V8:
- shop / restaurant name
- private room names
- renovation template names
- renovation templates are saved into gameState and persist with save data
