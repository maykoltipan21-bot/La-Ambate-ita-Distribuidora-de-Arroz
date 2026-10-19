// Identidad visual de La Ambateñita: colores, fuentes e ilustraciones SVG.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const COLORES = {
  verde: '#1E5B34',
  verdeClaro: '#3E8E4F',
  dorado: '#F2B632',
  doradoOscuro: '#C98A10',
  crema: '#FFF6E3',
  cremaOscuro: '#F3E3C0',
  cafe: '#4A2E14',
  rojo: '#C62828',
  blanco: '#FFFFFF',
};

function fuente(archivo) {
  const b64 = readFileSync(join(RAIZ, 'marca', 'fuentes', archivo)).toString('base64');
  return `url(data:font/woff2;base64,${b64}) format('woff2')`;
}

let cssFuentes;
export function estilosBase() {
  cssFuentes ??= `
    @font-face { font-family: 'Pacifico'; src: ${fuente('pacifico-latin-400-normal.woff2')}; }
    @font-face { font-family: 'League Gothic'; src: ${fuente('league-gothic-latin-400-normal.woff2')}; }
    @font-face { font-family: 'Montserrat'; font-weight: 500; src: ${fuente('montserrat-latin-500-normal.woff2')}; }
    @font-face { font-family: 'Montserrat'; font-weight: 700; src: ${fuente('montserrat-latin-700-normal.woff2')}; }
    @font-face { font-family: 'Montserrat'; font-weight: 800; src: ${fuente('montserrat-latin-800-normal.woff2')}; }
    @font-face { font-family: 'Montserrat'; font-weight: 900; src: ${fuente('montserrat-latin-900-normal.woff2')}; }
  `;
  const c = COLORES;
  return `${cssFuentes}
    :root {
      --verde: ${c.verde}; --verde-claro: ${c.verdeClaro}; --dorado: ${c.dorado};
      --dorado-osc: ${c.doradoOscuro}; --crema: ${c.crema}; --crema-osc: ${c.cremaOscuro};
      --cafe: ${c.cafe}; --rojo: ${c.rojo};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; }
    body { font-family: 'Montserrat', sans-serif; color: var(--cafe); background: var(--crema); overflow: hidden; }
    .script { font-family: 'Pacifico', cursive; font-weight: 400; }
  `;
}

// Generador pseudoaleatorio con semilla: las mismas imágenes salen siempre iguales.
export function azar(semilla = 7) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Granos de arroz dispersos dentro de un rectángulo.
export function granos({ x = 0, y = 0, ancho, alto, cantidad, semilla = 3, tam = 1, color = '#FFFDF5', borde = '#E6D3A8', opacidad = 1 }) {
  const r = azar(semilla);
  let s = '';
  for (let i = 0; i < cantidad; i++) {
    const gx = x + r() * ancho;
    const gy = y + r() * alto;
    const rot = Math.round(r() * 180);
    const rx = (9 + r() * 3) * tam;
    const ry = (3.6 + r() * 0.8) * tam;
    s += `<ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" transform="rotate(${rot} ${gx.toFixed(1)} ${gy.toFixed(1)})" fill="${color}" stroke="${borde}" stroke-width="${(1.2 * tam).toFixed(1)}" opacity="${opacidad}"/>`;
  }
  return s;
}

// Montículo de arroz: granos apilados dentro de una media elipse.
function monticulo({ cx, base, ancho, alto, cantidad, semilla, tam = 1 }) {
  const r = azar(semilla);
  let s = `<ellipse cx="${cx}" cy="${base}" rx="${ancho / 2}" ry="${alto}" fill="#FBF3DD"/>`;
  for (let i = 0; i < cantidad; i++) {
    const ang = Math.PI + r() * Math.PI;
    const dist = Math.sqrt(r());
    const gx = cx + Math.cos(ang) * (ancho / 2) * dist * 0.96;
    const gy = base + Math.sin(ang) * alto * dist * 0.96;
    const rot = Math.round(r() * 180);
    s += `<ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="${(9 * tam).toFixed(1)}" ry="${(3.8 * tam).toFixed(1)}" transform="rotate(${rot} ${gx.toFixed(1)} ${gy.toFixed(1)})" fill="#FFFFFF" stroke="#E2CC9C" stroke-width="1.3"/>`;
  }
  return s;
}

