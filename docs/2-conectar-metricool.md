# 2. Conectar la página a Metricool (para que Claude publique solo)

Claude publica en Facebook a través de **Metricool**: genera la foto o el video, escribe el texto y lo deja programado en Metricool, que lo publica solo a la hora indicada.

## Situación actual

Tu cuenta de Metricool ya tiene **una marca**: *Dulce Andino*. La Ambateñita necesita su propia marca.

Según comparativas de terceros de 2026 (verifícalo en metricool.com/es/precios), el **plan gratis permite 1 sola marca y unas 20 publicaciones programadas al mes**. Para publicar todos los días en La Ambateñita sin tocar Dulce Andino tienes estas opciones:

| Opción | Qué implica |
|---|---|
| **A. Subir a un plan de pago** (recomendado) | Las dos marcas juntas y publicaciones ilimitadas. |
| **B. Plan gratis, menos publicaciones** | Cambiar la marca a La Ambateñita y publicar unas 5 veces por semana. Dulce Andino quedaría sin conectar. |
| **C. Otra cuenta de Metricool** | Crear una cuenta gratis aparte solo para La Ambateñita (unas 20 publicaciones al mes) y conectarla a Claude. |

## Pasos para conectar

1. Entra a **app.metricool.com**.
2. Arriba a la izquierda abre el selector de marcas → **"Añadir marca"** (o "Crear marca").
3. Ponle de nombre **La Ambateñita**.
4. Pulsa **Conectar Facebook**, inicia sesión y **marca la página "La Ambateñita"**. Acepta todos los permisos: sin el permiso de publicar, Metricool no puede subir las publicaciones.
5. En la configuración de la marca pon la zona horaria **America/Guayaquil**.
6. Escríbele a Claude: *"Ya conecté La Ambateñita en Metricool"*. Claude la encuentra, anota su número de marca en `config/negocio.json` (`metricool_blog_id`) y empieza a programar.

> Opcional: conecta también **Instagram** y **Google Business Profile** en la misma marca. Así el mismo contenido sale en las tres redes sin trabajo extra.
