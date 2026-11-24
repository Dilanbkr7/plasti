import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server/auth";
import { Dashboard } from "@/components/platform/Dashboard";
import "@/components/platform/platform.css";
export const metadata = {
  title: "Mi espacio | PLASTIMAD",
  robots: { index: false, follow: false },
};
export default async function Panel({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; pedido?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/acceso");
  if (user.role === "administrator") redirect("/admin");
  const params = await searchParams;
  return (
    <Dashboard
      initialUser={JSON.parse(JSON.stringify(user))}
      initialView={params.view}
      initialRequest={params.pedido}
    />
  );
}
