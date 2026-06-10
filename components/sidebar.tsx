"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Bot,
  Coins,
  Filter,
  LayoutDashboard,
  Megaphone,
  Menu,
  MessageSquareText,
  ScanEye,
  Split,
  Sprout,
  Tag,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";

const MAIN_ITEMS = [
  { href: "/", label: "Panel", icon: LayoutDashboard, exact: true },
  { href: "/profiles", label: "Perfiles", icon: Users, exact: false },
  { href: "/targets", label: "Claridad 5s", icon: ScanEye, exact: false },
  { href: "/funnels", label: "Embudos", icon: Filter, exact: false },
  { href: "/ab", label: "A/B tests", icon: Split, exact: false },
  { href: "/copy", label: "Copy", icon: MessageSquareText, exact: false },
  { href: "/pricing", label: "Pricing", icon: Tag, exact: false },
  { href: "/campaigns", label: "Campañas", icon: Megaphone, exact: false },
  { href: "/geo", label: "GEO Tester", icon: Bot, exact: false },
  { href: "/momentum", label: "Momentum", icon: Zap, exact: false },
];

const SYSTEM_ITEMS = [
  { href: "/diag", label: "Diagnóstico", icon: Activity, exact: false },
  { href: "/tokens", label: "Tokens", icon: Coins, exact: false },
  { href: "/trash", label: "Papelera", icon: Trash2, exact: false },
  { href: "/seed-examples", label: "Sembrar", icon: Sprout, exact: false },
];

const GRAVITY_PLANES: Array<{
  label: string;
  color: string;
  modules: Array<{ href: string; label: string; note: string }>;
  pending?: string;
}> = [
  {
    label: "Construction",
    color: "#60a5fa",
    modules: [
      { href: "/profiles", label: "Perfiles", note: "Perfil comportamental · JTBD intent_context · Talker-Reasoner" },
      { href: "/momentum", label: "Momentum", note: "Intent Momentum ante-touchpoint · Triggers" },
      { href: "/targets", label: "Claridad 5s", note: "Conducta óptima · fuga · repesca" },
      { href: "/funnels", label: "Embudos", note: "Certeza predictiva · fricción por paso" },
    ],
  },
  {
    label: "Acceleration",
    color: "#fb923c",
    modules: [
      { href: "/geo", label: "GEO Tester", note: "Visibilidad en motores IA por JTBD" },
      { href: "/campaigns", label: "Campañas", note: "Mensaje ideal por perfil e intención" },
    ],
  },
  {
    label: "Value",
    color: "#a78bfa",
    modules: [],
    pending: "aha moment · capas de activación",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
        className="sidebar-burger"
        data-state={open ? "open" : "closed"}
      >
        <Menu size={20} />
      </button>

      {open && (
        <div
          aria-hidden
          className="sidebar-backdrop"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className="sidebar"
        data-state={open ? "open" : "closed"}
        aria-label="Navegación principal"
      >
        <div className="sidebar-head">
          <Link
            href="/"
            aria-label="Inicio SUAAS"
            style={{ display: "inline-flex", alignItems: "center", gap: 12 }}
          >
            <Image
              src="/logos/flat101.svg"
              alt="Flat 101"
              width={64}
              height={16}
              style={{ height: 16, width: "auto", filter: "brightness(0) invert(1)" }}
              priority
            />
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.28em",
                color: "var(--accent-500)",
                textTransform: "uppercase",
              }}
            >
              SUAAS
            </span>
          </Link>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
            className="sidebar-close"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavGroup label="Producto">
            {MAIN_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.icon}
                active={isActive(pathname, item.href, item.exact)}
              />
            ))}
          </NavGroup>

          <NavGroup label="Sistema">
            {SYSTEM_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.icon}
                active={isActive(pathname, item.href, item.exact)}
              />
            ))}
          </NavGroup>

          <GravityModelSection pathname={pathname} />
        </nav>
      </aside>
    </>
  );
}

function NavGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        className="mono"
        style={{
          padding: "0 12px",
          fontSize: 9,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.35)",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {children}
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="sidebar-link mono"
      data-active={active ? "true" : "false"}
    >
      <Icon size={16} />
      <span>{label}</span>
    </Link>
  );
}

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function GravityModelSection({ pathname }: { pathname: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        className="mono"
        style={{
          padding: "0 12px",
          fontSize: 9,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.35)",
        }}
      >
        Gravity Model
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
        {GRAVITY_PLANES.map((plane) => (
          <div key={plane.label}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "1px 12px 4px",
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: plane.color,
                  flexShrink: 0,
                }}
              />
              <span
                className="mono"
                style={{
                  fontSize: 8,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: plane.color,
                  opacity: 0.85,
                }}
              >
                {plane.label}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {plane.modules.length > 0 ? (
                plane.modules.map((mod) => {
                  const active = isActive(pathname, mod.href, false);
                  return (
                    <Link
                      key={mod.href}
                      href={mod.href}
                      className="gm-link"
                      style={{
                        marginLeft: 10,
                        borderLeft: `2px solid ${active ? plane.color : "transparent"}`,
                        padding: "4px 12px 3px 12px",
                      }}
                    >
                      <span
                        className="mono"
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: active ? plane.color : "rgba(255,255,255,0.6)",
                          lineHeight: 1.3,
                        }}
                      >
                        {mod.label}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 9,
                          color: "rgba(255,255,255,0.28)",
                          lineHeight: 1.4,
                          marginTop: 2,
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        {mod.note}
                      </span>
                    </Link>
                  );
                })
              ) : (
                <div
                  style={{
                    marginLeft: 10,
                    borderLeft: "2px solid transparent",
                    padding: "4px 12px 3px 12px",
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.2)",
                      fontStyle: "italic",
                      lineHeight: 1.3,
                    }}
                  >
                    pendiente
                  </span>
                  {plane.pending && (
                    <span
                      style={{
                        display: "block",
                        fontSize: 9,
                        color: "rgba(255,255,255,0.15)",
                        lineHeight: 1.4,
                        marginTop: 2,
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {plane.pending}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
