PWA Icons needed for MediFlow Patient Portal
=============================================

Place the following icon files in this folder:

  icon-192.png         — 192x192 px  (standard app icon)
  icon-512.png         — 512x512 px  (large app icon / splash)
  icon-maskable-192.png — 192x192 px (maskable, safe-zone = center 80%)
  icon-maskable-512.png — 512x512 px (maskable, safe-zone = center 80%)
  badge-96.png         — 96x96 px   (notification badge, monochrome)

Design specs:
  - Background: #0e7490 (teal)
  - Foreground: white MediFlow logo / sparkle icon
  - Maskable icons must have 20% padding on all sides (safe zone)
  - badge-96.png must be monochrome (white icon, transparent background)

Tools to generate:
  - https://maskable.app/editor  (maskable preview)
  - https://realfavicongenerator.net  (all sizes generator)
  - https://pwa-asset-generator (npm tool for automated generation)

Quick generation command (requires ImageMagick):
  npx pwa-asset-generator favicon.svg icons --manifest manifest.json
