// Plantillas de diseño. Cada una recibe (datos, negocio) y devuelve { ancho, alto, html }.
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import {
  COLORES, RAIZ, estilosBase, espiga, saco, plato, camion, iconoChat, iconoUbicacion, fondoGranos,
} from './marca.mjs';

const esc = (t = '') => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function telefonoBonito(numero) {
  const n = String(numero || '').replace(/\D/g, '');
  if (n.length === 10) return `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  return n;
}

export function precioBonito(precio) {
  if (precio === null || precio === undefined || precio === '') return null;
  return `$${Number(precio).toFixed(2)}`;
}

export function ciudadesTexto(negocio) {
  const c = negocio.ciudades || [];
  return c.length > 1 ? `${c.slice(0, -1).join(', ')} y ${c.at(-1)}` : c[0] || '';
}

// ref: "Conejo/Quintal" (marca/presentación) o solo "Quintal" (primera marca que la tenga).
export function buscarPresentacion(negocio, ref) {
  const igual = (a, b) => a.toLowerCase() === b.toLowerCase();
  const [prodNombre, presNombre] = ref.includes('/') ? ref.split('/') : [null, ref];
  const candidatos = prodNombre ? negocio.productos.filter((p) => igual(p.nombre, prodNombre)) : negocio.productos;
  for (const producto of candidatos) {
    const pres = producto.presentaciones.find((p) => igual(p.nombre, presNombre));
    if (pres) return { producto, pres };
  }
  return { producto: candidatos[0], pres: undefined };
}

export function buscarProducto(negocio, nombre) {
  return negocio.productos.find((p) => p.nombre.toLowerCase() === String(nombre).toLowerCase());
}

// "45 kg" -> 99.2, "25 lb" -> 25: sirve para ordenar presentaciones de mayor a menor.
function pesoLibras(detalle = '') {
  const m = String(detalle).match(/([\d.,]+)\s*(kg|lb)/i);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(',', '.'));
  return m[2].toLowerCase() === 'kg' ? n * 2.2046 : n;
}

// Columnas de la tabla de precios: cada peso distinto que vende alguna marca.
function columnasPresentacion(negocio) {
  const cols = new Map();
  for (const p of negocio.productos) {
    for (const pr of p.presentaciones) {
      if (!cols.has(pr.detalle)) cols.set(pr.detalle, { detalle: pr.detalle, nombre: /^\d/.test(pr.nombre) ? '' : pr.nombre });
    }
  }
  return [...cols.values()].sort((a, b) => pesoLibras(b.detalle) - pesoLibras(a.detalle));
}

// Foto de la presentación (si la hay) o, si no, la foto general de la marca.
function fotoDe(producto, pres) {
  return [pres?.foto, producto?.foto].find((f) => f && existsSync(join(RAIZ, f)));
}

function tieneFoto(producto) {
  return Boolean(fotoDe(producto));
}

// Foto real del saco en una tarjeta blanca, un poco inclinada.
function tarjetaFoto(producto, { alto = 420, giro = 3, pres } = {}) {
  return `<div style="display:inline-block;background:#fff;border-radius:28px;padding:16px;box-shadow:0 16px 36px rgba(74,46,20,.2);transform:rotate(${giro}deg)">
    <img src="${imagenDataUrl(fotoDe(producto, pres))}" style="display:block;height:${alto}px;border-radius:16px">
  </div>`;
}

function filasPrecios(producto, { altoFila = 104, tamNombre = 42, tamPrecio = 54 } = {}) {
  return producto.presentaciones.map((pr) => `
    <div style="display:flex;align-items:center;justify-content:space-between;height:${altoFila}px;padding:0 34px;background:#fff;border-radius:22px;box-shadow:0 6px 18px rgba(74,46,20,.1);margin-bottom:${Math.round(altoFila * 0.16)}px">
      <div style="text-align:left">
        <span style="font-weight:900;font-size:${tamNombre}px;color:var(--verde)">${esc(pr.nombre)}</span>
        ${pr.nombre.includes(pr.detalle.replace(' lb', '')) ? '' : `<span style="font-weight:700;font-size:${tamNombre * 0.66}px;margin-left:10px">${esc(pr.detalle)}</span>`}
      </div>
      <div style="font-weight:900;font-size:${tamPrecio}px;color:${pr.precio == null ? 'var(--dorado-osc)' : 'var(--cafe)'}">${precioBonito(pr.precio) || 'Consulta'}</div>
    </div>`).join('');
}

// Página HTML completa con estilos de marca y auto-ajuste del texto.
function pagina(ancho, alto, css, cuerpo, semillaFondo = 21) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
  <style>${estilosBase()}
    body { width: ${ancho}px; height: ${alto}px; position: relative; }
    .capa { position: absolute; z-index: 1; }
    .zona > * { flex-shrink: 0; }
    ${css}
  </style></head><body>
  ${fondoGranos(ancho, alto, semillaFondo)}
  ${cuerpo}
  <script>
    // Reduce la letra de los bloques [data-ajustar] hasta que el texto quepa.
    document.fonts.ready.then(() => {
      // data-max: alto máximo para bloques sin alto fijo (los que van dentro de columnas flex).
      document.querySelectorAll('[data-ajustar]').forEach((el) => {
        let tam = parseFloat(getComputedStyle(el).fontSize);
        const min = parseFloat(el.dataset.ajustar) || 20;
        const max = parseFloat(el.dataset.max) || 0;
        const excede = () => el.scrollWidth > el.clientWidth + 1 ||
          (max ? el.scrollHeight > max : el.scrollHeight > el.clientHeight + tam * 0.2);
        while (excede() && tam > min) {
          tam -= 2; el.style.fontSize = tam + 'px';
        }
      });
      window.__listo = true;
    });
  </script></body></html>`;
}

