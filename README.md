# La Ambateñita 🌾 Distribuidora de arroz

Página de Facebook y contenido automático para **La Ambateñita**: arroz al por mayor y menor en **Ambato** y **Macas**.

Claude genera cada día una foto o un video con la marca, escribe el texto y lo deja programado en Metricool, que lo publica solo en Facebook.

![Portada de Facebook](media/marca/portada-facebook.png)

| Oferta | Precios al por mayor | Consejo | Receta |
|---|---|---|---|
| ![](media/muestras/oferta.png) | ![](media/muestras/mayoreo.png) | ![](media/muestras/consejo.png) | ![](media/muestras/receta.png) |

Ejemplo de reel: [`media/muestras/reel.mp4`](media/muestras/reel.mp4)

## Pasos para arrancar

1. **Crea la página de Facebook**: [docs/1-crear-pagina-facebook.md](docs/1-crear-pagina-facebook.md). Usa la foto de perfil y la portada de `media/marca/`.
2. **Completa tus datos** en [`config/negocio.json`](config/negocio.json) o díselos a Claude por chat:
   - número de WhatsApp (**obligatorio**)
   - precios por presentación (quintal, medio quintal, arroba, funda)
   - variedades de arroz que vendes
   - direcciones en Ambato y en Macas, y horario
   - si haces entregas a domicilio y en qué sectores
3. **Conecta la página a Metricool**: [docs/2-conectar-metricool.md](docs/2-conectar-metricool.md)
4. **Envía fotos y videos reales** de tu bodega, tus sacos y tus entregas: son lo que más vende.
5. Claude genera la semana, la programa y deja una rutina semanal automática.

## Documentación

- [1. Crear la página de Facebook](docs/1-crear-pagina-facebook.md)
- [2. Conectar Metricool](docs/2-conectar-metricool.md)
- [3. Estrategia para ganar mercado](docs/3-estrategia-para-ganar-mercado.md)
- [4. Cómo funciona la automatización](docs/4-como-funciona-la-automatizacion.md)

## Estructura

```
config/negocio.json        datos del negocio, precios y horarios de publicación
contenido/calendario.json  28 días de contenido (se repite en ciclo)
scripts/generar.mjs        genera imágenes y reels
scripts/lib/               marca (colores, fuentes, ilustraciones), plantillas y render
marca/fuentes/             tipografías Pacifico y Montserrat (licencia OFL)
fotos/                     tus fotos y videos reales
media/marca/               foto de perfil y portada de Facebook
media/muestras/            ejemplos de cada diseño
media/AAAA-MM-DD/          publicación de cada día (imagen o reel + publicacion.json)
```
