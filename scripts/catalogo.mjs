// Genera el catálogo de productos de La Ambateñita en PDF (tamaño carta) a partir de catalogo/productos.json.
//   node scripts/catalogo.mjs            → catalogo/Catalogo-La-Ambatenita.pdf
//   node scripts/catalogo.mjs --vistas   → además, cada página en JPG (catalogo/paginas/) para WhatsApp
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { estilosBase, espiga, iconoChat, iconoUbicacion, COLORES, RAIZ } from './lib/marca.mjs';
import { renderPDF, cerrarNavegador, limpiar } from './lib/render.mjs';

const DIR = join(RAIZ, 'catalogo');
const datos = JSON.parse(readFileSync(join(DIR, 'productos.json'), 'utf8'));
const negocio = JSON.parse(readFileSync(join(RAIZ, 'config', 'negocio.json'), 'utf8'));

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dinero = (v) => `$${Number(v).toFixed(2)}`;
const num = (i) => String(i + 1).padStart(2, '0');
const total = datos.secciones.reduce((n, s) => n + s.grupos.reduce((m, g) => m + g.productos.length, 0), 0);

// Oscurece un color hex (para textos sobre blanco con colores claros como el dorado).
function oscuro(hex, f = 0.72) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * f));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
const varsColor = (c) => `--c:${c};--c-osc:${oscuro(c)}`;

function telefonoBonito(t) {
  const d = String(t).replace(/\D/g, '');
  return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : t;
}

// ---------- piezas comunes ----------
const logo = (tam = 1) => `
  <div class="logo" style="--t:${tam}">
    ${espiga({ tam: 64 * tam, tallo: COLORES.verde })}
    <div><div class="script logo-nombre">La Ambateñita</div><div class="logo-sub">DISTRIBUIDORA</div></div>
  </div>`;

const pie = () => `
  <footer class="pie">
    <div><span class="script">La Ambateñita</span> · ${esc(datos.titulo)} · ${esc(datos.vigencia)}</div>
    <div>Precios en dólares (USD) · sujetos a cambio sin previo aviso</div>
    <div class="num-pag"></div>
  </footer>`;

function tarjeta(p, sec) {
  const extras = (p.extras || []).map(([k, v]) => `<span>${esc(k)} <b>${dinero(v)}</b></span>`).join('');
  return `<article class="tarjeta">
    <div class="foto">${p.foto ? `<img src="${esc(p.foto)}" alt="">` : ''}</div>
    <span class="codigo">${esc(p.codigo)}</span>
    <div class="info">
      <h3>${esc(p.nombre)}</h3>
      ${p.detalle ? `<p class="det">${esc(p.detalle)}</p>` : ''}
      ${p.sabores ? `<p class="sab"><b>${esc(p.sabores_titulo || 'Sabores')}:</b> ${esc(p.sabores)}</p>` : ''}
      ${extras ? `<div class="extras">${extras}</div>` : ''}
    </div>
    <div class="precio"><small>${p.etiqueta ? `POR ${esc(p.etiqueta)}` : 'PRECIO'}</small><b>${dinero(p.precio)}</b></div>
  </article>`;
}

const productosDe = (sec) => sec.grupos.flatMap((g) => g.productos);
const destacados = (sec) => (sec.destacados || []).map((c) => productosDe(sec).find((p) => p.codigo === c)).filter((p) => p?.foto);

function cabeceraGrande(sec, i, titulo = sec.nombre) {
  const fotos = destacados(sec).slice(0, 3);
  return `<header class="cab-grande" data-id="${esc(sec.id)}" style="${varsColor(sec.color)}">
    <div class="cab-num">${num(i)}</div>
    <div class="cab-txt"><h2>${esc(titulo)}</h2><p>${esc(sec.subtitulo)}</p></div>
    <div class="cab-fotos">${fotos.map((p) => `<span><img src="${esc(p.foto)}" alt=""></span>`).join('')}</div>
  </header>`;
}

const pestana = (sec, i) => `<div class="pestana" data-sec="${esc(sec.id)}" style="${varsColor(sec.color)};top:${150 + i * 92}px"><span>${esc(sec.nombre.split(',')[0].split(' y ')[0])}</span></div>`;

