import {
  LoginForm,
  RedirectTo,
  type LoginMode,
} from "@/app/admin/login/login-form";
import { probeAuthTables } from "@/lib/db";
import { getSession, isAuthConfigured } from "@/lib/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session) return <RedirectTo href="/admin" />;
  if (!isAuthConfigured()) return <LoginForm mode="unconfigured" />;
  const probe = await probeAuthTables();
  if (!probe.ok) {
    return <LoginForm mode="tables-missing" detail={probe.error} />;
  }
  const mode: LoginMode = probe.count === 0 ? "register" : "signin";
  return <LoginForm mode={mode} />;
}
