# PLASTIMAD: guía para presentar el avance

## Qué está funcionando

- Landing con identidad visual existente, hero inmersivo y cuatro modelos GLB en la galería.
- Maceta geométrica en negro, tomate, verde y celeste a **USD 29,99 por unidad**.
- Base configurada de **70 × 70 cm**. La altura de la maceta sigue pendiente de confirmar.
- Personalización en `http://127.0.0.1:3000/#analiza`: fotografía de referencia, vista previa y colores negro, tomate o celeste, además de elección automática.
- La generación permanece pendiente; la foto se muestra en el navegador y no se transmite. Resultado, regeneración y compra esperan una propuesta real.
- El formulario de metros y separación se retiró de la web. La nueva arquitectura y los siguientes pasos están en [PERSONALIZACION.md](./PERSONALIZACION.md).

## Acceso y roles

1. Abrir `http://127.0.0.1:3000/acceso`.
2. Un cliente crea su cuenta en `/registro` y accede a `/panel`.
3. La cuenta administradora local es `admin@plastimad.local`; consultar su contraseña generada en `.data/dev-access.txt`, de manera privada. No mostrar ese archivo durante la exposición.
4. El administrador entra a `/admin`. El servidor verifica la sesión y el rol antes de permitir operaciones protegidas.

El registro público crea clientes; no permite elegir ser administrador. La autenticación está implementada en Next.js: contraseñas derivadas con scrypt, tokens de sesión guardados como hash y cookie HTTP-only. Los usuarios se guardan en `plastimad.users`.

## Base de datos: estado real

Actualmente se utiliza **PGlite local**, un motor PostgreSQL embebido cuyos datos están en `.data/postgres`. La consulta de esta entrega verificó una cuenta y cuatro productos, incluida la maceta publicada; esos conteos cambiarán al registrar datos nuevos.

Flujo: **navegador → API de Next.js → comprobación de sesión y permisos → base de datos**.

Supabase está preparado como siguiente paso, pero **todavía no está conectado**. Se utilizará su PostgreSQL mediante `DATABASE_URL`, solo desde el servidor. Esta implementación utiliza usuarios propios: no usa Supabase Auth y las cuentas no aparecerán en la sección Authentication de Supabase. En Supabase, las tablas se consultarán en el esquema `plastimad` desde las herramientas de base de datos.

El esquema está en `database/schema.sql`. La guía de conexión está en [SUPABASE.md](./SUPABASE.md): crear el proyecto, configurar variables privadas, ejecutar migración, crear administrador remoto y comprobar conexión. Los datos locales no se copian automáticamente. No exponer el esquema privado a la API pública de Supabase.

## Asistente e IA

El asistente público puede responder desde el catálogo a preguntas sobre precios, colores y características. La conexión de análisis visual con un proveedor externo sigue pendiente; no hay clave de IA configurada. La recuperación de contraseña por correo también necesita configurar un proveedor SMTP para entrega real.

La personalización de imágenes usará los seis productos reales y sus fotografías originales cuando se completen los datos y se conecte el proveedor. No debe presentarse como una función de IA activa todavía. La compra actual registra solicitudes comerciales con el producto y color reales; no hay checkout de pago.

Los archivos del nuevo módulo están documentados en [PERSONALIZACION.md](./PERSONALIZACION.md). Los textos y la rapidez del hero siguen en `components/hero/hero-content.ts`.
