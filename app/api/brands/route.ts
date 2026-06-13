import { NextResponse } from "next/server";
import { listBrandsForPicker } from "@/lib/cerebro";
import { isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Lista ligera de marcas para el selector de Cerebro en los formularios de
 * los módulos. Devuelve id, nombre y el contexto inyectable (descripción +
 * documentos). Detrás del gate de auth global como el resto de la app.
 */
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ brands: [] });
  try {
    const brands = await listBrandsForPicker();
    return NextResponse.json({ brands });
  } catch {
    // Tabla aún sin migrar u otro fallo: el selector simplemente no aparece.
    return NextResponse.json({ brands: [] });
  }
}
