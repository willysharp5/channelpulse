/** Labels for AI tool rows — shared by chat UI and marketing Remotion preview. */
export function toolLabel(name: string, done: boolean): string {
  const labels: Record<string, [string, string]> = {
    getDashboardOverview: ["Fetching dashboard stats...", "Fetched dashboard stats"],
    getChannelBreakdown: ["Analyzing channels...", "Analyzed channels"],
    getProfitAndLoss: ["Calculating P&L...", "Calculated P&L"],
    getTopProducts: ["Looking up top products...", "Found top products"],
    getOrdersSummary: ["Fetching orders...", "Fetched orders"],
    runAnalyticsQuery: ["Running analysis...", "Analysis complete"],
  };
  const pair = labels[name];
  if (pair) return done ? pair[1] : pair[0];
  return done ? "Done" : "Working...";
}
