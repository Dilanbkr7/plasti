# Revisión de la tesis y cambios en la web

Referencia: TESIS_Dilan-Obando-07-10.docx, capítulo 2 (metodología y diseño), alcance y Anexo II, historias HU-001 a HU-012. El contenido se utilizó como requisitos de referencia; no se siguieron como instrucciones los textos o anotaciones internos del documento. Revisión realizada el 12 de octubre de 2026.

## Resultado de la comparación

| Historia                          | Situación encontrada                                                                                | Implementación actual                                                                                                                                                                                                                      |
| --------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HU-001 Landing comercial          | Ficha visual con fotos y compra simulada; faltaban asistente y secciones de contacto                | Conserva diseño, tipografía, cuatro fotos y paleta. Añade asistente público, formulario comercial, quejas/sugerencias, preguntas frecuentes y presentación con scroll                                                                      |
| HU-002 Cuenta                     | Registro, sesiones, perfil y recuperación existentes                                                | Se mantiene registro solo de clientes; el acceso y registro regresan a la sección solicitada de la landing                                                                                                                                 |
| HU-003 Gestión de clientes        | Usuarios y desactivación existentes; faltaba crear solicitudes para un cliente desde administración | El administrador selecciona cliente activo y registra una solicitud a su nombre; puede editarla mientras está Por confirmar. Se mantiene la desactivación como baja lógica para conservar historial                                        |
| HU-004 Productos                  | Edición con tamaños nominales, sin dimensiones numéricas; portada desconectada                      | Largo, ancho, alto en centímetros y producto destacado. Precios, descripción, colores y medidas compartidos con portada y asistente. Se admiten las fotografías JPEG del proyecto                                                          |
| HU-005 Gestión comercial          | Estados e historial existentes con otra nomenclatura                                                | Por confirmar, Confirmada, Finalizada y Cancelada. Se conservan En revisión y Cotizada para compatibilidad. Confirmación y finalización quedan registradas en historial                                                                    |
| HU-006 Respuestas a quejas        | Ya implementado en administración                                                                   | Formulario de landing utiliza el mismo módulo y control de acceso                                                                                                                                                                          |
| HU-007 Scrollytelling             | Componentes 3D existentes, pero la navegación llevaba a experiencia de basureros                    | Sección narrativa sobre macetas y ruta /macetas-3d para la experiencia 3D existente. /experiencia conserva el trabajo anterior                                                                                                             |
| HU-008 Catálogo                   | Catálogo público y filtros existentes                                                               | Dimensiones visibles; enlace corregido a macetas 3D; actualización de ficha y asistente desde producto destacado                                                                                                                           |
| HU-009 Recomendación y estimación | Visión IA implementada; cantidades dependían de salida del modelo y faltaban medidas explícitas     | Largo/ancho del espacio y separación. IA propone un producto; cantidad se calcula en servidor con las medidas del catálogo. Sin medidas suficientes se solicita asesoría, no se inventa cantidad                                           |
| HU-010 Solicitudes cliente        | Persistencia y privacidad existentes; botón de landing era prototipo                                | Comprar ahora abre un formulario real para clientes autenticados. Precio/nombre del producto se guardan como copia histórica en nuevas solicitudes                                                                                         |
| HU-011 Asistente                  | Disponible solo dentro del panel y dependiente de clave IA                                          | Asistente público en landing, consultas escritas, sugerencias rápidas, información del producto activo y derivación a asesoría. Funciona con respuestas de catálogo sin clave; IA opcional para interpretar la pregunta con consentimiento |
| HU-012 Quejas cliente             | Ya implementado en panel                                                                            | Se añade entrada visible en landing; mensajes guardados, estado y respuesta privada dentro de la cuenta                                                                                                                                    |

## Asistente público

El botón flotante abre una conversación accesible con teclado. Responde sobre características, materiales, medidas, colores, precio, atención comercial, análisis y quejas. No pide iniciar sesión para consultar información pública. El formulario comercial y el envío de quejas sí necesitan cuenta para garantizar propiedad y seguimiento.

