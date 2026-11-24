# Personalización de macetas

> Estado actual: la conexión con Hugging Face ya está implementada y necesita `HF_TOKEN` para activarse. Consulta [PERSONALIZACION-HUGGINGFACE.md](./PERSONALIZACION-HUGGINGFACE.md). El contenido siguiente documenta la fase anterior, cuando la generación estaba desconectada.

La ficha de producto y el flujo de foto → colores están documentados en [FICHA-PRODUCTO.md](./FICHA-PRODUCTO.md). La foto se puede preparar sin cuenta; comprar requiere acceso. El carrito sigue siendo un módulo visual pendiente.

Actualización: las seis macetas y fotografías suministradas ya están publicadas en la base local. Consulta [COLECCION-MACETAS.md](./COLECCION-MACETAS.md). El catálogo para personalización está completo en negro; tomate y celeste están autorizados como variantes y tienen vistas digitales; aún necesitan fotografías originales para la generación con referencias. La generación permanece desconectada. Las cinco opciones evaluadas están en [OPCIONES-IA-IMAGENES.md](./OPCIONES-IA-IMAGENES.md).

## Estado de esta entrega

Interfaz en `/#analiza` y en `/panel?view=analysis`. Conserva la tipografía del proyecto, verdes y fondos claros; en escritorio hay dos columnas y en móvil una. Permite seleccionar, visualizar, cambiar y quitar una foto JPG/PNG/WebP de hasta 4 MB. Verifica que el navegador pueda abrirla y libera las URL temporales al sustituirla o salir.

Colores confirmados por el propietario: **negro, tomate y celeste**, además de elección automática. Se muestran únicamente cuando existe una variante correspondiente con una fotografía original asociada en el catálogo. No hay selectores de modelos, ubicaciones, metros ni separaciones.

«Generar» requiere una foto válida y consulta disponible del catálogo. En esta fase informa que el servicio está pendiente: no transmite la fotografía ni crea imágenes, recomendaciones, identificadores o precios de ejemplo. «Regenerar otra propuesta» y «Comprar ahora» están visibles y deshabilitados hasta disponer de una propuesta válida.

La ficha de resultado ya tiene espacio para imagen personalizada, nombre, descripción, color y precio. No se puede validar visualmente un resultado real hasta integrar un proveedor; los casos de resultado se prueban con fixtures aislados en tests, nunca en la web.

## Arquitectura reutilizada

- Next.js App Router y API existente `app/api/[...path]/route.ts`.
- PostgreSQL/PGlite y la tabla actual `plastimad.products`; ninguna tabla nueva ni migración necesaria.
- Variantes actuales: `products.colors` es una lista de nombres; no existen IDs de variante independientes. La identidad comercial se conserva como `{ product_id, color }`.
- La compra real del repositorio abre `CommercialContact` y registra una solicitud comercial. Se reutiliza ese componente, extraído a su propio archivo sin modificar sus permisos ni lógica. No se ha añadido un carrito o checkout ficticio.
- La API de solicitudes vuelve a comprobar producto activo, color y precio en base de datos. El precio de la IA nunca se utiliza para una compra.

El calculador perimetral público y sus archivos se retiraron. El formulario antiguo de medidas dentro del panel se sustituyó por el mismo módulo. Se conserva el historial de análisis anteriores y su API para no borrar datos ni romper solicitudes vinculadas; no se llama a ese generador desde la nueva personalización.

## Contrato de catálogo y proveedores

`GET /api/personalization` obtiene productos activos, no demostrativos y de categoría Macetas directamente de la base. No usa `brochurePlanter` como sustituto. Devuelve capacidades, candidatos, colores y estado de preparación.

`lib/personalization/config.ts` contiene el número previsto de productos (seis), los colores autorizados y un mapa opcional de fotografías originales por ID real y color. Los candidatos se limitan a los seis IDs reales definidos en `lib/catalog/planter-collection.ts`. Los productos ajenos a esta colección no alteran su preparación. Cada candidato necesita al menos una fotografía de una variante autorizada; solo los colores con referencia publicada se muestran como disponibles.

Las fotos del producto geométrico se asocian como ya lo hace la galería actual. Para nuevos productos de un solo color se utiliza su `image_url`. Para productos con varios colores hay que proporcionar referencias explícitas en `referenceImages[product_id][color]`; una foto genérica no se supone válida para todas las variantes. Las rutas deben corresponder a archivos originales suministrados por el propietario.

