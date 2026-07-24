"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaFacebook } from "react-icons/fa";
import { LuEye, LuEyeOff } from "react-icons/lu";

import { LoginLoadingOverlay } from "@/app/components/account/login-loading-overlay";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Separator } from "@/app/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { signInWithIdentifier } from "@/lib/sign-in-by-display-id";

const CONNECTION_ERROR = "Problemas de conexion. Vuelve a intentarlo en un momento.";
const DISABLED_ERROR = "Tu cuenta esta inhabilitada. Contacta al equipo de Appddata.";

function nextUrl(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("siguiente") ?? "/dashboard";
}

/**
 * La cookie de sesion la escribe el server action, pero el cliente tarda un
 * instante en verla. Se sondea antes de redirigir para no aterrizar en /dashboard
 * sin sesion y rebotar de vuelta aqui.
 */
async function waitForSessionUser() {
  for (let i = 0; i < 40; i++) {
    const s = await authClient.getSession();
    if (s.data?.user != null) return s.data.user;
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 150);
    });
  }
  return null;
}

export default function AccountLoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [overlayActive, setOverlayActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const redirectingRef = useRef(false);

  const handleConnectionTimeout = useCallback(async () => {
    const s = await authClient.getSession();
    const user = s.data?.user as { enabled?: boolean } | undefined;
    if (user != null && user.enabled !== false) {
      window.location.href = nextUrl();
      return;
    }
    redirectingRef.current = false;
    setOverlayActive(false);
    setMessage(CONNECTION_ERROR);
  }, []);

  // Si ya hay sesion viva, no tiene sentido mostrar el formulario.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const session = await authClient.getSession();
      if (cancelled || redirectingRef.current) return;

      const params = new URLSearchParams(window.location.search);
      if (params.get("inhabilitado") === "1") {
        setMessage(DISABLED_ERROR);
        return;
      }
      if (params.get("motivo") === "comprar-paquete") {
        setMessage("Para adquirir un paquete primero debes ingresar a una cuenta.");
      }
      if (params.get("sesionCerrada") === "1") return;

      const user = session.data?.user as { enabled?: boolean } | undefined;
      if (user == null) return;
      if (user.enabled === false) {
        await authClient.signOut();
        if (!cancelled) setMessage(DISABLED_ERROR);
        return;
      }
      window.location.href = nextUrl();
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    redirectingRef.current = true;
    setOverlayActive(true);

    const result = await signInWithIdentifier(identifier, password);
    if (!result.ok) {
      redirectingRef.current = false;
      setOverlayActive(false);
      setMessage(result.error);
      return;
    }

    const user = await waitForSessionUser();
    if (user == null) {
      redirectingRef.current = false;
      setOverlayActive(false);
      setMessage(CONNECTION_ERROR);
      return;
    }

    if ((user as { enabled?: boolean }).enabled === false) {
      await authClient.signOut();
      redirectingRef.current = false;
      setOverlayActive(false);
      setMessage(DISABLED_ERROR);
      return;
    }

    window.location.href = nextUrl();
  }

  return (
    <>
      <LoginLoadingOverlay active={overlayActive} onConnectionTimeout={handleConnectionTimeout} />
      <main className="app-min-h-screen bg-white px-4 pb-10 text-[#111827] sm:px-6 sm:pb-14">
        <div className="app-min-h-screen-nav-offset mx-auto flex w-full max-w-md items-center justify-center pt-24 sm:pt-28">
          <Card className="w-full border-slate-200">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Iniciar sesion</CardTitle>
              <CardDescription>
                Usa tu correo o tu ID de usuario (AP) para acceder al panel interno.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="identifier">Correo o ID</Label>
                  <Input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="tu@email.com o AP0001"
                    required
                    disabled={overlayActive}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="password">Contrasena</Label>
                    <Link
                      href="/account/forgot-password"
                      className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground transition hover:text-foreground"
                    >
                      Olvidaste tu contrasena?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={passwordVisible ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="********"
                      required
                      disabled={overlayActive}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordVisible((v) => !v)}
                      className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-muted-foreground transition hover:text-foreground"
                      aria-label={passwordVisible ? "Ocultar contrasena" : "Mostrar contrasena"}
                      disabled={overlayActive}
                    >
                      {passwordVisible ? <LuEyeOff className="h-4 w-4" /> : <LuEye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {message ? <p className="text-sm text-destructive">{message}</p> : null}
                <Button type="submit" className="w-full" disabled={overlayActive}>
                  {overlayActive ? "Entrando..." : "Iniciar sesion"}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                No tienes una cuenta?{" "}
                <Link
                  href="/account/register"
                  className="font-medium underline-offset-4 hover:underline text-[#1877F2]"
                >
                  Crear cuenta
                </Link>
              </p>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-[0.65rem] uppercase tracking-[0.28em]">
                  <span className="bg-card px-3 text-muted-foreground">o continua con</span>
                </div>
              </div>

              <div className="grid gap-3">
                <Button type="button" variant="outline" className="relative w-full" disabled>
                  <FcGoogle className="absolute left-4 h-5 w-5" />
                  <span>Google</span>
                </Button>
                <Button type="button" variant="outline" className="relative w-full" disabled>
                  <FaApple className="absolute left-4 h-5 w-5 text-[#111827]" />
                  <span>Apple</span>
                </Button>
                <Button type="button" variant="outline" className="relative w-full" disabled>
                  <FaFacebook className="absolute left-4 h-5 w-5 text-[#1877F2]" />
                  <span>Facebook</span>
                </Button>
              </div>

              <Link
                href="/account"
                className="block text-center text-[0.72rem] uppercase tracking-[0.3em] text-slate-600 transition hover:text-slate-700"
              >
                Opciones de Cuenta
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