// ---------- portada ----------
function portada() {
  const elegidos = [
    ['arroz', 0], ['arroz', 5], ['snacks', 0], ['golosinas', 0], ['bebidas', 0], ['abarrotes', 11],
    ['abarrotes', 0], ['abarrotes', 19], ['fideos', 4], ['bebidas', 4], ['limpieza', 0], ['desechables', 2],
  ];
  const todos = Object.fromEntries(datos.secciones.map((s) => [s.id, s.grupos.flatMap((g) => g.productos)]));
  const fotos = elegidos.map(([s, k]) => todos[s]?.[k]).filter((p) => p?.foto);
  const chips = datos.secciones.map((s) => `<span style="${varsColor(s.color)}">${esc(s.nombre)}</span>`).join('');
  const contacto = negocio.whatsapp
    ? `<b>Pedidos por WhatsApp</b><span class="grande">${esc(telefonoBonito(negocio.whatsapp))}</span>`
    : `<b>Haz tu pedido</b><span class="grande">por WhatsApp</span>`;
  return `<section class="pagina portada">
    <div class="burbuja b1"></div><div class="burbuja b2"></div><div class="burbuja b3"></div>
    <div class="port-contenido">
    <div class="port-logo">${logo(1.25)}</div>
    <div class="port-titulo">
      <div class="t1">CATÁLOGO</div>
      <div class="t2">DE PRODUCTOS</div>
      <div class="t3">${esc(datos.vigencia)}</div>
    </div>
    <p class="port-lema">Todo para tu tienda, <b>al por mayor y menor</b></p>
    <div class="mosaico">${fotos.map((p) => `<div><img src="${esc(p.foto)}" alt=""></div>`).join('')}</div>
    <div class="port-chips">${chips}</div>
    </div>
    <div class="port-banda">
      <div class="port-ciudades">${iconoUbicacion({ tam: 30 })}<span>${esc(negocio.ciudades.join('  ·  '))}</span></div>
      <div class="port-contacto">${iconoChat({ tam: 40, fondo: COLORES.dorado })}<div>${contacto}</div></div>
      <div class="port-cifra"><span class="grande">${total}</span><b>productos</b></div>
    </div>
  </section>`;
}

// ---------- bienvenida e índice ----------
function indice() {
  const tiles = datos.secciones.map((s, i) => {
    const foto = destacados(s)[0] || productosDe(s).find((p) => p.foto);
    return `<a class="tile" style="${varsColor(s.color)}">
      <div class="tile-num">${num(i)}</div>
      <div class="tile-txt"><b>${esc(s.nombre)}</b><small>${esc(s.subtitulo)}</small><em data-pag-de="${esc(s.id)}">pág. –</em></div>
      ${foto ? `<img src="${esc(foto.foto)}" alt="">` : ''}
    </a>`;
  }).join('');
  const pasos = [
    ['Elige', 'Busca tus productos en el catálogo y anota el <b>código</b> de cada uno (por ejemplo A01).'],
    ['Escríbenos', `Envíanos por WhatsApp el código y la cantidad de cada producto${negocio.whatsapp ? ` al <b>${esc(telefonoBonito(negocio.whatsapp))}</b>` : ''}.`],
    ['Confirmamos', 'Te confirmamos precios y disponibilidad, y coordinamos cómo recibes tu pedido.'],
  ].map(([t, d], i) => `<div class="paso"><span>${i + 1}</span><div><b>${t}</b><p>${d}</p></div></div>`).join('');
  return `<section class="pagina indice">
    <div class="ind-cab">
      <div>
        <div class="script ind-hola">¡Bienvenido!</div>
        <h1>Todo lo que tu negocio necesita, en un solo lugar</h1>
        <p>En <b>La Ambateñita</b> abastecemos a tiendas, minimarkets, restaurantes y hogares de
        <b>${esc(negocio.ciudades.join(' y '))}</b>: arroz de las marcas que tus clientes piden, abarrotes, snacks,
        bebidas, artículos de limpieza y desechables, <b>al por mayor y menor</b>.</p>
      </div>
      <div class="ind-datos">
        <div><span class="grande">${total}</span>productos</div>
        <div><span class="grande">${datos.secciones.length}</span>categorías</div>
        <div><span class="grande">${negocio.ciudades.length}</span>ciudades</div>
      </div>
    </div>
    <h2 class="ind-titulo">Contenido</h2>
    <div class="tiles">${tiles}</div>
    <a class="tile-promo"><b>★ Promociones del mes</b><span>Precios especiales y productos gratis</span><em data-pag-de="promos">pág. –</em></a>
    <h2 class="ind-titulo">¿Cómo hacer tu pedido?</h2>
    <div class="pasos">${pasos}</div>
    ${pie()}
  </section>`;
}

