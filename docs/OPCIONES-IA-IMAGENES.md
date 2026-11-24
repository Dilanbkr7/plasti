# Opciones de IA para incorporar macetas — consulta del 20 de octubre de 2026

Se necesita edición con **dos referencias**: fotografía original del espacio y fotografía de una maceta real elegida del catálogo. Una API que solo genera imágenes desde texto no basta para este caso. Las siguientes son opciones para evaluar; no se han conectado ni probado con fotos de clientes en esta entrega.

| Opción                                     | Encaje para PLASTIMAD                                                                                                                                | Gratuidad y límites                                                                                                                                                                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Qwen-Image-Edit-2511                       | Edición con referencias y aplicaciones de diseño de producto. Mi primera opción para ensayar una solución abierta.                                   | Licencia Apache 2.0; ejecución propia sin tarifa por llamada. Requiere GPU, instalación, electricidad y mantenimiento. La licencia gratuita no hace gratis una API alojada.                                                                    |
| FLUX.2 klein 4B                            | Edición rápida; candidato práctico para un servicio local separado del frontend.                                                                     | Modelo 4B Apache 2.0. El fabricante publica 8,4 GB de VRAM en su configuración de inferencia; el consumo real depende del flujo y las optimizaciones. La API del proveedor es de pago. No confundir con variantes 9B de licencia no comercial. |
| Gemini 3.1 Flash Image                     | Edición conversacional y combinación de imágenes; candidato para una integración alojada.                                                            | La generación por API no dispone de nivel gratuito según la tabla oficial consultada. No asumir que el acceso a la aplicación Gemini equivale a una API gratuita.                                                                              |
| GPT Image 2.5 Sunburst                     | El fabricante lo orienta a precisión de edición y referencias; candidato para conservar el producto dentro del espacio.                              | API de pago por uso. El costo depende de entradas, tamaño, calidad y salida; no es una tarifa fija universal por montaje.                                                                                                                      |
| Adobe Firefly Precise / Adaptive Composite | Especializado en incorporar un objeto a un fondo existente. Precise prioriza conservar el objeto; Adaptive lo regenera para integrarlo en la escena. | Requiere acceso y credenciales de Firefly Services. Confirmar condiciones comerciales con Adobe; no se verificó una cuota API gratuita garantizada.                                                                                            |

Fuentes oficiales:

- [Modelo y licencia de Qwen](https://huggingface.co/Qwen/Qwen-Image-Edit-2511).
- [FLUX.2 klein: licencia y hardware](https://bfl.ai/models/flux-2-klein), [tarifas de la API](https://bfl.ai/pricing).
- [Generación de imágenes con Gemini](https://ai.google.dev/gemini-api/docs/image-generation), [tarifas de Gemini](https://ai.google.dev/gemini-api/docs/pricing).
- [Generación y edición de OpenAI](https://developers.openai.com/api/docs/guides/image-generation), [modelo Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst).
- [Adobe Object Composite](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/how-tos/object-composite/), [acceso a Firefly Services](https://developer.adobe.com/firefly-services/docs/guides/get-started).

## Recomendación para este proyecto

Para evitar pagos a una API, probaría **Qwen-Image-Edit-2511 en una GPU propia o de la universidad**, o **FLUX.2 klein 4B** si el equipo disponible favorece un modelo menor. Hace falta verificar la GPU concreta antes de instalar modelos. Ese servicio de inferencia viviría fuera de las funciones de Netlify y la web se comunicaría con él a través de su API privada.

Sin GPU propia disponible, compararía primero Gemini y GPT Image con un presupuesto acotado y las mismas escenas. Adobe Precise Composite merece una prueba si conservar exactamente la maceta es prioritario. Esta preferencia es una valoración para PLASTIMAD, no un resultado de benchmark realizado aquí.

Flujo previsto: analizar el espacio → escoger un ID dentro de los seis productos → recuperar fotografía y color reales → editar el espacio con esa referencia → validar que el producto se mantiene reconocible → mostrar imagen, ID, color y precio desde la base. El usuario no tendrá que elegir modelo ni ubicación.

Una imagen generada puede cambiar geometría, escala o texturas. Para una fotografía de venta fiel, conviene evaluar una composición del recorte original con perspectiva, oclusiones, iluminación y sombras, y reservar la regeneración a zonas controladas. Debe probarse con varias escenas antes de prometer fidelidad.

El siguiente paso es una prueba comparativa con patios y terrazas vacíos. Esta entrega mantiene el modo informativo: no envía fotos a terceros ni consume créditos.
