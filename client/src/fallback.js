// ─── Fallback / offline data ──────────────────────────────────────────────────
// This data is shown ONLY when the backend server cannot be reached.
// It is NOT real data — do not enter or rely on anything shown here.
// Start the backend server (npm run dev) to load and save your real CRM data.

export const FALLBACK_DATA = {
  __isFallback: true,
  gps: [
    {
      id: "fallback-gp-1",
      name: "⚠ Demo GP — Backend Offline",
      hq: "—",
      score: "C",
      contact: "—",
      contactEmail: "",
      notes: "This is placeholder data. The backend server is not reachable. Start the server with 'npm run dev' and refresh the page to load your real data.",
      funds: [
        {
          id: "fallback-fund-1",
          name: "⚠ Demo Fund — Backend Offline",
          series: "Demo",
          strategy: "Buyout",
          subStrategy: "Mid-Cap Buyout",
          sectors: ["Technology"],
          vintage: "2024",
          targetSize: "1000",
          raisedSize: "500",
          finalSize: "",
          currency: "USD",
          status: "Fundraising",
          score: "C",
          notes: "Placeholder fund. Connect to the backend to see real data.",
          invested: false,
          investmentAmount: "",
          investmentCurrency: "USD",
        },
      ],
      meetings: [
        {
          id: "fallback-meeting-1",
          date: new Date().toISOString().slice(0, 10),
          type: "Virtual",
          location: "—",
          topic: "⚠ Demo Meeting — Backend Offline",
          notes: "Placeholder meeting. Connect to the backend to see real data.",
          fundId: null,
          loggedBy: "Demo",
          loggedAt: new Date().toISOString(),
        },
      ],
    },
    {
      id: "fallback-gp-2",
      name: "⚠ Demo GP 2 — Backend Offline",
      hq: "—",
      score: "B",
      contact: "—",
      contactEmail: "",
      notes: "Placeholder GP. Start the backend server to load your real CRM data.",
      funds: [],
      meetings: [],
    },
  ],
  pipeline: [],
};