// ---------- promociones ----------
function promociones() {
  const cards = datos.promociones.map((p) => `
    <div class="promo">
      <div class="promo-foto"><img src="${esc(p.foto)}" alt=""></div>
      <div class="promo-info">
        <span class="promo-tag">PROMOCIÓN</span>
        <h3>${esc(p.titulo)}</h3>
        <p class="promo-det">${esc(p.detalle)}</p>
        <div class="promo-precios">
          <div class="antes"><small>${esc(p.etiqueta_normal)}</small><s>${dinero(p.precio_normal)}</s></div>
          <div class="ahora"><small>${esc(p.etiqueta_promo)}</small><b>${dinero(p.precio_promo)}</b></div>
        </div>
      </div>
      <div class="promo-regalo">
        <div class="mas">+</div>
        <div class="regalo-foto"><img src="${esc(p.foto_regalo)}" alt=""><span>GRATIS</span></div>
        <p>${esc(p.regalo)}</p>
      </div>
    </div>`).join('');
  return `<section class="pagina promos" data-id="promos">
    <header class="promos-cab">
      <div class="estrella">★</div>
      <div><h2>Promociones del mes</h2><p>Aprovecha precios especiales y llévate productos gratis con tu pedido</p></div>
    </header>
    ${cards}
    <p class="promos-nota">Pregunta por las promociones vigentes al hacer tu pedido.</p>
    ${pie()}
  </section>`;
}

// ---------- arroz (página destacada) ----------
function paginaArroz(sec, i) {
  const filas = sec.grupos.map((g) => {
    const marca = negocio.productos.find((m) => m.nombre === g.nombre) || {};
    const color = marca.color || sec.color;
    const tamNombre = g.nombre.length > 6 ? 40 : 50;
    const minis = g.productos.map((p) => `
      <div class="mini">
        <span class="codigo">${esc(p.codigo)}</span>
        <div class="mini-foto"><img src="${esc(p.foto)}" alt=""></div>
        <b>${esc(p.detalle)}</b>
        <span class="mini-precio">${dinero(p.precio)}</span>
      </div>`).join('');
    return `<div class="marca-fila" style="${varsColor(color)}">
      <div class="marca-nombre">
        <small>ARROZ</small><h3 style="font-size:${tamNombre}px">${esc(g.nombre)}</h3>
        ${marca.etiqueta ? `<span class="marca-tag">${esc(marca.etiqueta)}</span>` : ''}
        ${marca.descripcion ? `<p>${esc(marca.descripcion)}</p>` : ''}
      </div>
      <div class="minis">${minis}</div>
    </div>`;
  }).join('');
  const cab = cabeceraGrande({ ...sec, subtitulo: `Nuestra especialidad · ${sec.subtitulo}` }, i);
  return `<section class="pagina cat arroz" style="${varsColor(sec.color)}">
    ${cab}
    <div class="filas-arroz">${filas}</div>
    ${pie()}${pestana(sec, i)}
  </section>`;
}

