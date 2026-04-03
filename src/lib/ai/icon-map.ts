import {
  BarChart3,
  TrendingUp,
  PiggyBank,
  Trophy,
  AlertTriangle,
  ShoppingCart,
  Package,
  DollarSign,
  Percent,
  Clock,
  Layers,
  Zap,
  Target,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const REPORT_ICON_MAP: Record<string, LucideIcon> = {
  BarChart3,
  TrendingUp,
  PiggyBank,
  Trophy,
  AlertTriangle,
  ShoppingCart,
  Package,
  DollarSign,
  Percent,
  Clock,
  Layers,
  Zap,
  Target,
  Sparkles,
};

export interface SuggestedReportData {
  id: string;
  icon_name: string;
  title: string;
  description: string;
  prompt: string;
  accent_class: string;
}
