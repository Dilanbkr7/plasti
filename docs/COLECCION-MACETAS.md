# Colección de macetas — 20 de octubre de 2026

Actualización posterior: negro, tomate y celeste están autorizados en el catálogo. La nueva ficha ofrece referencias digitales de color; las fotografías originales corresponden al negro. Consulta [FICHA-PRODUCTO.md](./FICHA-PRODUCTO.md) para el estado actual de compra y personalización.

Las seis fotografías y precios fueron suministrados por el propietario. Las descripciones se basan en las formas visibles; no afirman medidas, material, resistencia, drenaje, garantía ni inclusión de plantas que no se hayan confirmado.

| Maceta       | Precio USD | Archivo WebP        | Original recibido |
| ------------ | ---------- | ------------------- | ----------------- |
| Semiesférica | 25,00      | `semiesferica.webp` | 05_44_53          |
| Cónica       | 35,00      | `conica.webp`       | 05_44_14          |
| Hexagonal    | 22,00      | `hexagonal.webp`    | 05_44_07          |
| Esférica     | 31,80      | `esferica.webp`     | 05_44_02          |
| Cilíndrica   | 28,00      | `cilindrica.webp`   | 05_43_41          |
| Facetada     | 44,00      | `facetada.webp`     | 05_43_36          |

## Imágenes

`public/images/coleccion/` contiene las seis imágenes de 1200 px y miniaturas de 560 px, todas WebP. Se mantuvieron encuadre, fondo, color y proporción; no se generaron imágenes nuevas. Originales: 11.199.905 bytes. Versiones de 1200 px: 300.792 bytes, reducción del 97,3 %. Miniaturas: 27.534 bytes. Los originales se conservan en `.data/product-originals/` y en Descargas.

La landing y el catálogo usan `next/image`, tamaños adaptables y carga diferida. El manifiesto de tamaños está en `public/images/coleccion/manifest.json`.

## Base y compra

Los productos se incorporaron a la base local existente. IDs estables, descripciones y precios de importación: `lib/catalog/planter-collection.ts`. Importador idempotente: `scripts/import-planter-collection.ts`. No se borraron productos anteriores ni se cambió el destacado de la portada.

Para repetir la importación local, detener primero el servidor y ejecutar:

```sh
npx tsx scripts/import-planter-collection.ts "C:/Users/pauly/Downloads"
```

Después, iniciar la web. El script rechaza `DATABASE_URL` remota. Los productos locales no se trasladan automáticamente a Supabase; la publicación remota se realizará cuando se configure y autorice esa conexión.

Las tarjetas comprables están en `/#coleccion`; conservan ID real, variante y precio al usar el flujo comercial existente. La galería geométrica anterior sigue disponible; sus modelos GLB no se asignan a estas seis formas porque no corresponden a ellas. El campo GLB admite vacío para productos que aún no tienen modelo.

## Personalización

`lib/personalization/config.ts` delimita la selección de IA a los seis IDs de esta colección. Así, otros productos y modelos anteriores no cambian el conjunto previsto. Actualmente las seis fotos corresponden a **Negro carbón**: ese es el color con referencia fotográfica original; la ficha también permite preparar tomate y celeste como referencias digitales.

Negro, tomate y celeste están publicados como variantes autorizadas. Las vistas de tomate y celeste son filtros SVG identificados como referencias digitales; los archivos originales permanecen negros y no se asignan como fotografías originales de otros colores.

La colección está completa para negro; la generación sigue deshabilitada. Falta elegir proveedor, completar el procesamiento y almacenamiento de propuestas, y realizar pruebas con fotografías de espacios.

Archivos de interfaz: `components/storefront/PlanterCollection.tsx` y su CSS. Compra compartida: `components/personalization/ProductPurchaseDialog.tsx`. Configuración y validación: `lib/personalization/`. Se actualizó `CatalogPanel` para imágenes optimizadas y productos sin GLB.

