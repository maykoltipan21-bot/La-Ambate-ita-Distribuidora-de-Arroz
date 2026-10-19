# 4. Cómo funciona la automatización

```
config/negocio.json  ─┐
contenido/calendario.json ─┼─► scripts/generar.mjs ─► media/AAAA-MM-DD/ ─► GitHub (URL pública)
fotos/ (tus fotos reales) ─┘        imagen.png o reel.mp4                      │
                                     + publicacion.json                         ▼
                                                                Claude programa en Metricool
                                                                            │
                                                                            ▼
                                                         Metricool publica en Facebook a la hora
```

1. **`config/negocio.json`**: tus datos (WhatsApp, direcciones, horario) y las **marcas con sus precios** (Macareño, Conejo, Amazonas y Gloria, cada una por presentación). Si cambias un precio aquí, todas las imágenes nuevas salen con el precio nuevo. También puedes simplemente decírselo a Claude por chat, o enviarle la foto del catálogo actualizado.
2. **`contenido/calendario.json`**: 28 días de contenido (precios, marcas, consejos sobre el arroz y reels; sin recetas: La Ambateñita vende solo arroz) que se repiten en ciclo.
3. **`scripts/generar.mjs`**: crea las imágenes (1080×1350) y los reels (1080×1920, unos 16 segundos) con la marca de La Ambateñita.
4. **`media/`**: aquí quedan las fotos y videos. Como el repositorio es público, Metricool las descarga desde GitHub.
5. **Metricool**: Claude programa cada publicación con su texto y su hora, y Metricool la publica sola.

## Seguridad: nada se publica con datos incompletos

Cada `publicacion.json` indica si está **`"listo": true`** o qué le falta (`"faltantes"`). Claude **no programa** publicaciones sin número de WhatsApp o con datos sin completar. Si un precio está en `null`, la imagen dice "Consulta el precio" en vez de inventar un número.

Los reels de entregas a domicilio solo salen si confirmas `"entrega_a_domicilio": true`. Si pones `false`, se reemplazan por una versión sin entregas.

## Fotos de los sacos

Las fotos de cada saco están en `fotos/catalogo/` y salieron de la página de arroz de tu catálogo. Son pequeñas, así que se ven algo borrosas en grande. Si tomas una foto nítida de cada saco (de frente, con buena luz y fondo limpio) y la guardas con el mismo nombre (por ejemplo `conejo-25lb.jpg`), todas las publicaciones nuevas la usan automáticamente.

## Tus fotos reales

Sube fotos a la carpeta `fotos/` (o envíaselas a Claude por chat) con estos nombres para que el calendario las use:

- `fotos/pedido.jpg`: pedidos listos o sacos preparados (día 10)
- `fotos/bodega.jpg`: tu bodega o local (día 24)

Mientras no existan, esos días usan un diseño gráfico de respaldo.

## Comandos (los ejecuta Claude)

```bash
npm install                                     # una sola vez
node scripts/generar.mjs --marca                # foto de perfil y portada
node scripts/generar.mjs --muestras             # un ejemplo de cada diseño
node scripts/generar.mjs --desde 2026-10-26 --dias 7   # una semana de publicaciones
```

## Rutina semanal automática

Cuando la página esté conectada a Metricool, Claude puede dejar una **tarea programada cada domingo**: genera la semana siguiente, sube las fotos y videos a GitHub y los deja programados en Metricool. Tú solo revisas el planificador de Metricool (o la app en el celular) y, si algo no te gusta, lo editas o lo borras antes de que salga.