function encabezado({ tam = 1, claro = false } = {}) {
  const color = claro ? COLORES.dorado : COLORES.verde;
  const sub = claro ? '#FFFFFF' : COLORES.cafe;
  return `<div class="encabezado" style="display:flex;align-items:center;gap:${12 * tam}px">
    ${espiga({ tam: 84 * tam, tallo: claro ? '#FFFFFF' : COLORES.verde })}
    <div>
      <div class="script" style="font-size:${58 * tam}px;line-height:1.1;color:${color}">La Ambateñita</div>
      <div style="font-weight:800;font-size:${17 * tam}px;letter-spacing:${5 * tam}px;color:${sub};margin-top:${2 * tam}px">DISTRIBUIDORA DE ARROZ</div>
    </div>
  </div>`;
}

function lineaWhatsapp(negocio) {
  return negocio.whatsapp ? telefonoBonito(negocio.whatsapp) : 'WhatsApp pendiente';
}

function pie(negocio, ancho, alto, altoPie = 150) {
  return `<div class="capa pie" style="left:0;top:${alto - altoPie}px;width:${ancho}px;height:${altoPie}px;background:var(--verde);display:flex;align-items:center;justify-content:space-between;padding:0 60px;color:#fff">
    <div style="display:flex;align-items:center;gap:20px">
      ${iconoChat({ tam: 74 })}
      <div>
        <div style="font-weight:700;font-size:24px;color:var(--dorado);letter-spacing:1px">PIDE TU ARROZ POR WHATSAPP</div>
        <div style="font-weight:900;font-size:46px;letter-spacing:1px">${esc(lineaWhatsapp(negocio))}</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;text-align:right">
      ${iconoUbicacion({ tam: 48 })}
      <div style="font-weight:800;font-size:30px;line-height:1.2">${(negocio.ciudades || []).map(esc).join('<br>')}</div>
    </div>
  </div>`;
}

function etiqueta(texto, color = 'var(--rojo)', tam = 1) {
  return `<span style="display:inline-block;background:${color};color:#fff;font-weight:900;font-size:${30 * tam}px;letter-spacing:${3 * tam}px;padding:${12 * tam}px ${28 * tam}px;border-radius:999px">${esc(texto)}</span>`;
}

function medallaPrecio({ nombre, detalle, precio, tam = 300 }) {
  const p = precioBonito(precio);
  return `<div style="width:${tam}px;height:${tam}px;border-radius:50%;background:var(--dorado);border:10px solid #fff;box-shadow:0 12px 30px rgba(0,0,0,.18);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--cafe);transform:rotate(-8deg)">
    <div style="font-weight:800;font-size:${tam * 0.1}px;letter-spacing:2px">${esc((nombre || '').toUpperCase())}</div>
    <div style="font-weight:700;font-size:${tam * 0.075}px">${esc(detalle || '')}</div>
    ${p
      ? `<div style="font-weight:900;font-size:${tam * 0.24}px;line-height:1;margin-top:6px;color:var(--verde)">${p}</div>`
      : `<div style="font-weight:900;font-size:${tam * 0.1}px;line-height:1.1;margin-top:8px;color:var(--verde)">CONSULTA<br>EL PRECIO</div>`}
  </div>`;
}

// ---------- Publicaciones de feed (1080 x 1350) ----------

const FEED = { ancho: 1080, alto: 1350 };

