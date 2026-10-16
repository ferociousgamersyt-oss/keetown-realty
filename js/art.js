/* Generative property illustrations in the Keetown palette (no photos needed). Returns SVG markup.
 * Two moods, chosen per listing: "day" (pale porcelain) and "dusk" (deep blue with window glow). */
window.KTArt = function (p, w = 400, h = 260) {
  const seed = p.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rnd = i => { const x = Math.sin(seed * 97 + i * 13.37) * 10000; return x - Math.floor(x); };
  const day = (p.hue || 0) % 2 === 0, hue = 212 + ((p.hue || 0) % 34);   // 212–245: blue → indigo
  const id = 'g' + p.id.replace(/[^a-z0-9_]/gi, '');
  const sky = day ? [`hsl(${hue} 60% 93%)`, `hsl(${hue} 55% 80%)`] : [`hsl(${hue} 55% 12%)`, `hsl(${hue - 6} 48% 34%)`];
  const body = day ? (i => `hsl(${hue} ${30 + rnd(i) * 10}% ${86 - rnd(i + 3) * 10}%)`) : (i => `hsl(${hue} 40% ${11 + rnd(i) * 9}%)`);
  const side = day ? `hsl(${hue} 32% 74%)` : `hsl(${hue} 42% 8%)`, edge = day ? `hsla(${hue},55%,40%,.35)` : 'hsla(215,60%,80%,.08)';
  const win = day ? `hsla(${hue},55%,42%,.55)` : 'rgba(214,228,255,.88)';
  const ground = h - Math.round(h * .14);
  let s = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
    <radialGradient id="${id}g" cx=".72" cy=".28" r=".55"><stop offset="0" stop-color="${day ? '#ffffff' : 'rgba(169,196,238,.55)'}" stop-opacity="${day ? .9 : .6}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${day ? `hsl(${hue} 40% 84%)` : `hsl(${hue} 45% 9%)`}"/><stop offset="1" stop-color="${day ? `hsl(${hue} 35% 76%)` : `hsl(${hue} 45% 6%)`}"/></linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#${id}s)"/><rect width="${w}" height="${h}" fill="url(#${id}g)"/>`;
  // distant skyline haze
  let x = -10, i = 0; s += `<g opacity="${day ? .35 : .3}">`;
  while (x < w) { const bw = 26 + rnd(i + 40) * 30, bh = h * (.18 + rnd(i + 50) * .22); s += `<rect x="${x}" y="${ground - bh}" width="${bw}" height="${bh}" fill="${day ? `hsl(${hue} 35% 72%)` : `hsl(${hue} 45% 22%)`}"/>`; x += bw + 3; i++; }
  s += '</g>';
  if (p.type === 'Plot') {
    s += `<path d="M0 ${ground - 6} L${w} ${ground - 26} V${h} H0Z" fill="url(#${id}f)"/>`;
    s += `<path d="M${w * .14} ${h} L${w * .36} ${ground - 4} L${w * .82} ${ground - 18} L${w} ${h}Z" fill="none" stroke="${day ? `hsl(${hue} 55% 42%)` : '#a9c4ee'}" stroke-width="2" stroke-dasharray="6 6"/>`;
    [.3, .52, .74].forEach((f, k) => s += `<rect x="${w * f}" y="${ground - 34 - k * 5}" width="3" height="24" rx="1.5" fill="${day ? `hsl(${hue} 55% 42%)` : '#a9c4ee'}"/>`);
  } else if (p.type === 'Villa' || p.type === 'Independent house') {
    s += `<rect y="${ground}" width="${w}" height="${h - ground}" fill="url(#${id}f)"/>`;
    const bw = w * .52, bx = (w - bw) / 2, bh = h * .38, by = ground - bh;
    s += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${day ? '#fff' : `hsl(${hue} 30% 20%)`}"/><rect x="${bx + bw * .62}" y="${by - bh * .32}" width="${bw * .38}" height="${bh * .32}" fill="${day ? '#f4f8ff' : `hsl(${hue} 30% 16%)`}"/>`;
    s += `<path d="M${bx - 10} ${by} H${bx + bw + 10}" stroke="${day ? `hsl(${hue} 45% 30%)` : '#a9c4ee'}" stroke-width="4"/>`;
    for (let k = 0; k < 4; k++) s += `<rect x="${bx + 14 + k * (bw - 28) / 4}" y="${by + bh * .22}" width="${(bw - 28) / 4 - 10}" height="${bh * .36}" rx="2" fill="${win}"/>`;
    s += `<rect x="${bx + bw / 2 - 14}" y="${ground - bh * .4}" width="28" height="${bh * .4}" fill="${day ? `hsl(${hue} 45% 32%)` : '#0b1a33'}"/>`;
    [[w * .12, 26], [w * .88, 22]].forEach(([tx, r]) => s += `<circle cx="${tx}" cy="${ground - r * .9}" r="${r}" fill="${day ? `hsl(${hue - 30} 25% 62%)` : `hsl(${hue} 35% 16%)`}"/>`);
  } else {
    s += `<rect y="${ground}" width="${w}" height="${h - ground}" fill="url(#${id}f)"/>`;
    x = 10; i = 0;
    while (x < w - 20) {
      const bw = w * (.1 + rnd(i + 5) * .08), tall = i === 2 || i === 4, bh = h * (.32 + rnd(i + 9) * .32) + (tall ? h * .14 : 0), d = bw * .28;
      s += `<path d="M${x + bw} ${ground} V${ground - bh} l${d} ${-d * .5} V${ground - d * .5} Z" fill="${side}"/><path d="M${x} ${ground - bh} l${d} ${-d * .5} H${x + bw + d} l${-d} ${d * .5}Z" fill="${day ? '#fff' : `hsl(${hue} 35% 26%)`}"/>`;
      s += `<rect x="${x}" y="${ground - bh}" width="${bw}" height="${bh}" fill="${body(i)}" stroke="${edge}"/>`;
      for (let wy = ground - bh + 10; wy < ground - 12; wy += 13) for (let wx = x + 6; wx < x + bw - 8; wx += 10) if (rnd(wx * wy + i) > (day ? .5 : .4)) s += `<rect x="${wx}" y="${wy}" width="4" height="6" rx="1" fill="${win}"/>`;
      x += bw + d + 6; i++;
    }
  }
  return s + '</svg>';
};
