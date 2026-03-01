export const uid = () => Math.random().toString(36).slice(2, 10);
export const now = () => new Date().toISOString();
export const fmt = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const fmtTs = (ts) => ts ? new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
// Format a fund size value: "USD 25,000M" or null (pass null to let callers show "—")
export const fmtM = (val, currency) => val ? `${currency} ${Number(val).toLocaleString()}M` : null;
