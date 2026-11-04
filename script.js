/* =========================================================
   Chandana's Birthday Surprise
   Plain JavaScript – works when index.html is opened directly
   (no modules, no fetch, no server needed).

   States:  WELCOME -> PLAYING -> GAME_OVER -> BIRTHDAY
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     0. Helpers & global state
     --------------------------------------------------------- */
  var STATE = { WELCOME: 'WELCOME', PLAYING: 'PLAYING', GAME_OVER: 'GAME_OVER', BIRTHDAY: 'BIRTHDAY' };
  var state = STATE.WELCOME;

  var TAU = Math.PI * 2;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function $(id) { return document.getElementById(id); }

  var screens = { welcome: $('welcome'), game: $('game'), birthday: $('birthday') };

  /* ---------------------------------------------------------
     1. Sprites – every flower / petal / heart is drawn with
        canvas paths (no extra image files needed).
     --------------------------------------------------------- */
  var SP = { flowers: [], petals: [], hearts: [], sparkle: null, bird: null };

  function makeCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  function flowerSprite(inner, outer, centre, size) {
    var c = makeCanvas(size, size), x = c.getContext('2d');
    var cx = size / 2, r = size * 0.46, n = 5, i;
    for (i = 0; i < n; i++) {
      x.save();
      x.translate(cx, cx);
      x.rotate(i * TAU / n);
      var g = x.createRadialGradient(0, -r * 0.55, r * 0.04, 0, -r * 0.55, r * 0.55);
      g.addColorStop(0, inner);
      g.addColorStop(1, outer);
      x.fillStyle = g;
      x.beginPath();
      x.ellipse(0, -r * 0.56, r * 0.36, r * 0.52, 0, 0, TAU);
      x.fill();
      x.restore();
    }
    var g2 = x.createRadialGradient(cx, cx, 0, cx, cx, r * 0.28);
    g2.addColorStop(0, '#fff9c4');
    g2.addColorStop(1, centre);
    x.fillStyle = g2;
    x.beginPath(); x.arc(cx, cx, r * 0.22, 0, TAU); x.fill();
    return c;
  }

  function petalSprite(a, b) {
    var c = makeCanvas(32, 32), x = c.getContext('2d');
    var g = x.createLinearGradient(4, 2, 28, 30);
    g.addColorStop(0, a); g.addColorStop(1, b);
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(16, 2);
    x.bezierCurveTo(31, 7, 29, 26, 16, 30);
    x.bezierCurveTo(3, 26, 1, 7, 16, 2);
    x.fill();
    return c;
  }

  function heartSprite(a, b) {
    var c = makeCanvas(48, 48), x = c.getContext('2d');
    var g = x.createLinearGradient(8, 6, 40, 42);
    g.addColorStop(0, a); g.addColorStop(1, b);
    x.shadowColor = 'rgba(255,255,255,.9)'; x.shadowBlur = 6;
    x.fillStyle = g;
    var s = 30, px = 24, py = 10;
    x.beginPath();
    x.moveTo(px, py + s * 0.3);
    x.bezierCurveTo(px, py, px - s * 0.5, py, px - s * 0.5, py + s * 0.3);
    x.bezierCurveTo(px - s * 0.5, py + s * 0.62, px, py + s * 0.8, px, py + s);
    x.bezierCurveTo(px, py + s * 0.8, px + s * 0.5, py + s * 0.62, px + s * 0.5, py + s * 0.3);
    x.bezierCurveTo(px + s * 0.5, py, px, py, px, py + s * 0.3);
    x.fill();
    return c;
  }

  function sparkleSprite() {
    var c = makeCanvas(48, 48), x = c.getContext('2d');
    x.shadowColor = '#ff4fa3'; x.shadowBlur = 8;
    x.fillStyle = '#ffffff';
    x.beginPath();
    var i, R, a;
    for (i = 0; i < 8; i++) {
      R = (i % 2 === 0) ? 20 : 5;
      a = i * Math.PI / 4 - Math.PI / 2;
      x[i ? 'lineTo' : 'moveTo'](24 + Math.cos(a) * R, 24 + Math.sin(a) * R);
    }
    x.closePath(); x.fill();
    return c;
  }

  function buildSprites() {
    var defs = [
      ['#fff0f7', '#ff7fbf', '#ffb300'],
      ['#ffd1e8', '#ff3d9a', '#ff9800'],
      ['#f6ecff', '#b97dff', '#ffca28'],
      ['#fff3ea', '#ffa98c', '#ff8f00'],
      ['#ffffff', '#ffa6d1', '#ffc107']
    ];
    SP.flowers = defs.map(function (d) { return flowerSprite(d[0], d[1], d[2], 96); });
    SP.petals = [['#ffe6f1', '#ff9ccb'], ['#ffffff', '#ffc4df'], ['#ff9fcc', '#ff4fa3'], ['#efdcff', '#c08bff']]
      .map(function (d) { return petalSprite(d[0], d[1]); });
    SP.hearts = [['#ffd0e8', '#ff4fa3'], ['#ffffff', '#ff8fc8'], ['#e7d0ff', '#ff5fb0']]
      .map(function (d) { return heartSprite(d[0], d[1]); });
    SP.sparkle = sparkleSprite();
  }
  buildSprites();

  /* Chandana's photo, used for the game character + floating bubbles */
  var photo = new Image();
  var photoReady = false;
  photo.onload = function () { photoReady = true; buildBirdSprite(); };
  photo.onerror = function () { photoReady = false; buildBirdSprite(); };
  photo.src = 'assets/chandana.jpg';

  function buildBirdSprite() {
    // 128px sprite = 64 logical game px (bird radius 24 + glow padding)
    var c = makeCanvas(128, 128), x = c.getContext('2d');
    // glowing pink border
    x.save();
    x.shadowColor = '#ff1493'; x.shadowBlur = 20;
    x.fillStyle = '#ff4fa3';
    x.beginPath(); x.arc(64, 64, 48, 0, TAU); x.fill();
    x.restore();
    // the photo, cropped to a circle (zoomed on the face)
    x.save();
    x.beginPath(); x.arc(64, 64, 43, 0, TAU); x.clip();
    if (photoReady) {
      try { x.drawImage(photo, 75, 80, 360, 360, 21, 21, 86, 86); } catch (e) { x.fillStyle = '#ffb3d9'; x.fillRect(0, 0, 128, 128); }
    } else {
      x.fillStyle = '#ffb3d9'; x.fillRect(0, 0, 128, 128);
    }
    x.restore();
    x.lineWidth = 3; x.strokeStyle = '#fff';
    x.beginPath(); x.arc(64, 64, 44.5, 0, TAU); x.stroke();
    SP.bird = c;
  }

  /* data-URL versions of the flower sprites for CSS / <img> decorations */
  var flowerURLs = SP.flowers.map(function (c) { return c.toDataURL('image/png'); });

  /* ---------------------------------------------------------
     2. Decorations built with the DOM (flower rings, butterflies)
     --------------------------------------------------------- */
  function addRing(container, count, fsFactor, ringRadius, offsetDeg) {
    var i, img;
    for (i = 0; i < count; i++) {
      img = document.createElement('img');
      img.src = flowerURLs[i % flowerURLs.length];
      img.alt = '';
      img.style.setProperty('--a', (offsetDeg + i * 360 / count) + 'deg');
      img.style.setProperty('--ra', rnd(-40, 40) + 'deg');
      img.style.setProperty('--rr', ringRadius);
      img.style.setProperty('--fs', 'calc(var(--ps) * ' + fsFactor + ')');
      container.appendChild(img);
    }
  }
  addRing($('orbitA'), 9, 0.2, 0.53, 0);
  addRing($('orbitB'), 12, 0.13, 0.66, 15);

  // Flowers around the final video frame
  (function buildFrameFlowers() {
    var host = $('frameFlowers');
    var spots = [
      [0, 0, 1], [50, -1, .8], [100, 0, 1], [0, 33, .7], [100, 33, .7], [0, 66, .75], [100, 66, .75],
      [0, 100, 1], [50, 101, .8], [100, 100, 1], [25, -1, .6], [75, -1, .6], [25, 101, .6], [75, 101, .6]
    ];
    spots.forEach(function (s, i) {
      var img = document.createElement('img');
      img.src = flowerURLs[i % flowerURLs.length];
      img.alt = '';
      img.style.left = s[0] + '%';
      img.style.top = s[1] + '%';
      img.style.setProperty('--fs', (34 * s[2]) + 'px');
      img.style.setProperty('--r0', rnd(-30, 30) + 'deg');
      img.style.setProperty('--sd', rnd(2.6, 4.8) + 's');
      img.style.animationDelay = (-rnd(0, 4)) + 's';
      host.appendChild(img);
    });
  })();

  (function buildButterflies() {
    var host = $('butterflies'), i, b;
    for (i = 0; i < 4; i++) {
      b = document.createElement('div');
      b.className = 'bfly';
      b.innerHTML = '<span>🦋</span>';
      b.style.setProperty('--d', rnd(20, 34) + 's');
      b.style.setProperty('--dl', (-rnd(0, 30)) + 's');
      ['--y0', '--y1', '--y2', '--y3', '--y4'].forEach(function (k) { b.style.setProperty(k, rnd(8, 85) + 'vh'); });
      host.appendChild(b);
    }
  })();

  /* ---------------------------------------------------------
     3. FX layer – falling petals, floating hearts, sparkles,
        confetti and little photo bubbles (welcome + final screens)
     --------------------------------------------------------- */
  var fx = { cv: $('fx'), ctx: $('fx').getContext('2d'), w: 0, h: 0, s: 1, parts: [], raf: 0, last: 0, mode: 'welcome', running: false };
  var CONFETTI = ['#ff4fa3', '#ffd54f', '#b97dff', '#ffffff', '#ff8fc8', '#7fe3ff'];
  var FX_MODES = {
    welcome:  { petal: 22, heart: 7,  sparkle: 12, flower: 5, photo: 3, confetti: 0 },
    birthday: { petal: 30, heart: 12, sparkle: 18, flower: 8, photo: 5, confetti: 26 }
  };

  function fxResize() {
    fx.s = Math.min(window.devicePixelRatio || 1, 1.5);   // capped for performance
    fx.w = window.innerWidth; fx.h = window.innerHeight;
    fx.cv.width = Math.round(fx.w * fx.s);
    fx.cv.height = Math.round(fx.h * fx.s);
  }

  function spawn(type, initial) {
    var p = { t: type, x: rnd(0, fx.w), ph: rnd(0, TAU) };
    switch (type) {
      case 'petal':
        p.s = rnd(12, 24); p.vy = rnd(0.7, 1.7); p.amp = rnd(0.3, 1.0); p.sw = rnd(0.012, 0.035);
        p.r = rnd(0, TAU); p.vr = rnd(-0.045, 0.045); p.img = pick(SP.petals); p.a = rnd(0.75, 1);
        p.y = initial ? rnd(0, fx.h) : rnd(-60, -10); break;
      case 'flower':
        p.s = rnd(22, 38); p.vy = rnd(0.5, 1.1); p.amp = rnd(0.2, 0.6); p.sw = rnd(0.01, 0.025);
        p.r = rnd(0, TAU); p.vr = rnd(-0.03, 0.03); p.img = pick(SP.flowers); p.a = rnd(0.8, 1);
        p.y = initial ? rnd(0, fx.h) : rnd(-60, -20); break;
      case 'heart':
        p.s = rnd(16, 34); p.vy = -rnd(0.5, 1.3); p.amp = rnd(0.3, 0.8); p.sw = rnd(0.015, 0.03);
        p.r = 0; p.vr = 0; p.img = pick(SP.hearts); p.a = rnd(0.55, 0.9);
        p.y = initial ? rnd(0, fx.h) : fx.h + rnd(10, 60); break;
      case 'photo':
        p.s = rnd(44, 62); p.vy = -rnd(0.3, 0.6); p.amp = rnd(0.3, 0.6); p.sw = rnd(0.01, 0.02);
        p.r = 0; p.vr = 0; p.a = 0.9;
        p.y = initial ? rnd(0, fx.h) : fx.h + rnd(40, 120); break;
      case 'sparkle':
        p.s = rnd(12, 26); p.y = rnd(0, fx.h); p.sw = rnd(0.02, 0.05); p.ph = initial ? rnd(0, TAU) : 0;
        p.r = rnd(0, 1); p.vr = rnd(-0.02, 0.02); p.a = 1; break;
      case 'confetti':
        p.w = rnd(6, 11); p.h = rnd(4, 7); p.vy = rnd(1.1, 2.6); p.amp = rnd(0.4, 1.2); p.sw = rnd(0.02, 0.05);
        p.r = rnd(0, TAU); p.vr = rnd(-0.12, 0.12); p.col = pick(CONFETTI); p.a = 1;
        p.y = initial ? rnd(0, fx.h) : rnd(-40, -5); break;
    }
    return p;
  }

  function fxSetMode(mode) {
    fx.mode = mode;
    var cfg = FX_MODES[mode], k = (fx.w < 480) ? 0.7 : 1, type, n, i;
    fx.parts = [];
    for (type in cfg) {
      n = Math.round(cfg[type] * k);
      for (i = 0; i < n; i++) fx.parts.push(spawn(type, true));
    }
  }

  function fxFrame(ts) {
    if (!fx.running) return;
    fx.raf = requestAnimationFrame(fxFrame);
    var dt = Math.min((ts - fx.last) / 16.667, 2.5);
    fx.last = ts;
    if (!(dt > 0)) dt = 1;

    var c = fx.ctx, s = fx.s, i, p, cs, sn, a;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, fx.cv.width, fx.cv.height);

    for (i = 0; i < fx.parts.length; i++) {
      p = fx.parts[i];
      switch (p.t) {
        case 'sparkle':
          p.ph += p.sw * dt;
          if (p.ph >= TAU) { p.ph = 0; p.x = rnd(0, fx.w); p.y = rnd(0, fx.h); p.s = rnd(12, 26); }
          p.a = Math.sin(p.ph / 2); p.r += p.vr * dt;
          break;
        case 'heart': case 'photo':
          p.ph += p.sw * dt; p.x += Math.sin(p.ph) * p.amp * dt; p.y += p.vy * dt;
          if (p.y < -80) fx.parts[i] = p = spawn(p.t, false);
          break;
        default: // petal, flower, confetti – falling
          p.ph += p.sw * dt; p.x += Math.sin(p.ph) * p.amp * dt; p.y += p.vy * dt; p.r += p.vr * dt;
          if (p.y > fx.h + 50) fx.parts[i] = p = spawn(p.t, false);
      }

      a = p.a; if (a <= 0.01) continue;
      c.globalAlpha = a;
      cs = Math.cos(p.r) * s; sn = Math.sin(p.r) * s;
      c.setTransform(cs, sn, -sn, cs, p.x * s, p.y * s);

      if (p.t === 'confetti') {
        c.fillStyle = p.col;
        c.scale(1, Math.abs(Math.sin(p.ph * 2)) + 0.15);          // fake 3D flip
        c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else if (p.t === 'photo') {
        if (SP.bird) c.drawImage(SP.bird, -p.s / 2, -p.s / 2, p.s, p.s);
      } else if (p.t === 'sparkle') {
        c.drawImage(SP.sparkle, -p.s / 2, -p.s / 2, p.s, p.s);
      } else {
        c.drawImage(p.img, -p.s / 2, -p.s / 2, p.s, p.s);
      }
    }
    c.globalAlpha = 1;
  }

  function fxStart(mode) {
    fxStop();
    fxResize();
    fxSetMode(mode);
    fx.cv.style.display = 'block';
    fx.running = true;
    fx.last = performance.now();
    fx.raf = requestAnimationFrame(fxFrame);
  }
  function fxStop() {
    fx.running = false;
    if (fx.raf) cancelAnimationFrame(fx.raf);
    fx.raf = 0;
  }

  /* ---------------------------------------------------------
     4. Sound – one tiny "pop" generated with the Web Audio API.
        The AudioContext is only created after the user taps START.
     --------------------------------------------------------- */
  var audioCtx = null;
  function initAudio() {
    if (audioCtx) { if (audioCtx.state === 'suspended') audioCtx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { audioCtx = new AC(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) { audioCtx = null; }
  }
  function playPop() {
    if (!audioCtx) return;
    try {
      var t = audioCtx.currentTime;
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(480, t);
      o.frequency.exponentialRampToValueAtTime(980, t + 0.07);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t); o.stop(t + 0.13);
    } catch (e) { /* ignore */ }
  }

  /* ---------------------------------------------------------
     5. Screen switching
     --------------------------------------------------------- */
  function showScreen(name) {
    Object.keys(screens).forEach(function (k) {
      if (k === name) return;
      var s = screens[k];
      if (!s.classList.contains('show')) return;
      s.classList.remove('active');
      setTimeout(function () { if (!s.classList.contains('active')) s.classList.remove('show'); }, 800);
    });
    var next = screens[name];
    next.classList.add('show');
    void next.offsetWidth;            // flush so the fade-in transition runs
    next.classList.add('active');
  }

  /* ---------------------------------------------------------
     6. The Flappy game
     --------------------------------------------------------- */
  var cv = $('gameCanvas'), ctx = cv.getContext('2d');

  // Physics / layout constants (logical units; one logical px ≈ 1 CSS px at scale 1)
  var GRAVITY = 0.42, FLAP = -7.1, MAX_FALL = 10;
  var BIRD_R = 24, HIT_R = 17;
  var PIPE_W = 64, CAP_H = 26, CAP_EX = 5;
  var GROUND_H = 72, PIPE_SPACING = 215;

  var G = {
    W: 360, H: 640, scale: 1, dpr: 1,
    raf: 0, last: 0, t: 0,
    started: false, score: 0, inputAt: 0,
    bird: { x: 100, y: 300, vy: 0, rot: 0, wing: 0 },
    pipes: [], clouds: [], petals: [], sparks: [], stars: [],
    groundX: 0, hillX: 0, lastF: 0.5,
    skyGrad: null, groundGrad: null, pipeGrad: null, sunGrad: null
  };

  /* Fit the canvas to the screen. Logical width is >= 360 so the game
     plays the same on every phone, tablet or desktop. */
  function resizeGame() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var cssW = Math.min(vw, 480), cssH = vh;
    var oldH = G.H;
    G.scale = Math.min(cssH / 640, cssW / 360);
    G.W = cssW / G.scale;
    G.H = cssH / G.scale;
    G.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cv.style.width = cssW + 'px';
    cv.style.height = cssH + 'px';
    cv.width = Math.round(cssW * G.dpr);
    cv.height = Math.round(cssH * G.dpr);

    // keep the bird at the same relative height if the screen was rotated mid-game
    if (oldH && oldH !== G.H) G.bird.y = G.bird.y * (G.H / oldH);
    G.bird.x = clamp(G.W * 0.28, 70, 150);

    var gy = G.H - GROUND_H;
    G.skyGrad = ctx.createLinearGradient(0, 0, 0, gy);
    G.skyGrad.addColorStop(0, '#ff93c9');
    G.skyGrad.addColorStop(0.5, '#ffc1e1');
    G.skyGrad.addColorStop(1, '#ffe2d2');
    G.groundGrad = ctx.createLinearGradient(0, gy, 0, G.H);
    G.groundGrad.addColorStop(0, '#ff8fc8');
    G.groundGrad.addColorStop(1, '#d94fb0');
    G.sunGrad = ctx.createRadialGradient(G.W * 0.78, G.H * 0.16, 4, G.W * 0.78, G.H * 0.16, 130);
    G.sunGrad.addColorStop(0, 'rgba(255,255,255,.95)');
    G.sunGrad.addColorStop(0.35, 'rgba(255,240,250,.5)');
    G.sunGrad.addColorStop(1, 'rgba(255,200,230,0)');
    G.pipeGrad = ctx.createLinearGradient(0, 0, PIPE_W, 0);
    G.pipeGrad.addColorStop(0, '#ff6fb7');
    G.pipeGrad.addColorStop(0.45, '#ff9ed0');
    G.pipeGrad.addColorStop(1, '#c04fd8');

    if (!G.clouds.length) initScenery();
  }

  function initScenery() {
    var i;
    G.clouds = [];
    for (i = 0; i < 5; i++) G.clouds.push({ x: rnd(0, G.W), y: rnd(40, G.H * 0.5), s: rnd(0.6, 1.2), v: rnd(0.12, 0.35) });
    G.petals = [];
    for (i = 0; i < 14; i++) G.petals.push({ x: rnd(0, G.W), y: rnd(0, G.H), s: rnd(10, 18), vy: rnd(0.5, 1.2), ph: rnd(0, TAU), r: rnd(0, TAU), vr: rnd(-0.04, 0.04), img: pick(SP.petals) });
    G.stars = [];
    for (i = 0; i < 12; i++) G.stars.push({ x: rnd(0, 1), y: rnd(0.03, 0.45), s: rnd(10, 18), ph: rnd(0, TAU) });
  }

  function resetGame() {
    G.started = false; G.score = 0; G.pipes = []; G.sparks = [];
    G.bird.y = G.H * 0.45; G.bird.vy = 0; G.bird.rot = 0; G.bird.wing = 0;
    G.groundX = 0; G.lastF = 0.5; G.t = 0;
    initScenery();
  }

  function difficulty() {
    return {
      speed: 2.0 + Math.min(G.score * 0.07, 1.3),        // pipes slowly speed up
      gap: Math.max(152, 200 - G.score * 2.2)             // gap slowly shrinks (never too small)
    };
  }

  function spawnPipe() {
    var d = difficulty();
    var f = clamp(G.lastF + rnd(-0.38, 0.38), 0.02, 0.98);   // limits how far the gap can jump
    G.lastF = f;
    var x = G.pipes.length ? G.pipes[G.pipes.length - 1].x + PIPE_SPACING : G.W + 130;
    G.pipes.push({ x: x, f: f, gap: d.gap, passed: false });
  }

  function pipeGapY(p) {            // vertical centre of this pipe's gap
    var minC = 84 + p.gap / 2, maxC = (G.H - GROUND_H) - 64 - p.gap / 2;
    return minC + p.f * (maxC - minC);
  }

  /* ----- input ----- */
  function flap() {
    if (state !== STATE.PLAYING) return;            // no input after game over / video
    if (performance.now() < G.inputAt) return;      // ignore the tap that pressed START
    G.started = true;
    G.bird.vy = FLAP;
    G.bird.wing = 1;
    playPop();
    var i;
    for (i = 0; i < 4; i++) G.sparks.push({ x: G.bird.x - 12, y: G.bird.y + 10, vx: rnd(-1.6, -0.3), vy: rnd(-0.6, 1.4), life: 1, s: rnd(8, 14) });
  }

  /* ----- collision ----- */
  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    var nx = clamp(cx, rx, rx + rw), ny = clamp(cy, ry, ry + rh);
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }
  function hitsPipe(p) {
    var cy = pipeGapY(p), top = cy - p.gap / 2, bot = cy + p.gap / 2, b = G.bird;
    return circleRect(b.x, b.y, HIT_R, p.x, -50, PIPE_W, top + 50 - CAP_H) ||
           circleRect(b.x, b.y, HIT_R, p.x - CAP_EX, top - CAP_H, PIPE_W + CAP_EX * 2, CAP_H) ||
           circleRect(b.x, b.y, HIT_R, p.x - CAP_EX, bot, PIPE_W + CAP_EX * 2, CAP_H) ||
           circleRect(b.x, b.y, HIT_R, p.x, bot + CAP_H, PIPE_W, G.H);
  }

  /* ----- update one frame ----- */
  function update(dt) {
    var d = difficulty(), b = G.bird, i, p;
    G.t += dt;

    // scenery always moves while playing
    var sp = d.speed;
    G.groundX = (G.groundX + sp * dt) % 48;
    G.hillX += sp * dt * 0.25;
    for (i = 0; i < G.clouds.length; i++) {
      var c = G.clouds[i];
      c.x -= (c.v + sp * 0.05) * dt;
      if (c.x < -120 * c.s) { c.x = G.W + 40; c.y = rnd(40, G.H * 0.5); }
    }
    for (i = 0; i < G.petals.length; i++) {
      p = G.petals[i];
      p.ph += 0.03 * dt; p.x += (Math.sin(p.ph) * 0.5 - sp * 0.35) * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      if (p.y > G.H + 20 || p.x < -20) { p.y = -20; p.x = rnd(0, G.W + 60); }
    }
    for (i = G.sparks.length - 1; i >= 0; i--) {
      var s = G.sparks[i];
      s.x += (s.vx - sp * 0.5) * dt; s.y += s.vy * dt; s.life -= 0.04 * dt;
      if (s.life <= 0) G.sparks.splice(i, 1);
    }
    b.wing = Math.max(0, b.wing - 0.06 * dt);

    if (!G.started) {                      // "get ready" – bird floats gently
      b.y = G.H * 0.45 + Math.sin(G.t * 0.06) * 9;
      b.rot = 0;
      return;
    }

    // bird physics
    b.vy = Math.min(b.vy + GRAVITY * dt, MAX_FALL);
    b.y += b.vy * dt;
    b.rot = clamp(b.vy * 0.07, -0.45, 0.85);
    if (b.y < BIRD_R) { b.y = BIRD_R; if (b.vy < 0) b.vy = 0; }   // soft ceiling

    // pipes
    if (!G.pipes.length || G.pipes[G.pipes.length - 1].x < G.W - PIPE_SPACING + 40) spawnPipe();
    for (i = G.pipes.length - 1; i >= 0; i--) {
      p = G.pipes[i];
      p.x -= sp * dt;
      if (!p.passed && p.x + PIPE_W < b.x - HIT_R) { p.passed = true; G.score++; }
      if (p.x < -PIPE_W - 20) G.pipes.splice(i, 1);
    }

    // collisions: ground, then pipes
    if (b.y + HIT_R >= G.H - GROUND_H) { b.y = G.H - GROUND_H - HIT_R; endGame(); return; }
    for (i = 0; i < G.pipes.length; i++) {
      if (G.pipes[i].x < b.x + 60 && G.pipes[i].x + PIPE_W > b.x - 60 && hitsPipe(G.pipes[i])) { endGame(); return; }
    }
  }

  /* ----- drawing ----- */
  function circ(x, y, r) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function flowerAt(i, x, y, size, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
    ctx.drawImage(SP.flowers[i % SP.flowers.length], -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function drawHills(base, amp, freq, off, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, G.H);
    for (var x = 0; x <= G.W + 10; x += 10) {
      ctx.lineTo(x, base - amp * (Math.sin((x + off) * freq) * 0.6 + Math.sin((x + off) * freq * 2.3 + 1) * 0.4));
    }
    ctx.lineTo(G.W + 10, G.H); ctx.closePath(); ctx.fill();
  }

  function drawPipe(p) {
    var cy = pipeGapY(p), top = cy - p.gap / 2, bot = cy + p.gap / 2, gy = G.H - GROUND_H, k;
    ctx.save();
    ctx.translate(p.x, 0);
    ctx.fillStyle = G.pipeGrad;
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3;

    // bodies
    rrect(0, -20, PIPE_W, top - CAP_H + 20, 6); ctx.fill(); ctx.stroke();
    rrect(0, bot + CAP_H, PIPE_W, gy - bot - CAP_H + 8, 6); ctx.fill(); ctx.stroke();
    // caps
    rrect(-CAP_EX, top - CAP_H, PIPE_W + CAP_EX * 2, CAP_H, 9); ctx.fill(); ctx.stroke();
    rrect(-CAP_EX, bot, PIPE_W + CAP_EX * 2, CAP_H, 9); ctx.fill(); ctx.stroke();
    // soft highlight stripe
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.fillRect(10, 0, 6, top - CAP_H - 3);
    ctx.fillRect(10, bot + CAP_H + 3, 6, gy - bot - CAP_H - 3);

    // flowers decorating the pipes
    for (k = 0; k * 62 < top - CAP_H - 30; k++) flowerAt(k, (k % 2) ? PIPE_W * 0.7 : PIPE_W * 0.3, top - CAP_H - 28 - k * 62, 26, k);
    for (k = 0; bot + CAP_H + 28 + k * 62 < gy - 14; k++) flowerAt(k + 2, (k % 2) ? PIPE_W * 0.3 : PIPE_W * 0.7, bot + CAP_H + 28 + k * 62, 26, k);
    flowerAt(1, -CAP_EX + 6, top - CAP_H / 2, 20, 0.4);
    flowerAt(3, PIPE_W + CAP_EX - 6, bot + CAP_H / 2, 20, -0.4);
    ctx.restore();
  }

  function drawBird(ts) {
    var b = G.bird;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    // little wings (flap when tapping)
    var flapA = 0.35 + b.wing * 0.8 * Math.sin(ts * 0.03);
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.strokeStyle = '#ff8fc8'; ctx.lineWidth = 2;
    [-1, 1].forEach(function (side) {
      ctx.save();
      ctx.translate(side * (BIRD_R - 1), 2);
      ctx.rotate(side * (flapA + Math.sin(ts * 0.012) * 0.12));
      ctx.beginPath(); ctx.ellipse(side * 9, -4, 11, 6, side * -0.5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    });
    if (SP.bird) ctx.drawImage(SP.bird, -32, -32, 64, 64);
    ctx.restore();
  }

  function draw(ts) {
    var gy = G.H - GROUND_H, i, p;
    ctx.setTransform(G.dpr * G.scale, 0, 0, G.dpr * G.scale, 0, 0);

    // sky + glowing sun
    ctx.fillStyle = G.skyGrad; ctx.fillRect(0, 0, G.W, G.H);
    ctx.fillStyle = G.sunGrad; ctx.fillRect(0, 0, G.W, G.H * 0.5);

    // twinkling stars/sparkles in the sky
    for (i = 0; i < G.stars.length; i++) {
      var st = G.stars[i];
      ctx.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(ts * 0.002 + st.ph));
      ctx.drawImage(SP.sparkle, st.x * G.W - st.s / 2, st.y * G.H - st.s / 2, st.s, st.s);
    }
    ctx.globalAlpha = 1;

    // hills (lavender, parallax)
    drawHills(gy - 70, 40, 0.012, G.hillX * 0.4, 'rgba(201,167,255,.55)');
    drawHills(gy - 28, 28, 0.02, G.hillX, 'rgba(255,143,200,.65)');

    // clouds
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    for (i = 0; i < G.clouds.length; i++) {
      var c = G.clouds[i], s = c.s;
      ctx.beginPath();
      circ(c.x, c.y, 18 * s); circ(c.x + 22 * s, c.y - 13 * s, 24 * s); circ(c.x + 50 * s, c.y - 5 * s, 20 * s);
      circ(c.x + 72 * s, c.y + 4 * s, 15 * s); circ(c.x + 36 * s, c.y + 6 * s, 20 * s);
      ctx.fill();
    }

    // pipes
    for (i = 0; i < G.pipes.length; i++) drawPipe(G.pipes[i]);

    // falling petals
    for (i = 0; i < G.petals.length; i++) {
      p = G.petals[i];
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.drawImage(p.img, -p.s / 2, -p.s / 2, p.s, p.s);
      ctx.restore();
    }

    // ground
    ctx.fillStyle = G.groundGrad; ctx.fillRect(0, gy, G.W, GROUND_H);
    ctx.fillStyle = '#ffc3e2'; ctx.fillRect(0, gy, G.W, 12);
    ctx.fillStyle = '#ff9fd0';
    ctx.beginPath();
    for (var x = -G.groundX; x < G.W + 24; x += 24) circ(x + 12, gy + 12, 12);
    ctx.fill();
    for (var fxp = -G.groundX + 6, n = 0; fxp < G.W + 24; fxp += 48, n++) {
      ctx.drawImage(SP.flowers[n % SP.flowers.length], fxp, gy + 32, 26, 26);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(G.W, gy); ctx.stroke();

    // sparkle trail
    for (i = 0; i < G.sparks.length; i++) {
      var sp = G.sparks[i];
      ctx.globalAlpha = Math.max(0, sp.life);
      ctx.drawImage(SP.sparkle, sp.x - sp.s / 2, sp.y - sp.s / 2, sp.s, sp.s);
    }
    ctx.globalAlpha = 1;

    drawBird(ts);

    // score
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    ctx.font = '900 54px "Trebuchet MS","Segoe UI",Arial,sans-serif';
    ctx.lineWidth = 8; ctx.strokeStyle = '#ff1f8e';
    ctx.strokeText(G.score, G.W / 2, 78);
    ctx.fillStyle = '#fff'; ctx.fillText(G.score, G.W / 2, 78);

    // "get ready" hint
    if (!G.started) {
      var pulse = 1 + Math.sin(ts * 0.006) * 0.06;
      ctx.save(); ctx.translate(G.W / 2, G.H * 0.62); ctx.scale(pulse, pulse);
      ctx.font = '800 26px "Trebuchet MS","Segoe UI",Arial,sans-serif';
      ctx.lineWidth = 6; ctx.strokeStyle = '#d0287f';
      ctx.strokeText('Tap to fly! 💗', 0, 0);
      ctx.fillStyle = '#fff'; ctx.fillText('Tap to fly! 💗', 0, 0);
      ctx.restore();
    }
  }

  /* ----- main loop (exactly one at a time) ----- */
  function loop(ts) {
    if (state !== STATE.PLAYING) { G.raf = 0; return; }
    G.raf = requestAnimationFrame(loop);
    var dt = (ts - G.last) / 16.667;
    G.last = ts;
    if (!(dt > 0)) dt = 1;
    if (dt > 2.5) dt = 2.5;               // avoid huge jumps after a tab switch
    update(dt);
    if (state === STATE.PLAYING) draw(ts);
  }
  function startLoop() {
    if (G.raf) cancelAnimationFrame(G.raf);
    G.last = performance.now();
    G.raf = requestAnimationFrame(loop);
  }

  /* ---------------------------------------------------------
     7. State transitions
     --------------------------------------------------------- */
  function startGame() {
    if (state !== STATE.WELCOME) return;     // can only start once
    initAudio();                              // allowed: we are inside the START tap
    state = STATE.PLAYING;
    fxStop();                                 // keep the game light: stop the page-level petals
    fx.cv.style.display = 'none';
    $('butterflies').style.display = 'none';
    $('startBtn').disabled = true;

    showScreen('game');
    resizeGame();
    resetGame();
    G.inputAt = performance.now() + 450;      // ignore the START tap itself
    draw(performance.now());
    startLoop();
  }

  var transitioned = false;
  function endGame() {
    if (state !== STATE.PLAYING || transitioned) return;   // only ever once
    transitioned = true;
    state = STATE.GAME_OVER;
    if (G.raf) cancelAnimationFrame(G.raf);
    G.raf = 0;                                // scrolling/physics stop immediately
    draw(performance.now());                  // freeze the last frame

    var ov = $('overlay'), oops = $('oops'), day5 = $('day5');
    buildOverlayFall();
    ov.classList.add('on');
    oops.classList.add('on');

    // 1) "Oops! Game Over!"  ->  2) "DAY 05" cinematic  ->  3) birthday video
    setTimeout(function () {
      oops.classList.remove('on');
      ov.classList.add('cine');
      day5.classList.add('on');
    }, 1900);
    setTimeout(startBirthday, 1900 + 3000);
  }

  function buildOverlayFall() {
    var host = $('fallLayer'), i, el;
    host.innerHTML = '';
    for (i = 0; i < 18; i++) {
      el = document.createElement('img');
      el.src = flowerURLs[i % flowerURLs.length];
      el.alt = '';
      el.style.left = rnd(0, 96) + '%';
      el.style.setProperty('--w', rnd(22, 44) + 'px');
      el.style.setProperty('--t', rnd(4, 8) + 's');
      el.style.setProperty('--dl', (-rnd(0, 6)) + 's');
      el.style.setProperty('--sx', rnd(-40, 40) + 'px');
      host.appendChild(el);
    }
    for (i = 0; i < 22; i++) {
      el = document.createElement('div');
      el.className = 'spark';
      el.style.left = rnd(0, 94) + '%';
      el.style.top = rnd(5, 92) + '%';
      el.style.setProperty('--w', rnd(10, 28) + 'px');
      el.style.setProperty('--t', rnd(1.2, 2.6) + 's');
      el.style.setProperty('--dl', (-rnd(0, 2)) + 's');
      host.appendChild(el);
    }
  }

  var video = $('bdayVideo');
  var videoWanted = false;

  function playVideo() {
    if (!videoWanted) return;
    var pr;
    try { pr = video.play(); } catch (e) { return; }
    if (pr && pr.catch) pr.catch(function () { armAutoplayFallback(); });
  }

  // If a browser blocks autoplay, start on the very first touch/click/key – no controls shown.
  var fallbackArmed = false;
  function armAutoplayFallback() {
    if (fallbackArmed) return;
    fallbackArmed = true;
    var go = function () {
      ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function (ev) { document.removeEventListener(ev, go, true); });
      fallbackArmed = false;
      video.muted = false;
      playVideo();
    };
    ['pointerdown', 'touchend', 'click', 'keydown'].forEach(function (ev) { document.addEventListener(ev, go, true); });
  }

  function startBirthday() {
    if (state !== STATE.GAME_OVER) return;
    state = STATE.BIRTHDAY;
    videoWanted = true;

    // video: muted + loop + playsinline, then autoplay
    video.muted = false; 
    video.defaultMuted = false;
    video.loop = true;
    video.controls = false;
    video.setAttribute('autoplay', '');
    video.autoplay = true;
    try { video.currentTime = 0; } catch (e) { /* ignore */ }

    showScreen('birthday');
    playVideo();

    // celebration effects
    $('butterflies').style.display = '';
    fx.cv.style.display = 'block';
    fxStart('birthday');

    // free the game screen completely once it has faded out
    setTimeout(function () {
      screens.game.style.display = 'none';
      $('overlay').classList.remove('on', 'cine');
      $('fallLayer').innerHTML = '';
    }, 1000);
  }

  // keep the video looping no matter what (tab switch, accidental pause, etc.)
  video.addEventListener('pause', function () {
    if (state === STATE.BIRTHDAY && !document.hidden && videoWanted) setTimeout(playVideo, 50);
  });
  video.addEventListener('ended', function () {
    if (state === STATE.BIRTHDAY) { video.currentTime = 0; playVideo(); }
  });
  video.addEventListener('canplay', function () { if (state === STATE.BIRTHDAY && video.paused) playVideo(); });
  video.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  /* ---------------------------------------------------------
     8. Events
     --------------------------------------------------------- */
  // START button (with a soft ripple)
  var startBtn = $('startBtn');
  startBtn.addEventListener('pointerdown', function (e) {
    var r = startBtn.getBoundingClientRect(), d = Math.max(r.width, r.height) * 0.6, el = document.createElement('span');
    el.className = 'ripple';
    el.style.width = el.style.height = d + 'px';
    el.style.left = (e.clientX - r.left - d / 2) + 'px';
    el.style.top = (e.clientY - r.top - d / 2) + 'px';
    startBtn.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 650);
  });
  startBtn.addEventListener('click', startGame);

  // Game input: tap anywhere on the game area (touch, mouse or pen)
  screens.game.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    flap();
  }, { passive: false });

  // Block page scroll / zoom gestures while playing
  ['touchstart', 'touchmove'].forEach(function (ev) {
    screens.game.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false });
  });
  document.addEventListener('touchmove', function (e) {
    if (state !== STATE.WELCOME) e.preventDefault();
  }, { passive: false });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // Desktop keys: Space or ArrowUp
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === ' ' || e.key === 'ArrowUp') {
      if (state === STATE.PLAYING) { e.preventDefault(); if (!e.repeat) flap(); }
      else if (state !== STATE.WELCOME) e.preventDefault();
    }
  });

  // Resize / rotate
  var resizeQueued = false;
  function onResize() {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(function () {
      resizeQueued = false;
      if (state === STATE.WELCOME || state === STATE.BIRTHDAY) {
        if (fx.running) { fxResize(); fxSetMode(fx.mode); }
      }
      if (state === STATE.PLAYING || state === STATE.GAME_OVER) {
        resizeGame();
        if (state === STATE.GAME_OVER) draw(performance.now());
      }
    });
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  // Pause/resume page effects when the tab is hidden
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (fx.running) { fxStop(); fx.wasRunning = true; }
    } else {
      if (fx.wasRunning && (state === STATE.WELCOME || state === STATE.BIRTHDAY)) {
        fx.running = true; fx.last = performance.now(); fx.raf = requestAnimationFrame(fxFrame);
      }
      fx.wasRunning = false;
      if (state === STATE.PLAYING) { G.last = performance.now(); }
      if (state === STATE.BIRTHDAY && video.paused) playVideo();
    }
  });

  /* ---------------------------------------------------------
     9. Boot
     --------------------------------------------------------- */
  fxStart('welcome');
})();
