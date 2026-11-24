import { AuthForm } from "@/components/platform/AuthForm";
import "@/components/platform/platform.css";
export default async function Register({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return <AuthForm mode="register" next={(await searchParams).next} />;
}
