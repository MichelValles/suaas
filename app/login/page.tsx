import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "USAAS · Acceso",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
