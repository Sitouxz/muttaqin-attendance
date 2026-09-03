# Bundled fonts

## Geist-Regular.ttf
[Geist](https://vercel.com/font) by Vercel, licensed under the SIL Open Font
License 1.1 (<https://openfontlicense.org>). Vendored so the branded QR-card
renderer (`src/lib/utils/qr-card.ts`) can embed it as an `@font-face` data URI
and rasterise identically in every environment, independent of system fonts.
