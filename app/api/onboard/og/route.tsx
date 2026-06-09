import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { getProfile } from "@/lib/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 1200x630: ratio óptimo para compartir en RRSS y descarga.
const WIDTH = 1200;
const HEIGHT = 630;

const INK_900 = "#0e0e10";
const INK_500 = "#666";
const ACCENT = "#ffdc3c";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  const profile = await getProfile(id).catch(() => null);
  if (!profile || profile.source !== "self_report") {
    return new Response("Not found", { status: 404 });
  }

  const d = profile.demographics;
  const b = profile.big_five;
  const c = profile.com_b_barriers;

  const initials = profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

  const oceanRows: { label: string; value: number }[] = [
    { label: "Apertura", value: b.openness },
    { label: "Conciencia", value: b.conscientiousness },
    { label: "Extraversión", value: b.extraversion },
    { label: "Amabilidad", value: b.agreeableness },
    { label: "Neuroticismo", value: b.neuroticism },
  ];

  const topBarriers: string[] = [
    ...c.capability.slice(0, 1),
    ...c.opportunity.slice(0, 1),
    ...c.motivation.slice(0, 1),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: INK_900,
          color: "white",
          padding: 60,
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        {/* Header con eyebrow */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: ACCENT,
            fontSize: 18,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          <span>SUAAS · Gemelo sintético</span>
          <span style={{ color: INK_500 }}>suaas.flat101.business</span>
        </div>

        {/* Avatar + nombre */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 130,
              height: 130,
              borderRadius: 65,
              background: ACCENT,
              color: INK_900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 64,
              fontWeight: 700,
            }}
          >
            {initials}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1 }}>
              {profile.name}
            </span>
            <span style={{ fontSize: 24, color: "rgba(255,255,255,0.7)" }}>
              {d.age} años · {d.gender} · {d.occupation}
            </span>
            <span style={{ fontSize: 16, color: INK_500, letterSpacing: "0.2em" }}>
              {(d.geo || "").toUpperCase()}
              {d.income_band ? ` · ${d.income_band.toUpperCase()}` : ""}
            </span>
          </div>
        </div>

        {/* Backstory */}
        <div
          style={{
            paddingLeft: 20,
            borderLeft: `4px solid ${ACCENT}`,
            fontStyle: "italic",
            fontSize: 22,
            lineHeight: 1.45,
            color: "rgba(255,255,255,0.88)",
            display: "flex",
          }}
        >
          {truncate(profile.backstory, 260)}
        </div>

        {/* OCEAN + barreras en columnas */}
        <div style={{ display: "flex", gap: 40, marginTop: 8 }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: 14,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: INK_500,
              }}
            >
              Personalidad OCEAN
            </span>
            {oceanRows.map((row) => (
              <div
                key={row.label}
                style={{ display: "flex", alignItems: "center", gap: 14 }}
              >
                <span
                  style={{
                    width: 160,
                    fontSize: 18,
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  {row.label}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 10,
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 999,
                    display: "flex",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(row.value * 100)}%`,
                      height: "100%",
                      background: ACCENT,
                      borderRadius: 999,
                    }}
                  />
                </div>
                <span
                  style={{
                    width: 56,
                    textAlign: "right",
                    fontSize: 16,
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  {Math.round(row.value * 100)}%
                </span>
              </div>
            ))}
          </div>
          {topBarriers.length > 0 && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: INK_500,
                }}
              >
                Barreras principales
              </span>
              {topBarriers.map((b, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 18,
                    color: "rgba(255,255,255,0.85)",
                    lineHeight: 1.4,
                    display: "flex",
                  }}
                >
                  · {truncate(b, 90)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}
