/* Redes do folclore organizado — página Poder e renovação. Usa d3 v7 e window.PODER (dados/poder.js). */
(function () {
  var D = window.PODER;
  if (!D) { document.getElementById("q1share").textContent = "Não foi possível carregar os dados (dados/poder.js)."; return; }
  try { init(D); } catch (e) { console.error(e); }
})();

function init(D) {
  // ================================================================ utilitários
  const tip = document.getElementById("tip");
  function showTip(evt, lines) {
    tip.replaceChildren();
    lines.forEach(([tag, text]) => { const e = document.createElement(tag); e.textContent = text; tip.appendChild(e); });
    const pad = 12, w = tip.offsetWidth, h = tip.offsetHeight;
    let x = evt.pageX + pad, y = evt.pageY + pad;
    if (x + w > window.scrollX + document.documentElement.clientWidth - 8) x = evt.pageX - w - pad;
    if (y + h > window.scrollY + window.innerHeight - 8) y = evt.pageY - h - pad;
    tip.style.left = x + "px"; tip.style.top = y + "px"; tip.style.opacity = 1;
  }
  const hideTip = () => { tip.style.opacity = 0; };
  function el(tag, attrs, text) {
    const e = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) { if (k === "class") e.className = v; else e.setAttribute(k, v); }
    if (text != null) e.textContent = text;
    return e;
  }
  const M = D.mandatos, MI = Object.fromEntries(M.map((m, i) => [m.id, i]));
  const yy = a => String(a).slice(2);
  const mName = m => m.a0 === 1977 ? "Comissão Instaladora (1977)" : `Mandato ${m.a0}–${m.a1}`;
  const P = D.pessoas, PB = Object.fromEntries(P.map(p => [p.id, p]));
  const PRES = new Set(["Augusto Gomes dos Santos", "Fernando Ferreira da Silva", "Daniel Calado Café"]);
  const ORGC = { "Direção": "var(--c1)", "Assembleia Geral": "var(--c2)", "Conselho Fiscal": "var(--c3)", "Comissão Instaladora": "var(--muted)" };
  const LV = { 5: "P", 4: "VP", 3: "S", 2: "V", 1: "Su" };
  const LVN = { 5: "Presidente", 4: "Vice-presidente", 3: "Secretário / tesoureiro / relator", 2: "Vogal", 1: "Suplente / substituto" };
  const SEQ = ["var(--seq-0)", "var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)", "var(--seq-5)", "var(--seq-6)", "var(--seq-7)"];
  const eraBreaks = [MI["M2005"], MI["M2017"]];
  const short = n => { const t = n.replace(/^Dr\. /, "").split(" "); return t.length > 2 ? t[0] + " " + t[t.length - 1] : n; };

  // ================================================================ barras empilhadas por mandato
  function stacked(hostId, rows, keys, colors, names, opts) {
    const host = document.getElementById(hostId); host.replaceChildren();
    const w = host.clientWidth || 800, h = opts.h || 260, m = { l: 34, r: 8, t: 30, b: 34 };
    const x = d3.scaleBand().domain(rows.map((r, i) => i)).range([m.l, w - m.r]).padding(0.22);
    const maxv = opts.max || d3.max(rows, r => d3.sum(keys, k => r[k]));
    const y = d3.scaleLinear().domain([0, maxv]).nice().range([h - m.b, m.t]);
    const s = d3.select(host).append("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("height", h).attr("role", "img").attr("aria-label", opts.aria);
    const ticks = y.ticks(5);
    s.append("g").attr("class", "gridl").selectAll("line").data(ticks).join("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", d => y(d)).attr("y2", d => y(d));
    s.append("g").selectAll("text").data(ticks).join("text").attr("class", "tick").attr("x", m.l - 6).attr("y", d => y(d) + 4).attr("text-anchor", "end").text(d => d + (opts.pct ? "%" : ""));
    const every = w < 520 ? 2 : 1;
    s.append("g").selectAll("text").data(rows.filter((r, i) => i % every === 0)).join("text").attr("class", "tick").attr("x", r => x(rows.indexOf(r)) + x.bandwidth() / 2).attr("y", h - m.b + 15).attr("text-anchor", "middle").text(r => yy(r.a0));
    s.append("text").attr("class", "axlab").attr("x", (m.l + w - m.r) / 2).attr("y", h - 3).attr("text-anchor", "middle").text("mandato (ano de início)");
    eraBreaks.forEach((bi, j) => {
      const bx = x(bi) - x.step() * x.padding() / 2 - 1;
      s.append("line").attr("x1", bx).attr("x2", bx).attr("y1", m.t - 18).attr("y2", h - m.b).attr("stroke", "var(--ink-2)").attr("stroke-dasharray", "3 3");
      s.append("text").attr("class", "axlab").attr("x", bx + 4).attr("y", m.t - 8).text(w < 700 ? (j === 0 ? "2005" : "2017") : (j === 0 ? "novo presidente (2005)" : "novo presidente (2017)"));
    });
    rows.forEach((r, i) => {
      let acc = 0;
      const g = s.append("g");
      keys.forEach((k, ki) => {
        const v = r[k] || 0; if (!v) return;
        const y0 = y(acc), y1 = y(acc + v), bw = x.bandwidth();
        const top = keys.slice(ki + 1).every(kk => !(r[kk] || 0));
        g.append("path").attr("fill", colors[ki])
          .attr("d", top ? `M${x(i)},${y0 - 1} V${y1 + 3} Q${x(i)},${y1} ${x(i) + 3},${y1} H${x(i) + bw - 3} Q${x(i) + bw},${y1} ${x(i) + bw},${y1 + 3} V${y0 - 1} Z`
                         : `M${x(i)},${y0 - 1} V${y1 + 1} H${x(i) + bw} V${y0 - 1} Z`);
        acc += v;
      });
      if (opts.topLabel && x.bandwidth() > 18) g.append("text").attr("class", "val").attr("x", x(i) + x.bandwidth() / 2).attr("y", y(acc) - 5).attr("text-anchor", "middle").text(opts.topLabel(r));
      s.append("rect").attr("x", x(i) - 2).attr("width", x.bandwidth() + 4).attr("y", m.t).attr("height", h - m.b - m.t).attr("fill", "transparent")
        .on("pointermove", e => showTip(e, [["strong", mName(M[i])], ...keys.map((k, ki) => ["span", `${names[ki]}: ${r[k] || 0}`]), ...(opts.extraTip ? [["span", opts.extraTip(r)]] : [])]))
        .on("pointerleave", hideTip);
    });
  }

  // ================================================================ mapa de calor
  function heatmap(hostId, mat, rowL, colL, opts) {
    const host = document.getElementById(hostId); host.replaceChildren();
    const w = host.clientWidth || 500, lw = opts.lw || 34, th = opts.th || 30;
    const cs = Math.max(14, Math.min(opts.maxCell || 40, (w - lw - 6) / colL.length));
    const h = th + cs * rowL.length + (opts.bottom || 6);
    const s = d3.select(host).append("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("height", h).attr("role", "img").attr("aria-label", opts.aria);
    const max = opts.max || d3.max(mat.flat());
    const col = v => v <= 0 ? SEQ[0] : SEQ[Math.min(7, 1 + Math.floor(6.999 * v / max))];
    colL.forEach((c, j) => s.append("text").attr("class", "tick").attr("x", lw + j * cs + cs / 2).attr("y", th - 8).attr("text-anchor", opts.rotate ? "start" : "middle")
      .attr("transform", opts.rotate ? `rotate(-35 ${lw + j * cs + cs / 2} ${th - 8})` : null).text(c));
    rowL.forEach((r, i) => s.append("text").attr("class", "tick").attr("x", lw - 6).attr("y", th + i * cs + cs / 2 + 4).attr("text-anchor", "end").text(r));
    mat.forEach((row, i) => row.forEach((v, j) => {
      s.append("rect").attr("x", lw + j * cs + 1).attr("y", th + i * cs + 1).attr("width", cs - 2).attr("height", cs - 2).attr("rx", 2).attr("fill", col(v))
        .on("pointermove", e => showTip(e, opts.tip(i, j, v))).on("pointerleave", hideTip);
      if (opts.showVal && cs >= 22 && (v > 0 || opts.showZero)) s.append("text").attr("x", lw + j * cs + cs / 2).attr("y", th + i * cs + cs / 2 + 4).attr("text-anchor", "middle")
        .attr("class", "val").style("fill", v / max > 0.55 ? "#fff" : "var(--ink)").style("pointer-events", "none").text(opts.fmt ? opts.fmt(v) : v);
    }));
    (opts.lines || []).forEach(b => {
      const p = lw + b * cs;
      s.append("line").attr("x1", p).attr("x2", p).attr("y1", th - 2).attr("y2", th + cs * rowL.length).attr("stroke", "var(--ink)").attr("stroke-width", 1.5);
      s.append("line").attr("y1", th + b * cs).attr("y2", th + b * cs).attr("x1", lw - 2).attr("x2", lw + cs * colL.length).attr("stroke", "var(--ink)").attr("stroke-width", 1.5);
    });
    if (opts.diag) s.append("line").attr("x1", lw).attr("y1", th).attr("x2", lw + cs * colL.length).attr("y2", th + cs * rowL.length).attr("stroke", "var(--muted)").attr("stroke-dasharray", "2 3");
  }

  // ================================================================ barras simples
  function bars(hostId, data, opts) {
    const host = document.getElementById(hostId); host.replaceChildren();
    const w = host.clientWidth || 400, h = opts.h || 170, m = { l: opts.horizontal ? (opts.lw || 170) : 30, r: 30, t: 10, b: opts.horizontal ? 6 : 30 };
    const s = d3.select(host).append("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("height", h).attr("role", "img").attr("aria-label", opts.aria);
    const max = d3.max(data, d => d[1]);
    if (opts.horizontal) {
      const y = d3.scaleBand().domain(data.map(d => d[0])).range([m.t, h - m.b]).padding(0.25);
      const x = d3.scaleLinear().domain([0, max]).range([0, w - m.l - m.r]);
      data.forEach(d => {
        s.append("text").attr("class", "tick").attr("x", m.l - 8).attr("y", y(d[0]) + y.bandwidth() / 2 + 4).attr("text-anchor", "end").text(d[0]);
        const bw = Math.max(1, x(d[1])), y0 = y(d[0]), bh = y.bandwidth(), r = Math.min(3, bw / 2);
        s.append("path").attr("fill", "var(--c1)").attr("d", `M${m.l},${y0} H${m.l + bw - r} Q${m.l + bw},${y0} ${m.l + bw},${y0 + r} V${y0 + bh - r} Q${m.l + bw},${y0 + bh} ${m.l + bw - r},${y0 + bh} H${m.l} Z`);
        s.append("text").attr("class", "val").attr("x", m.l + bw + 5).attr("y", y0 + bh / 2 + 4).text(d[1]);
      });
    } else {
      const x = d3.scaleBand().domain(data.map(d => d[0])).range([m.l, w - m.r]).padding(0.2);
      const y = d3.scaleLinear().domain([0, max]).nice().range([h - m.b, m.t + 12]);
      data.forEach(d => {
        const x0 = x(d[0]), bw = x.bandwidth(), y0 = y(d[1]), y1 = y(0), r = Math.min(3, (y1 - y0) / 2);
        if (d[1] > 0) s.append("path").attr("fill", "var(--c1)").attr("d", `M${x0},${y1} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + bw - r} Q${x0 + bw},${y0} ${x0 + bw},${y0 + r} V${y1} Z`);
        if (d[1] > 0) s.append("text").attr("class", "val").attr("x", x0 + bw / 2).attr("y", y0 - 4).attr("text-anchor", "middle").text(d[1]);
        s.append("text").attr("class", "tick").attr("x", x0 + bw / 2).attr("y", h - m.b + 14).attr("text-anchor", "middle").text(d[0]);
      });
      if (opts.xlab) s.append("text").attr("class", "axlab").attr("x", (m.l + w - m.r) / 2).attr("y", h - 2).attr("text-anchor", "middle").text(opts.xlab);
    }
  }

  // ================================================================ rede pessoa–pessoa (disposição fixa)
  function network(hostId, opts) {
    const host = document.getElementById(hostId); host.replaceChildren();
    const w = host.clientWidth || 700, h = opts.h || Math.max(420, Math.min(600, w * 0.72)), pad = 28;
    const X = p => pad + p.x * (w - 2 * pad), Y = p => pad + (1 - p.y) * (h - 2 * pad);
    const svg = d3.select(host).append("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("height", h).attr("role", "img").attr("aria-label", opts.aria);
    const g = svg.append("g"), gE = g.append("g"), gN = g.append("g"), gL = g.append("g");
    let k = 1, t = opts.w0 || 2, locked = null;
    const zoom = d3.zoom().scaleExtent([0.6, 8]).on("zoom", e => { g.attr("transform", e.transform); k = e.transform.k; gN.selectAll("circle").attr("r", d => rad(d) / Math.sqrt(k)); gL.selectAll("text").style("font-size", (11 / k) + "px").style("stroke-width", (3 / k) + "px").attr("dx", 8 / Math.sqrt(k)); });
    svg.call(zoom).on("dblclick.zoom", null);
    const rad = p => 2.5 + 1.9 * Math.sqrt(p.n);
    function edgesAt() { return D.arestas.filter(e => e.w >= t); }
    function adjAt() { const a = {}; edgesAt().forEach(e => { (a[e.a] = a[e.a] || new Set()).add(e.b); (a[e.b] = a[e.b] || new Set()).add(e.a); }); return a; }
    let adj = adjAt();
    function draw() {
      const es = edgesAt(); adj = adjAt();
      const maxw = d3.max(D.arestas, e => e.w);
      gE.selectAll("line").data(es, e => e.a + "|" + e.b).join("line").attr("class", "e")
        .attr("x1", e => X(PB[e.a])).attr("y1", e => Y(PB[e.a])).attr("x2", e => X(PB[e.b])).attr("y2", e => Y(PB[e.b]))
        .attr("stroke-width", e => 0.4 + 2.2 * e.w / maxw).attr("stroke-opacity", e => 0.12 + 0.5 * e.w / maxw);
      const kmax = d3.max(P, p => p.cores[t - 1]);
      const ring = p => opts.ring ? opts.ring(p, t, kmax) : false;
      gN.selectAll("circle").data(P, p => p.id).join("circle")
        .attr("cx", X).attr("cy", Y).attr("r", p => rad(p) / Math.sqrt(k)).attr("fill", opts.color)
        .attr("class", p => "n" + (ring(p) ? " ring" : ""))
        .attr("opacity", p => adj[p.id] || t === 1 ? 1 : 0.35)
        .on("pointerenter", (e, p) => { focus(p.id); showTip(e, [["strong", p.id], ["span", `${p.n} mandato${p.n > 1 ? "s" : ""} (${p.primeiro}–${p.ultimo}) · ${adj[p.id] ? adj[p.id].size : 0} ligações com ≥ ${t} em comum · k-core ${p.cores[t - 1]}`]]); })
        .on("pointermove", (e, p) => showTip(e, [["strong", p.id], ["span", `${p.n} mandato${p.n > 1 ? "s" : ""} (${p.primeiro}–${p.ultimo}) · ${adj[p.id] ? adj[p.id].size : 0} ligações com ≥ ${t} em comum · k-core ${p.cores[t - 1]}`]]))
        .on("pointerleave", () => { hideTip(); focus(locked); })
        .on("click", (e, p) => { e.stopPropagation(); locked = locked === p.id ? null : p.id; focus(locked); });
      svg.on("click", () => { locked = null; focus(null); });
      if (opts.info) opts.info(t, kmax);
      focus(locked);
    }
    function focus(id) {
      const nb = id ? new Set([id, ...(adj[id] || [])]) : null;
      gE.selectAll("line").classed("dim", e => nb && !(e.a === id || e.b === id));
      gN.selectAll("circle").classed("dim", p => nb && !nb.has(p.id));
      const lab = P.filter(p => (nb ? nb.has(p.id) && (p.id === id || p.n >= 4 || PRES.has(p.id)) : (p.n >= 9 || PRES.has(p.id))));
      gL.selectAll("text").data(lab, p => p.id).join("text").attr("class", "lbl").attr("x", X).attr("y", p => Y(p) + 4).attr("dx", 8 / Math.sqrt(k))
        .style("font-size", (11 / k) + "px").style("stroke-width", (3 / k) + "px").text(p => (p.id === id ? p.id : short(p.id)));
    }
    if (opts.slider) {
      const sl = document.getElementById(opts.slider), out = document.getElementById(opts.slider + "v");
      sl.addEventListener("input", () => { t = +sl.value; out.textContent = t; draw(); });
      t = +sl.value;
    }
    if (opts.fit) document.getElementById(opts.fit).addEventListener("click", () => svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity));
    draw();
  }

  // ================================================================ grelha de percursos
  function careerGrid(hostId, persons) {
    const host = document.getElementById(hostId); host.replaceChildren();
    const t = el("table", { class: "career" });
    const hr = el("tr"); hr.appendChild(el("th", null, ""));
    M.forEach(m => hr.appendChild(el("th", { class: "mh", scope: "col", title: mName(m) }, yy(m.a0))));
    hr.appendChild(el("th", { class: "num" }, "N.º"));
    const th = el("thead"); th.appendChild(hr); t.appendChild(th);
    const tb = el("tbody");
    persons.forEach(p => {
      const tr = el("tr");
      tr.appendChild(el("th", { scope: "row", class: "row" + (PRES.has(p.id) ? " pres" : "") }, p.id));
      const byM = Object.fromEntries(p.seq.map(s => [s.m, s]));
      M.forEach(m => {
        const s = byM[m.id], td = el("td", { class: "c" });
        if (s) {
          const c = el("span", { class: "cell l" + s.nivel }, LV[s.nivel]);
          c.style.background = ORGC[s.orgao];
          td.appendChild(c);
          td.setAttribute("tabindex", "0");
          td.setAttribute("aria-label", `${p.id}, ${mName(m)}: ${s.orgao}, ${s.cargo}`);
          td.addEventListener("pointermove", e => showTip(e, [["strong", `${s.orgao} — ${s.cargo}`], ["span", `${p.id} · ${mName(m)}`]]));
          td.addEventListener("pointerleave", hideTip);
        }
        tr.appendChild(td);
      });
      tr.appendChild(el("td", { class: "num" }, String(p.n)));
      tb.appendChild(tr);
    });
    t.appendChild(tb); host.appendChild(t);
  }

  // ================================================================ desenhar tudo
  function drawAll() {
    // Q1 ----------------------------------------------------------------
    stacked("q1share", D.q1.share, ["hist", "rec", "outros"], ["var(--c1)", "var(--c2)", "var(--neutral)"],
      ["Núcleo histórico", "Núcleo recente", "Outros"], { aria: "Lugares de cada mandato por núcleo", topLabel: r => r.n, h: 270 });
    const dist = Object.entries(D.q1.dist_mandatos).map(([k, v]) => [k, v]);
    bars("q1dist", dist, { aria: "Pessoas por número de mandatos", xlab: "número de mandatos", h: 170 });
    // Q2 ----------------------------------------------------------------
    const lab = M.map(m => yy(m.a0));
    heatmap("q2jac", D.q2.jaccard, lab, lab, { aria: "Semelhança entre mandatos (Jaccard)", max: 1, lines: eraBreaks, maxCell: 30,
      tip: (i, j, v) => [["strong", `${(v * 100).toFixed(0)}% em comum`], ["span", `${mName(M[i])} e ${mName(M[j])}`]] });
    const comp = D.q2.comp_mand.map(r => ({ a0: r.a0, A: r.por_comunidade[0], B: r.por_comunidade[1], C: r.por_comunidade[2] }));
    stacked("q2comp", comp, ["A", "B", "C"], ["var(--c1)", "var(--c2)", "var(--c3)"], ["Comunidade A", "Comunidade B", "Comunidade C"], { aria: "Composição dos mandatos por comunidade", h: 240 });
    // Q3 ----------------------------------------------------------------
    const ORG = ["Comissão Instaladora", "Assembleia Geral", "Direção", "Conselho Fiscal"];
    const ORGS = ["Com. Instal.", "Ass. Geral", "Direção", "Cons. Fiscal"];
    const om = ORG.map(a => ORG.map(b => (D.q3.org_tr.find(x => x.de === a && x.para === b) || { n: 0 }).n));
    heatmap("q3org", om, ORGS, ORGS, { aria: "Transições entre órgãos", lw: 92, th: 44, rotate: true, maxCell: 62, showVal: true, showZero: true, max: d3.max(om.flat()),
      tip: (i, j, v) => [["strong", `${v} passagem${v === 1 ? "" : "s"}`], ["span", `${ORG[i]} → ${ORG[j]}`]] });
    const LVL = [1, 2, 3, 4, 5], LVS = ["Su", "V", "S", "VP", "P"];
    const lm = LVL.map(a => LVL.map(b => (D.q3.lvl_tr.find(x => x.de === a && x.para === b) || { n: 0 }).n));
    heatmap("q3lvl", lm, LVS, LVS, { aria: "Transições entre níveis de cargo", lw: 40, th: 30, maxCell: 48, showVal: true, showZero: false, diag: true, max: d3.max(lm.flat()),
      tip: (i, j, v) => [["strong", `${v} passagem${v === 1 ? "" : "s"}`], ["span", `${LVN[LVL[i]]} → ${LVN[LVL[j]]}`]] });
    const ent = [5, 4, 3, 2, 1].map(l => [LVN[l], D.q3.entrada_lvl[String(l)] || 0]);
    bars("q3ent", ent, { horizontal: true, aria: "Nível do primeiro cargo", h: 150, lw: 205 });
    // Q4 ----------------------------------------------------------------
    const fm = D.q4.fem_mand.map(r => ({ a0: r.a0, d: r["Direção"], ag: r["Assembleia Geral"], cf: r["Conselho Fiscal"], ci: r["Comissão Instaladora"], h: r.total - r.F, F: r.F, total: r.total }));
    stacked("q4bars", fm, ["d", "ag", "cf", "h"], ["var(--c1)", "var(--c2)", "var(--c3)", "var(--neutral)"], ["Mulheres na Direção", "Mulheres na Assembleia Geral", "Mulheres no Conselho Fiscal", "Homens"],
      { aria: "Mulheres por mandato e órgão", topLabel: r => `${r.F}/${r.total}`, h: 280, extraTip: r => `${Math.round(100 * r.F / r.total)}% de mulheres` });
  }
  drawAll();

  // redes (desenhadas uma vez; zoom e filtros próprios)
  network("q1net", { aria: "Rede de co-serviço, colorida por núcleo", slider: "q1w", fit: "q1fit",
    color: p => p.hist && p.rec ? "var(--c3)" : p.hist ? "var(--c1)" : p.rec ? "var(--c2)" : "var(--neutral)",
    ring: (p, t, kmax) => t > 1 && p.cores[t - 1] === kmax,
    info: (t, kmax) => {
      const nuc = P.filter(p => p.cores[t - 1] === kmax).sort((a, b) => b.n - a.n);
      document.getElementById("q1info").textContent = t === 1
        ? `Sem limiar, o núcleo máximo (k = ${kmax}) é só o mandato com mais membros: ${nuc.length} pessoas, quase todas de 2023.`
        : `Com ligações de ${t}+ mandatos em comum, o k-core máximo tem k = ${kmax} e ${nuc.length} pessoas: ${nuc.map(p => short(p.id)).join(", ")}.`;
    } });
  network("q2net", { aria: "Rede de co-serviço, colorida por comunidade", slider: "q2w", fit: "q2fit",
    color: p => ["var(--c1)", "var(--c2)", "var(--c3)"][p.comunidade], ring: p => PRES.has(p.id) });
  network("q4net", { aria: "Rede de co-serviço, mulheres destacadas", w0: 2,
    color: p => p.genero === "F" ? "var(--fem)" : "var(--neutral)", ring: () => false });

  // tabela das transições
  (function () {
    const t = document.getElementById("q2tab");
    const [a, b] = D.q2.transicoes;
    const parse = s => { const m = s.match(/'([^']+)', '([^']+)'/); return m ? `${m[2]} (${m[1]})` : s; };
    const rows = [
      ["Membros do primeiro mandato", a.membros, b.membros],
      ["Já tinham servido com o presidente anterior", a.da_era_anterior, b.da_era_anterior],
      ["Novos", a.novos, b.novos],
      ["Dos que ficaram, mudaram de órgão ou nível", a.mudaram_cargo, b.mudaram_cargo],
      ["… dos quais subiram de nível", a.subiram, b.subiram],
      ["Membros do mandato anterior que saíram", a.saidas, b.saidas],
      ["O novo presidente era", parse(a.presidente_novo_vinha_de), parse(b.presidente_novo_vinha_de)],
    ];
    const h = el("tr"); ["", "2005 · Ferreira da Silva", "2017 · Calado Café"].forEach((x, i) => h.appendChild(el("th", i ? { class: "num" } : null, x)));
    const th = el("thead"); th.appendChild(h); t.appendChild(th);
    const tb = el("tbody");
    rows.forEach(r => { const tr = el("tr"); r.forEach((x, i) => tr.appendChild(el("td", i ? { class: "num" } : null, String(x)))); tb.appendChild(tr); });
    t.appendChild(tb);
  })();

  // grelhas de percursos
  careerGrid("q3grid", P.filter(p => p.n >= 4).sort((a, b) => a.primeiro - b.primeiro || b.n - a.n || a.id.localeCompare(b.id)));
  careerGrid("q4grid", P.filter(p => p.genero === "F").sort((a, b) => a.primeiro - b.primeiro || b.n - a.n));

  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(drawAll, 150); });
}
