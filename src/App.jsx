import { useState, useRef, useCallback, useEffect } from "react";

/* ═══════════════════════════════════════════════════════
   STORAGE & SYNC LAYER
   - Persistent across sessions via localStorage
   - Cross-tab sync via storage event + polling every 2s
   ═══════════════════════════════════════════════════════ */
const KEYS = { prizes: "cf-prizes-v2", participants: "cf-parts-v2", results: "cf-results-v2" };

function load(key) {
  try {
    const r = localStorage.getItem(key);
    return r ? JSON.parse(r) : null;
  } catch { return null; }
}
function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.error("Save err:", e); }
}

let _uid = Date.now();
const uid = () => String(++_uid);

/* ═══════════════════════════════════════════════════════
   THEME
   ═══════════════════════════════════════════════════════ */
const T = {
  bg: "#050510", panel: "#0a0e1a", card: "rgba(15,23,42,0.95)",
  inp: "rgba(30,41,59,0.9)", accent: "#3b82f6", aL: "#60a5fa",
  aD: "#1d4ed8", glow: "rgba(59,130,246,0.35)", danger: "#ef4444",
  txt: "#e2e8f0", mut: "#64748b", brd: "rgba(59,130,246,0.15)",
};
const WC = ["#1e3a5f","#3b82f6","#0f172a","#2563eb","#1e293b","#1d4ed8","#0c1929","#60a5fa","#162033","#2980b9","#0b1120","#1565c0"];

/* ═══════════════════════════════════════════════════════
   useStorage hook — load + poll for live sync
   ═══════════════════════════════════════════════════════ */
function useStorage(key, fallback) {
  const [data, setData] = useState(() => load(key) ?? fallback);
  const [loaded, setLoaded] = useState(true);

  useEffect(() => {
    let active = true;
    const poll = () => {
      const d = load(key);
      if (active && d !== null) setData(d);
    };
    const iv = setInterval(poll, 2000);

    const onStorage = (e) => {
      if (e.key === key && active) {
        const d = load(key);
        if (d !== null) setData(d);
      }
    };
    window.addEventListener("storage", onStorage);

    return () => { active = false; clearInterval(iv); window.removeEventListener("storage", onStorage); };
  }, [key]);

  const update = useCallback((fn) => {
    setData(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      save(key, next);
      return next;
    });
  }, [key]);

  return [data, update, loaded];
}

/* ═══════════════════════════════════════════════════════
   SVG WHEEL — precise slice rendering
   ═══════════════════════════════════════════════════════ */
