import { requireUser } from "./auth";
import { query } from "./db";
import { HttpError } from "./security";

const tableNames = [
  "users",
  "products",
  "requests",
  "request_events",
  "feedback",
  "audit",
  "sessions",
  "reset_tokens",
  "rate_limits",
  "analyses",
  "chat_messages",
  "personalization_jobs",
] as const;
const views: Record<string, string> = {
  users: "id,name,email,role,phone,company,active,created_at",
  products:
    "id,name,price_cents,colors,sizes,length_cm,width_cm,height_cm,active,featured",
  requests:
    "id,user_id,title,quantity,color,unit_price_cents,estimated_total_cents,payment_method,delivery,items,status,created_at",
  request_events:
    "id,request_id,author_id,message,status,internal,system,created_at",
  feedback: "id,user_id,kind,subject,message,status,response,created_at",
  audit: "id,actor_id,action,target_id,created_at",
};
export async function databaseBrowser(request: Request) {
  await requireUser("administrator");
  if (request.method !== "GET")
    throw new HttpError(405, "Consulta de solo lectura.");
  const selected = new URL(request.url).searchParams.get("table") || "products";
  if (!tableNames.some((name) => name === selected))
    throw new HttpError(400, "Tabla no disponible.");
  const tables = await Promise.all(
    tableNames.map(async (name) => {
      const [count] = await query<{ count: string }>(
        `SELECT count(*)::text count FROM plastimad.${name}`,
      );
      const columns = await query<{ column_name: string; data_type: string }>(
        "SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='plastimad' AND table_name=$1 ORDER BY ordinal_position",
        [name],
      );
      return {
        name,
        count: Number(count.count),
        browsable: Boolean(views[name]),
        columns,
      };
    }),
  );
  // Only static, allowlisted identifiers are interpolated; secrets never leave the server.
  const rows = views[selected]
    ? await query(
        `SELECT ${views[selected]} FROM plastimad.${selected} ORDER BY created_at DESC LIMIT 50`,
      )
    : [];
  return {
    engine: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.includes("supabase")
        ? "Supabase PostgreSQL"
        : "PostgreSQL"
      : "PostgreSQL local · PGlite",
    schema: "plastimad",
    table: selected,
    tables,
    rows,
    limit: 50,
  };
}
