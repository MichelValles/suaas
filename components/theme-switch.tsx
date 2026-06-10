"use client";

import { useEffect, useState } from "react";
import { Sun } from "lucide-react";

const STORAGE_KEY = "suaas-theme";

/**
 * Conmutador de modo claro. El tema oscuro es el de serie: el switch
 * activa `data-theme="light"` en <html> y lo persiste en localStorage.
 * Un script inline en app/layout.tsx aplica la preferencia guardada
 * antes del primer paint para evitar el destello de tema.
 */
export function ThemeSwitch() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.dataset.theme === "light");
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    if (next) {
      document.documentElement.dataset.theme = "light";
    } else {
      delete document.documentElement.dataset.theme;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "light" : "dark");
    } catch {
      /* almacenamiento bloqueado: el tema dura lo que dure la sesión */
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={light}
      onClick={toggle}
      className="theme-switch mono"
    >
      <Sun size={14} />
      <span>Modo claro</span>
      <span className="theme-switch-track" aria-hidden>
        <span className="theme-switch-knob" />
      </span>
    </button>
  );
}