function oferta(d, negocio) {
  const { ancho, alto } = FEED;
  const { producto, pres } = buscarPresentacion(negocio, d.presentacion || 'Quintal');
  const imagen = tieneFoto(producto)
    ? `<div class="capa" style="left:600px;top:640px">${tarjetaFoto(producto, { alto: 430, giro: 4, pres })}</div>`
    : `<div class="capa" style="left:560px;top:640px">${saco({ ancho: 470, detalle: esc(pres?.detalle || '') })}</div>`;
  const cuerpo = `
    <div class="capa" style="left:60px;top:50px">${encabezado()}</div>
    <div class="capa" style="left:60px;top:230px">${etiqueta(d.etiqueta || 'PRECIO DE LA SEMANA')}</div>
    <div class="capa" data-ajustar="54" style="left:60px;top:320px;width:960px;height:300px;font-weight:900;font-size:104px;line-height:1.02;color:var(--verde);text-transform:uppercase">${esc(d.titulo)}</div>
    <div class="capa" data-ajustar="26" style="left:60px;top:640px;width:500px;height:240px;font-weight:700;font-size:40px;line-height:1.25">${esc(d.subtitulo || '')}</div>
    ${imagen}
    <div class="capa" style="left:110px;top:890px">${medallaPrecio({ nombre: `${producto?.nombre || ''} · ${pres?.nombre || ''}`, detalle: pres?.detalle, precio: pres?.precio, tam: 300 })}</div>
    ${pie(negocio, ancho, alto)}`;
  return { ancho, alto, html: pagina(ancho, alto, '', cuerpo, 31) };
}

// Todos los precios en fondo blanco: una tarjeta por marca con su foto y todas sus
// presentaciones. Con d.detalle ("25 lb", "45 kg"...) muestra solo esa presentación.
function precios(d, negocio) {
  const { ancho, alto } = FEED;
  const productos = negocio.productos
    .map((p) => ({ ...p, presentaciones: d.detalle ? p.presentaciones.filter((pr) => pr.detalle === d.detalle) : p.presentaciones }))
    .filter((p) => p.presentaciones.length);
  const filasGrid = Math.ceil(productos.length / 2);
  const maxFilas = Math.max(...productos.map((p) => p.presentaciones.length));
  const altoGrid = alto - 130 - 22 - 350;
  const altoTarjeta = Math.floor((altoGrid - (filasGrid - 1) * 28) / filasGrid);
  const ALTO_CABEZA = 170;
  const unaSola = maxFilas === 1;
  const altoFila = unaSola ? 96 : Math.min(62, Math.floor((altoTarjeta - ALTO_CABEZA - 50) / Math.max(maxFilas, 1)));
  const altoReal = unaSola ? ALTO_CABEZA + 60 + altoFila : altoTarjeta;
  const topGrid = 350 + Math.max(0, Math.floor((altoGrid - filasGrid * altoReal - (filasGrid - 1) * 28) / 2));
  const tarjetas = productos.map((p, idx) => {
    const sola = productos.length % 2 === 1 && idx === productos.length - 1;
    const filas = p.presentaciones.map((pr, i) => `
      <div style="display:flex;align-items:center;justify-content:space-between;height:${altoFila}px;${i ? 'border-top:2px dashed #EADFC8;' : ''}">
        <span style="font-weight:700;font-size:25px;color:#5B4630">${esc(pr.nombre)}${/^\d/.test(pr.nombre) ? '' : ` <span style="font-weight:500;color:#8C7A62">${esc(pr.detalle)}</span>`}</span>
        <span style="font-weight:900;font-size:${unaSola ? 62 : 36}px;color:#1E5B34;font-variant-numeric:tabular-nums">${precioBonito(pr.precio) || 'Consulta'}</span>
      </div>`).join('');
    return `
    <div style="position:relative;${sola ? 'grid-column:1 / -1;justify-self:center;width:calc(50% - 14px);' : ''}background:#FFFFFF;border-radius:30px;box-shadow:0 14px 34px rgba(74,46,20,.13);height:${altoReal}px;padding:22px 26px 16px;overflow:hidden">
      <div style="position:absolute;left:0;top:0;width:100%;height:12px;background:${p.color || '#1E5B34'}"></div>
      <div style="display:flex;gap:20px;align-items:center;height:${ALTO_CABEZA}px;margin-bottom:10px">
        ${tieneFoto(p) ? `<img src="${imagenDataUrl(fotoDe(p))}" style="width:122px;height:160px;object-fit:cover;object-position:50% 30%;border-radius:18px;flex:0 0 122px;box-shadow:0 6px 14px rgba(0,0,0,.12)">` : ''}
        <div style="flex:1;min-width:0">
          <div style="font-family:'League Gothic';font-size:88px;line-height:.95;color:#1E5B34;text-transform:uppercase">${esc(p.nombre)}</div>
          ${p.etiqueta ? `<div style="display:inline-block;margin-top:8px;background:${p.color || '#F2B632'};color:#FFFFFF;font-weight:900;font-size:19px;letter-spacing:1px;padding:7px 14px;border-radius:999px;white-space:nowrap">${esc(p.etiqueta)}</div>` : ''}
          ${p.presentaciones.some((pr) => pr.nota) ? `<div style="font-weight:700;font-size:20px;color:#8C7A62;margin-top:6px">${esc(p.presentaciones.find((pr) => pr.nota).nota.replace(/\s*\(.*\)/, ''))}</div>` : ''}
        </div>
      </div>
      ${filas}
    </div>`;
  }).join('');
  const titulo = d.titulo || 'Precios de la semana';
  const cuerpo = `
    <div class="capa" style="inset:0;background:#FFFFFF;opacity:.82"></div>
    <div class="capa" style="left:0;top:44px;width:${ancho}px;display:flex;justify-content:center">${encabezado({ tam: 0.95 })}</div>
    <div class="capa" style="left:0;top:172px;width:${ancho}px;text-align:center">
      <div style="font-family:'League Gothic';font-size:112px;line-height:1;color:#1E5B34;text-transform:uppercase">${esc(titulo)}</div>
      <div style="font-weight:700;font-size:30px;color:#5B4630;margin-top:6px">${esc(d.subtitulo || 'Arroz al por mayor y menor · ' + (negocio.ciudades || []).join(' · '))}</div>
    </div>
    <div class="capa" style="left:44px;top:${topGrid}px;width:${ancho - 88}px;display:grid;grid-template-columns:1fr 1fr;gap:28px">${tarjetas}</div>
    <div class="capa" style="left:0;top:${alto - 122}px;width:${ancho}px;display:flex;justify-content:center">
      <div style="display:flex;align-items:center;gap:16px;background:#1E5B34;color:#FFFFFF;border-radius:999px;padding:14px 40px 14px 18px">
        ${iconoChat({ tam: 62 })}
        <span style="font-weight:900;font-size:36px">${negocio.whatsapp ? 'WhatsApp ' + esc(telefonoBonito(negocio.whatsapp)) : 'Pedidos por WhatsApp'}</span>
        <span style="font-weight:700;font-size:28px;color:#F2D58A;margin-left:10px">${esc((negocio.ciudades || []).join(' · '))}</span>
      </div>
    </div>`;
  return { ancho, alto, html: pagina(ancho, alto, 'body{background:#FFFFFF}', cuerpo, 47) };
}

