# Hero 2.5D de PLASTIMAD

El recorrido de portada muestra tres productos reales: Cónica, Semiesférica y Facetada. El paisaje se mantiene con brillo 0.58, una veladura negra difuminada que protege el centro y luz lateral suave SideRays. Cada transición ocupa el 8 % del recorrido y sigue inmediatamente al scroll, sin suavizado añadido por GSAP.

## Archivos para editar

- `components/hero/hero-content.ts`: imágenes, nombres, títulos, descripciones y configuración del hero. `scrollHeight: "300svh"` define la pantalla fija más dos pantallas de desplazamiento. Reducirlo acorta el recorrido. `scrollScrub: true` elimina el retraso; `chapterProgress()` fija los puntos de cambio (26–34 % y 59–67 %).
- `public/images/coleccion/conica.webp`, `semiesferica.webp` y `facetada.webp`: fotografías usadas en el hero. Sustituye los archivos conservando el nombre o cambia la propiedad `image` en `hero-content.ts`. Usa fotos cuadradas, con fondo blanco y el producto completo.
- `public/images/hero-bosque.webp`: paisaje. Su ruta y oscuridad se controlan con `landscape` y `landscapeBrightness` en `hero-content.ts`.
- `components/hero/HeroScene.tsx`: planos de las fotografías, separación del fondo blanco en WebGL, cámara, flotación y transiciones. Son fotografías en una escena 2.5D, no GLB de los seis productos.
- `components/hero/ImmersiveHero.tsx` y `.module.css`: composición, GSAP, controles, degradados y adaptación móvil.
- `components/storefront/PlanterShop.tsx`: sección destacada que reemplaza la maceta rectangular anterior. Su producto y fotografía proceden del producto destacado de la base de datos (actualmente Semiesférica).
- `components/storefront/ProductStory.tsx`: fotografía de la sección de historia (actualmente Facetada).
- `lib/catalog/planter-collection.ts`: correspondencia entre los seis productos, identificadores, nombres y archivos de imagen. Las fichas obtienen precio, descripción y variantes del catálogo de la base de datos.

## Retirada del producto anterior

La antigua maceta geométrica quedó inactiva, sin imagen ni modelo público, conservando su registro para no romper solicitudes históricas. Los cuatro GLB y las fotografías anteriores se guardaron fuera de `public`, en `.data/retired-planter-assets`, y no se sirven desde la web. Se retiraron sus componentes 3D sin uso. `/macetas-3d` redirige a la colección actual.

`scripts/retire-legacy-planter.ts` aplica la retirada en la base local y destaca Semiesférica. No modifica una base remota. No añadas los GLB anteriores a estos productos: representan una forma diferente. Se necesitarán modelos propios para incorporar vistas 3D reales del catálogo actual.

## Iluminación lateral SideRays

- `components/hero/SideRays.jsx`: componente WebGL original proporcionado por el usuario (React Bits, variante JavaScript), adaptado para actualizar las opciones dentro de un efecto React y usar consumo gráfico moderado. No necesita dependencias nuevas.
- `components/hero/SideRays.css`: tamaño del contenedor y del canvas.
- `components/hero/ImmersiveHero.tsx`: carga dinámica de SideRays, exclusivamente en el hero; conecta pausa, movimiento reducido y visibilidad. Origen superior derecho, seguimiento del cursor muy leve y resolución limitada a 1.25.
- `components/hero/ImmersiveHero.module.css`: `.sideLighting` mezcla la luz con el paisaje y utiliza una máscara gradual para conservar negro el espacio de la maceta. `.focusVeil` oscurece el centro sin contornos dentados.
- `components/hero/hero-content.ts`: bloque `heroSettings.sideRays` para colores, intensidad, opacidad, velocidad, apertura, densidad y suavidad. Valores iniciales: intensidad 2.8, opacidad 0.9, velocidad 0.45 y sharpness 0.3. `scrollBoost: 0.675` aumenta momentáneamente el brillo y abre levemente el haz al desplazarse; vuelve al nivel base de forma gradual al detener el scroll. Usa 0 para desactivar el pulso. Respeta la pausa y la preferencia de movimiento reducido.

En el ajuste anterior se modificaron únicamente `ImmersiveHero.tsx` y `ImmersiveHero.module.css`: se eliminaron el SVG de las órbitas luminosas, `.lightTrails` y la animación `orbitLight`. No se vuelve a montar ese círculo ni el antiguo Orb. El nuevo efecto ilumina desde el lateral del hero y no rodea el producto con un anillo.

La escena conserva el texto centrado arriba, Cónica → Semiesférica → Facetada por scroll, planos R3F con leve flotación y el fondo negro circular detrás de las fotografías. El paisaje, la veladura y SideRays son capas independientes del producto y de los textos.

## Avance por gesto de scroll

`components/hero/useHeroSceneScroll.ts` convierte una ráfaga de rueda/trackpad o un deslizamiento vertical táctil en un avance de escena completo. No captura gestos sobre diálogos o campos. Al llegar a los extremos libera el desplazamiento normal. El ScrollTrigger completa también las posiciones intermedias con snap.

En `hero-content.ts`, `sceneStops` define las tres posiciones, `sceneStepDuration: 0.28` la duración del salto y `wheelGestureGap: 180` el intervalo en milisegundos para distinguir gestos del trackpad. La pausa y la preferencia de movimiento reducido hacen el cambio inmediato. Los botones de escenas usan las mismas posiciones.

## Recuperación de escenas y luz

`ImmersiveHero.tsx` toma el progreso desde la geometría real del hero en cada evento nativo de scroll, además de ScrollTrigger. Recalcula al cargar fuentes, redimensionar, volver a la pestaña o restaurar la página. El escenario se identifica con `data-hero-stage` en lugar de asumir que es el primer nodo.

`HeroScene.tsx` dibuja bajo demanda si está fuera de pantalla y solicita un nuevo dibujo cuando cambia de capítulo; oculta la fotografía alternativa solo después de producir un fotograma. `SideRays.jsx` señala su disponibilidad mediante `data-ready`; mientras no esté listo o si pierde el contexto WebGL, `.sideLighting::before` ofrece una iluminación lateral de respaldo sin anillos. El pulso conserva `scrollBoost: 0.675`.

Los atributos `bis_skin_checked` y `bis_register` no pertenecen al proyecto. Si una extensión los inyecta antes de la hidratación, puede aparecer un aviso de React; no se silencia globalmente ni se altera la autenticación para ocultarlo.

## Respuesta rápida del hero

Los saltos duran ahora `sceneStepDuration: 0.14` segundos y la agrupación de rueda usa `wheelGestureGap: 100` ms. Los botones de escenas comparten el mismo controlador de scroll, sin la animación smooth independiente del navegador. El ajuste final de ScrollTrigger tiene 80 ms de espera y 100 ms de duración. La cámara sigue al cursor con menos amortiguación. SideRays aparece sin introducción lenta y usa `response: 20` para seguir al cursor; conserva la intensidad base y `scrollBoost: 0.675`.