`ImageGenerationProvider`, en `lib/server/personalization.ts`, define el adaptador futuro: imagen del espacio, preferencia, candidatos con fotos originales e identificadores y señal de cancelación. Devuelve bytes de imagen y la pareja producto/color. El frontend usa `lib/personalization/client.ts` y un contrato común, sin SDK de generación.

`resolveProposal` acepta solo productos presentes en la colección preparada, colores con referencia y coincidencia con el color elegido por el cliente. Resuelve nombre, descripción y precio desde el catálogo, no desde texto del proveedor. Los cambios de foto o preferencia invalidan la propuesta anterior. La interfaz ignora respuestas atrasadas.

En esta fase `available` siempre es `false`, incluso si hay una clave OpenAI configurada para otros módulos. `POST /api/personalization` responde 503 sin leer, guardar o reenviar la imagen. No hay dependencias nuevas ni peticiones pagadas.

## Qué falta para generar imágenes reales

1. Registrar las seis macetas definitivas en el catálogo con datos, precios y colores reales. Asociar sus fotografías originales por variante; verificar permisos de uso y calidad.
2. Elegir proveedor y modelo. Implementar un adaptador de `ImageGenerationProvider` únicamente en el servidor y configurar sus secretos allí.
3. Implementar el procesamiento de POST: sesión, consentimiento, límites de tamaño, verificación del archivo con Sharp, límites de uso y costos, validación de preferencia y carga del catálogo real.
4. Enviar las referencias originales al proveedor. Revalidar su producto/color contra el catálogo actual con `resolveProposal`; rechazar productos inventados o cambios de color no autorizados.
5. Guardar la imagen generada en almacenamiento persistente con permisos definidos y devolver una URL servida por la aplicación. Añadir persistencia de propuestas, propiedad, caducidad y eliminación según las necesidades acordadas.
6. Revalidar la colección y el proveedor en capacidades antes de activar `available`. Si se habilita envío de fotos, actualizar el texto de privacidad y añadir consentimiento previo.
7. Probar una generación, regeneración y solicitud comercial completas con el mismo ID y color. Revisar expiración, errores del proveedor y cambios de disponibilidad/precios durante la sesión.

Estos pasos requieren implementación del servidor; no basta con cambiar un booleano. La interfaz y su transporte no dependen del proveedor elegido.

## Archivos principales

| Archivo                                                        | Responsabilidad                                      |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| `components/personalization/PlanterPersonalization.tsx`        | Foto, estados, preferencia, resultado y acciones     |
| `components/personalization/PlanterPersonalization.module.css` | Diseño responsive                                    |
| `components/personalization/ProductPurchaseDialog.tsx`         | Compra mediante el flujo comercial existente         |
| `lib/personalization/types.ts`                                 | Contratos compartidos                                |
| `lib/personalization/config.ts`                                | Colores, colección y referencias originales          |
| `lib/personalization/catalog.ts`                               | Elegibilidad, referencias y validación de propuestas |
| `lib/personalization/client.ts`                                | Transporte independiente del proveedor               |
| `lib/server/personalization.ts`                                | Catálogo real, capacidades y contrato del adaptador  |
| `components/storefront/CommercialContact.tsx`                  | Componente comercial reutilizable                    |

También se actualizaron la landing, el panel de análisis, la navegación y la respuesta del asistente sobre personalización. El hero, los GLB, el acceso y la gestión comercial mantienen su funcionamiento.

Integraciones modificadas: `app/api/[...path]/route.ts`, `components/storefront/LandingServices.tsx`, `components/storefront/PlanterShop.tsx`, `components/platform/AIPanel.tsx`, `components/platform/Dashboard.tsx` y `lib/assistant.ts`. Se actualizaron `README.md` y `docs/GUIA-PRESENTACION.md`; las pruebas están en `tests/personalization.test.ts` y `tests/platform.test.ts`.

Archivos retirados del calculador: `components/storefront/SpacePlanner.tsx`, `components/storefront/SpacePlanner.module.css`, `lib/perimeter-estimate.ts` y `tests/perimeter.test.ts`. No se eliminaron productos, cuentas, solicitudes ni fotografías existentes.