// Espiga de arroz (ícono de la marca).
export function espiga({ color = COLORES.dorado, tallo = COLORES.verde, tam = 120 } = {}) {
  const granosEspiga = [
    [52, 22, -30], [64, 30, 40], [46, 38, -35], [60, 46, 35], [42, 54, -40], [56, 62, 30],
    [40, 70, -45], [52, 78, 25], [38, 86, -50], [48, 93, 20],
  ];
  const g = granosEspiga
    .map(([x, y, rot]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="4.6" transform="rotate(${rot + 90} ${x} ${y})" fill="${color}"/>`)
    .join('');
  return `<svg width="${tam}" height="${tam}" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
    <path d="M58 14 C 50 40, 40 70, 44 118" fill="none" stroke="${tallo}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M44 104 C 30 96, 22 84, 20 70 C 32 78, 40 88, 44 100" fill="${tallo}"/>
    ${g}
    <ellipse cx="58" cy="12" rx="8" ry="4.4" transform="rotate(70 58 12)" fill="${color}"/>
  </svg>`;
}

// Espiguita para la etiqueta del saco (sin nombre de marca: el saco es genérico).
function espigaMini(cx, cy) {
  const g = [[-6, -14], [6, -8], [-6, -2], [6, 4], [-6, 10]]
    .map(([dx, dy]) => `<ellipse cx="${cx + dx}" cy="${cy + dy}" rx="6" ry="3" transform="rotate(${dx < 0 ? -35 : 35} ${cx + dx} ${cy + dy})" fill="${COLORES.dorado}"/>`)
    .join('');
  return `<path d="M${cx} ${cy - 20} V${cy + 22}" stroke="${COLORES.dorado}" stroke-width="2"/>${g}`;
}

// Saco de arroz genérico abierto (la foto real de cada marca se usa cuando existe).
export function saco({ ancho = 420, etiqueta = 'ARROZ', detalle = '100 lb', semilla = 11 } = {}) {
  const c = COLORES;
  const alto = ancho * 1.18;
  // La etiqueta mide ~170 unidades de ancho: achica la letra si el nombre es largo.
  const tamEtiqueta = Math.min(34, Math.floor(165 / (etiqueta.length * 0.74)));
  return `<svg width="${ancho}" height="${alto.toFixed(0)}" viewBox="0 0 400 472" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="tela" x1="0" x2="1">
        <stop offset="0" stop-color="#E4D3AE"/><stop offset="0.45" stop-color="#F6EBD2"/><stop offset="1" stop-color="#D9C59A"/>
      </linearGradient>
      <pattern id="tejido" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M0 5 H10 M5 0 V10" stroke="#CDB68A" stroke-width="1" opacity="0.45"/>
      </pattern>
    </defs>
    <ellipse cx="200" cy="458" rx="170" ry="12" fill="#000" opacity="0.12"/>
    <path d="M70 120 Q60 300 78 440 Q200 466 322 440 Q340 300 330 120 Z" fill="url(#tela)" stroke="#BFA474" stroke-width="3"/>
    <path d="M70 120 Q60 300 78 440 Q200 466 322 440 Q340 300 330 120 Z" fill="url(#tejido)"/>
    <path d="M62 112 Q200 150 338 112 L330 138 Q200 172 70 138 Z" fill="#D8C291" stroke="#BFA474" stroke-width="3"/>
    ${monticulo({ cx: 200, base: 124, ancho: 268, alto: 78, cantidad: 230, semilla })}
    <rect x="104" y="226" width="192" height="150" rx="18" fill="${c.verde}"/>
    <rect x="112" y="234" width="176" height="134" rx="12" fill="none" stroke="${c.dorado}" stroke-width="3"/>
    ${espigaMini(200, 252)}
    <text x="200" y="${detalle ? 322 : 334}" text-anchor="middle" font-family="Montserrat" font-weight="900" font-size="${tamEtiqueta}" fill="#FFF">${etiqueta}</text>
    ${detalle ? `<text x="200" y="354" text-anchor="middle" font-family="Montserrat" font-weight="700" font-size="20" fill="${c.dorado}">${detalle}</text>` : ''}
  </svg>`;
}

// Plato hondo con arroz servido.
export function plato({ ancho = 420, semilla = 5 } = {}) {
  const c = COLORES;
  return `<svg width="${ancho}" height="${(ancho * 0.72).toFixed(0)}" viewBox="0 0 400 288" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="200" cy="272" rx="150" ry="12" fill="#000" opacity="0.12"/>
    ${monticulo({ cx: 200, base: 150, ancho: 300, alto: 110, cantidad: 330, semilla, tam: 1.05 })}
    <path d="M30 150 Q40 262 200 268 Q360 262 370 150 Z" fill="${c.verde}"/>
    <path d="M30 150 Q200 176 370 150" fill="none" stroke="${c.dorado}" stroke-width="6"/>
    <path d="M70 190 Q200 214 330 190" fill="none" stroke="${c.dorado}" stroke-width="3" opacity="0.6"/>
    <circle cx="300" cy="80" r="0"/>
  </svg>`;
}

// Ícono de chat/teléfono (genérico, sin logos de terceros).
export function iconoChat({ tam = 56, color = '#FFFFFF', fondo = COLORES.verdeClaro } = {}) {
  return `<svg width="${tam}" height="${tam}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 4C16.5 4 4 15.6 4 30c0 6.2 2.3 11.9 6.2 16.4L7 60l14.4-5.6c3.3 1.1 6.9 1.6 10.6 1.6 15.5 0 28-11.6 28-26S47.5 4 32 4z" fill="${fondo}"/>
    <path d="M24.6 18.5c-.8-1.8-1.6-1.8-2.4-1.8h-2c-.7 0-1.8.3-2.8 1.3-1 1-3.6 3.5-3.6 8.6s3.7 10 4.2 10.7c.5.7 7.2 11.5 17.8 15.6 8.8 3.5 10.6 2.8 12.5 2.6 1.9-.2 6.2-2.5 7.1-5 .9-2.5.9-4.6.6-5-.3-.4-1-.7-2-1.2s-6.2-3-7.1-3.4c-1-.3-1.6-.5-2.3.5-.7 1-2.7 3.4-3.3 4-.6.7-1.2.8-2.2.3-1-.5-4.4-1.6-8.3-5.1-3.1-2.7-5.1-6.1-5.7-7.1-.6-1-.1-1.6.4-2.1.5-.4 1-1.2 1.5-1.8.5-.6.7-1 1-1.7.3-.7.2-1.3-.1-1.8-.2-.5-2.2-5.5-3.1-7.6z" fill="${color}" transform="translate(4 2) scale(0.86)"/>
  </svg>`;
}

// Ícono de ubicación.
export function iconoUbicacion({ tam = 44, color = COLORES.dorado } = {}) {
  return `<svg width="${tam}" height="${tam}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 3C15.7 3 9 9.6 9 17.8 9 29 24 45 24 45s15-16 15-27.2C39 9.6 32.3 3 24 3z" fill="${color}"/>
    <circle cx="24" cy="18" r="6" fill="#FFF"/>
  </svg>`;
}

// Camión de reparto.
export function camion({ ancho = 460 } = {}) {
  const c = COLORES;
  return `<svg width="${ancho}" height="${(ancho * 0.56).toFixed(0)}" viewBox="0 0 400 224" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="200" cy="212" rx="180" ry="9" fill="#000" opacity="0.12"/>
    <rect x="20" y="40" width="240" height="140" rx="14" fill="${c.verde}"/>
    <rect x="32" y="52" width="216" height="116" rx="10" fill="none" stroke="${c.dorado}" stroke-width="3"/>
    <text x="140" y="104" text-anchor="middle" font-family="Pacifico" font-size="30" fill="${c.dorado}">La Ambateñita</text>
    <text x="140" y="142" text-anchor="middle" font-family="Montserrat" font-weight="800" font-size="22" fill="#FFF">MAYOR Y MENOR</text>
    <path d="M262 80 H330 L372 128 V180 H262 Z" fill="${c.dorado}"/>
    <path d="M276 92 H324 L354 126 H276 Z" fill="#CFE8F2"/>
    <rect x="262" y="168" width="116" height="14" rx="4" fill="${c.doradoOscuro}"/>
    <circle cx="90" cy="186" r="26" fill="${c.cafe}"/><circle cx="90" cy="186" r="11" fill="#DDD"/>
    <circle cx="320" cy="186" r="26" fill="${c.cafe}"/><circle cx="320" cy="186" r="11" fill="#DDD"/>
  </svg>`;
}

// Fondo crema con granitos de arroz sueltos muy tenues.
export function fondoGranos(ancho, alto, semilla = 21, densidad = 1) {
  const cantidad = Math.round(((ancho * alto) / 26000) * densidad);
  return `<svg class="fondo" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;z-index:0">
    ${granos({ ancho, alto, cantidad, semilla, tam: 1.6, color: '#F6E7C4', borde: '#EEDCB1', opacidad: 0.8 })}
  </svg>`;
}

export { RAIZ };
