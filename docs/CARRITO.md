# Carrito de PLASTIMAD

Ruta pública: `http://localhost:3000/carrito`.

## Flujo

En la ficha, elegir color y cantidad y pulsar **Agregar al carrito**. El mensaje confirma y ofrece **Ver mi carrito**. La cabecera también muestra el número de unidades.

El carrito permite cambiar cantidades (1–99 por producto/color), eliminar líneas y vaciarlo. La misma maceta y color se agrupan; colores distintos se conservan en líneas separadas.

**Finalizar compra** reutiliza el formulario contraentrega. Se puede agregar sin cuenta; al comprar se solicita registro o acceso y al volver se conserva el carrito. Confirmar crea un solo pedido con todas las líneas, importes históricos, entrega y agradecimiento automático. Cliente y administrador utilizan la conversación del pedido.

## Persistencia y precios

Se guardan únicamente IDs, colores, cantidades y una revisión UUID en `localStorage`, clave `plastimad.cart.v1`. Persiste al recargar y se sincroniza entre pestañas del mismo navegador y origen. Usa la misma dirección durante la compra: `localhost` y `127.0.0.1` tienen almacenamientos diferentes.

Nombres, fotos y precios proceden del catálogo actual. El servidor valida las líneas y calcula el total, sin confiar en precios del navegador. Si el importe cambió desde la revisión del cliente, se pide actualizarlo antes de confirmar. Una línea no disponible bloquea la compra completa sin crear pedidos parciales.

La revisión es la clave de checkout: reintentos simultáneos del mismo usuario no duplican pedido ni mensaje automático. El carrito se vacía tras el éxito solo si no cambió en otra pestaña durante el envío.

## Datos y compatibilidad

Se amplía `plastimad.requests` con `items jsonb`: copia de ID, nombre, color, cantidad, precio unitario, subtotal y foto por línea. Los pedidos anteriores siguen funcionando. La compra directa conserva su manejador; el checkout delega al nuevo manejador cuando recibe `items`.

Los paneles muestran los artículos y la conversación. El total corresponde a productos; el envío se coordina antes del despacho. No se realiza ningún cobro online.

## Archivos

- `lib/cart.ts`: contrato, validación local y agrupación.
- `components/storefront/useCart.ts`: persistencia y sincronización.
- `app/carrito/page.tsx`, `components/storefront/CartPage.tsx` y su CSS: página responsive.
- `PlanterProductDetail.tsx`, `PlanterShop.tsx`: agregar y acceso al carrito.
- `CommercialContact.tsx`: formulario de compra individual o múltiple.
- `lib/server/cart-checkout.ts`: transacción de compra múltiple.
- `lib/server/checkout.ts`: selección compatible de manejador.
- `components/platform/RequestsPanel.tsx`: artículos en ambos paneles.
- `database/schema.sql`: migración aditiva.

Pruebas en `tests/cart.test.ts` y `tests/platform.test.ts`, con bases aisladas.
