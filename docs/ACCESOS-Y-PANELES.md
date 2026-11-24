# Accesos, pedidos y cuentas PLASTIMAD

## Rutas locales

Con el servidor iniciado mediante `npm run dev`, abre:

| Uso | Dirección |
| --- | --- |
| Iniciar sesión | http://localhost:3000/acceso |
| Registrarse como cliente | http://localhost:3000/registro |
| Cliente: pedidos y conversaciones | http://localhost:3000/panel |
| Cliente: quejas y sugerencias | http://localhost:3000/panel?view=feedback |
| Cliente: datos y contraseña | http://localhost:3000/panel?view=profile |
| Administrador: pedidos y conversaciones | http://localhost:3000/admin |
| Administrador: clientes, registros y accesos | http://localhost:3000/admin?view=users |
| Administrador: productos, colores y precios | http://localhost:3000/admin?view=catalog |
| Administrador: tablas de la base de datos | http://localhost:3000/admin?view=database |

## Panel simplificado

Al entrar, ambos roles abren directamente los pedidos. Ya no existe la pantalla de bienvenida con estadísticas ni la barra lateral grande. En ordenador, la lista de pedidos y la conversación aparecen juntas. En móvil, pulsa un pedido para abrirlo y utiliza «Volver a pedidos» para regresar a la lista.

El importe y el estado aparecen en la cabecera del pedido. «Ver productos y datos de entrega» muestra las líneas, cantidades, colores, precios y dirección. La conversación se actualiza cada cinco segundos mientras la página está visible. «Enviar mensaje» publica en la conversación. En «Gestionar pedido», el administrador puede cambiar el estado o guardar una nota privada con controles separados. El cliente puede cancelar desde «Opciones del pedido» cuando el estado lo permite.

El cliente abre directamente «Mis pedidos» y puede entrar a «Quejas y sugerencias» desde la segunda pestaña. Sus nuevos pedidos se registran al confirmar la compra contraentrega. El cliente puede responder en las conversaciones abiertas de sus pedidos y solicitudes anteriores. El administrador tiene dos pestañas, «Pedidos y mensajes» y «Productos», y un menú «Gestión» para cuentas, base de datos y quejas. «Mi cuenta» está en la cabecera. Para abrir un pedido específico, utiliza `/panel?view=requests&pedido=ID` o `/admin?view=requests&pedido=ID`.

## Dónde está la base de datos

La conexión se decide en `lib/server/db.ts`:

- Si `DATABASE_URL` está vacío, el desarrollo utiliza PostgreSQL embebido mediante PGlite. Por defecto sus archivos están en `C:\Users\pauly\plasti\.data\postgres`; `LOCAL_DATABASE_PATH` puede cambiar esa carpeta.
- Si `DATABASE_URL` contiene una conexión PostgreSQL, se utiliza esa base remota, por ejemplo Supabase.
- El esquema de tablas está en `C:\Users\pauly\plasti\database\schema.sql`. Es la estructura, no una copia de los datos.
- La configuración privada se encuentra en `.env.local`. No publiques su contenido.

En administración, «Gestión → Base de datos» muestra el motor activo y las tablas. Selecciona `users` para ver las cuentas recientes. El visor es de solo lectura. Para editar productos utiliza «Productos» y para gestionar cuentas, «Gestión → Clientes y cuentas». No modifiques los archivos internos de `.data/postgres` con un editor de texto ni abras esa carpeta con dos procesos PGlite a la vez.

| Tabla | Qué conserva |
| --- | --- |
| `plastimad.users` | Identificador, nombre, correo, contraseña protegida, rol y fecha de registro |
| `plastimad.sessions` | Sesiones y caducidad; los tokens no se muestran en el visor |
| `plastimad.products` | Las macetas, precios en centavos, colores, dimensiones e imágenes |
| `plastimad.requests` | Pedidos, productos, importes, dirección y estado |
| `plastimad.request_events` | Conversación, agradecimiento automático y cambios de estado |
| `plastimad.audit` | Actividad: creación de cuenta, acceso y acciones administrativas |
| `plastimad.personalization_jobs` | Trabajos de personalización de imágenes |

## Comprobar registro y acceso

