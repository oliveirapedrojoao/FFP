/* Redes do folclore organizado — código das páginas Rede completa, Órgãos sociais e Congressos. Usa d3 v7 (assets/d3.min.js) e window.REDE (dados/rede.js). */
(function () {
  var D = window.REDE;
  if (!D) { var g = document.getElementById("graph"); if (g) g.textContent = "Não foi possível carregar os dados (dados/rede.js)."; return; }
  try { boot(D); } catch (e) { console.error(e); }
})();

function boot(D) {
  const tip = document.getElementById("tip");
  function showTip(evt, html) {
    tip.replaceChildren();
    html.forEach(([tag, text]) => { const e = document.createElement(tag); e.textContent = text; tip.appendChild(e); });
    const pad = 12, w = tip.offsetWidth, h = tip.offsetHeight;
    const fs = document.fullscreenElement;
    const sx = fs ? 0 : window.scrollX, sy = fs ? 0 : window.scrollY;
    const cx = evt.clientX != null ? evt.clientX : evt.pageX - window.scrollX, cy = evt.clientY != null ? evt.clientY : evt.pageY - window.scrollY;
    let x = cx + sx + pad, y = cy + sy + pad;
    if (x + w > sx + window.innerWidth - 8) x = cx + sx - w - pad;
    if (y + h > sy + window.innerHeight - 8) y = cy + sy - h - pad;
    tip.style.position = fs ? "fixed" : "absolute";
    tip.style.left = (fs ? x - sx : x) + "px"; tip.style.top = (fs ? y - sy : y) + "px"; tip.style.opacity = 1;
  }
  function hideTip() { tip.style.opacity = 0; }
  function el(tag, attrs, text) {
    const e = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) { if (k === "class") e.className = v; else e.setAttribute(k, v); }
    if (text != null) e.textContent = text;
    return e;
  }
  const hashFrac = s => { let h = 7; for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) % 100003; return h / 100003; };
  window.__viz = { showTip, hideTip, el };
  window.__viz.select = function (id) { try { sessionStorage.setItem("selNode", id); } catch (e) {} location.href = "rede.html"; };
  window.__U = { tip, showTip, hideTip, el, hashFrac };
  if (document.getElementById("graphPanel")) initGraph(D);
  if (document.getElementById("presStrip")) initFFP(D);
  if (document.getElementById("honor") || document.getElementById("ffp1987")) initCongressos(D);
}

