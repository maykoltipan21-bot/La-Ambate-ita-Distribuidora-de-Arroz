// Genera el catálogo de productos de La Ambateñita en PDF (tamaño carta) a partir de catalogo/productos.json.
//   node scripts/catalogo.mjs            → catalogo/Catalogo-La-Ambatenita.pdf
//   node scripts/catalogo.mjs --vistas   → además, cada página en JPG (catalogo/paginas/) para WhatsApp
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { estilosBase, espiga, granos, iconoChat, iconoUbicacion, COLORES, RAIZ } from './lib/marca.mjs';
import { renderPDF, cerrarNavegador, limpiar } from './lib/render.mjs';

const DIR = join(RAIZ, 'catalogo');
const datos = JSON.parse(readFileSync(join(DIR, 'productos.json'), 'utf8'));
const negocio = JSON.parse(readFileSync(join(RAIZ, 'config', 'negocio.json'), 'utf8'));
// Fotos de ambiente (rutas relativas al HTML temporal, que vive en catalogo/).
const AMBIENTE = {
  portada: '../fotos/ambiente/almuerzo-familia.jpg',
  arroz: '../fotos/ambiente/tazon-premium.jpg',
  contra: '../fotos/ambiente/olla-restaurante.jpg',
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dinero = (v) => `$${Number(v).toFixed(2)}`;
const num = (i) => String(i + 1).padStart(2, '0');
const total = datos.secciones.reduce((n, s) => n + s.grupos.reduce((m, g) => m + g.productos.length, 0), 0);

// Precio estilo etiqueta de supermercado: $ y centavos pequeños arriba.
function precio(v) {
  const [enteros, centavos] = Number(v).toFixed(2).split('.');
  return `<span class="pr"><i>$</i>${enteros}<sup>${centavos}</sup></span>`;
}

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

const productosDe = (sec) => sec.grupos.flatMap((g) => g.productos);
const buscar = (sec, codigo) => productosDe(sec).find((p) => p.codigo === codigo);
const destacados = (sec) => (sec.destacados || []).map((c) => buscar(sec, c)).filter((p) => p?.foto);

// Fotos para la pila de la cabecera: una por grupo, sin repetir las tarjetas destacadas.
function fotosPila(sec, cuantas = 3) {
  const libres = (p) => p.foto && !(sec.destacados || []).includes(p.codigo);
  const elegidas = sec.grupos.map((g) => g.productos.find(libres)).filter(Boolean);
  for (const p of productosDe(sec)) if (elegidas.length < cuantas && libres(p) && !elegidas.includes(p)) elegidas.push(p);
  return elegidas.slice(0, cuantas);
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

const granosBlancos = (ancho, alto, semilla) => `<svg class="granos" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" xmlns="http://www.w3.org/2000/svg">
  ${granos({ ancho, alto, cantidad: Math.round((ancho * alto) / 3200), semilla, tam: 1.25, color: '#FFFFFF', borde: '#FFFFFF', opacidad: 0.13 })}</svg>`;

function infoProducto(p) {
  const extras = (p.extras || []).map(([k, v]) => `<span>${esc(k)} <b>${dinero(v)}</b></span>`).join('');
  return `<h3>${esc(p.nombre)}</h3>
      ${p.detalle ? `<p class="det">${esc(p.detalle)}</p>` : ''}
      ${p.sabores ? `<p class="sab"><b>${esc(p.sabores_titulo || 'Sabores')}:</b> ${esc(p.sabores)}</p>` : ''}
      ${extras ? `<div class="extras">${extras}</div>` : ''}`;
}

const etiqueta = (p, clase = '') => `<div class="etiqueta ${clase}"><small>${p.etiqueta ? `POR ${esc(p.etiqueta)}` : 'PRECIO'}</small>${precio(p.precio)}</div>`;

function tarjeta(p, sec) {
  const foto = `<div class="foto">${p.foto ? `<img src="${esc(p.foto)}" alt="">` : ''}</div>`;
  if ((sec.destacados || []).includes(p.codigo)) {
    return `<article class="tarjeta destacada">
      ${foto}
      <div class="lado">
        <div class="lado-cab"><span class="cinta">★ DESTACADO</span><span class="codigo-d">${esc(p.codigo)}</span></div>
        ${infoProducto(p)}
        ${etiqueta(p, 'grande')}
      </div>
    </article>`;
  }
  return `<article class="tarjeta">
    <span class="codigo">${esc(p.codigo)}</span>
    ${foto}
    <div class="info">${infoProducto(p)}</div>
    ${etiqueta(p)}
  </article>`;
}

function cabeceraGrande(sec, i) {
  const marcas = sec.subtitulo.split(' · ').map((m) => `<span>${esc(m)}</span>`).join('');
  const pila = fotosPila(sec).map((p, k) => `<span style="--r:${[-9, 6, -3][k]}deg;--x:${k * 74}px;--y:${[10, 0, 18][k]}px"><img src="${esc(p.foto)}" alt=""></span>`).join('');
  return `<header class="hero" data-id="${esc(sec.id)}" style="${varsColor(sec.color)}">
    <div class="hero-fondo">${granosBlancos(730, 156, 7 + i)}</div>
    <div class="hero-num">${num(i)}</div>
    <div class="hero-txt">
      <small>CATEGORÍA</small>
      <h2 style="font-size:${sec.nombre.length > 16 ? 40 : 48}px">${esc(sec.nombre)}</h2>
      <p>${esc(sec.lema)}</p>
      <div class="hero-marcas">${marcas}</div>
    </div>
    <div class="hero-pila">${pila}</div>
  </header>`;
}

const pestana = (sec, i) => `<div class="pestana" data-sec="${esc(sec.id)}" style="${varsColor(sec.color)};top:${150 + i * 92}px"><span>${esc(sec.nombre.split(',')[0].split(' y ')[0])}</span></div>`;

// ---------- portada ----------
function portada() {
  const elegidos = [['snacks', 'E01'], ['golosinas', 'F01'], ['arroz', 'A04'], ['arroz', 'A01'], ['arroz', 'A09'], ['bebidas', 'D01'], ['abarrotes', 'C12']];
  const secPor = Object.fromEntries(datos.secciones.map((s) => [s.id, s]));
  const fotos = elegidos.map(([s, c]) => buscar(secPor[s], c)).filter((p) => p?.foto);
  const abanico = fotos.map((p, k) => {
    const d = k - (fotos.length - 1) / 2;
    return `<div style="--r:${d * 5}deg;--y:${Math.abs(d) ** 1.6 * 9}px;z-index:${10 - Math.abs(Math.round(d))}"><img src="${esc(p.foto)}" alt=""></div>`;
  }).join('');
  const chips = datos.secciones.map((s) => `<span style="${varsColor(s.color)}">${esc(s.nombre)}</span>`).join('');
  const contacto = negocio.whatsapp
    ? `<b>Pedidos por WhatsApp</b><span class="grande">${esc(telefonoBonito(negocio.whatsapp))}</span>`
    : `<b>Haz tu pedido</b><span class="grande">por WhatsApp</span>`;
  return `<section class="pagina portada">
    <div class="port-foto"><img src="${AMBIENTE.portada}" alt=""></div>
    <svg class="port-ola" viewBox="0 0 816 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 64 C 160 4, 300 4, 430 46 S 690 108, 816 30 L816 120 L0 120 Z" fill="${COLORES.dorado}" opacity="0.9"/>
      <path d="M0 80 C 170 24, 310 22, 436 62 S 690 122, 816 48 L816 120 L0 120 Z" fill="#FFFFFF"/>
    </svg>
    <div class="port-logo">${logo(1)}</div>
    <div class="abanico">${abanico}</div>
    <div class="port-titulo">
      <div class="t1">CATÁLOGO</div>
      <div class="t2">DE PRODUCTOS</div>
      <div class="t3">${esc(datos.vigencia)}</div>
    </div>
    <p class="port-lema">Todo para tu tienda, <b>al por mayor y menor</b></p>
    <div class="port-chips">${chips}</div>
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
      ${foto ? `<div class="tile-foto"><img src="${esc(foto.foto)}" alt=""></div>` : ''}
    </a>`;
  }).join('');
  const pasos = [
    ['Elige', 'Busca tus productos en el catálogo y anota el <b>código</b> de cada uno (por ejemplo A01).'],
    ['Escríbenos', `Envíanos por WhatsApp el código y la cantidad de cada producto${negocio.whatsapp ? ` al <b>${esc(telefonoBonito(negocio.whatsapp))}</b>` : ''}.`],
    ['Confirmamos', 'Te confirmamos precios y disponibilidad, y coordinamos cómo recibes tu pedido.'],
  ].map(([t, d], i) => `<div class="paso"><span>${i + 1}</span><div><b>${t}</b><p>${d}</p></div></div>`).join('');
  return `<section class="pagina indice">
    <div class="ind-cab">
      <div class="ind-txt">
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
    <a class="tile-promo"><span class="tp-estrella">★</span><b>Promociones del mes</b><span>Precios especiales y productos gratis</span><em data-pag-de="promos">pág. –</em></a>
    <h2 class="ind-titulo">¿Cómo hacer tu pedido?</h2>
    <div class="pasos">${pasos}</div>
    ${pie()}
  </section>`;
}

