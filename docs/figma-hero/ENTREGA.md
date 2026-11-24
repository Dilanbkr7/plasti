# Hero: tres momentos

La versión actual de Figma está en `Hero-tres-secciones.fig`. Conserva `Page 1` y contiene tres estados de escritorio y tres de móvil en `Hero listo · Escritorio y móvil`.

1. **El origen:** El plástico merece otra historia.
2. **El problema:** 627.000 toneladas de residuos plásticos municipales en Ecuador en 2022; 7,7 % reciclado.
3. **La transformación:** Basureros hechos con plástico reciclado.

Fuente de las cifras: [WWF Ecuador, publicación de 2024 con datos de 2022](https://www.wwf.org.ec/?389213/Ecuador-lidera-una-historica-hoja-de-ruta-para-reducir-la-contaminacion--por-plasticos). Son residuos municipales, no consumo total de plástico.

## Scroll real

La portada de la web implementa el recorrido con scroll nativo de rueda, teclado o gesto. El escenario permanece visible y cambia con el avance; al subir, retrocede. No hay botones para cambiar de escena. El botón del cierre abre el sistema existente de solicitudes.

El fondo se desplaza hacia abajo 44 % de la altura de la ventana en escritorio y 30 % en móvil. Su tamaño mayor que la ventana evita bordes vacíos. En Figma los valores guía son Y −480 → −270 → −80 para escritorio y −260 → −170 → −80 para móvil; la web usa proporciones para adaptarse a cada tamaño.

La referencia de [Edge Dot Design](https://www.youtube.com/watch?v=vXjJZH_l6o8) utiliza Smart Animate de 2000 ms, entrada After delay y transiciones por clic. Se conservaron las curvas `0.43, -0.01, 0.14, 1` y `0.41, -0.01, 0.14, 1`, además del desenfoque de 6,7 px, adaptadas a la distancia de scroll. La duración de cada tramo depende del desplazamiento del usuario; no se fuerza una pausa de 2 segundos por evento de rueda.

Figma documenta los estados visuales; su prototipo no reproduce esta animación vinculada continuamente al scroll. Para probarla, abrir la web local. Las personas que prefieren movimiento reducido reciben las tres secciones en una disposición estática.

Se usaron las imágenes originales de Figma, convertidas a WebP para la web. No se sustituyó el paisaje.

## Archivos anteriores

`Hero-inmersivo-completo.fig`, `builder-base.js` y `builder-eight-scenes.js` son copias anteriores del recorrido con clics. La entrega actual es `Hero-tres-secciones.fig` y la portada de la aplicación.