// ---------- HTML ----------
function html() {
  const secciones = datos.secciones.map((s, i) => ({
    id: s.id, i, nombre: s.nombre, vars: varsColor(s.color),
    cabGrande: cabeceraGrande(s, i), pestana: pestana(s, i),
    grupos: s.grupos.map((g) => ({ nombre: g.nombre, tarjetas: g.productos.map((p) => tarjeta(p, s)) })),
  }));
  const [arroz, ...resto] = secciones;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Catálogo La Ambateñita</title>
<style>${estilosBase()}${CSS}</style></head><body>
<main id="libro">
  ${portada()}
  ${indice()}
  ${promociones()}
  ${paginaArroz(datos.secciones[0], 0)}
  <div id="flujo"></div>
  ${contraportada()}
</main>
<template id="pie">${pie()}</template>
<script>
const SECCIONES = ${JSON.stringify(resto)};
${PAGINADOR}
</script>
</body></html>`;
}

// ---------- contraportada ----------
function contraportada() {
  const linea = (etiqueta, valor) => `<div class="dato"><small>${etiqueta}</small>${valor ? `<b>${esc(valor)}</b>` : '<i></i>'}</div>`;
  return `<section class="pagina contra">
    <div class="burbuja b1"></div><div class="burbuja b2"></div>
    <div class="contra-sello">
      ${espiga({ tam: 150, tallo: '#FFFFFF' })}
      <div class="script">La Ambateñita</div>
      <span>DISTRIBUIDORA</span>
    </div>
    <h2 class="script">¡Gracias por preferirnos!</h2>
    <p class="contra-lema">Arroz, abarrotes y todo para tu negocio, al por mayor y menor.</p>
    <div class="contra-datos">
      ${linea('WhatsApp', negocio.whatsapp && telefonoBonito(negocio.whatsapp))}
      ${linea('Llamadas', negocio.telefono_llamadas && telefonoBonito(negocio.telefono_llamadas))}
      ${linea('Ambato', negocio.direccion_ambato)}
      ${linea('Macas', negocio.direccion_macas)}
      ${linea('Horario', negocio.horario)}
      <div class="dato"><small>Formas de pago</small><b>${esc((negocio.formas_de_pago || []).join(' · '))}</b></div>
    </div>
    <p class="contra-nota">Precios en dólares de los Estados Unidos, vigentes en ${esc(datos.vigencia.toLowerCase())}.
    Sujetos a cambio sin previo aviso. Imágenes referenciales.</p>
  </section>`;
}

// Reparte las tarjetas en páginas carta: mide en el navegador y pasa a una página nueva cuando no caben.
// Una categoría nueva empieza en la misma página si cabe su cabecera con al menos una fila de productos.
const PAGINADOR = `
const flujo = document.getElementById('flujo');
const piePlantilla = document.getElementById('pie').innerHTML;
let cuerpo = null;
const nodo = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const desborda = () => cuerpo.scrollHeight > cuerpo.clientHeight + 1;
function marcarPestana(sec) {
  const pg = cuerpo.closest('.pagina');
  if (!pg.querySelector('.pestana[data-sec="' + sec.id + '"]')) pg.insertAdjacentHTML('beforeend', sec.pestana);
}
function nuevaPagina(sec, continua) {
  const pg = document.createElement('section');
  pg.className = 'pagina cat';
  pg.innerHTML = (continua
    ? '<header class="cab-chica" style="' + sec.vars + '"><span class="cab-chica-num">' + String(sec.i + 1).padStart(2, '0') + '</span><b>' + sec.nombre + '</b><em>continuación</em></header>'
    : '') + '<div class="cuerpo"></div>' + piePlantilla;
  flujo.before(pg);
  cuerpo = pg.querySelector('.cuerpo');
  marcarPestana(sec);
}
// Pone un bloque (cabecera, título de grupo y primera tarjeta) donde quepa entero.
function colocar(nodos, sec, continua) {
  if (cuerpo) {
    cuerpo.append(...nodos);
    if (!desborda()) return marcarPestana(sec);
    nodos.forEach((n) => n.remove());
  }
  nuevaPagina(sec, continua);
  cuerpo.append(...nodos);
}
const titulo = (sec, g, sigue) => nodo('<h4 class="grupo" style="' + sec.vars + '">' + g.nombre + (sigue ? ' <em>(continuación)</em>' : '') + '</h4>');
const rejilla = (sec, tarjeta) => { const r = nodo('<div class="rejilla" style="' + sec.vars + '"></div>'); r.append(tarjeta); return r; };
function paginar() {
  for (const sec of SECCIONES) {
    sec.grupos.forEach((g, gi) => {
      let actual;
      g.tarjetas.forEach((html, ti) => {
        const t = nodo(html);
        if (ti === 0) {
          actual = rejilla(sec, t);
          const bloque = gi === 0 ? [nodo(sec.cabGrande), titulo(sec, g), actual] : [titulo(sec, g), actual];
          return colocar(bloque, sec, gi > 0);
        }
        actual.append(t);
        if (!desborda()) return;
        t.remove();
        nuevaPagina(sec, true);
        actual = rejilla(sec, t);
        cuerpo.append(titulo(sec, g, true), actual);
      });
    });
  }
  flujo.remove();
  const paginas = [...document.querySelectorAll('.pagina')];
  paginas.forEach((p, i) => { const n = p.querySelector('.num-pag'); if (n) n.textContent = i + 1; });
  document.querySelectorAll('[data-pag-de]').forEach((el) => {
    const destino = document.querySelector('[data-id="' + el.dataset.pagDe + '"]');
    if (destino) el.textContent = 'pág. ' + (paginas.indexOf(destino.closest('.pagina')) + 1);
  });
}
document.fonts.ready.then(async () => {
  paginar();
  await Promise.all([...document.images].map((im) => im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; })));
  window.__listo = true;
});
`;

const CSS = `
@page { size: 8.5in 11in; margin: 0; }
html, body { height: auto; overflow: visible; background: #fff; }
body { color: #24302A; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pagina { width: 816px; height: 1056px; position: relative; overflow: hidden; background: #fff; break-after: page; }
.grande { font-family: 'League Gothic'; font-weight: 400; }
img { display: block; }

/* logo */
.logo { display: flex; align-items: center; gap: calc(8px * var(--t)); }
.logo-nombre { font-size: calc(34px * var(--t)); color: var(--verde); line-height: 1.25; }
.logo-sub { font-weight: 800; font-size: calc(10px * var(--t)); letter-spacing: calc(4px * var(--t)); color: var(--dorado-osc); margin-top: -2px; }

/* pie de página */
.pie { position: absolute; left: 38px; right: 48px; bottom: 0; height: 46px; display: flex; align-items: center;
  justify-content: space-between; border-top: 1.5px solid #ECE6D9; font-size: 8.5px; font-weight: 600; color: #8A8F8B; }
.pie .script { font-size: 14px; color: var(--verde); }
.num-pag { width: 26px; height: 26px; border-radius: 50%; background: var(--verde); color: #fff; font-weight: 800; font-size: 11px;
  display: flex; align-items: center; justify-content: center; }

/* páginas de productos */
.pagina.cat { padding: 28px 48px 0 38px; display: flex; flex-direction: column; }
.pagina.cat .cuerpo { flex: 1; min-height: 0; overflow: hidden; margin-bottom: 52px; }
.cuerpo > .cab-grande:not(:first-child) { margin-top: 26px; }
.pestana { position: absolute; right: 0; width: 26px; height: 84px; background: var(--c); border-radius: 10px 0 0 10px;
  display: flex; align-items: center; justify-content: center; }
.pestana span { writing-mode: vertical-rl; transform: rotate(180deg); color: #fff; font-weight: 800; font-size: 8.5px;
  letter-spacing: 1.2px; text-transform: uppercase; white-space: nowrap; }

.cab-grande { flex: none; height: 104px; border-radius: 20px; background: color-mix(in srgb, var(--c) 10%, white);
  display: flex; align-items: center; padding: 0 18px 0 24px; gap: 18px; position: relative; overflow: hidden; margin-bottom: 4px; }
.cab-grande::after { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 8px; background: var(--c); }
.cab-num { font-family: 'League Gothic'; font-size: 80px; line-height: 1; color: var(--c); }
.cab-txt { flex: 1; }
.cab-txt h2 { font-family: 'League Gothic'; font-weight: 400; font-size: 44px; line-height: 1; text-transform: uppercase; color: #1F2A24; letter-spacing: .5px; }
.cab-txt p { font-weight: 700; font-size: 12px; color: var(--c-osc); margin-top: 6px; }
.cab-fotos { display: flex; }
.cab-fotos span { width: 78px; height: 78px; border-radius: 50%; background: #fff; margin-left: -14px; display: flex; align-items: center;
  justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,.10); border: 3px solid #fff; overflow: hidden; }
.cab-fotos img { max-width: 70%; max-height: 74%; object-fit: contain; }

.cab-chica { flex: none; height: 40px; display: flex; align-items: center; gap: 10px; border-bottom: 2.5px solid var(--c); margin-bottom: 2px; }
.cab-chica-num { background: var(--c); color: #fff; font-family: 'League Gothic'; font-size: 22px; padding: 1px 9px; border-radius: 8px; }
.cab-chica b { font-family: 'League Gothic'; font-weight: 400; font-size: 28px; text-transform: uppercase; color: #1F2A24; letter-spacing: .5px; }
.cab-chica em { font-style: normal; font-weight: 700; font-size: 10px; color: #8A8F8B; text-transform: uppercase; letter-spacing: 1px; }

.grupo { display: flex; align-items: center; gap: 10px; margin: 13px 0 8px; font-weight: 900; font-size: 13px; color: var(--c-osc);
  text-transform: uppercase; letter-spacing: 1.2px; white-space: nowrap; }
.grupo em { font-style: normal; font-weight: 700; color: #9AA09C; font-size: 10px; letter-spacing: .5px; text-transform: none; }
.grupo::after { content: ''; flex: 1; height: 2px; border-radius: 2px; background: color-mix(in srgb, var(--c) 30%, white); }
.rejilla { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }

.tarjeta { height: 188px; border: 1.2px solid #ECE6D9; border-radius: 14px; background: #fff; display: flex; flex-direction: column;
  overflow: hidden; position: relative; }
.tarjeta .foto { flex: 1 1 0; min-height: 56px; display: flex; align-items: center; justify-content: center; padding: 10px 12px 4px; }
.tarjeta .foto img { max-width: 100%; max-height: 100%; object-fit: contain; }
.tarjeta .info { padding: 0 10px 7px; }
.tarjeta h3 { font-weight: 800; font-size: 11.5px; line-height: 1.18; color: #1F2A24;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tarjeta .det { font-weight: 700; font-size: 9.5px; color: #747A76; margin-top: 2px; }
.tarjeta .sab { font-size: 8px; font-weight: 500; color: #747A76; line-height: 1.25; margin-top: 3px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tarjeta .sab b { font-weight: 800; color: var(--c-osc); }
.extras { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
.extras span { background: color-mix(in srgb, var(--c) 13%, white); color: var(--c-osc); font-size: 8.5px; font-weight: 700;
  padding: 2px 6px; border-radius: 6px; }
.extras b { font-weight: 900; }
.precio { flex: none; height: 34px; background: var(--c); color: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 11px; }
.precio small { font-size: 7.5px; font-weight: 800; letter-spacing: 1.2px; opacity: .92; }
.precio b { font-family: 'League Gothic'; font-weight: 400; font-size: 27px; letter-spacing: .5px; line-height: 1; }
.codigo { position: absolute; top: 7px; left: 7px; font-size: 8px; font-weight: 800; color: var(--c-osc); background: #fff;
  border: 1.2px solid color-mix(in srgb, var(--c) 55%, white); border-radius: 6px; padding: 1px 5px; z-index: 1; }

/* arroz */
.filas-arroz { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
.marca-fila { height: 198px; display: flex; gap: 12px; }
.marca-nombre { width: 170px; flex: none; border-radius: 16px; background: var(--c); color: #fff; padding: 18px 16px; display: flex;
  flex-direction: column; justify-content: center; }
.marca-nombre small { font-weight: 800; font-size: 10px; letter-spacing: 3px; opacity: .9; }
.marca-nombre h3 { font-family: 'League Gothic'; font-weight: 400; line-height: 1; text-transform: uppercase; white-space: nowrap; }
.marca-tag { align-self: flex-start; margin-top: 8px; background: #fff; color: var(--c-osc); font-weight: 900; font-size: 8.5px;
  letter-spacing: .8px; padding: 3px 7px; border-radius: 6px; white-space: nowrap; }
.marca-nombre p { font-size: 10px; font-weight: 600; margin-top: 8px; line-height: 1.3; }
.minis { flex: 1; display: flex; gap: 10px; }
.mini { flex: 1 1 0; position: relative; border: 1.2px solid #ECE6D9; border-radius: 14px; display: flex; flex-direction: column; align-items: center;
  padding: 10px 8px 8px; background: #fff; }
.mini-foto { flex: 1; min-height: 0; width: 100%; display: flex; align-items: center; justify-content: center; }
.mini-foto img { max-width: 100%; max-height: 112px; object-fit: contain; }
.mini b { font-size: 10.5px; font-weight: 800; color: #1F2A24; margin-top: 6px; text-align: center; }
.mini-precio { font-family: 'League Gothic'; font-size: 32px; line-height: 1.05; color: var(--c-osc); }

/* portada */
.portada { text-align: center; }
.burbuja { position: absolute; border-radius: 50%; }
.portada .b1 { width: 520px; height: 520px; left: -220px; top: -200px; background: color-mix(in srgb, var(--dorado) 16%, white); }
.portada .b2 { width: 420px; height: 420px; right: -170px; top: 230px; background: color-mix(in srgb, var(--verde-claro) 10%, white); }
.portada .b3 { width: 260px; height: 260px; left: -90px; top: 640px; background: color-mix(in srgb, var(--rojo) 7%, white); }
.port-contenido { position: relative; height: 938px; display: flex; flex-direction: column; align-items: center; justify-content: space-evenly; padding: 18px 0 10px; }
.port-logo { display: flex; justify-content: center; }
.port-titulo { position: relative; }
.port-titulo .t1 { font-family: 'League Gothic'; font-size: 172px; line-height: .86; color: var(--verde); letter-spacing: 2px; }
.port-titulo .t2 { font-weight: 900; font-size: 34px; letter-spacing: 12px; color: #1F2A24; margin-top: 6px; padding-left: 12px; }
.port-titulo .t3 { display: inline-block; margin-top: 14px; background: var(--dorado); color: #3A2A06; font-weight: 900; font-size: 15px;
  letter-spacing: 3px; text-transform: uppercase; padding: 7px 20px; border-radius: 999px; }
.port-lema { position: relative; font-size: 21px; font-weight: 600; color: #3A463F; }
.port-lema b { color: var(--verde); font-weight: 900; }
.mosaico { position: relative; display: grid; grid-template-columns: repeat(6, 112px); gap: 14px; justify-content: center; }
.mosaico div { height: 112px; background: #fff; border-radius: 18px; box-shadow: 0 6px 18px rgba(30,60,40,.12); display: flex;
  align-items: center; justify-content: center; padding: 10px; }
.mosaico img { max-width: 100%; max-height: 100%; object-fit: contain; }
.port-chips { position: relative; display: flex; flex-wrap: wrap; justify-content: center; gap: 7px; margin: 0 50px; }
.port-chips span { font-size: 10.5px; font-weight: 800; color: var(--c-osc); border: 1.5px solid var(--c); border-radius: 999px; padding: 4px 11px; background: #fff; }
.port-banda { position: absolute; left: 0; right: 0; bottom: 0; height: 118px; background: var(--verde); color: #fff; display: flex;
  align-items: center; justify-content: space-between; padding: 0 48px; border-top: 6px solid var(--dorado); }
.port-ciudades { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 20px; }
.port-contacto { display: flex; align-items: center; gap: 12px; text-align: left; }
.port-contacto b { display: block; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: var(--dorado); }
.port-contacto .grande, .port-cifra .grande { font-size: 36px; line-height: 1; }
.port-cifra { text-align: right; }
.port-cifra b { display: block; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: var(--dorado); }

/* índice */
.indice { padding: 40px 48px 0 38px; }
.ind-cab { display: flex; gap: 26px; align-items: center; }
.ind-hola { font-size: 30px; color: var(--dorado-osc); }
.ind-cab h1 { font-family: 'League Gothic'; font-weight: 400; font-size: 46px; line-height: 1; color: var(--verde); text-transform: uppercase; margin-top: 2px; }
.ind-cab p { font-size: 12px; line-height: 1.55; color: #3A463F; margin-top: 10px; }
.ind-datos { flex: none; display: flex; flex-direction: column; gap: 8px; }
.ind-datos div { width: 118px; border-radius: 14px; background: color-mix(in srgb, var(--dorado) 16%, white); padding: 8px 12px;
  font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--dorado-osc); }
.ind-datos .grande { display: block; font-size: 36px; line-height: 1; color: var(--verde); letter-spacing: 0; }
.ind-titulo { display: flex; align-items: center; gap: 12px; font-weight: 900; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;
  color: var(--verde); margin: 30px 0 14px; }
.ind-titulo::after { content: ''; flex: 1; height: 2px; background: color-mix(in srgb, var(--verde) 18%, white); }
.tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.tile { height: 128px; border-radius: 16px; border: 1.2px solid #ECE6D9; display: flex; align-items: center; gap: 8px; padding: 10px 10px 10px 0;
  position: relative; overflow: hidden; background: #fff; }
.tile::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: var(--c); }
.tile-num { font-family: 'League Gothic'; font-size: 44px; color: var(--c); width: 58px; text-align: center; flex: none; }
.tile-txt { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.tile-txt b { font-weight: 900; font-size: 12.5px; line-height: 1.15; color: #1F2A24; }
.tile-txt small { font-size: 8.5px; font-weight: 600; color: #7A807C; line-height: 1.3; }
.tile-txt em { font-style: normal; font-weight: 800; font-size: 9.5px; color: var(--c-osc); margin-top: 2px; }
.tile img { width: 62px; height: 84px; object-fit: contain; flex: none; }
.tile-promo { margin-top: 12px; height: 54px; border-radius: 14px; background: color-mix(in srgb, var(--rojo) 9%, white); display: flex;
  align-items: center; gap: 14px; padding: 0 18px; border: 1.5px dashed color-mix(in srgb, var(--rojo) 45%, white); }
.tile-promo b { font-weight: 900; font-size: 14px; color: var(--rojo); }
.tile-promo span { flex: 1; font-size: 11px; font-weight: 600; color: #5A605C; }
.tile-promo em { font-style: normal; font-weight: 800; font-size: 10px; color: var(--rojo); }
.pasos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.paso { display: flex; gap: 10px; align-items: flex-start; background: color-mix(in srgb, var(--verde-claro) 8%, white); border-radius: 16px; padding: 18px 16px; }
.paso span { flex: none; width: 34px; height: 34px; border-radius: 50%; background: var(--verde); color: #fff; font-family: 'League Gothic';
  font-size: 22px; display: flex; align-items: center; justify-content: center; }
.paso b { font-weight: 900; font-size: 13px; color: var(--verde); }
.paso p { font-size: 10px; line-height: 1.45; color: #3A463F; margin-top: 3px; }

/* promociones */
.promos { padding: 34px 48px 0 38px; }
.promos-cab { display: flex; align-items: center; gap: 16px; margin-bottom: 22px; }
.estrella { width: 74px; height: 74px; border-radius: 50%; background: var(--rojo); color: #fff; font-size: 40px; display: flex;
  align-items: center; justify-content: center; flex: none; box-shadow: 0 0 0 6px color-mix(in srgb, var(--rojo) 18%, white); }
.promos-cab h2 { font-family: 'League Gothic'; font-weight: 400; font-size: 58px; line-height: 1; text-transform: uppercase; color: var(--rojo); }
.promos-cab p { font-size: 13px; font-weight: 600; color: #3A463F; margin-top: 4px; }
.promo { height: 398px; border-radius: 24px; border: 2px solid color-mix(in srgb, var(--dorado) 55%, white); background: #fff;
  display: flex; align-items: stretch; margin-bottom: 18px; overflow: hidden; }
.promo-foto { width: 236px; flex: none; background: color-mix(in srgb, var(--dorado) 12%, white); display: flex; align-items: center;
  justify-content: center; padding: 22px; }
.promo-foto img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 10px; }
.promo-info { flex: 1; padding: 26px 22px; display: flex; flex-direction: column; }
.promo-tag { align-self: flex-start; background: var(--rojo); color: #fff; font-weight: 900; font-size: 10px; letter-spacing: 2px; padding: 4px 10px; border-radius: 6px; }
.promo-info h3 { font-family: 'League Gothic'; font-weight: 400; font-size: 46px; line-height: 1; text-transform: uppercase; color: #1F2A24; margin-top: 12px; }
.promo-det { font-weight: 700; font-size: 13px; color: #5A605C; margin-top: 6px; }
.promo-precios { margin-top: auto; display: flex; gap: 14px; align-items: flex-end; }
.promo-precios small { display: block; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .8px; color: #7A807C; }
.antes s { font-family: 'League Gothic'; font-size: 38px; color: #9AA09C; text-decoration-thickness: 3px; }
.ahora { background: var(--verde); color: #fff; border-radius: 16px; padding: 10px 16px 6px; }
.ahora small { color: var(--dorado); }
.ahora b { font-family: 'League Gothic'; font-weight: 400; font-size: 64px; line-height: 1; }
.promo-regalo { width: 196px; flex: none; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 18px; border-left: 2px dashed color-mix(in srgb, var(--dorado) 55%, white); }
.mas { position: absolute; left: -19px; top: 50%; margin-top: -18px; width: 36px; height: 36px; border-radius: 50%; background: var(--dorado);
  color: #3A2A06; font-weight: 900; font-size: 26px; display: flex; align-items: center; justify-content: center; }
.regalo-foto { position: relative; width: 140px; height: 140px; border-radius: 50%; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,.14); }
.regalo-foto img { width: 100%; height: 100%; object-fit: cover; }
.regalo-foto span { position: absolute; left: 0; right: 0; bottom: 14px; text-align: center; font-family: 'League Gothic'; font-size: 28px;
  color: #fff; background: var(--rojo); }
.promo-regalo p { font-weight: 800; font-size: 13px; text-align: center; color: #1F2A24; margin-top: 12px; line-height: 1.3; }
.promos-nota { text-align: center; font-size: 11px; font-weight: 600; color: #7A807C; margin-top: 4px; }

/* contraportada */
.contra { text-align: center; padding-top: 84px; }
.contra .b1 { width: 560px; height: 560px; right: -240px; top: -220px; background: color-mix(in srgb, var(--dorado) 15%, white); }
.contra .b2 { width: 480px; height: 480px; left: -220px; bottom: -200px; background: color-mix(in srgb, var(--verde-claro) 10%, white); }
.contra-sello { position: relative; width: 300px; height: 300px; margin: 0 auto; border-radius: 50%; background: var(--verde);
  box-shadow: 0 0 0 8px #fff, 0 0 0 14px var(--dorado); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.contra-sello svg { margin-top: -10px; }
.contra-sello .script { font-size: 40px; color: var(--dorado); line-height: 1.2; }
.contra-sello span { font-weight: 800; font-size: 13px; letter-spacing: 5px; color: #fff; }
.contra h2 { position: relative; font-size: 44px; color: var(--verde); font-weight: 400; margin-top: 46px; }
.contra-lema { position: relative; font-size: 15px; font-weight: 600; color: #3A463F; margin-top: 6px; }
.contra-datos { position: relative; width: 560px; margin: 30px auto 0; background: #fff; border-radius: 22px; border: 1.5px solid #ECE6D9;
  box-shadow: 0 8px 26px rgba(30,60,40,.08); padding: 10px 28px; text-align: left; }
.dato { display: flex; align-items: baseline; gap: 16px; padding: 11px 0; border-bottom: 1px solid #F0EBE0; }
.dato:last-child { border-bottom: 0; }
.dato small { width: 120px; flex: none; font-weight: 800; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: var(--dorado-osc); }
.dato b { font-weight: 800; font-size: 15px; color: #1F2A24; }
.dato i { flex: 1; border-bottom: 1.5px dotted #B9BDB9; height: 14px; }
.contra-nota { position: absolute; left: 80px; right: 80px; bottom: 40px; font-size: 9.5px; color: #8A8F8B; line-height: 1.5; }
`;

const temporal = join(DIR, '.catalogo-temporal.html');
writeFileSync(temporal, html());
const salida = join(DIR, 'Catalogo-La-Ambatenita.pdf');
const vistas = process.argv.includes('--vistas') ? join(DIR, 'paginas') : undefined;
if (vistas) limpiar(vistas);
try {
  await renderPDF(temporal, salida, { vistas });
} finally {
  await cerrarNavegador();
  rmSync(temporal, { force: true });
}
console.log(`✓ ${salida} (${total} productos)${vistas ? `\n✓ páginas en JPG: ${vistas}` : ''}`);
