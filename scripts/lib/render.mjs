// Convierte plantillas HTML en PNG (Playwright) y diapositivas en videos MP4 (ffmpeg).
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

let navegador;

async function abrirNavegador() {
  if (navegador) return navegador;
  const opciones = {};
  // En el entorno de Claude el Chromium viene preinstalado aquí.
  if (existsSync('/opt/pw-browsers/chromium')) opciones.executablePath = '/opt/pw-browsers/chromium';
  try {
    navegador = await chromium.launch(opciones);
  } catch {
    navegador = await chromium.launch();
  }
  return navegador;
}

export async function cerrarNavegador() {
  await navegador?.close();
  navegador = undefined;
}

export async function renderPNG({ ancho, alto, html }, salida) {
  const nav = await abrirNavegador();
  const pagina = await nav.newPage({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1 });
  await pagina.setContent(html, { waitUntil: 'load' });
  await pagina.waitForFunction(() => window.__listo === true, null, { timeout: 15000 });
  mkdirSync(dirname(salida), { recursive: true });
  await pagina.screenshot({ path: salida, type: salida.endsWith('.jpg') ? 'jpeg' : 'png', quality: salida.endsWith('.jpg') ? 92 : undefined });
  await pagina.close();
  return salida;
}

// Une diapositivas PNG en un reel vertical con zoom suave y transiciones.
export function renderVideo(diapositivas, salida, { segundos = 3.6, transicion = 0.5, fps = 30 } = {}) {
  mkdirSync(dirname(salida), { recursive: true });
  const cuadros = Math.round(segundos * fps);
  const entradas = diapositivas.flatMap((png) => ['-loop', '1', '-t', String(segundos), '-i', png]);
  const filtros = diapositivas.map((_, i) => {
    const acercar = i % 2 === 0;
    const zoom = acercar ? `min(1+0.0009*on,1.08)` : `max(1.08-0.0009*on,1)`;
    return `[${i}:v]scale=2160:3840,zoompan=z='${zoom}':d=${cuadros}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${fps},format=yuv420p,setsar=1[v${i}]`;
  });
  let ultimo = 'v0';
  for (let i = 1; i < diapositivas.length; i++) {
    const offset = (segundos - transicion) * i;
    const sig = i === diapositivas.length - 1 ? 'vfin' : `x${i}`;
    filtros.push(`[${ultimo}][v${i}]xfade=transition=${i % 2 ? 'slideleft' : 'fade'}:duration=${transicion}:offset=${offset.toFixed(2)}[${sig}]`);
    ultimo = sig;
  }
  if (diapositivas.length === 1) filtros.push('[v0]null[vfin]');
  const duracion = segundos * diapositivas.length - transicion * (diapositivas.length - 1);
  const audio = diapositivas.length; // índice de la pista de audio silenciosa
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    ...entradas,
    '-f', 'lavfi', '-t', duracion.toFixed(2), '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-filter_complex', filtros.join(';'),
    '-map', '[vfin]', '-map', `${audio}:a`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart',
    salida,
  ]);
  return salida;
}

// Toma el primer cuadro del video como portada (miniatura) en JPG.
export function miniatura(png, salida) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-q:v', '3', salida]);
  return salida;
}

export function limpiar(dir) {
  rmSync(dir, { recursive: true, force: true });
}

export { join };