// ---------- promociones ----------
const estallido = (texto, clase) => `<div class="estallido ${clase}">
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><polygon points="${Array.from({ length: 32 }, (_, k) => {
    const r = k % 2 ? 40 : 50; const a = (Math.PI * k) / 16;
    return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ')}"/></svg><span>${texto}</span></div>`;

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
          <div class="ahora"><small>${esc(p.etiqueta_promo)}</small>${precio(p.precio_promo)}</div>
        </div>
      </div>
      <div class="promo-regalo">
        <div class="mas">+</div>
        <div class="regalo-foto"><img src="${esc(p.foto_regalo)}" alt="">${estallido('¡GRATIS!', 'en-foto')}</div>
        <p>${esc(p.regalo)}</p>
      </div>
    </div>`).join('');
  return `<section class="pagina promos" data-id="promos">
    <header class="promos-cab">
      <div class="promos-fondo">${granosBlancos(816, 168, 31)}</div>
      <div class="promos-txt"><small>SOLO ESTE MES</small><h2>Promociones del mes</h2><p>Aprovecha precios especiales y llévate productos gratis con tu pedido</p></div>
      ${estallido('¡APROVECHA!', 'en-cab')}
    </header>
    <div class="promos-lista">${cards}</div>
    <p class="promos-nota">Pregunta por las promociones vigentes al hacer tu pedido.</p>
    ${pie()}
  </section>`;
}

// ---------- arroz (dos páginas destacadas, dos marcas por página) ----------
const cabChica = (sec, i) => `<header class="cab-chica" style="${varsColor(sec.color)}"><span class="cab-chica-num">${num(i)}</span><b>${esc(sec.nombre)}</b><em>continuación</em></header>`;

function bloqueMarca(g, sec) {
  const marca = negocio.productos.find((m) => m.nombre === g.nombre) || {};
  const minis = g.productos.map((p) => `
    <div class="mini">
      <span class="codigo">${esc(p.codigo)}</span>
      <div class="mini-foto"><img src="${esc(p.foto)}" alt=""></div>
      <b>${esc(p.detalle)}</b>
      <div class="mini-precio">${precio(p.precio)}</div>
    </div>`).join('');
  return `<div class="marca-bloque" style="${varsColor(marca.color || sec.color)}">
    <div class="marca-cab">
      ${granosBlancos(730, 54, 3 + g.nombre.length)}
      <small>ARROZ</small><h3>${esc(g.nombre)}</h3>
      ${marca.etiqueta ? `<span class="marca-tag">${esc(marca.etiqueta)}</span>` : ''}
      ${marca.descripcion ? `<p>${esc(marca.descripcion)}</p>` : ''}
    </div>
    <div class="minis">${minis}</div>
  </div>`;
}

function paginaArroz(sec, i) {
  const [primeras, segundas] = [sec.grupos.slice(0, 2), sec.grupos.slice(2)];
  return `<section class="pagina cat arroz" style="${varsColor(sec.color)}">
    <header class="hero hero-foto" data-id="${esc(sec.id)}" style="${varsColor(sec.color)}">
      <img class="hero-img" src="${AMBIENTE.arroz}" alt="">
      <div class="hero-num">${num(i)}</div>
      <div class="hero-txt">
        <small>NUESTRA ESPECIALIDAD</small>
        <h2>${esc(sec.nombre)}</h2>
        <p>${esc(sec.lema)}</p>
        <div class="hero-marcas">${sec.subtitulo.split(' · ').map((m) => `<span>${esc(m)}</span>`).join('')}</div>
      </div>
    </header>
    <div class="filas-arroz">${primeras.map((g) => bloqueMarca(g, sec)).join('')}</div>
    ${pie()}${pestana(sec, i)}
  </section>
  <section class="pagina cat arroz" style="${varsColor(sec.color)}">
    ${cabChica(sec, i)}
    <div class="filas-arroz">${segundas.map((g) => bloqueMarca(g, sec)).join('')}</div>
    ${pie()}${pestana(sec, i)}
  </section>`;
}

// ---------- contraportada ----------
function contraportada() {
  const linea = (etiqueta, valor) => `<div class="dato"><small>${etiqueta}</small>${valor ? `<b>${esc(valor)}</b>` : '<i></i>'}</div>`;
  return `<section class="pagina contra">
    <div class="contra-foto"><img src="${AMBIENTE.contra}" alt=""></div>
    <svg class="port-ola contra-ola" viewBox="0 0 816 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 40 C 150 110, 320 110, 430 70 S 680 6, 816 60 L816 120 L0 120 Z" fill="${COLORES.dorado}" opacity="0.9"/>
      <path d="M0 58 C 160 122, 330 122, 436 86 S 680 24, 816 78 L816 120 L0 120 Z" fill="#FFFFFF"/>
    </svg>
    <div class="contra-sello">
      ${espiga({ tam: 120, tallo: '#FFFFFF' })}
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

