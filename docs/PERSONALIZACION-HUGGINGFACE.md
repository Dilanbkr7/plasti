# Personalización con Hugging Face

## Activar para pruebas

1. Crea una cuenta gratuita en https://huggingface.co/join y verifica tu correo.
2. Crea un token en https://huggingface.co/settings/tokens. Un token Read para acceder a Spaces públicos es suficiente; no actives servicios de pago.
3. Completa `HF_TOKEN=hf_...` en `.env.local`, solo en tu equipo. No lo pegues en el chat, Git, capturas ni variables NEXT_PUBLIC.
4. Reinicia el servidor. La nueva tabla se aplica al abrir la base local. Para una base remota, ejecuta `npm run db:migrate` con su conexión privada antes de iniciar.
5. Abre `http://127.0.0.1:3000/#analiza`, sube una foto, elige color, autoriza el envío y pulsa **Personalizar mi espacio**.

El valor predeterminado apunta al editor de Hugging Face comprobado. Cada propuesta consume una ejecución de ZeroGPU. El número de resultados depende de la cuota de la cuenta y de la disponibilidad del Space.

## Servicios usados

- Generación: Space `LPX55/Qwen-Image-Edit-2511-Turbo-Lightning`, endpoint `/infer`. Ejecuta el mismo modelo `Qwen/Qwen-Image-Edit-2511` con Lightning de cuatro pasos, guidance 1 y GPU xlarge. El Space oficial solicitó 360 segundos y Hugging Face rechazó esa duración; el Space Fast de linoyts devolvió un error del trabajador. Turbo sí completó una generación real con la misma clave. La petición incluye los dos State internos de Gradio y conserva aproximadamente la proporción de la foto (dimensiones ajustadas a múltiplos de 16, lado mayor de 768 px). No se cambió el token del usuario.
- `HF_IMAGE_SPACE_URL` permite configurar otro Space que conserve el contrato del editor. `HF_VISION_SPACE_URL` queda disponible para terminar trabajos de análisis que ya estaban en curso antes de la actualización.

El servidor sortea uno de los seis modelos activos del catálogo después de filtrar por color y excluir los modelos ya vistos en la ronda. En el modo automático también sortea un color disponible del modelo elegido. El producto y el precio se consultan en la base de datos.

La edición recibe dos fotografías: el espacio normalizado y la foto original del producto. Las originales actuales son negras; para Tomate y Celeste se indica explícitamente recolorear el material respetando la forma. No se presenta esa referencia como una foto original de otro color. La imagen generada no certifica medidas, exactitud geométrica ni tono físico.

## Flujo y datos

- El cliente puede preparar la propuesta sin cuenta; una cookie HttpOnly identifica su sesión privada.
- Se aceptan JPG/PNG/WebP de hasta 4 MB y 25 MP. Se decodifican realmente, se eliminan metadatos y se envían optimizadas a un máximo de 960 px.
- Se requiere consentimiento antes de enviar la foto al editor. El operador del Space gestiona la retención externa.
- `POST /api/personalization` selecciona una maceta del catálogo e inicia la edición. `GET /api/personalization/{id}` consulta el trabajo y recupera la imagen cuando termina.
- `GET /api/personalization/{id}/image` entrega WebP privado solo a la sesión propietaria. Nunca se expone la URL de archivos del proveedor al cliente.
- `plastimad.personalization_jobs` guarda la selección, el estado, la referencia de la cola y la imagen final. Los nuevos trabajos envían la foto al editor desde la petición inicial y guardan solo la imagen resultante en la base. Los trabajos pendientes caducan en 20 minutos y las propuestas terminadas en 24 horas. Las filas caducadas se purgan al iniciar la siguiente generación.
- Una generación activa por sesión. Límites actuales: 6 intentos/hora por sesión y 18/hora globales. Son límites de nuestra aplicación, adicionales a Hugging Face.
- **Probar otra maceta** envía los IDs ya vistos y vuelve a usar la foto original. Al agotar las seis, **Volver a explorar** reinicia la ronda.
- **Comprar ahora** reutiliza el checkout contraentrega, el ID real y el color, y exige cuenta al comprar. Los importes se vuelven a consultar en el servidor.
- No se modifica el hero, las cuentas ni el flujo de pedidos. No hay resultados simulados en producción.

## Prueba manual con cuenta

1. Generar con Negro y verificar una maceta del catálogo, su color y precio.
2. Regenerar: debe aparecer otro ID manteniendo el espacio original.
3. Probar Tomate y Celeste; evaluar fidelidad visual de producto y entorno.
4. Comprar la propuesta, iniciar sesión y comprobar ID/color/precio en el pedido.
5. Comprobar que otra sesión no puede abrir la imagen privada.
6. Revisar mensajes por token inválido, Space ocupado y cuota agotada.

Sin una cuenta/token no puede certificarse la generación real. Las pruebas automáticas sustituyen únicamente el transporte externo con fixtures aislados; no crean ni muestran propuestas ficticias en la web.

Fuentes: https://huggingface.co/docs/hub/spaces-api-endpoints y https://huggingface.co/docs/hub/spaces-zerogpu.