function initGraph(D) {
  const { tip, showTip, hideTip, el, hashFrac } = window.__U;
  // ================================================================ dados
  const LAYERS = [
    { id: "doc", label: "Documentos anexados", on: true },
    { id: "lista", label: "Listas fornecidas", on: true },
    { id: "proj", label: "Outras imagens do projeto", on: true },
    { id: "web", label: "Site da FFP", on: true },
    { id: "sec", label: "Fontes secundárias", on: true },
    { id: "analise", label: "Leitura analítica (equivalências)", on: false },
  ];
  const LAYER_NAME = Object.fromEntries(LAYERS.map(l => [l.id, l.label]));
  const ORDER = { doc: 0, lista: 1, proj: 2, web: 3, sec: 4, analise: 5 };
  const TYPES = [
    { id: "mand", label: "Mandatos da FFP" }, { id: "inst", label: "Instituições" },
    { id: "agr", label: "Agrupamentos (1987)" }, { id: "cargo", label: "Cargos de honra" },
    { id: "org", label: "Organizadores e oradores", grp: "p" }, { id: "dir", label: "Dirigentes da FFP", grp: "p" },
    { id: "part", label: "Participantes de 1987", grp: "p" },
  ];
  const EV = ["C1956", "C1963", "C1977", "C1978", "C1987"];
  const CONG = Object.fromEntries(D.congressos.map(c => [c.id, c]));
  const MAND = Object.fromEntries(D.mandatos.map(m => [m.id, m]));
  const CSHORT = { C1956: ["Braga", "1956"], C1963: ["Santo Tirso", "1963"], C1977: ["Vila do Conde", "1977"], C1978: ["I Congr. FFP, Vila do Conde", "1978"], C1987: ["II Congr. FFP, Coimbra", "1987"] };
  const SHORT = {
    "I:CM Braga": "Câmara de Braga", "I:ISEU/ISCSPU": "ISEU / ISCSPU", "I:U Santiago": "Univ. Santiago",
    "I:U Porto": "Univ. do Porto", "I:U Madrid": "Univ. Madrid", "I:BPAD Braga": "Bibl. e Arq. Distrital de Braga",
    "I:Grémio Comércio Braga": "Grémio do Comércio de Braga", "I:MEH Porto": "Museu de Etnografia e História",
    "I:CEH Porto": "Centro de Est. Humanísticos", "I:CIHM Paris": "Com. Int. Hist. Marítima",
    "I:CM Santo Tirso": "Câmara de Santo Tirso", "I:FFP": "Federação do Folclore Português",
    "I:CM Coimbra": "Câmara de Coimbra", "I:IPPC": "IPPC", "I:Comp. de Jesus": "Companhia de Jesus",
    "I:OSB Singeverga": "Ordem de S. Bento", "P:AM Santos da Cunha": "A. M. Santos da Cunha",
    "P:Frei José Matoso": "Frei José Matoso", "P:Correia de Miranda": "Correia de Miranda",
  };
  const isEvent = id => !!CONG[id] || !!MAND[id];
  const nodesById = Object.fromEntries(D.nodes.map(n => [n.id, Object.assign({}, n)]));
  Object.values(nodesById).forEach(n => {
    if (n.tipo === "congresso") n.short = CSHORT[n.id].join(" ");
    else if (n.tipo === "mandato") { const m = MAND[n.id]; n.short = m.a0 === 1977 ? "Com. Instaladora 1977" : `Mandato ${m.a0}–${String(m.a1).slice(2)}`; }
    else if (SHORT[n.id]) n.short = SHORT[n.id];
    else if (n.id.startsWith("P:")) n.short = n.id.slice(2);
    else if (n.tipo === "pessoa") { const t = n.label.replace(/^Dr\. /, "").split(" "); n.short = t.length > 3 ? t[0] + " " + t.slice(-2).join(" ") : n.label; }
    else n.short = n.label.length > 42 ? n.label.slice(0, 40) + "…" : n.label;
    n.pureP = n.tipo === "pessoa" && n.part && !n.org && !n.dir;
  });
  const pairMap = new Map();
  D.edges.forEach(e => {
    const k = e.source < e.target ? e.source + "|" + e.target : e.target + "|" + e.source;
    if (!pairMap.has(k)) pairMap.set(k, { key: k, source: e.source, target: e.target, roles: [] });
    pairMap.get(k).roles.push(e);
  });
  const allPairs = [...pairMap.values()];
  allPairs.forEach(p => {
    const rels = new Set(p.roles.map(r => r.rel));
    const onlyPart = p.roles.every(r => r.papel.startsWith("Participante"));
    p.kind = rels.has("pessoa–filiação") ? "fil" : (onlyPart ? "part" : rels.has("cargo–congresso") ? "cargo" : rels.has("pessoa–mandato") || rels.has("mandato–instituição") ? "mand" : rels.has("equivalência estrutural") ? "eq" : "other");
  });

  // ================================================================ estado
  const layers = new Set(LAYERS.filter(l => l.on).map(l => l.id));
  const types = Object.fromEntries(TYPES.map(t => [t.id, true]));
  const yr = [1956, 2025];
  let ego = null, pathIds = [], pathKeys = new Set(), selected = "P:Gomes dos Santos", hovered = null, sizeBy = "tipo", k = 1;
  let visNodes = [], visEdges = [], adj = {}, bet = {}, deg = {};

  const yearOK = r => (r.ano_fim || r.ano || 0) >= yr[0] && (r.ano || 0) <= yr[1];
  const roleOn = r => layers.has(r.camada) && yearOK(r);
  function typeOn(n) {
    switch (n.tipo) {
      case "congresso": return true;
      case "mandato": return types.mand;
      case "instituição": return types.inst;
      case "agrupamento": return types.agr;
      case "cargo": return types.cargo;
      case "pessoa": return (n.org && types.org) || (n.dir && types.dir) || (n.part && types.part);
    }
    return true;
  }

  // ================================================================ controlos
  const $ = id => document.getElementById(id);
  const lf = $("layers");
  LAYERS.forEach(l => {
    const id = "lay-" + l.id, lab = el("label", { for: id }), inp = el("input", { type: "checkbox", id });
    inp.checked = l.on;
    inp.addEventListener("change", () => { inp.checked ? layers.add(l.id) : layers.delete(l.id); update(); });
    lab.appendChild(inp); lab.appendChild(document.createTextNode(l.label)); lf.appendChild(lab);
  });
  const tf = $("types");
  TYPES.forEach(t => {
    if (t.grp === "p" && !tf.querySelector(".psep")) tf.appendChild(el("span", { class: "psep" }, "Pessoas:"));
    const id = "typ-" + t.id, lab = el("label", { for: id }), inp = el("input", { type: "checkbox", id });
    inp.checked = true;
    inp.addEventListener("change", () => { types[t.id] = inp.checked; update(); });
    lab.appendChild(inp); lab.appendChild(document.createTextNode(t.label)); tf.appendChild(lab);
  });
  const y0 = $("y0"), y1 = $("y1"), y0v = $("y0v"), y1v = $("y1v");
  function setYears(a, b, silent) {
    yr[0] = Math.min(a, b); yr[1] = Math.max(a, b);
    y0.value = yr[0]; y1.value = yr[1]; y0v.textContent = yr[0]; y1v.textContent = yr[1];
    if (!silent) update();
  }
  y0.addEventListener("input", () => { stopPlay(); setYears(+y0.value, Math.max(+y0.value, +y1.value)); });
  y1.addEventListener("input", () => { stopPlay(); setYears(Math.min(+y0.value, +y1.value), +y1.value); });
  let playTimer = null;
  const playBtn = $("play");
  function stopPlay() { if (playTimer) { clearInterval(playTimer); playTimer = null; playBtn.textContent = "▶ Reproduzir no tempo"; } }
  playBtn.addEventListener("click", () => {
    if (playTimer) { stopPlay(); return; }
    const start = yr[0];
    let cur = yr[1] >= 2025 || yr[1] <= start ? start : yr[1];
    playBtn.textContent = "❚❚ Pausa";
    setYears(start, cur);
    playTimer = setInterval(() => {
      cur += 1;
      if (cur > 2025) { stopPlay(); return; }
      setYears(start, cur);
    }, 260);
  });
  $("resetYears").addEventListener("click", () => { stopPlay(); setYears(1956, 2025); });
  $("sizeBy").addEventListener("change", e => { sizeBy = e.target.value; applySizes(); });
  const allLabels = $("allLabels");
  allLabels.addEventListener("change", () => renderLabels(true));

  // pesquisa e caminho
  const dl = $("nomes");
  const byLabel = new Map();
  Object.values(nodesById).sort((a, b) => a.label.localeCompare(b.label, "pt")).forEach(n => {
    if (byLabel.has(n.label)) return;
    byLabel.set(n.label, n.id);
    const o = el("option"); o.value = n.label; dl.appendChild(o);
  });
  const findId = v => byLabel.get(v) || (() => {
    const q = v.trim().toLowerCase(); if (!q) return null;
    const hit = [...byLabel.keys()].find(l => l.toLowerCase().includes(q));
    return hit ? byLabel.get(hit) : null;
  })();
  const search = $("search");
  search.addEventListener("change", () => { const id = findId(search.value); if (id) { revealAndSelect(id); } });
  search.addEventListener("keydown", e => { if (e.key === "Enter") { const id = findId(search.value); if (id) revealAndSelect(id); } });
  $("pathBtn").addEventListener("click", () => {
    const a = findId($("pathA").value), b = findId($("pathB").value);
    if (!a || !b) { setPathMsg("Escolha dois nomes da lista."); return; }
    findPath(a, b);
  });
  $("pathClear").addEventListener("click", () => { pathIds = []; pathKeys = new Set(); setPathMsg(""); highlight(); renderLabels(true); renderDetail(); });
  function setPathMsg(t) { $("pathMsg").textContent = t; }

  // ================================================================ geometria e SVG
  const panel = $("graphPanel"), wrap = $("graphWrap"), host = $("graph");
  const W = () => wrap.clientWidth || 900;
  const H = () => wrap.clientHeight || 760;
  const narrow = () => W() < 600;
  let sideW = 0;
  function measureSide() {
    const d = document.getElementById("detail");
    sideW = d && !d.classList.contains("closed") && window.getComputedStyle(d).position === "absolute" ? d.offsetWidth + 24 : 0;
  }
  function timeX(y) {
    const w = Math.max(360, W() - sideW), m = Math.max(28, w * 0.04);
    return d3.scaleLinear().domain([1953, 1966, 1976, 1979, 2027]).range([m, w * 0.22, w * 0.29, w * 0.39, w - m]).clamp(true)(y);
  }
  const evX = id => CONG[id] ? timeX(CONG[id].ano) : timeX(MAND[id].a0 + (MAND[id].a0 === 1977 ? 0.5 : 1.5));
  const CY = () => H() * 0.44, MY = () => H() - 70;
  const evY = id => CONG[id] ? CY() : MY();

  const svg = d3.select(host).append("svg").attr("role", "img").attr("aria-label", "Grafo da rede: congressos, mandatos, pessoas, instituições, agrupamentos e cargos, de 1956 a 2025");
  const gz = svg.append("g");
  const gAxis = gz.append("g"), gEdges = gz.append("g"), gNodes = gz.append("g"), gLabels = gz.append("g");
  const zoom = d3.zoom().scaleExtent([0.35, 10]).on("zoom", e => {
    gz.attr("transform", e.transform);
    const prev = k; k = e.transform.k;
    scaleMarks();
    if (labelTier(prev) !== labelTier(k)) renderLabels(true); else sizeLabels();
  });
  svg.call(zoom).on("dblclick.zoom", null);
  const labelTier = kk => kk >= 2.6 ? 2 : kk >= 1.6 ? 1 : 0;

  const sim = d3.forceSimulation().alphaDecay(0.03).velocityDecay(0.35)
    .force("link", d3.forceLink().id(d => d.id)
      .distance(d => ({ fil: 16, part: 140, cargo: 70, mand: 52, eq: 200 }[d.kind] || 40))
      .strength(d => ({ fil: 0.7, part: 0.02, cargo: 0.12, mand: 0.25, eq: 0.01 }[d.kind] || 0.35)))
    .force("charge", d3.forceManyBody().strength(d => d.pureP || d.tipo === "agrupamento" ? -18 : d.tipo === "cargo" ? -20 : -110).distanceMax(300))
    .force("collide", d3.forceCollide(d => d.tipo === "congresso" ? 16 : d.pureP ? 5.5 : d.tipo === "agrupamento" ? 7 : d.strong ? 16 : 9))
    .force("x", d3.forceX(d => d.tx).strength(d => d.xs))
    .force("y", d3.forceY(d => d.ty).strength(d => d.ys));

  // ================================================================ visibilidade
  function computeVisible() {
    measureSide();
    let pairs = allPairs.filter(p => {
      const a = nodesById[p.source], b = nodesById[p.target];
      return typeOn(a) && typeOn(b) && p.roles.some(roleOn);
    });
    let ids = new Set(EV);
    pairs.forEach(p => { ids.add(p.source); ids.add(p.target); });
    adj = {}; ids.forEach(i => adj[i] = new Set());
    pairs.forEach(p => { adj[p.source].add(p.target); adj[p.target].add(p.source); });
    if (ego && adj[ego.id]) {
      const keep = new Set([ego.id]); let frontier = [ego.id];
      for (let s = 0; s < ego.r; s++) {
        const nx = [];
        frontier.forEach(i => adj[i].forEach(j => { if (!keep.has(j)) { keep.add(j); nx.push(j); } }));
        frontier = nx;
      }
      pairs = pairs.filter(p => keep.has(p.source) && keep.has(p.target));
      ids = new Set(EV); pairs.forEach(p => { ids.add(p.source); ids.add(p.target); });
      adj = {}; ids.forEach(i => adj[i] = new Set());
      pairs.forEach(p => { adj[p.source].add(p.target); adj[p.target].add(p.source); });
    }
    const old = Object.fromEntries(visNodes.map(n => [n.id, n]));
    visNodes = [...ids].map(i => {
      const n = old[i] || nodesById[i];
      const reach = new Set();
      if (!isEvent(i)) adj[i].forEach(j => { if (isEvent(j)) reach.add(j); else adj[j].forEach(q => { if (isEvent(q)) reach.add(q); }); });
      const r = [...reach];
      const hasM = r.some(j => MAND[j]), hasC = r.some(j => CONG[j]);
      const directCong = [...adj[i]].filter(j => CONG[j]).length;
      n.mand = [...adj[i]].filter(j => MAND[j]).length;
      n.bridge = !isEvent(i) && directCong > 1;
      n.strong = (n.tipo === "pessoa" && (n.bridge || n.mand >= 10)) || (n.tipo === "instituição" && directCong > 1);
      const hf = hashFrac(i);
      n.tx = r.length ? d3.mean(r, evX) : W() / 2;
      n.xs = n.pureP || n.tipo === "agrupamento" ? 0.05 : n.tipo === "cargo" ? 0.25 : 0.3;
      n.ys = n.tipo === "cargo" ? 0.2 : 0.09;
      const only87 = r.length > 0 && r.every(j => j === "C1987");
      if (!r.length) n.ty = CY();
      else if (n.tipo === "cargo") n.ty = CY() - 80 - hf * (CY() - 190);
      else if (only87 && (n.pureP || n.tipo === "agrupamento" || n.tipo === "instituição")) { n.ty = CY() - 75 - hf * (CY() - 180); n.ys = 0.2; }
      else if (hasM && !hasC) n.ty = MY() - 95 - hf * (MY() - CY() - 150);
      else if (hasM && hasC) n.ty = CY() + (MY() - CY()) * (0.22 + 0.42 * hf);
      else n.ty = CY() + (hf - 0.5) * 170;
      if (isEvent(i)) { n.fx = evX(i); n.fy = evY(i); n.x = n.fx; n.y = n.fy; }
      else if (n.x == null) { n.x = n.tx + (hf - .5) * 80; n.y = n.ty + (hashFrac(i + "y") - .5) * 60; }
      return n;
    });
    visEdges = pairs.map(p => ({ key: p.key, source: p.source, target: p.target, roles: p.roles, kind: p.kind,
      layer: p.roles.filter(roleOn).map(r => r.camada).sort((a, b) => ORDER[a] - ORDER[b])[0] }));
    computeMetrics();
  }

  // ================================================================ métricas (com os filtros atuais)
  function computeMetrics() {
    const ids = visNodes.map(n => n.id);
    const idx = new Map(ids.map((id, i) => [id, i]));
    const nb = ids.map(id => [...adj[id]].map(j => idx.get(j)));
    deg = {}; ids.forEach((id, i) => deg[id] = nb[i].length);
    // intermediação (Brandes), normalizada como no networkx
    const n = ids.length, B = new Float64Array(n);
    for (let s = 0; s < n; s++) {
      const S = [], P = Array.from({ length: n }, () => []), sigma = new Float64Array(n), d = new Int32Array(n).fill(-1);
      sigma[s] = 1; d[s] = 0; const Q = [s]; let qh = 0;
      while (qh < Q.length) { const v = Q[qh++]; S.push(v); for (const w of nb[v]) { if (d[w] < 0) { d[w] = d[v] + 1; Q.push(w); } if (d[w] === d[v] + 1) { sigma[w] += sigma[v]; P[w].push(v); } } }
      const delta = new Float64Array(n);
      while (S.length) { const w = S.pop(); for (const v of P[w]) delta[v] += sigma[v] / sigma[w] * (1 + delta[w]); if (w !== s) B[w] += delta[w]; }
    }
    const scale = n > 2 ? 1 / ((n - 1) * (n - 2)) : 1;
    bet = {}; ids.forEach((id, i) => bet[id] = B[i] * scale);
    // componentes
    const comp = new Int32Array(n).fill(-1); let nc = 0;
    const skip = i => nb[i].length === 0 && CONG[ids[i]] && (CONG[ids[i]].ano < yr[0] || CONG[ids[i]].ano > yr[1]);
    for (let i = 0; i < n; i++) { if (comp[i] >= 0 || skip(i)) continue; const st = [i]; comp[i] = nc; while (st.length) { const v = st.pop(); for (const w of nb[v]) if (comp[w] < 0) { comp[w] = nc; st.push(w); } } nc++; }
    metrics.components = nc;
    metrics.counts = {
      pessoas: visNodes.filter(x => x.tipo === "pessoa").length, inst: visNodes.filter(x => x.tipo === "instituição").length,
      agr: visNodes.filter(x => x.tipo === "agrupamento").length, cargos: visNodes.filter(x => x.tipo === "cargo").length,
      mand: visNodes.filter(x => x.tipo === "mandato").length, edges: visEdges.length,
    };
    // conectividade local (caminhos independentes) por fluxo máximo com nós desdobrados
    metrics.conect = {};
    EV.forEach((a, ia) => EV.forEach((b, ib) => { if (ib > ia) metrics.conect[a + "-" + b] = comp[idx.get(a)] === comp[idx.get(b)] ? nodeConn(nb, idx.get(a), idx.get(b)) : 0; }));
  }
  const metrics = {};
  function nodeConn(nb, s, t) {
    const n = nb.length, N = 2 * n, head = new Int32Array(N).fill(-1), to = [], cap = [], nxt = [];
    const add = (u, v, c) => { to.push(v); cap.push(c); nxt.push(head[u]); head[u] = to.length - 1; to.push(u); cap.push(0); nxt.push(head[v]); head[v] = to.length - 1; };
    for (let v = 0; v < n; v++) add(2 * v, 2 * v + 1, v === s || v === t ? 1e9 : 1);
    for (let u = 0; u < n; u++) for (const v of nb[u]) add(2 * u + 1, 2 * v, 1);
    const src = 2 * s + 1, snk = 2 * t; let flow = 0;
    while (true) {
      const prevE = new Int32Array(N).fill(-1), seen = new Uint8Array(N); seen[src] = 1; const Q = [src]; let qh = 0;
      while (qh < Q.length && !seen[snk]) { const u = Q[qh++]; for (let e = head[u]; e >= 0; e = nxt[e]) if (cap[e] > 0 && !seen[to[e]]) { seen[to[e]] = 1; prevE[to[e]] = e; Q.push(to[e]); } }
      if (!seen[snk]) break;
      for (let v = snk; v !== src; v = to[prevE[v] ^ 1]) { cap[prevE[v]] -= 1; cap[prevE[v] ^ 1] += 1; }
      flow++; if (flow > 60) break;
    }
    return flow;
  }

  // ================================================================ desenho
  let edgeSel, nodeSel;
  const tipoLabel = d => ({ congresso: "Congresso", pessoa: d.pureP ? "Participante de 1987" : "Pessoa", "instituição": "Instituição", mandato: "Mandato da FFP", agrupamento: "Agrupamento folclórico", cargo: "Cargo de comissão de honra" }[d.tipo] || d.tipo);
  function tipText(d) {
    const extra = d.tipo === "pessoa" && d.mand ? ` · ${d.mand} mandato${d.mand === 1 ? "" : "s"}` : "";
    return [["strong", d.label], ["span", tipoLabel(d) + " · " + (deg[d.id] || 0) + " ligação" + (deg[d.id] === 1 ? "" : "es") + extra]];
  }
  function baseR(d) { return d.tipo === "congresso" ? 11 : d.tipo === "mandato" ? 7 : d.pureP ? 3.6 : d.tipo === "agrupamento" ? 5.5 : d.tipo === "cargo" ? 4.5 : 5.5; }
  function sizeFactor(d) {
    if (isEvent(d.id)) return 1;
    if (sizeBy === "grau") return Math.max(0.6, (3 + 2.1 * Math.sqrt(deg[d.id] || 0)) / baseR(d));
    if (sizeBy === "bet") return Math.max(0.6, (3 + 60 * Math.sqrt(bet[d.id] || 0)) / baseR(d));
    return d.strong ? 1.35 : (d.tipo === "pessoa" && d.mand >= 5 ? 1.15 : 1);
  }
  function applySizes() {
    if (!nodeSel) return;
    nodeSel.select(".shape").attr("transform", d => (d.tipo === "instituição" ? "rotate(45) " : "") + `scale(${sizeFactor(d)})`);
  }
  function drawAxis() {
    const w = W(), h = H();
    gAxis.selectAll("*").remove();
    gAxis.append("line").attr("class", "axis").attr("x1", timeX(1956)).attr("x2", timeX(2025)).attr("y1", 52).attr("y2", 52);
    const TOP = { C1956: "Braga", C1963: narrow() ? "S. Tirso" : "Santo Tirso", C1977: "V. do Conde", C1978: "I Congr. FFP", C1987: "Coimbra" };
    EV.forEach(c => {
      const x = timeX(CONG[c].ano), out = CONG[c].ano > yr[1] || CONG[c].ano < yr[0];
      const anchor = c === "C1977" ? "end" : c === "C1978" ? "start" : "middle", dx = c === "C1977" ? 4 : c === "C1978" ? -4 : 0;
      gAxis.append("line").attr("class", "axis").attr("x1", x).attr("x2", x).attr("y1", 52).attr("y2", MY() - 30).attr("stroke-dasharray", "2 5");
      if (narrow() && (c === "C1963" || c === "C1978")) return;
      gAxis.append("text").attr("class", "cyear").attr("opacity", out ? .35 : 1).attr("x", x + dx).attr("y", 22).attr("text-anchor", anchor).text(CONG[c].ano);
      if (!narrow()) gAxis.append("text").attr("class", "alb").attr("opacity", out ? .35 : 1).attr("x", x + dx).attr("y", 40).attr("text-anchor", anchor).text(TOP[c]);
    });
    gAxis.append("line").attr("class", "axis").attr("x1", timeX(1977)).attr("x2", timeX(2025)).attr("y1", MY() + 16).attr("y2", MY() + 16);
    D.mandatos.forEach((m, i) => {
      if (narrow() && i % 2 === 1) return;
      gAxis.append("text").attr("class", "myear").attr("x", evX(m.id)).attr("y", MY() + 32).attr("text-anchor", "middle").text(String(m.a0).slice(2));
    });
    if (!narrow()) gAxis.append("text").attr("class", "alb").attr("x", timeX(1977) - 8).attr("y", MY() + 4).attr("text-anchor", "end").text("Órgãos sociais da FFP");
    // indicação do período filtrado
    const a = Math.max(1956, yr[0]), b = Math.min(2025, yr[1]);
    if (a > 1956 || b < 2025) gAxis.append("rect").attr("class", "yrband").attr("x", timeX(a) - 6).attr("width", Math.max(4, timeX(b) - timeX(a) + 12)).attr("y", 46).attr("height", 12).attr("rx", 3);
  }
  function render(alpha) {
    const w = W(), h = H();
    svg.attr("viewBox", `0 0 ${w} ${h}`).attr("width", w).attr("height", h);
    drawAxis();
    edgeSel = gEdges.selectAll("line").data(visEdges, d => d.key).join("line")
      .attr("class", d => "e e-" + d.layer)
      .attr("stroke-width", d => d.layer === "sec" ? 2 : d.layer === "web" ? 0.8 : d.layer === "analise" ? 1.2 : d.kind === "fil" || d.kind === "part" ? 0.7 : 1.4)
      .attr("stroke-dasharray", d => d.layer === "proj" ? "6 4" : d.layer === "sec" ? "1.5 4" : d.layer === "analise" ? "8 3 2 3" : null);
    nodeSel = gNodes.selectAll("g.node").data(visNodes, d => d.id).join(enter => {
      const g = enter.append("g").attr("class", "node").attr("tabindex", 0).attr("role", "button");
      g.each(function (d) {
        const s = d3.select(this), r = baseR(d);
        if (d.tipo === "congresso") s.append("rect").attr("class", "shape t-cong").attr("x", -r).attr("y", -r).attr("width", 2 * r).attr("height", 2 * r).attr("rx", 3);
        else if (d.tipo === "mandato") s.append("rect").attr("class", "shape t-mand").attr("x", -r).attr("y", -r).attr("width", 2 * r).attr("height", 2 * r).attr("rx", 2);
        else if (d.tipo === "pessoa") s.append("circle").attr("class", "shape t-pes" + (d.pureP ? " pure" : "")).attr("r", r);
        else if (d.tipo === "agrupamento") s.append("path").attr("class", "shape t-agr").attr("d", `M0,${-r * 1.15} L${r},${r * 0.75} L${-r},${r * 0.75} Z`);
        else if (d.tipo === "cargo") s.append("rect").attr("class", "shape t-cargo").attr("x", -r).attr("y", -r).attr("width", 2 * r).attr("height", 2 * r);
        else s.append("rect").attr("class", "shape t-inst").attr("x", -r).attr("y", -r).attr("width", 2 * r).attr("height", 2 * r);
        s.append("circle").attr("class", "hit").attr("r", Math.max(9, r + 4));
      });
      return g;
    });
    nodeSel.attr("aria-label", d => d.label)
      .on("click", (e, d) => { e.stopPropagation(); select(d.id); })
      .on("dblclick", (e, d) => { e.stopPropagation(); setEgo(d.id, 1); })
      .on("keydown", (e, d) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(d.id); } })
      .on("pointerenter", (e, d) => { hovered = d.id; highlight(); renderLabels(); showTip(e, tipText(d)); })
      .on("pointermove", (e, d) => showTip(e, tipText(d)))
      .on("pointerleave", () => { hovered = null; highlight(); renderLabels(); hideTip(); })
      .call(d3.drag()
        .on("start", (e, d) => { if (isEvent(d.id)) return; if (!e.active) sim.alphaTarget(0.15).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { if (isEvent(d.id)) return; d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (isEvent(d.id)) return; if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));
    nodeSel.attr("opacity", d => CONG[d.id] && (CONG[d.id].ano > yr[1] || CONG[d.id].ano < yr[0]) ? .25 : null);
    applySizes();
    sim.nodes(visNodes);
    sim.force("link").links(visEdges);
    sim.on("tick", ticked);
    sim.alpha(alpha == null ? 0.7 : alpha).restart();
    renderLabels(true); highlight();
  }
  function scaleMarks() {
    if (!nodeSel) return;
    const s = 1 / Math.sqrt(k);
    nodeSel.attr("transform", d => `translate(${d.x},${d.y}) scale(${s})`);
  }
  function ticked() {
    const w = W();
    const xr = Math.max(360, w - sideW) - 10;
    visNodes.forEach(d => { if (!isEvent(d.id)) { d.x = Math.max(10, Math.min(xr, d.x)); d.y = Math.max(62, Math.min(MY() - 24, d.y)); } });
    edgeSel.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    scaleMarks();
    placeLabels();
  }
  function placeLabels() {
    const w = W(), off = 9 / Math.sqrt(k);
    gLabels.selectAll("text").attr("text-anchor", d => d.x > w - 160 ? "end" : "start").attr("x", d => d.x > w - 160 ? d.x - off : d.x + off).attr("y", d => d.y + 4 / k);
  }
  function sizeLabels() { gLabels.selectAll("text").style("font-size", (11.5 / k) + "px").style("stroke-width", (3 / k) + "px"); placeLabels(); }
  function focusSet() {
    const f = hovered || selected, s = new Set(pathIds);
    if (f && adj[f]) { s.add(f); if (!isEvent(f)) adj[f].forEach(j => s.add(j)); }
    return s;
  }
  let labelRaf = null;
  function renderLabels(now) {
    if (!now) { if (labelRaf) return; labelRaf = requestAnimationFrame(() => { labelRaf = null; renderLabels(true); }); return; }
    const fs = focusSet(), tier = labelTier(k);
    const show = visNodes.filter(d => !isEvent(d.id) && (allLabels.checked || d.strong || fs.has(d.id) || tier === 2 || (tier === 1 && !d.pureP)));
    gLabels.selectAll("text").data(show, d => d.id).join("text")
      .attr("class", d => "lbl" + (d.strong ? " strong" : "") + (d.pureP || d.tipo === "agrupamento" ? " minor" : ""))
      .text(d => d.short);
    sizeLabels();
  }
  function highlight() {
    if (!edgeSel) return;
    const f = hovered || selected;
    const onPath = e => pathKeys.has(e.key);
    if (pathIds.length) {
      const ps = new Set(pathIds);
      edgeSel.classed("hl", onPath).classed("dim", e => !onPath(e));
      nodeSel.classed("dim", d => !ps.has(d.id)).classed("sel", d => d.id === selected || ps.has(d.id));
      return;
    }
    if (!f || !adj[f]) { edgeSel.classed("hl", false).classed("dim", false); nodeSel.classed("dim", false).classed("sel", false); return; }
    const nb = new Set([f, ...adj[f]]);
    const on = e => (e.source.id || e.source) === f || (e.target.id || e.target) === f;
    edgeSel.classed("hl", on).classed("dim", e => !on(e));
    nodeSel.classed("dim", d => !nb.has(d.id)).classed("sel", d => d.id === selected);
  }
  svg.on("click", () => { if (pathIds.length) return; selected = null; renderDetail(); highlight(); renderLabels(true); });

  // ================================================================ zoom: ajustar e centrar
  function fit(ms) {
    const w = W(), h = H();
    const xs = visNodes.map(n => n.x), ys = visNodes.map(n => n.y);
    const x0 = Math.min(timeX(1956) - 30, d3.min(xs) - 20), x1 = Math.max(timeX(2025) + 30, d3.max(xs) + 20);
    const yA = Math.min(0, d3.min(ys) - 20), yB = Math.max(MY() + 40, d3.max(ys) + 20);
    const side = !detail.classList.contains("closed") && window.getComputedStyle(detail).position === "absolute" ? detail.offsetWidth + 24 : 0;
    const ww = Math.max(320, w - side);
    const s = Math.min(ww / (x1 - x0), h / (yB - yA), 1);
    const t = d3.zoomIdentity.translate((ww - s * (x1 + x0)) / 2, (h - s * (yB + yA)) / 2).scale(s);
    svg.transition().duration(ms == null ? 450 : ms).call(zoom.transform, t);
  }
  function centerOn(id, kk) {
    const n = visNodes.find(x => x.id === id); if (!n) return;
    const s = Math.max(k, kk || 1.8), w = W(), h = H();
    svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity.translate(w / 2 - s * n.x, h / 2 - s * n.y).scale(s));
  }
  $("zin").addEventListener("click", () => svg.transition().duration(250).call(zoom.scaleBy, 1.5));
  $("zout").addEventListener("click", () => svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.5));
  $("zfit").addEventListener("click", () => fit());

  // ================================================================ seleção, vizinhança, caminho
  const detail = $("detail");
  function select(id) { selected = id; $("detail").classList.remove("closed"); renderDetail(); highlight(); renderLabels(true); }
  function revealAndSelect(id) {
    const n = nodesById[id];
    let changed = false;
    if (n && !typeOn(n)) {
      if (n.tipo === "pessoa") { ["org", "dir", "part"].forEach(t => { if (n[t]) { types[t] = true; $("typ-" + t).checked = true; } }); }
      else { const map = { mandato: "mand", "instituição": "inst", agrupamento: "agr", cargo: "cargo" }; types[map[n.tipo]] = true; $("typ-" + map[n.tipo]).checked = true; }
      changed = true;
    }
    if (ego && !(adj[id])) { ego = null; changed = true; }
    if (changed || !visNodes.find(x => x.id === id)) { if (!visNodes.find(x => x.id === id)) { setYears(1956, 2025, true); } update(); }
    select(id);
    setTimeout(() => centerOn(id, 2), 60);
  }
  window.__viz.select = id => { revealAndSelect(id); panel.scrollIntoView({ behavior: "smooth", block: "start" }); };
  function setEgo(id, r) { ego = id ? { id, r } : null; selected = id || selected; update(); setTimeout(() => fit(), 350); }
  function findPath(a, b) {
    if (!adj[a] || !adj[b]) { setPathMsg("Um dos nós não está visível com os filtros atuais."); pathIds = []; pathKeys = new Set(); highlight(); return; }
    const prev = { [a]: null }, Q = [a]; let qh = 0;
    while (qh < Q.length && !(b in prev)) { const v = Q[qh++]; adj[v].forEach(w => { if (!(w in prev)) { prev[w] = v; Q.push(w); } }); }
    if (!(b in prev)) { pathIds = []; pathKeys = new Set(); setPathMsg("Não há caminho com os filtros atuais."); highlight(); renderDetail(); return; }
    const p = []; for (let v = b; v != null; v = prev[v]) p.unshift(v);
    pathIds = p; pathKeys = new Set();
    for (let i = 0; i < p.length - 1; i++) pathKeys.add(p[i] < p[i + 1] ? p[i] + "|" + p[i + 1] : p[i + 1] + "|" + p[i]);
    setPathMsg(`Caminho com ${p.length - 1} passo${p.length === 2 ? "" : "s"}.`);
    selected = null; renderDetail(); highlight(); renderLabels(true); setTimeout(() => fit(), 50);
  }
  function roleSummary(key) {
    const p = pairMap.get(key); if (!p) return "";
    const rs = p.roles.filter(roleOn);
    return rs.map(r => (r.ano ? r.ano + " · " : "") + r.papel).slice(0, 3).join("; ") + (rs.length > 3 ? `; +${rs.length - 3}` : "");
  }
  function renderDetail() {
    detail.replaceChildren();
    const close = el("button", { class: "dclose", type: "button", "aria-label": "Fechar painel" }, "×");
    close.addEventListener("click", () => detail.classList.add("closed"));
    detail.appendChild(close);
    if (pathIds.length) {
      detail.appendChild(el("span", { class: "type" }, "Caminho"));
      detail.appendChild(el("h3", null, `${nodesById[pathIds[0]].label} → ${nodesById[pathIds[pathIds.length - 1]].label}`));
      const ol = el("ol", { class: "path" });
      pathIds.forEach((id, i) => {
        const li = el("li");
        const b = el("button", { class: "linkbtn", type: "button" }, nodesById[id].label);
        b.addEventListener("click", () => { pathIds = []; pathKeys = new Set(); setPathMsg(""); select(id); });
        li.appendChild(b);
        li.appendChild(el("span", { class: "small" }, " · " + tipoLabel(nodesById[id])));
        if (i < pathIds.length - 1) {
          const key = id < pathIds[i + 1] ? id + "|" + pathIds[i + 1] : pathIds[i + 1] + "|" + id;
          li.appendChild(el("span", { class: "ref" }, "↓ " + roleSummary(key)));
        }
        ol.appendChild(li);
      });
      detail.appendChild(ol);
      return;
    }
    const n = nodesById[selected];
    if (!n) {
      detail.appendChild(el("span", { class: "type" }, "Como usar"));
      detail.appendChild(el("p", { class: "small" }, "Clique num nó para ver papéis e fontes. Duplo clique isola a vizinhança. Arraste o fundo para mover, use a roda do rato ou os botões para aproximar."));
      return;
    }
    detail.appendChild(el("span", { class: "type" }, tipoLabel(n)));
    detail.appendChild(el("h3", null, n.label));
    if (n.tipo === "congresso") { const c = CONG[n.id]; detail.appendChild(el("p", { class: "small" }, [c.lugar !== "—" ? c.lugar : null, c.data, "Promotor: " + c.promotor].filter(Boolean).join(" · "))); }
    if (n.tipo === "pessoa") {
      const tags = [n.org ? "organizador/orador" : null, n.dir ? "dirigente da FFP" : null, n.part ? "participante em 1987" : null].filter(Boolean);
      detail.appendChild(el("p", { class: "small" }, tags.join(" · ")));
    }
    if (adj[n.id]) {
      const ranked = Object.entries(bet).filter(([id]) => !isEvent(id)).sort((a, b) => b[1] - a[1]);
      const pos = ranked.findIndex(([id]) => id === n.id) + 1;
      detail.appendChild(el("p", { class: "small" }, `Com os filtros atuais: ${deg[n.id]} ligaç${deg[n.id] === 1 ? "ão" : "ões"} · intermediação ${(bet[n.id] || 0).toFixed(3)}` + (pos ? ` (${pos}.º de ${ranked.length})` : "")));
    }
    if (n.nota) detail.appendChild(el("p", { class: "note" }, n.nota));
    if (n.formas) detail.appendChild(el("p", { class: "small" }, "Formas do nome no site da FFP: " + n.formas));
    const acts = el("div", { class: "acts" });
    const mk = (t, f) => { const b = el("button", { class: "btn", type: "button" }, t); b.addEventListener("click", f); acts.appendChild(b); };
    if (adj[n.id]) mk("Centrar", () => centerOn(n.id, 2));
    if (ego && ego.id === n.id) mk("Mostrar toda a rede", () => setEgo(null));
    else { mk("Só vizinhança (1 passo)", () => setEgo(n.id, 1)); mk("2 passos", () => setEgo(n.id, 2)); }
    mk("Origem do caminho", () => { $("pathA").value = n.label; $("pathA").focus(); });
    mk("Destino do caminho", () => { $("pathB").value = n.label; if ($("pathA").value) $("pathBtn").click(); });
    detail.appendChild(acts);
    const rows = [], hidden = [];
    allPairs.forEach(p => {
      if (p.source !== n.id && p.target !== n.id) return;
      const other = nodesById[p.source === n.id ? p.target : p.source];
      p.roles.forEach(r => (roleOn(r) && typeOn(other) ? rows : hidden).push({ r, other }));
    });
    if (n.tipo === "mandato") {
      const ORG = ["Comissão Instaladora", "Comissão de Redação dos Estatutos", "Mesa da Assembleia Eleitoral (25 fev. 1978)", "Assembleia Geral", "Direção", "Conselho Fiscal"];
      const by = d3.group(rows.filter(x => x.other.tipo === "pessoa"), x => x.r.papel.split(" — ")[0]);
      [...by.keys()].sort((a, b) => ORG.indexOf(a) - ORG.indexOf(b)).forEach(org => {
        detail.appendChild(el("p", { class: "orgh" }, org));
        const ul = el("ul", { class: "compact" });
        by.get(org).forEach(({ r, other }) => {
          const li = el("li"), b = el("button", { class: "linkbtn", type: "button" }, other.label);
          b.addEventListener("click", () => select(other.id));
          li.appendChild(el("span", { class: "small" }, r.papel.split(" — ")[1] + ": ")); li.appendChild(b); ul.appendChild(li);
        });
        detail.appendChild(ul);
      });
      detail.appendChild(el("span", { class: "ref" }, MAND[n.id].url));
      return;
    }
    const big = rows.length > 40;
    rows.sort((a, b) => (a.r.ano || 0) - (b.r.ano || 0));
    const ul = el("ul");
    (big ? rows.slice(0, 40) : rows).forEach(({ r, other }) => {
      const li = el("li");
      li.appendChild(el("div", null, (r.ano ? r.ano + (r.ano_fim && r.ano_fim !== r.ano ? "–" + r.ano_fim : "") + " · " : "") + r.papel));
      const b = el("button", { class: "linkbtn small", type: "button" }, "↔ " + other.label);
      b.addEventListener("click", () => select(other.id));
      li.appendChild(b);
      li.appendChild(el("span", { class: "ref" }, LAYER_NAME[r.camada] + " · " + r.ref));
      ul.appendChild(li);
    });
    detail.appendChild(ul);
    if (big) detail.appendChild(el("p", { class: "small" }, `Mostradas 40 de ${rows.length} ligações; a tabela abaixo tem todas.`));
    if (hidden.length) detail.appendChild(el("p", { class: "small" }, hidden.length + " ligação(ões) escondidas pelos filtros."));
  }

  // ================================================================ quadros ligados aos filtros
  function renderStats() {
    const c = metrics.counts, box = $("stats"); box.replaceChildren();
    [["Pessoas", c.pessoas], ["Instituições", c.inst], ["Agrupamentos", c.agr], ["Cargos de honra", c.cargos], ["Mandatos", c.mand], ["Ligações", c.edges], ["Componentes ligadas", metrics.components]].forEach(([a, v]) => {
      const sp = el("span", null, a + ": "); sp.appendChild(el("b", null, String(v))); box.appendChild(sp);
    });
    const st = $("filterState"); st.textContent = (ego ? `Vizinhança de ${nodesById[ego.id].label} (${ego.r} passo${ego.r > 1 ? "s" : ""}) · ` : "") + `Período ${yr[0]}–${yr[1]}`;
  }
  const mlabel = i => CSHORT[i][0].replace(", Coimbra", "").replace(", Vila do Conde", "") + " " + CSHORT[i][1];
  function renderMatrix() {
    const t = $("matrix"); t.replaceChildren();
    const head = el("tr"); head.appendChild(el("th"));
    EV.forEach(i => head.appendChild(el("th", { scope: "col" }, mlabel(i))));
    const thead = el("thead"); thead.appendChild(head); t.appendChild(thead);
    const tb = el("tbody"), ramp = ["var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)", "var(--seq-5)", "var(--seq-6)", "var(--seq-7)"];
    EV.forEach((a, ia) => {
      const tr = el("tr"); tr.appendChild(el("th", { scope: "row", class: "rowh" }, mlabel(a)));
      EV.forEach((b, ib) => {
        if (ib <= ia) { tr.appendChild(el("td", null, ib === ia ? "·" : "")); return; }
        const v = metrics.conect[a + "-" + b] || 0, td = el("td", { class: "cell" }, String(v));
        if (v > 0) { td.style.background = ramp[Math.min(v, 7) - 1]; td.style.color = v >= 4 ? "#fff" : "var(--ink)"; } else { td.style.background = "var(--bg)"; td.style.color = "var(--muted)"; }
        td.setAttribute("aria-label", `${mlabel(a)} e ${mlabel(b)}: ${v} caminhos independentes`);
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
  }
  function renderTopBet() {
    const box = $("topBet"); box.replaceChildren();
    const ranked = Object.entries(bet).filter(([id]) => !isEvent(id)).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const max = ranked.length ? ranked[0][1] || 1 : 1;
    ranked.forEach(([id, v]) => {
      const row = el("div", { class: "tb-row" });
      const b = el("button", { class: "linkbtn", type: "button" }, nodesById[id].label);
      b.addEventListener("click", () => { select(id); centerOn(id, 2); });
      const bar = el("span", { class: "tb-bar" }); bar.style.width = (100 * v / max) + "%";
      const barw = el("span", { class: "tb-track" }); barw.appendChild(bar);
      row.appendChild(b); row.appendChild(barw); row.appendChild(el("span", { class: "tb-v" }, v.toFixed(3)));
      box.appendChild(row);
    });
  }
  let edgeTableTimer = null;
  function renderEdgeTable() {
    clearTimeout(edgeTableTimer);
    edgeTableTimer = setTimeout(() => {
      const t = $("edgeTable"); t.replaceChildren();
      const h = el("tr"); ["Ano", "De", "Para", "Papel / cargo", "Camada", "Referência"].forEach(x => h.appendChild(el("th", null, x)));
      const thead = el("thead"); thead.appendChild(h); t.appendChild(thead);
      const tb = el("tbody"), vis = new Set(visEdges.map(e => e.key));
      D.edges.filter(e => roleOn(e) && vis.has(e.source < e.target ? e.source + "|" + e.target : e.target + "|" + e.source))
        .sort((a, b) => (a.ano || 0) - (b.ano || 0)).forEach(e => {
          const tr = el("tr");
          [e.ano || "", nodesById[e.source].label, nodesById[e.target].label, e.papel, LAYER_NAME[e.camada], e.ref].forEach(x => tr.appendChild(el("td", null, String(x))));
          tb.appendChild(tr);
        });
      t.appendChild(tb);
      $("edgeCount").textContent = `(${tb.childElementCount} papéis com os filtros atuais)`;
    }, playTimer ? 600 : 50);
  }

  function update(alpha) {
    computeVisible();
    if (pathIds.length && !pathIds.every(id => adj[id])) { pathIds = []; pathKeys = new Set(); setPathMsg(""); }
    render(playTimer ? 0.25 : alpha);
    renderDetail(); renderStats(); renderMatrix(); renderTopBet(); renderEdgeTable();
  }

  // ================================================================ ecrã inteiro e redimensionamento
  const fsBtn = $("fsBtn");
  fsBtn.addEventListener("click", async () => {
    if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch (e) {} return; }
    if (panel.classList.contains("expanded")) { panel.classList.remove("expanded"); fsBtn.textContent = "⛶ Ecrã inteiro"; return; }
    try { if (!panel.requestFullscreen) throw new Error("x"); await panel.requestFullscreen(); }
    catch (e) { panel.classList.add("expanded"); fsBtn.textContent = "✕ Sair do ecrã inteiro"; }
  });
  document.addEventListener("fullscreenchange", () => { (document.fullscreenElement || document.body).appendChild(tip); fsBtn.textContent = document.fullscreenElement ? "✕ Sair do ecrã inteiro" : "⛶ Ecrã inteiro"; });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && panel.classList.contains("expanded")) { panel.classList.remove("expanded"); fsBtn.textContent = "⛶ Ecrã inteiro"; } });
  let lastSize = "";
  const ro = new ResizeObserver(() => {
    const s = W() + "x" + H(); if (s === lastSize) return; lastSize = s;
    computeVisible(); render(0.5); setTimeout(() => fit(300), 400);
  });

  // ================================================================ arranque: pré-aquecer a simulação e ajustar
  computeVisible();
  render(1);
  sim.stop();
  for (let i = 0; i < 260; i++) sim.tick();
  ticked();
  sim.alpha(0.05).restart();
  renderDetail(); renderStats(); renderMatrix(); renderTopBet(); renderEdgeTable();
  fit(0);
  lastSize = W() + "x" + H();
  ro.observe(wrap);


  // seleção vinda de outra página do site
  try { const s = sessionStorage.getItem("selNode"); if (s && nodesById[s]) { sessionStorage.removeItem("selNode"); setTimeout(() => revealAndSelect(s), 250); } } catch (e) {}

}

