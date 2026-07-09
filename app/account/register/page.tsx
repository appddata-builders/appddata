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

export default function AccountRegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    if (password !== confirmPassword) {
      setMessage("Las contrasenas no coinciden.");
      return;
    }
    if (!terms) {
      setMessage("Debes aceptar los terminos para continuar.");
      return;
    }
    setLoading(true);
    const params = new URLSearchParams(window.location.search);
    const siguiente = params.get("siguiente") ?? "/admin";
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    const res = await authClient.signUp.email({
      email,
      password,
      name: name.length > 0 ? name : email,
      callbackURL: siguiente,
    });
    setLoading(false);
    if (res.error) {
      setMessage(res.error.message ?? "No se pudo crear la cuenta.");
      return;
    }
    window.location.href = siguiente;
  }

  return (
    <main className="app-min-h-screen bg-white px-4 pb-10 text-[#111827] sm:px-6 sm:pb-14">
      <div className="app-min-h-screen-nav-offset mx-auto flex w-full max-w-md items-center justify-center pt-24 sm:pt-28">
        <Card className="w-full border-slate-200">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Crear cuenta</CardTitle>
            <CardDescription>
              Completa el formulario para registrarte en el panel interno.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Juan"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Perez"
                    required
                  />
                </div>
              </div>
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
                <Label htmlFor="password">Contrasena</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contrasena</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="********"
                  required
                />
              </div>

              <div className="flex items-start gap-3">
                <input
                  id="terms"
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  className="mt-2 h-4 w-4 rounded border border-border bg-slate-50 text-primary"
                />
                <label htmlFor="terms" className="text-sm leading-relaxed text-muted-foreground">
                  Acepto los terminos y condiciones y la politica de privacidad.
                </label>
              </div>

              {message ? (
                <p className="text-sm text-destructive">{message}</p>
              ) : null}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Crear cuenta"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-[0.65rem] uppercase tracking-[0.28em]">
                <span className="bg-card px-3 text-muted-foreground">o registrate con</span>
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
              Ya tienes una cuenta?{" "}
              <Link
                href="/account/login"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Iniciar sesion
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
