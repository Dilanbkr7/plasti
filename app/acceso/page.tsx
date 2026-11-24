import { AuthForm } from "@/components/platform/AuthForm";
import "@/components/platform/platform.css";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return <AuthForm mode="login" next={(await searchParams).next} />;
}
