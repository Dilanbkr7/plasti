import { AuthForm } from "@/components/platform/AuthForm";
import "@/components/platform/platform.css";
export default async function Reset({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return <AuthForm mode="reset" token={(await searchParams).token} />;
}
