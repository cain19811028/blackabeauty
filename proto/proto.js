/* 2.5D hand-drawn diorama prototype (MVP). The approved SVG illustrations become textures on planes set at real
   depths in a three.js scene: a real camera gives the parallax, the gown planes are meshes that sway like cloth,
   the lawn is instanced blades bending to the wind and the pointer, and the caps are true 3D.
   Plain script, no modules, so it runs when index.html is opened from disk. */
(function () {
  'use strict';

  const T = window.THREE;
  const ART = window.PROTO_ART;
  const $ = (sel) => document.querySelector(sel);
  const canvas = $('#scene');
  if (!T || !ART || !canvas) return;

  const TAU = Math.PI * 2;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const smooth = (x) => x * x * (3 - 2 * x);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = window.matchMedia('(max-width: 767px)').matches;

  // Deterministic jitter: the lawn and petals look the same on every load.
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // The art's colours are authored for the page (sRGB). Passing them through untouched keeps them identical to the SVG.
  T.ColorManagement.enabled = false;
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (err) {
    document.documentElement.classList.add('no-webgl');
    console.error(err);
    return;
  }
  renderer.outputColorSpace = T.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(32, 1, 0.1, 400);
  const look = new T.Vector3();

  /* ---------- wind: the same model as the site (js/core.js), plus a front that crosses the lawn ---------- */
  const wind = {
    t: 0,
    start: -100,
    next: 9,
    strength: 1,
    env(dt) {
      return dt < 0 ? 0 : dt < 1.2 ? smooth(dt / 1.2) : dt < 3.6 ? 1 - smooth((dt - 1.2) / 2.4) : 0;
    },
    // the gust reaches x = -9 first and travels right at 7 m/s
    gustAt(x) { return this.env(this.t - this.start - (x + 9) / 7) * this.strength; },
    trigger(strength) {
      this.strength = strength;
      this.start = this.t;
      this.next = this.t + 10 + rand() * 6;
    },
    update(t) {
      this.t = t;
      if (t >= this.next) this.trigger(1);
    },
  };

  /* ---------- SVG art → textures (rasterised at runtime, so there are no image files to load from disk) ---------- */
  const palette = (...names) => Object.assign({}, ...names.map((n) => ART.palettes[n]));
  function svgDoc(body, vbW, vbH, pxW, pxH, vars) {
    const style = vars ? `<style>:root{${Object.entries(vars).map(([k, v]) => `--${k}:${v}`).join(';')}}</style>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}" width="${pxW}" height="${pxH}">${style}<defs>${ART.defs}</defs>${body}</svg>`;
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
      img.onerror = () => reject(new Error('could not rasterise SVG art'));
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  // Premultiplied alpha + mipmaps: edges stay clean when a cut-out is drawn smaller than its texture.
  function texture(source) {
    const tex = new T.CanvasTexture(source);
    tex.premultiplyAlpha = true;
    tex.anisotropy = maxAniso;
    tex.minFilter = T.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    return tex;
  }
  const art = (body, vbW, vbH, scale, vars, blur) =>
    rasterize(svgDoc(body, vbW, vbH, Math.round(vbW * scale), Math.round(vbH * scale), vars), Math.round(vbW * scale), Math.round(vbH * scale), blur).then(texture);

  /* ---------- cut-out material: unlit, premultiplied; gown planes add a cloth sway that grows toward the hem ---------- */
  const time = { value: 0 };
  const CUTOUT_VERT = `
    uniform float uTime, uSway, uGust, uPhase;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 p = position;
      // uv.y is 1 at the collar and 0 at the hem; the shoulders stay pinned to the dress form
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
  function cutout(tex, sway, phase) {
    return new T.ShaderMaterial({
      uniforms: { map: { value: tex }, uTime: time, uSway: { value: sway ? 1 : 0 }, uGust: { value: 0 }, uPhase: { value: phase || 0 }, uOpacity: { value: 1 } },
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
  function plane(w, h, material, x, y, z, order, segW, segH) {
    const mesh = new T.Mesh(new T.PlaneGeometry(w, h, segW || 1, segH || 1), material);
    mesh.position.set(x, y, z);
    mesh.renderOrder = order;
    scene.add(mesh);
    return mesh;
  }

  /* ---------- lawn: one triangle per blade, bent by the breeze, the gust front and the pointer ---------- */
  const lawn = {
    uTime: time,
    uGustStart: { value: -100 },
    uGustStrength: { value: 1 },
    uPointer: { value: new T.Vector4(0, 0, 0, 0) },
    uCam: { value: new T.Vector3() },
    uBase: { value: new T.Color(0x86BC62) },
    uTip: { value: new T.Color(0xD2EAAB) },
    uHaze: { value: new T.Color(0xD0E4BF) },
    // x, z of each dress form and its scale: the gown's soft shadow falls to the lower left, away from the sun
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
      col += step(0.5, fract(vWorld.x * 0.3 + 0.25)) * 0.035;   // mown stripes running toward the campus
      float shade = 0.0;
      for (int i = 0; i < 3; i++) {
        vec2 q = (vWorld.xz - (uShadow[i].xy + vec2(-0.42, 0.06) * uShadow[i].z)) / (vec2(0.95, 0.36) * uShadow[i].z);
        shade = max(shade, 1.0 - smoothstep(0.25, 1.0, length(q)));
      }
      col *= 1.0 - 0.5 * shade;
      col = mix(col, uHaze, smoothstep(9.0, 30.0, length(vWorld - uCam)) * 0.8);
      gl_FragColor = vec4(col, 1.0);
    }`;
  function makeGrass(count) {
    const geo = new T.InstancedBufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0, 1, 0]), 3));
    const offset = new Float32Array(count * 3);
    const params = new Float32Array(count * 4);
    const tint = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const x = -10 + 20 * rand();
      const z = -9.5 + 14 * rand();
      // blades right in front of the camera are kept short so they frame the gowns instead of hiding the hems
      const near = smooth(clamp((z - 0.8) / 3.4, 0, 1));
      offset.set([x, 0, z], i * 3);
      params.set([(0.055 + rand() * 0.075) * (1 - near * 0.45), 0.02 + rand() * 0.02, (rand() - 0.5) * 1.3, rand() * TAU], i * 4);
      tint[i] = rand();
    }
    geo.setAttribute('aOffset', new T.InstancedBufferAttribute(offset, 3));
    geo.setAttribute('aParams', new T.InstancedBufferAttribute(params, 4));
    geo.setAttribute('aTint', new T.InstancedBufferAttribute(tint, 1));
    geo.instanceCount = count;
    const mat = new T.ShaderMaterial({
      uniforms: lawn,
      side: T.DoubleSide,
      vertexShader: `
        attribute vec3 aOffset;
        attribute vec4 aParams;   // height, width, yaw, phase
        attribute float aTint;
        uniform float uTime, uGustStart, uGustStrength;
        uniform vec4 uPointer;    // xyz on the ground, w = strength
        varying float vH, vTint;
        varying vec3 vWorld;
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
          p.x += lean + dir.x * push;
          p.z += dir.y * push;
          p.y -= (abs(lean) + push) * 0.35 * h;
          vWorld = aOffset + p;
          vH = h;
          vTint = aTint;
          gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
        }`,
      fragmentShader: LAWN_FRAG,
    });
    const mesh = new T.Mesh(geo, mat);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  }
  function makeGround() {
    const mat = new T.ShaderMaterial({
      uniforms: lawn,
      vertexShader: `
        varying float vH, vTint;
        varying vec3 vWorld;
        void main() {
          vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
          vH = 0.1;
          vTint = 0.5;
          gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
        }`,
      fragmentShader: LAWN_FRAG,
    });
    const mesh = new T.Mesh(new T.PlaneGeometry(280, 160), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(0, 0, -62);
    scene.add(mesh);
  }

  /* ---------- far hills behind the campus: two soft ridges drawn straight onto a canvas ---------- */
  function hillsTexture() {
    const c = document.createElement('canvas');
    c.width = 2048;
    c.height = 96;
    const ctx = c.getContext('2d');
    const ridge = (color, base, amp, freq, phase) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, c.height);
      for (let x = 0; x <= c.width; x += 16) {
        ctx.lineTo(x, base - amp * (Math.sin(x * freq + phase) * 0.6 + Math.sin(x * freq * 2.3 + phase * 2) * 0.4));
      }
      ctx.lineTo(c.width, c.height);
      ctx.fill();
    };
    ridge('#D9E9C8', 44, 22, 0.0041, 0.6);
    ridge('#CADFB6', 66, 14, 0.0057, 2.1);
    return texture(c);
  }

  /* ---------- kapok petals and whole flowers, in two depth bands so they pass behind and in front of the gowns ---------- */
  function petalTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    ctx.translate(64, 64);
    ctx.scale(2, 2);
    const g = ctx.createLinearGradient(0, 26, 0, -26);
    g.addColorStop(0, '#B93220');
    g.addColorStop(0.5, '#E2492C');
    g.addColorStop(1, '#FF8A57');
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.bezierCurveTo(-12, 20, -20, -2, -17, -16);
    ctx.bezierCurveTo(-15, -26, -6, -28, 0, -27);
    ctx.bezierCurveTo(6, -28, 15, -26, 17, -16);
    ctx.bezierCurveTo(20, -2, 12, 20, 0, 26);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 176, 130, .5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.quadraticCurveTo(1.5, 0, 0, -20);
    ctx.stroke();
    return texture(c);
  }
  function petalField(tex, count, zMin, zMax, size, fall, order) {
    const mat = new T.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, side: T.DoubleSide,
      blending: T.CustomBlending, blendSrc: T.OneFactor, blendDst: T.OneMinusSrcAlphaFactor,
    });
    const mesh = new T.InstancedMesh(new T.PlaneGeometry(1, 1), mat, count);
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
      p.rx = rand() * TAU;
      p.ry = rand() * TAU;
      p.rz = rand() * TAU;
      p.wx = (rand() - 0.5) * 3;
      p.wy = (rand() - 0.5) * 2.2;
      p.wz = (rand() - 0.5) * 1.6;
      p.phase = rand() * TAU;
      return p;
    };
    const items = Array.from({ length: count }, () => spawn({}, true));
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

  /* ---------- true 3D mortarboard, cel-shaded in three tones to sit with the illustrations ---------- */
  const ramp = new T.DataTexture(new Uint8Array([118, 186, 255]), 3, 1, T.RedFormat);
  ramp.minFilter = ramp.magFilter = T.NearestFilter;
  ramp.needsUpdate = true;
  const toon = (hex) => new T.MeshToonMaterial({ color: hex, gradientMap: ramp });
  const CAP_TILT = 0.3; // tipped toward the viewer, the way the illustrated caps show their top
  function makeCap(unit) {
    const group = new T.Group(); // origin: bottom centre of the skull, where it rests on the dress form's wooden cap
    const body = new T.Group();
    const cloth = toon(0x30354B);
    const trim = toon(new T.Color(ART.palettes[unit.tassel].tassel).getHex());
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
    const pivot = new T.Group(); // the tassel hangs from the board's right corner
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
    body.scale.setScalar(unit.s);
    body.rotation.x = CAP_TILT;
    group.add(body);
    scene.add(group);
    const rest = new T.Vector3(unit.x, 1.605 * unit.s, unit.z + 0.05);
    group.position.copy(rest);
    return { group, body, pivot, rest, state: 'resting', angle: 0, vel: 0, seed: rand() * TAU, lastX: rest.x };
  }

  /* ---------- scene assembly ---------- */
  const UNITS = [
    { name: 'bachelor', x: 0.3, z: -0.55, s: 0.9, vars: palette('cw-black', 'trim-silver'), parts: ['k-sleeves', 'k-body', 'k-stole'], tassel: 'tassel-silver' },
    { name: 'master', x: 1.5, z: 0, s: 1, vars: palette('cw-black', 'trim-gold'), parts: ['k-sleeves', 'k-body', 'k-hood', 'k-plum'], tassel: 'tassel-gold' },
    { name: 'doctor', x: 2.7, z: -0.55, s: 0.9, vars: palette('cw-crimson'), parts: ['k-sleeves-dr', 'k-body', 'k-yoke', 'k-facings'], tassel: 'tassel-gold' },
  ];
  const uses = (ids) => ids.map((id) => `<use href="#${id}"/>`).join('');
  const formBody = `<use href="#k-form-stand"/><g filter="url(#k-grain)"><use href="#k-neck"/><use href="#k-form-neck"/></g>`;
  const gownBody = (unit) => `<g filter="url(#k-grain)">${uses(unit.parts)}</g>`;

  const state = { sway: true, dof: true, compare: false, ready: false };
  const layers = {};
  let grass;
  let caps = [];
  let fields = [];

  // Texture pixels per art unit so that a gown `d` metres from the camera is sampled about 1:1 (10% spare). That
  // is what keeps the hand-drawn edges as crisp as live SVG; a much larger texture would be softened by mipmapping.
  function rasterScale(d) {
    const pxPerMetre = (window.innerHeight * renderer.getPixelRatio()) / (2 * d * Math.tan((camera.fov * Math.PI) / 360));
    return clamp(((pxPerMetre * 1.8) / 720) * 1.1, 0.6, 3); // 720 art units span 1.8 m
  }
  const raster = { d: 0, busy: false };
  // Draws (or redraws) every gown and dress form for camera distance `d`, creating the planes on the first call.
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
      unit.form = plane(unit.s, 2 * unit.s, cutout(formTex), unit.x, unit.s, unit.z, order);
      unit.gown = plane(unit.s, 1.8 * unit.s, cutout(gownTex, true, i * 2.1), unit.x, 1.1 * unit.s, unit.z + 0.006, order + 1, 20, 36);
      lawn.uShadow.value[i].set(unit.x, unit.z, unit.s);
    }
    raster.d = d;
    raster.busy = false;
  }

  async function build() {
    resize(); // the camera's aspect decides the resting distance the first textures are drawn for
    scene.add(new T.HemisphereLight(0xffffff, 0x8088a8, 2.2));
    const sun = new T.DirectionalLight(0xfff3df, 2.6);
    sun.position.set(4, 7, 5);
    scene.add(sun);

    makeGround();
    grass = makeGrass(phone ? 22000 : 90000);

    const [cloudsFar, cloudsMid, campusSharp, campusSoft, branchSharp, branchSoft, flowerTex] = await Promise.all([
      art(ART.cloudsFar, 1440, 900, 0.7),
      art(ART.cloudsMid, 1440, 900, 0.7),
      art(ART.campus, 1440, 320, 1.4),
      art(ART.campus, 1440, 320, 1.4, null, 1.6),
      art(ART.branch, 660, 440, 2),
      art(ART.branch, 660, 440, 2, null, 7),
      art('<use href="#k-blossom" x="0" y="0" width="72" height="72"/>', 72, 72, 3),
    ]);
    plane(124, 77.5, cutout(cloudsFar), 0, 3.2, -112, 1);
    plane(104, 65, cutout(cloudsMid), 0, 3.0, -92, 2);
    plane(170, 8, cutout(hillsTexture()), 0, 3.6, -66, 3);
    layers.campus = { mesh: plane(29.5, 6.56, cutout(campusSoft), 0, 3.12, -60, 4), sharp: campusSharp, soft: campusSoft };

    await dress(rig().z);
    caps = UNITS.map(makeCap);

    // origin at the top-right corner so the branch sways from where it leaves the frame
    const branchGeo = new T.PlaneGeometry(1, 0.667).translate(-0.5, -0.333, 0);
    const branch = new T.Mesh(branchGeo, cutout(branchSoft));
    branch.renderOrder = 60;
    scene.add(branch);
    layers.branch = { mesh: branch, sharp: branchSharp, soft: branchSoft };

    const petalTex = petalTexture();
    fields = [
      petalField(petalTex, phone ? 30 : 70, -7, -0.9, 0.11, 0.55, 20),
      petalField(flowerTex, phone ? 4 : 8, -6, -0.9, 0.2, 0.95, 21),
      petalField(petalTex, phone ? 20 : 46, 0.7, 5, 0.1, 0.55, 50),
      petalField(flowerTex, phone ? 3 : 6, 0.7, 4.5, 0.18, 0.95, 51),
    ];

    resize();
    state.ready = true;
    if (!reducedMotion) toss();
  }

  /* ---------- cap toss: a tumbling arc up from below the frame, landing on each dress form ---------- */
  function toss() {
    caps.forEach((cap, i) => {
      cap.state = 'waiting';
      cap.t0 = time.value + 0.3 + i * 0.16;
      cap.dur = 1.4 + i * 0.08;
      cap.spinX = (i % 2 ? -1 : 1) * (1.5 + i * 0.3);
      cap.spinZ = (i % 2 ? 1 : -1) * 0.75;
      cap.p0 = new T.Vector3(cap.rest.x - 0.9 + i * 0.5, -1.0, cap.rest.z + 3.4);
      cap.ctrl = new T.Vector3((cap.p0.x + cap.rest.x) / 2, 4.8, (cap.p0.z + cap.rest.z) / 2);
      cap.group.position.copy(cap.p0);
      cap.lastX = cap.p0.x;
    });
  }
  function stepTassel(cap, target, dt) {
    const acc = -70 * (cap.angle - target) - 5.5 * cap.vel;
    cap.vel += acc * dt;
    cap.angle = clamp(cap.angle + cap.vel * dt, -1, 1);
    cap.pivot.rotation.z = cap.angle;
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
          a * cap.p0.z + b * cap.ctrl.z + c * cap.rest.z,
        );
        const left = Math.pow(1 - u, 3);
        cap.body.rotation.x = CAP_TILT + cap.spinX * TAU * left;
        cap.body.rotation.z = cap.spinZ * TAU * left;
        const vx = (cap.group.position.x - cap.lastX) / Math.max(dt, 1e-3);
        cap.lastX = cap.group.position.x;
        stepTassel(cap, clamp(-vx * 0.5, -0.8, 0.8), dt);
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
      stepTassel(cap, wind.gustAt(cap.rest.x) * 0.45 + Math.sin(t * 1.6 + cap.seed) * 0.03, dt);
    });
  }

  /* ---------- camera: pointer moves it sideways for parallax, scrolling dollies it toward the gowns ---------- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, inside: false };
  const ray = new T.Raycaster();
  const groundPlane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  const hit = new T.Vector3();
  // Resting view: eye a little below the gowns' shoulders and tilted up, so the sky takes the upper half and the
  // campus sits low on the horizon. On a portrait screen the camera centres on the gowns and stands further back.
  function rig() {
    const portrait = camera.aspect < 0.9;
    return portrait
      ? { x: 1.5, y: 1.25, z: 13.5, lookY: 1.6, pushX: 0, pushLook: 0, pushZ: 4.5 }
      : { x: 0, y: 1.25, z: 7, lookY: 1.75, pushX: 0.9, pushLook: 1.4, pushZ: 2.6 };
  }
  function placeCamera(p, px, py) {
    const r = rig();
    const e = smooth(p);
    camera.position.set(r.x + px * 0.5 + e * r.pushX, r.y - py * 0.16 + e * 0.1, r.z - e * r.pushZ);
    look.set(r.x + e * r.pushLook, r.lookY - e * 0.3, 0);
    camera.lookAt(look);
  }
  function placeBranch() {
    // pinned to the top-right corner of the resting view, 2.2 m in front of the camera
    const r = rig();
    const d = 2.2;
    const halfH = Math.tan((camera.fov * Math.PI) / 360) * d;
    const up = ((r.lookY - r.y) / r.z) * d; // the view is tilted up, so its centre rises with distance
    layers.branch.mesh.position.set(r.x + halfH * camera.aspect + 0.08, r.y + up + halfH + 0.1, r.z - d);
    layers.branch.mesh.scale.setScalar(camera.aspect < 0.9 ? 0.6 : 0.95);
  }
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (layers.branch) placeBranch();
    raster.d = 0; // a new window size needs new textures; the frame loop redraws them once things are still
    if (state.compare) layoutCompare();
  }

  /* ---------- sharpness check: live vector SVG beside the textured plane, same size, nothing moving ---------- */
  function layoutCompare() {
    placeCamera(0, 0, 0);
    camera.updateMatrixWorld();
    const master = UNITS[1];
    const toPx = (x, y) => {
      const v = new T.Vector3(x, y, master.z).project(camera);
      return [(v.x * 0.5 + 0.5) * window.innerWidth, (1 - (v.y * 0.5 + 0.5)) * window.innerHeight];
    };
    const [left, top] = toPx(master.x - 0.5, 2);
    const [right, bottom] = toPx(master.x + 0.5, 0);
    const w = right - left;
    const h = bottom - top;
    const box = $('#compare-vector');
    const x = Math.max(8, left - w - 56);
    box.style.cssText = `left:${x}px;top:${top}px;width:${w}px;height:${h}px`;
    box.innerHTML = svgDoc(formBody + gownBody(master), 400, 800, w, h, master.vars);
    $('#tag-vector').style.cssText = `left:${x + w / 2}px;top:${top - 10}px`;
    $('#tag-webgl').style.cssText = `left:${left + w / 2}px;top:${top - 10}px`;
  }
  function setCompare(on) {
    state.compare = on;
    $('#b-compare').setAttribute('aria-pressed', String(on));
    $('#compare').hidden = !on;
    $('#copy').style.opacity = on ? 0 : '';
    UNITS.forEach((unit, i) => {
      const show = !on || unit.name === 'master';
      unit.form.visible = show;
      unit.gown.visible = show;
      lawn.uShadow.value[i].x = show ? unit.x : 1e4; // a hidden gown casts no shadow
    });
    caps.forEach((cap) => { cap.group.visible = !on; });
    fields.forEach((f) => { f.mesh.visible = !on && $('#t-petals').checked; });
    if (on) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      layoutCompare();
    }
  }

  /* ---------- controls ---------- */
  $('#t-sway').addEventListener('change', (e) => { state.sway = e.target.checked; });
  $('#t-grass').addEventListener('change', (e) => { grass.visible = e.target.checked; });
  $('#t-petals').addEventListener('change', (e) => { fields.forEach((f) => { f.mesh.visible = e.target.checked && !state.compare; }); });
  $('#t-dof').addEventListener('change', (e) => {
    state.dof = e.target.checked;
    ['campus', 'branch'].forEach((k) => { layers[k].mesh.material.uniforms.map.value = state.dof ? layers[k].soft : layers[k].sharp; });
  });
  $('#b-gust').addEventListener('click', () => wind.trigger(1.35));
  $('#b-toss').addEventListener('click', () => { if (state.ready && !state.compare) toss(); });
  $('#b-compare').addEventListener('click', () => { if (state.ready) setCompare(!state.compare); });

  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    pointer.inside = e.pointerType === 'mouse';
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { pointer.inside = false; pointer.tx = 0; pointer.ty = 0; });
  window.addEventListener('resize', resize);

  /* ---------- frame loop ---------- */
  const fpsEl = $('#fps');
  let last = 0;
  let ema = 1 / 60;
  let shown = 0;
  let lastDist = 0;
  let stillSince = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!state.ready || document.hidden) { last = 0; return; }
    const t = now / 1000;
    const dt = last ? Math.min(0.05, t - last) : 1 / 60;
    last = t;
    const still = reducedMotion || state.compare;

    if (!still) {
      time.value += dt;
      wind.update(time.value);
    }
    lawn.uGustStart.value = wind.start;
    lawn.uGustStrength.value = still ? 0 : wind.strength;

    const k = 1 - Math.exp(-dt * 4);
    pointer.x += ((state.compare ? 0 : pointer.tx) - pointer.x) * k;
    pointer.y += ((state.compare ? 0 : pointer.ty) - pointer.y) * k;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = state.compare || max <= 0 ? 0 : clamp(window.scrollY / max, 0, 1);
    placeCamera(p, pointer.x, pointer.y);
    // Once the camera has rested at a new distance, redraw the gown textures for that size, the way a browser
    // re-rasters a layer after a zoom: sharp at rest, a touch soft only while moving.
    const dist = camera.position.z;
    if (Math.abs(dist - lastDist) > 0.002) {
      lastDist = dist;
      stillSince = t;
    } else if (!raster.busy && t - stillSince > 0.35 && Math.abs(Math.log2(dist / raster.d)) > 0.12) {
      dress(dist).catch((err) => { raster.busy = false; console.error(err); });
    }
    lawn.uCam.value.copy(camera.position);
    if (!state.compare) $('#copy').style.opacity = String(1 - smooth(clamp(p * 2.4, 0, 1)));

    // where the pointer touches the lawn, the blades lean away
    ray.setFromCamera({ x: pointer.tx, y: -pointer.ty }, camera);
    const onGround = pointer.inside && !still && ray.ray.intersectPlane(groundPlane, hit);
    lawn.uPointer.value.set(hit.x, hit.y, hit.z, onGround ? 1 : 0);

    UNITS.forEach((unit) => {
      const u = unit.gown.material.uniforms;
      u.uSway.value = state.sway && !still ? 1 : 0;
      u.uGust.value = wind.gustAt(unit.x);
    });
    if (!still) {
      updateCaps(time.value, dt);
      fields.forEach((f) => { if (f.mesh.visible) f.update(time.value, dt); });
      layers.branch.mesh.rotation.z = Math.sin(time.value * 0.9) * 0.012 + wind.gustAt(4) * 0.03;
    }

    renderer.render(scene, camera);

    ema += (dt - ema) * 0.08;
    if (t - shown > 0.5) {
      shown = t;
      fpsEl.textContent = `${Math.round(1 / ema)} fps`;
    }
  }

  build().then(() => requestAnimationFrame(frame)).catch((err) => {
    console.error(err);
    fpsEl.textContent = '場景載入失敗：' + err.message;
  });
})();
