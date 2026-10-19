---
message: "Arroz de las marcas que conoces, al por mayor y menor en Ambato y Macas: pídelo por WhatsApp"
audience: familias, tiendas y restaurantes de Ambato y Macas
mode: autonomous
duration: 18.6
canvas: 1080x1920
---

Una sola composición (`index.html`) con cinco escenas y transiciones CSS. Todo se sincroniza con una rejilla de 128 BPM (`PULSO = 0.4695 s`) que parte del drop de la música (`DROP = 3.035 s`).

## Frame 1 · Gancho
status: built
src: index.html#s1
rules: kinetic-beat-slam, ambient-glow-bloom
0 → 3.0 s. Tazón premium con Ken Burns. "¿YA TIENES / ARROZ / PARA ESTA / SEMANA?" golpean sobre el redoble, cada línea con una entrada distinta. Sale con zoom a través y destello dorado justo en el drop.

## Frame 2 · Almuerzo en familia
status: built
src: index.html#s2
rules: waterfall-entry, sine-wave-loop
3.0 → 6.8 s. Mesa familiar con paneo lento; "El arroz de los / almuerzos / en familia" y "Desde Ambato hasta Macas, en la mesa de tu casa." Sale con cortinas verde y dorada.

## Frame 3 · Marcas y precios
status: built
src: index.html#s3
rules: spring-pop-entrance, counting-dynamic-scale, scale-swap-transition
6.8 → 12.4 s. Tarjetas con la foto real de cada saco, una cada 3 pulsos, con conteo del precio: Gloria (peruano · premium) quintal $65.00, Conejo quintal $55.00, Amazonas quintal $60.00, Macareño arroba $15.00. Sale con empujón vertical.

## Frame 4 · Negocios
status: built
src: index.html#s4
rules: kinetic-beat-slam
12.4 → 15.2 s. Bandas diagonales roja y verde con la olla del restaurante: "¿TU NEGOCIO / VIVE DEL ARROZ?" y "PIDE TU QUINTAL POR WHATSAPP". Sale con iris circular.

## Frame 5 · Cierre de marca
status: built
src: index.html#s5
rules: svg-path-draw, spring-pop-entrance, particle-burst
15.2 → 18.6 s. Se dibuja la espiga, "La Ambateñita" entra con una explosión de granos de arroz, "Arroz al por mayor y menor", las marcas, "Pedidos por WhatsApp" y "Ambato · Macas". Fundido a negro con la música.
