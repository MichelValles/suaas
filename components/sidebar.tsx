"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Coins,
  Filter,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Split,
  Tag,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";

const MAIN_ITEMS = [
  { href: "/", label: "Panel", icon: LayoutDashboard, exact: true },
  { href: "/profiles", label: "Perfiles", icon: Users, exact: false },
  { href: "/targets", label: "Targets", icon: Target, exact: false },
  { href: "/funnels", label: "Embudos", icon: Filter, exact: false },
  { href: "/ab", label: "A/B tests", icon: Split, exact: false },
  { href: "/copy", label: "Copy", icon: MessageSquareText, exact: false },
  { href: "/pricing", label: "Pricing", icon: Tag, exact: false },
];

const SYSTEM_ITEMS = [
  { href: "/diag", label: "Diagnóstico", icon: Activity, exact: false },
  { href: "/tokens", label: "Tokens", icon: Coins, exact: false },
  { href: "/trash", label: "Papelera", icon: Trash2, exact: false },
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
