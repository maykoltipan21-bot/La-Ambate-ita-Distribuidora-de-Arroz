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

function buscarPresentacion(negocio, ref) {
  // ref: "Arroz Flor/Quintal" o solo "Quintal" (primer producto)
  const [prodNombre, presNombre] = ref.includes('/') ? ref.split('/') : [null, ref];
  const producto = prodNombre
    ? negocio.productos.find((p) => p.nombre.toLowerCase() === prodNombre.toLowerCase())
    : negocio.productos[0];
  const pres = producto?.presentaciones.find((p) => p.nombre.toLowerCase() === presNombre.toLowerCase());
  return { producto, pres };
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
        <div style="font-weight:700;font-size:24px;color:var(--dorado);letter-spacing:1px">PIDE POR WHATSAPP</div>
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
  const cuerpo = `
    <div class="capa" style="left:60px;top:50px">${encabezado()}</div>
    <div class="capa" style="left:60px;top:230px">${etiqueta(d.etiqueta || 'OFERTA DE LA SEMANA')}</div>
    <div class="capa" data-ajustar="54" style="left:60px;top:320px;width:960px;height:330px;font-weight:900;font-size:104px;line-height:1.02;color:var(--verde);text-transform:uppercase">${esc(d.titulo)}</div>
    <div class="capa" data-ajustar="26" style="left:60px;top:660px;width:520px;height:250px;font-weight:700;font-size:40px;line-height:1.25">${esc(d.subtitulo || '')}</div>
    <div class="capa" style="left:560px;top:640px">${saco({ ancho: 470, etiqueta: esc((producto?.nombre || 'ARROZ').toUpperCase()), detalle: esc(pres?.detalle || '') })}</div>
    <div class="capa" style="left:120px;top:900px">${medallaPrecio({ nombre: pres?.nombre, detalle: pres?.detalle, precio: pres?.precio, tam: 290 })}</div>
    ${pie(negocio, ancho, alto)}`;
  return { ancho, alto, html: pagina(ancho, alto, '', cuerpo, 31) };
}

function mayoreo(d, negocio) {
  const { ancho, alto } = FEED;
  const filas = negocio.productos.flatMap((p) => p.presentaciones.map((pr) => ({ producto: p.nombre, ...pr })));
  const varios = negocio.productos.length > 1;
  const altoFila = Math.min(118, Math.floor(600 / Math.max(filas.length, 1)));
  const tabla = filas.map((f, i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;height:${altoFila}px;padding:0 36px;background:${i % 2 ? 'transparent' : 'rgba(30,91,52,.07)'};border-radius:16px">
      <div>
        <div style="font-weight:900;font-size:${Math.min(46, altoFila * 0.42)}px;color:var(--verde)">${esc(f.nombre)} <span style="font-weight:700;color:var(--cafe);font-size:.7em">${esc(f.detalle || '')}</span></div>
        ${varios ? `<div style="font-weight:700;font-size:22px;opacity:.75">${esc(f.producto)}</div>` : ''}
      </div>
      <div style="font-weight:900;font-size:${Math.min(50, altoFila * 0.45)}px;color:${f.precio == null ? 'var(--dorado-osc)' : 'var(--cafe)'}">${precioBonito(f.precio) || 'Consulta'}</div>
    </div>`).join('');
  const cuerpo = `
    <div class="capa" style="left:60px;top:50px">${encabezado()}</div>
    <div class="capa" data-ajustar="44" style="left:60px;top:220px;width:960px;height:180px;font-weight:900;font-size:76px;line-height:1.05;color:var(--verde);text-transform:uppercase">${esc(d.titulo || 'Precios al por mayor y menor')}</div>
    <div class="capa" style="left:60px;top:410px;width:960px;background:#fff;border-radius:28px;box-shadow:0 10px 30px rgba(74,46,20,.12);padding:24px 0">${tabla}</div>
    <div class="capa" data-ajustar="22" style="left:60px;top:1060px;width:960px;height:120px;font-weight:700;font-size:34px;line-height:1.25;text-align:center">${esc(d.subtitulo || 'Precios especiales para tiendas, restaurantes y comedores')}</div>
    ${pie(negocio, ancho, alto)}`;
  return { ancho, alto, html: pagina(ancho, alto, '', cuerpo, 41) };
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
  const { producto, pres } = buscarPresentacion(negocio, d.presentacion || 'Quintal');
  return saco({ ancho: 500, etiqueta: esc((producto?.nombre || 'ARROZ').toUpperCase()), detalle: esc(pres?.detalle || '') });
}

function slide(d, negocio) {
  const { ancho, alto } = VERTICAL;
  let cuerpo = '';
  // Zona segura: entre y=230 y y=1500 (Facebook tapa arriba y abajo con botones y texto).
  const zona = (contenido, gap = 50) => `<div class="capa zona" style="left:70px;top:230px;width:940px;height:1270px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${gap}px;text-align:center">${contenido}</div>`;
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
        ${d.detalle ? `<div style="font-weight:700;font-size:44px;line-height:1.25;background:#fff;border-radius:999px;padding:16px 44px;box-shadow:0 8px 24px rgba(74,46,20,.1)">${esc(d.detalle)}</div>` : ''}`)}`;
  } else if (d.tipo === 'precio') {
    const { pres } = buscarPresentacion(negocio, d.presentacion || 'Quintal');
    cuerpo = `
      <div class="capa" style="left:70px;top:250px">${encabezado({ tam: 0.8 })}</div>
      ${zona(`
        <div data-ajustar="48" data-max="240" style="width:940px;font-weight:900;font-size:96px;line-height:1.02;color:var(--verde);text-transform:uppercase">${esc(d.titulo || 'Precio de hoy')}</div>
        ${medallaPrecio({ nombre: pres?.nombre, detalle: pres?.detalle, precio: pres?.precio, tam: 540 })}
        <div style="font-weight:700;font-size:44px">${esc(d.detalle || 'Al por mayor y menor')}</div>`, 60)}`;
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
  const cuerpo = `
    <div class="capa" style="left:-40px;top:150px">${saco({ ancho: 420, etiqueta: 'ARROZ', detalle: 'Mayor y menor' })}</div>
    <div class="capa" style="left:1250px;top:300px">${plato({ ancho: 420 })}</div>
    <div class="capa" style="left:0;top:80px;width:${ancho}px;text-align:center">
      <div class="script" style="font-size:132px;line-height:1.15;color:var(--verde)">La Ambateñita</div>
      <div style="font-weight:900;font-size:46px;letter-spacing:4px;color:var(--cafe);margin-top:6px">ARROZ AL POR MAYOR Y MENOR</div>
      <div style="display:inline-flex;align-items:center;gap:14px;margin-top:34px;background:var(--verde);color:#fff;border-radius:999px;padding:16px 40px">
        ${iconoUbicacion({ tam: 44 })}
        <span style="font-weight:800;font-size:40px">${esc((negocio.ciudades || []).join('  ·  '))}</span>
      </div>
      <div style="font-weight:800;font-size:38px;margin-top:26px;color:var(--verde)">${negocio.whatsapp ? `Pedidos: ${esc(telefonoBonito(negocio.whatsapp))}` : 'Pedidos por WhatsApp'}</div>
    </div>`;
  return { ancho, alto, html: pagina(ancho, alto, '', cuerpo, 5) };
}

export const PLANTILLAS = { oferta, mayoreo, consejo, receta, pregunta, entrega, foto, slide, perfil, portada };
