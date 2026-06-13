"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Modo beta: revela en la navegación los módulos aún no desarrollados
 * (Embudos, A/B tests, Pricing y Sembrar). Apagado de serie, así esos
 * módulos quedan ocultos salvo que el operador active el toggle en /diag.
 * Persiste por navegador en localStorage, igual que el tema. La
 * sincronización en vivo entre el toggle y el resto de la UI (sidebar,
 * home) usa un evento de ventana.
 */
const STORAGE_KEY = "suaas-beta";
const CHANGE_EVENT = "suaas-beta-change";

export function readBetaMode(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function useBetaMode(): [boolean, (next: boolean) => void] {
  // Arranca en false para que el render del servidor (módulos ocultos) y
  // el primer render del cliente coincidan; el valor real se lee tras el
  // montaje y se vuelve a leer ante cada cambio.
  const [beta, setBeta] = useState(false);

  useEffect(() => {
    setBeta(readBetaMode());
    const sync = () => setBeta(readBetaMode());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const set = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
    } catch {
      /* almacenamiento bloqueado: el modo dura lo que dure la sesión */
    }
    if (next) {
      document.documentElement.dataset.beta = "on";
    } else {
      delete document.documentElement.dataset.beta;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
    setBeta(next);
  }, []);

  return [beta, set];
}
