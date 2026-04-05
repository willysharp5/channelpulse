"use client";

import { createContext, useContext } from "react";

const DemoContext = createContext(false);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  return <DemoContext.Provider value={true}>{children}</DemoContext.Provider>;
}

/** True when rendering the public /demo dashboard (read-only). */
export function useDemo(): boolean {
  return useContext(DemoContext);
}
