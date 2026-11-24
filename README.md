# PLASTIMAD — experiencia 3D y sistema comercial

Sistema Next.js con landing comercial de macetas, asistente público, experiencia 3D, cuentas, administración, catálogo, seguimiento comercial, quejas y sugerencias y análisis de fotografías. Requisitos contrastados con TESIS_Dilan-Obando-07-10.docx. La revisión por historia de usuario está en [docs/REVISION-TESIS-07-10.md](docs/REVISION-TESIS-07-10.md).

La portada conserva las fotografías y el diseño de PLASTIMAD. El asistente consulta características, colores, dimensiones y precios sin exigir registro. Si se habilita IA y el visitante lo autoriza, OpenAI interpreta el tema de la pregunta; las respuestas comerciales se construyen siempre desde datos publicados. Sin clave funciona en modo catálogo. La experiencia 3D de macetas está en `/macetas-3d`; `/experiencia` conserva la presentación anterior.

En Administración → Catálogo puedes marcar un producto como destacado para compartir su precio, medidas, colores y descripción con la portada y el asistente. Si no hay producto destacado se muestra la ficha informativa original, sin precio ni medidas inventadas. Después de guardar, recarga la landing. Comprar ahora permite enviar una solicitud real desde una cuenta de cliente.

La personalización del espacio está en `/#analiza` y en la cuenta del cliente. Permite preparar una foto y elegir negro, tomate, celeste o elección automática. La generación de imágenes permanece desactivada; no se envían fotos ni se simulan propuestas. Los formularios de metros y separación se retiraron. Consulta [la arquitectura del módulo](docs/PERSONALIZACION.md).

Las solicitudes nuevas conservan una copia de la ficha y precio del producto. Los administradores pueden registrar solicitudes para clientes y confirmar/finalizar su atención. La compra actual es una solicitud comercial: todavía no hay carrito ni checkout de pago en este repositorio.

## Probar en tu equipo

Requisitos: Node.js 22 y npm.

```sh
npm ci
npm run setup:local
npm run dev
```

