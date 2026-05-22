import {
  Image as ImageIcon,
  Play,
  Search,
  ShoppingBag,
  Smartphone,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { Strategy } from "@/lib/campaigns";

/**
 * Iconos para las 7 estrategias publicitarias dentro de un canal. Mezcla
 * de iconos lucide (monocromos, currentColor) elegidos por afinidad
 * semántica con cada estrategia de Google Ads.
 */
export function StrategyIcon({
  strategy,
  size = 16,
}: {
  strategy: Strategy;
  size?: number;
}) {
  const Icon = ICONS[strategy];
  return <Icon size={size} />;
}

const ICONS: Record<
  Strategy,
  React.ComponentType<{ size?: number }>
> = {
  search: Search,
  display: ImageIcon,
  pmax: Sparkles,
  demand_gen: TrendingUp,
  video: Play,
  app: Smartphone,
  shopping: ShoppingBag,
};
