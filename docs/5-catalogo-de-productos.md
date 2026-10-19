# 5. Catálogo de productos (PDF para tiendas)

El catálogo completo de La Ambateñita está en **[`catalogo/Catalogo-La-Ambatenita.pdf`](../catalogo/Catalogo-La-Ambatenita.pdf)**. Tiene 25 páginas tamaño carta, 226 productos y 9 categorías. Sirve para imprimirlo, enviarlo por WhatsApp o llevarlo a tiendas, minimarkets y restaurantes.

Cada página también está en JPG en `catalogo/paginas/`, para compartirla suelta por WhatsApp o en los estados.

## Qué tiene

1. **Portada** con foto de ambiente, la marca y un abanico de productos.
2. **Bienvenida**: índice con el número de página de cada categoría y los pasos para hacer un pedido.
3. **Promociones del mes**: Café Sí Café y Pipas Nic con regalo.
4. **Arroz**: la especialidad de la casa. Gloria, Conejo, Amazonas y Macareño, con cada presentación y una cabecera con foto.
5. **Las demás categorías**:
   - Fideos, harinas y granos
   - Abarrotes
   - Bebidas y lácteos
   - Snacks
   - Galletas y golosinas
   - Balanceados, maíz y trigo
   - Limpieza y aseo
   - Desechables y pañales
6. **Contraportada** con los datos de contacto y las formas de pago.

Cada categoría abre con una franja de color con frase, marcas y fotos, y tiene productos **destacados** en tarjetas grandes. Los precios van como etiqueta de supermercado.

Cada producto tiene un **código** (A01, B12…). El cliente puede pedir por WhatsApp solo con el código y la cantidad.

## Cambiar precios o productos

Los datos están en [`catalogo/productos.json`](../catalogo/productos.json). Hay tres formas de actualizarlos:

- decirle a Claude qué cambió;
- enviarle el catálogo nuevo;
- editar el archivo tú mismo.

Para volver a generar el PDF y las imágenes:

```bash
node scripts/catalogo.mjs --vistas
```

El WhatsApp, las direcciones y el horario de la contraportada se toman de `config/negocio.json`. Mientras estén vacíos, salen como líneas en blanco para escribirlos a mano.