// Tabla de precios: una fila por marca, una columna por presentación.
function mayoreo(d, negocio) {
  const { ancho, alto } = FEED;
  const cols = columnasPresentacion(negocio);
  const anchoMarca = 960 - cols.length * 160;
  const altoFila = Math.min(150, Math.floor(560 / Math.max(negocio.productos.length, 1)));
  const encabezadoTabla = `
    <div style="display:flex;align-items:flex-end;height:96px;padding-bottom:12px;border-bottom:4px solid var(--crema-osc)">
      <div style="width:${anchoMarca}px;padding-left:30px;font-weight:800;font-size:24px;letter-spacing:2px;color:var(--cafe)">MARCA</div>
      ${cols.map((c) => `<div style="width:160px;text-align:center;line-height:1.1">
        ${c.nombre ? `<div style="font-weight:900;font-size:26px;color:var(--verde)">${esc(c.nombre)}</div>` : ''}
        <div style="font-weight:800;font-size:${c.nombre ? 22 : 30}px;color:${c.nombre ? 'var(--cafe)' : 'var(--verde)'}">${esc(c.detalle)}</div>
      </div>`).join('')}
    </div>`;
  const filas = negocio.productos.map((p, i) => `
    <div style="display:flex;align-items:center;height:${altoFila}px;background:${i % 2 ? 'transparent' : 'rgba(242,182,50,.12)'}">
      <div style="width:${anchoMarca}px;display:flex;align-items:center;gap:14px;padding-left:20px">
        ${tieneFoto(p) ? `<div style="flex:0 0 96px;height:${altoFila - 24}px;display:flex;align-items:center;justify-content:center"><img src="${imagenDataUrl(fotoDe(p))}" style="max-width:96px;max-height:100%;border-radius:10px;box-shadow:0 4px 10px rgba(0,0,0,.15)"></div>` : ''}
        <div style="flex:1;overflow:hidden">
          <div data-ajustar="24" style="font-weight:900;font-size:35px;color:var(--verde);line-height:1.05;overflow:hidden">${esc(p.nombre)}</div>
          ${p.etiqueta ? `<div style="display:inline-block;margin-top:6px;background:var(--dorado);color:var(--cafe);font-weight:900;font-size:13px;letter-spacing:1px;padding:4px 9px;border-radius:999px;white-space:nowrap">${esc(p.etiqueta)}</div>` : ''}
        </div>
      </div>
      ${cols.map((c) => {
        const pr = p.presentaciones.find((x) => x.detalle === c.detalle);
        const texto = pr ? (precioBonito(pr.precio) || 'Consulta') : '—';
        return `<div style="width:160px;text-align:center;font-weight:900;font-size:${pr ? 38 : 30}px;color:${pr ? 'var(--cafe)' : '#C9B78F'}">${texto}</div>`;
      }).join('')}
    </div>`).join('');
  const cuerpo = `
    <div class="capa" style="left:60px;top:50px">${encabezado()}</div>
    <div class="capa" data-ajustar="44" style="left:60px;top:215px;width:960px;height:170px;font-weight:900;font-size:76px;line-height:1.05;color:var(--verde);text-transform:uppercase">${esc(d.titulo || 'Precios al por mayor y menor')}</div>
    <div class="capa" style="left:60px;top:395px;width:960px;background:#fff;border-radius:28px;box-shadow:0 10px 30px rgba(74,46,20,.12);padding:10px 0 14px;overflow:hidden">${encabezadoTabla}${filas}</div>
    <div class="capa" data-ajustar="22" style="left:60px;top:1100px;width:960px;height:90px;font-weight:700;font-size:34px;line-height:1.25;text-align:center">${esc(d.subtitulo || 'Para tu casa, tu tienda o tu restaurante')}</div>
    ${pie(negocio, ancho, alto)}`;
  return { ancho, alto, html: pagina(ancho, alto, '', cuerpo, 41) };
}

