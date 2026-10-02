"use client";

import { useState } from "react";
import { LuCheck, LuLoaderCircle, LuMessageSquarePlus, LuSend } from "react-icons/lu";

import { useT } from "@/lib/text/text-provider";

type RequirementProject = { slug: string; name: string };

export function SiteRequirements({ projects = [], client }: {
  projects?: RequirementProject[];
  client?: { name: string; email: string };
}) {
  const t = useT();
  const [content, setContent] = useState("");
  const [projectSlug, setProjectSlug] = useState(projects.length === 1 ? projects[0].slug : "");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submitRequirement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/dashboard/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, projectSlug }),
      });
      const result = await response.json() as { error?: string; emailSent?: boolean };
      if (!response.ok) {
        setError(result.error ?? t("es.dashboard.requirements.error.send"));
        return;
      }
      setContent("");
      setMessage(
        result.emailSent
          ? t("es.dashboard.requirements.sent.notified")
          : t("es.dashboard.requirements.sent.ok"),
      );
    } catch {
      setError(t("es.dashboard.requirements.error.network"));
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">{t("es.dashboard.requirements.eyebrow")}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">{t("es.dashboard.requirements.title")}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {t("es.dashboard.requirements.description")}
        </p>
      </div>

      <form onSubmit={submitRequirement} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-5 sm:px-7">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#0C6CC6] ring-1 ring-slate-200">
            <LuMessageSquarePlus className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-900">{t("es.dashboard.requirements.form.title")}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{t("es.dashboard.requirements.form.hint")}</p>
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <label htmlFor="requirement-project" className="space-y-2 text-sm font-medium text-slate-700">
              <span>{t("es.dashboard.requirements.form.project")}</span>
              <select
                id="requirement-project"
                value={projectSlug}
                onChange={(event) => setProjectSlug(event.target.value)}
                required
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900 outline-none transition focus:border-[#0C6CC6] focus:ring-2 focus:ring-blue-100"
              >
                <option value="">{t("es.dashboard.requirements.form.projectPlaceholder")}</option>
                {projects.map((project) => (
                  <option key={project.slug} value={project.slug}>{project.name}</option>
                ))}
              </select>
            </label>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{t("es.dashboard.requirements.form.attached")}</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-800">{client?.name ?? t("es.dashboard.requirements.form.defaultClient")}</p>
              <p className="truncate text-xs text-slate-500">{client?.email ?? t("es.dashboard.requirements.form.defaultEmail")}</p>
            </div>
          </div>
          <label htmlFor="site-requirement" className="text-sm font-medium text-slate-700">
            {t("es.dashboard.requirements.form.describe")}
          </label>
          <textarea
            id="site-requirement"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            minLength={20}
            maxLength={4_000}
            required
            rows={9}
            placeholder={t("es.dashboard.requirements.form.placeholder")}
            className="mt-2 min-h-52 w-full resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0C6CC6] focus:ring-2 focus:ring-blue-100"
          />
          <div className="mt-2 flex justify-between gap-4 text-xs text-slate-400">
            <span>{t("es.dashboard.requirements.form.limits")}</span>
            <span>{t("es.dashboard.requirements.form.counter", { count: content.length.toLocaleString("es-MX") })}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div aria-live="polite" className="text-sm">
            {error ? <span className="text-rose-600">{error}</span> : null}
            {message ? <span className="inline-flex items-center gap-1.5 text-emerald-700"><LuCheck className="h-4 w-4" />{message}</span> : null}
          </div>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0C6CC6] px-5 text-sm font-medium text-white transition hover:bg-[#0a5aa6] disabled:cursor-wait disabled:opacity-60"
          >
            {sending ? <LuLoaderCircle className="h-4 w-4 animate-spin" /> : <LuSend className="h-4 w-4" />}
            {sending ? t("es.dashboard.requirements.sending") : t("es.dashboard.requirements.submit")}
          </button>
        </div>
      </form>
    </section>
  );
}
