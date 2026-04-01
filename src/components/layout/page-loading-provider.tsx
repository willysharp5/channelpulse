"use client";

import { createContext, useContext, useTransition, useCallback, type ReactNode } from "react";

interface PageLoadingContextType {
  isLoading: boolean;
  startTransition: (fn: () => void) => void;
}

const PageLoadingContext = createContext<PageLoadingContextType>({
  isLoading: false,
  startTransition: (fn) => fn(),
});

export function PageLoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, startTransition] = useTransition();

  return (
    <PageLoadingContext.Provider value={{ isLoading, startTransition }}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div className="absolute top-14 left-0 right-0 h-0.5 bg-amber-500/20 overflow-hidden">
            <div className="h-full w-1/3 bg-amber-500 animate-slide-right" />
          </div>
        </div>
      )}
    </PageLoadingContext.Provider>
  );
}

export function usePageLoading() {
  return useContext(PageLoadingContext);
}
