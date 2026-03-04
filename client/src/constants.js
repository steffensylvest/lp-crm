export const SCORE_CONFIG = {
  A: { color: "#4ade80", bg: "#052e16", desc: "Likely to invest" },
  B: { color: "#86efac", bg: "#0f3320", desc: "Strong interest" },
  C: { color: "#fb923c", bg: "#3d1608", desc: "Watching closely" },
  D: { color: "#f97316", bg: "#431407", desc: "Low priority" },
  E: { color: "#ef4444", bg: "#450a0a", desc: "Pass" },
  U: { color: "#94a3b8", bg: "#1e293b", desc: "Unrated" },
};
export const STRATEGY_OPTIONS = ["Buyout","Growth Equity","Venture Capital","Private Credit","Real Assets","Infrastructure","Real Estate","Fund of Funds","Secondary","Other"];
export const SUB_STRATEGY_PRESETS = {
  "Buyout": ["Large-Cap Buyout","Mid-Cap Buyout","Small-Cap Buyout","Corporate Carve-out"],
  "Growth Equity": ["Minority Growth","Majority Growth","Pre-IPO"],
  "Venture Capital": ["Early Stage","Late Stage","Deep Tech","Life Sciences"],
  "Private Credit": ["Senior Secured","Unitranche","Mezzanine","Distressed","Specialty Finance"],
  "Real Assets": ["Core","Core-Plus","Value Add","Opportunistic"],
  "Infrastructure": ["Core Infrastructure","Digital Infrastructure","Energy Transition","Transport"],
  "Real Estate": ["Core","Core-Plus","Value Add","Opportunistic","Development","Residential","Logistics","Office","Retail"],
  "Fund of Funds": ["Primary","Secondary","Co-Investment","Hybrid"],
  "Secondary": ["LP Secondary","GP-Led","Structured Equity"],
  "Other": [],
};
export const SECTOR_OPTIONS = ["Industrials","Business Services","Financial Services","Technology","Healthcare","Consumer","Retail","Energy","Utilities","Real Estate","Infrastructure","Residential Housing","Solar","Wind","Logistics","Data Centres","Education","Media & Entertainment","Telecom","Agriculture","Defence","Other"];
export const CURRENCIES = ["USD","EUR","GBP","JPY","CHF","DKK","SEK","NOK","CAD","AUD"];
export const STATUS_OPTIONS = ["Pre-Marketing","Fundraising","Closed","Deployed","Monitoring","Exiting"];
export const PIPELINE_STAGES = [
  { id: "watching",    label: "Watching",       bg: "var(--pl-watching-bg)",    bd: "var(--pl-watching-bd)",    ac: "var(--pl-watching-ac)" },
  { id: "first-look", label: "First Look",      bg: "var(--pl-first-look-bg)",  bd: "var(--pl-first-look-bd)",  ac: "var(--pl-first-look-ac)" },
  { id: "diligence",  label: "Due Diligence",   bg: "var(--pl-diligence-bg)",   bd: "var(--pl-diligence-bd)",   ac: "var(--pl-diligence-ac)" },
  { id: "ic-review",  label: "IC Review",       bg: "var(--pl-ic-review-bg)",   bd: "var(--pl-ic-review-bd)",   ac: "var(--pl-ic-review-ac)" },
  { id: "committed",  label: "Committed",       bg: "var(--pl-committed-bg)",   bd: "var(--pl-committed-bd)",   ac: "var(--pl-committed-ac)" },
  { id: "passed",     label: "Passed",          bg: "var(--pl-passed-bg)",      bd: "var(--pl-passed-bd)",      ac: "var(--pl-passed-ac)" },
];
export const STATUS_PILL_KEY = { Fundraising: 1, "Pre-Marketing": 2, Closed: 3, Deployed: 4, Monitoring: 5, Exiting: 6 };
// Keyboard shortcuts — edit key values here to reconfigure
export const SHORTCUTS = [
  { key: "F1", label: "All GPs",    view: "home" },
  { key: "F2", label: "Grade A",    view: "gradeA" },
  { key: "F3", label: "All Funds",  view: "allFunds" },
  { key: "F4", label: "Meetings",   view: "allMeetings" },
  { key: "F5", label: "Pipeline",   view: "pipeline" },
  { key: "F6", label: "Dashboard",  view: "dashboard" },
];