function initFFP(D) {
  const { showTip, hideTip, el } = window.__U;
  // ================================================================ secção: órgãos sociais da FFP
  // ---------------------------------------------------------------- órgãos sociais da FFP
  const F = D.ffp;
  (function presStrip() {
    const box = document.getElementById("presStrip");
    const P3 = [["Augusto Gomes dos Santos", 1977, 2004, "P:Gomes dos Santos"], ["Fernando Ferreira da Silva", 2005, 2016, "Q:Fernando Ferreira da Silva"], ["Daniel Calado Café", 2017, 2025, "F:Daniel Calado Café"]];
    const total = 2025 - 1977 + 1;
    P3.forEach(([nm, a, b, id]) => {
      const d = el("div"); d.style.flex = String((b - a + 1) / total);
      d.appendChild(el("span", { class: "yrs" }, a + "–" + b));
      const btn = el("button", { class: "linkbtn", type: "button" }, nm);
      btn.addEventListener("click", () => window.__viz.select(id));
      d.appendChild(btn);
      d.appendChild(el("span", { class: "small" }, "Presidente da " + (a === 1977 ? "Comissão Instaladora e da Direção" : "Direção")));
      box.appendChild(d);
    });
  })();

  function drawCont() {
    const data = F.continuidade;
    const host = document.getElementById("contChart"); host.replaceChildren();
    const w = host.clientWidth || 480, h = 230, m = { l: 34, r: 8, t: 26, b: 40 };
    const x = d3.scaleBand().domain(data.map(d => d.a0)).range([m.l, w - m.r]).padding(0.22);
    const y = d3.scaleLinear().domain([0, 100]).range([h - m.b, m.t]);
    const s = d3.select(host).append("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("height", h).attr("role", "img").attr("aria-label", "Percentagem de membros de cada mandato que já estavam no anterior");
    s.append("g").attr("class", "grid").selectAll("line").data([0, 25, 50, 75, 100]).join("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", d => y(d)).attr("y2", d => y(d));
    s.append("g").attr("class", "tick").selectAll("text").data([0, 25, 50, 75, 100]).join("text").attr("x", m.l - 6).attr("y", d => y(d) + 4).attr("text-anchor", "end").text(d => d + "%");
    const every = w < 420 ? 2 : 1;
    s.append("g").attr("class", "tick").selectAll("text").data(data.filter((d, i) => i % every === 0)).join("text").attr("x", d => x(d.a0) + x.bandwidth() / 2).attr("y", h - m.b + 15).attr("text-anchor", "middle").text(d => String(d.a0).slice(2));
    s.append("text").attr("class", "barlbl").attr("x", (m.l + w - m.r) / 2).attr("y", h - 4).attr("text-anchor", "middle").text("mandato (ano de início)");
    s.selectAll("path.b").data(data).join("path").attr("class", "b").attr("fill", "var(--pessoa)")
      .attr("d", d => { const x0 = x(d.a0), bw = x.bandwidth(), y0 = y(d.pct), y1 = y(0), r = Math.min(3, bw / 2); return `M${x0},${y1} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + bw - r} Q${x0 + bw},${y0} ${x0 + bw},${y0 + r} V${y1} Z`; });
    const changes = data.filter((d, i) => i > 0 && d.presidente !== data[i - 1].presidente);
    s.selectAll("text.chg").data(changes).join("text").attr("class", "barlbl").attr("x", d => x(d.a0) + x.bandwidth() / 2).attr("y", d => y(d.pct) - (w >= 420 ? 20 : 6)).attr("text-anchor", "middle").text("novo pres.");
    if (w >= 420) s.selectAll("text.v").data(data).join("text").attr("class", "val").attr("x", d => x(d.a0) + x.bandwidth() / 2).attr("y", d => y(d.pct) - 5).attr("text-anchor", "middle").style("font-size", "10.5px").text(d => d.pct);
    s.selectAll("rect.hit").data(data).join("rect").attr("x", d => x(d.a0) - 2).attr("width", x.bandwidth() + 4).attr("y", m.t).attr("height", h - m.b - m.t).attr("fill", "transparent")
      .on("pointermove", (e, d) => window.__viz.showTip(e, [["strong", d.pct + "% vinham do mandato anterior"], ["span", `Mandato ${d.a0}: ${d.do_anterior} de ${d.membros} membros. Presidente: ${d.presidente}`]]))
      .on("pointerleave", window.__viz.hideTip);
  }

  const ORGC = { "Direção": "var(--pessoa)", "Assembleia Geral": "var(--inst)", "Conselho Fiscal": "var(--novo)", "Comissão instaladora / mesa": "var(--muted)" };
  (function pmLegend() {
    const box = document.getElementById("pmLegend");
    Object.entries(ORGC).forEach(([k, c]) => { const s = el("span"); const i = el("i"); i.style.background = c; s.appendChild(i); s.appendChild(document.createTextNode(k)); box.appendChild(s); });
    const s = el("span"); const i = el("i", { class: "pres-mark" }); s.appendChild(i); s.appendChild(document.createTextNode("Presidente da Direção")); box.appendChild(s);
  })();
  function drawPresence() {
    const host = document.getElementById("presence"); host.replaceChildren();
    const M = D.mandatos;
    const t = el("table", { class: "pmatrix" });
    const hr = el("tr"); hr.appendChild(el("th", null, "Dirigente"));
    M.forEach(m => hr.appendChild(el("th", { class: "mh", scope: "col" }, m.a0 === 1977 ? "77" : String(m.a0).slice(2))));
    hr.appendChild(el("th", { class: "num" }, "N.º"));
    const th = el("thead"); th.appendChild(hr); t.appendChild(th);
    const tb = el("tbody");
    F.presenca.forEach(p => {
      const tr = el("tr");
      const nameCell = el("th", { scope: "row" });
      const b = el("button", { class: "linkbtn", type: "button" }, p.label);
      b.addEventListener("click", () => window.__viz.select(p.id));
      nameCell.appendChild(b); tr.appendChild(nameCell);
      M.forEach(m => {
        const c = p.cells[m.id];
        const td = el("td", { class: "c" });
        if (c) {
          const sq = el("span", { class: "sq" + (c.papeis.includes("Direção — Presidente") || c.papeis.includes("Comissão Instaladora — Presidente") ? " pres" : "") });
          sq.style.background = ORGC[c.orgao];
          td.appendChild(sq);
          td.setAttribute("tabindex", "0");
          td.setAttribute("aria-label", `${p.label}, ${m.label}: ${c.papeis.join("; ")}`);
          td.addEventListener("pointermove", e => window.__viz.showTip(e, [["strong", c.papeis.join("; ")], ["span", p.label + " · " + m.label]]));
          td.addEventListener("pointerleave", window.__viz.hideTip);
        }
        tr.appendChild(td);
      });
      tr.appendChild(el("td", { class: "num" }, String(p.n)));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    host.appendChild(t);
  }
  drawCont(); drawPresence();
  window.addEventListener("resize", () => { clearTimeout(window.__rwf); window.__rwf = setTimeout(drawCont, 150); });
}

function initCongressos(D) {
  const { showTip, hideTip, el } = window.__U;
  const nodesById = Object.fromEntries(D.nodes.map(n => [n.id, n]));
  const CONG = Object.fromEntries(D.congressos.map(c => [c.id, c]));
  window.__ctx = { D, CONG, nodesById, el, showTip, hideTip };
  sections87(D);
  window.addEventListener("resize", () => { clearTimeout(window.__rwc); window.__rwc = setTimeout(() => { if (window.__redraw87) window.__redraw87(); }, 150); });
}

function sections87(D) {
  const { CONG, nodesById, el, showTip, hideTip } = window.__ctx;
  const idOf = p => { const id = p.rede1 || ("Q:" + p.nome); const n = nodesById[id]; return n && (n.org || n.dir) ? id : ""; };
  (function honor() {
    const cats = ["Chefia do Estado", "Estado Novo: corporações, partido, Assembleia", "Governo: educação", "Informação, cultura popular e turismo", "Militar", "Igreja", "Administração territorial", "Município", "Justiça", "Universidade e academias"];
    const box = document.getElementById("honor");
    const head = el("div", { class: "hrow head" });
    head.appendChild(el("div", null, "Função"));
    head.appendChild(el("div", null, "Braga 1956 (21 cargos)"));
    head.appendChild(el("div", null, "II Congr. FFP (9 cargos)"));
    box.appendChild(head);
    cats.forEach(c => {
      const a = D.honra.filter(h => h.categoria === c && h.congresso === "C1956");
      const b = D.honra.filter(h => h.categoria === c && h.congresso === "C1987");
      const row = el("div", { class: "hrow" });
      const cat = el("div", { class: "cat" }, c);
      const st = el("span", { class: "status" });
      const sw = el("i");
      let lab;
      if (a.length && b.length) { sw.style.background = "var(--pessoa)"; lab = "mantém-se"; }
      else if (a.length) { sw.style.background = "var(--inst)"; lab = "só em 1956"; }
      else { sw.style.background = "var(--novo)"; lab = "nova em 1987"; }
      st.appendChild(sw); st.appendChild(document.createTextNode(lab)); cat.appendChild(st);
      row.appendChild(cat);
      [a, b].forEach(list => {
        const d = el("div", { class: "offices" });
        if (!list.length) d.appendChild(el("span", { class: "office empty" }, "—"));
        list.forEach(h => d.appendChild(el("span", { class: "office", title: h.nivel !== "—" ? "Comissão de Honra " + h.nivel : "" }, h.cargo)));
        row.appendChild(d);
      });
      box.appendChild(row);
    });
  })();

  // ---------------------------------------------------------------- 1987
  const P = D.participantes;
  const cnt = d3.rollup(P, v => v.length, d => d.agrup || "(sem indicação)");
  const tipoOf = Object.fromEntries(P.map(p => [p.agrup || "(sem indicação)", p.tipo]));
  function drawBars() {
    const data = [...cnt].filter(([, v]) => v >= 3).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const host = document.getElementById("barChart"); host.replaceChildren();
    const w = host.clientWidth || 480, rowH = 30, labW = Math.min(300, w * 0.6), h = data.length * rowH + 24;
    const x = d3.scaleLinear().domain([0, 10]).range([0, w - labW - 34]);
    const s = d3.select(host).append("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("height", h).attr("role", "img").attr("aria-label", "Participantes por filiação, filiações com 3 ou mais");
    const g = s.append("g").attr("transform", `translate(${labW},4)`);
    g.append("g").attr("class", "grid").selectAll("line").data([0, 2, 4, 6, 8, 10]).join("line").attr("x1", d => x(d)).attr("x2", d => x(d)).attr("y1", 0).attr("y2", data.length * rowH);
    g.append("g").attr("class", "tick").selectAll("text").data([0, 2, 4, 6, 8, 10]).join("text").attr("x", d => x(d)).attr("y", data.length * rowH + 16).attr("text-anchor", "middle").text(d => d);
    const row = g.selectAll("g.r").data(data).join("g").attr("class", "r").attr("transform", (d, i) => `translate(0,${i * rowH})`);
    row.append("text").attr("class", "barlbl").attr("x", -8).attr("y", rowH / 2 + 4).attr("text-anchor", "end")
      .text(d => { const t = d[0]; const max = Math.floor(labW / 6.3); return t.length > max ? t.slice(0, max - 1) + "…" : t; })
      .style("font-style", d => tipoOf[d[0]] !== "Agrupamento folclórico" ? "italic" : null);
    row.append("path").attr("fill", "var(--pessoa)")
      .attr("d", d => { const bw = x(d[1]), y0 = 5, bh = rowH - 10, r = Math.min(4, bw / 2); return `M0,${y0} H${bw - r} Q${bw},${y0} ${bw},${y0 + r} V${y0 + bh - r} Q${bw},${y0 + bh} ${bw - r},${y0 + bh} H0 Z`; });
    row.append("text").attr("class", "val").attr("x", d => x(d[1]) + 6).attr("y", rowH / 2 + 4).text(d => d[1]);
    row.append("rect").attr("x", -labW).attr("y", 0).attr("width", w).attr("height", rowH).attr("fill", "transparent").attr("tabindex", 0)
      .on("pointermove", (e, d) => showTip(e, [["strong", d[1] + " participantes"], ["span", d[0] + (tipoOf[d[0]] !== "Agrupamento folclórico" ? " (" + tipoOf[d[0]].toLowerCase() + ")" : "")]]))
      .on("pointerleave", hideTip)
      .on("focus", function (e, d) { const r = this.getBoundingClientRect(); showTip({ pageX: r.left + window.scrollX + labW, pageY: r.top + window.scrollY }, [["strong", d[1] + " participantes"], ["span", d[0]]]); })
      .on("blur", hideTip);
    const note = el("p", { class: "small" }, "Em itálico: filiações que não são agrupamentos folclóricos.");
    host.appendChild(note);
  }
  function drawHist() {
    const ag = [...cnt].filter(([k]) => tipoOf[k] === "Agrupamento folclórico").map(([, v]) => v);
    const bins = d3.rollup(ag, v => v.length, d => d);
    const data = d3.range(1, 10).map(k => [k, bins.get(k) || 0]);
    const host = document.getElementById("histChart"); host.replaceChildren();
    const w = host.clientWidth || 420, h = 190, m = { l: 28, r: 8, t: 18, b: 34 };
    const x = d3.scaleBand().domain(data.map(d => d[0])).range([m.l, w - m.r]).padding(0.25);
    const y = d3.scaleLinear().domain([0, 50]).range([h - m.b, m.t]);
    const s = d3.select(host).append("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("height", h).attr("role", "img").attr("aria-label", "Distribuição do tamanho das delegações");
    s.append("g").attr("class", "grid").selectAll("line").data([0, 10, 20, 30, 40, 50]).join("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", d => y(d)).attr("y2", d => y(d));
    s.append("g").attr("class", "tick").selectAll("text").data([0, 10, 20, 30, 40, 50]).join("text").attr("x", m.l - 6).attr("y", d => y(d) + 4).attr("text-anchor", "end").text(d => d);
    s.append("g").attr("class", "tick").selectAll("text").data(data).join("text").attr("x", d => x(d[0]) + x.bandwidth() / 2).attr("y", h - m.b + 16).attr("text-anchor", "middle").text(d => d[0]);
    s.append("text").attr("class", "barlbl").attr("x", (m.l + w - m.r) / 2).attr("y", h - 2).attr("text-anchor", "middle").text("participantes por agrupamento");
    s.selectAll("path.b").data(data.filter(d => d[1] > 0)).join("path").attr("class", "b").attr("fill", "var(--pessoa)")
      .attr("d", d => { const x0 = x(d[0]), bw = x.bandwidth(), y0 = y(d[1]), y1 = y(0), r = Math.min(4, (y1 - y0) / 2); return `M${x0},${y1} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + bw - r} Q${x0 + bw},${y0} ${x0 + bw},${y0 + r} V${y1} Z`; });
    s.selectAll("text.v").data(data.filter(d => d[1] > 0)).join("text").attr("class", "val").attr("x", d => x(d[0]) + x.bandwidth() / 2).attr("y", d => y(d[1]) - 5).attr("text-anchor", "middle").text(d => d[1]);
    s.selectAll("rect.hit").data(data).join("rect").attr("class", "hit").attr("x", d => x(d[0]) - 3).attr("width", x.bandwidth() + 6).attr("y", m.t).attr("height", h - m.b - m.t).attr("fill", "transparent")
      .on("pointermove", (e, d) => showTip(e, [["strong", d[1] + " agrupamento" + (d[1] === 1 ? "" : "s")], ["span", "com " + d[0] + " participante" + (d[0] === 1 ? "" : "s")]]))
      .on("pointerleave", hideTip);
  }
  drawBars(); drawHist();
  window.__redraw87 = () => { drawBars(); drawHist(); };

  (function typeTable() {
    const t = document.getElementById("typeTable");
    const tc = d3.rollup(P, v => v.length, d => d.tipo);
    const h = el("tr"); h.appendChild(el("th", null, "Tipo de filiação")); h.appendChild(el("th", { class: "num" }, "Participantes"));
    const th = el("thead"); th.appendChild(h); t.appendChild(th);
    const tb = el("tbody");
    [...tc].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => { const tr = el("tr"); tr.appendChild(el("td", null, k)); tr.appendChild(el("td", { class: "num" }, String(v))); tb.appendChild(tr); });
    t.appendChild(tb);
  })();

  (function famTable() {
    const fam = [
      ["Grupo Folclórico do Bordalo", "Resende", ["António Santos Resende", "Mário dos Santos Resende", "Rogério Manuel S. Resende"]],
      ["Grupo Coral Etnográfico Camponeses de Pias e Brinches", "Cachola", ["Barão Espada Cachola", "José Cachola Alcântara", "Miguel Paulo Coelho Cachola"]],
      ["Rancho Cancioneiro de Águeda", "Aguiar S. (da) Cruz", ["Estela Maria Aguiar S. da Cruz", "Rui Manuel Aguiar S. Cruz"]],
      ["Grupo Folclórico de Cidacos", "Calejo", ["Isabel M. S. O. Calejo", "José Calejo"]],
      ["Grupo de Cantares e Danças de S. Cruz de Ribatâmega", "Freitas", ["Alice Freitas", "Armando Freitas"]],
      ["Ribatâmega (rancho e grupo de cantares)", "Queirós", ["Alberto Augusto Queirós", "António Augusto Queirós"]],
      ["Rancho Folclórico de Passos de Silgueiros", "Lopes Pires", ["António Lopes Pires", "António Miguel Lopes Pires"]],
    ];
    const t = document.getElementById("famTable");
    const h = el("tr"); ["Agrupamento", "Apelido", "Pessoas"].forEach(x => h.appendChild(el("th", null, x)));
    const th = el("thead"); th.appendChild(h); t.appendChild(th);
    const tb = el("tbody");
    fam.forEach(([a, s, ps]) => { const tr = el("tr"); tr.appendChild(el("td", null, a)); tr.appendChild(el("td", null, s)); tr.appendChild(el("td", null, ps.join("; "))); tb.appendChild(tr); });
    t.appendChild(tb);
  })();

  (function linkTable() {
    const t = document.getElementById("linkTable");
    const h = el("tr"); ["Participante", "Filiação em 1987", "Na rede como"].forEach(x => h.appendChild(el("th", null, x)));
    const th = el("thead"); th.appendChild(h); t.appendChild(th);
    const tb = el("tbody");
    P.filter(p => idOf(p)).forEach(p => {
      const id = idOf(p);
      const es = D.edges.filter(e => e.source === id || e.target === id);
      const roles = es.filter(e => CONG[e.source] || CONG[e.target]).filter(e => !e.papel.startsWith("Participante")).map(e => e.papel + " (" + (CONG[e.target] || CONG[e.source]).ano + ")");
      const nm = new Set(es.filter(e => e.rel === "pessoa–mandato").map(e => e.target)).size;
      if (nm) roles.push(nm + " mandato" + (nm === 1 ? "" : "s") + " nos órgãos sociais da FFP");
      const tr = el("tr");
      const td0 = el("td"); const b = el("button", { class: "linkbtn", type: "button" }, p.nome); b.addEventListener("click", () => window.__viz.select(id)); td0.appendChild(b);
      tr.appendChild(td0); tr.appendChild(el("td", null, p.impresso || "—"));
      tr.appendChild(el("td", null, [...new Set(roles)].join("; "))); tb.appendChild(tr);
    });
    t.appendChild(tb);
  })();

  (function partTable() {
    const t = document.getElementById("partTable");
    const h = el("tr"); ["Nome", "Filiação impressa", "Normalizada", "Tipo", "Pág."].forEach(x => h.appendChild(el("th", null, x)));
    const th = el("thead"); th.appendChild(h); t.appendChild(th);
    const tb = el("tbody"); t.appendChild(tb);
    const fold = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    function fill(q) {
      tb.replaceChildren();
      const qq = fold(q || "");
      P.filter(p => !qq || fold(p.nome + " " + p.impresso + " " + p.agrup).includes(qq)).forEach(p => {
        const tr = el("tr", idOf(p) ? { class: "linked" } : null);
        [p.nome, p.impresso || "—", p.agrup !== p.impresso ? p.agrup : "", p.tipo, p.pagina].forEach(x => tr.appendChild(el("td", null, x)));
        tb.appendChild(tr);
      });
    }
    document.getElementById("q").addEventListener("input", e => fill(e.target.value));
    fill("");
  })();
}

