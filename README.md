# VELUNE — Paris, revealed

A cinematic luxury-travel landing page built around a 157-frame, scroll-driven image sequence. The experience moves from an aircraft window through the clouds to a nocturnal Eiffel Tower reveal.

## Run locally

```bash
pnpm build
python3 -m http.server 4173 --directory dist
```

The 157-frame cloud sequence lives in `assets/hero-frames`. `pnpm build` copies it into `dist`.

Open `http://127.0.0.1:4173`.

## Production

The repository includes a static Nginx image listening on port `8080`:

```bash
docker build -t velune-paris-experience .
docker run --rm -p 8080:8080 velune-paris-experience
```

Health endpoint: `GET /health`.

## Accessibility and performance

- Native-scroll interaction; no scroll hijacking.
- Keyboard-operable navigation and menu with focus restoration.
- Reduced-motion mode renders a stable Eiffel Tower poster and final chapter.
- Responsive canvas cover rendering with bounded device-pixel ratio.
- Progressive frame loading with a visible preparation state and poster fallback.

## Asset and logo notes

The included VELUNE symbol is adapted from Logoipsum geometric placeholder logo 8 and paired with an original wordmark. Logoipsum permits modified placeholder logos inside commercial templates under its Fair Use License; it must not be resold as a standalone logo or treated as a final trademark. Replace it before launching a production brand identity.

The cinematic frame sequence is included with this template. Use of the source package is subject to the HorizonX membership license presented at download time.

