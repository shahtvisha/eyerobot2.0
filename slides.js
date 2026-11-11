'use strict';
// Persistent-object presentation runtime (from the RayZer deck; video playback per state added for EyeRobot 2.0), extended with
// particle clouds, arrow fields, trajectories, staged morphs, keyframe playback,
// a notes overlay (N) and a synced speaker view (S).
const W = 1324, H = 744.75, DURATION = 1200, EXIT = 450, slide = document.querySelector('#slide');
const RAW = window.RAYZER_STATES;
const PRESENTER = new URLSearchParams(location.search).has('presenter');
const states = RAW.map(s => new Map(s.elements.map(e => [e.name || e.alt, e])));
const visibleStates = RAW.flatMap((s, i) => s.hidden ? [] : [i + 1]);
const lastVisible = visibleStates.at(-1);
function nextVisible(dir) { return dir > 0 ? visibleStates.find(n => n > current) : visibleStates.findLast(n => n < current) }
const nodes = new Map(); const NS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs) { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v); return el }
function color(c) { if (!c || c === 'none') return 'none'; if (c.includes('/')) { const [a, b] = c.split('/'); return a + Math.round(Number(b) * 2.55).toString(16).padStart(2, '0') } return c }
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = t => t * t * (3 - 2 * t), mix = (a, b, t) => a + (b - a) * t;
function rgb(hex) { const h = (hex || '#000000').replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)] }
function hex3(r, g, b) { return '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('') }
const KIND = e => e.kind || (e.content !== undefined ? 'text' : e.media === 'video' ? 'video' : e.src ? 'image' : 'shape');
const isVector = k => k === 'points' || k === 'arrows' || k === 'lines';

// ---------- static content (RayZer element kinds) ----------
const mathTokens = Object.keys(window.RayzerMath || {}).sort((a, b) => b.length - a.length);
function appendPaperText(parent, value) {
  let pending = ''; const flush = () => { if (pending) { parent.append(document.createTextNode(pending)); pending = '' } };
  for (let i = 0; i < value.length;) {
    const token = mathTokens.find(t => value.startsWith(t, i));
    if (!token) { pending += value[i++]; continue } flush();
    const xml = new DOMParser().parseFromString(window.RayzerMath[token].svg, 'image/svg+xml');
    const icon = document.importNode(xml.documentElement, true);
    icon.setAttribute('aria-label', token); Object.assign(icon.style, { width: icon.getAttribute('width'), height: icon.getAttribute('height'), display: 'inline-block', overflow: 'visible' });
    parent.append(icon); i += token.length;
  } flush();
}
function content(el, e, frozen) {
  const kind = KIND(e);
  if (e.boxShadow) el.style.boxShadow = e.boxShadow;
  if (isVector(kind)) { vectorContent(el, e, frozen); return }
  if (kind === 'video') { const video = document.createElement('video'); video.src = e.src; video.muted = true; video.loop = e.loop !== false; video.playsInline = true; video.preload = 'metadata'; if (e.poster) video.poster = e.poster; video.setAttribute('aria-label', e.alt || 'Video'); el.append(video); return }
  if (kind === 'image') {
    const img = document.createElement('img'); img.src = e.src; img.alt = (e.alt || '').replace('!!', ''); img.draggable = false;
    if (e.imageCrop) { const c = e.imageCrop; el.style.overflow = 'hidden'; Object.assign(img.style, { position: 'absolute', maxWidth: 'none', width: (100 / c.width) + '%', height: (100 / c.height) + '%', left: (-100 * c.x / c.width) + '%', top: (-100 * c.y / c.height) + '%', objectFit: 'fill' }) }
    el.append(img); return
  }
  if (kind === 'text') {
    el.classList.add('text'); const s = e.textStyle || {};
    Object.assign(el.style, { fontFamily: `"${s.typeface || 'Helvetica'}",${s.typeface === 'Helvetica' || !s.typeface ? 'Arial,sans-serif' : 'serif'}`, fontSize: (s.fontSize || 20) + 'px', fontWeight: s.bold ? '700' : '400', fontStyle: s.italic ? 'italic' : 'normal', color: s.color || '#222222', textAlign: s.alignment || 'left', lineHeight: s.lineHeight || '' });
    const raw = e.content; const paragraphs = typeof raw === 'string' ? raw.split('\n') : Array.isArray(raw[0]) ? raw : [raw];
    for (const p of paragraphs) { const line = document.createElement('p'); for (const r of typeof p === 'string' ? [{ run: p }] : p) { const sp = document.createElement('span'); appendPaperText(sp, r.run); const st = r.textStyle || {}; if (st.bold !== undefined) sp.style.fontWeight = st.bold ? '700' : '400'; if (st.italic) sp.style.fontStyle = 'italic'; if (st.color) sp.style.color = st.color; line.append(sp) } el.append(line) }
    return;
  }
  const w = e.position.width || 1, h = e.position.height || 1, s = svg('svg', { viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'none' }); let sh;
  if (e.svgPath) { sh = svg('path', { d: e.svgPath }); s.style.overflow = 'visible' }
  else if (e.geometry === 'line') sh = svg('line', { x1: 0, y1: e.position.verticalFlip ? h : 0, x2: w, y2: e.position.verticalFlip ? 0 : (e.position.height || 0) });
  else if (e.geometry === 'ellipse') sh = svg('ellipse', { cx: w / 2, cy: h / 2, rx: w / 2, ry: h / 2 });
  else if (e.geometry === 'triangle') sh = svg('polygon', { points: `${w / 2},0 ${w},${h} 0,${h}` });
  else sh = svg('rect', { x: 0, y: 0, width: w, height: h, rx: e.geometry === 'roundRect' ? (e.borderRadius || 12) : 0 });
  if (e.entryDraw === 'box') { sh.setAttribute('pathLength', '1'); sh.style.strokeDasharray = '1'; sh.style.strokeDashoffset = '0' }
  if (e.geometry === 'line' || e.nonScalingStroke) sh.setAttribute('vector-effect', 'non-scaling-stroke');
  sh.setAttribute('fill', color(e.fill)); sh.setAttribute('stroke', color(e.line?.fill)); sh.setAttribute('stroke-width', e.line?.width || 0);
  if (e.line?.style === 'dotted') { sh.setAttribute('stroke-dasharray', '0.1 5'); sh.setAttribute('stroke-linecap', 'round') }
  if (e.line?.style === 'dashed') sh.setAttribute('stroke-dasharray', e.line.dash || '7 5');
  if (e.line?.cap) sh.setAttribute('stroke-linecap', e.line.cap);
  if (e.line?.join) sh.setAttribute('stroke-linejoin', e.line.join);
  s.append(sh); el.append(s);
}

// ---------- vector kinds: points, arrows, lines (drawn in canvas coordinates) ----------
let clipCounter = 0;
function vectorContent(el, e, frozen) {
  Object.assign(el.style, { left: '0px', top: '0px', width: W + 'px', height: H + 'px', pointerEvents: 'none' });
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H }); s.style.overflow = 'hidden';
  const g = svg('g', {});
  // every vector object gets a clip rectangle; each state may set its own (see setClip)
  const id = 'clip' + (++clipCounter); const cp = svg('clipPath', { id }); const cr = svg('rect', {}); cp.append(cr); s.append(cp); g.setAttribute('clip-path', `url(#${id})`);
  el._clipRect = cr; setClip(el, e.clip || [0, 0, W, H]);
  s.append(g); el.append(s);
  const kind = KIND(e), parts = [];
  if (kind === 'points') {
    const n = (e.pts || e.frames[0]).length;
    for (let i = 0; i < n; i++) { const c = svg('circle', { r: 3 }); if (e.stroke) { c.setAttribute('stroke', e.stroke.color); c.setAttribute('stroke-width', e.stroke.width) } g.append(c); parts.push(c) }
  } else if (kind === 'arrows') {
    const n = (e.arrows || e.frames[0]).length;
    for (let i = 0; i < n; i++) {
      const l = svg('line', { stroke: e.color || '#222222', 'stroke-width': e.width || 2, 'stroke-linecap': 'round' }); if (e.dash) l.setAttribute('stroke-dasharray', e.dash);
      const h = svg('polygon', { fill: e.color || '#222222' });
      const ag = svg('g', {}); ag.append(l, h); g.append(ag); parts.push([l, h, ag]);   // opacity on the group: no darker overlap of shaft and head
    }
  } else {
    const n = e.paths.length;
    for (let i = 0; i < n; i++) {
      const pl = svg('polyline', { fill: 'none', stroke: (e.colors || [])[i] || e.color || '#222222', 'stroke-width': e.width || 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      if (e.dash) pl.setAttribute('stroke-dasharray', e.dash); g.append(pl); parts.push(pl);
    }
  }
  el._parts = parts;
  if (frozen) paintVector(el, e, restPose(e));
}
function setClip(el, c) {
  if (!el._clipRect) return; const k = c.join(','); if (el._clipKey === k) return; el._clipKey = k; el._clip = c;
  el._clipRect.setAttribute('x', c[0]); el._clipRect.setAttribute('y', c[1]); el._clipRect.setAttribute('width', c[2] - c[0]); el._clipRect.setAttribute('height', c[3] - c[1]);
}
const unionClip = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
function arr(v, n, d) { return Array.isArray(v) ? v : Array(n).fill(v ?? d) }
function staticPose(e, which) {
  const kind = KIND(e);
  if (kind === 'points') {
    const src = which === 'enter' ? e.enterFrom : e; const pts = (which === 'last' && e.frames ? e.frames.at(-1) : which === 'first' && e.frames ? e.frames[0] : (src.pts || e.pts || e.frames[0]));
    const n = pts.length, fills = arr(src.fills || src.fill || e.fills || e.fill, n, '#222222');
    return { kind, opacity: (which === 'enter' ? (e.enterFrom.opacity ?? 1) : (e.opacity ?? 1)), pts: pts.flat(), col: fills.flatMap(rgb), alpha: arr(src.alphas ?? src.alpha ?? e.alphas ?? e.alpha, n, 1).slice(), r: arr(src.radii ?? src.r ?? e.radii ?? e.r, n, 3).slice() };
  }
  if (kind === 'arrows') {
    const src = which === 'enter' ? e.enterFrom : e; const a = (which === 'last' && e.frames ? e.frames.at(-1) : which === 'first' && e.frames ? e.frames[0] : (src.arrows || e.arrows || e.frames[0]));
    return { kind, opacity: (which === 'enter' ? (e.enterFrom.opacity ?? 1) : (e.opacity ?? 1)), a: a.flat(), alpha: arr(src.alphas ?? e.alphas ?? e.alpha, a.length, 1).slice() };
  }
  if (kind === 'lines') {
    const src = which === 'enter' && e.enterFrom?.paths ? e.enterFrom : e;
    return { kind, opacity: (which === 'enter' ? (e.enterFrom?.opacity ?? 1) : (e.opacity ?? 1)), paths: src.paths.map(p => p.flat()), alpha: arr(e.alphas ?? e.alpha, e.paths.length, 1).slice(), reveal: which === 'enter' && (e.reveal || e.revealFrames) ? 0 : 1 };
  }
  const ent = which === 'enter' && e.enterFrom; let p = ent && e.enterFrom.position ? e.enterFrom.position : e.position;   // an image can fly in
  if (e.frames && !ent) { const f = which === 'first' ? e.frames[0] : e.frames.at(-1); p = { ...p, left: f[0], top: f[1], rotation: f[2] } }   // or follow keyframes [left, top, rotation]
  return { kind, opacity: ent ? (e.enterFrom.opacity ?? 1) : (e.opacity ?? 1), left: p.left, top: p.top, width: p.width, height: p.height, rotation: p.rotation || 0, grayscale: e.grayscale ?? 0, cornerRadius: e.cornerRadius ?? 0 };
}
function restPose(e) { return staticPose(e, 'last') }
function lerpPose(a, b, q) {
  if (!a) return b; if (!b) return a;
  const out = { ...b, opacity: mix(a.opacity, b.opacity, q) };
  if (b.kind === 'points') {
    if (a.pts && a.pts.length === b.pts.length) {
      out.pts = b.pts.map((v, i) => mix(a.pts[i], v, q)); out.col = b.col.map((v, i) => mix(a.col[i], v, q));
      out.alpha = b.alpha.map((v, i) => mix(a.alpha[i], v, q)); out.r = b.r.map((v, i) => mix(a.r[i], v, q));
    }
  } else if (b.kind === 'arrows') {
    if (a.a && a.a.length === b.a.length) { out.a = b.a.map((v, i) => mix(a.a[i], v, q)); out.alpha = b.alpha.map((v, i) => mix(a.alpha[i], v, q)) }
  } else if (b.kind === 'lines') {
    if (a.paths && a.paths.length === b.paths.length && a.paths.every((p, i) => p.length === b.paths[i].length)) out.paths = b.paths.map((p, i) => p.map((v, j) => mix(a.paths[i][j], v, q)));
    out.reveal = mix(a.reveal ?? 1, b.reveal ?? 1, q);
  } else {
    for (const k of ['left', 'top', 'width', 'height', 'rotation', 'grayscale', 'cornerRadius']) out[k] = mix(a[k] ?? b[k], b[k], q);
  }
  return out;
}
function framePose(e, t) {
  // t in ms since playback start; linear interpolation between keyframes
  const F = e.frames.length, ms = e.frameMs || 120, u = clamp(t / ms, 0, F - 1), k = Math.min(F - 2, Math.floor(u)), a = F > 1 ? u - k : 0;
  const p0 = e.frames[Math.max(0, k)], p1 = e.frames[Math.min(F - 1, k + 1)];
  const base = staticPose(e, 'first');
  if (KIND(e) === 'points') base.pts = p0.flatMap((v, i) => [mix(v[0], p1[i][0], a), mix(v[1], p1[i][1], a)]);
  else if (KIND(e) === 'arrows') base.a = p0.flatMap((v, i) => [mix(v[0], p1[i][0], a), mix(v[1], p1[i][1], a), mix(v[2], p1[i][2], a), mix(v[3], p1[i][3], a)]);
  else { base.left = mix(p0[0], p1[0], a); base.top = mix(p0[1], p1[1], a); base.rotation = mix(p0[2], p1[2], a) }
  return base;
}
function paintVector(el, e, pose) {
  const kind = KIND(e), parts = el._parts; el.style.opacity = pose.opacity;
  if (kind === 'points') {
    for (let i = 0; i < parts.length; i++) {
      const c = parts[i]; c.setAttribute('cx', pose.pts[2 * i].toFixed(2)); c.setAttribute('cy', pose.pts[2 * i + 1].toFixed(2)); c.setAttribute('r', pose.r[i].toFixed(2));
      const f = hex3(pose.col[3 * i], pose.col[3 * i + 1], pose.col[3 * i + 2]); if (c._f !== f) { c.setAttribute('fill', e.hollow ? 'none' : f); if (e.hollow) c.setAttribute('stroke', f); c._f = f }
      const al = pose.alpha[i]; if (c._a !== al) { c.setAttribute(e.hollow ? 'stroke-opacity' : 'fill-opacity', al); c._a = al }
    }
  } else if (kind === 'arrows') {
    const hs = e.head ?? 9;
    for (let i = 0; i < parts.length; i++) {
      const [l, h, ag] = parts[i], x0 = pose.a[4 * i], y0 = pose.a[4 * i + 1], x1 = pose.a[4 * i + 2], y1 = pose.a[4 * i + 3];
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), al = pose.alpha[i];
      const hl = Math.min(hs, len * 0.42), hw = hl * 0.62;   // a head never takes more than 42% of its arrow
      const fa = clamp((len - 2) / 8);   // short arrows fade out instead of leaving specks
      if (fa <= 0) { ag.setAttribute('visibility', 'hidden'); continue }
      ag.removeAttribute('visibility');
      const ux = dx / len, uy = dy / len, bx = x1 - ux * hl, by = y1 - uy * hl;
      l.setAttribute('x1', x0.toFixed(2)); l.setAttribute('y1', y0.toFixed(2)); l.setAttribute('x2', (x1 - ux * hl * 0.6).toFixed(2)); l.setAttribute('y2', (y1 - uy * hl * 0.6).toFixed(2));
      h.setAttribute('points', `${x1.toFixed(2)},${y1.toFixed(2)} ${(bx - uy * hw).toFixed(2)},${(by + ux * hw).toFixed(2)} ${(bx + uy * hw).toFixed(2)},${(by - ux * hw).toFixed(2)}`);
      const aa = al * fa; if (ag._a !== aa) { ag.setAttribute('opacity', aa); ag._a = aa }
    }
  } else {
    for (let i = 0; i < parts.length; i++) {
      const p = pose.paths[i], n = p.length / 2, u = clamp(pose.reveal ?? 1) * (n - 1), k = Math.floor(u), a = u - k; let s = '';
      for (let j = 0; j <= Math.min(k, n - 1); j++) s += p[2 * j].toFixed(2) + ',' + p[2 * j + 1].toFixed(2) + ' ';
      if (k < n - 1 && a > 0) s += mix(p[2 * k], p[2 * k + 2], a).toFixed(2) + ',' + mix(p[2 * k + 1], p[2 * k + 3], a).toFixed(2);
      parts[i].setAttribute('points', s.trim()); const al = pose.alpha[i]; if (parts[i]._a !== al) { parts[i].setAttribute('stroke-opacity', al); parts[i]._a = al }
    }
  }
}
function paintGeneric(node, e, pose) {
  const el = node.el; el.style.opacity = pose.opacity;
  el.style.left = pose.left + 'px'; el.style.top = pose.top + 'px'; el.style.width = Math.max(1, pose.width) + 'px'; el.style.height = Math.max(1, pose.height) + 'px';
  el.style.transform = `rotate(${pose.rotation}deg)`; el.style.filter = pose.grayscale ? `grayscale(${pose.grayscale})` : ''; el.style.borderRadius = pose.cornerRadius + 'px';
  el.style.clipPath = e.clipInset ? 'inset(' + e.clipInset.map(v => v + '%').join(' ') + ')' : 'none';
}

