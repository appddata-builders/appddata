"use client";

import { useEffect, useRef } from "react";

import { Spinner } from "@/app/components/ui/spinner";

/**
 * Tapa la pantalla mientras se resuelve el login. Sin esto, entre el server
 * action y la redireccion el formulario queda "muerto" y la gente vuelve a
 * pulsar Entrar.
 */
const TIMEOUT_MS = 20000;

export function LoginLoadingOverlay(props: {
  active: boolean;
  onConnectionTimeout: () => void;
}) {
  const activeRef = useRef(props.active);
  const timeoutRef = useRef(props.onConnectionTimeout);

  useEffect(() => {
    activeRef.current = props.active;
  }, [props.active]);

  useEffect(() => {
    timeoutRef.current = props.onConnectionTimeout;
  }, [props.onConnectionTimeout]);

  useEffect(() => {
    if (!props.active) return;
    const timer = window.setTimeout(() => {
      if (activeRef.current) timeoutRef.current();
    }, TIMEOUT_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [props.active]);

  if (!props.active) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-white px-8">
      <Spinner className="size-10 text-blue-600" />
      <p className="text-center text-[0.72rem] uppercase tracking-[0.3em] text-slate-500">
        Entrando al panel
      </p>
    </div>
  );
}
