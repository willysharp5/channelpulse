"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Package, ShoppingCart, Loader2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ChannelBadge } from "./channel-badge";
import type { Platform } from "@/types";

interface SearchResult {
  orders: Array<{
    id: string;
    order_number: string | null;
    customer_name: string | null;
    total_amount: number | null;
    platform: string;
    status: string | null;
    ordered_at: string;
  }>;
  products: Array<{
    id: string;
    title: string;
    sku: string | null;
    category: string | null;
    status: string | null;
  }>;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) {
    const words = lowerQuery.split(/\s+/);
    let result: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    for (const word of words) {
      if (!word) continue;
      const idx = remaining.toLowerCase().indexOf(word);
      if (idx !== -1) {
        result.push(remaining.slice(0, idx));
        result.push(
          <mark key={key++} className="bg-amber-200 dark:bg-amber-800 text-inherit rounded-sm px-0.5">
            {remaining.slice(idx, idx + word.length)}
          </mark>
        );
        remaining = remaining.slice(idx + word.length);
      }
    }
    result.push(remaining);
    return <>{result}</>;
  }

  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-amber-200 dark:bg-amber-800 text-inherit rounded-sm px-0.5">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 250);
    return () => clearTimeout(timer);
  }, [query, search]);

  function handleSelect(path: string) {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(path);
  }

  const hasOrders = results?.orders && results.orders.length > 0;
  const hasProducts = results?.products && results.products.length > 0;
  const hasResults = hasOrders || hasProducts;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative hidden md:flex items-center gap-2 rounded-md border bg-background px-3 h-8 w-[200px] lg:w-[280px] text-sm text-muted-foreground hover:bg-accent transition-colors"
      >
        <Search className="h-4 w-4" />
        <span>Search orders, products...</span>
        <kbd className="ml-auto pointer-events-none hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>Search orders and products</DialogDescription>
        </DialogHeader>
        <DialogContent className="top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0" showCloseButton={false}>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search orders, products, customers..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && query.length >= 2 && !hasResults && (
            <CommandEmpty>
              No results found for &ldquo;{query}&rdquo;
            </CommandEmpty>
          )}

          {!loading && query.length < 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search...
            </div>
          )}

          {hasOrders && (
            <CommandGroup heading="Orders">
              {results!.orders.map((order) => (
                <CommandItem
                  key={order.id}
                  value={`order-${order.id}`}
                  onSelect={() => handleSelect(`/?order=${order.id}`)}
                  className="cursor-pointer"
                >
                  <ShoppingCart className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {highlightMatch(order.order_number ?? order.id, query)}
                      </span>
                      <ChannelBadge
                        platform={order.platform as Platform}
                        className="text-[9px] px-1 py-0"
                      />
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        order.status === "delivered" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" :
                        order.status === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {order.customer_name && (
                        <span>{highlightMatch(order.customer_name, query)}</span>
                      )}
                      <span className="tabular-nums font-medium">
                        ${Number(order.total_amount ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {hasOrders && hasProducts && <CommandSeparator />}

          {hasProducts && (
            <CommandGroup heading="Products">
              {results!.products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`product-${product.id}`}
                  onSelect={() => handleSelect(`/products?search=${encodeURIComponent(product.title)}`)}
                  className="cursor-pointer"
                >
                  <Package className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">
                      {highlightMatch(product.title, query)}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {product.sku && (
                        <span className="font-mono">
                          {highlightMatch(product.sku, query)}
                        </span>
                      )}
                      {product.category && <span>{product.category}</span>}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
