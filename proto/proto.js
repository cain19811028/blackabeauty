/* Advanced 2.5D full-site prototype (proto/index.html).
   Plain IIFE script (no ES modules) so double-clicking proto/index.html via file:// works directly. */
(function () {
  'use strict';

  const T = window.THREE;
  const ART = window.PROTO_ART;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  if (!ART) return;

  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const smooth = (x) => x * x * (3 - 2 * x);
  const smoothstep = (a, b, v) => smooth(clamp((v - a) / (b - a), 0, 1));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = window.matchMedia('(max-width: 767px)').matches;
  const touchDevice = window.matchMedia('(hover: none)').matches;

  /* ---------- 1. Inject shared SVG sprite + back-view regalia symbols ---------- */
  const BACK_DEFS = `
    <g id="k-body-back">
      <path d="M112 228 L160 202 Q200 194 240 202 L288 228 L276 318 C286 436 296 564 300 686 L276 697 L252 685 L226 700 L200 689 L174 700 L148 685 L124 697 L100 686 C104 564 114 436 124 318 Z"
        fill="var(--fabric)" stroke="var(--fabric-line)" stroke-width="2" stroke-linejoin="round" />
      <path d="M126 335 C120 463 110 583 104 685 L128 696 C130 583 134 463 138 346 Z" fill="var(--fabric-shade)" />
      <path d="M164 360 C162 475 156 590 150 685 L164 693 C168 590 170 475 170 360 Z" fill="var(--fabric-shade)" />
      <path d="M236 360 C242 475 248 590 252 685 L264 693 C260 590 254 475 246 360 Z" fill="var(--fabric-shade)" />
      <path d="M266 357 C274 476 286 583 292 689 L299 686 C295 569 289 463 278 346 Z" fill="var(--fabric-hi)" />
      <path d="M118 242 Q200 226 282 242" fill="none" stroke="var(--fabric-hi)" stroke-width="1.4" stroke-dasharray="3 3" opacity=".7" />
      <path d="M104 674 L124 685 L148 673 L174 688 L200 677 L226 688 L252 673 L276 685 L296 674" fill="none" stroke="var(--fabric-hi)" stroke-width="1.2" stroke-dasharray="3 3" opacity=".7" />
    </g>
    <g id="k-stole-back">
      <path d="M108 228 C126 202 158 184 200 184 C242 184 274 202 292 228 Q248 262 200 264 Q152 262 108 228 Z"
        fill="var(--fabric)" stroke="var(--fabric-line)" stroke-width="2" stroke-linejoin="round" />
      <path d="M122 224 C140 202 168 190 200 190 C232 190 260 202 278 224 Q240 252 200 254 Q160 252 122 224 Z"
        fill="var(--trim)" stroke="var(--trim-line)" stroke-width="1.2" stroke-linejoin="round" />
      <path d="M200 190 C232 190 260 202 278 224 L268 232 C250 212 226 202 200 202 Z" fill="var(--trim-hi)" opacity=".75" />
    </g>
    <g id="k-hood-back">
      <path d="M104 226 C128 200 160 186 200 186 C240 186 272 200 296 226 C288 290 270 390 252 444 C236 476 218 486 200 486 C182 486 164 476 148 444 C130 390 112 290 104 226 Z"
        fill="var(--fabric)" stroke="var(--fabric-line)" stroke-width="2" stroke-linejoin="round" />
      <path d="M118 236 C138 286 154 374 166 432 C178 462 188 472 200 472 C212 472 222 462 234 432 C246 374 262 286 282 236 C258 214 230 204 200 204 C170 204 142 214 118 236 Z"
        fill="var(--trim)" stroke="var(--trim-line)" stroke-width="1.3" stroke-linejoin="round" />
      <path d="M118 236 C142 214 170 204 200 204 L200 472 C188 472 178 462 166 432 C154 374 138 286 118 236 Z"
        fill="var(--trim-shade)" opacity=".4" />
      <path d="M236 218 C252 226 266 236 274 246 C258 296 244 370 232 426 L222 420 C234 366 246 296 258 248 Z"
        fill="var(--trim-hi)" opacity=".75" />
      <path d="M200 204 L200 472" stroke="var(--trim-line)" stroke-width="1.2" opacity=".6" />
    </g>
    <g id="k-doctor-hood-back">
      <path d="M88 228 C118 196 156 180 200 180 C244 180 282 196 312 228 C302 310 286 430 264 494 C244 532 222 544 200 544 C178 544 156 532 136 494 C114 430 98 310 88 228 Z"
        fill="var(--velvet, var(--fabric))" stroke="var(--fabric-line)" stroke-width="2" stroke-linejoin="round" />
      <path d="M106 238 C130 208 164 196 200 196 C236 196 270 208 294 238 C280 314 264 418 244 478 C228 512 214 524 200 524 C186 524 172 512 156 478 C136 418 120 314 106 238 Z"
        fill="var(--trim, var(--fabric-hi))" stroke="var(--fabric-line)" stroke-width="1.3" stroke-linejoin="round" />
      <path d="M106 238 C130 208 164 196 200 196 L200 524 C186 524 172 512 156 478 C136 418 120 314 106 238 Z"
        fill="var(--trim-shade, var(--fabric-shade))" opacity=".36" />
      <path d="M236 212 C256 222 274 234 284 246 C268 314 252 406 236 468 L224 462 C238 402 252 314 266 248 Z"
        fill="var(--trim-hi, #fff)" opacity=".65" />
      <path d="M150 184 Q200 170 250 184 L244 202 Q200 192 156 202 Z" fill="var(--velvet, var(--fabric-deep))" stroke="var(--fabric-line)" stroke-width="1.4" />
    </g>
  `;

  document.body.insertAdjacentHTML(
    'afterbegin',
    `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>${ART.defs}${BACK_DEFS}</defs></svg>`
  );

  // Additional real-photo color tokens documented in plan_20261003.md §5.3
  Object.assign(ART.palettes, {
    'trim-plum': { trim: '#8E2C7E', 'trim-shade': '#661B59', 'trim-hi': '#C76FB8', 'trim-line': '#4E1244' },
    'trim-white': { trim: '#F4F3EE', 'trim-shade': '#D2CFC6', 'trim-hi': '#FFFFFF', 'trim-line': '#9F9A8E' },
    'trim-crimson-velvet': { trim: '#A61C2E', 'trim-shade': '#7F1121', 'trim-hi': '#CF4456', 'trim-line': '#3E0610' },
    'tassel-green': { tassel: '#1CA02B', 'tassel-shade': '#0E6E19', 'tassel-hi': '#7BE887' },
    'tassel-red': { tassel: '#D41D22', 'tassel-shade': '#8E0E12', 'tassel-hi': '#FF7E82' },
    'tassel-plum': { tassel: '#9B3B8E', 'tassel-shade': '#661B59', 'tassel-hi': '#DF8AD4' },
    'tassel-blue': { tassel: '#2A69CE', 'tassel-shade': '#1D4C9C', 'tassel-hi': '#8FC4FF' },
    'tassel-white': { tassel: '#F4F3EE', 'tassel-shade': '#B9B6AC', 'tassel-hi': '#FFFFFF' },
  });

  /* ---------- 2. Shared wind field & state ---------- */
  let seed = 17;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const gustListeners = [];
  const wind = {
    t: 0,
    start: -100,
    next: 9,
    strength: 1,
    env(dt) {
      return dt < 0 ? 0 : dt < 1.2 ? smooth(dt / 1.2) : dt < 3.6 ? 1 - smooth((dt - 1.2) / 2.4) : 0;
    },
    gustAt(x) { return this.env(this.t - this.start - (x + 9) / 7) * this.strength; },
    at(y) {
      const g = this.env(this.t - this.start);
      return 0.32 + 0.16 * Math.sin(this.t * 0.21) + 0.1 * Math.sin(this.t * 0.57 + y * 0.004) + g * 1.3 * this.strength;
    },
    trigger(strength) {
      this.strength = strength;
      this.start = this.t;
      this.next = this.t + 10 + rand() * 6;
      gustListeners.forEach((fn) => fn(strength));
    },
    onGust(fn) { gustListeners.push(fn); },
    update(t) {
      this.t = t;
      if (t >= this.next) this.trigger(1);
    },
  };

  const state = {
    sway: true,
    grass: true,
    dof: true,
    petals: true,
    smoothScroll: !reducedMotion && !touchDevice,
    heroReady: false,
    heroCovered: false,
    galleryVisible: false,
  };

  /* ---------- 3. SVG-to-CanvasTexture helpers ---------- */
  const palette = (...names) => Object.assign({}, ...names.map((n) => ART.palettes[n]));
  function svgDoc(body, vbW, vbH, pxW, pxH, vars) {
    const style = vars ? `<style>:root{${Object.entries(vars).map(([k, v]) => `--${k}:${v}`).join(';')}}</style>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}" width="${pxW}" height="${pxH}">${style}<defs>${ART.defs}${BACK_DEFS}</defs>${body}</svg>`;
  }
  function rasterize(svg, w, h, blur) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        if (blur) ctx.filter = `blur(${blur}px)`;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(c);
      };
      img.onerror = () => reject(new Error('SVG rasterize failed'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  function makeTexture(source, maxAniso) {
    const tex = new T.CanvasTexture(source);
    tex.premultiplyAlpha = true;
    tex.anisotropy = maxAniso;
    tex.minFilter = T.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    return tex;
  }

  const sharedTime = { value: 0 };
  const CUTOUT_VERT = `
    uniform float uTime, uSway, uGust, uPhase;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 p = position;
      float w = smoothstep(0.74, 0.0, uv.y);
      w *= w;
      float ripple = sin(uTime * 1.25 + uv.y * 5.0 + uPhase) * 0.6 + sin(uTime * 2.1 + uv.x * 4.0 + uPhase * 1.7) * 0.4;
      p.x += w * (ripple * 0.02 + uGust * 0.085) * uSway;
      p.z += w * (sin(uTime * 1.7 + uv.x * 6.0 + uPhase) * 0.035 + uGust * 0.07) * uSway;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`;
  const CUTOUT_FRAG = `
    uniform sampler2D map;
    uniform float uOpacity;
    varying vec2 vUv;
    void main() { gl_FragColor = texture2D(map, vUv, -0.45) * uOpacity; }`;

  function makeCutout(tex, sway, phase) {
    return new T.ShaderMaterial({
      uniforms: { map: { value: tex }, uTime: sharedTime, uSway: { value: sway ? 1 : 0 }, uGust: { value: 0 }, uPhase: { value: phase || 0 }, uOpacity: { value: 1 } },
      vertexShader: CUTOUT_VERT,
      fragmentShader: CUTOUT_FRAG,
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      blending: T.CustomBlending,
      blendSrc: T.OneFactor,
      blendDst: T.OneMinusSrcAlphaFactor,
    });
  }

  const ramp = T ? new T.DataTexture(new Uint8Array([118, 186, 255]), 3, 1, T.RedFormat) : null;
  if (ramp) {
    ramp.minFilter = ramp.magFilter = T.NearestFilter;
    ramp.needsUpdate = true;
  }
  const toon = (hex) => new T.MeshToonMaterial({ color: hex, gradientMap: ramp });
  const CAP_TILT = 0.3;

  function buildCapMesh(tasselPaletteKey, scale) {
    const group = new T.Group();
    const body = new T.Group();
    const cloth = toon(0x30354B);
    const trim = toon(new T.Color(ART.palettes[tasselPaletteKey].tassel).getHex());
    const add = (geo, mat, x, y, z) => {
      const m = new T.Mesh(geo, mat);
      m.position.set(x, y, z);
      body.add(m);
      return m;
    };
    add(new T.CylinderGeometry(0.1, 0.107, 0.15, 28), cloth, 0, 0.075, 0);
    add(new T.BoxGeometry(0.317, 0.018, 0.317), cloth, 0, 0.158, 0).rotation.y = Math.PI / 4;
    add(new T.CylinderGeometry(0.016, 0.016, 0.012, 12), trim, 0, 0.173, 0);
    add(new T.BoxGeometry(0.224, 0.006, 0.008), trim, 0.112, 0.169, 0);

    const pivot = new T.Group();
    pivot.position.set(0.224, 0.166, 0);
    const hang = (geo, y) => {
      const m = new T.Mesh(geo, trim);
      m.position.y = y;
      pivot.add(m);
    };
    hang(new T.CylinderGeometry(0.004, 0.004, 0.11, 6), -0.055);
    hang(new T.CylinderGeometry(0.013, 0.013, 0.03, 10), -0.12);
    hang(new T.ConeGeometry(0.024, 0.13, 12), -0.195);
    body.add(pivot);
    body.scale.setScalar(scale);
    body.rotation.x = CAP_TILT;
    group.add(body);
    return { group, body, pivot, trimMat: trim };
  }

  function stepTasselSpring(capObj, target, dt) {
    const acc = -70 * (capObj.angle - target) - 5.5 * capObj.vel;
    capObj.vel += acc * dt;
    capObj.angle = clamp(capObj.angle + capObj.vel * dt, -1, 1);
    capObj.pivot.rotation.z = capObj.angle;
  }

  /* ---------- 4. Stage 00: Hero 2.5D Three.js Diorama ---------- */
  const heroCanvas = $('#hero-scene');
  let heroCtrl = null;

  function initHero3D() {
    if (!T || !heroCanvas) return null;
    T.ColorManagement.enabled = false;
    let renderer;
    try {
      renderer = new T.WebGLRenderer({ canvas: heroCanvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (err) {
      console.error(err);
      return null;
    }
    renderer.outputColorSpace = T.LinearSRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(32, 1, 0.1, 400);
    const look = new T.Vector3();

    const art = (body, vbW, vbH, scale, vars, blur) =>
      rasterize(svgDoc(body, vbW, vbH, Math.round(vbW * scale), Math.round(vbH * scale), vars), Math.round(vbW * scale), Math.round(vbH * scale), blur)
        .then((c) => makeTexture(c, maxAniso));

    function plane(w, h, material, x, y, z, order, segW, segH) {
      const mesh = new T.Mesh(new T.PlaneGeometry(w, h, segW || 1, segH || 1), material);
      mesh.position.set(x, y, z);
      mesh.renderOrder = order;
      scene.add(mesh);
      return mesh;
    }

    // Lawn + Ground
    const lawn = {
      uTime: sharedTime,
      uGustStart: { value: -100 },
      uGustStrength: { value: 1 },
      uPointer: { value: new T.Vector4(0, 0, 0, 0) },
      uCam: { value: new T.Vector3() },
      uBase: { value: new T.Color(0x86BC62) },
      uTip: { value: new T.Color(0xD2EAAB) },
      uHaze: { value: new T.Color(0xD0E4BF) },
      uShadow: { value: [new T.Vector3(), new T.Vector3(), new T.Vector3()] },
    };
    const GUST_GLSL = `
      float gustEnv(float dt) {
        if (dt < 0.0) return 0.0;
        if (dt < 1.2) { float u = dt / 1.2; return u * u * (3.0 - 2.0 * u); }
        if (dt < 3.6) { float u = (dt - 1.2) / 2.4; return 1.0 - u * u * (3.0 - 2.0 * u); }
        return 0.0;
      }`;
    const LAWN_FRAG = `
      uniform vec3 uBase, uTip, uHaze, uCam;
      uniform vec3 uShadow[3];
      varying float vH, vTint;
      varying vec3 vWorld;
      void main() {
        vec3 col = mix(uBase, uTip, vH) * (0.9 + vTint * 0.2);
        col += step(0.5, fract(vWorld.x * 0.3 + 0.25)) * 0.035;
        float shade = 0.0;
        for (int i = 0; i < 3; i++) {
          vec2 q = (vWorld.xz - (uShadow[i].xy + vec2(-0.42, 0.06) * uShadow[i].z)) / (vec2(0.95, 0.36) * uShadow[i].z);
          shade = max(shade, 1.0 - smoothstep(0.25, 1.0, length(q)));
        }
        col *= 1.0 - 0.5 * shade;
        col = mix(col, uHaze, smoothstep(9.0, 30.0, length(vWorld - uCam)) * 0.8);
        gl_FragColor = vec4(col, 1.0);
      }`;

    const groundMesh = new T.Mesh(new T.PlaneGeometry(280, 160), new T.ShaderMaterial({
      uniforms: lawn,
      vertexShader: `varying float vH, vTint; varying vec3 vWorld; void main() { vWorld = (modelMatrix * vec4(position, 1.0)).xyz; vH = 0.1; vTint = 0.5; gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0); }`,
      fragmentShader: LAWN_FRAG,
    }));
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(0, 0, -62);
    scene.add(groundMesh);

    const count = phone ? 22000 : 90000;
    const grassGeo = new T.InstancedBufferGeometry();
    grassGeo.setAttribute('position', new T.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0, 1, 0]), 3));
    const offset = new Float32Array(count * 3);
    const params = new Float32Array(count * 4);
    const tint = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const x = -10 + 20 * rand();
      const z = -9.5 + 14 * rand();
      const near = smooth(clamp((z - 0.8) / 3.4, 0, 1));
      offset.set([x, 0, z], i * 3);
      params.set([(0.055 + rand() * 0.075) * (1 - near * 0.45), 0.02 + rand() * 0.02, (rand() - 0.5) * 1.3, rand() * TAU], i * 4);
      tint[i] = rand();
    }
    grassGeo.setAttribute('aOffset', new T.InstancedBufferAttribute(offset, 3));
    grassGeo.setAttribute('aParams', new T.InstancedBufferAttribute(params, 4));
    grassGeo.setAttribute('aTint', new T.InstancedBufferAttribute(tint, 1));
    grassGeo.instanceCount = count;
    const grass = new T.Mesh(grassGeo, new T.ShaderMaterial({
      uniforms: lawn,
      side: T.DoubleSide,
      vertexShader: `
        attribute vec3 aOffset; attribute vec4 aParams; attribute float aTint;
        uniform float uTime, uGustStart, uGustStrength; uniform vec4 uPointer;
        varying float vH, vTint; varying vec3 vWorld;
        ${GUST_GLSL}
        void main() {
          float h = position.y;
          float c = cos(aParams.z), s = sin(aParams.z);
          vec3 p = vec3(position.x * aParams.y * c, h * aParams.x, position.x * aParams.y * s);
          float breeze = sin(uTime * 1.7 + aOffset.x * 0.9 + aOffset.z * 0.6 + aParams.w) * 0.6 + sin(uTime * 0.63 + aOffset.x * 0.27) * 0.4;
          float gust = gustEnv(uTime - uGustStart - (aOffset.x + 9.0) / 7.0) * uGustStrength;
          float lean = (0.1 + breeze * 0.07 + gust * 0.5) * h * h * aParams.x;
          vec2 away = aOffset.xz - uPointer.xz;
          float d = length(away);
          float push = uPointer.w * (1.0 - smoothstep(0.0, 0.9, d)) * h * h * aParams.x * 0.9;
          vec2 dir = d > 0.001 ? away / d : vec2(0.0);
          p.x += lean + dir.x * push; p.z += dir.y * push;
          p.y -= (abs(lean) + push) * 0.35 * h;
          vWorld = aOffset + p; vH = h; vTint = aTint;
          gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
        }`,
      fragmentShader: LAWN_FRAG,
    }));
    grass.frustumCulled = false;
    scene.add(grass);

    function hillsTexture() {
      const c = document.createElement('canvas');
      c.width = 2048; c.height = 96;
      const ctx = c.getContext('2d');
      const ridge = (color, base, amp, freq, phase) => {
        ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, c.height);
        for (let x = 0; x <= c.width; x += 16) {
          ctx.lineTo(x, base - amp * (Math.sin(x * freq + phase) * 0.6 + Math.sin(x * freq * 2.3 + phase * 2) * 0.4));
        }
        ctx.lineTo(c.width, c.height); ctx.fill();
      };
      ridge('#D9E9C8', 44, 22, 0.0041, 0.6);
      ridge('#CADFB6', 66, 14, 0.0057, 2.1);
      return makeTexture(c, maxAniso);
    }

    function petalTexture() {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d');
      ctx.translate(64, 64); ctx.scale(2, 2);
      const g = ctx.createLinearGradient(0, 26, 0, -26);
      g.addColorStop(0, '#B93220'); g.addColorStop(0.5, '#E2492C'); g.addColorStop(1, '#FF8A57');
      ctx.beginPath();
      ctx.moveTo(0, 26);
      ctx.bezierCurveTo(-12, 20, -20, -2, -17, -16);
      ctx.bezierCurveTo(-15, -26, -6, -28, 0, -27);
      ctx.bezierCurveTo(6, -28, 15, -26, 17, -16);
      ctx.bezierCurveTo(20, -2, 12, 20, 0, 26);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(255, 176, 130, .5)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, 20); ctx.quadraticCurveTo(1.5, 0, 0, -20); ctx.stroke();
      return makeTexture(c, maxAniso);
    }

    function petalField(tex, pCount, zMin, zMax, size, fall, order) {
      const mat = new T.MeshBasicMaterial({
        map: tex, transparent: true, depthWrite: false, side: T.DoubleSide,
        blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor,
      });
      const mesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), mat, pCount);
      mesh.renderOrder = order;
      mesh.frustumCulled = false;
      scene.add(mesh);
      const dummy = new T.Object3D();
      const spawn = (p, anywhere) => {
        p.x = -8 + rand() * 17;
        p.y = anywhere ? rand() * 5 : 4.6 + rand() * 1.5;
        p.z = zMin + rand() * (zMax - zMin);
        p.s = size * (0.7 + rand() * 0.6);
        p.vy = fall * (0.75 + rand() * 0.5);
        p.rx = rand() * TAU; p.ry = rand() * TAU; p.rz = rand() * TAU;
        p.wx = (rand() - 0.5) * 3; p.wy = (rand() - 0.5) * 2.2; p.wz = (rand() - 0.5) * 1.6;
        p.phase = rand() * TAU;
        return p;
      };
      const items = Array.from({ length: pCount }, () => spawn({}, true));
      const write = () => {
        items.forEach((p, i) => {
          dummy.position.set(p.x, p.y, p.z);
          dummy.rotation.set(p.rx, p.ry, p.rz);
          dummy.scale.setScalar(p.s);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      };
      write();
      return {
        mesh,
        update(t, dt) {
          for (const p of items) {
            const gust = wind.gustAt(p.x);
            p.x += (0.25 + gust * 2.2 + Math.sin(t * 0.9 + p.phase) * 0.3) * dt;
            p.y -= p.vy * (1 - gust * 0.35) * dt;
            p.rx += p.wx * (1 + gust) * dt;
            p.ry += p.wy * dt;
            p.rz += p.wz * dt;
            if (p.y < 0.03 || p.x > 9.5) spawn(p, false);
          }
          write();
        },
      };
    }

    const UNITS = [
      { name: 'bachelor', x: 0.3, z: -0.55, s: 0.9, vars: palette('cw-black', 'trim-silver'), parts: ['k-sleeves', 'k-body', 'k-stole'], tassel: 'tassel-silver' },
      { name: 'master', x: 1.5, z: 0, s: 1, vars: palette('cw-black', 'trim-gold'), parts: ['k-sleeves', 'k-body', 'k-hood', 'k-plum'], tassel: 'tassel-gold' },
      { name: 'doctor', x: 2.7, z: -0.55, s: 0.9, vars: palette('cw-crimson'), parts: ['k-sleeves-dr', 'k-body', 'k-yoke', 'k-facings'], tassel: 'tassel-gold' },
    ];
    const uses = (ids) => ids.map((id) => `<use href="#${id}"/>`).join('');
    const formBody = `<use href="#k-form-stand"/><g filter="url(#k-grain)"><use href="#k-neck"/><use href="#k-form-neck"/></g>`;
    const gownBody = (unit) => `<g filter="url(#k-grain)">${uses(unit.parts)}</g>`;

    const layers = {};
    let caps = [];
    let fields = [];
    const raster = { d: 0, busy: false };

    function rig() {
      const portrait = camera.aspect < 0.9;
      return portrait
        ? { x: 1.5, y: 1.25, z: 13.5, lookY: 1.6, pushX: 0, pushLook: 0, pushZ: 4.5 }
        : { x: 0, y: 1.25, z: 7, lookY: 1.75, pushX: 1.12, pushLook: 1.45, pushZ: 2.9 };
    }
    function rasterScale(d) {
      const pxPerMetre = (window.innerHeight * renderer.getPixelRatio()) / (2 * d * Math.tan((camera.fov * Math.PI) / 360));
      return clamp(((pxPerMetre * 1.8) / 720) * 1.1, 0.6, 3);
    }
    async function dress(d) {
      raster.busy = true;
      const scale = rasterScale(d);
      for (const [i, unit] of UNITS.entries()) {
        const [formTex, gownTex] = await Promise.all([
          art(formBody, 400, 800, scale * unit.s, unit.vars),
          art(gownBody(unit), 400, 720, scale * unit.s, unit.vars),
        ]);
        if (unit.form) {
          for (const [mesh, tex] of [[unit.form, formTex], [unit.gown, gownTex]]) {
            mesh.material.uniforms.map.value.dispose();
            mesh.material.uniforms.map.value = tex;
          }
          continue;
        }
        const order = unit.name === 'master' ? 32 : 30;
        unit.form = plane(unit.s, 2 * unit.s, makeCutout(formTex), unit.x, unit.s, unit.z, order);
        unit.gown = plane(unit.s, 1.8 * unit.s, makeCutout(gownTex, true, i * 2.1), unit.x, 1.1 * unit.s, unit.z + 0.006, order + 1, 20, 36);
        lawn.uShadow.value[i].set(unit.x, unit.z, unit.s);
      }
      raster.d = d;
      raster.busy = false;
    }

    function placeCamera(p, px, py) {
      const r = rig();
      const e = smooth(p);
      camera.position.set(r.x + px * 0.5 + e * r.pushX, r.y - py * 0.16 + e * 0.24, r.z - e * r.pushZ);
      look.set(r.x + e * r.pushLook, r.lookY - e * 0.08, 0);
      camera.lookAt(look);
    }

    function placeBranch(p) {
      if (!layers.branch) return;
      const r = rig();
      const d = 2.2;
      const halfH = Math.tan((camera.fov * Math.PI) / 360) * d;
      const up = ((r.lookY - r.y) / r.z) * d;
      // As scrolling pushes into the lawn, the foreground kapok branch sweeps smoothly out past the upper-right corner.
      const sweep = smoothstep(0.05, 0.85, p);
      layers.branch.mesh.position.set(
        r.x + halfH * camera.aspect + 0.08 + sweep * 1.4,
        r.y + up + halfH + 0.1 + sweep * 0.7,
        r.z - d + sweep * 0.45
      );
      layers.branch.mesh.scale.setScalar((camera.aspect < 0.9 ? 0.6 : 0.95) * (1 + sweep * 0.35));
    }

    function toss() {
      caps.forEach((cap, i) => {
        cap.state = 'waiting';
        cap.t0 = sharedTime.value + 0.3 + i * 0.16;
        cap.dur = 1.4 + i * 0.08;
        cap.spinX = (i % 2 ? -1 : 1) * (1.5 + i * 0.3);
        cap.spinZ = (i % 2 ? 1 : -1) * 0.75;
        cap.p0 = new T.Vector3(cap.rest.x - 0.9 + i * 0.5, -1.0, cap.rest.z + 3.4);
        cap.ctrl = new T.Vector3((cap.p0.x + cap.rest.x) / 2, 4.8, (cap.p0.z + cap.rest.z) / 2);
        cap.group.position.copy(cap.p0);
        cap.lastX = cap.p0.x;
      });
    }

    function updateCaps(t, dt) {
      caps.forEach((cap, i) => {
        if (cap.state === 'waiting') {
          if (t < cap.t0) return;
          cap.state = 'flying';
        }
        if (cap.state === 'flying') {
          const u = clamp((t - cap.t0) / cap.dur, 0, 1);
          const a = (1 - u) * (1 - u);
          const b = 2 * u * (1 - u);
          const c = u * u;
          cap.group.position.set(
            a * cap.p0.x + b * cap.ctrl.x + c * cap.rest.x,
            a * cap.p0.y + b * cap.ctrl.y + c * cap.rest.y,
            a * cap.p0.z + b * cap.ctrl.z + c * cap.rest.z
          );
          const left = Math.pow(1 - u, 3);
          cap.body.rotation.x = CAP_TILT + cap.spinX * TAU * left;
          cap.body.rotation.z = cap.spinZ * TAU * left;
          const vx = (cap.group.position.x - cap.lastX) / Math.max(dt, 1e-3);
          cap.lastX = cap.group.position.x;
          stepTasselSpring(cap, clamp(-vx * 0.5, -0.8, 0.8), dt);
          if (u >= 1) {
            cap.state = 'settling';
            cap.settle = 0;
            cap.vel += i % 2 ? -4.5 : 4.5;
          }
          return;
        }
        if (cap.state === 'settling') {
          cap.settle += dt;
          const k = clamp(cap.settle / 0.45, 0, 1);
          const squash = 0.14 * Math.sin(k * Math.PI) * (1 - k);
          cap.body.scale.set(UNITS[i].s * (1 + squash * 0.5), UNITS[i].s * (1 - squash), UNITS[i].s * (1 + squash * 0.5));
          if (k >= 1) {
            cap.state = 'resting';
            cap.body.scale.setScalar(UNITS[i].s);
          }
        }
        stepTasselSpring(cap, wind.gustAt(cap.rest.x) * 0.45 + Math.sin(t * 1.6 + cap.seed) * 0.03, dt);
      });
    }

    function resize() {
      const w = heroCanvas.clientWidth || window.innerWidth;
      const h = heroCanvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      placeBranch(0);
      raster.d = 0;
    }

    const ray = new T.Raycaster();
    const groundPlane = new T.Plane(new T.Vector3(0, 1, 0), 0);
    const hit = new T.Vector3();
    let lastDist = 0;
    let stillSince = 0;

    async function build() {
      resize();
      scene.add(new T.HemisphereLight(0xffffff, 0x8088a8, 2.2));
      const sun = new T.DirectionalLight(0xfff3df, 2.6);
      sun.position.set(4, 7, 5);
      scene.add(sun);

      const [cloudsFar, cloudsMid, campusSharp, campusSoft, branchSharp, branchSoft, flowerTex] = await Promise.all([
        art(ART.cloudsFar, 1440, 900, 0.7),
        art(ART.cloudsMid, 1440, 900, 0.7),
        art(ART.campus, 1440, 320, 1.4),
        art(ART.campus, 1440, 320, 1.4, null, 1.6),
        art(ART.branch, 660, 440, 2),
        art(ART.branch, 660, 440, 2, null, 7),
        art('<use href="#k-blossom" x="0" y="0" width="72" height="72"/>', 72, 72, 3),
      ]);
      plane(124, 77.5, makeCutout(cloudsFar), 0, 3.2, -112, 1);
      plane(104, 65, makeCutout(cloudsMid), 0, 3.0, -92, 2);
      plane(170, 8, makeCutout(hillsTexture()), 0, 3.6, -66, 3);
      layers.campus = { mesh: plane(29.5, 6.56, makeCutout(campusSoft), 0, 3.12, -60, 4), sharp: campusSharp, soft: campusSoft };

      // Fallen kapok blossoms resting on the lawn (plan §4.1: 草坪上的層次和落花)
      const lawnSpots = [
        [-1.3, 1.2, 0.14], [0.95, 1.45, 0.13], [2.45, 0.65, 0.15],
        [-0.4, 2.2, 0.12], [1.95, 2.1, 0.16], [3.3, 1.15, 0.13],
      ];
      lawnSpots.forEach(([lx, lz, ls], idx) => {
        const m = new T.Mesh(new T.PlaneGeometry(ls, ls), makeCutout(flowerTex));
        m.rotation.set(-Math.PI / 2, 0, idx * 1.1);
        m.position.set(lx, 0.018, lz);
        m.renderOrder = 8;
        scene.add(m);
      });

      await dress(rig().z);
      caps = UNITS.map((u) => {
        const c = buildCapMesh(u.tassel, u.s);
        const rest = new T.Vector3(u.x, 1.605 * u.s, u.z + 0.05);
        c.group.position.copy(rest);
        scene.add(c.group);
        return { ...c, rest, state: 'resting', angle: 0, vel: 0, seed: rand() * TAU, lastX: rest.x };
      });

      const branchGeo = new T.PlaneGeometry(1, 0.667).translate(-0.5, -0.333, 0);
      const branch = new T.Mesh(branchGeo, makeCutout(branchSoft));
      branch.renderOrder = 60;
      scene.add(branch);
      layers.branch = { mesh: branch, sharp: branchSharp, soft: branchSoft };

      const petalTex = petalTexture();
      fields = [
        petalField(petalTex, phone ? 28 : 66, -7, -0.9, 0.11, 0.55, 20),
        petalField(flowerTex, phone ? 4 : 8, -6, -0.9, 0.2, 0.95, 21),
        petalField(petalTex, phone ? 18 : 42, 0.7, 5, 0.1, 0.55, 50),
        petalField(flowerTex, phone ? 3 : 6, 0.7, 4.5, 0.18, 0.95, 51),
      ];

      resize();
      state.heroReady = true;
      if (!reducedMotion) toss();
    }

    build().catch((err) => { console.error(err); });

    return {
      resize,
      toss,
      setGrass(v) { grass.visible = v; },
      setDof(v) {
        if (layers.campus) layers.campus.mesh.material.uniforms.map.value = v ? layers.campus.soft : layers.campus.sharp;
        if (layers.branch) layers.branch.mesh.material.uniforms.map.value = v ? layers.branch.soft : layers.branch.sharp;
      },
      setPetals(v) { fields.forEach((f) => { f.mesh.visible = v; }); },
      render(t, dt, p, px, py, pointerInside, ptrTx, ptrTy) {
        if (!state.heroReady) return;
        lawn.uGustStart.value = wind.start;
        lawn.uGustStrength.value = reducedMotion ? 0 : wind.strength;
        placeCamera(p, px, py);
        placeBranch(p);

        const dist = camera.position.z;
        if (Math.abs(dist - lastDist) > 0.002) {
          lastDist = dist;
          stillSince = t;
        } else if (!raster.busy && t - stillSince > 0.35 && Math.abs(Math.log2(dist / (raster.d || dist))) > 0.12) {
          dress(dist).catch((err) => { raster.busy = false; console.error(err); });
        }
        lawn.uCam.value.copy(camera.position);

        ray.setFromCamera({ x: ptrTx, y: -ptrTy }, camera);
        const onGround = pointerInside && !reducedMotion && ray.ray.intersectPlane(groundPlane, hit);
        lawn.uPointer.value.set(hit.x, hit.y, hit.z, onGround ? 1 : 0);

        UNITS.forEach((unit) => {
          const u = unit.gown.material.uniforms;
          u.uSway.value = state.sway && !reducedMotion ? 1 : 0;
          u.uGust.value = wind.gustAt(unit.x);
        });
        if (!reducedMotion) {
          updateCaps(t, dt);
          fields.forEach((f) => { if (f.mesh.visible) f.update(t, dt); });
          if (layers.branch) layers.branch.mesh.rotation.z = Math.sin(t * 0.9) * 0.012 + wind.gustAt(4) * 0.03;
        }
        renderer.render(scene, camera);
      },
    };
  }

  /* ---------- 5. Stage 02: 2.5D 學位服展廳 Three.js Studio (plan §4.2) ---------- */
  const GALLERY_SPECS = {
    bachelor: {
      title: '學士服（領巾款）',
      desc: '黑色外框 V 形領巾搭配緞面嵌條，袍身管狀褶自肩部自然垂墜；下方展示原實拍照片中實際有的四款領巾配色。',
      frontParts: ['k-sleeves', 'k-body', 'k-stole'],
      backParts: ['k-sleeves', 'k-body-back', 'k-stole-back'],
      swatches: [
        { label: '銀灰', dot: '#C9CED6', glow: 'rgba(201, 206, 214, .34)', vars: palette('cw-black', 'trim-silver'), tassel: 'tassel-silver' },
        { label: '寶藍', dot: '#2A69CE', glow: 'rgba(42, 105, 206, .22)', vars: palette('cw-black', 'trim-blue'), tassel: 'tassel-green' },
        { label: '橘', dot: '#E04E19', glow: 'rgba(224, 78, 25, .20)', vars: palette('cw-black', 'trim-orange'), tassel: 'tassel-red' },
        { label: '紫', dot: '#6B4DAA', glow: 'rgba(107, 77, 170, .22)', vars: palette('cw-black', 'trim-purple'), tassel: 'tassel-green' },
      ],
    },
    master: {
      title: '碩士服（披肩＋梅花扣）',
      desc: '黑色圓弧披肩外殼、內襯翻出為飽滿 V 形緞面，胸前點綴五瓣金色梅花扣；背面可見垂墜披肩與緞面內襯。',
      frontParts: ['k-sleeves', 'k-body', 'k-hood', 'k-plum'],
      backParts: ['k-sleeves', 'k-body-back', 'k-hood-back'],
      swatches: [
        { label: '金黃', dot: '#E0AE2A', glow: 'rgba(224, 174, 42, .24)', vars: palette('cw-black', 'trim-gold'), tassel: 'tassel-gold' },
        { label: '紫紅', dot: '#8E2C7E', glow: 'rgba(142, 44, 126, .20)', vars: palette('cw-black', 'trim-plum'), tassel: 'tassel-plum' },
      ],
    },
    doctor: {
      title: '博士服（鐘形大袖＋三道絨槓）',
      desc: '寬大鐘形袖綴有三道天鵝絨槓與前襟絨面飾邊；除經典黑袍配白／藍披肩外，亦備有實體拍攝緋紅博士袍。',
      frontParts: ['k-sleeves-dr', 'k-body', 'k-yoke', 'k-facings'],
      backParts: ['k-sleeves-dr', 'k-body-back', 'k-doctor-hood-back'],
      swatches: [
        { label: '緋紅袍（黑絨）', dot: '#A61C2E', glow: 'rgba(166, 28, 46, .22)', vars: palette('cw-crimson', 'trim-crimson-velvet'), tassel: 'tassel-gold' },
        { label: '黑袍（白披肩）', dot: '#F4F3EE', glow: 'rgba(222, 174, 113, .24)', vars: palette('cw-black', 'trim-white'), tassel: 'tassel-white' },
        { label: '黑袍（寶藍披肩）', dot: '#2A69CE', glow: 'rgba(42, 105, 206, .24)', vars: palette('cw-black', 'trim-blue'), tassel: 'tassel-blue' },
      ],
    },
  };

  function initGallery3D() {
    const canvas = $('#gallery-scene');
    if (!T || !canvas) return null;

    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = T.LinearSRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(28, 1, 0.1, 100);
    scene.add(new T.HemisphereLight(0xffffff, 0x8088a8, 2.2));
    const sun = new T.DirectionalLight(0xfff3df, 2.4);
    sun.position.set(3, 5, 4);
    scene.add(sun);

    // Subtle soft studio floor shadow beneath the wooden tripod
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256; shadowCanvas.height = 128;
    const sctx = shadowCanvas.getContext('2d');
    const sg = sctx.createRadialGradient(128, 64, 10, 128, 64, 120);
    sg.addColorStop(0, 'rgba(65, 48, 38, .28)');
    sg.addColorStop(0.55, 'rgba(65, 48, 38, .12)');
    sg.addColorStop(1, 'rgba(65, 48, 38, 0)');
    sctx.fillStyle = sg;
    sctx.fillRect(0, 0, 256, 128);
    const shadowTex = makeTexture(shadowCanvas, maxAniso);
    const floorShadow = new T.Mesh(
      new T.PlaneGeometry(1.7, 0.7),
      new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    floorShadow.rotation.x = -Math.PI / 2;
    floorShadow.position.set(0, 0.005, 0);
    scene.add(floorShadow);

    const rigGroup = new T.Group();
    scene.add(rigGroup);

    const placeholderTex = new T.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
    const formMesh = new T.Mesh(new T.PlaneGeometry(1, 2), makeCutout(placeholderTex));
    formMesh.position.set(0, 1, 0);
    formMesh.renderOrder = 10;
    rigGroup.add(formMesh);

    const gownMesh = new T.Mesh(new T.PlaneGeometry(1, 1.8, 20, 36), makeCutout(placeholderTex, true, 0.8));
    gownMesh.position.set(0, 1.1, 0.012);
    gownMesh.renderOrder = 12;
    rigGroup.add(gownMesh);

    const cap = { ...buildCapMesh('tassel-silver', 1), angle: 0, vel: 0 };
    cap.group.position.set(0, 1.605, 0.05);
    rigGroup.add(cap.group);

    let activeUnit = 'bachelor';
    let activeSwatchIdx = 0;
    let isBack = false;
    let flipAnim = { active: false, u: 0, swapped: false, targetBack: false };
    let reqId = 0;

    async function applyLook() {
      const id = ++reqId;
      const spec = GALLERY_SPECS[activeUnit];
      const sw = spec.swatches[activeSwatchIdx];
      const parts = isBack ? spec.backParts : spec.frontParts;
      const formMarkup = `<use href="#k-form-stand"/><g filter="url(#k-grain)"><use href="#k-neck"/><use href="#k-form-neck"/></g>`;
      const gownMarkup = `<g filter="url(#k-grain)">${parts.map((p) => `<use href="#${p}"/>`).join('')}</g>`;

      const [fC, gC] = await Promise.all([
        rasterize(svgDoc(formMarkup, 400, 800, 800, 1600, sw.vars), 800, 1600),
        rasterize(svgDoc(gownMarkup, 400, 720, 800, 1440, sw.vars), 800, 1440),
      ]);
      if (id !== reqId) return;

      const oldF = formMesh.material.uniforms.map.value;
      const oldG = gownMesh.material.uniforms.map.value;
      formMesh.material.uniforms.map.value = makeTexture(fC, maxAniso);
      gownMesh.material.uniforms.map.value = makeTexture(gC, maxAniso);
      oldF.dispose();
      oldG.dispose();

      cap.trimMat.color.set(ART.palettes[sw.tassel].tassel);
      cap.vel += 3.2;

      const stage = $('#gallery-stage');
      if (stage) stage.style.setProperty('--gallery-glow', sw.glow);
      const badge = $('#gallery-badge');
      if (badge) badge.textContent = `2.5D 人台展示｜${isBack ? '背面披肩／領型' : '正面'}（${sw.label}）`;
      const flipLabel = $('#gallery-flip-label');
      if (flipLabel) flipLabel.textContent = isBack ? '切回正面' : '切換背面披肩';
    }

    function triggerSheen() {
      const sheen = $('#gallery-sheen');
      if (!sheen) return;
      sheen.classList.remove('is-sweep');
      void sheen.offsetWidth;
      sheen.classList.add('is-sweep');
    }

    function renderUI() {
      const spec = GALLERY_SPECS[activeUnit];
      $('#gallery-unit-title').textContent = spec.title;
      $('#gallery-unit-desc').textContent = spec.desc;
      $$('.gallery__tab').forEach((btn) => {
        btn.setAttribute('aria-selected', String(btn.dataset.unit === activeUnit));
      });
      const host = $('#gallery-swatches');
      host.innerHTML = '';
      spec.swatches.forEach((sw, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'swatch';
        btn.setAttribute('aria-pressed', String(idx === activeSwatchIdx));
        btn.innerHTML = `<span class="swatch__dot" style="background:${sw.dot}"></span><span>${sw.label}</span>`;
        btn.addEventListener('click', () => {
          if (activeSwatchIdx === idx) return;
          activeSwatchIdx = idx;
          renderUI();
          triggerSheen();
          applyLook();
        });
        host.appendChild(btn);
      });
    }

    $$('.gallery__tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextUnit = btn.dataset.unit;
        if (nextUnit === activeUnit) return;
        activeUnit = nextUnit;
        activeSwatchIdx = 0;
        isBack = false;
        renderUI();
        triggerSheen();
        applyLook();
      });
    });

    $('#gallery-flip').addEventListener('click', () => {
      if (flipAnim.active) return;
      flipAnim = { active: true, u: 0, swapped: false, targetBack: !isBack };
      triggerSheen();
    });

    function resize() {
      const w = canvas.clientWidth || 400;
      const h = canvas.clientHeight || 435;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    resize();
    renderUI();
    applyLook();

    return {
      resize,
      render(t, dt, px, py) {
        if (!state.galleryVisible) return;
        if (flipAnim.active) {
          flipAnim.u += dt * 2.2;
          const u = clamp(flipAnim.u, 0, 1);
          const halfScale = Math.abs(Math.cos(u * Math.PI));
          rigGroup.scale.x = Math.max(0.06, halfScale);
          if (!flipAnim.swapped && u >= 0.5) {
            flipAnim.swapped = true;
            isBack = flipAnim.targetBack;
            applyLook();
          }
          if (u >= 1) {
            flipAnim.active = false;
            rigGroup.scale.x = 1;
          }
        }
        camera.position.set(px * 0.34, 1.06 - py * 0.14, 4.45);
        camera.lookAt(0, 1.02, 0);
        rigGroup.rotation.y = px * 0.11;
        gownMesh.material.uniforms.uSway.value = state.sway && !reducedMotion ? 1 : 0;
        gownMesh.material.uniforms.uGust.value = wind.gustAt(1.5) * 0.7;
        if (!reducedMotion) {
          stepTasselSpring(cap, wind.gustAt(1.5) * 0.4 + Math.sin(t * 1.5) * 0.04, dt);
        }
        renderer.render(scene, camera);
      },
    };
  }

  /* ---------- 6. Full-page Depth-Layered Kapok Petals (plan §4.4) ---------- */
  function initPagePetals() {
    const backCanvas = $('#petals-back');
    const frontCanvas = $('#petals-front');
    if (!backCanvas || !frontCanvas) return null;
    const backCtx = backCanvas.getContext('2d');
    const frontCtx = frontCanvas.getContext('2d');

    const SPRITE = 64;
    const NEAR = 0.8;
    const TINTS = [
      { base: '#B93220', mid: '#E2492C', tip: '#FF8A57', baseBack: '#A42A1A', midBack: '#C93D25' },
      { base: '#C83A22', mid: '#EE5C34', tip: '#FFA06E', baseBack: '#AE3020', midBack: '#D24A2C' },
    ];
    const petalPath = (ctx, w) => {
      ctx.beginPath(); ctx.moveTo(0, 26);
      ctx.bezierCurveTo(-12 * w, 20, -20 * w, -2, -17 * w, -16);
      ctx.bezierCurveTo(-15 * w, -26, -6 * w, -28, 0, -27);
      ctx.bezierCurveTo(6 * w, -28, 15 * w, -26, 17 * w, -16);
      ctx.bezierCurveTo(20 * w, -2, 12 * w, 20, 0, 26);
      ctx.closePath();
    };
    const petalFill = (ctx, tint, back) => {
      const g = ctx.createLinearGradient(0, 26, 0, -26);
      g.addColorStop(0, back ? tint.baseBack : tint.base);
      g.addColorStop(0.5, back ? tint.midBack : tint.mid);
      g.addColorStop(1, tint.tip);
      return g;
    };
    const makeSprite = (flower, tint, back, blur) => {
      const c = document.createElement('canvas');
      c.width = c.height = SPRITE;
      const ctx = c.getContext('2d');
      ctx.translate(SPRITE / 2, SPRITE / 2);
      if (blur) ctx.filter = `blur(${blur}px)`;
      if (!flower) {
        petalPath(ctx, 1);
        ctx.fillStyle = petalFill(ctx, tint, back);
        ctx.fill();
      } else {
        for (let i = 0; i < 5; i++) {
          ctx.save(); ctx.rotate((i * 72 - 6) * Math.PI / 180); ctx.translate(0, -13); ctx.scale(0.52, 0.52);
          petalPath(ctx, 1); ctx.fillStyle = petalFill(ctx, tint, back); ctx.fill(); ctx.restore();
        }
        ctx.fillStyle = '#6E1A0E'; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#F3C04F';
        for (let i = 0; i < 10; i++) {
          const a = (i * 36) * Math.PI / 180;
          ctx.beginPath(); ctx.arc(Math.sin(a) * 6.5, -Math.cos(a) * 6.5, 1.3, 0, TAU); ctx.fill();
        }
      }
      return c;
    };
    const sprites = {
      far: [makeSprite(false, TINTS[0], false, 0), makeSprite(false, TINTS[1], true, 0), makeSprite(true, TINTS[0], false, 0)],
      near: [makeSprite(false, TINTS[0], false, 1.5), makeSprite(false, TINTS[1], true, 1.5), makeSprite(true, TINTS[1], false, 1.5)],
    };

    let W = window.innerWidth, H = window.innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    const total = phone ? 18 : 34;
    const place = (p, topOnly) => {
      p.z = Math.random() ** 1.35;
      p.flower = Math.random() < 0.1;
      p.size = (11 + p.z * p.z * 22) * (p.flower ? 1.45 : 1);
      p.x = Math.random() * W;
      p.y = topOnly ? -30 - Math.random() * 80 : Math.random() * H;
      p.rot = Math.random() * TAU;
      p.vr = (Math.random() - 0.5) * 2.1;
      p.flip = Math.random() * TAU;
      p.vf = p.flower ? 0.35 + Math.random() * 0.5 : 1.0 + Math.random() * 1.4;
      p.phase = Math.random() * TAU;
      p.kind = p.flower ? 2 : (Math.random() < 0.5 ? 0 : 1);
      return p;
    };
    const items = Array.from({ length: total }, () => place({}, false));

    function resize() {
      W = document.documentElement.clientWidth;
      H = window.innerHeight;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      [backCtx, frontCtx].forEach((ctx) => {
        ctx.canvas.width = Math.round(W * dpr);
        ctx.canvas.height = Math.round(H * dpr);
      });
    }
    resize();

    function drawLayer(ctx, near) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      if (!state.petals) return;
      for (const p of items) {
        if ((p.z > NEAR) !== near) continue;
        const sy = Math.max(0.14, Math.abs(Math.cos(p.flip)));
        const sp = sprites[near ? 'near' : 'far'][p.kind];
        const k = (dpr * p.size) / SPRITE;
        const c = Math.cos(p.rot), s = Math.sin(p.rot);
        ctx.globalAlpha = near ? 0.85 : 0.42 + p.z * 0.4;
        ctx.setTransform(c * k, s * k, -s * sy * k, c * sy * k, p.x * dpr, p.y * dpr);
        ctx.drawImage(sp, -SPRITE / 2, -SPRITE / 2);
      }
    }

    return {
      resize,
      update(t, dt, showFrontOpacity) {
        frontCanvas.style.opacity = state.petals ? String(showFrontOpacity) : '0';
        backCanvas.style.opacity = state.petals ? '1' : '0';
        if (!state.petals || reducedMotion) return;
        for (const p of items) {
          const w = wind.at(p.y);
          const depth = 0.45 + p.z * 0.85;
          p.x += (w * 56 * depth + Math.sin(t * 0.9 + p.phase) * 11) * dt;
          p.y += (34 + p.z * 48) * dt;
          p.rot += (p.vr + w * 0.35) * dt;
          p.flip += p.vf * dt;
          if (p.y > H + 40 || p.x > W + 50) place(p, true);
        }
        drawLayer(backCtx, false);
        drawLayer(frontCtx, true);
      },
    };
  }

  /* ---------- 7. 2.5D Layered About Arch + Tassels + Reveals + Schools ---------- */
  const aboutStage = $('#about-stage');
  const aboutArt = $('#about-art');
  const aboutDepthGroups = $$('.about-depth', aboutArt || document);
  const aboutTassels = $$('.about__svg .pair-tassel').map((el, i) => ({ el, seed: i * 2.1, angle: 0, vel: 0 }));
  const aboutPtr = { x: 0, y: 0, tx: 0, ty: 0 };

  if (aboutStage && !reducedMotion && !touchDevice) {
    aboutStage.addEventListener('pointermove', (e) => {
      const r = aboutStage.getBoundingClientRect();
      aboutPtr.tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      aboutPtr.ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    }, { passive: true });
    aboutStage.addEventListener('pointerleave', () => { aboutPtr.tx = 0; aboutPtr.ty = 0; });
  }

  function updateAbout25D(t, dt) {
    if (!aboutArt || reducedMotion) return;
    const k = 1 - Math.exp(-dt * 5);
    aboutPtr.x += (aboutPtr.tx - aboutPtr.x) * k;
    aboutPtr.y += (aboutPtr.ty - aboutPtr.y) * k;

    aboutArt.style.transform = `rotateX(${(-aboutPtr.y * 2.2).toFixed(2)}deg) rotateY(${(aboutPtr.x * 2.8).toFixed(2)}deg)`;
    aboutDepthGroups.forEach((g) => {
      const d = parseFloat(g.dataset.depth || '0');
      const dx = aboutPtr.x * 11 * d;
      const dy = aboutPtr.y * 7 * d;
      g.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
    });
    aboutTassels.forEach((ts) => {
      const target = (wind.at(0) - 0.32) * 12 + Math.sin(t * 1.3 + ts.seed) * 2.5;
      const acc = -70 * (ts.angle - target) - 5.5 * ts.vel;
      ts.vel += acc * dt;
      ts.angle = clamp(ts.angle + ts.vel * dt, -50, 50);
      ts.el.style.setProperty('--swing', ts.angle.toFixed(2) + 'deg');
    });
  }

  // Reveals
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));

    const galStage = $('#gallery-stage');
    if (galStage) {
      new IntersectionObserver((entries) => {
        state.galleryVisible = entries[0].isIntersecting;
      }, { rootMargin: '250px 0px' }).observe(galStage);
    }
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
    state.galleryVisible = true;
  }

  // Service spotlight cursor glow
  $$('.spot').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
  });

  // Schools search (subsequence match + 臺/台 normalization, matching js/schools.js)
  const schoolInput = $('#school-q');
  const schoolItems = $$('#schools-wall li');
  const schoolStatus = $('#schools-status');
  const normalizeSchool = (s) => s.replace(/臺/g, '台').replace(/\s+/g, '');
  const subseqMatch = (q, name) => {
    let i = 0;
    for (const ch of name) {
      if (ch === q[i]) i++;
      if (i === q.length) return true;
    }
    return false;
  };
  if (schoolInput && schoolItems.length) {
    const schoolEntries = schoolItems.map((li) => ({ li, name: normalizeSchool(li.textContent) }));
    schoolInput.addEventListener('input', () => {
      const q = [...normalizeSchool(schoolInput.value)];
      let hits = 0;
      schoolEntries.forEach(({ li, name }) => {
        const hit = q.length > 0 && subseqMatch(q, name);
        if (hit) hits++;
        li.classList.toggle('is-hit', hit);
        li.classList.toggle('is-dim', q.length > 0 && !hit);
      });
      schoolStatus.textContent = q.length ? (hits ? `找到 ${hits} 所符合的院校` : '名單中沒有符合的學校，歡迎來電詢問') : '';
    });
  }

  // Mobile header drawer
  const header = $('#site-header');
  const menuBtn = $('.menu-toggle', header);
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      const open = !header.classList.contains('is-open');
      header.classList.toggle('is-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    $$('.site-nav a', header).forEach((a) => a.addEventListener('click', () => {
      header.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }));
  }

  /* ---------- 8. Smooth Inertial Scroll + Guided Demo + Chapter Navigation ---------- */
  const heroTrack = $('#top');
  const paperFlow = $('#paper-flow');
  const heroCopy = $('#hero-copy');
  const heroVertical = $('#hero-vertical');
  const scrollCue = $('#scroll-cue');
  const heroRays = $('#hero-rays');
  const galleryWatermark = $('#gallery-watermark');

  const scrollCtrl = { target: window.scrollY, current: window.scrollY, active: false };
  let guidedDemo = null;

  function maxScrollY() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }
  function heroTravelPx() {
    return heroTrack ? Math.max(1, heroTrack.offsetHeight - window.innerHeight) : window.innerHeight;
  }

  function jumpToTarget(selector, durationMs = 1100) {
    guidedDemo = null;
    const el = $(selector);
    if (!el) return;
    let targetY = 0;
    if (selector === '#top') targetY = 0;
    else if (selector === '#about') targetY = heroTravelPx();
    else targetY = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 60);
    targetY = clamp(targetY, 0, maxScrollY());

    if (reducedMotion) {
      window.scrollTo(0, targetY);
      return;
    }
    const startY = window.scrollY;
    const t0 = performance.now();
    guidedDemo = (now) => {
      const u = clamp((now - t0) / durationMs, 0, 1);
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      const y = startY + (targetY - startY) * e;
      window.scrollTo(0, y);
      scrollCtrl.target = scrollCtrl.current = y;
      if (u >= 1) guidedDemo = null;
    };
  }

  // Smooth anchor links
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      e.preventDefault();
      jumpToTarget(href, href === '#about' && window.scrollY < 40 ? 2800 : 950);
    });
  });

  // Guided demo button: scrolls smoothly from y=0 across the 2.5D lawn -> torn paper edge -> 關於我們
  $('#b-demo').addEventListener('click', () => {
    const startFromTop = () => {
      const targetY = heroTravelPx();
      const startY = window.scrollY;
      const t0 = performance.now();
      const dur = 3600;
      guidedDemo = (now) => {
        const u = clamp((now - t0) / dur, 0, 1);
        const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        const y = startY + (targetY - startY) * e;
        window.scrollTo(0, y);
        scrollCtrl.target = scrollCtrl.current = y;
        if (u >= 1) guidedDemo = null;
      };
    };
    if (window.scrollY > 40) {
      window.scrollTo(0, 0);
      scrollCtrl.target = scrollCtrl.current = 0;
      setTimeout(startFromTop, 80);
    } else {
      startFromTop();
    }
  });

  $$('[data-jump]').forEach((btn) => {
    btn.addEventListener('click', () => jumpToTarget(btn.dataset.jump, 1000));
  });

  // Desktop inertial wheel smoothing (interrupts immediately if user interacts with scrollbar or guided demo)
  window.addEventListener('wheel', (e) => {
    if (guidedDemo) guidedDemo = null;
    if (!state.smoothScroll || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    if (!scrollCtrl.active) {
      scrollCtrl.current = scrollCtrl.target = window.scrollY;
      scrollCtrl.active = true;
    }
    scrollCtrl.target = clamp(scrollCtrl.target + e.deltaY, 0, maxScrollY());
  }, { passive: false });

  window.addEventListener('touchstart', () => { guidedDemo = null; scrollCtrl.active = false; }, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Space', 'Home', 'End'].includes(e.code)) {
      guidedDemo = null;
      scrollCtrl.active = false;
    }
  });

  /* ---------- 9. Initialize 3D + HUD Controls + Frame Loop ---------- */
  heroCtrl = initHero3D();
  const galleryCtrl = initGallery3D();
  const pagePetals = initPagePetals();

  const ptr = { x: 0, y: 0, tx: 0, ty: 0, inside: false };
  window.addEventListener('pointermove', (e) => {
    ptr.tx = (e.clientX / window.innerWidth) * 2 - 1;
    ptr.ty = (e.clientY / window.innerHeight) * 2 - 1;
    ptr.inside = e.pointerType === 'mouse';
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { ptr.inside = false; ptr.tx = 0; ptr.ty = 0; });

  $('#t-sway').addEventListener('change', (e) => { state.sway = e.target.checked; });
  $('#t-grass').addEventListener('change', (e) => { state.grass = e.target.checked; if (heroCtrl) heroCtrl.setGrass(state.grass); });
  $('#t-dof').addEventListener('change', (e) => { state.dof = e.target.checked; if (heroCtrl) heroCtrl.setDof(state.dof); });
  $('#t-petals').addEventListener('change', (e) => { state.petals = e.target.checked; if (heroCtrl) heroCtrl.setPetals(state.petals); });
  $('#t-smooth').addEventListener('change', (e) => { state.smoothScroll = e.target.checked && !reducedMotion; if (!state.smoothScroll) scrollCtrl.active = false; });
  $('#b-gust').addEventListener('click', () => wind.trigger(1.35));
  $('#b-toss').addEventListener('click', () => {
    if (window.scrollY > 80) jumpToTarget('#top', 500);
    if (heroCtrl) heroCtrl.toss();
  });
  $('#b-collapse').addEventListener('click', () => {
    const hud = $('#hud');
    const collapsed = hud.classList.toggle('is-collapsed');
    $('#b-collapse').textContent = collapsed ? '展開導覽' : '收合';
  });
  if (phone) {
    $('#hud').classList.add('is-collapsed');
    $('#b-collapse').textContent = '展開導覽';
  }

  window.addEventListener('resize', () => {
    if (heroCtrl) heroCtrl.resize();
    if (galleryCtrl) galleryCtrl.resize();
    if (pagePetals) pagePetals.resize();
  });

  const CHAPTERS = [
    { sel: '#about', label: '01 關於我們（紅磚拱門）', nav: '#about' },
    { sel: '#gallery', label: '02 2.5D 學位服展廳', nav: '#gallery' },
    { sel: '#service', label: '03 其他服務與朱印卷軸', nav: '#service' },
    { sel: '#schools', label: '04 承製院校（75 所）', nav: '#schools' },
    { sel: '#products', label: '05 規格與相關產品', nav: '#schools' },
    { sel: '#contact', label: '06 聯絡我們', nav: '#contact' },
  ];
  const navLinks = $$('.site-nav a');

  function updateHUD(y, p, paperTopViewport) {
    header.classList.toggle('is-scrolled', y > 24);
    const max = Math.max(1, maxScrollY());
    const pct = Math.round((y / max) * 100);
    $('#hud-pct').textContent = `${pct}%`;
    $('#hud-bar').style.width = `${pct}%`;

    let label = '00 Hero 2.5D 草坪場景';
    let activeNav = '';
    if (p > 0.25 && paperTopViewport > 60) {
      label = 'Hero 鏡頭推近 → 撕紙邊升起';
    } else if (paperTopViewport <= 60) {
      label = CHAPTERS[0].label;
      activeNav = CHAPTERS[0].nav;
      for (const ch of CHAPTERS) {
        const el = $(ch.sel);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.42) {
          label = ch.label;
          activeNav = ch.nav;
        }
      }
    }
    $('#hud-chapter').textContent = label;
    navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === activeNav));
  }

  const fpsEl = $('#fps');
  let last = 0, ema = 1 / 60, shown = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { last = 0; return; }
    const t = now / 1000;
    const dt = last ? Math.min(0.05, t - last) : 1 / 60;
    last = t;

    if (guidedDemo) guidedDemo(now);
    else if (scrollCtrl.active) {
      const diff = scrollCtrl.target - scrollCtrl.current;
      if (Math.abs(diff) < 0.4) {
        scrollCtrl.current = scrollCtrl.target;
        scrollCtrl.active = false;
      } else {
        scrollCtrl.current += diff * (1 - Math.exp(-dt * 11));
      }
      window.scrollTo(0, scrollCtrl.current);
    }

    if (!reducedMotion) {
      sharedTime.value += dt;
      wind.update(sharedTime.value);
    }

    const k = 1 - Math.exp(-dt * 4);
    ptr.x += (ptr.tx - ptr.x) * k;
    ptr.y += (ptr.ty - ptr.y) * k;

    const y = window.scrollY;
    const travel = heroTravelPx();
    const p = clamp(y / travel, 0, 1);
    const paperTop = paperFlow ? paperFlow.getBoundingClientRect().top : window.innerHeight;
    state.heroCovered = paperTop <= -4;

    // Hero copy fade & sunlight angle
    const fade = 1 - smoothstep(0.06, 0.36, p);
    if (heroCopy) {
      heroCopy.style.opacity = fade.toFixed(3);
      heroCopy.style.transform = `translate3d(0, ${(-p * 60).toFixed(1)}px, 0)`;
      heroCopy.style.pointerEvents = fade < 0.15 ? 'none' : '';
    }
    if (heroVertical) heroVertical.style.opacity = fade.toFixed(3);
    if (scrollCue) scrollCue.style.opacity = (1 - smoothstep(0, 0.14, p)).toFixed(3);
    if (heroRays) heroRays.style.transform = `rotate(${(p * 14 + ptr.x * 2).toFixed(2)}deg)`;

    // Gallery background watermark subtle horizontal drift on scroll
    if (galleryWatermark && state.galleryVisible) {
      const rect = galleryWatermark.parentElement.getBoundingClientRect();
      const gp = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
      galleryWatermark.style.transform = `translate(calc(-50% + ${((gp - 0.5) * -90).toFixed(1)}px), -50%)`;
    }

    if (heroCtrl && !state.heroCovered) {
      heroCtrl.render(sharedTime.value, dt, p, ptr.x, ptr.y, ptr.inside, ptr.tx, ptr.ty);
    }
    if (galleryCtrl) {
      galleryCtrl.render(sharedTime.value, dt, ptr.x, ptr.y);
    }
    updateAbout25D(sharedTime.value, dt);

    // Cross-fade full-page front petals in once torn-paper starts rising
    const frontPetalOpacity = smoothstep(0.45, 0.9, p);
    if (pagePetals) pagePetals.update(sharedTime.value, dt, frontPetalOpacity);

    updateHUD(y, p, paperTop);

    ema += (dt - ema) * 0.08;
    if (t - shown > 0.5) {
      shown = t;
      fpsEl.textContent = `${Math.round(1 / ema)} fps`;
    }
  }

  requestAnimationFrame(frame);
})();
