import type { Product } from "./platform";
import { dimensions, priceLabel } from "./storefront";
export type Topic =
  | "price"
  | "colors"
  | "dimensions"
  | "features"
  | "contact"
  | "availability"
  | "analysis"
  | "feedback"
  | "unknown";
export function detectTopics(message: string): Topic[] {
  const text = message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const topics: Topic[] = [];
  if (/precio|cuesta|costo|vale|valor|dolar/.test(text)) topics.push("price");
  if (/color|negro|verde|tomate|celeste/.test(text)) topics.push("colors");
  if (/mide|medida|dimension|alto|ancho|largo|tamano/.test(text))
    topics.push("dimensions");
  if (
    /caracter|material|recicla|madera|diseno|hech|terraza|patio|uso/.test(text)
  )
    topics.push("features");
  if (/compr|cotiza|asesor|contact|solicitud|humano/.test(text))
    topics.push("contact");
  if (/envio|entrega|stock|disponib|garantia|pago|descuento/.test(text))
    topics.push("availability");
  if (/analiz|foto|imagen|espacio|cuant[oa]s/.test(text))
    topics.push("analysis");
  if (/queja|sugerencia|reclamo/.test(text)) topics.push("feedback");
  return topics.length ? topics : ["unknown"];
}
export function answerFromCatalog(topics: Topic[], product: Product) {
  const answers: Record<Topic, string> = {
    price: `${product.name}: ${priceLabel(product)}. ${product.price_cents ? "El valor final, transporte e instalación se confirman en la propuesta comercial." : "Todavía no hay un importe publicado; no puedo darte un precio confirmado."}`,
    colors: `Colores publicados para ${product.name}: ${product.colors.join(", ")}. Confirma disponibilidad antes de realizar tu pedido.`,
    dimensions: `${product.name}: ${dimensions(product)}. Tamaños publicados: ${product.sizes.join(", ")}.`,
    features: `${product.name}. ${product.description}`,
    contact:
      "Puedes completar el formulario de asesoría de esta página. Inicia sesión para enviar la solicitud y consultar su seguimiento en Mi cuenta. No se realiza un cobro ni una compra automática.",
    availability:
      "No tengo condiciones confirmadas de existencias, envío, entrega, pagos ni garantías. El equipo comercial debe confirmarlas en tu solicitud; no puedo prometerlas.",
    analysis:
      "En Personaliza tu espacio puedes subir y cambiar una fotografía, elegir un color del catálogo o dejar que la IA lo elija. La generación de imágenes todavía está pendiente de conexión: no hay propuestas generadas ni compras automáticas.",
    feedback:
      "En la sección Te escuchamos puedes registrar una queja o sugerencia. Accede a tu cuenta para enviarla y consultar la respuesta del equipo.",
    unknown:
      "Puedo ayudarte con características, materiales, colores, medidas y precios de PLASTIMAD. Para información que no esté publicada, usa Solicitar asesoría y nuestro equipo podrá confirmarla.",
  };
  return [...new Set(topics)].map((topic) => answers[topic]).join("\n\n");
}
