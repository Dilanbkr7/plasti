# Compra contraentrega, cuentas y base de datos

## Acceso a las tablas

La instalación actual utiliza PostgreSQL local mediante PGlite. Sus archivos están en `.data/postgres` y el esquema es `plastimad`. No existe todavía un proyecto Supabase conectado ni una contraseña independiente de PostgreSQL local. No abras estos archivos con un editor ni arranques otro proceso PGlite mientras el servidor los utiliza.

Entra por `/acceso` con la cuenta de administrador y abre **Base de datos**, o visita `/admin?view=database`. El visor permite seleccionar tablas, ver sus columnas, cantidad de filas y hasta 50 registros. Es de solo lectura y no expone contraseñas, tokens, imágenes privadas ni conversaciones con IA. Solo el administrador puede consultarlo.

Tablas principales:

- `users`: clientes y administradores; contraseñas guardadas con scrypt y sal.
- `products`: seis macetas, precios en centavos, colores y medidas.
- `requests`: solicitudes y pedidos. Los pedidos contraentrega incluyen `payment_method=cod`, datos de entrega y una copia de los datos y precios del producto.
- `request_events`: conversación y estados de cada pedido; `system=true` identifica el agradecimiento automático; las notas internas solo las ve administración.
- `sessions`, `reset_tokens`, `rate_limits`: acceso, recuperación y límites de uso.
- `analyses`, `chat_messages`: módulos de análisis y asistente.
- `feedback`: sugerencias y quejas; `audit`: registro de operaciones.

El navegador llama a las rutas `/api`; el servidor verifica la sesión y el rol antes de leer o escribir. Un cliente solo puede consultar sus pedidos y mensajes. Las cookies de sesión son HttpOnly. La base no se consulta directamente desde el navegador.

## Flujo para presentar

1. Explora la colección y selecciona maceta, color y cantidad.
2. Pulsa **Comprar ahora**. Si aún no accediste, crea una cuenta o usa **Ya tengo cuenta**. El sistema conserva tu selección al volver.
3. Completa nombre de quien recibe, teléfono, ciudad, dirección y referencia. La única forma de pago es **contraentrega**.
4. Confirma el pedido. El servidor consulta el precio real del catálogo y guarda el pedido, la copia del producto y el mensaje automático en una transacción. Reintentar el mismo envío no duplica el pedido.
5. Aparece **¡Gracias por tu compra!**, la referencia y el total. Pulsa **Ver mi pedido y mensajes**.
6. En **Mis pedidos y mensajes**, cliente y administrador pueden conversar dentro del sistema. La vista se actualiza cada cinco segundos mientras está visible.
7. Administración puede confirmar, preparar, marcar enviado y entregado. Las notas internas no aparecen al cliente. Un cliente no puede cancelar un envío ya despachado.

No hay cobro online ni integración con una empresa de transporte. El total mostrado corresponde a productos; envío y condiciones se acuerdan con el cliente antes del despacho. El agradecimiento confirma el registro, no un pago recibido.

## Cuentas de demostración

- `dilan@plastimad.com`: administrador solicitado.
- `comprador@plastimad.test`: cliente para realizar compras nuevas.
- `pruebas@plastimad.test`: cliente con un pedido ficticio ya registrado de dos Cónicas celestes, USD 70,00, agradecimiento automático y conversación inicial.

Los correos `.test` y la dirección y teléfono del pedido son ficticios. No se envía ningún correo ni se realiza ningún despacho. Las contraseñas no se incluyen en este documento ni en el código. Para repetir la preparación local usa `scripts/prepare-commerce-demo.ts` con `DEMO_ADMIN_PASSWORD` y `DEMO_CUSTOMER_PASSWORD` en el entorno y el servidor detenido.

## Supabase más adelante

El proyecto ya admite `DATABASE_URL` para PostgreSQL/Supabase. Con una base remota se aplica `database/schema.sql` y se configuran `DATABASE_URL` y `APP_URL` en el servidor/Netlify. Los datos locales no se transfieren automáticamente. La autenticación actual es propia, no Supabase Auth. Nunca pongas la cadena de conexión en variables `NEXT_PUBLIC_*`.
