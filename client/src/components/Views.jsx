import React, { useState } from "react";
import { SCORE_CONFIG, STRATEGY_OPTIONS, STATUS_OPTIONS, PIPELINE_STAGES } from '../constants.js';
import { IS, btnGhost } from '../theme.js';
import { fmt, fmtTs } from '../utils.js';
import { ScoreBadge, StatusPill, Chip, SectorChip, SubStratChip, InvestedBadge } from './Badges.jsx';

export function AllMeetingsView({ gps, onBack, onMeetingClick }) {
  const [search, setSearch] = useState("");
  const [typeF, setTypeF] = useState("All");
  const [gpF, setGpF] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const all = gps.flatMap(g => (g.meetings||[]).map(m => {
    const fund = (g.funds||[]).find(f=>f.id===m.fundId);
    return { ...m, gpName: g.name, gpId: g.id, gp: g, fundName: fund?.name||null, fund };
  })).sort((a,b)=>new Date(b.date)-new Date(a.date));

  const shown = all.filter(m => {
    const s = search.toLowerCase();
    const matchSearch = !s || [m.topic,m.gpName,m.fundName,m.location,m.notes].filter(Boolean).some(x=>x.toLowerCase().includes(s));
    const matchType = typeF==="All" || m.type===typeF;
    const matchGP = gpF==="All" || m.gpId===gpF;
    const matchFrom = !dateFrom || m.date >= dateFrom;
    const matchTo = !dateTo || m.date <= dateTo;
    return matchSearch && matchType && matchGP && matchFrom && matchTo;
  });

  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",gap:"1rem",marginBottom:"1.5rem" }}>
        <button onClick={onBack} style={btnGhost}>← Back</button>
        <div>
          <h2 style={{ margin:0,color:"var(--tx1)",fontSize:"1.3rem",fontWeight:700 }}>All Meetings</h2>
          <div style={{ color:"var(--tx4)",fontSize:"0.8125rem" }}>{all.length} total · {shown.length} shown</div>
        </div>
      </div>
      <div style={{ display:"flex",gap:"0.6rem",marginBottom:"1.25rem",flexWrap:"wrap",alignItems:"center" }}>
        <input style={{ ...IS, maxWidth:"200px", flex:"1 1 140px" }} placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} />
        <select style={{ ...IS, width:"auto" }} value={typeF} onChange={e=>setTypeF(e.target.value)}>
          <option value="All">All Types</option>
          {["Virtual","In-Person","Phone Call","Conference"].map(t=><option key={t}>{t}</option>)}
        </select>
        <select style={{ ...IS, width:"auto" }} value={gpF} onChange={e=>setGpF(e.target.value)}>
          <option value="All">All GPs</option>
          {gps.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <div style={{ display:"flex",alignItems:"center",gap:"0.4rem" }}>
          <span style={{ color:"var(--tx4)",fontSize:"0.75rem",whiteSpace:"nowrap" }}>From</span>
          <input type="date" style={{ ...IS, width:"140px" }} value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:"0.4rem" }}>
          <span style={{ color:"var(--tx4)",fontSize:"0.75rem",whiteSpace:"nowrap" }}>To</span>
          <input type="date" style={{ ...IS, width:"140px" }} value={dateTo} onChange={e=>setDateTo(e.target.value)} />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{ ...btnGhost, fontSize:"0.72rem", color:"var(--tx4)" }}>Clear dates</button>
        )}
      </div>
      {shown.length===0 && <div style={{color:"var(--tx4)",textAlign:"center",padding:"3rem"}}>No meetings match.</div>}
      <div style={{ display:"grid",gap:"0.6rem" }}>
        {shown.map(m=>(
          <div key={m.id} onClick={()=>onMeetingClick(m,m.gp)} style={{ background:"var(--card)",border:"1px solid var(--border)",borderRadius:"10px",padding:"1rem 1.25rem",cursor:"pointer",transition:"border-color 0.15s" }} onMouseEnter={e=>e.currentTarget.style.borderColor = "var(--border-hi)"} onMouseLeave={e=>e.currentTarget.style.borderColor = "var(--border)"}>
            <div style={{ display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"0.3rem",flexWrap:"wrap" }}>
              <span style={{color:"var(--tx1)",fontWeight:600}}>{fmt(m.date)}</span>
              <span style={{ background:m.type==="Virtual"?"#1e3a5f":"var(--subtle)",color:m.type==="Virtual"?"#60a5fa":"var(--tx3)",borderRadius:"4px",padding:"0.1rem 0.45rem",fontSize:"0.7rem" }}>{m.type}</span>
              {m.location&&<span style={{color:"var(--tx4)",fontSize:"0.8rem"}}>📍 {m.location}</span>}
              <Chip label={m.gpName} />
              {m.fundName?<Chip label={m.fundName} color="#6366f1" bg="#ede9fe"/>:<Chip label="GP-level" />}
            </div>
            <div style={{color:"#94a3b8",fontWeight:500,fontSize:"0.875rem"}}>{m.topic}</div>
            {m.notes&&<div style={{color:"var(--tx4)",fontSize:"0.8rem",marginTop:"0.2rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.notes}</div>}
            {m.loggedBy&&<div style={{color:"var(--tx4)",fontSize:"0.7rem",marginTop:"0.2rem"}}>Logged by {m.loggedBy}{m.loggedAt?` · ${fmtTs(m.loggedAt)}`:""}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AllFundsView({ gps, onBack, onFundClick, onTagClick }) {
  const [search, setSearch] = useState(""); const [stratF, setStratF] = useState("All"); const [subF, setSubF] = useState("All"); const [secF, setSecF] = useState("All"); const [statF, setStatF] = useState("All"); const [scoreF, setScoreF] = useState("All");
  const all = gps.flatMap(g => (g.funds||[]).map(f => { const fm=(g.meetings||[]).filter(m=>m.fundId===f.id); return {...f,gpName:g.name,gp:g,meetingCount:fm.length,lastMeeting:[...fm].sort((a,b)=>new Date(b.date)-new Date(a.date))[0]}; }));
  const strats = [...new Set(all.map(f=>f.strategy))].sort();
  const subs = [...new Set(all.map(f=>f.subStrategy).filter(Boolean))].sort();
  const sects = [...new Set(all.flatMap(f=>f.sectors||[]))].sort();
  const shown = all.filter(f => {
    const s=search.toLowerCase();
    return (!s||f.name.toLowerCase().includes(s)||f.gpName.toLowerCase().includes(s)) && (stratF==="All"||f.strategy===stratF) && (subF==="All"||f.subStrategy===subF) && (secF==="All"||(f.sectors||[]).includes(secF)) && (statF==="All"||f.status===statF) && (scoreF==="All"||f.score===scoreF);
  });
  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",gap:"1rem",marginBottom:"1.5rem" }}><button onClick={onBack} style={btnGhost}>← Back</button><div><h2 style={{margin:0,color:"var(--tx1)",fontSize:"1.3rem",fontWeight:700}}>All Funds</h2><div style={{color:"var(--tx4)",fontSize:"0.8125rem"}}>{all.length} total · {shown.length} shown</div></div></div>
      <div style={{ display:"flex",gap:"0.55rem",marginBottom:"1.25rem",flexWrap:"wrap" }}>
        <input style={{ ...IS, maxWidth:"200px", flex:"1 1 130px" }} placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} />
        <select style={{ ...IS, width:"auto" }} value={stratF} onChange={e=>setStratF(e.target.value)}><option value="All">Strategy</option>{strats.map(s=><option key={s}>{s}</option>)}</select>
        {subs.length>0&&<select style={{ ...IS, width:"auto" }} value={subF} onChange={e=>setSubF(e.target.value)}><option value="All">Sub-Strategy</option>{subs.map(s=><option key={s}>{s}</option>)}</select>}
        <select style={{ ...IS, width:"auto" }} value={secF} onChange={e=>setSecF(e.target.value)}><option value="All">Sector</option>{sects.map(s=><option key={s}>{s}</option>)}</select>
        <select style={{ ...IS, width:"auto" }} value={statF} onChange={e=>setStatF(e.target.value)}><option value="All">Status</option>{["Pre-Marketing","Fundraising","Closed","Deployed","Monitoring","Exiting"].map(s=><option key={s}>{s}</option>)}</select>
        <select style={{ ...IS, width:"auto" }} value={scoreF} onChange={e=>setScoreF(e.target.value)}><option value="All">Score</option>{Object.entries(SCORE_CONFIG).map(([k,v])=><option key={k} value={k}>{k} — {v.desc}</option>)}</select>
      </div>
      {shown.length===0&&<div style={{color:"var(--tx4)",textAlign:"center",padding:"3rem"}}>No funds match.</div>}
      <div style={{ display:"grid",gap:"0.65rem" }}>
        {shown.map(f=>(
          <div key={f.id} onClick={()=>onFundClick(f,f.gp)} style={{ background:"var(--card)",border:"1px solid var(--border)",borderRadius:"10px",padding:"1.1rem 1.25rem",cursor:"pointer",transition:"border-color 0.15s" }} onMouseEnter={e=>e.currentTarget.style.borderColor = "var(--border-hi)"} onMouseLeave={e=>e.currentTarget.style.borderColor = "var(--border)"}>
            <div style={{ display:"flex",alignItems:"flex-start",gap:"1rem",flexWrap:"wrap" }}>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:"flex",alignItems:"center",gap:"0.4rem",flexWrap:"wrap",marginBottom:"0.4rem" }}>
                  <span style={{color:"var(--tx1)",fontWeight:700}}>{f.name}</span>
                  <ScoreBadge score={f.score} />
                  <StatusPill status={f.status} />
                  {f.subStrategy&&<SubStratChip label={f.subStrategy} onClick={e=>{e.stopPropagation();onTagClick("subStrategy",f.subStrategy);}} />}
                  {f.invested&&<InvestedBadge amount={f.investmentAmount} currency={f.investmentCurrency}/>}
                </div>
                <div style={{ display:"flex",gap:"1rem",color:"var(--tx4)",fontSize:"0.775rem",flexWrap:"wrap",marginBottom:"0.4rem" }}>
                  <span style={{color:"var(--tx4)"}}>{f.gpName}</span>
                  {f.vintage&&<span>Vintage {f.vintage}</span>}
                  {f.targetSize&&<span>Target {f.currency} {Number(f.targetSize).toLocaleString()}M</span>}
                  {f.finalSize&&<span>Final {f.currency} {Number(f.finalSize).toLocaleString()}M</span>}
                  {!f.finalSize&&f.raisedSize&&<span>Raised {f.currency} {Number(f.raisedSize).toLocaleString()}M</span>}
                  <span>{f.meetingCount} meeting{f.meetingCount!==1?"s":""}</span>
                </div>
                {f.sectors?.length>0&&<div style={{display:"flex",gap:"0.3rem",flexWrap:"wrap"}}>{f.sectors.map(s=><SectorChip key={s} label={s} onClick={e=>{e.stopPropagation();onTagClick("sector",s);}}/>)}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TagFilterView({ type, value, gps, onBack, onFundClick }) {
  const all = gps.flatMap(g => (g.funds||[]).map(f=>({...f,gpName:g.name,gp:g})));
  const shown = type==="sector" ? all.filter(f=>(f.sectors||[]).includes(value)) : all.filter(f=>f.subStrategy===value);
  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",gap:"1rem",marginBottom:"1.5rem" }}>
        <button onClick={onBack} style={btnGhost}>← Back</button>
        <div>
          <h2 style={{margin:0,color:"var(--tx1)",fontSize:"1.3rem",fontWeight:700}}>{type==="sector"?"Sector":"Sub-Strategy"}: {value}</h2>
          <div style={{color:"var(--tx4)",fontSize:"0.8125rem"}}>{shown.length} fund{shown.length!==1?"s":""}</div>
        </div>
      </div>
      <div style={{ display:"grid",gap:"0.65rem" }}>
        {shown.map(f=>(
          <div key={f.id} onClick={()=>onFundClick(f,f.gp)} style={{ background:"var(--card)",border:"1px solid var(--border)",borderRadius:"10px",padding:"1rem 1.25rem",cursor:"pointer",transition:"border-color 0.15s" }} onMouseEnter={e=>e.currentTarget.style.borderColor = "var(--border-hi)"} onMouseLeave={e=>e.currentTarget.style.borderColor = "var(--border)"}>
            <div style={{ display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap",marginBottom:"0.3rem" }}>
              <span style={{color:"var(--tx1)",fontWeight:700}}>{f.name}</span><ScoreBadge score={f.score}/><StatusPill status={f.status}/>
            </div>
            <div style={{color:"var(--tx4)",fontSize:"0.8125rem"}}>{f.gpName} · {f.strategy}{f.subStrategy?" · "+f.subStrategy:""}</div>
            {f.sectors?.length>0&&<div style={{display:"flex",gap:"0.3rem",flexWrap:"wrap",marginTop:"0.4rem"}}>{f.sectors.map(s=><SectorChip key={s} label={s}/>)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function GradeAView({ gps, onBack, onGpClick }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={onBack} style={btnGhost}>← Back</button>
        <h2 style={{ margin: 0, color: "var(--tx1)", fontSize: "1.3rem", fontWeight: 700 }}>Grade A GPs</h2>
      </div>
      <div style={{ display: "grid", gap: "0.7rem" }}>
        {gps.filter(g => g.score === "A").map(gp => (
          <div key={gp.id} onClick={() => onGpClick(gp)}
            style={{ background:"var(--card)", border:"1px solid var(--sb-A-bd)", borderRadius:"12px", padding:"1.25rem 1.5rem", cursor:"pointer", transition:"border-color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--sb-A-c)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--sb-A-bd)"}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", flexWrap:"wrap", marginBottom:"0.4rem" }}>
              <span style={{ fontWeight:700, fontSize:"1rem", color:"var(--tx1)" }}>{gp.name}</span>
              <ScoreBadge score="A" />
            </div>
            <div style={{ color:"var(--tx4)", fontSize:"0.8125rem" }}>{gp.hq} · {(gp.funds||[]).length} funds · {(gp.meetings||[]).length} meetings</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FundraisingView({ gps, onBack, onFundClick }) {
  const funds = gps.flatMap(g => (g.funds||[]).filter(f => f.status === "Fundraising").map(f => ({ ...f, gp: g, gpName: g.name })));
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={onBack} style={btnGhost}>← Back</button>
        <h2 style={{ margin: 0, color: "var(--tx1)", fontSize: "1.3rem", fontWeight: 700 }}>Funds Currently in Market</h2>
      </div>
      <div style={{ display: "grid", gap: "0.7rem" }}>
        {funds.map(f => (
          <div key={f.id} onClick={() => onFundClick(f, f.gp)}
            style={{ background:"var(--card)", border:"1px solid var(--pill-bg-1)", borderRadius:"10px", padding:"1.1rem 1.25rem", cursor:"pointer", transition:"border-color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--pill-c-1)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--pill-bg-1)"}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", flexWrap:"wrap", marginBottom:"0.4rem" }}>
              <span style={{ fontWeight:700, color:"var(--tx1)" }}>{f.name}</span>
              <ScoreBadge score={f.score} /><StatusPill status="Fundraising" />
              {f.subStrategy && <SubStratChip label={f.subStrategy} />}
            </div>
            <div style={{ color:"var(--tx4)", fontSize:"0.8125rem", marginBottom:"0.4rem" }}>{f.gpName} · {f.strategy}</div>
            {f.targetSize && f.raisedSize && (() => {
              const pct = Math.min(100, Math.round(parseFloat(f.raisedSize) / parseFloat(f.targetSize) * 100));
              return (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", color:"var(--tx4)", fontSize:"0.72rem", marginBottom:"0.2rem" }}>
                    <span>Raised {f.currency} {Number(f.raisedSize).toLocaleString()}M</span>
                    <span>{pct}% of {f.currency} {Number(f.targetSize).toLocaleString()}M target</span>
                  </div>
                  <div style={{ background:"var(--subtle)", borderRadius:"3px", height:"5px", overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:"#3b82f6", borderRadius:"3px" }} />
                  </div>
                </div>
              );
            })()}
            {f.sectors?.length > 0 && <div style={{ display:"flex", gap:"0.3rem", flexWrap:"wrap", marginTop:"0.4rem" }}>{f.sectors.map(s => <SectorChip key={s} label={s} />)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