// One DOM object per semantic name: matching objects retain identity during morphs.
for (const state of states) for (const [id, e] of state) if (!nodes.has(id)) {
  const el = document.createElement('div'); el.className = 'element'; el.dataset.id = id; el.style.zIndex = e.zIndex ?? 4; el.style.opacity = 0;
  content(el, e); slide.append(el); nodes.set(id, { el, template: e, kind: KIND(e), pose: null });
}

// ---------- state transitions ----------
let current = 1, playing = false, raf = 0, hideTimer, playTimer, entryAnimations = [];
function elementTimeline(e) {
  const delay = e.morphDelay || 0, dur = e.morphDuration || DURATION;
  let end = delay + dur, frameStart = null;
  if (e.frames) { frameStart = e.frameDelay ?? (delay + dur + 150); end = Math.max(end, frameStart + (e.frames.length - 1) * (e.frameMs || 120)) }
  const rv = e.reveal || e.revealFrames; if (rv) end = Math.max(end, (rv.delay || 0) + (rv.duration || 1000));
  return { delay, dur, end, frameStart };
}
function poseAt(node, e, from, t, tl) {
  // from: pose at transition start (or null). Returns pose at time t (ms).
  if (e.frames && t >= tl.frameStart) return framePose(e, t - tl.frameStart);
  const target = staticPose(e, e.frames ? 'first' : 'rest');
  let start = from;
  if (!start || start.opacity <= 0.001) start = e.enterFrom ? staticPose(e, 'enter') : { ...target, opacity: 0 };
  let q = ease(clamp((t - tl.delay) / tl.dur));
  let pose = lerpPose(start, target, q);
  const rv = e.reveal || e.revealFrames;
  if (rv && pose.kind === 'lines') {
    const r0 = (!from || from.opacity <= 0.001) ? 0 : (from.reveal ?? 1);
    const u = clamp((t - (rv.delay || 0)) / (rv.duration || 1000)); pose.reveal = mix(r0, 1, e.revealFrames ? u : ease(u));
    if (!from || from.opacity <= 0.001) pose.opacity = target.opacity;
  }
  return pose;
}
function snapshot() { const out = new Map(); for (const [id, node] of nodes) if (node.pose && node.pose.opacity > 0.001) out.set(id, node.pose); return out }
function applyText(node, b) { const key = JSON.stringify([b.content, b.textStyle]); if (node.el._textKey !== key) { node.el.replaceChildren(); node.el.classList.remove('text'); content(node.el, b); node.el._textKey = key } }
function render(id, node, e, pose) {
  node.pose = pose;
  if (isVector(node.kind)) paintVector(node.el, e || node.template, pose); else paintGeneric(node, e || node.template, pose);
  node.el.setAttribute('aria-hidden', pose.opacity > 0.001 ? 'false' : 'true');
}
function drawEntry(state) {
  for (const [id, e] of state) {
    if (!e.entryDraw) continue; const el = nodes.get(id).el;
    if (e.entryDraw === 'fade') { entryAnimations.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: e.entryDuration || 500, delay: e.entryDelay || 0, fill: 'backwards', easing: 'ease-out' })); continue }
    if (e.entryDraw === 'paper') { const rotation = e.position.rotation || 0; entryAnimations.push(el.animate([{ opacity: 0, transform: `translateY(45px) rotate(${rotation - 3}deg) scale(.94)` }, { opacity: 1, transform: `translateY(0) rotate(${rotation}deg) scale(1)` }], { duration: 650, delay: e.entryDelay || 400, fill: 'backwards', easing: 'cubic-bezier(.2,.8,.2,1)' })); continue }
    if (e.entryDraw === 'box') { const outline = el.querySelector('svg rect'); entryAnimations.push(outline.animate([{ strokeDashoffset: '1' }, { strokeDashoffset: '0' }], { duration: e.entryDuration || 850, delay: e.entryDelay ?? 1400, fill: 'backwards', easing: 'ease-in-out' })); continue }
    if (e.entryDraw === 'annotation') { entryAnimations.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, delay: e.entryDelay ?? 1600, fill: 'backwards', easing: 'ease-out' })); continue }
    if (e.entryDraw === 'wipe') { entryAnimations.push(el.animate([{ clipPath: 'inset(-20px 100% -20px -20px)' }, { clipPath: 'inset(-20px -20px -20px -20px)' }], { duration: e.entryDuration || 900, delay: e.entryDelay || 0, fill: 'backwards', easing: 'ease-in-out' })); continue }
    const head = e.entryDraw === 'head', reveal = e.entryDraw === 'reveal';
    entryAnimations.push(el.animate(head || reveal ? [{ opacity: 0 }, { opacity: 1 }] : [{ clipPath: 'inset(-10px 100% -10px 0)' }, { clipPath: 'inset(-10px 0% -10px 0)' }], { duration: reveal ? 220 : head ? 160 : 1000, delay: reveal ? 1100 : head ? 900 : 0, fill: 'backwards', easing: 'ease-out' }));
  }
}
function goToState(index, animate = true, fromRemote = false) {
  entryAnimations.forEach(a => a.cancel()); entryAnimations = []; cancelAnimationFrame(raf);
  const target = Math.max(1, Math.min(states.length, Math.round(Number(index)) || 1));
  const from = snapshot(), to = states[target - 1]; current = target;
  document.querySelector('#scrub').value = current;
  document.querySelector('#time').textContent = RAW[current - 1].hidden ? `Hidden state ${current}` : `State ${current} / ${visibleStates.length}`;
  slide.setAttribute('aria-label', `State ${current} of ${states.length}`);
  try { const url = new URL(location.href); url.searchParams.set('state', current); history.replaceState(null, '', url) } catch (e) { }
  updateThumbnailSelection(); updateNotes(); if (!fromRemote) broadcast();
  const plan = [];
  for (const [id, node] of nodes) {
    const e = to.get(id), a = from.get(id) || null;
    if (e) {
      if (KIND(e) === 'text') applyText(node, e);
      if (isVector(node.kind)) { const tc = e.clip || [0, 0, W, H]; setClip(node.el, animate && a && node.el._clip ? unionClip(node.el._clip, tc) : tc) }
      plan.push({ id, node, e, a, tl: elementTimeline(e) });
    } else if (a) {
      const ex = states[(lastState || target) - 1]?.get(id) || node.template;
      plan.push({ id, node, e: null, a, tl: { delay: ex.exitDelay || 0, dur: ex.exitDuration || EXIT, end: (ex.exitDelay || 0) + (ex.exitDuration || EXIT) } });
    } else if (node.pose && node.pose.opacity > 0) { render(id, node, node.template, { ...node.pose, opacity: 0 }) }
  }
  lastState = target;
  const maxEnd = Math.max(0, ...plan.map(p => p.tl.end));
  const step = t => {
    for (const p of plan) {
      if (p.done) continue;
      if (p.e) render(p.id, p.node, p.e, poseAt(p.node, p.e, p.a, t, p.tl));
      else render(p.id, p.node, p.node.template, { ...p.a, opacity: mix(p.a.opacity, 0, ease(clamp((t - p.tl.delay) / p.tl.dur))) });
      if (t >= p.tl.end) { p.done = true; if (p.e && isVector(p.node.kind)) setClip(p.node.el, p.e.clip || [0, 0, W, H]) }
    }
  };
  drawEntry(to); syncVideos(to);
  if (!animate) { step(1e9); return }
  let begin; const frame = now => { begin ??= now; const t = now - begin; step(t); if (t < maxEnd + 30) raf = requestAnimationFrame(frame) };
  step(0); raf = requestAnimationFrame(frame);
}
function syncVideos(to) {
  // play the videos that belong to this state from the start, pause the rest
  for (const [id, node] of nodes) {
    if (node.kind !== 'video') continue; const v = node.el.querySelector('video'); if (!v) continue;
    if (to.has(id)) { if (v.paused || v.ended) { try { v.currentTime = 0 } catch (e) { } const p = v.play(); if (p) p.catch(() => { }) } }
    else if (!v.paused) v.pause();
  }
}
let lastState = null;
function fit() { const box = document.querySelector('#viewport').getBoundingClientRect(); slide.style.transform = `scale(${Math.min(box.width / W, box.height / H)})` }
function pause() { playing = false; clearTimeout(playTimer); document.querySelector('#play').textContent = 'Play' }
function holdFor(i) { return (RAW[i - 1].holdSeconds || 4) * 1000 }
function advance() { if (!playing) return; const next = nextVisible(1); if (next === undefined) { pause(); return } if (RAW[next - 1].skip) { skipRun(next, () => { playTimer = setTimeout(advance, holdFor(current)) }); return } goToState(next); playTimer = setTimeout(advance, holdFor(current)) }
function play() { if (playing) { pause(); return } if (nextVisible(1) === undefined) goToState(visibleStates[0], false); playing = true; document.querySelector('#play').textContent = 'Pause'; playTimer = setTimeout(advance, holdFor(current)); showControls() }
// Pages marked skip: true flash blurred under a red X, then the deck moves on (forward); going back jumps over them.
const SKIP_MS = 480; let skipping = false;
function skipRun(n, then) {
  skipping = true; goToState(n, false); slide.classList.add('skipping');
  setTimeout(() => {
    const after = visibleStates.find(k => k > n);
    if (after !== undefined && RAW[after - 1].skip) return skipRun(after, then);
    slide.classList.remove('skipping'); skipping = false; if (after !== undefined) goToState(after); if (then) then();
  }, SKIP_MS);
}
function step(dir) {
  pause(); if (skipping) return; let next = nextVisible(dir);
  if (next !== undefined && RAW[next - 1].skip) {
    if (dir > 0) skipRun(next);
    else { while (next !== undefined && RAW[next - 1].skip) next = visibleStates.findLast(k => k < next); if (next !== undefined) goToState(next) }
  } else if (next !== undefined) goToState(next);
  showControls()
}
function showControls() { document.body.classList.remove('controls-hidden'); clearTimeout(hideTimer); hideTimer = setTimeout(() => { if (!document.querySelector('#controls').matches(':hover') && document.querySelector('#helptext').hidden) document.body.classList.add('controls-hidden') }, 2200) }
async function fullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen() } catch (e) { console.info('Use the browser fullscreen menu.', e) } }

