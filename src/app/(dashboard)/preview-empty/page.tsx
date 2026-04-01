import { Header } from "@/components/layout/header";
import {
  NoChannelsEmpty,
  NoOrdersEmpty,
  NoProductsEmpty,
  NoRevenueEmpty,
  NoPnLEmpty,
} from "@/components/dashboard/empty-state";

export default function PreviewEmptyStates() {
  return (
    <>
      <Header title="Empty States Preview" />
      <div className="flex-1 space-y-6 p-6">
        <p className="text-sm text-muted-foreground">
          Preview of all empty states. Delete this page after reviewing.
        </p>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">No Channels Connected (Overview)</h3>
          <NoChannelsEmpty />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">No Orders</h3>
          <NoOrdersEmpty />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">No Products</h3>
          <NoProductsEmpty />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">No Revenue Data</h3>
          <NoRevenueEmpty />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">No P&L Data</h3>
          <NoPnLEmpty />
        </div>
      </div>
    </>
  );
}
