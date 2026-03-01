import React, { useState } from "react";
import { fmt } from "../utils.js";
import { PIPELINE_STAGES } from "../constants.js";

const STRAT_COLORS = {
  "Buyout": "#3b82f6",
  "Growth Equity": "#8b5cf6",
  "Venture Capital": "#06b6d4",
  "Private Credit": "#f59e0b",
  "Real Assets": "#10b981",
  "Infrastructure": "#6366f1",
  "Real Estate": "#ec4899",
  "Fund of Funds": "#f97316",
  "Secondary": "#ef4444",
  "Other": "#6b7280",
};

// Static FX rates → EUR (to be replaced with live rates later)
const FX_TO_EUR = {
  EUR: 1, USD: 0.93, GBP: 1.19, JPY: 0.0062,
  CHF: 1.06, DKK: 0.134, SEK: 0.088, NOK: 0.086, CAD: 0.68, AUD: 0.59,
};
const toEur = (amount, currency) => parseFloat(amount || 0) * (FX_TO_EUR[currency] || 1);
const fmtEur = (m) => m >= 1000 ? `€${(m / 1000).toFixed(1)}bn` : `€${Math.round(m)}m`;

export function DashboardView({ gps, pipeline, todos = [], owners, onBack, onAddTodo, onToggleTodo, onDeleteTodo, onMeetingClick, onFundClick }) {
  const [me, setMe] = useState(() => {
    const saved = localStorage.getItem("lp-crm-dashboard-user");
    return (saved && owners.includes(saved)) ? saved : (owners[0] || "");
  });
  const [todoText, setTodoText] = useState("");
  const [todoDue, setTodoDue] = useState("");
  const [groupBy, setGroupBy] = useState("vintage"); // "vintage" | "icYear"
  const [expanded, setExpanded] = useState(() => new Set());
  const toggleExpand = (yr) => setExpanded(prev => { const n = new Set(prev); n.has(yr) ? n.delete(yr) : n.add(yr); return n; });

  const saveMe = (v) => { setMe(v); localStorage.setItem("lp-crm-dashboard-user", v); };

  const allFunds = gps.flatMap(g => (g.funds || []).map(f => ({ ...f, gp: g })));
  const allMeetings = gps.flatMap(g => (g.meetings || []).map(m => ({ ...m, gp: g })));

  const myFunds = allFunds.filter(f => f.owner === me || (!f.owner && f.gp.owner === me));
  const myPipeline = pipeline.filter(p => {
    const gp = gps.find(g => g.id === p.gpId);
    if (!gp) return false;
    const fund = (gp.funds || []).find(f => f.id === p.fundId);
    return fund
      ? (fund.owner === me || (!fund.owner && gp.owner === me))
      : gp.owner === me;
  });

  const myTodos = todos.filter(t => t.owner === me);
  const openTodos = myTodos.filter(t => !t.done);

  const totalAllocEur = myFunds
    .filter(f => f.invested && f.investmentAmount)
    .reduce((sum, f) => sum + toEur(f.investmentAmount, f.investmentCurrency), 0);

  const todayStr = new Date().toISOString().slice(0, 10);
  const in30Str = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); })();
  const myUpcoming = allMeetings.filter(m => {
    if (!m.date || m.date < todayStr || m.date > in30Str) return false;
    const { gp } = m;
    if (gp.owner === me) return true;
    if (m.fundId) {
      const fund = (gp.funds || []).find(f => f.id === m.fundId);
      return fund?.owner === me || (!fund?.owner && gp.owner === me);
    }
    return false;
  }).sort((a, b) => a.date.localeCompare(b.date));

  // Combined deployment chart — actual (invested) + expected (planned), grouped by vintage or IC year
  const getGrpYear = (f) => (groupBy === "icYear" && f.icDate)
    ? new Date(f.icDate).getFullYear().toString()
    : (f.vintage || null);

  const groupYears = [...new Set(myFunds.map(getGrpYear).filter(Boolean))].sort();
  const chartRows = groupYears.map(yr => {
    const funds = myFunds.filter(f => getGrpYear(f) === yr);
    const actualByStrat = {}, expectedByStrat = {};
    let actualTotal = 0, expectedTotal = 0;
    funds.filter(f => f.invested && f.investmentAmount).forEach(f => {
      const k = f.strategy || "Other";
      const eur = toEur(f.investmentAmount, f.investmentCurrency);
      actualByStrat[k] = (actualByStrat[k] || 0) + eur;
      actualTotal += eur;
    });
    const expectedFunds = funds.filter(f => f.expectedAmount && (!f.invested || !f.investmentAmount));
    expectedFunds.forEach(f => {
      const k = f.strategy || "Other";
      const eur = toEur(f.expectedAmount, f.expectedCurrency || f.currency);
      expectedByStrat[k] = (expectedByStrat[k] || 0) + eur;
      expectedTotal += eur;
    });
    const total = actualTotal + expectedTotal;
    if (!total) return null;
    const actualFunds = funds.filter(f => f.invested && f.investmentAmount);
    return { year: yr, actualByStrat, expectedByStrat, actualTotal, expectedTotal, total, actualFunds, expectedFunds };
  }).filter(Boolean);
  const maxChartTotal = Math.max(...chartRows.map(r => r.total), 1);
  const chartStrats = [...new Set(chartRows.flatMap(r => [...Object.keys(r.actualByStrat), ...Object.keys(r.expectedByStrat)]))];

  // Pipeline grouped by stage
  const pipelineByStage = PIPELINE_STAGES
    .map(s => ({ ...s, items: myPipeline.filter(p => p.stage === s.id) }))
    .filter(s => s.items.length > 0);

  const submitTodo = () => {
    if (!todoText.trim()) return;
    onAddTodo({ text: todoText.trim(), dueDate: todoDue || null, owner: me });
    setTodoText(""); setTodoDue("");
  };

  const lbl = { fontSize: "0.7rem", fontWeight: 600, color: "var(--tx5)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.6rem" };
  const card = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem" };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.75rem" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--tx4)", cursor: "pointer", fontSize: "1.2rem", padding: "0 0.25rem", lineHeight: 1 }}>←</button>
        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>My Dashboard</h2>
        {owners.length > 0 && (
          <select value={me} onChange={e => saveMe(e.target.value)}
            style={{ marginLeft: "auto", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--tx2)", padding: "0.4rem 0.75rem", fontSize: "0.875rem", cursor: "pointer" }}>
            {owners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { label: "My Funds", value: myFunds.length, accent: "#a78bfa", sub: totalAllocEur > 0 ? fmtEur(totalAllocEur) + " allocated" : null },
          { label: "In Pipeline", value: myPipeline.length, accent: "#3b82f6", sub: null },
          { label: "Open To-Dos", value: openTodos.length, accent: "#fb923c", sub: null },
          { label: "Upcoming Meetings", value: myUpcoming.length, accent: "#fbbf24", sub: null },
        ].map(({ label, value, accent, sub }) => (
          <div key={label} style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: "2.25rem", fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--tx4)", marginTop: "0.4rem" }}>{label}</div>
            {sub && <div style={{ fontSize: "0.7rem", color: accent, opacity: 0.7, marginTop: "0.2rem" }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Chart + Pipeline */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.25rem", marginBottom: "1.25rem" }}>

        {/* Combined deployment chart */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <div style={lbl}>Deployment by {groupBy === "vintage" ? "Fund Vintage" : "IC Year"}</div>
            <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.65rem", color: "var(--tx5)", marginRight: "0.4rem" }}>EUR · static FX</span>
              {[["vintage", "Fund Vintage"], ["icYear", "IC Year"]].map(([mode, label]) => (
                <button key={mode} onClick={() => setGroupBy(mode)}
                  style={{ fontSize: "0.65rem", padding: "0.15rem 0.55rem", borderRadius: "4px", cursor: "pointer", border: "1px solid", transition: "all 0.15s",
                    background: groupBy === mode ? "var(--tx3)" : "transparent",
                    color: groupBy === mode ? "var(--bg)" : "var(--tx5)",
                    borderColor: groupBy === mode ? "var(--tx3)" : "var(--border)" }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {chartRows.length === 0 ? (
            <div style={{ color: "var(--tx5)", fontSize: "0.8rem", padding: "2rem 0", textAlign: "center" }}>
              {groupBy === "icYear" ? "No funds with an IC date set yet" : "No deployment data yet"}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {chartRows.map(({ year, actualByStrat, expectedByStrat, actualTotal, expectedTotal, total, actualFunds, expectedFunds }) => {
                  const isExp = expanded.has(year);
                  const hasFunds = actualFunds.length + expectedFunds.length > 0;
                  return (
                    <div key={year}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {/* Year label — click to expand */}
                        <div onClick={() => hasFunds && toggleExpand(year)}
                          style={{ fontSize: "0.78rem", color: isExp ? "var(--tx1)" : "var(--tx3)", width: "44px", flexShrink: 0, textAlign: "right", fontWeight: 600, cursor: hasFunds ? "pointer" : "default", userSelect: "none", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.25rem" }}>
                          {hasFunds && <span style={{ fontSize: "0.5rem", opacity: 0.5 }}>{isExp ? "▼" : "▶"}</span>}
                          {year}
                        </div>
                        <div style={{ flex: 1, height: "22px", display: "flex", borderRadius: "5px", overflow: "hidden", background: "var(--subtle)" }}>
                          {Object.entries(actualByStrat).map(([strat, eur]) => (
                            <div key={`a-${strat}`} title={`${strat} (invested): ${fmtEur(eur)}`}
                              style={{ width: `${(eur / maxChartTotal) * 100}%`, background: STRAT_COLORS[strat] || "#6b7280", transition: "width 0.3s" }} />
                          ))}
                          {Object.entries(expectedByStrat).map(([strat, eur]) => (
                            <div key={`e-${strat}`} title={`${strat} (expected): ${fmtEur(eur)}`}
                              style={{ width: `${(eur / maxChartTotal) * 100}%`, background: STRAT_COLORS[strat] || "#6b7280", opacity: 0.28, transition: "width 0.3s" }} />
                          ))}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--tx3)", width: "110px", textAlign: "right", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                          <span style={{ fontWeight: 600 }}>{fmtEur(actualTotal)}</span>
                          {expectedTotal > 0 && <span style={{ color: "var(--tx5)" }}> / {fmtEur(total)}</span>}
                        </div>
                      </div>
                      {/* Expanded fund list */}
                      {isExp && (
                        <div style={{ marginLeft: "52px", marginTop: "0.3rem", marginBottom: "0.15rem", display: "flex", flexDirection: "column", gap: "0.18rem" }}>
                          {actualFunds.map(f => (
                            <div key={f.id} onClick={() => onFundClick?.(f, f.gp)}
                              style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.2rem 0.5rem", borderRadius: "5px", cursor: "pointer", transition: "background 0.1s" }}
                              onMouseEnter={e => e.currentTarget.style.background = "var(--subtle)"}
                              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                              <span style={{ color: "#22c55e", fontSize: "0.55rem", flexShrink: 0 }}>●</span>
                              <span style={{ fontSize: "0.78rem", color: "var(--tx2)", fontWeight: 500 }}>{f.name}</span>
                              <span style={{ fontSize: "0.72rem", color: "var(--tx5)" }}>· {f.gp?.name}</span>
                              <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--tx4)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{fmtEur(toEur(f.investmentAmount, f.investmentCurrency))}</span>
                            </div>
                          ))}
                          {expectedFunds.map(f => (
                            <div key={f.id} onClick={() => onFundClick?.(f, f.gp)}
                              style={{ display: "flex", alignItems: "center", gap: "0.45rem", padding: "0.2rem 0.5rem", borderRadius: "5px", cursor: "pointer", opacity: 0.7, transition: "background 0.1s" }}
                              onMouseEnter={e => { e.currentTarget.style.background = "var(--subtle)"; e.currentTarget.style.opacity = "1"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.opacity = "0.7"; }}>
                              <span style={{ color: "var(--tx5)", fontSize: "0.55rem", flexShrink: 0 }}>○</span>
                              <span style={{ fontSize: "0.78rem", color: "var(--tx2)" }}>{f.name}</span>
                              <span style={{ fontSize: "0.72rem", color: "var(--tx5)" }}>· {f.gp?.name}</span>
                              <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--tx5)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>exp. {fmtEur(toEur(f.expectedAmount, f.expectedCurrency || f.currency))}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center" }}>
                {chartStrats.map(s => (
                  <span key={s} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", color: "var(--tx4)" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: STRAT_COLORS[s] || "#6b7280", display: "inline-block", flexShrink: 0 }} />{s}
                  </span>
                ))}
                <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "var(--tx5)", flexShrink: 0 }}>Solid = invested · Light = expected</span>
              </div>
            </>
          )}
        </div>

        {/* Pipeline */}
        <div style={card}>
          <div style={lbl}>My Pipeline</div>
          {pipelineByStage.length === 0 ? (
            <div style={{ color: "var(--tx5)", fontSize: "0.8rem", padding: "2.5rem 0", textAlign: "center" }}>Nothing in pipeline yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {pipelineByStage.map(stage => (
                <div key={stage.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, background: stage.bg, color: stage.ac, border: `1px solid ${stage.bd}`, borderRadius: "4px", padding: "0.1rem 0.5rem" }}>{stage.label}</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--tx5)" }}>{stage.items.length}</span>
                  </div>
                  {stage.items.map(p => (
                    <div key={p.id} style={{ fontSize: "0.78rem", padding: "0.25rem 0 0.25rem 0.65rem", borderLeft: `2px solid ${stage.bd}` }}>
                      <span style={{ color: "var(--tx2)", fontWeight: 500 }}>{p.fundName || p.gpName}</span>
                      {p.fundName && <span style={{ color: "var(--tx5)", fontSize: "0.72rem" }}> · {p.gpName}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* To-Do + Upcoming meetings */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.25rem" }}>

        {/* To-Do */}
        <div style={card}>
          <div style={lbl}>To-Do</div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <input
              value={todoText}
              onChange={e => setTodoText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitTodo()}
              placeholder="Add a to-do…"
              style={{ flex: 1, background: "var(--subtle)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--tx1)", padding: "0.45rem 0.75rem", fontSize: "0.82rem", outline: "none" }}
            />
            <input
              type="date"
              value={todoDue}
              onChange={e => setTodoDue(e.target.value)}
              style={{ background: "var(--subtle)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--tx3)", padding: "0.45rem 0.6rem", fontSize: "0.82rem", outline: "none" }}
            />
            <button onClick={submitTodo}
              style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", border: "none", borderRadius: "6px", color: "#fff", padding: "0.45rem 0.9rem", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", lineHeight: 1 }}>+</button>
          </div>
          {myTodos.length === 0 ? (
            <div style={{ color: "var(--tx5)", fontSize: "0.8rem", padding: "1.5rem 0", textAlign: "center" }}>No to-dos yet</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              {[...myTodos].sort((a, b) => {
                const doneDiff = (a.done ? 1 : 0) - (b.done ? 1 : 0);
                if (doneDiff) return doneDiff;
                return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
              }).map(todo => (
                <div key={todo.id} style={{ display: "flex", alignItems: "center", gap: "0.55rem", padding: "0.45rem 0.6rem", borderRadius: "7px", background: todo.done ? "transparent" : "var(--subtle)", opacity: todo.done ? 0.45 : 1, transition: "opacity 0.2s" }}>
                  <button onClick={() => onToggleTodo(todo.id)}
                    style={{ width: "16px", height: "16px", borderRadius: "4px", border: `1.5px solid ${todo.done ? "#22c55e" : "var(--border)"}`, background: todo.done ? "#22c55e" : "transparent", color: "#fff", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", padding: 0, lineHeight: 1 }}>
                    {todo.done ? "✓" : ""}
                  </button>
                  <span style={{ flex: 1, fontSize: "0.82rem", color: "var(--tx2)", textDecoration: todo.done ? "line-through" : "none" }}>{todo.text}</span>
                  {todo.dueDate && (
                    <span style={{ fontSize: "0.7rem", color: !todo.done && todo.dueDate < todayStr ? "#ef4444" : "var(--tx5)", fontWeight: !todo.done && todo.dueDate < todayStr ? 600 : 400 }}>
                      {fmt(todo.dueDate)}
                    </span>
                  )}
                  <button onClick={() => onDeleteTodo(todo.id)}
                    style={{ background: "none", border: "none", color: "var(--tx5)", cursor: "pointer", fontSize: "1rem", padding: "0 0.1rem", lineHeight: 1, flexShrink: 0 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming meetings */}
        <div style={card}>
          <div style={lbl}>Upcoming Meetings — next 30 days</div>
          {myUpcoming.length === 0 ? (
            <div style={{ color: "var(--tx5)", fontSize: "0.8rem", padding: "2.5rem 0", textAlign: "center" }}>No upcoming meetings</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {myUpcoming.map(m => {
                const fundName = m.fundId ? (m.gp.funds || []).find(f => f.id === m.fundId)?.name : null;
                return (
                  <div key={m.id} onClick={() => onMeetingClick(m, m.gp)}
                    style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", background: "var(--subtle)", cursor: "pointer", borderLeft: "3px solid #3b82f6", transition: "background 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--card)"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--subtle)"}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ fontSize: "0.82rem", color: "var(--tx2)", fontWeight: 600 }}>{m.gp?.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--tx4)" }}>{fmt(m.date)}</div>
                    </div>
                    {fundName && <div style={{ fontSize: "0.72rem", color: "var(--tx4)", marginTop: "0.1rem" }}>{fundName}</div>}
                    {m.topic && <div style={{ fontSize: "0.75rem", color: "var(--tx3)", marginTop: "0.2rem" }}>{m.topic}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