// ---------- notes overlay and speaker view ----------
let presenterWin = null;
function notesFor(i) { return (RAW[i - 1] && RAW[i - 1].notes) || '' }
function updateNotes() {
  const box = document.querySelector('#notes'); if (box) box.querySelector('.notes-body').textContent = notesFor(current);
  if (PRESENTER) {
    document.querySelector('#pv-notes').textContent = notesFor(current);
    document.querySelector('#pv-count').textContent = `${current} / ${visibleStates.length}`;
    const nx = nextVisible(1), holder = document.querySelector('#pv-next'); holder.replaceChildren();
    if (nx !== undefined) { const scene = sceneFor(nx - 1); holder.append(scene); scene.style.transform = `scale(${(holder.clientWidth || 400) / W})`; } else holder.textContent = 'End';
  }
}
function broadcast() {
  const msg = { type: 'drift-deck', state: current };
  try { if (presenterWin && !presenterWin.closed) presenterWin.postMessage(msg, '*') } catch (e) { }
  try { if (PRESENTER && window.opener) window.opener.postMessage({ ...msg, from: 'presenter' }, '*') } catch (e) { }
}
addEventListener('message', ev => { const d = ev.data; if (!d || d.type !== 'drift-deck') return; if (d.from === 'presenter' && !presenterWin) presenterWin = ev.source; if (d.state !== current) goToState(d.state, true, true) });
function openPresenter() { const u = new URL(location.href); u.searchParams.set('presenter', ''); u.searchParams.set('state', current); presenterWin = window.open(u.href, 'drift-speaker-view', 'width=1280,height=780') }
function toggleNotes() { const box = document.querySelector('#notes'); box.hidden = !box.hidden; updateNotes() }