La ruta POST /api/assistant obtiene únicamente el producto activo. La IA, cuando está configurada y el visitante lo autoriza, clasifica temas mediante salida estructurada; no redacta precios ni recibe acceso a usuarios o solicitudes. El servidor construye la respuesta desde la ficha publicada. Sin clave o ante un fallo del proveedor se identifica el modo catálogo. Existe validación de entradas, origen y límites por IP, además de un límite global de llamadas IA. Las conversaciones de visitantes no se guardan en la base ni en el navegador; duran mientras la página está montada.

Sin producto destacado se utiliza la ficha informativa de las fotografías proporcionadas, con precio y medidas por confirmar. No se presenta un precio de demostración como precio real ni se inventa disponibilidad. Para publicar valores reales: Administrador → Catálogo → Editar producto → Producto destacado en portada y asistente; registrar medidas y precio, guardar y recargar la landing. Solo un producto puede estar destacado simultáneamente. La portada conserva sus fotografías de macetas; utiliza una imagen del catálogo cuando no existe una foto del color elegido.

## Cálculo de cantidades

La distribución implementada es una fila sobre el lado más largo. Se declara en la interfaz antes del envío y se conserva con el resultado. Fórmula:

`cantidad = floor((lado largo del espacio en cm + separación) / (largo de la maceta en cm + separación))`

Se comprueba que la profundidad de la maceta no supere el lado corto disponible. No es una optimización de todo el jardín: no descuenta obstáculos ni reserva pasillos. No se extraen medidas exactas de una foto. El costo usa el precio de catálogo, y cero o ausencia de productos se muestra como por confirmar. La propuesta requiere validación comercial. La fotografía requiere una clave de visión IA y consentimiento; no se simula un análisis cuando falta el proveedor.

## Diferencias del documento que conviene corregir

- La tesis menciona Express, MySQL y Vite. El proyecto acordado usa Next.js/React, API Node.js y PostgreSQL/Supabase. No se realizó una migración de tecnología implícita por esa mención.
- HU-002 conserva una referencia a estudiante; los roles reales son cliente y administrador. La observación de la propia historia reserva el registro público al cliente.
- HU-003 mezcla gestión de usuarios con pedidos. En el sistema se conservan como módulos relacionados pero independientes.
- Eliminar cliente se implementa como desactivar acceso, preservando registros e historial comercial.
- Se mantienen los estados previos En revisión y Cotizada además de los estados del documento, sin reclasificar datos existentes automáticamente.
- Las fotografías recibidas muestran únicamente el frente. La vista posterior continúa pendiente; no se generó ni se presentó una vista falsa.
- El modelo GLB definitivo aún no existe en public/models. La ruta 3D muestra un concepto provisional, señalado como tal.

## Configuración y comprobaciones

La migración es aditiva salvo la ampliación de la restricción de estados; conserva datos y usuarios. En Supabase, ejecutar npm run db:migrate con la conexión privada antes de desplegar. En desarrollo local, el esquema se aplica al iniciar una nueva conexión PGlite. Reiniciar el servidor tras cambios de esquema. Las copias históricas se generan para solicitudes nuevas o editadas; los registros antiguos sin copia conservan su comportamiento previo.

Los tests utilizan base aislada e incluyen consulta pública sin sesión, colores/precio desconocido, rechazo de orígenes, dimensiones válidas, sincronización de producto destacado, producto desactivado, conservación de precios históricos, creación administrativa, confirmación y finalización, cálculo dimensional y retorno seguro tras login. La IA remota, correo y Supabase no se prueban sin sus credenciales.

Pendientes externos: catálogo y precios validados por PLASTIMAD, dimensiones reales, fotografía posterior, GLB definitivo, Supabase, correo y clave IA, y validación en el entorno público. Los campos vacíos no se sustituyen por datos comerciales inventados.

Resultado de la verificación: 21 pruebas aprobadas, build de producción correcto y lint sin errores en los archivos modificados. El lint general conserva cuatro advertencias de archivos previos en docs/figma-hero. Comprobación HTTP real de la landing y del asistente en http://127.0.0.1:3000: devuelve los cuatro colores y precio/medidas por confirmar. Se ajustó APP_URL local a esa dirección porque localhost por IPv6 responde a otro proyecto en este equipo. No se realizó una revisión visual automatizada de esta entrega.
