# Modelos 3D del catálogo PLASTIMAD

Cada producto tiene un GLB propio en `public/models/coleccion/`, vinculado mediante su identificador real de catálogo. En la ficha se ofrecen **Vista del producto**, **Ver detalle** y **Ver en 3D**. La fotografía sigue siendo la vista inicial; no se descarga ningún GLB hasta seleccionar la vista 3D o abrir un enlace directo a esa vista.

## Optimización aplicada

Los originales proporcionados sumaban 106 109 276 bytes. Las versiones finales suman 3 128 488 bytes: reducción aproximada del 97.05 %. Los originales permanecen intactos en Descargas y se conservan copias fuera de la carpeta pública en `.data/3d-originals`.

| Modelo       |     Original |  Optimizado | Triángulos finales |
| ------------ | -----------: | ----------: | -----------------: |
| Semiesférica | 66 559 292 B | 1 470 764 B |            330 898 |
| Cónica       |  8 491 184 B |   389 528 B |             65 000 |
| Hexagonal    |  8 103 168 B |   340 176 B |             64 998 |
| Esférica     |  7 604 612 B |   306 816 B |             64 998 |
| Cilíndrica   |  7 795 140 B |   310 840 B |             64 998 |
| Facetada     |  7 555 880 B |   310 364 B |             65 000 |

Los tamaños exactos y límites geométricos están en `public/models/coleccion/manifest.json`. La optimización utiliza GLTF Transform, simplificación con Meshoptimizer, compresión geométrica Draco y texturas WebP de hasta 1024 píxeles. La simplificación respeta límites de error; no se fuerza una misma cantidad de triángulos en todos los productos. La Semiesférica conserva más geometría para limitar la deformación.

## Archivos para editar

- `components/storefront/PlanterProductDetail.tsx`: los tres botones y la carga dinámica, solo al solicitar 3D.
- `components/storefront/PlanterModelViewer.tsx`: escena R3F/Drei, luces de estudio, cámara, giro manual, zoom, estado de carga y recuperación de errores. La carga usa `useGLTF` y decodificadores locales; no utiliza Html dentro de Suspense.
- `components/storefront/PlanterModelViewer.module.css`: fondo, indicadores y controles del visor.
- `lib/catalog/planter-models.ts`: correspondencia entre ID de producto y archivo GLB. `products.model_url` de la base tiene prioridad; hay un respaldo por los seis identificadores conocidos.
- `public/models/coleccion/`: los seis modelos comprimidos. Sustituir por otros GLB requiere volver a validar y optimizar.
- `public/decoders/draco/`: decodificador y licencia servidos desde el mismo sitio, sin CDN.
- `scripts/optimize-planter-models.ts`: procesamiento reproducible de los originales. Ejecutar con `npx tsx scripts/optimize-planter-models.ts C:/Users/pauly/Downloads`. Solo la primera obtención de la licencia oficial puede requerir Internet; los modelos se procesan localmente.
- `scripts/link-planter-models.ts`: actualiza las seis rutas de modelo en la base local. Ejecutar con el servidor detenido.
- `scripts/import-planter-collection.ts`: conserva las asociaciones 3D al importar de nuevo la colección.

## Rendimiento y comportamiento

El visor se controla únicamente con arrastre y zoom, sin botones superpuestos ni giro automático. Dibuja bajo demanda, sin un bucle continuo de animación, y los controles no añaden inercia. Resolución limitada a DPR 1.5, una sombra de contacto calculada una vez y texturas compartidas en caché. Cada instancia clona solo los materiales que modifica y los libera al cerrar. No se modifican los materiales del modelo compartido.

Negro conserva los materiales originales. Tomate y celeste son referencias digitales de color identificadas como tales en la ficha. El visor no cambia precios, identificadores ni variantes de compra. Los modelos se ajustan visualmente a la cámara; no se presentan como una medición física certificada.

Para abrir un producto directamente en 3D puede usarse `/?producto=ID_REAL&vista=3d#coleccion`. El catálogo completo utiliza esa ruta en sus enlaces 3D. No se cambiaron el hero, sus escenas, las cuentas ni los pedidos históricos.

`tests/planter-models.test.ts` decodifica los seis GLB, comprueba texturas, índices, dimensiones y reducción de peso. Las dependencias de transformación y compresión son herramientas de desarrollo; no se ejecutan en el navegador ni en las funciones de compra.
