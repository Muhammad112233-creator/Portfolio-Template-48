import './style.css';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

// The loading curtain is brief, intentional and skipped for reduced-motion visitors.
const loader = $('.preloader');
const counter = $('[data-count]');
const track = $('[data-track]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let progress = 0;
const loading = window.setInterval(() => {
  progress = Math.min(100, progress + Math.ceil(Math.random() * 9));
  if (counter) counter.textContent = progress;
  if (track) track.style.transform = `scaleX(${progress / 100})`;
  if (progress >= 100) {
    clearInterval(loading);
    window.setTimeout(() => loader?.classList.add('is-done'), reducedMotion ? 0 : 260);
  }
}, 54);
window.addEventListener('load', () => {
  if (progress < 100) return;
  loader?.classList.add('is-done');
}, { once: true });

// A small custom cursor on devices that actually have a fine pointer.
const cursor = $('.cursor-dot');
if (cursor && matchMedia('(pointer:fine)').matches) {
  window.addEventListener('pointermove', (event) => {
    gsap.to(cursor, { x: event.clientX - 4, y: event.clientY - 4, duration: .16, ease: 'power2.out' });
    cursor.classList.add('is-visible');
  }, { passive: true });
  $$('a, button, summary').forEach((element) => {
    element.addEventListener('pointerenter', () => cursor.classList.add('is-hover'));
    element.addEventListener('pointerleave', () => cursor.classList.remove('is-hover'));
  });
}

// Accessible mobile navigation.
const menuButton = $('.menu-toggle');
const mobileMenu = $('.mobile-menu');
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.querySelector('span').textContent = open ? '×' : '＋';
  mobileMenu.hidden = !open;
});
$$('.mobile-menu a').forEach(link => link.addEventListener('click', () => {
  mobileMenu.hidden = true;
  menuButton?.setAttribute('aria-expanded', 'false');
  if (menuButton?.querySelector('span')) menuButton.querySelector('span').textContent = '＋';
}));

// Calm mode is persistent and respects the visitor's preference.
const calmButton = $('.calm-toggle');
const calmLabel = $('.calm-label');
const calmSaved = localStorage.getItem('friday-calm-mode') === 'true';
if (calmSaved) {
  document.body.classList.add('calm-mode');
  calmButton?.setAttribute('aria-pressed', 'true');
  if (calmLabel) calmLabel.textContent = 'Calm mode on';
}
calmButton?.addEventListener('click', () => {
  const enabled = document.body.classList.toggle('calm-mode');
  calmButton.setAttribute('aria-pressed', String(enabled));
  localStorage.setItem('friday-calm-mode', String(enabled));
  if (calmLabel) calmLabel.textContent = enabled ? 'Calm mode on' : 'Calm mode';
});