// Una marca con su foto y todos sus precios.
function marca(d, negocio) {
  const { ancho, alto } = FEED;
  const producto = buscarProducto(negocio, d.marca);
  if (!producto) throw new Error(`La marca "${d.marca}" no está en config/negocio.json`);
  const n = producto.presentaciones.length;
  const altoFila = Math.min(104, Math.floor(400 / n) - 14);
  const imagen = tieneFoto(producto)
    ? tarjetaFoto(producto, { alto: 430, giro: 4 })
    : saco({ ancho: 360, detalle: esc(producto.presentaciones[0]?.detalle || '') });
  const cuerpo = `
    <div class="capa" style="left:60px;top:50px">${encabezado()}</div>
    <div class="capa" style="left:60px;top:220px">${etiqueta(d.etiqueta || producto.etiqueta || 'MARCA DE LA SEMANA', 'var(--rojo)')}</div>
    <div class="capa" data-ajustar="54" style="left:60px;top:300px;width:560px;height:250px;font-weight:900;font-size:110px;line-height:1;color:var(--verde);text-transform:uppercase">Arroz ${esc(producto.nombre)}</div>
    <div class="capa" data-ajustar="24" style="left:60px;top:570px;width:540px;height:150px;font-weight:700;font-size:38px;line-height:1.25">${esc(d.subtitulo || 'Al por mayor y menor en ' + ciudadesTexto(negocio))}</div>
    <div class="capa" style="left:${tieneFoto(producto) ? 680 : 640}px;top:215px">${imagen}</div>
    <div class="capa" style="left:60px;top:${1180 - n * (altoFila + Math.round(altoFila * 0.16))}px;width:960px">${filasPrecios(producto, { altoFila, tamNombre: 42, tamPrecio: 54 })}</div>
    ${pie(negocio, ancho, alto)}`;
  return { ancho, alto, html: pagina(ancho, alto, '', cuerpo, 47) };
}

function listaNumerada(items, { tam = 38, gap = 22 } = {}) {
  return items.map((t, i) => `
    <div style="display:flex;gap:24px;align-items:flex-start;margin-bottom:${gap}px">
      <div style="flex:0 0 ${tam * 1.6}px;height:${tam * 1.6}px;border-radius:50%;background:var(--dorado);color:var(--verde);font-weight:900;font-size:${tam}px;display:flex;align-items:center;justify-content:center">${i + 1}</div>
      <div style="font-weight:700;font-size:${tam}px;line-height:1.25;padding-top:${tam * 0.18}px">${esc(t)}</div>
    </div>`).join('');
}

function consejo(d, negocio) {
  const { ancho, alto } = FEED;
  const cuerpo = `
    <div class="capa" style="left:60px;top:50px">${encabezado()}</div>
    <div class="capa" style="left:60px;top:220px">${etiqueta(d.etiqueta || 'TIP ARROCERO', 'var(--verde-claro)')}</div>
    <div class="capa" data-ajustar="44" style="left:60px;top:305px;width:960px;height:220px;font-weight:900;font-size:80px;line-height:1.05;color:var(--verde)">${esc(d.titulo)}</div>
    <div class="capa" data-ajustar="24" style="left:60px;top:545px;width:700px;height:620px;font-size:38px">${listaNumerada(d.pasos || [], { tam: 36 })}</div>
    <div class="capa" style="left:700px;top:880px;opacity:.95">${plato({ ancho: 360, semilla: 9 })}</div>
    ${pie(negocio, ancho, alto)}`;
  return { ancho, alto, html: pagina(ancho, alto, '', cuerpo, 51) };
}

