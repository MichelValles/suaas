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
  Layers,
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
  Clock,
} from "lucide-react";
import { ThemeSwitch } from "@/components/theme-switch";
import { useBetaMode } from "@/components/use-beta-mode";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  exact: boolean;
  /** Solo visible con el modo beta activo (módulo aún sin desarrollar). */
  beta?: boolean;
};

const CONSTRUCTION_ITEMS: NavItem[] = [
  { href: "/profiles", label: "Perfiles", icon: Users, exact: false },
  { href: "/momentum", label: "Momentum", icon: Zap, exact: false },
  { href: "/targets", label: "Claridad 5s", icon: ScanEye, exact: false },
  { href: "/funnels", label: "Embudos", icon: Filter, exact: false, beta: true },
];

const ACCELERATION_ITEMS: NavItem[] = [
  { href: "/geo", label: "GEO Tester", icon: Bot, exact: false },
  { href: "/campaigns", label: "Campañas", icon: Megaphone, exact: false },
];

const KNOWLEDGE_ITEMS: NavItem[] = [
  { href: "/ab", label: "A/B tests", icon: Split, exact: false, beta: true },
  { href: "/copy", label: "Copy", icon: MessageSquareText, exact: false },
  { href: "/pricing", label: "Pricing", icon: Tag, exact: false, beta: true },
];

const SYSTEM_ITEMS: NavItem[] = [
  { href: "/diag", label: "Diagnóstico", icon: Activity, exact: false },
  { href: "/tokens", label: "Tokens", icon: Coins, exact: false },
  { href: "/gravity", label: "Gravity Model", icon: Layers, exact: false },
  { href: "/trash", label: "Papelera", icon: Trash2, exact: false },
  { href: "/seed-examples", label: "Sembrar", icon: Sprout, exact: false, beta: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [beta] = useBetaMode();
  const visible = (items: NavItem[]) => items.filter((i) => !i.beta || beta);

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
              className="sidebar-logo"
              style={{ height: 16, width: "auto" }}
              priority
            />
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.28em",
                color: "var(--accent-text)",
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
          <NavGroup label="Construction">
            {visible(CONSTRUCTION_ITEMS).map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.icon}
                active={isActive(pathname, item.href, item.exact)}
              />
            ))}
          </NavGroup>

          <NavGroup label="Acceleration">
            {ACCELERATION_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.icon}
                active={isActive(pathname, item.href, item.exact)}
              />
            ))}
          </NavGroup>

          <NavGroup label="Value">
            <NavLinkDisabled label="Work in progress" Icon={Clock} />
          </NavGroup>

          <NavGroup label="Knowledge Tools">
            {visible(KNOWLEDGE_ITEMS).map((item) => (
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
            {visible(SYSTEM_ITEMS).map((item) => (
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

        <div
          style={{
            marginTop: "auto",
            padding: "12px 8px 0",
            borderTop: "1px solid rgba(var(--fg), 0.06)",
          }}
        >
          <ThemeSwitch />
        </div>
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
          color: "rgba(var(--fg),0.35)",
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

function NavLinkDisabled({
  label,
  Icon,
}: {
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <div
      className="sidebar-link mono"
      aria-disabled="true"
      style={{ opacity: 0.3, cursor: "default", pointerEvents: "none" }}
    >
      <Icon size={16} />
      <span>{label}</span>
    </div>
  );
}

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
