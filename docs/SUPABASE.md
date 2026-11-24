# Conectar PLASTIMAD con Supabase y Netlify

Esta guía conecta el código existente. No implica que ya se haya creado o verificado una conexión remota.

## 1. Crear la base

Crea un proyecto en tu cuenta de Supabase y conserva la contraseña PostgreSQL en tu gestor de contraseñas. En **Connect**, copia la conexión PostgreSQL **Transaction pooler** que muestra tu propio proyecto para usarla en Netlify. La contraseña debe estar codificada correctamente en la URL si contiene caracteres especiales.

Supabase recomienda un pooler para funciones serverless. El cliente `pg` de esta aplicación no usa consultas preparadas con nombre. La conexión exige TLS con verificación de certificado. Si tu proyecto requiere una CA específica, descarga su certificado y configura `DATABASE_CA_CERT` en formato PEM; admite saltos de línea como `\n`. No desactives la verificación.

Referencias: [Conexiones PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres), [TLS](https://supabase.com/docs/guides/platform/ssl-enforcement).

## 2. Preparar las variables

Copia `.env.example` a `.env.local` y completa en privado:

| Variable         | Uso                                             |
| ---------------- | ----------------------------------------------- |
| DATABASE_URL     | Conexión PostgreSQL del proyecto con contraseña |
| APP_URL          | http://localhost:3000 durante pruebas locales   |
| DATABASE_CA_CERT | Solo cuando necesites una CA específica         |
| ADMIN_EMAIL      | Correo de la primera persona administradora     |
| ADMIN_NAME       | Nombre visible                                  |
| ADMIN_PASSWORD   | Contraseña única, mínimo 12 caracteres          |

No compartas secretos por chat ni los agregues a Git. No uses el prefijo NEXT_PUBLIC_. Reinicia el servidor cuando cambies variables. El comando setup:local rechaza bases remotas.

Con el servidor detenido:

```sh
npm run db:migrate
npm run admin:create
npm run db:check
npm run dev
```

El comando de administrador no reemplaza contraseñas ni cambia roles de cuentas existentes. Usa un correo que no se haya registrado como cliente. Retira ADMIN_PASSWORD de las variables después de crear la cuenta y conserva la contraseña en tu gestor. Inicia sesión en /acceso; debes llegar a /admin.

db:check consulta realmente las tablas e informa conteos, sin mostrar credenciales. No verifica SMTP ni IA.

**Los usuarios están en plastimad.users, no en Supabase Auth.** No expongas ese esquema en la Data API. El SQL revoca acceso a PUBLIC, anon y authenticated. Esta versión no utiliza RLS ni conexión directa desde el navegador: la API Next.js aplica los permisos con una conexión privada. Si se amplía el acceso directo a Supabase, hay que diseñar políticas específicas.

Para la creación inicial se necesitan permisos para crear esquema y tablas. Para separar administración y operación, puedes crear un usuario PostgreSQL de ejecución con lectura/escritura únicamente sobre las tablas de plastimad y reservar la cuenta de migraciones fuera de Netlify.

La base local no se copia automáticamente. La migración de producción no crea productos ficticios.

## 3. Correo

Configura SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD y SMTP_FROM con valores de tu proveedor. Verifica remitente y dominio. El servidor exige TLS: puerto 465 desde el inicio; otros puertos mediante STARTTLS.

Prueba /recuperar con una cuenta propia y confirma entrega y dominio del enlace. El enlace caduca en 30 minutos, se usa una sola vez y revoca sesiones al cambiar contraseña. APP_URL debe contener el dominio público después del despliegue.

En desarrollo sin SMTP se escriben mensajes en .data/mail; pueden contener enlaces privados y no deben publicarse. En producción sin SMTP se informa que recuperación no está configurada.

## 4. IA

Configura OPENAI_API_KEY en privado. OPENAI_MODEL debe admitir imágenes y salidas estructuradas en Responses y estar disponible en tu cuenta. El valor predeterminado del código es gpt-4.1-mini; no implica disponibilidad ni saldo.

El análisis envía fotografía procesada, contexto y catálogo activo después del consentimiento. El chat envía consulta, contexto reciente y catálogo. Las llamadas usan store: false; esto no equivale a afirmar retención cero del proveedor. La aplicación guarda resultados e historial en su base.

Prueba con una imagen no sensible y un catálogo real. Los límites implementados son 8 análisis/hora y 30 mensajes/hora por usuario. No sustituyen el control de gasto del proveedor. Sin clave, la interfaz informa servicio pendiente.

## 5. Netlify

Importa el repositorio. netlify.toml define Node 22, npm run build y .next. Netlify utiliza su adaptador Next.js. No uses exportación estática: cuentas y API necesitan funciones.

En las variables privadas del sitio, disponibles para **Functions** en producción, configura DATABASE_URL, DATABASE_CA_CERT si corresponde, SMTP y OpenAI. Define **APP_URL con el dominio HTTPS completo y sin barra final**.

No añadas ADMIN_PASSWORD, LOCAL_DATABASE_PATH ni ALLOW_LOCAL_DATABASE a Netlify. No ejecutes migraciones o creación de usuarios desde el build. La carpeta .data, los archivos .env, tests y documentación se excluyen del trazado de funciones.

Despliega después de modificar variables. Netlify rechaza almacenamiento local. Para vistas previas, usa una base independiente y el APP_URL de su propio dominio.

Referencias: [Next.js en Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), [variables de funciones](https://docs.netlify.com/build/functions/configuration/).

## 6. Comprobar con servicios reales

1. Abrir catálogo y experiencia; revisar GLB cuando esté disponible.
2. Registrar un cliente e iniciar/cerrar sesión.
3. Crear solicitud, responder como administrador y consultar como cliente.
4. Verificar que un cliente no puede abrir /admin ni consultar datos ajenos.
5. Registrar productos y precios reales.
6. Probar recuperación con entrega SMTP real.
7. Probar análisis/chat con clave real y revisar consumo en el proveedor.
8. Configurar copias de seguridad y definir conservación/eliminación de imágenes.

El build correcto no confirma conexión remota ni operación de proveedores. Esta entrega verifica los flujos locales; estos pasos requieren tu proyecto y credenciales privadas.