function receta(d, negocio) {
  const { ancho, alto } = FEED;
  const chips = (d.ingredientes || []).map((t) => `<span style="display:inline-block;background:#fff;border:3px solid var(--crema-osc);border-radius:999px;padding:8px 20px;margin:0 10px 12px 0;font-weight:700">${esc(t)}</span>`).join('');
  const cuerpo = `
    <div class="capa" style="left:60px;top:50px">${encabezado()}</div>
    <div class="capa" style="left:60px;top:220px">${etiqueta(d.etiqueta || 'RECETA CON ARROZ', 'var(--dorado-osc)')}</div>
    <div class="capa" data-ajustar="44" style="left:60px;top:300px;width:620px;height:200px;font-weight:900;font-size:78px;line-height:1.02;color:var(--verde)">${esc(d.titulo)}</div>
    <div class="capa" style="left:660px;top:250px">${plato({ ancho: 380, semilla: 13 })}</div>
    <div class="capa" data-ajustar="18" style="left:60px;top:530px;width:960px;height:190px;font-size:28px;overflow:hidden">${chips}</div>
    <div class="capa" data-ajustar="22" style="left:60px;top:735px;width:960px;height:440px;font-size:38px">${listaNumerada(d.pasos || [], { tam: 36, gap: 20 })}</div>
    ${pie(negocio, ancho, alto)}`;
  return { ancho, alto, html: pagina(ancho, alto, '', cuerpo, 61) };
}

function pregunta(d, negocio) {
  const { ancho, alto } = FEED;
  const opcion = (letra, texto, fondo) => `
    <div style="flex:1;background:${fondo};border-radius:32px;padding:40px 30px;color:#fff;text-align:center;box-shadow:0 12px 30px rgba(0,0,0,.15)">
      <div style="font-weight:900;font-size:120px;line-height:1;color:var(--dorado)">${letra}</div>
      <div data-ajustar="26" style="font-weight:800;font-size:44px;line-height:1.15;height:170px;margin-top:14px">${esc(texto)}</div>
    </div>`;
  const cuerpo = `
    <div class="capa" style="left:60px;top:50px">${encabezado()}</div>
    <div class="capa" style="left:60px;top:220px">${etiqueta(d.etiqueta || 'TÚ DECIDES', 'var(--rojo)')}</div>
    <div class="capa" data-ajustar="44" style="left:60px;top:310px;width:960px;height:330px;font-weight:900;font-size:88px;line-height:1.05;color:var(--verde)">${esc(d.pregunta)}</div>
    <div class="capa" style="left:60px;top:680px;width:960px;display:flex;gap:40px">
      ${opcion('A', d.opcionA, 'var(--verde)')}
      ${opcion('B', d.opcionB, 'var(--verde-claro)')}
    </div>
    <div class="capa" style="left:60px;top:1110px;width:960px;text-align:center;font-weight:800;font-size:36px">Responde en los comentarios</div>
    ${pie(negocio, ancho, alto)}`;
  return { ancho, alto, html: pagina(ancho, alto, '', cuerpo, 71) };
}

function entrega(d, negocio) {
  const { ancho, alto } = FEED;
  const zonas = Object.entries(negocio.zonas_entrega || {}).filter(([, z]) => z.length);
  const bloqueZonas = zonas.length
    ? zonas.map(([c, z]) => `<div style="margin-bottom:14px"><b style="color:var(--verde)">${esc(c)}:</b> ${z.map(esc).join(' · ')}</div>`).join('')
    : esc(d.texto || `Llevamos tu pedido a tiendas, restaurantes y hogares en ${ciudadesTexto(negocio)}.`);
  const cuerpo = `
    <div class="capa" style="left:60px;top:50px">${encabezado()}</div>
    <div class="capa" style="left:60px;top:220px">${etiqueta(d.etiqueta || 'ENTREGAS', 'var(--verde-claro)')}</div>
    <div class="capa" data-ajustar="44" style="left:60px;top:305px;width:960px;height:230px;font-weight:900;font-size:90px;line-height:1.02;color:var(--verde);text-transform:uppercase">${esc(d.titulo || `Entregamos en ${ciudadesTexto(negocio)}`)}</div>
    <div class="capa" style="left:300px;top:560px">${camion({ ancho: 720 })}</div>
    <div class="capa" data-ajustar="22" style="left:60px;top:980px;width:960px;height:200px;font-weight:700;font-size:38px;line-height:1.3">${bloqueZonas}</div>
    ${pie(negocio, ancho, alto)}`;
  return { ancho, alto, html: pagina(ancho, alto, '', cuerpo, 81) };
}

function imagenDataUrl(ruta) {
  const abs = join(RAIZ, ruta);
  if (!existsSync(abs)) throw new Error(`No encuentro la foto ${ruta}. Súbela a la carpeta fotos/.`);
  const tipo = { '.png': 'image/png', '.webp': 'image/webp' }[extname(abs).toLowerCase()] || 'image/jpeg';
  return `data:${tipo};base64,${readFileSync(abs).toString('base64')}`;
}

