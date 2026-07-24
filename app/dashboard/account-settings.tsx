"use client";

import { useState } from "react";
import { LuCheck, LuLoaderCircle, LuSave, LuUserRound } from "react-icons/lu";

import { authClient } from "@/lib/auth-client";

type AccountSettingsProps = {
  user: {
    name: string | null;
    email: string;
    phone: string | null;
    image: string | null;
    displayId: string | null;
  };
};

export function AccountSettings({ user }: AccountSettingsProps) {
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [image, setImage] = useState(user.image ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const profileResult = await authClient.updateUser({
      name: name.trim(),
      phone: phone.trim() || null,
      image: image.trim() || null,
    });

    if (profileResult.error) {
      setError(profileResult.error.message ?? "No fue posible guardar los cambios.");
      setSaving(false);
      return;
    }

    if (email.trim().toLowerCase() !== user.email.toLowerCase()) {
      const emailResult = await authClient.changeEmail({
        newEmail: email.trim(),
        callbackURL: "/dashboard/configuracion/settings",
      });
      if (emailResult.error) {
        setError(emailResult.error.message ?? "El perfil se guardó, pero no fue posible cambiar el correo.");
        setSaving(false);
        return;
      }
      setMessage("Perfil guardado. Revisa tu correo para confirmar la nueva dirección.");
    } else {
      setMessage("Los datos de tu cuenta se guardaron correctamente.");
    }
    setSaving(false);
  }

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Configuración</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">Datos de la cuenta</h1>
        <p className="mt-2 text-sm text-slate-600">Actualiza la información vinculada con tu usuario de Appddata.</p>
      </div>

      <form onSubmit={saveAccount} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50 px-5 py-5 sm:px-7">
          <span
            className="grid h-12 w-12 place-items-center rounded-full bg-white bg-cover bg-center text-slate-400 ring-1 ring-slate-200"
            style={image ? { backgroundImage: `url("${image.replaceAll('"', "%22")}")` } : undefined}
          >
            {!image ? <LuUserRound className="h-6 w-6" /> : null}
          </span>
          <div>
            <p className="font-semibold text-slate-900">{name || "Usuario Appddata"}</p>
            <p className="text-xs text-slate-500">{user.displayId ? `ID ${user.displayId}` : email}</p>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
          <Field label="Nombre" htmlFor="account-name">
            <input id="account-name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} className={inputClass} />
          </Field>
          <Field label="Correo electrónico" htmlFor="account-email">
            <input id="account-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className={inputClass} />
          </Field>
          <Field label="Teléfono" htmlFor="account-phone">
            <input id="account-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} placeholder="+52 55 0000 0000" className={inputClass} />
          </Field>
          <Field label="URL de imagen de perfil" htmlFor="account-image">
            <input id="account-image" type="url" value={image} onChange={(event) => setImage(event.target.value)} placeholder="https://..." className={inputClass} />
          </Field>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div aria-live="polite" className="text-sm">
            {error ? <span className="text-rose-600">{error}</span> : null}
            {message ? <span className="inline-flex items-center gap-1.5 text-emerald-700"><LuCheck />{message}</span> : null}
          </div>
          <button disabled={saving} type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0C6CC6] px-5 text-sm font-medium text-white transition hover:bg-[#0a5aa6] disabled:cursor-wait disabled:opacity-60">
            {saving ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuSave className="h-4 w-4" />}
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

const inputClass = "h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0C6CC6] focus:ring-2 focus:ring-blue-100";
