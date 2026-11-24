# Qué cambió y por qué

El documento F_AA_233A_DilanObando.docx se utilizó como referencia de requisitos para dos actores: cliente y administrador. La solicitud actual amplía el alcance original de frontend para incluir cuentas, datos persistentes y gestión comercial.

## Correspondencia con el documento

| Requisito                 | Implementación                                                      |
| ------------------------- | ------------------------------------------------------------------- |
| Acceso, registro y salida | Formularios, sesiones persistentes y revocación                     |
| Perfil de ambos roles     | Datos de contacto y cambio de contraseña                            |
| Gestión de usuarios       | Crear, editar rol, activar/desactivar sin borrar historial          |
| Catálogo y productos      | Consulta pública y edición administrativa                           |
| Solicitudes               | Registro vinculado a cliente/producto/análisis, estados e historial |
| Seguimiento               | Respuestas visibles, notas internas, filtros y CSV                  |
| Quejas/sugerencias        | Registro privado, respuesta y resolución                            |
| Análisis de espacios      | Foto, contexto, consentimiento, visión IA y estimación              |
| Asistente catálogo        | Chat IA con catálogo e historial por cliente                        |
| Experiencia inmersiva     | Se conservan seis escenas y carga automática del GLB                |

La gestión registra estimaciones y conversaciones; no emite facturas ni ofertas firmadas. El equipo puede comunicar condiciones finales en las respuestas de seguimiento.

## Decisiones

- **Next.js y TypeScript:** conservan la experiencia original, con API y páginas protegidas en un único proyecto preparado para Netlify.
- **PostgreSQL / Supabase:** relaciona usuarios, productos, solicitudes y eventos mediante claves y transacciones. Supabase administra infraestructura; Next.js contiene reglas de negocio.
- **PGlite local:** permite probar persistencia y cuentas sin una cuenta externa. No sirve como almacenamiento de producción.
- **Autenticación propia:** contraseñas con scrypt y sal aleatoria; tokens de sesión aleatorios cuyo hash se guarda en la base; cookies HttpOnly, SameSite y Secure en HTTPS. Contraseña, rol o desactivación revocan sesiones según corresponda. No se utiliza Supabase Auth.
- **Zod y SQL parametrizado:** validación en servidor y consultas sin concatenar entradas. El cliente no decide propietario, precio ni privilegios.
- **Control de origen y límites:** restringen operaciones cruzadas y abuso básico de acceso, recuperación e IA.
- **OpenAI Responses:** adaptador para imágenes y chat. Análisis con salida validada; productos desconocidos se descartan y precios se calculan desde el catálogo.
- **Sharp:** valida y reduce imágenes, elimina metadatos al convertirlas y limita tamaño/dimensiones.
- **Nodemailer / SMTP:** permite elegir proveedor de recuperación sin fijarlo en la interfaz.
- **Componentes independientes:** paneles por rol con formularios, estados vacíos y errores visibles, estilos adaptables y la identidad visual de PLASTIMAD.

## Datos y permisos

El esquema privado plastimad incluye usuarios, sesiones, recuperación, límites, productos, análisis, solicitudes, historial, feedback, chat y auditoría de determinadas operaciones. Las contraseñas y tokens de sesión no se almacenan en texto claro.

Cada operación privada verifica sesión y propiedad. Los clientes solo acceden a sus registros. Los administradores gestionan catálogo, usuarios y atención comercial. El registro público no permite crear administradores. Las notas internas no se devuelven al cliente. Se protege el acceso propio del administrador y la permanencia de al menos un administrador activo.

Estados: nueva → revisión → cotizada → cerrada, con cancelación y retorno de cotizada a revisión. El servidor rechaza transiciones inválidas. Productos archivados mantienen sus referencias históricas.

## Validación y pendientes

La suite usa un servidor HTTP real con una base local aislada y prueba: hashes, registro, sesiones, origen, roles, catálogo, propiedad y precios, estados, privacidad de notas y feedback, revocación, recuperación de un solo uso, proveedores sin configurar, filtrado de recomendaciones y cierre de sesión. No llama a servicios de pago ni envía correos externos. Se comprueban lint, TypeScript y build.

La revisión visual automatizada de esta ampliación quedó pendiente: la herramienta de navegador rechazó abrir la dirección local. No se presenta como una revisión visual aprobada.

Faltan los servicios externos reales: crear/configurar Supabase y Netlify, verificar TLS remoto, configurar SMTP y clave IA, cargar catálogo validado y modelo GLB. No se crearon cuentas externas ni se publicó el sistema.

No incluye pagos, facturación, verificación de correo, MFA, OAuth, avisos comerciales por correo, paginación más allá de 500 registros, edición de correo ni eliminación de cuenta/fotografías desde la interfaz. La autenticación propia no equivale a Supabase Auth. Antes de operar comercialmente deben configurarse copias de seguridad, retención y supervisión.