// Foto real del negocio con el marco de la marca.
function foto(d, negocio, tamano = FEED) {
  const { ancho, alto } = tamano;
  const cuerpo = `
    <div class="capa" style="inset:0;background:url('${imagenDataUrl(d.foto)}') center/cover no-repeat"></div>
    <div class="capa" style="left:0;top:0;width:${ancho}px;height:${alto}px;background:linear-gradient(180deg,rgba(0,0,0,.45) 0%,rgba(0,0,0,0) 22%,rgba(0,0,0,0) 50%,rgba(20,40,25,.85) 82%)"></div>
    <div class="capa" style="left:50px;top:44px">${encabezado({ tam: 0.85, claro: true })}</div>
    ${d.etiqueta ? `<div class="capa" style="left:60px;top:${alto - 520}px">${etiqueta(d.etiqueta, 'var(--rojo)')}</div>` : ''}
    <div class="capa" data-ajustar="34" style="left:60px;top:${alto - 430}px;width:${ancho - 120}px;height:250px;font-weight:900;font-size:76px;line-height:1.05;color:#fff;text-shadow:0 3px 12px rgba(0,0,0,.4)">${esc(d.titulo || '')}</div>
    ${pie(negocio, ancho, alto)}`;
  return { ancho, alto, html: pagina(ancho, alto, '', cuerpo) };
}

// ---------- Diapositivas verticales para reels e historias (1080 x 1920) ----------

const VERTICAL = { ancho: 1080, alto: 1920 };
// Facebook tapa ~250 px arriba y ~420 px abajo con botones: el contenido va en medio.

function ilustracion(nombre, negocio, d) {
  if (nombre === 'plato') return plato({ ancho: 680, semilla: 17 });
  if (nombre === 'camion') return camion({ ancho: 820 });
  const { pres } = buscarPresentacion(negocio, d.presentacion || 'Quintal');
  return saco({ ancho: 500, detalle: esc(pres?.detalle || '') });
}

