import Link from "next/link";
import { Store, Package, ShoppingCart, TrendingUp, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        {icon && <div className="mb-4 text-muted-foreground/40">{icon}</div>}
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-md">{description}</p>
        {actionLabel && actionHref && (
          <Link href={actionHref} className="mt-4">
            <Button className="bg-amber-500 hover:bg-amber-600 text-white">
              {actionLabel}
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export function NoChannelsEmpty() {
  return (
    <EmptyState
      icon={<Store className="h-12 w-12" />}
      title="No channels connected"
      description="Connect your first store to start tracking sales, revenue, and profit across all your channels."
      actionLabel="Connect a Channel"
      actionHref="/settings"
    />
  );
}

export function NoOrdersEmpty() {
  return (
    <EmptyState
      icon={<ShoppingCart className="h-12 w-12" />}
      title="No orders yet"
      description="Orders will appear here once your connected channels start syncing. This usually takes a few minutes after connecting."
      actionLabel="Go to Channels"
      actionHref="/channels"
    />
  );
}

export function NoProductsEmpty() {
  return (
    <EmptyState
      icon={<Package className="h-12 w-12" />}
      title="No products synced"
      description="Products will appear here once you connect a channel and sync your catalog."
      actionLabel="Connect a Channel"
      actionHref="/settings"
    />
  );
}

export function NoRevenueEmpty() {
  return (
    <EmptyState
      icon={<TrendingUp className="h-12 w-12" />}
      title="No revenue data"
      description="Revenue analytics will populate once your orders start syncing from connected channels."
      actionLabel="Go to Overview"
      actionHref="/"
    />
  );
}

export function NoPnLEmpty() {
  return (
    <EmptyState
      icon={<FileText className="h-12 w-12" />}
      title="No P&L data"
      description="Your profit & loss report will generate once you have orders synced and cost rates configured."
      actionLabel="Configure Costs"
      actionHref="/pnl"
    />
  );
}
