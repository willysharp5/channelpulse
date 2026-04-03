import { useEffect, useRef } from "react";

type NextRouterLike = { replace: (href: string, options?: { scroll?: boolean }) => void };

/**
 * Debounces pushing `searchDraft` to the URL without listing URLSearchParams in the effect deps
 * (listing searchParams restarts the timer on every navigation and causes lag / flicker).
 */
export function useDebouncedUrlSearch(
  searchDraft: string,
  searchFromUrl: string,
  pathname: string,
  searchParams: URLSearchParams,
  router: NextRouterLike,
  normalizeQuery: (pathname: string, cur: URLSearchParams) => string,
  debounceMs = 400,
  startTransition?: (fn: () => void) => void
): void {
  const latestRef = useRef({ router, pathname, sp: searchParams.toString() });
  latestRef.current = { router, pathname, sp: searchParams.toString() };

  useEffect(() => {
    if (searchDraft === searchFromUrl) return;
    const t = setTimeout(() => {
      const { router: r, pathname: p, sp } = latestRef.current;
      const n = new URLSearchParams(sp);
      if (searchDraft.trim()) n.set("search", searchDraft.trim());
      else n.delete("search");
      n.set("page", "1");
      const go = () => r.replace(normalizeQuery(p, n), { scroll: false });
      if (startTransition) startTransition(go);
      else go();
    }, debounceMs);
    return () => clearTimeout(t);
  }, [searchDraft, searchFromUrl, debounceMs, normalizeQuery, pathname, router, startTransition]);
}

/**
 * When the server clamps page (out-of-range), sync the URL once — skip if the URL already matches.
 * Avoid depending on searchParams identity so unrelated param updates don't re-fire replaces.
 */
export function useSyncEffectivePage(
  effectivePage: number,
  requestedPage: number,
  pathname: string,
  searchParams: URLSearchParams,
  router: NextRouterLike,
  normalizeQuery: (pathname: string, cur: URLSearchParams) => string,
  startTransition?: (fn: () => void) => void
): void {
  const spRef = useRef(searchParams.toString());
  spRef.current = searchParams.toString();

  useEffect(() => {
    if (effectivePage === requestedPage) return;
    const n = new URLSearchParams(spRef.current);
    const pageFromUrl = Math.max(1, parseInt(n.get("page") ?? "1", 10) || 1);
    if (pageFromUrl === effectivePage) return;
    n.set("page", String(effectivePage));
    const go = () => router.replace(normalizeQuery(pathname, n), { scroll: false });
    if (startTransition) startTransition(go);
    else go();
  }, [effectivePage, requestedPage, pathname, router, normalizeQuery, startTransition]);
}