function slide(d, negocio) {
  const { ancho, alto } = VERTICAL;
  let cuerpo = '';
  // Zona segura: entre y=230 y y=1500 (Facebook tapa arriba y abajo con botones y texto).
  const zona = (contenido, gap = 50, top = 230) => `<div class="capa zona" style="left:70px;top:${top}px;width:940px;height:${1500 - top}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${gap}px;text-align:center">${contenido}</div>`;
  if (d.tipo === 'portada') {
    cuerpo = zona(`
      ${encabezado({ tam: 1.1 })}
      ${d.etiqueta ? etiqueta(d.etiqueta, 'var(--rojo)', 1.35) : ''}
      <div data-ajustar="56" data-max="400" style="width:940px;font-weight:900;font-size:108px;line-height:1.02;color:var(--verde);text-transform:uppercase">${esc(d.titulo)}</div>
      <div style="display:flex;justify-content:center">${ilustracion(d.ilustracion || 'saco', negocio, d)}</div>`, 36);
  } else if (d.tipo === 'punto') {
    const largo = String(d.num ?? '').length;
    const tamNum = largo <= 2 ? 140 : largo <= 3 ? 100 : 74;
    cuerpo = `
      <div class="capa" style="left:70px;top:250px">${encabezado({ tam: 0.8 })}</div>
      ${zona(`
        <div style="flex:0 0 260px;width:260px;border-radius:50%;background:var(--dorado);color:var(--verde);font-weight:900;font-size:${tamNum}px;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 34px rgba(0,0,0,.15)">${esc(d.num ?? '')}</div>
        <div data-ajustar="40" data-max="520" style="width:920px;font-weight:900;font-size:96px;line-height:1.08;color:var(--verde)">${esc(d.texto)}</div>
        ${d.detalle ? `<div style="font-weight:700;font-size:44px;line-height:1.25;background:#fff;border-radius:999px;padding:16px 44px;box-shadow:0 8px 24px rgba(74,46,20,.1)">${esc(d.detalle)}</div>` : ''}`, 50, 380)}`;
  } else if (d.tipo === 'marca') {
    const producto = buscarProducto(negocio, d.marca);
    if (!producto) throw new Error(`La marca "${d.marca}" no está en config/negocio.json`);
    cuerpo = `
      <div class="capa" style="left:70px;top:250px">${encabezado({ tam: 0.8 })}</div>
      ${zona(`
        <div data-ajustar="56" data-max="230" style="width:940px;font-weight:900;font-size:112px;line-height:1;color:var(--verde);text-transform:uppercase">Arroz ${esc(producto.nombre)}</div>
        ${producto.etiqueta ? etiqueta(producto.etiqueta, 'var(--dorado-osc)', 1.2) : ''}
        ${tieneFoto(producto) ? tarjetaFoto(producto, { alto: 400, giro: -3 }) : saco({ ancho: 380, detalle: '' })}
        <div style="width:900px">${filasPrecios(producto, { altoFila: 92, tamNombre: 44, tamPrecio: 58 })}</div>`, 40, 380)}`;
  } else if (d.tipo === 'precio') {
    const { pres } = buscarPresentacion(negocio, d.presentacion || 'Quintal');
    cuerpo = `
      <div class="capa" style="left:70px;top:250px">${encabezado({ tam: 0.8 })}</div>
      ${zona(`
        <div data-ajustar="48" data-max="240" style="width:940px;font-weight:900;font-size:96px;line-height:1.02;color:var(--verde);text-transform:uppercase">${esc(d.titulo || 'Precio de hoy')}</div>
        ${medallaPrecio({ nombre: pres?.nombre, detalle: pres?.detalle, precio: pres?.precio, tam: 540 })}
        <div style="font-weight:700;font-size:44px">${esc(d.detalle || 'Al por mayor y menor')}</div>`, 60, 380)}`;
  } else {
    // cta: cierre con datos de contacto
    const numero = lineaWhatsapp(negocio);
    cuerpo = `
      <div class="capa" style="left:0;top:0;width:${ancho}px;height:${alto}px;background:var(--verde)"></div>
      ${zona(`
        ${espiga({ tam: 240, tallo: '#FFFFFF' })}
        <div>
          <div class="script" style="font-size:118px;line-height:1.2;color:var(--dorado)">La Ambateñita</div>
          <div style="font-weight:800;font-size:36px;letter-spacing:6px;color:#fff;margin-top:8px">ARROZ AL POR MAYOR Y MENOR</div>
        </div>
        <div data-ajustar="40" data-max="170" style="width:920px;font-weight:900;font-size:76px;color:#fff;line-height:1.05">${esc(d.titulo || 'Haz tu pedido hoy')}</div>
        <div style="display:flex;align-items:center;gap:24px;background:rgba(255,255,255,.1);border-radius:999px;padding:18px 44px 18px 22px">
          ${iconoChat({ tam: 104, fondo: COLORES.verdeClaro })}
          <div style="font-weight:900;font-size:${numero.length > 14 ? 56 : 80}px;color:#fff;white-space:nowrap">${esc(numero)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:14px">
          ${iconoUbicacion({ tam: 64 })}
          <div style="font-weight:800;font-size:54px;color:var(--dorado)">${esc((negocio.ciudades || []).join(' · '))}</div>
        </div>`, 46)}`;
  }
  return { ancho, alto, html: pagina(ancho, alto, '', cuerpo, 91 + (Number(d.num) || 0)) };
}

// ---------- Identidad de la página ----------

function perfil() {
  const lado = 720;
  const cuerpo = `
    <div class="capa" style="inset:0;background:var(--verde)"></div>
    <div class="capa" style="left:60px;top:60px;width:600px;height:600px;border-radius:50%;border:8px solid var(--dorado)"></div>
    <div class="capa" style="left:0;top:120px;width:${lado}px;display:flex;justify-content:center">${espiga({ tam: 230, tallo: '#FFFFFF' })}</div>
    <div class="capa script" style="left:0;top:375px;width:${lado}px;text-align:center;font-size:74px;color:var(--dorado)">La Ambateñita</div>
    <div class="capa" style="left:0;top:505px;width:${lado}px;text-align:center;font-weight:800;font-size:28px;letter-spacing:7px;color:#fff">ARROZ</div>`;
  return { ancho: lado, alto: lado, html: pagina(lado, lado, '', cuerpo) };
}

function portada(d, negocio) {
  const ancho = 1640, alto = 624;
  const marcas = negocio.productos.map((p) => esc(p.nombre)).join('  ·  ');
  const cuerpo = `
    <div class="capa" style="left:-40px;top:150px">${saco({ ancho: 420, etiqueta: 'ARROZ', detalle: 'Mayor y menor' })}</div>
    <div class="capa" style="left:1250px;top:300px">${plato({ ancho: 420 })}</div>
    <div class="capa" style="left:0;top:60px;width:${ancho}px;text-align:center">
      <div class="script" style="font-size:128px;line-height:1.15;color:var(--verde)">La Ambateñita</div>
      <div style="font-weight:900;font-size:44px;letter-spacing:4px;color:var(--cafe);margin-top:4px">ARROZ AL POR MAYOR Y MENOR</div>
      <div style="font-weight:800;font-size:34px;color:var(--dorado-osc);margin-top:14px">${marcas}</div>
      <div style="display:inline-flex;align-items:center;gap:14px;margin-top:26px;background:var(--verde);color:#fff;border-radius:999px;padding:14px 38px">
        ${iconoUbicacion({ tam: 42 })}
        <span style="font-weight:800;font-size:38px">${esc((negocio.ciudades || []).join('  ·  '))}</span>
        <span style="font-weight:700;font-size:32px;color:var(--dorado);margin-left:16px">${negocio.whatsapp ? `Pedidos: ${esc(telefonoBonito(negocio.whatsapp))}` : 'Pedidos por WhatsApp'}</span>
      </div>
    </div>`;
  return { ancho, alto, html: pagina(ancho, alto, '', cuerpo, 5) };
}

export const PLANTILLAS = { oferta, mayoreo, precios, marca, consejo, receta, pregunta, entrega, foto, slide, perfil, portada };
