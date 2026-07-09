"use client";

import Link from "next/link";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaApple, FaFacebook } from "react-icons/fa";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Separator } from "@/app/components/ui/separator";
import { authClient } from "@/lib/auth-client";

export default function AccountLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const params = new URLSearchParams(window.location.search);
    const siguiente = params.get("siguiente") ?? "/admin";
    const emailValue = email.trim();
    const passwordValue = password.trim();
    const authDisabled = process.env.NODE_ENV !== "production";

    if (authDisabled) {
      setLoading(false);
      if (!emailValue) {
        setMessage("Escribe un correo.");
        return;
      }
      if (passwordValue !== "12345678") {
        setMessage("La contrasena debe ser 12345678.");
        return;
      }
      window.location.href = siguiente;
      return;
    }

    const res = await authClient.signIn.email({
      email: emailValue,
      password: passwordValue,
      callbackURL: siguiente,
    });
    setLoading(false);
    if (res.error) {
      setMessage(res.error.message ?? "No se pudo iniciar sesion.");
      return;
    }
    window.location.href = siguiente;
  }

  return (
    <main className="app-min-h-screen bg-white px-4 pb-10 text-[#111827] sm:px-6 sm:pb-14">
      <div className="app-min-h-screen-nav-offset mx-auto flex w-full max-w-md items-center justify-center pt-24 sm:pt-28">
        <Card className="w-full border-slate-200">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Iniciar sesion</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder al panel interno.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Correo electronico</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
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
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  required
                />
              </div>
              {message ? (
                <p className="text-sm text-destructive">{message}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Iniciar sesion"}
              </Button>
            </form>

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

            <p className="text-center text-sm text-muted-foreground">
              No tienes una cuenta?{" "}
              <Link
                href="/account/register"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Crear cuenta
              </Link>
            </p>

            <Link
              href="/account"
              className="block text-center text-[0.72rem] uppercase tracking-[0.3em] text-slate-600 transition hover:text-slate-700"
            >
              Volver a cuenta
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
