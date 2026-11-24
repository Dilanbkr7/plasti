import { redirect } from "next/navigation";
import { currentUser } from "@/lib/server/auth";
import { Dashboard } from "@/components/platform/Dashboard";
import "@/components/platform/platform.css";
export const metadata = {
  title: "Administración | PLASTIMAD",
  robots: { index: false, follow: false },
};
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; pedido?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/acceso");
  if (user.role !== "administrator") redirect("/panel");
  return (
    <Dashboard
      initialUser={JSON.parse(JSON.stringify(user))}
      initialView={(await searchParams).view}
      initialRequest={(await searchParams).pedido}
    />
  );
}