1. Abre `/registro` y crea una cuenta con nombre, correo y una contraseña de al menos 12 caracteres. Usa un correo distinto para cada cuenta.
2. Se guarda un cliente en `users` y se inicia su sesión. Si hay una compra pendiente, regresa a ella; en otro caso abre `/panel`.
3. En otra sesión de navegador, entra como administrador y abre `/admin?view=users`. La cuenta aparece con correo, rol, fecha de registro y último acceso. La lista se actualiza cada diez segundos; también tiene «Actualizar usuarios».
4. Cierra sesión en el cliente y vuelve a entrar desde `/acceso`. El último acceso se actualiza únicamente al iniciar una sesión correctamente; una contraseña incorrecta no registra un acceso exitoso.
5. En el visor de tablas selecciona `audit`: `user.created` identifica la creación y `auth.login` la apertura de sesión. Al registrarse se abre también una sesión, por lo que aparecen ambos eventos.

Los nuevos eventos se registran desde esta actualización. Una cuenta antigua conserva su fecha original y mostrará «Sin accesos registrados desde esta actualización» hasta iniciar sesión otra vez. No se inventan accesos anteriores.

La contraseña se almacena como un hash con sal mediante scrypt: no se puede consultar en texto. El correo se registra, pero esta fase no confirma su propiedad mediante un enlace de verificación. Recuperar la contraseña por correo requiere SMTP configurado.

## Comprobar compra y conversación

1. Como cliente, selecciona una maceta, color y cantidad, y pulsa «Comprar ahora» o utiliza el carrito.
2. Si no tienes sesión, el sistema solicita acceso o registro conservando la compra pendiente.
3. Completa nombre, teléfono, ciudad, dirección y referencia. Confirma el pedido contraentrega.
4. Abre `/panel`: el pedido tiene su importe, estado y agradecimiento automático. Escribe un mensaje.
5. Como administrador abre `/admin`, selecciona ese mismo pedido, responde y actualiza su estado. La respuesta aparece en la sesión del cliente.
6. Prueba ambos roles en una ventana normal y otra privada para mantener sesiones independientes.

Los importes contraentrega son pedidos registrados, no cobros electrónicos recibidos. La aplicación comprueba la sesión y el rol en el servidor: cada cliente solo consulta sus propios pedidos; administración puede gestionarlos.

## IA y publicación

La personalización actual utiliza Hugging Face cuando `HF_TOKEN` está configurado, su cuota está disponible y los Spaces responden. Estos paneles y sus mensajes no dependen de que funcione la IA. No se ha cambiado el proveedor ni contratado un plan en esta entrega.

Para Netlify se necesita PostgreSQL remoto mediante `DATABASE_URL`; la carpeta local no sirve como almacenamiento persistente de producción. Consulta `docs/SUPABASE.md` para esa configuración.

## Archivos de esta actualización y comprobaciones

- `components/platform/Dashboard.tsx` y `Dashboard.module.css`: cabecera, navegación compacta y entrada directa a pedidos.
- `components/platform/RequestsPanel.tsx` y `Orders.module.css`: lista, conversación, resumen desplegable y navegación móvil.
- `components/platform/PeoplePanel.tsx`: fechas de registro y último acceso, actualización automática de clientes.
- `components/platform/AuthForm.tsx`: textos de acceso orientados a compras y conversaciones.
- `lib/server/auth.ts`: registro transaccional de creación de cuenta y apertura de sesión en `audit`.
- `lib/server/administration.ts` y `lib/platform.ts`: último acceso disponible únicamente en la consulta administrativa de cuentas.
- `lib/server/requests.ts`: datos del cliente en el detalle autorizado del pedido.
- `database/schema.sql`: índice adicional de actividad de acceso; conserva las cuentas y pedidos existentes.
- `tests/platform.test.ts`: verificación de accesos y del recorrido registro → pedido → conversación privada.

Se verificaron 52 pruebas, tipos y ESLint sobre `app components lib scripts tests`. La compilación de producción pasó mediante `npx next build --webpack`; Turbopack presentó un fallo interno al iniciar el proceso de estilos en este entorno. No se cambió el compilador predeterminado del proyecto. Si necesitas iniciar desarrollo con Webpack, utiliza `npm run dev -- --webpack`. La revisión global `npm run lint` también incluye archivos de terceros de `public/decoders`, que presentan avisos y errores ajenos a estos cambios.