function WheelSVG({ prizes, spinning, rotation }) {
  const n = prizes.length;
  if (!n) return (
    <div style={{ width:"100%", maxWidth:480, aspectRatio:"1", borderRadius:"50%", margin:"0 auto",
      background:"radial-gradient(circle,#1e293b,#0a0a12)", display:"flex", alignItems:"center",
      justifyContent:"center", border:`3px dashed ${T.brd}` }}>
      <span style={{ color:T.mut, fontSize:17, textAlign:"center", padding:40, lineHeight:1.7 }}>
        Panelden ödül ekleyerek<br/>çarkı oluşturun
      </span>
    </div>
  );

  const arc = 360 / n, r = 190, cx = 200, cy = 200;

  return (
    <div style={{ position:"relative", width:"100%", maxWidth:480, margin:"0 auto" }}>
      {/* Pointer — fixed at top */}
      <div style={{
        position:"absolute", top:-4, left:"50%", transform:"translateX(-50%)", zIndex:10,
        width:0, height:0, borderLeft:"16px solid transparent", borderRight:"16px solid transparent",
        borderTop:`34px solid ${T.accent}`, filter:`drop-shadow(0 4px 14px ${T.glow})`,
      }}/>
      <svg viewBox="0 0 400 400" style={{
        width:"100%", transform:`rotate(${rotation}deg)`,
        transition: spinning ? "transform 6s cubic-bezier(0.12,0.58,0.06,1.00)" : "none",
        filter:`drop-shadow(0 0 50px ${T.glow})`,
      }}>
        <defs>
          <radialGradient id="sh" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.1)"/>
            <stop offset="100%" stopColor="transparent"/>
          </radialGradient>
          <filter id="gl"><feGaussianBlur stdDeviation="3" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {/* Outer rings */}
        <circle cx={cx} cy={cy} r={r+9} fill="none" stroke={T.accent} strokeWidth="2" opacity=".3"/>
        <circle cx={cx} cy={cy} r={r+5} fill="none" stroke={T.aD} strokeWidth="3"/>
        {/* Tick marks */}
        {prizes.map((_,i) => {
          const a = (i*arc-90)*Math.PI/180;
          return <line key={i} x1={cx+(r+1)*Math.cos(a)} y1={cy+(r+1)*Math.sin(a)}
            x2={cx+(r+9)*Math.cos(a)} y2={cy+(r+9)*Math.sin(a)} stroke={T.aL} strokeWidth="2" opacity=".5"/>;
        })}
        {/* Slices */}
        {prizes.map((p,i) => {
          const sa = (i*arc-90)*Math.PI/180, ea = ((i+1)*arc-90)*Math.PI/180;
          const x1=cx+r*Math.cos(sa), y1=cy+r*Math.sin(sa);
          const x2=cx+r*Math.cos(ea), y2=cy+r*Math.sin(ea);
          const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${arc>180?1:0},1 ${x2},${y2} Z`;
          const ma = ((i*arc+arc/2)-90)*Math.PI/180;
          const lr = r * (n > 8 ? 0.55 : 0.6);
          const lx = cx+lr*Math.cos(ma), ly = cy+lr*Math.sin(ma);
          return (
            <g key={p.id}>
              <path d={d} fill={WC[i%WC.length]} stroke="#060610" strokeWidth="1.5"/>
              <path d={d} fill="url(#sh)" opacity=".4"/>
              <text x={lx} y={ly} fill="#fff"
                fontSize={n>12?"7":n>8?"9":n>5?"11":"13"} fontWeight="700"
                textAnchor="middle" dominantBaseline="middle"
                transform={`rotate(${i*arc+arc/2},${lx},${ly})`}
                style={{textShadow:"0 2px 4px rgba(0,0,0,.9)",fontFamily:"'Outfit',sans-serif"}}>
                {p.name.length > (n>8?10:14) ? p.name.slice(0, n>8?9:13)+"…" : p.name}
              </text>
            </g>
          );
        })}
        {/* Center hub */}
        <circle cx={cx} cy={cy} r="32" fill="#070710" stroke={T.accent} strokeWidth="3" filter="url(#gl)"/>
        <circle cx={cx} cy={cy} r="22" fill={T.accent}/>
        <text x={cx} y={cy+1} fill="#fff" fontSize="10" fontWeight="900"
          textAnchor="middle" dominantBaseline="middle"
          style={{fontFamily:"'Outfit',sans-serif",letterSpacing:"1.5px"}}>SPIN</text>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   WHEEL PAGE — Full screen audience view
   ═══════════════════════════════════════════════════════ */
function WheelPage({ prizes, participants, updateParticipants, results, updateResults, goPanel }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [current, setCurrent] = useState("");
  const [winner, setWinner] = useState(null);

  useEffect(() => {
    if (current && !participants.find(p => p.name === current)) setCurrent("");
  }, [participants, current]);

  const spin = useCallback(() => {
    if (spinning || !prizes.length) return;
    if (!current.trim()) {
      setWinner({ name: "⚠️", prize: "Lütfen bir katılımcı seçin!", warn: true });
      return;
    }
    setWinner(null);
    setSpinning(true);

    const n = prizes.length;
    const arc = 360 / n;
    const part = participants.find(p => p.name === current);

    let winIndex;

    if (part?.assignedPrize) {
      winIndex = prizes.findIndex(p => p.name === part.assignedPrize);
      if (winIndex === -1) {
        const normals = prizes.map((p, i) => ({ ...p, _i: i })).filter(p => !p.special);
        winIndex = normals.length ? normals[Math.floor(Math.random() * normals.length)]._i
          : Math.floor(Math.random() * n);
      }
    } else {
      const normals = prizes.map((p, i) => ({ ...p, _i: i })).filter(p => !p.special);
      if (!normals.length) {
        setSpinning(false);
        setWinner({ name: "⚠️", prize: "Tüm ödüller özel! Bu katılımcıya ödül atanamaz.", warn: true });
        return;
      }
      winIndex = normals[Math.floor(Math.random() * normals.length)]._i;
    }

    const targetAngle = (360 - (winIndex * arc + arc / 2) + 360) % 360;
    const currentMod = ((rotation % 360) + 360) % 360;
    let delta = targetAngle - currentMod;
    if (delta <= 0) delta += 360;
    const fullSpins = (7 + Math.floor(Math.random() * 4)) * 360;
    const totalAdd = fullSpins + delta;

    setRotation(prev => prev + totalAdd);

    setTimeout(() => {
      setSpinning(false);
      const wonPrize = prizes[winIndex];

      const result = {
        id: uid(),
        participantName: current,
        prizeName: wonPrize.name,
        special: wonPrize.special,
        spunAt: new Date().toISOString(),
      };
      updateResults(prev => [result, ...prev]);
      updateParticipants(prev => prev.filter(p => p.name !== current));

      setCurrent("");
      setWinner({ name: current, prize: wonPrize.name });
    }, 6300);
  }, [spinning, prizes, current, participants, rotation, updateResults, updateParticipants]);

  return (
    <div style={{
      minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      background:"radial-gradient(ellipse at 50% 30%,#0d1b2a 0%,#050510 60%,#000 100%)",
      fontFamily:"'Outfit',sans-serif", color:T.txt, padding:"24px", position:"relative", overflow:"hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes winPop{0%{transform:scale(.5)rotate(-8deg);opacity:0}100%{transform:scale(1)rotate(0);opacity:1}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        @keyframes particleDrift{0%{transform:translateY(0)scale(1);opacity:.5}100%{transform:translateY(-100vh)scale(0);opacity:0}}
        button:hover{filter:brightness(1.15)} select:focus,input:focus{border-color:${T.accent}!important;outline:none}
      `}</style>

      {/* Ambient particles */}
      {[...Array(14)].map((_,i) => (
        <div key={i} style={{
          position:"absolute", width:2+Math.random()*4, height:2+Math.random()*4,
          borderRadius:"50%", background:T.accent, opacity:.12,
          left:`${Math.random()*100}%`, bottom:`${Math.random()*15}%`,
          animation:`particleDrift ${10+Math.random()*15}s linear infinite`,
          animationDelay:`${Math.random()*10}s`,
        }}/>
      ))}

      {/* Panel link */}
      <button onClick={goPanel} style={{
        position:"absolute", top:20, right:20, zIndex:20,
        background:"rgba(59,130,246,.1)", border:`1px solid ${T.brd}`,
        borderRadius:12, padding:"10px 18px", cursor:"pointer",
        color:T.mut, fontSize:13, fontWeight:600, fontFamily:"'Outfit',sans-serif",
        display:"flex", alignItems:"center", gap:8,
      }}>⚙️ Yönetim Paneli</button>

      <h1 style={{
        fontSize:38, fontWeight:900, color:"#fff", marginBottom:6,
        textShadow:`0 0 40px ${T.glow}`, letterSpacing:"-1px",
        animation:"float 4s ease-in-out infinite",
      }}>🎡 Çarkıfelek</h1>
      <p style={{ color:T.mut, fontSize:14, marginBottom:32, fontWeight:500 }}>Şansını dene, ödülünü kazan!</p>

      {/* Wheel */}
      <div style={{ width:"100%", maxWidth:480, position:"relative", zIndex:1 }}>
        <WheelSVG prizes={prizes} spinning={spinning} rotation={rotation}/>
      </div>

      {/* Controls */}
      <div style={{ width:"100%", maxWidth:420, marginTop:32, position:"relative", zIndex:1 }}>
        <label style={{ fontSize:12, fontWeight:600, color:T.mut, marginBottom:8, display:"block" }}>🎯 Katılımcı</label>
        {participants.length > 0 ? (
          <select value={current} onChange={e=>setCurrent(e.target.value)}
            style={{
              width:"100%", padding:"14px 16px", fontSize:15,
              background:T.inp, color:T.txt, border:`1px solid ${T.brd}`,
              borderRadius:12, fontFamily:"'Outfit',sans-serif", cursor:"pointer", appearance:"auto", outline:"none",
            }}>
            <option value="">Katılımcı seçin... ({participants.length} kişi)</option>
            {participants.map(p => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        ) : (
          <div style={{
            padding:"14px 16px", fontSize:14, color:T.mut, background:T.inp,
            border:`1px solid ${T.brd}`, borderRadius:12, textAlign:"center",
          }}>Katılımcı yok — panelden ekleyin</div>
        )}

        <button onClick={spin} disabled={spinning || !prizes.length || !participants.length}
          style={{
            width:"100%", marginTop:14, padding:"18px", fontSize:22, fontWeight:900,
            letterSpacing:"2px", textTransform:"uppercase",
            background: spinning ? "linear-gradient(135deg,#334155,#1e293b)"
              : `linear-gradient(135deg,${T.accent},${T.aD})`,
            color:"#fff", border:"none", borderRadius:16,
            cursor: (spinning || !prizes.length || !participants.length) ? "not-allowed" : "pointer",
            boxShadow: spinning ? "none" : `0 8px 48px ${T.glow}`,
            fontFamily:"'Outfit',sans-serif", transition:"all .3s",
            opacity: (!prizes.length || !participants.length) ? 0.5 : 1,
          }}>
          {spinning ? "⏳ DÖNÜYOR..." : "🎰 ÇARKI ÇEVİR"}
        </button>
      </div>

      {/* Last results */}
      {results.length > 0 && (
        <div style={{ width:"100%", maxWidth:420, marginTop:28, position:"relative", zIndex:1 }}>
          <div style={{ fontSize:13, color:T.mut, marginBottom:10, fontWeight:700 }}>🏆 Son Sonuçlar</div>
          {results.slice(0,4).map(r => (
            <div key={r.id} style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"10px 14px", borderRadius:10, marginBottom:6,
              background:"rgba(15,23,42,.7)", border:`1px solid ${T.brd}`,
            }}>
              <span style={{ fontWeight:700 }}>{r.participantName}</span>
              <span style={{ padding:"3px 12px", borderRadius:20, fontSize:11,
                fontWeight:700, background:T.accent, color:"#fff" }}>{r.prizeName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Winner modal */}
      {winner && !spinning && (
        <div style={{
          position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,.85)",
          backdropFilter:"blur(16px)", display:"flex", alignItems:"center", justifyContent:"center",
        }} onClick={()=>setWinner(null)}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"linear-gradient(160deg,#0f172a,#1e293b)",
            border:`2px solid ${winner.warn ? T.danger : T.accent}`, borderRadius:28,
            padding:"52px 60px", textAlign:"center", maxWidth:460,
            boxShadow:`0 0 120px ${winner.warn ? "rgba(239,68,68,.3)" : T.glow}`,
            animation:"winPop .5s ease-out",
          }}>
            <div style={{ fontSize:72, marginBottom:16 }}>{winner.warn ? "⚠️" : "🎉"}</div>
            {!winner.warn && (
              <div style={{ fontSize:13, color:T.mut, fontWeight:700, letterSpacing:4, marginBottom:8 }}>TEBRİKLER</div>
            )}
            <div style={{ fontSize:30, fontWeight:900, color:"#fff", marginBottom:10 }}>{winner.name}</div>
            {!winner.warn && <div style={{ fontSize:15, color:T.mut, marginBottom:18 }}>kazandı:</div>}
            <div style={{
              fontSize: winner.warn ? 16 : 26, fontWeight:900,
              color: winner.warn ? T.danger : T.aL,
              textShadow: winner.warn ? "none" : `0 0 30px ${T.glow}`,
              padding:"14px 28px", background: winner.warn ? "rgba(239,68,68,.08)" : "rgba(59,130,246,.1)",
              borderRadius:14, border:`1px solid ${winner.warn ? "rgba(239,68,68,.25)" : T.brd}`,
            }}>{winner.prize}</div>
            <button onClick={()=>setWinner(null)} style={{
              marginTop:32, padding:"14px 52px", fontSize:16, fontWeight:700,
              background:T.accent, color:"#fff", border:"none", borderRadius:12,
              cursor:"pointer", fontFamily:"'Outfit',sans-serif",
            }}>Tamam</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ADMIN PANEL PAGE
   ═══════════════════════════════════════════════════════ */
function PanelPage({ prizes, updatePrizes, participants, updateParticipants, results, updateResults, goWheel }) {
  const [tab, setTab] = useState("prizes");

  const [np, setNp] = useState("");
  const [nps, setNps] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editVal, setEditVal] = useState("");

  const [newP, setNewP] = useState("");
  const [searchP, setSearchP] = useState("");
  const fRef = useRef(null);

  const [srN, setSrN] = useState("");
  const [srP, setSrP] = useState("");

  /* ─── Prize CRUD ─── */
  const addPrize = () => {
    if (!np.trim()) return;
    updatePrizes(prev => [...prev, { id: uid(), name: np.trim(), order: prev.length, special: nps }]);
    setNp(""); setNps(false);
  };
  const rmPrize = id => updatePrizes(prev => prev.filter(p => p.id !== id));
  const startEdit = p => { setEditId(p.id); setEditVal(p.name); };
  const saveEdit = id => {
    if (!editVal.trim()) { setEditId(null); return; }
    updatePrizes(prev => prev.map(p => p.id === id ? { ...p, name: editVal.trim() } : p));
    setEditId(null);
  };
  const togSpecial = id => updatePrizes(prev => prev.map(p => p.id === id ? { ...p, special: !p.special } : p));

  /* ─── Participant CRUD ─── */
  const addParts = () => {
    if (!newP.trim()) return;
    const names = newP.trim().split(/[\s\n]+/).filter(Boolean);
    updateParticipants(prev => [
      ...prev,
      ...names.map(n => ({ id: uid(), name: n, assignedPrize: "", addedAt: new Date().toISOString() }))
    ]);
    setNewP("");
  };
  const rmPart = id => updateParticipants(prev => prev.filter(p => p.id !== id));
  const clearParts = () => updateParticipants([]);
  const assign = (pid, pn) => updateParticipants(prev => prev.map(p => p.id === pid ? { ...p, assignedPrize: pn } : p));

  const handleTxt = e => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      const t = ev.target?.result;
      if (typeof t === "string") {
        const names = t.split(/[\r\n]+/).map(n => n.trim()).filter(Boolean);
        updateParticipants(prev => [
          ...prev,
          ...names.map(n => ({ id: uid(), name: n, assignedPrize: "", addedAt: new Date().toISOString() }))
        ]);
      }
    };
    r.readAsText(f); e.target.value = "";
  };

  const filtP = participants.filter(p => p.name.toLowerCase().includes(searchP.toLowerCase()));
  const filtR = results.filter(r =>
    r.participantName.toLowerCase().includes(srN.toLowerCase()) &&
    r.prizeName.toLowerCase().includes(srP.toLowerCase())
  );

  /* ─── Styles ─── */
  const inp = { background:T.inp, color:T.txt, border:`1px solid ${T.brd}`, borderRadius:8, padding:"10px 14px", fontSize:14, outline:"none", width:"100%", fontFamily:"'Outfit',sans-serif" };
  const btn = { background:T.accent, color:"#fff", border:"none", borderRadius:8, padding:"10px 20px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'Outfit',sans-serif", whiteSpace:"nowrap" };
  const btnD = { ...btn, background:"rgba(239,68,68,.15)", color:T.danger, border:`1px solid rgba(239,68,68,.25)` };
  const btnG = { ...btn, background:"transparent", color:T.mut, border:`1px solid ${T.brd}` };
  const card = { background:T.card, border:`1px solid ${T.brd}`, borderRadius:14, padding:"22px", marginBottom:18 };
  const row = { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderRadius:8, background:"rgba(30,41,59,.5)", marginBottom:6, fontSize:13, border:"1px solid rgba(255,255,255,.04)", gap:8 };
  const badge = c => ({ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background:c||T.accent, color:"#fff", whiteSpace:"nowrap" });
  const navB = a => ({ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"13px 20px", cursor:"pointer", fontSize:14, fontWeight:600, color:a?"#fff":T.mut, background:a?"linear-gradient(90deg,rgba(59,130,246,.2),transparent)":"transparent", border:"none", borderLeft:a?`3px solid ${T.accent}`:"3px solid transparent", fontFamily:"'Outfit',sans-serif", textAlign:"left" });

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:T.panel, fontFamily:"'Outfit',sans-serif", color:T.txt }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:rgba(59,130,246,.3);border-radius:3px}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        button:hover{filter:brightness(1.15)} input:focus,select:focus{border-color:${T.accent}!important;outline:none}
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{ width:240, minHeight:"100vh", flexShrink:0, background:"rgba(8,8,16,.98)", borderRight:`1px solid ${T.brd}`, display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"24px 20px", borderBottom:`1px solid ${T.brd}` }}>
          <div style={{ fontSize:20, fontWeight:900, color:T.accent, display:"flex", alignItems:"center", gap:10 }}>⚙️ Yönetim Paneli</div>
          <div style={{ fontSize:11, color:T.mut, marginTop:6, padding:"6px 10px", borderRadius:8, background:"rgba(59,130,246,.08)", border:`1px solid ${T.brd}` }}>
            🔄 Gerçek zamanlı senkronize
          </div>
        </div>
        <nav style={{ padding:"12px 0", flex:1 }}>
          <button style={navB(false)} onClick={goWheel}>
            <span style={{fontSize:18}}>🎡</span> Çarkıfeleğe Git
          </button>
          <div style={{ height:1, background:T.brd, margin:"8px 20px" }}/>
          <button style={navB(tab==="prizes")} onClick={()=>setTab("prizes")}>
            <span style={{fontSize:18}}>🎁</span> Ödüller
            <span style={{ marginLeft:"auto", fontSize:11, color:T.aL, fontWeight:700 }}>{prizes.length}</span>
          </button>
          <button style={navB(tab==="participants")} onClick={()=>setTab("participants")}>
            <span style={{fontSize:18}}>👥</span> Katılımcılar
            <span style={{ marginLeft:"auto", fontSize:11, color:T.aL, fontWeight:700 }}>{participants.length}</span>
          </button>
          <button style={navB(tab==="results")} onClick={()=>setTab("results")}>
            <span style={{fontSize:18}}>🏆</span> Sonuçlar
            <span style={{ marginLeft:"auto", fontSize:11, color:T.aL, fontWeight:700 }}>{results.length}</span>
          </button>
        </nav>
        <div style={{ padding:"16px 20px", borderTop:`1px solid ${T.brd}`, fontSize:11, color:T.mut }}>
          Veriler otomatik kaydedilir
        </div>
      </aside>

      {/* ── CONTENT ── */}
      <div style={{ flex:1, overflowY:"auto", maxHeight:"100vh", padding:"32px 40px", animation:"fadeIn .3s ease" }}>

        {/* ═══ PRIZES TAB ═══ */}
        {tab === "prizes" && (<>
          <h1 style={{ fontSize:24, fontWeight:800, marginBottom:24, display:"flex", alignItems:"center", gap:12 }}>🎁 Ödül Yönetimi</h1>

          <div style={card}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:14 }}>Yeni Ödül Ekle</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <input style={{...inp, flex:"1 1 200px"}} placeholder="Ödül adı yazın..."
                value={np} onChange={e=>setNp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addPrize()}/>
              <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:T.mut, cursor:"pointer", padding:"0 8px", whiteSpace:"nowrap" }}>
                <input type="checkbox" checked={nps} onChange={e=>setNps(e.target.checked)} style={{accentColor:T.accent, width:16, height:16}}/> ⭐ Özel
              </label>
              <button style={btn} onClick={addPrize}>+ Ekle</button>
            </div>
            <p style={{ fontSize:12, color:T.mut, marginTop:10 }}>
              ⭐ Özel ödüller sadece atanmış kişilere çıkar, rastgele çevirmede <strong>asla</strong> çıkmaz.
            </p>
          </div>

          <div style={card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <span style={{ fontSize:16, fontWeight:700 }}>Mevcut Ödüller ({prizes.length})</span>
              {prizes.length > 0 && <button style={{...btnD, padding:"6px 14px", fontSize:12}} onClick={()=>updatePrizes([])}>Tümünü Sil</button>}
            </div>
            {prizes.map((p,i) => (
              <div key={p.id} style={row}>
                <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
                  <div style={{ width:16, height:16, borderRadius:4, background:WC[i%WC.length], border:"1px solid rgba(255,255,255,.1)", flexShrink:0 }}/>
                  {editId === p.id ? (
                    <input style={{...inp, flex:1, padding:"6px 10px", fontSize:13}} value={editVal}
                      onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveEdit(p.id)}
                      onBlur={()=>saveEdit(p.id)} autoFocus/>
                  ) : (
                    <span style={{ fontWeight:600, cursor:"pointer", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}
                      onClick={()=>startEdit(p)} title="Düzenlemek için tıklayın">{p.name}</span>
                  )}
                  {p.special && <span style={{ fontSize:11, color:"#f59e0b", fontWeight:600, whiteSpace:"nowrap" }}>⭐ Özel</span>}
                </div>
                <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                  <button onClick={()=>togSpecial(p.id)} title={p.special?"Normal yap":"Özel yap"}
                    style={{ background:p.special?"rgba(245,158,11,.2)":"rgba(255,255,255,.05)", border:"none", borderRadius:6, padding:"5px 8px", cursor:"pointer", fontSize:13 }}>⭐</button>
                  <button onClick={()=>startEdit(p)} title="Düzenle"
                    style={{ background:"rgba(59,130,246,.15)", color:T.accent, border:"none", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:12, fontWeight:700 }}>✏️</button>
                  <button onClick={()=>rmPrize(p.id)} title="Sil"
                    style={{ background:"rgba(239,68,68,.15)", color:T.danger, border:"none", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:12, fontWeight:700 }}>✕</button>
                </div>
              </div>
            ))}
            {!prizes.length && <p style={{ fontSize:13, color:T.mut, textAlign:"center", padding:28 }}>Henüz ödül eklenmedi.</p>}
          </div>

          {/* Wheel preview */}
          {prizes.length > 0 && (
            <div style={card}>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:14 }}>👁️ Çark Önizleme</div>
              <div style={{ maxWidth:280, margin:"0 auto" }}>
                <WheelSVG prizes={prizes} spinning={false} rotation={0}/>
              </div>
            </div>
          )}
        </>)}

        {/* ═══ PARTICIPANTS TAB ═══ */}
        {tab === "participants" && (<>
          <h1 style={{ fontSize:24, fontWeight:800, marginBottom:24, display:"flex", alignItems:"center", gap:12 }}>👥 Katılımcı Yönetimi</h1>

          <div style={card}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:8 }}>
              <span style={{ fontSize:16, fontWeight:700 }}>Katılımcı Ekle</span>
              <div style={{ display:"flex", gap:8 }}>
                <button style={btnG} onClick={()=>fRef.current?.click()}>📄 TXT Yükle</button>
                <input ref={fRef} type="file" accept=".txt" onChange={handleTxt} style={{display:"none"}}/>
                <button style={btnD} onClick={clearParts}>Hepsini Sil</button>
              </div>
            </div>
            <p style={{ fontSize:12, color:T.mut, marginBottom:14 }}>
              TXT dosyası (satır başı bir isim) veya aşağıya boşlukla ayırarak birden fazla isim yazın.
              <br/>Çekilen kişiler otomatik olarak listeden düşer.
            </p>
            <div style={{ display:"flex", gap:8 }}>
              <input style={{...inp, flex:1}} placeholder="İsim1 İsim2 İsim3 (boşlukla ayırın)"
                value={newP} onChange={e=>setNewP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addParts()}/>
              <button style={btn} onClick={addParts}>+ Ekle</button>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:14 }}>Katılımcı Listesi ({participants.length})</div>
            <input style={{...inp, marginBottom:14}} placeholder="🔍 Katılımcı ara..."
              value={searchP} onChange={e=>setSearchP(e.target.value)}/>
            <div style={{ maxHeight:420, overflowY:"auto" }}>
              {filtP.map(p => (
                <div key={p.id} style={row}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
                    <span style={{ fontWeight:600 }}>{p.name}</span>
                    {p.assignedPrize && <span style={badge("rgba(139,92,246,.8)")}>➜ {p.assignedPrize}</span>}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                    <select value={p.assignedPrize} onChange={e=>assign(p.id, e.target.value)}
                      style={{ background:T.inp, color:T.txt, border:`1px solid ${T.brd}`, borderRadius:6, padding:"5px 8px", fontSize:11, cursor:"pointer", fontFamily:"'Outfit',sans-serif", maxWidth:140 }}>
                      <option value="">Ödül ata...</option>
                      {prizes.filter(pr=>pr.special).map(pr => (
                        <option key={pr.id} value={pr.name}>{pr.name}</option>
                      ))}
                      {prizes.filter(pr=>!pr.special).length > 0 && (
                        <optgroup label="─ Normal ödüller ─">
                          {prizes.filter(pr=>!pr.special).map(pr => (
                            <option key={pr.id} value={pr.name}>{pr.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <button onClick={()=>rmPart(p.id)}
                      style={{ background:"rgba(239,68,68,.15)", color:T.danger, border:"none", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:12, fontWeight:700 }}>✕</button>
                  </div>
                </div>
              ))}
              {!filtP.length && <p style={{ fontSize:13, color:T.mut, textAlign:"center", padding:28 }}>
                {searchP ? "Aramayla eşleşen katılımcı bulunamadı." : "Henüz katılımcı eklenmedi."}
              </p>}
            </div>
          </div>
        </>)}

        {/* ═══ RESULTS TAB ═══ */}
        {tab === "results" && (<>
          <h1 style={{ fontSize:24, fontWeight:800, marginBottom:24, display:"flex", alignItems:"center", gap:12 }}>🏆 Çekilişi Sonuçları</h1>

          <div style={card}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ fontSize:16, fontWeight:700 }}>Sonuç Filtrele</span>
              <button style={btnD} onClick={()=>updateResults([])}>Temizle</button>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input style={{...inp, flex:1}} placeholder="🔍 Katılımcı ara..." value={srN} onChange={e=>setSrN(e.target.value)}/>
              <input style={{...inp, flex:1}} placeholder="🎁 Ödül ara..." value={srP} onChange={e=>setSrP(e.target.value)}/>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:14 }}>Geçmiş Sonuçlar ({filtR.length})</div>
            <div style={{ maxHeight:420, overflowY:"auto" }}>
              {filtR.map((r,i) => (
                <div key={r.id} style={{...row, background:i%2===0?"rgba(30,41,59,.5)":"rgba(30,41,59,.25)"}}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <span style={{ fontWeight:700 }}>{r.participantName}</span>
                    <span style={{ fontSize:11, color:T.mut, marginLeft:10 }}>
                      {new Date(r.spunAt).toLocaleString("tr-TR",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit"})}
                    </span>
                  </div>
                  <span style={badge(r.special ? "#8b5cf6" : T.accent)}>{r.prizeName}{r.special ? " ⭐" : ""}</span>
                </div>
              ))}
              {!filtR.length && <p style={{ fontSize:13, color:T.mut, textAlign:"center", padding:28 }}>
                {!results.length ? "Henüz çekiliş yapılmadı." : "Filtreyle eşleşen sonuç bulunamadı."}
              </p>}
            </div>
          </div>

          {results.length > 0 && (
            <div style={{...card, background:"linear-gradient(135deg,rgba(59,130,246,.08),rgba(15,23,42,.95))", border:`1px solid rgba(59,130,246,.25)`}}>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:14 }}>📊 İstatistikler</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
                {[
                  ["Toplam Çekiliş", results.length],
                  ["Farklı Kazanan", new Set(results.map(r=>r.participantName)).size],
                  ["Kalan Katılımcı", participants.length],
                ].map(([l,v]) => (
                  <div key={l} style={{ padding:"14px", background:"rgba(30,41,59,.6)", borderRadius:10 }}>
                    <div style={{ fontSize:11, color:T.mut, marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:22, fontWeight:800, color:T.aL }}>{v}</div>
                  </div>
                ))}
              </div>
              {/* Prize distribution */}
              <div style={{ marginTop:16, padding:"14px", background:"rgba(30,41,59,.4)", borderRadius:10 }}>
                <div style={{ fontSize:12, color:T.mut, marginBottom:10, fontWeight:600 }}>Ödül Dağılımı</div>
                {Object.entries(results.reduce((a,r) => { a[r.prizeName]=(a[r.prizeName]||0)+1; return a; }, {}))
                  .sort((a,b)=>b[1]-a[1]).map(([name,count]) => (
                  <div key={name} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                    <div style={{ flex:1, height:6, borderRadius:3, background:"rgba(255,255,255,.06)", overflow:"hidden" }}>
                      <div style={{ width:`${(count/results.length)*100}%`, height:"100%", borderRadius:3, background:T.accent }}/>
                    </div>
                    <span style={{ fontSize:12, color:T.txt, fontWeight:600, minWidth:100 }}>{name}</span>
                    <span style={{ fontSize:12, color:T.aL, fontWeight:700, minWidth:20, textAlign:"right" }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   APP — Router + Shared Storage
   ═══════════════════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState(() => {
    try { return window.location.hash === "#panel" ? "panel" : "wheel"; } catch { return "wheel"; }
  });

  const [prizes, updatePrizes, prizesLoaded] = useStorage(KEYS.prizes, []);
  const [participants, updateParticipants] = useStorage(KEYS.participants, []);
  const [results, updateResults] = useStorage(KEYS.results, []);

  const navigate = useCallback((p) => {
    setPage(p);
    try { window.location.hash = p === "panel" ? "#panel" : "#wheel"; } catch {}
  }, []);

  if (!prizesLoaded) {
    return (
      <div style={{
        minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        background:"#050510", fontFamily:"'Outfit',sans-serif", color:T.aL,
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700&display=swap');
          @keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:48, animation:"spin 2s linear infinite", marginBottom:16 }}>🎡</div>
          <div style={{ fontSize:18, fontWeight:700 }}>Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (page === "panel") {
    return <PanelPage
      prizes={prizes} updatePrizes={updatePrizes}
      participants={participants} updateParticipants={updateParticipants}
      results={results} updateResults={updateResults}
      goWheel={() => navigate("wheel")}
    />;
  }

  return <WheelPage
    prizes={prizes}
    participants={participants} updateParticipants={updateParticipants}
    results={results} updateResults={updateResults}
    goPanel={() => navigate("panel")}
  />;
}
