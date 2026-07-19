import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

/**
 * Desbloqueo de «Conceptos pendientes» de /gravity. Antes la contraseña y el
 * contenido viajaban en el bundle del cliente (teatro de seguridad); ahora
 * ambos viven en el servidor. La ruta ya exige la cookie de sesión (proxy.ts),
 * así que esta contraseña es una segunda capa, igual que /seed-examples.
 * Fallback al valor histórico mientras no exista GRAVITY_PASSWORD en Vercel,
 * mismo patrón que lib/seed-auth.ts.
 */

/**
 * Huecos entre el marco teórico y la implementación. Fuente de verdad:
 * docs/GRAVITY-MODEL.md, sección «Conceptos del modelo aún sin implementación
 * directa». Al cambiar aquella lista, sincronizar esta en la misma sesión.
 */
const PENDING = [
  {
    label: "Instancias como entidad",
    note: "Gravity tiene perfiles individuales, pero no el par «perfil comportamental → N instancias»: mismo comportamiento observable, orígenes y aha moments radicalmente distintos.",
  },
  {
    label: "Gravedad agregada",
    note: "No existe una métrica que sume el momentum de las interacciones de una cohorte como fuerza gravitacional de la marca, ni una vista que cruce el momentum entre módulos.",
  },
  {
    label: "Mapa de fricción priorizado por impacto",
    note: "Los embudos ya rankean fricciones por frecuencia entre perfiles (top_friction), pero falta la dimensión instancia y la regla de severidad: lo que falla en todas las instancias se toca primero.",
  },
  {
    label: "Aha moment por instancia",
    note: "El momento de propiedad psicológica no se modela ni detecta. Es específico por instancia, detectable y acelerable.",
  },
  {
    label: "Capas de activación (Value Plane)",
    note: "No hay simulación post-alta: adopción, pertenencia, inducción de hábitos recurrentes ni predicción de churn.",
  },
  {
    label: "Repesca accionable",
    note: "behavior_class='repesca' se cuenta pero no genera la ventana de recuperación: qué mensaje recuperaría a ese perfil en función de su instancia. Las versiones ideales de campañas ya son materia prima directa.",
  },
  {
    label: "Evolución temporal del momentum",
    note: "El vector se mide por interacción, pero no se traza su trayectoria a lo largo del tiempo ni entre touchpoints; en el chat ni siquiera se persiste como métrica.",
  },
  {
    label: "GEO pendiente",
    note: "AI Overview y Gemini como cuarto y quinto motor del GEO Tester (la pestaña «Próximamente» ya existe en la UI).",
  },
];

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as {
    password?: string;
  };
  const expected = process.env.GRAVITY_PASSWORD ?? "michel101";
  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, pending: PENDING });
}
