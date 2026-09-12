import { hash } from './model.js';

export const PHASES = ['command', 'target', 'cast', 'attack', 'damage', 'message'];
const CUTOFFS = [0.65, 1.2, 1.9, 2.45, 3.35, 4.7];
export function phaseAt(elapsed) {
  return PHASES[CUTOFFS.findIndex(t => elapsed < t)] || 'done';
}
const ENEMIES = [{ x: 175, y: 345 }, { x: 350, y: 305 }, { x: 525, y: 380 }];
const HEROES = [{ x: 715, y: 259 }, { x: 750, y: 303 }, { x: 785, y: 347 }, { x: 820, y: 391 }];
const COLORS = { strike: '#ffdc9b', magic: '#c9adff', support: '#8cffe0', guard: '#8bc7ff' };
const loadImage = src => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error(`Asset unavailable: ${src}`));
  img.src = src;
});
export class BattleRenderer {
  constructor(canvas, model, translate) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.model = model;
    this.t = translate;
    this.runtime = new Map();
    this.page = 0;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  async load() {
    [this.background, this.atlas] = await Promise.all([
      loadImage(new URL('../assets/moonlit-ruins.png', import.meta.url)),
      loadImage(new URL('../assets/combatants.png', import.meta.url)),
      document.fonts.load('16px Pixel'),
    ]);
    // Tight source rectangles within the atlas cells retain the original alpha.
    const scratch = document.createElement('canvas');
    scratch.width = this.atlas.width; scratch.height = this.atlas.height;
    const ctx = scratch.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(this.atlas, 0, 0);
    this.rects = [];
    for (let row = 0; row < 2; row++) for (let col = 0; col < 4; col++) {
      const x = Math.round(col * scratch.width / 4), y = Math.round(row * scratch.height / 2);
      const w = Math.round((col + 1) * scratch.width / 4) - x;
      const h = Math.round((row + 1) * scratch.height / 2) - y;
      const pixels = ctx.getImageData(x, y, w, h).data;
      let left = w, top = h, right = 0, bottom = 0;
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
        if (pixels[(py * w + px) * 4 + 3] < 40) continue;
        left = Math.min(left, px); top = Math.min(top, py);
        right = Math.max(right, px); bottom = Math.max(bottom, py);
      }
      this.rects.push({ x: x + left, y: y + top, w: right - left + 1, h: bottom - top + 1 });
    }
  }
  async loadActors(names, basePath) {
    await Promise.allSettled(names.filter(name => !this.runtime.has(name)).map(async name => {
      this.runtime.set(name, null);
      try {
        // Same runtime character contract as /workspace/pixel/.
        const img = await loadImage(`${basePath}/api/animas/${encodeURIComponent(name)}/assets/pixel_sheet.png`);
        if (img.width === 256 && img.height === 640) this.runtime.set(name, img);
      } catch { /* generated job sprites are the normal fallback */ }
    }));
  }
  visible(action) {
    const actors = [...this.model.actors.values()];
    const activeIndex = actors.findIndex(a => a.name === action?.actor);
    if (activeIndex >= 0) this.page = Math.floor(activeIndex / 4);
    this.page %= Math.max(1, Math.ceil(actors.length / 4));
    const party = actors.slice(this.page * 4, this.page * 4 + 4);
    const tasks = [...this.model.tasks.values()];
    const target = tasks.find(t => t.key === action?.target);
    const enemies = tasks.slice(0, 3);
    if (target && !enemies.includes(target)) enemies[2] = target;
    return { party, enemies, totalActors: actors.length, totalTasks: tasks.length };
  }
  text(text, x, y, color = '#eef2df', size = 14, align = 'center') {
    const c = this.ctx;
    c.font = `${size}px Pixel, monospace`; c.textAlign = align;
    c.fillStyle = '#081323'; c.fillText(text, Math.round(x + 2), Math.round(y + 2));
    c.fillStyle = color; c.fillText(text, Math.round(x), Math.round(y));
  }
  sprite(index, x, y, height, alpha = 1, rotation = 0) {
    const r = this.rects[index], c = this.ctx;
    if (!r || r.w <= 0 || r.h <= 0) return;
    const w = Math.round(height * r.w / r.h);
    c.save(); c.translate(Math.round(x), Math.round(y)); c.rotate(rotation); c.globalAlpha = alpha;
    c.drawImage(this.atlas, r.x, r.y, r.w, r.h, -Math.round(w / 2), -height, w, height);
    c.restore();
  }
  draw(now, action, elapsed = 0, damage = 0) {
    const c = this.ctx, phase = action ? phaseAt(elapsed) : 'idle';
    const { party, enemies } = this.visible(action);
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, 960, 440);
    c.drawImage(this.background, 0, 0, 960, 500);
    c.fillStyle = '#04112022'; c.fillRect(0, 0, 960, 440);
    // Sparse, slow drifting motes; disabled with reduced motion.
    if (!this.reduced) for (let i = 0; i < 19; i++) {
      const x = (i * 131 + now * (3 + i % 3)) % 960;
      const y = 65 + (i * 71 % 330) + Math.sin(now + i) * 4;
      c.fillStyle = i % 3 ? '#9cdcc755' : '#f1d99d99'; c.fillRect(x | 0, y | 0, 2, 2);
    }
    enemies.forEach((enemy, i) => {
      const p = ENEMIES[i], selected = action?.target === enemy.key;
      const dying = selected && action.finish && ['damage', 'message'].includes(phase);
      const retreating = selected && action.retreat && ['damage', 'message'].includes(phase);
      const progress = Math.max(0, Math.min(1, (elapsed - 2.45) / 1.1));
      const bob = this.reduced ? 0 : Math.sin(now * 2 + i * 2) * (enemy.sprite === 1 ? 5 : 1);
      const shake = selected && phase === 'damage' && !this.reduced && !action.error ? Math.sin(elapsed * 70) * 4 * (1 - progress) : 0;
      c.fillStyle = '#03111d66'; c.beginPath(); c.ellipse(p.x, p.y + 3, 44, 8, 0, 0, Math.PI * 2); c.fill();
      const h = [112, 104, 145, 154][enemy.sprite];
      const fade = dying || retreating ? 1 - progress : 1;
      this.sprite(enemy.sprite + 4, p.x + shake - (retreating ? progress * 60 : 0), p.y + bob, h, fade);
      const label = enemy.titleKey ? this.t(enemy.titleKey) : enemy.title;
      if (!dying && !retreating) this.text(label.length > 17 ? label.slice(0, 16) + '…' : label, p.x, p.y + 23, '#d9e9dd', 11);
      if (selected && ['target', 'cast', 'attack'].includes(phase)) {
        this.text('▼', p.x, p.y - h - 13, '#fff2b6', 19);
        c.strokeStyle = '#ffebb788'; c.lineWidth = 2; c.beginPath(); c.ellipse(p.x, p.y + 4, 48, 10, 0, 0, Math.PI * 2); c.stroke();
      }
      if (dying && !this.reduced) for (let j = 0; j < 18; j++) {
        c.fillStyle = `rgba(239,218,153,${1 - progress})`;
        c.fillRect(p.x + Math.sin(j * 8) * progress * 90, p.y - h / 2 + Math.cos(j * 5) * progress * 80, 4, 4);
      }
    });
    party.forEach((actor, i) => {
      const p = HEROES[i], selected = actor.name === action?.actor;
      let x = p.x, y = p.y, tilt = 0;
      if (!this.reduced) y += Math.round(Math.sin(now * 2 + i) * 1.2);
      if (selected && !this.reduced) {
        if (phase === 'cast') { x -= 15; y -= Math.sin((elapsed - 1.2) * 15) * 2; }
        if (phase === 'attack') {
          const progress = (elapsed - 1.9) / .55;
          x -= Math.sin(progress * Math.PI) * (action.command === 'strike' ? 170 : 30);
          tilt = action.command === 'strike' ? -Math.sin(progress * Math.PI) * .15 : 0;
        }
        if (phase === 'message' && action.finish) y -= Math.abs(Math.sin((elapsed - 3.35) * 8)) * 7;
      }
      c.fillStyle = '#020e1a77'; c.beginPath(); c.ellipse(x, p.y + 2, 24, 5, 0, 0, Math.PI * 2); c.fill();
      const runtime = this.runtime.get(actor.name);
      if (runtime) {
        const row = selected ? phase === 'attack' ? 6 : phase === 'message' && action.finish ? 8 : 1 : 0;
        const frame = this.reduced ? 0 : Math.floor(now * 6) % 4;
        c.drawImage(runtime, frame * 64, row * 64, 64, 64, Math.round(x - 48), Math.round(y - 88), 96, 96);
      } else this.sprite(actor.sprite, x, y, 77, actor.state === 'offline' ? .5 : 1, tilt);
      this.text(actor.name, p.x + 49, p.y - 30, selected ? '#ffedb2' : '#c0d9df', 12, 'left');
      if (selected && phase === 'command') this.text('▶', x - 53, y - 40, '#fff5c6', 19);
      if (selected && ['cast', 'attack'].includes(phase)) {
        const color = COLORS[action.command];
        c.strokeStyle = color; c.lineWidth = 2;
        c.beginPath(); c.ellipse(x, y - 4, 32, 10, 0, 0, Math.PI * 2); c.stroke();
        if (!this.reduced) for (let j = 0; j < 8; j++) {
          const a = now * 5 + j * Math.PI / 4;
          c.fillStyle = color; c.fillRect(x + Math.cos(a) * 28, y - 35 + Math.sin(a) * 20, 3, 3);
        }
      }
    });
    if (action) {
      const ei = enemies.findIndex(e => e.key === action.target);
      const ai = party.findIndex(a => a.name === action.actor);
      if (ei >= 0 && ai >= 0) {
        const p = ENEMIES[ei], a = HEROES[ai];
        if (phase === 'attack') this.effect(action.command, a, p, (elapsed - 1.9) / .55);
        if (phase === 'damage') {
          const lift = this.reduced ? 0 : Math.sin(Math.min(1, (elapsed - 2.45) / .9) * Math.PI) * 24;
          const word = action.retreat ? this.t('battle.retreat_number') : action.error ? this.t('battle.miss') : action.command === 'guard' ? this.t('battle.guard_number') : String(damage);
          this.text(word, p.x, p.y - 84 - lift, action.error ? '#ff9fba' : COLORS[action.command], 29);
        }
      }
    }
  }
  effect(command, from, to, progress) {
    const c = this.ctx, color = COLORS[command];
    c.save(); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 4;
    if (this.reduced) { c.strokeRect(to.x - 35, to.y - 95, 70, 75); c.restore(); return; }
    if (command === 'strike') {
      for (let i = 0; i < 3; i++) {
        const x = to.x - 45 + i * 20;
        c.globalAlpha = Math.max(0, Math.sin(progress * Math.PI));
        c.beginPath(); c.moveTo(x, to.y - 120); c.lineTo(x + 65, to.y - 30); c.stroke();
      }
    } else if (command === 'magic') {
      const x = from.x + (to.x - from.x) * progress, y = from.y - 45 + (to.y - from.y) * progress;
      for (let i = 0; i < 8; i++) {
        c.globalAlpha = 1 - i / 9;
        c.fillRect(x + i * 8, y + Math.sin(i + progress * 12) * 6, 13 - i, 13 - i);
      }
      if (progress > .7) { c.beginPath(); c.arc(to.x, to.y - 65, (progress - .7) * 190, 0, Math.PI * 2); c.stroke(); }
    } else if (command === 'support') {
      c.setLineDash([7, 6]); c.beginPath(); c.moveTo(from.x, from.y - 40); c.lineTo(to.x, to.y - 65); c.stroke();
      for (let i = 0; i < 5; i++) { const x = to.x - 40 + i * 20, y = to.y - 65 - Math.sin(progress * Math.PI) * 25; c.fillRect(x, y, 4, 12); c.fillRect(x - 4, y + 4, 12, 4); }
    } else {
      c.beginPath(); c.arc(from.x, from.y - 40, 43, -.6 * Math.PI, .6 * Math.PI, true); c.stroke();
    }
    c.restore();
  }
}
