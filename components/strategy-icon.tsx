import {
  Clapperboard,
  GalleryHorizontalEnd,
  Image as ImageIcon,
  Images,
  LayoutGrid,
  Play,
  Search,
  ShoppingBag,
  Smartphone,
  Sparkles,
  SquarePlay,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { Strategy } from "@/lib/campaigns";

/**
 * Iconos para las estrategias publicitarias dentro de cada canal (7 de
 * Google Ads + 3 formatos de Meta + 3 de TikTok). Mezcla de iconos lucide
 * (monocromos, currentColor) elegidos por afinidad semántica.
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
  meta_single: SquarePlay,
  meta_carousel: GalleryHorizontalEnd,
  meta_collection: LayoutGrid,
  tiktok_video: Clapperboard,
  tiktok_carousel: Images,
  tiktok_spark: Zap,
};
