export interface DateParams {
  days?: number;
  from?: string;
  to?: string;
}

/** Calendar bounds for analytics and table date filters (pure, no I/O). */
export function getDateRange(params: DateParams): {
  fromStr: string;
  toStr: string;
  prevFromStr: string;
  prevToStr: string;
} {
  if (params.from && params.to) {
    const from = new Date(params.from);
    const to = new Date(params.to);
    const diff = Math.ceil((to.getTime() - from.getTime()) / 86400000);
    const prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - diff);
    return {
      fromStr: params.from,
      toStr: params.to,
      prevFromStr: prevFrom.toISOString().split("T")[0],
      prevToStr: params.from,
    };
  }
  const days = params.days ?? 30;
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);
  const prevFromDate = new Date();
  prevFromDate.setDate(prevFromDate.getDate() - days * 2);
  return {
    fromStr: fromDate.toISOString().split("T")[0],
    toStr: toDate.toISOString().split("T")[0],
    prevFromStr: prevFromDate.toISOString().split("T")[0],
    prevToStr: fromDate.toISOString().split("T")[0],
  };
}