// ---------- HTML ----------
function html() {
  const secciones = datos.secciones.map((s, i) => ({
    id: s.id, i, nombre: s.nombre, vars: varsColor(s.color),
    cabGrande: cabeceraGrande(s, i), pestana: pestana(s, i),
    grupos: s.grupos.map((g) => ({ nombre: g.nombre, tarjetas: g.productos.map((p) => tarjeta(p, s)) })),
  }));
  const [, ...resto] = secciones;
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
const titulo = (sec, g, sigue) => nodo('<h4 class="grupo" style="' + sec.vars + '"><span>' + g.nombre + '</span>' + (sigue ? '<em>continuación</em>' : '') + '</h4>');
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
  estirar();
  const paginas = [...document.querySelectorAll('.pagina')];
  paginas.forEach((p, i) => { const n = p.querySelector('.num-pag'); if (n) n.textContent = i + 1; });
  document.querySelectorAll('[data-pag-de]').forEach((el) => {
    const destino = document.querySelector('[data-id="' + el.dataset.pagDe + '"]');
    if (destino) el.textContent = 'pág. ' + (paginas.indexOf(destino.closest('.pagina')) + 1);
  });
}
// Reparte el espacio que sobra al pie de cada página entre las filas: las fotos crecen y la hoja queda llena.
function estirar() {
  document.querySelectorAll('.cuerpo').forEach((c) => {
    const tarjetas = [...c.querySelectorAll('.tarjeta')];
    if (!tarjetas.length) return;
    const filas = new Set(tarjetas.map((t) => Math.round(t.getBoundingClientRect().top))).size;
    const libre = c.getBoundingClientRect().bottom - c.lastElementChild.getBoundingClientRect().bottom - 4;
    const extra = Math.min(170, Math.floor(libre / filas));
    if (extra > 0) tarjetas.forEach((t) => { t.style.height = (t.offsetHeight + extra) + 'px'; });
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
.granos { position: absolute; inset: 0; }

/* precio estilo etiqueta */
.pr { font-family: 'League Gothic'; font-weight: 400; font-size: 33px; line-height: 1; display: inline-flex; align-items: flex-start; letter-spacing: .3px; }
.pr i { font-style: normal; font-size: .52em; margin: .1em 1px 0 0; }
.pr sup { font-size: .52em; line-height: 1; margin: .08em 0 0 1px; vertical-align: baseline; border-bottom: 1.5px solid currentColor; padding-bottom: 1px; }

/* logo */
.logo { display: flex; align-items: center; gap: calc(8px * var(--t)); }
.logo-nombre { font-size: calc(34px * var(--t)); color: var(--verde); line-height: 1.25; }
.logo-sub { font-weight: 800; font-size: calc(10px * var(--t)); letter-spacing: calc(4px * var(--t)); color: var(--dorado-osc); margin-top: -2px; }

/* pie de página */
.pie { position: absolute; left: 38px; right: 48px; bottom: 0; height: 46px; display: flex; align-items: center;
  justify-content: space-between; border-top: 1.5px solid #ECE6D9; font-size: 8.5px; font-weight: 600; color: #8A8F8B; background: #fff; }
.pie .script { font-size: 14px; color: var(--verde); }
.num-pag { width: 26px; height: 26px; border-radius: 50%; background: var(--verde); color: #fff; font-weight: 800; font-size: 11px;
  display: flex; align-items: center; justify-content: center; }

/* páginas de productos */
.pagina.cat { padding: 28px 48px 0 38px; display: flex; flex-direction: column; }
.pagina.cat .cuerpo { flex: 1; min-height: 0; overflow: hidden; margin-bottom: 52px; padding-top: 2px; }
.cuerpo > .hero:not(:first-child) { margin-top: 24px; }
.pestana { position: absolute; right: 0; width: 26px; height: 84px; background: var(--c); border-radius: 10px 0 0 10px;
  display: flex; align-items: center; justify-content: center; box-shadow: -2px 2px 8px rgba(0,0,0,.12); }
.pestana span { writing-mode: vertical-rl; transform: rotate(180deg); color: #fff; font-weight: 800; font-size: 8.5px;
  letter-spacing: 1.2px; text-transform: uppercase; white-space: nowrap; }

/* cabecera de categoría */
.hero { flex: none; height: 156px; border-radius: 24px; position: relative; color: #fff; display: flex; align-items: center;
  padding: 0 0 0 26px; margin-bottom: 6px;
  background: linear-gradient(115deg, var(--c-osc) 0%, var(--c) 45%, color-mix(in srgb, var(--c) 72%, white) 100%); }
.hero-fondo { position: absolute; inset: 0; border-radius: 24px; overflow: hidden; }
.hero-fondo::after { content: ''; position: absolute; right: -60px; top: -80px; width: 340px; height: 340px; border-radius: 50%;
  background: rgba(255,255,255,.14); }
.hero-num { position: relative; font-family: 'League Gothic'; font-size: 96px; line-height: 1; padding-right: 20px; margin-right: 20px;
  border-right: 2px solid rgba(255,255,255,.45); }
.hero-txt { position: relative; flex: 1; min-width: 0; }
.hero-txt small { font-weight: 800; font-size: 10px; letter-spacing: 3px; opacity: .85; }
.hero-txt h2 { font-family: 'League Gothic'; font-weight: 400; font-size: 52px; line-height: .95; text-transform: uppercase; letter-spacing: .5px;
  margin-top: 2px; }
.hero-txt p { font-weight: 700; font-size: 13px; margin-top: 6px; opacity: .96; }
.hero-marcas { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; max-width: 330px; }
.hero-marcas span { background: rgba(255,255,255,.94); color: var(--c-osc); font-weight: 800; font-size: 9.5px; padding: 3px 9px; border-radius: 999px; }
.hero-pila { position: relative; width: 240px; height: 156px; flex: none; }
.hero-pila span { position: absolute; left: var(--x); top: calc(18px + var(--y)); width: 96px; height: 102px; background: #fff; border-radius: 16px;
  padding: 9px; transform: rotate(var(--r)); box-shadow: 0 12px 26px rgba(0,0,0,.22); display: flex; align-items: center; justify-content: center; }
.hero-pila img { max-width: 100%; max-height: 100%; object-fit: contain; }

.hero-foto { background: var(--verde); overflow: hidden; height: 176px; }
.hero-foto::before { z-index: 1; }
.hero-foto .hero-num, .hero-foto .hero-txt { z-index: 2; }
.hero-foto .hero-txt { flex: none; max-width: 290px; }
.hero-foto .hero-txt p { max-width: 220px; }
.hero-img { position: absolute; right: 0; top: 0; width: 54%; height: 100%; object-fit: cover; object-position: 50% 62%; }
.hero-foto::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, var(--verde) 0%, var(--verde) 44%, rgba(30,91,52,.6) 66%, rgba(30,91,52,0) 100%); }

/* continuación */
.cab-chica { flex: none; height: 56px; margin: -28px -48px 10px -38px; padding: 0 48px 0 38px; display: flex; align-items: center; gap: 10px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 16%, white), #fff 80%); border-bottom: 3px solid var(--c); }
.cab-chica-num { background: var(--c); color: #fff; font-family: 'League Gothic'; font-size: 22px; padding: 1px 9px; border-radius: 8px; }
.cab-chica b { font-family: 'League Gothic'; font-weight: 400; font-size: 28px; text-transform: uppercase; color: #1F2A24; letter-spacing: .5px; }
.cab-chica em { font-style: normal; font-weight: 700; font-size: 10px; color: #8A8F8B; text-transform: uppercase; letter-spacing: 1px; }

.grupo { display: flex; align-items: center; gap: 10px; margin: 14px 0 9px; white-space: nowrap; }
.grupo span { background: var(--c); color: #fff; font-weight: 900; font-size: 11px; letter-spacing: 1.3px; text-transform: uppercase;
  padding: 5px 12px; border-radius: 8px 8px 8px 2px; box-shadow: 0 3px 8px color-mix(in srgb, var(--c) 30%, transparent); }
.grupo em { font-style: normal; font-weight: 700; color: #9AA09C; font-size: 9.5px; letter-spacing: 1px; text-transform: uppercase; }
.grupo::after { content: ''; flex: 1; height: 2px; border-radius: 2px; background: color-mix(in srgb, var(--c) 28%, white); }
.rejilla { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; grid-auto-flow: row dense; }

/* tarjeta de producto */
.tarjeta { height: 252px; border: 1px solid #EEE8DC; border-radius: 16px; background: #fff; display: flex; flex-direction: column;
  overflow: hidden; position: relative; box-shadow: 0 4px 12px rgba(40,50,40,.07); }
.tarjeta .foto { flex: 1 1 0; min-height: 80px; margin: 6px 6px 0; position: relative; border-radius: 12px; display: flex; align-items: center; justify-content: center;
  padding: 8px 10px; background: radial-gradient(ellipse at 50% 58%, #fff 15%, color-mix(in srgb, var(--c) 14%, white) 100%); }
.tarjeta .foto img { position: absolute; inset: 8px; margin: auto; max-width: calc(100% - 16px); max-height: calc(100% - 16px); border-radius: 4px; box-shadow: 0 6px 10px rgba(0,0,0,.16); }
.tarjeta .info { padding: 7px 11px 6px; }
.tarjeta h3 { font-weight: 800; font-size: 13px; line-height: 1.18; color: #1F2A24;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tarjeta .det { font-weight: 700; font-size: 10.3px; color: #747A76; margin-top: 2px; }
.tarjeta .sab { font-size: 8.6px; font-weight: 500; color: #747A76; line-height: 1.25; margin-top: 2px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tarjeta .sab b { font-weight: 800; color: var(--c-osc); }
.extras { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px; }
.extras span { background: color-mix(in srgb, var(--c) 13%, white); color: var(--c-osc); font-size: 8.3px; font-weight: 700;
  padding: 2px 6px; border-radius: 6px; }
.extras b { font-weight: 900; }
.etiqueta { flex: none; height: 38px; margin: 0 6px 6px; border-radius: 10px; background: var(--c); color: #fff; display: flex; align-items: center;
  gap: 7px; padding: 0 10px 0 9px; box-shadow: inset 0 -3px 0 rgba(0,0,0,.08); }
.etiqueta::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #fff; flex: none; }
.etiqueta small { flex: 1; font-size: 8px; font-weight: 800; letter-spacing: 1px; opacity: .93; }
.codigo { position: absolute; top: 11px; left: 11px; font-size: 8.8px; font-weight: 800; color: #fff; background: var(--c);
  border-radius: 6px; padding: 2px 6px; z-index: 1; }

/* tarjeta destacada (ocupa dos columnas) */
.tarjeta.destacada { grid-column: span 2; flex-direction: row; border: 1.5px solid color-mix(in srgb, var(--c) 45%, white);
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 15%, white) 0%, #fff 62%); }
.destacada .foto { flex: none; width: 52%; margin: 8px; background: radial-gradient(ellipse at 50% 55%, #fff 30%, color-mix(in srgb, var(--c) 10%, white) 100%); }
.destacada .lado { flex: 1; min-width: 0; padding: 12px 12px 10px 4px; display: flex; flex-direction: column; }
.lado-cab { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.cinta { background: var(--dorado); color: #3A2A06; font-weight: 900; font-size: 9px; letter-spacing: 1px; padding: 3px 7px; border-radius: 6px; }
.codigo-d { font-size: 8px; font-weight: 800; color: var(--c-osc); }
.destacada h3 { font-size: 18px; -webkit-line-clamp: 3; }
.destacada .det { font-size: 12px; margin-top: 3px; }
.destacada .sab { font-size: 9.5px; -webkit-line-clamp: 3; }
.etiqueta.grande { margin: auto 0 0; height: 54px; border-radius: 12px; }
.etiqueta.grande .pr { font-size: 48px; }

/* arroz */
.filas-arroz { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 14px; margin: 12px 0 52px; }
.marca-bloque { flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; border-radius: 20px; overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--c) 30%, white); background: color-mix(in srgb, var(--c) 7%, white); }
.marca-cab { flex: none; height: 54px; position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; padding: 0 20px; color: #fff;
  background: linear-gradient(110deg, var(--c-osc), var(--c) 70%); }
.marca-cab > * { position: relative; }
.marca-cab .granos { position: absolute; }
.marca-cab small { font-weight: 800; font-size: 10px; letter-spacing: 3px; opacity: .9; }
.marca-cab h3 { font-family: 'League Gothic'; font-weight: 400; font-size: 36px; line-height: 1; text-transform: uppercase; }
.marca-tag { background: #fff; color: var(--c-osc); font-weight: 900; font-size: 9px; letter-spacing: .8px; padding: 3px 8px; border-radius: 6px; white-space: nowrap; }
.marca-cab p { margin-left: auto; font-size: 11px; font-weight: 700; }
.minis { flex: 1; min-height: 0; display: flex; gap: 12px; padding: 12px; }
.mini { flex: 1 1 0; min-width: 0; position: relative; border: 1px solid #EEE8DC; border-radius: 16px; display: flex; flex-direction: column; align-items: center;
  padding: 12px 10px 10px; box-shadow: 0 4px 12px rgba(40,50,40,.07);
  background: radial-gradient(ellipse at 50% 40%, #fff 30%, color-mix(in srgb, var(--c) 12%, white) 100%); }
.mini-foto { flex: 1; min-height: 0; width: 100%; position: relative; }
.mini-foto img { position: absolute; inset: 0; margin: auto; max-width: 100%; max-height: 100%; border-radius: 6px; box-shadow: 0 8px 14px rgba(0,0,0,.2); }
.mini b { font-size: 13px; font-weight: 800; color: #1F2A24; margin-top: 10px; text-align: center; }
.mini-precio { margin-top: 5px; background: var(--c); color: #fff; border-radius: 12px; padding: 4px 16px 3px; }
.mini-precio .pr { font-size: 40px; }
.mini .codigo { top: 10px; left: 10px; }

/* portada */
.portada { text-align: center; }
.port-foto { position: absolute; left: 0; right: 0; top: 0; height: 520px; }
.port-foto img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 40%; }
.port-foto::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,.0) 55%, rgba(255,255,255,.25) 100%); }
.port-ola { position: absolute; left: 0; width: 816px; top: 410px; height: 120px; }
.port-logo { position: absolute; top: 30px; left: 50%; transform: translateX(-50%); background: rgba(255,255,255,.95); border-radius: 22px;
  padding: 10px 26px 10px 18px; box-shadow: 0 10px 30px rgba(0,0,0,.18); }
.abanico { position: absolute; top: 382px; left: 0; right: 0; display: flex; justify-content: center; }
.abanico div { width: 112px; height: 124px; margin: 0 -7px; background: #fff; border-radius: 18px; padding: 10px; display: flex; align-items: center;
  justify-content: center; transform: translateY(var(--y)) rotate(var(--r)); box-shadow: 0 14px 30px rgba(0,0,0,.2); }
.abanico img { max-width: 100%; max-height: 100%; object-fit: contain; }
.port-titulo { position: absolute; top: 574px; left: 0; right: 0; }
.port-titulo .t1 { font-family: 'League Gothic'; font-size: 138px; line-height: .86; color: var(--verde); letter-spacing: 2px; }
.port-titulo .t2 { font-weight: 900; font-size: 30px; letter-spacing: 12px; color: #1F2A24; margin-top: 6px; padding-left: 12px; }
.port-titulo .t3 { display: inline-block; margin-top: 12px; background: var(--dorado); color: #3A2A06; font-weight: 900; font-size: 14px;
  letter-spacing: 3px; text-transform: uppercase; padding: 6px 20px; border-radius: 999px; }
.port-lema { position: absolute; top: 806px; left: 0; right: 0; font-size: 20px; font-weight: 600; color: #3A463F; }
.port-lema b { color: var(--verde); font-weight: 900; }
.port-chips { position: absolute; top: 852px; left: 50px; right: 50px; display: flex; flex-wrap: wrap; justify-content: center; gap: 7px; }
.port-chips span { font-size: 10.5px; font-weight: 800; color: #fff; background: var(--c); border-radius: 999px; padding: 4px 11px; }
.port-banda { position: absolute; left: 0; right: 0; bottom: 0; height: 110px; background: var(--verde); color: #fff; display: flex;
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
.ind-txt { flex: 1; }
.ind-hola { font-size: 30px; color: var(--dorado-osc); }
.ind-cab h1 { font-family: 'League Gothic'; font-weight: 400; font-size: 46px; line-height: 1; color: var(--verde); text-transform: uppercase; margin-top: 2px; }
.ind-cab p { font-size: 12px; line-height: 1.55; color: #3A463F; margin-top: 10px; }
.ind-datos { flex: none; display: flex; flex-direction: column; gap: 8px; }
.ind-datos div { width: 122px; border-radius: 14px; padding: 8px 12px; font-weight: 800; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
  color: #fff; background: linear-gradient(135deg, var(--verde), var(--verde-claro)); box-shadow: 0 6px 14px rgba(30,91,52,.18); }
.ind-datos div:nth-child(2) { background: linear-gradient(135deg, var(--dorado-osc), var(--dorado)); box-shadow: 0 6px 14px rgba(201,138,16,.2); }
.ind-datos div:nth-child(3) { background: linear-gradient(135deg, #A61E1E, var(--rojo)); box-shadow: 0 6px 14px rgba(198,40,40,.2); }
.ind-datos .grande { display: block; font-size: 36px; line-height: 1; letter-spacing: 0; }
.ind-titulo { display: flex; align-items: center; gap: 12px; font-weight: 900; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;
  color: var(--verde); margin: 28px 0 14px; }
.ind-titulo::after { content: ''; flex: 1; height: 2px; background: color-mix(in srgb, var(--verde) 18%, white); }
.tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.tile { height: 128px; border-radius: 16px; display: flex; align-items: stretch; position: relative; overflow: hidden;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 11%, white), #fff 70%); border: 1px solid color-mix(in srgb, var(--c) 25%, white);
  box-shadow: 0 4px 12px rgba(40,50,40,.06); }
.tile-num { width: 54px; flex: none; background: var(--c); color: #fff; font-family: 'League Gothic'; font-size: 38px; display: flex; align-items: center; justify-content: center; }
.tile-txt { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 3px; min-width: 0; padding: 10px 6px 10px 12px; }
.tile-txt b { font-weight: 900; font-size: 12.5px; line-height: 1.15; color: #1F2A24; }
.tile-txt small { font-size: 8.5px; font-weight: 600; color: #7A807C; line-height: 1.3; }
.tile-txt em { align-self: flex-start; font-style: normal; font-weight: 800; font-size: 9px; color: #fff; background: var(--c-osc); padding: 2px 7px; border-radius: 6px; margin-top: 3px; }
.tile-foto { width: 70px; flex: none; display: flex; align-items: center; justify-content: center; padding-right: 10px; }
.tile-foto img { max-width: 100%; max-height: 90px; object-fit: contain; box-shadow: 0 5px 6px rgba(0,0,0,.18); }
.tile-promo { margin-top: 12px; height: 56px; border-radius: 14px; display: flex; align-items: center; gap: 14px; padding: 0 18px 0 10px;
  background: linear-gradient(90deg, var(--rojo), #E8590C); color: #fff; box-shadow: 0 6px 16px rgba(198,40,40,.22); }
.tile-promo b { font-family: 'League Gothic'; font-weight: 400; font-size: 26px; text-transform: uppercase; letter-spacing: .5px; }
.tile-promo span { flex: 1; font-size: 11px; font-weight: 600; opacity: .95; }
.tile-promo .tp-estrella { flex: none; width: 38px; height: 38px; border-radius: 50%; background: var(--dorado); color: var(--rojo); font-size: 20px; display: flex; align-items: center; justify-content: center; }
.tile-promo em { font-style: normal; font-weight: 800; font-size: 10px; background: #fff; color: var(--rojo); padding: 3px 9px; border-radius: 6px; }
.pasos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.paso { display: flex; gap: 10px; align-items: flex-start; background: color-mix(in srgb, var(--verde-claro) 9%, white); border-radius: 16px; padding: 18px 16px;
  border: 1px solid color-mix(in srgb, var(--verde-claro) 20%, white); }
.paso span { flex: none; width: 36px; height: 36px; border-radius: 50%; background: var(--verde); color: #fff; font-family: 'League Gothic';
  font-size: 22px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 4px color-mix(in srgb, var(--dorado) 45%, white); }
.paso b { font-weight: 900; font-size: 13px; color: var(--verde); }
.paso p { font-size: 10px; line-height: 1.45; color: #3A463F; margin-top: 3px; }

/* promociones */
.promos-cab { position: relative; height: 168px; display: flex; align-items: center; padding: 0 48px 0 38px; color: #fff;
  background: linear-gradient(110deg, #B71C1C 0%, var(--rojo) 40%, #F76707 100%); }
.promos-fondo { position: absolute; inset: 0; overflow: hidden; }
.promos-txt { position: relative; flex: 1; }
.promos-txt small { font-weight: 900; font-size: 11px; letter-spacing: 4px; color: var(--dorado); }
.promos-txt h2 { font-family: 'League Gothic'; font-weight: 400; font-size: 66px; line-height: .95; text-transform: uppercase; }
.promos-txt p { font-size: 13px; font-weight: 600; margin-top: 4px; }
.estallido { position: relative; display: flex; align-items: center; justify-content: center; }
.estallido svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.estallido polygon { fill: var(--dorado); }
.estallido span { position: relative; font-family: 'League Gothic'; color: var(--rojo); text-align: center; line-height: 1; }
.en-cab { width: 132px; height: 132px; transform: rotate(-10deg); }
.en-cab span { font-size: 24px; }
.promos-lista { padding: 22px 48px 0 38px; }
.promo { height: 370px; border-radius: 24px; border: 2px solid color-mix(in srgb, var(--dorado) 60%, white); background: #fff;
  display: flex; align-items: stretch; margin-bottom: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(40,50,40,.08); }
.promo-foto { width: 236px; flex: none; display: flex; align-items: center; justify-content: center; padding: 22px;
  background: radial-gradient(ellipse at 50% 50%, #fff 20%, color-mix(in srgb, var(--dorado) 30%, white) 100%); }
.promo-foto img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 10px; box-shadow: 0 10px 14px rgba(0,0,0,.2); }
.promo-info { flex: 1; padding: 26px 22px; display: flex; flex-direction: column; }
.promo-tag { align-self: flex-start; background: var(--rojo); color: #fff; font-weight: 900; font-size: 10px; letter-spacing: 2px; padding: 4px 10px; border-radius: 6px; }
.promo-info h3 { font-family: 'League Gothic'; font-weight: 400; font-size: 46px; line-height: 1; text-transform: uppercase; color: #1F2A24; margin-top: 12px; }
.promo-det { font-weight: 700; font-size: 13px; color: #5A605C; margin-top: 6px; }
.promo-precios { margin-top: auto; display: flex; gap: 14px; align-items: flex-end; }
.promo-precios small { display: block; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .8px; color: #7A807C; }
.antes s { font-family: 'League Gothic'; font-size: 38px; color: #9AA09C; text-decoration-thickness: 3px; text-decoration-color: var(--rojo); }
.ahora { background: linear-gradient(135deg, var(--verde), var(--verde-claro)); color: #fff; border-radius: 16px; padding: 10px 18px 8px;
  box-shadow: 0 8px 18px rgba(30,91,52,.25); }
.ahora small { color: var(--dorado); }
.ahora .pr { font-size: 70px; }
.promo-regalo { width: 196px; flex: none; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 18px; border-left: 2px dashed color-mix(in srgb, var(--dorado) 60%, white); background: color-mix(in srgb, var(--dorado) 7%, white); }
.mas { position: absolute; left: -19px; top: 50%; margin-top: -18px; width: 36px; height: 36px; border-radius: 50%; background: var(--dorado);
  color: #3A2A06; font-weight: 900; font-size: 26px; display: flex; align-items: center; justify-content: center; z-index: 2; }
.regalo-foto { position: relative; width: 140px; height: 140px; }
.regalo-foto img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; box-shadow: 0 8px 20px rgba(0,0,0,.18); border: 4px solid #fff; }
.en-foto { position: absolute; right: -26px; top: -22px; width: 84px; height: 84px; transform: rotate(12deg); }
.en-foto span { font-size: 19px; }
.promo-regalo p { font-weight: 800; font-size: 13px; text-align: center; color: #1F2A24; margin-top: 14px; line-height: 1.3; }
.promos-nota { text-align: center; font-size: 11px; font-weight: 600; color: #7A807C; margin-top: 2px; }

/* contraportada */
.contra { text-align: center; }
.contra-foto { position: absolute; left: 0; right: 0; top: 0; height: 400px; }
.contra-foto img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 50%; }
.contra-ola { top: 300px; }
.contra-sello { position: absolute; left: 50%; top: 220px; transform: translateX(-50%); width: 236px; height: 236px; border-radius: 50%; background: var(--verde);
  box-shadow: 0 0 0 7px #fff, 0 0 0 12px var(--dorado), 0 16px 34px rgba(0,0,0,.25); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.contra-sello svg { margin-top: -8px; }
.contra-sello .script { font-size: 32px; color: var(--dorado); line-height: 1.2; }
.contra-sello span { font-weight: 800; font-size: 11px; letter-spacing: 5px; color: #fff; }
.contra h2 { position: absolute; top: 486px; left: 0; right: 0; font-size: 42px; color: var(--verde); font-weight: 400; }
.contra-lema { position: absolute; top: 556px; left: 0; right: 0; font-size: 15px; font-weight: 600; color: #3A463F; }
.contra-datos { position: absolute; top: 600px; left: 128px; width: 560px; background: #fff; border-radius: 22px; border: 1.5px solid #ECE6D9;
  box-shadow: 0 8px 26px rgba(30,60,40,.08); padding: 8px 28px; text-align: left; }
.dato { display: flex; align-items: baseline; gap: 16px; padding: 10px 0; border-bottom: 1px solid #F0EBE0; }
.dato:last-child { border-bottom: 0; }
.dato small { width: 120px; flex: none; font-weight: 800; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: var(--dorado-osc); }
.dato b { font-weight: 800; font-size: 15px; color: #1F2A24; }
.dato i { flex: 1; border-bottom: 1.5px dotted #B9BDB9; height: 14px; }
.contra-nota { position: absolute; left: 80px; right: 80px; bottom: 34px; font-size: 9.5px; color: #8A8F8B; line-height: 1.5; }
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