Abre [PLASTIMAD](http://localhost:3000) o [Iniciar sesión](http://localhost:3000/acceso).

- **Administrador:** correo y contraseña aleatoria en `.data/dev-access.txt`. Cambia la contraseña desde Mi perfil; el archivo inicial no se actualiza al cambiarla.
- **Cliente:** crea una cuenta en `/registro`. El registro público siempre crea clientes.
- La preparación local retira las tres fichas antiguas de demostración. Para cargar los productos reales en una base nueva, sigue la [guía de importación de la colección](docs/COLECCION-MACETAS.md).
- Los datos persisten en `.data/postgres` mediante PGlite. No ejecutes dos servidores o scripts simultáneamente contra esa misma carpeta. Los tests usan una base separada.
- El inicio local no necesita Supabase. IA y correo de producción requieren configurar proveedores.

## Módulos

| Módulo               | Cliente                                                                                      | Administrador                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Cuenta               | Registro, acceso, salida, perfil y contraseña                                                | Acceso, salida, perfil y contraseña                                              |
| Catálogo             | Consultar y solicitar productos                                                              | Crear, editar, archivar/reactivar; precios, colores, tamaños y rutas de recursos |
| Solicitudes          | Crear, editar mientras están nuevas, consultar, comentar y cancelar las propias              | Consultar todas, filtrar, cambiar estado, responder, notas internas y CSV        |
| Usuarios             | Editar su perfil                                                                             | Crear clientes/administradores, editar nombre/rol y activar/desactivar           |
| Quejas y sugerencias | Enviar y consultar las propias                                                               | Consultar, responder y resolver                                                  |
| Análisis del espacio | Imagen, contexto, recomendaciones, cantidades orientativas, estimación y solicitud vinculada | Consultar fotografía vinculada a una solicitud                                   |
| Asistente IA         | Conversación sobre catálogo e historial privado                                              | Configuración mediante variables privadas                                        |

Los permisos y la propiedad se verifican en el servidor.

## Supabase y Netlify

**Se utiliza PostgreSQL de Supabase con autenticación propia de Next.js, no Supabase Auth.** Las cuentas están en `plastimad.users`; no aparecerán en Authentication → Users de Supabase. Las sesiones son opacas, revocables y usan cookies HttpOnly. No se necesitan claves de Supabase en el navegador.

Consulta **[la guía de conexión](docs/SUPABASE.md)** para crear el proyecto, completar las variables privadas, aplicar el esquema y desplegar. No se ha creado ni conectado un proyecto real de Supabase o Netlify en esta entrega. La base local no se copia automáticamente a Supabase; el administrador de producción se crea por separado, sin productos ficticios.

## Estructura

- `app/`: experiencia, catálogo, acceso, registro, recuperación, paneles y API.
- `components/experience/`: seis escenas, controles y acceso a solicitudes/IA.
- `components/three/`: SceneCanvas, PlanterModel, CameraRig, LightingSystem, ParticleSystem y maceta provisional.
- `components/platform/`: cuenta, catálogo, solicitudes, usuarios, perfil, feedback e IA.
- `lib/server/`: PostgreSQL/PGlite, sesiones, permisos, validaciones, negocio, correo y proveedor IA.
- `lib/platform.ts`: tipos compartidos; `lib/experience.ts`: coreografía 3D.
- `database/schema.sql`: esquema privado, relaciones e índices.
- `scripts/setup.ts`: preparación local, migración, administrador y comprobación de conexión.
- `tests/platform.test.ts`: pruebas HTTP con base aislada.
- `docs/IMPLEMENTACION.md`: explicación de cambios y decisiones.

## Modelo definitivo

Coloca el archivo autocontenido en **`public/models/maceta.glb`** y recarga; en Netlify genera un nuevo despliegue. `useGLTF()` lo carga con Suspense, conserva materiales, centra y escala. Si falta o falla, se muestra la maceta provisional. Para modificar color/acabado, nombra las mallas o materiales editables con `maceta`, `planter`, `madera` o `wood`. Detalles en `public/models/README.md`.

El administrador registra rutas de GLB e imágenes existentes, pero no sube archivos del catálogo. La experiencia principal utiliza siempre `/models/maceta.glb`.

## IA, correo y alcance

La imagen se valida, reduce y transforma en WebP antes de enviarla al proveedor, con consentimiento del cliente. Se guarda la imagen procesada y el resultado en PostgreSQL privado; no el original. La IA recomienda productos existentes; los precios los calcula el servidor. Las cantidades son orientativas, no mediciones garantizadas; no se incluyen impuestos, transporte ni instalación.

Sin clave IA se informa que el servicio está pendiente, sin simular resultados. En desarrollo sin SMTP, los enlaces de recuperación se guardan en `.data/mail`. En producción se requiere SMTP.

No hay pagos, facturación, OAuth, verificación de correo ni doble factor. La atención comercial se comunica dentro del sistema, sin notificaciones automáticas por correo. Los listados admiten hasta 500 registros; para mayor volumen hacen falta paginación y métricas agregadas. Las métricas actuales reflejan los registros devueltos.

## Comprobaciones

```sh
npm run lint
npm run typecheck
npm run build
npm test
```

Los tests requieren build previo; inician el servidor compilado en el puerto 3101 y utilizan datos ficticios en `.data/qa-*`. No llaman a IA ni envían correo. Para servir el build local con PGlite se requiere `ALLOW_LOCAL_DATABASE=true`; Netlify exige PostgreSQL remoto.

Se conservan TypeScript, TailwindCSS, Three.js, React Three Fiber, Drei, GSAP ScrollTrigger, Lenis y Framer Motion. Canvas y diálogos tienen carga diferida; se respeta movimiento reducido. Fondo WebP y fuentes locales; recursos en `docs/assets.md`.
