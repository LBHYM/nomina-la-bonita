# Nómina La Bonita (Gratis · Web)

Sistema simple para llevar el control de nómina quincenal de **La Bonita**.

## Incluye
- Registro diario: entrada/salida, video, playera, notas.
- Cálculo automático de horas con regla de 15 minutos:
  - 0–14 min = 0
  - 15 min = 0.25
  - 30 min = 0.50
  - 45 min = 0.75
- Nómina quincenal (1-15 y 16-fin)
- Lunes pagado automático: 4 horas
- Bono puntualidad: $50 por quincena
  - Lupita siempre sí (automático)
- Exportar CSV (registro y nómina)

## Cómo usar en GitHub Pages
1. Sube estos archivos a un repo
2. En **Settings → Pages** selecciona:
   - Branch: `main`
   - Folder: `/ (root)`
3. Listo.

> Nota: Los datos se guardan en tu navegador (localStorage).
> Si cambias de computadora o navegador, no se transfieren.

## Archivos
- `index.html`
- `styles.css`
- `app.js`
- `logo.png`

---
Hecho para La Bonita ✨


## Nota sobre bono (tu regla)
- Tolerancia: 10 minutos.
- Si llega tarde (más de 5 min) o no cumple mínimo 4 horas, pierde el bono si llega tarde más de 3 veces en la quincena.
- En la app, el bono se marca manual por quincena para cada chica (Lupita siempre sí).