// Three.js mirror ball: reflective gold/silver tiles, real pointer response, and reduced-motion support.
let ballGroup;
let renderer;
const sceneCanvas = $('.scene');
try {
  if (sceneCanvas && !reducedMotion) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, .1, 80);
    camera.position.z = 9.5;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    document.body.classList.add('has-three');
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    sceneCanvas.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x9c7b50, 1.5));
    const key = new THREE.PointLight(0xffe4a8, 54, 18); key.position.set(-3, 4, 4); scene.add(key);
    const warm = new THREE.PointLight(0xad6032, 42, 17); warm.position.set(4, -1, 3); scene.add(warm);
    const white = new THREE.PointLight(0xffffff, 35, 15); white.position.set(1, 3, -2); scene.add(white);
    ballGroup = new THREE.Group();
    const radius = innerWidth <= 620 ? 1.52 : innerWidth <= 900 ? 1.8 : 2.05;
    const base = new THREE.Mesh(new THREE.SphereGeometry(radius, 72, 48), new THREE.MeshPhysicalMaterial({ color: 0xb78d50, metalness: .95, roughness: .21, clearcoat: .95, clearcoatRoughness: .13 }));
    ballGroup.add(base);
    // Tiny square tiles form the signature disco-ball grid.
    const rows = 19, cols = 30;
    const tileMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: .96, roughness: .2, side: THREE.DoubleSide, vertexColors: true, emissive: 0x44301c, emissiveIntensity: .13 });
    const tileGeo = new THREE.PlaneGeometry(radius * .188, radius * .153);
    const tileMeshes = new THREE.InstancedMesh(tileGeo, tileMat, rows * cols);
    const temp = new THREE.Object3D();
    const colorA = new THREE.Color('#f8e2b6'), colorB = new THREE.Color('#b58c52'), colorC = new THREE.Color('#d5d0c2');
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      const lat = Math.PI * ((r + .5) / rows);
      for (let c = 0; c < cols; c++) {
        const lon = 2 * Math.PI * ((c + .5 + (r % 2) * .5) / cols);
        const normal = new THREE.Vector3(Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon));
        temp.position.copy(normal).multiplyScalar(radius * 1.004);
        temp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        temp.updateMatrix();
        tileMeshes.setMatrixAt(idx, temp.matrix);
        tileMeshes.setColorAt(idx, ((r + c) % 7 === 0) ? colorC : ((r + c) % 2 ? colorA : colorB));
        idx++;
      }
    }
    tileMeshes.instanceMatrix.needsUpdate = true;
    ballGroup.add(tileMeshes);
    const wire = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.009, 30, 20), new THREE.MeshBasicMaterial({ color: 0xf5dba9, wireframe: true, transparent: true, opacity: .23 }));
    ballGroup.add(wire);
    scene.add(ballGroup);
    const positionBall = () => {
      const viewH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
      const xPercent = innerWidth <= 620 ? .54 : innerWidth <= 900 ? .56 : .55;
      const yPercent = innerWidth <= 620 ? .58 : innerWidth <= 900 ? .51 : .48;
      ballGroup.position.set((xPercent - .5) * viewH * camera.aspect, (.5 - yPercent) * viewH, 0);
      const scale = innerWidth <= 620 ? .88 : innerWidth <= 900 ? .98 : 1.08;
      ballGroup.scale.setScalar(scale);
    };
    positionBall();
    window.addEventListener('resize', positionBall, { passive: true });
    const pointer = new THREE.Vector2();
    window.addEventListener('pointermove', e => { pointer.x = (e.clientX / innerWidth - .5) * .45; pointer.y = (e.clientY / innerHeight - .5) * .32; }, { passive: true });
    const clock = new THREE.Clock();
    const render = () => {
      const t = clock.getElapsedTime();
      if (!document.body.classList.contains('calm-mode')) {
        ballGroup.rotation.y += .0022;
        ballGroup.rotation.x += (pointer.y * .18 - ballGroup.rotation.x) * .018;
        ballGroup.rotation.z += (pointer.x * .12 - ballGroup.rotation.z) * .018;
        key.position.x = Math.sin(t * .28) * 3.5 - 2;
        warm.intensity = 35 + (Math.sin(t * .8) + 1) * 8;
      }
      renderer.render(scene, camera);
      requestAnimationFrame(render);
    };
    render();
    const spinBall = () => gsap.to(ballGroup.rotation, { y: ballGroup.rotation.y + Math.PI * 1.75, x: ballGroup.rotation.x + .38, duration: 1.7, ease: 'power3.out' });
    $('.ball-control')?.addEventListener('click', spinBall);
    $('.ball-control')?.addEventListener('keydown', e => { if (e.key.startsWith('Arrow')) spinBall(); });
  }
} catch (error) {
  console.info('The decorative 3D scene is unavailable; CSS illustration remains visible.', error);
}

// First-screen entrance and gentle section reveals.
if (!reducedMotion) {
  gsap.from('.hero-eyebrow', { y: 18, opacity: 0, duration: .65, delay: .2, ease: 'power2.out' });
  gsap.from('.hero-words .word', { yPercent: 110, opacity: 0, duration: .9, stagger: .13, delay: .2, ease: 'power4.out' });
  gsap.from('.hero-copy > *', { y: 18, opacity: 0, duration: .75, stagger: .12, delay: .55, ease: 'power2.out' });
  gsap.from('.hero-poster', { x: 26, opacity: 0, rotate: 8, duration: .9, delay: .7, ease: 'power3.out' });
  $$('.story-readable, .shop-card, .section-head, .edition-feature, .edition-cards article, .ball-story__copy, .gallery-card, .visit-card, .faq-intro, .faq-list, .partners').forEach(el => {
    gsap.from(el, { y: 34, opacity: 0, duration: .8, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
}

// Flip cards reveal an alternate caption and remain keyboard friendly.
$$('.gallery-card').forEach(card => card.addEventListener('click', () => {
  card.classList.toggle('is-flipped');
  card.setAttribute('aria-pressed', String(card.classList.contains('is-flipped')));
}));

// Countdown until the next published gathering.
const countdown = $('[data-countdown]');
if (countdown) {
  const target = new Date(countdown.dataset.date).getTime();
  const updateCountdown = () => {
    const remaining = Math.max(0, target - Date.now());
    const d = Math.floor(remaining / 86400000);
    const h = Math.floor(remaining % 86400000 / 3600000);
    const m = Math.floor(remaining % 3600000 / 60000);
    const s = Math.floor(remaining % 60000 / 1000);
    $('[data-days]', countdown).textContent = String(d).padStart(3, '0');
    $('[data-hours]', countdown).textContent = String(h).padStart(2, '0');
    $('[data-minutes]', countdown).textContent = String(m).padStart(2, '0');
    $('[data-seconds]', countdown).textContent = String(s).padStart(2, '0');
  };
  updateCountdown();
  window.setInterval(updateCountdown, 1000);
}

// Accordion behavior: keep the FAQ tidy while allowing each answer to be discovered.
$$('.faq-list details').forEach(detail => detail.addEventListener('toggle', () => {
  if (detail.open) $$('.faq-list details').filter(other => other !== detail).forEach(other => { other.open = false; });
}));
