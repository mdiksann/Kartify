# Kartify logo

The logo is symbol-only: two linked white and charcoal (`#292929`) cards on a
white (`#FFFFFF`) tile. Warm-gray (`#66665F`) outlines keep the white card visible.
A small offset gray shadow gives the tile a raised appearance. The shadow uses
flat vector geometry, not a filter. The logo contains no lettering.

- `public/brand/symbol.svg`: master logo, used by every `Brand` component and as the SVG favicon.
- `src/app/favicon.ico`: browser fallback at 16, 32 and 48 px.
- `src/app/apple-icon.png`: 180 px home-screen icon on white.
- `src/app/opengraph-image.png`: 1200 × 630 px symbol-only link preview on white, also used for Twitter cards.

Use the shared `Brand` component for links to Kartify home. Preserve the tile,
outline, shadow and proportions. Do not add the Kartify wordmark to the logo.
The former wordmark asset and all rejected concepts have been removed.

Set the existing `AUTH_URL` to the deployed site's public URL so shared image URLs
use that origin.
