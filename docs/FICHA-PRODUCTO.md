# Ficha de maceta y personalización

Actualización: **Agregar al carrito está operativo**. Consulta [CARRITO.md](./CARRITO.md); las referencias a un carrito pendiente más abajo documentan la fase anterior.

Actualizado el 20 de octubre de 2026.

## Interfaz

Desde la colección, pulsar la fotografía, el nombre o «Ver maceta y colores» abre una ficha adaptable con imagen grande, detalle ampliado, descripción y precio. Se muestran las variantes confirmadas negro, tomate y celeste. Las fotos originales siguen siendo negras; tomate y celeste se representan con filtros SVG en el navegador y se identifican como referencias digitales. No son fotografías nuevas ni resultados de IA.

A la derecha están, en este orden: «Comprar ahora», «Agregar al carrito» y «Personalizar mi maceta». La cantidad se conserva al abrir la solicitud comercial. Comprar requiere cuenta para enviar la solicitud. No se implementaron pagos ni un carrito persistente; Agregar al carrito muestra un estado informativo de preparación.

Personalizar abre el módulo dentro de la misma ficha. Se puede subir, cambiar o quitar el fondo sin cuenta. Después de cargar una foto válida aparecen los colores y «Que la IA elija». La generación queda pendiente. No se transmite ni almacena la foto en esta fase.

Las seis variantes se actualizaron en la base local conservando los IDs y precios. La generación futura solo tiene referencias originales para negro: no se asignan las fotografías negras a tomate o celeste. Para obtener fidelidad de producto en esos colores habrá que aportar referencias originales o aprobar un proceso de creación de referencias antes de activar la IA.

## Archivos

- `components/storefront/PlanterProductDetail.tsx` y su CSS: ficha, colores, cantidad y módulos de compra/personalización.
- `components/storefront/ProductColorPreview.tsx`: imagen optimizada y filtro de color en SVG; conserva el archivo original.
- `components/storefront/PlanterCollection.tsx` y su CSS: acceso a cada ficha.
- `components/personalization/PlanterPersonalization.tsx`: foto sin cuenta, colores después de cargarla y opción automática; admite ubicación e inicialización desde la ficha.
- `lib/personalization/catalog.ts`: colores autorizados desde el catálogo y referencias originales verificables.
- `scripts/update-collection-colors.ts`: actualización idempotente de los colores en la base local; ejecutar solo con el servidor detenido.
- `scripts/import-planter-collection.ts`: mantiene los tres colores al repetir la importación.

## Ruta recomendada para IA sin pagos de API

Como el propietario no ha confirmado disponer de una NVIDIA, empezar por una prueba manual con el [Space oficial de Qwen Image Edit](https://huggingface.co/spaces/Qwen/Qwen-Image-Edit-2511). Los [Spaces ZeroGPU](https://huggingface.co/docs/hub/main/spaces-zerogpu) permiten uso gratuito sujeto a cuota y cola. El acceso a una demo gratuita no equivale a una API ilimitada o a disponibilidad de producción. No se ha conectado el Space ni verificado una generación real en esta entrega.

Para recomendación y explicación, evaluar [Qwen3-VL en Ollama](https://ollama.com/library/qwen3-vl), comenzando por 2B o 4B según RAM y rendimiento. Este modelo procesa imágenes y produce texto: puede devolver un ID permitido, color y justificación. La salida se validaría contra los seis productos y sus variantes. No es el generador de la fotografía personalizada.

Para generar la imagen localmente, Qwen Image Edit requiere un entorno de inferencia de imágenes, por ejemplo un flujo con ComfyUI, y hardware adecuado. Sin GPU confirmada no se promete rendimiento útil ni se descargan modelos grandes. Comprobar primero el equipo; si no es adecuado, usar las pruebas de Spaces dentro de sus límites.

Pasos propuestos para la siguiente fase:

1. Probar un espacio vacío y una fotografía de maceta en la demo oficial, dentro de su cuota.
2. Evaluar Ollama local para analizar el espacio y explicar una elección real del catálogo. Medir rendimiento antes de elegir tamaño de modelo.
3. Si la prueba de imagen es satisfactoria, documentar el contrato concreto del Space/proveedor y sus límites. Conectar un adaptador desde el servidor; las claves y tokens no irían al navegador.
4. Añadir consentimiento, límites, validación de archivos, almacenamiento de propuestas y manejo de fallos antes de habilitar Generar.
5. Terminar carrito, continuidad del producto al iniciar sesión y checkout cuando se defina ese alcance. Actualmente se reutiliza la solicitud comercial existente; el inicio de sesión vuelve a la sección de asesoría.

Ollama local y el generador de imágenes necesitan un proceso/servidor disponible. El equipo personal no queda accesible automáticamente desde Netlify y no se han abierto puertos ni creado túneles.
