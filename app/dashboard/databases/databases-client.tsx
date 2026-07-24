"use client";

import { useCallback, useEffect, useState } from "react";
import { LuChevronRight, LuDatabase, LuRefreshCw, LuTable } from "react-icons/lu";

import { cn } from "@/lib/utils";

type TableInfo = { schema: string; name: string; approxRows: number };
type Selected = { schema: string; name: string };
type PageData = { columns: string[]; rows: Record<string, unknown>[]; total: number; page: number; pageSize: number };

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Error de consulta.");
  return data;
}

export function DatabasesClient() {
  const [databases, setDatabases] = useState<string[]>([]);
  const [db, setDb] = useState<string | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [table, setTable] = useState<Selected | null>(null);
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState<"dbs" | "tables" | "rows" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDatabases = useCallback(async () => {
    setLoading("dbs");
    setError(null);
    try {
      const data = await fetchJson<{ databases: string[] }>("/api/dashboard/databases");
      setDatabases(data.databases);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo listar las bases.");
    } finally {
      setLoading(null);
    }
  }, []);

  useEffect(() => {
    void loadDatabases();
  }, [loadDatabases]);

  const openDb = async (name: string) => {
    setDb(name);
    setTable(null);
    setPageData(null);
    setTables([]);
    setLoading("tables");
    setError(null);
    try {
      const data = await fetchJson<{ tables: TableInfo[] }>(`/api/dashboard/databases?db=${encodeURIComponent(name)}`);
      setTables(data.tables);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo listar las tablas.");
    } finally {
      setLoading(null);
    }
  };

  const openTable = async (sel: Selected, page = 1) => {
    if (!db) return;
    setTable(sel);
    setLoading("rows");
    setError(null);
    try {
      const url = `/api/dashboard/databases?db=${encodeURIComponent(db)}&schema=${encodeURIComponent(sel.schema)}&table=${encodeURIComponent(sel.name)}&page=${page}`;
      setPageData(await fetchJson<PageData>(url));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer la tabla.");
    } finally {
      setLoading(null);
    }
  };

  const totalPages = pageData ? Math.max(Math.ceil(pageData.total / pageData.pageSize), 1) : 1;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <LuDatabase className="h-5 w-5 text-slate-500" /> Databases
          </h1>
          <p className="mt-1 text-xs text-slate-500">Explorador de solo-lectura de las bases del droplet.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadDatabases()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <LuRefreshCw className={cn("h-3.5 w-3.5", loading === "dbs" && "animate-spin")} /> Refrescar
        </button>
      </header>

      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
        <button type="button" onClick={() => { setDb(null); setTable(null); setPageData(null); }} className="hover:text-slate-800">
          bases
        </button>
        {db ? (<><LuChevronRight className="h-3 w-3" /><button type="button" onClick={() => void openDb(db)} className="font-medium text-slate-700 hover:text-slate-900">{db}</button></>) : null}
        {table ? (<><LuChevronRight className="h-3 w-3" /><span className="font-medium text-slate-900">{table.schema}.{table.name}</span></>) : null}
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}

      {/* Nivel bases */}
      {!db ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {databases.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => void openDb(name)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
            >
              <LuDatabase className="h-4 w-4 shrink-0 text-slate-400" /> <span className="truncate">{name}</span>
            </button>
          ))}
          {loading === "dbs" ? <p className="text-xs text-slate-400">Cargando bases...</p> : null}
        </div>
      ) : null}

      {/* Nivel tablas */}
      {db && !table ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {loading === "tables" ? <p className="p-4 text-xs text-slate-400">Cargando tablas...</p> : null}
          {tables.map((t) => (
            <button
              key={`${t.schema}.${t.name}`}
              type="button"
              onClick={() => void openTable({ schema: t.schema, name: t.name })}
              className="flex w-full items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-left text-sm text-slate-700 transition last:border-0 hover:bg-slate-50"
            >
              <LuTable className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate"><span className="text-slate-400">{t.schema}.</span>{t.name}</span>
              <span className="ml-auto text-[0.7rem] text-slate-400">~{t.approxRows.toLocaleString()} filas</span>
            </button>
          ))}
          {loading !== "tables" && tables.length === 0 ? <p className="p-4 text-xs text-slate-400">Esta base no tiene tablas visibles.</p> : null}
        </div>
      ) : null}

      {/* Nivel filas */}
      {db && table ? (
        <div className="flex flex-col gap-2">
          {loading === "rows" ? <p className="text-xs text-slate-400">Cargando filas...</p> : null}
          {pageData ? (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>{pageData.columns.map((c) => <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold">{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {pageData.rows.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        {pageData.columns.map((c) => (
                          <td key={c} className="max-w-[320px] truncate px-3 py-1.5 text-slate-700" title={row[c] == null ? "" : String(row[c])}>
                            {row[c] == null ? <span className="text-slate-300">null</span> : String(row[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {pageData.rows.length === 0 ? <tr><td colSpan={pageData.columns.length || 1} className="px-3 py-4 text-center text-slate-400">Sin filas.</td></tr> : null}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{pageData.total.toLocaleString()} filas · página {pageData.page} de {totalPages}</span>
                <div className="flex gap-2">
                  <button type="button" disabled={pageData.page <= 1} onClick={() => table && void openTable(table, pageData.page - 1)} className="rounded-lg border border-slate-200 px-2.5 py-1 disabled:opacity-40">Anterior</button>
                  <button type="button" disabled={pageData.page >= totalPages} onClick={() => table && void openTable(table, pageData.page + 1)} className="rounded-lg border border-slate-200 px-2.5 py-1 disabled:opacity-40">Siguiente</button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