addEventListener('resize', fit); addEventListener('pointermove', showControls);
document.querySelector('#play').onclick = play; document.querySelector('#previous').onclick = () => step(-1); document.querySelector('#next').onclick = () => step(1);
document.querySelector('#fullscreen').onclick = fullscreen;
document.querySelector('#scrub').oninput = e => { pause(); goToState(Number(e.target.value), false); showControls() };
document.querySelector('#help').onclick = () => { const h = document.querySelector('#helptext'); h.hidden = !h.hidden; showControls() };
addEventListener('keydown', e => {
  if (e.key === ' ' && e.target.closest('button')) return; const k = e.key.toLowerCase();
  if (k === 't') { toggleSidebar(); return } if (k === 'n') { toggleNotes(); return } if (k === 's' && !PRESENTER) { openPresenter(); return }
  if (e.target.tagName === 'INPUT' && ['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  if ([' ', 'ArrowRight', 'ArrowLeft', 'Home', 'End', 'PageDown', 'PageUp'].includes(e.key)) e.preventDefault();
  if (e.key === ' ') play(); if (e.key === 'ArrowRight' || e.key === 'PageDown') step(1); if (e.key === 'ArrowLeft' || e.key === 'PageUp') step(-1);
  if (e.key === 'Home') { pause(); goToState(1) } if (e.key === 'End') { pause(); goToState(lastVisible) }
  if (k === 'f') fullscreen(); if (k === 'h') document.body.classList.toggle('controls-hidden');
});

// ---------- thumbnails (static, completed composition) ----------
function sceneFor(index) {
  const scene = document.createElement('div'); scene.className = 'thumbnail-scene'; scene.setAttribute('aria-hidden', 'true');
  for (const [id, e] of states[index]) {
    const el = document.createElement('div'); el.className = 'element'; el.style.zIndex = nodes.get(id).el.style.zIndex;
    if (isVector(KIND(e))) { content(el, e, true); el.style.opacity = e.opacity ?? 1; scene.append(el); continue }
    const p = e.position; Object.assign(el.style, { left: p.left + 'px', top: p.top + 'px', width: Math.max(1, p.width) + 'px', height: Math.max(1, p.height) + 'px', transform: `rotate(${p.rotation || 0}deg)` });
    el.style.opacity = e.opacity ?? 1; content(el, e.media === 'video' ? { ...e, media: undefined, src: e.poster, alt: e.alt } : e); scene.append(el);
  }
  return scene;
}
let thumbnailsBuilt = false;
function drawThumbnail(button, index) { if (button.dataset.rendered) return; button.dataset.rendered = 'true'; button.querySelector('.thumbnail-image').append(sceneFor(index)) }
function buildThumbnails() {
  if (thumbnailsBuilt) return; thumbnailsBuilt = true; const list = document.querySelector('#thumbnail-list');
  const observer = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) { drawThumbnail(entry.target, Number(entry.target.dataset.index)); observer.unobserve(entry.target) } }, { root: list, rootMargin: '200px' });
  states.forEach((state, index) => {
    if (RAW[index].hidden) return;
    if (index === 0 || RAW[index].section !== RAW[index - 1].section) { const heading = document.createElement('h2'); heading.textContent = RAW[index].sectionTitle; list.append(heading) }
    const button = document.createElement('button'); button.type = 'button'; button.className = 'state-thumb'; button.dataset.index = index; button.dataset.state = index + 1;
    const description = RAW[index].description || `State ${index + 1}`; button.title = `State ${index + 1}: ${description}`; button.setAttribute('aria-label', button.title);
    const image = document.createElement('div'); image.className = 'thumbnail-image';
    const label = document.createElement('div'); label.className = 'thumbnail-label'; const number = document.createElement('strong'); number.textContent = index + 1; const name = document.createElement('span'); name.textContent = description; label.append(number, name);
    button.append(image, label); button.onclick = () => { pause(); goToState(index + 1); showControls() }; list.append(button); observer.observe(button);
  });
}
function updateThumbnailSelection() {
  for (const button of document.querySelectorAll('.state-thumb')) { const selected = Number(button.dataset.state) === current; button.classList.toggle('selected', selected); if (selected) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current') }
  if (document.body.classList.contains('sidebar-open')) document.querySelector('.state-thumb.selected')?.scrollIntoView({ block: 'nearest' });
}
function toggleSidebar() {
  const open = !document.body.classList.contains('sidebar-open'); document.body.classList.toggle('sidebar-open', open); document.querySelector('#sidebar').hidden = !open;
  const toggle = document.querySelector('#sidebar-toggle'); toggle.setAttribute('aria-expanded', String(open)); toggle.title = (open ? 'Hide' : 'Show') + ' slide thumbnails (T)';
  if (open) { buildThumbnails(); updateThumbnailSelection() } fit();
}
document.querySelector('#sidebar-toggle').onclick = toggleSidebar;
document.addEventListener('click', e => { if (e.defaultPrevented || e.button !== 0 || e.target.closest('button,a,input,select,textarea,#sidebar,#controls,#helptext,#notes,#pv-panel')) return; step(1) });

// ---------- speaker-view layout ----------
if (PRESENTER) {
  document.body.classList.add('presenter');
  const panel = document.createElement('aside'); panel.id = 'pv-panel';
  panel.innerHTML = '<div class="pv-top"><span id="pv-count"></span><span id="pv-clock">00:00</span><button id="pv-reset" title="Reset timer">Reset</button></div><div class="pv-label">Next</div><div id="pv-next" class="pv-next"></div><div class="pv-label">Notes</div><div id="pv-notes"></div>';
  document.body.append(panel);
  let t0 = Date.now(); setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); document.querySelector('#pv-clock').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0') }, 500);
  document.querySelector('#pv-reset').onclick = () => { t0 = Date.now() };
  document.title = 'Speaker view · ' + document.title;
}
window.rayzer = { goToState(index, animate = true) { pause(); goToState(index, animate) }, get currentState() { return current }, states, play, pause };
document.querySelector('#scrub').max = lastVisible; document.querySelector('#sidebar header span').textContent = visibleStates.length + ' states';
fit(); goToState(new URLSearchParams(location.search).get('state') || 1, false); showControls();
