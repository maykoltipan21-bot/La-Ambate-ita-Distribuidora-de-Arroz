#!/usr/bin/env node
// Genera las fotos y videos de La Ambateñita a partir del calendario de contenido.
//
//   node scripts/generar.mjs --marca                    foto de perfil y portada
//   node scripts/generar.mjs --muestras                 un ejemplo de cada plantilla
//   node scripts/generar.mjs --desde 2026-10-26 --dias 7
//
// Por cada día deja en media/AAAA-MM-DD/ la imagen o el video y un publicacion.json
// con el texto final, la hora y las URLs públicas listas para programar en Metricool.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { RAIZ } from './lib/marca.mjs';
import { PLANTILLAS, telefonoBonito, precioBonito, ciudadesTexto } from './lib/plantillas.mjs';
import { renderPNG, renderVideo, miniatura, cerrarNavegador, limpiar } from './lib/render.mjs';

const leerJSON = (ruta) => JSON.parse(readFileSync(join(RAIZ, ruta), 'utf8'));
const negocio = leerJSON('config/negocio.json');
const calendario = leerJSON('contenido/calendario.json');

function argumentos() {
  const a = process.argv.slice(2);
  const valor = (n) => {
    const i = a.indexOf(n);
    return i >= 0 ? a[i + 1] : undefined;
  };
  return {
    marca: a.includes('--marca'),
    muestras: a.includes('--muestras'),
    desde: valor('--desde'),
    dias: Number(valor('--dias') || 7),
  };
}

// ---------- Textos ----------

function enlaceWhatsapp() {
  const n = String(negocio.whatsapp || '').replace(/\D/g, '').replace(/^0/, '');
  return n ? `https://wa.me/${negocio.whatsapp_codigo_pais}${n}` : '';
}

function precioTexto(ref) {
  const [prod, pres] = ref.includes('/') ? ref.split('/') : [null, ref];
  const producto = prod ? negocio.productos.find((p) => p.nombre === prod) : negocio.productos[0];
  const p = producto?.presentaciones.find((x) => x.nombre === pres);
  return precioBonito(p?.precio) || 'consulta el precio por WhatsApp';
}

function listaPrecios() {
  return negocio.productos
    .flatMap((p) => p.presentaciones.map((pr) => `▪️ ${negocio.productos.length > 1 ? `${p.nombre} – ` : ''}${pr.nombre} (${pr.detalle}): ${precioBonito(pr.precio) || 'consulta'}`))
    .join('\n');
}

function ubicacionTexto() {
  const lineas = [];
  if (negocio.direccion_ambato) lineas.push(`📍 Ambato: ${negocio.direccion_ambato}`);
  if (negocio.direccion_macas) lineas.push(`📍 Macas: ${negocio.direccion_macas}`);
  if (!lineas.length) lineas.push(`📍 ${ciudadesTexto(negocio)}`);
  if (negocio.horario) lineas.push(`🕗 ${negocio.horario}`);
  return lineas.join('\n');
}

function rellenarTexto(texto) {
  const contacto = negocio.whatsapp
    ? `📲 Pedidos por WhatsApp: ${telefonoBonito(negocio.whatsapp)}\n👉 ${enlaceWhatsapp()}`
    : '{{FALTA_WHATSAPP}}';
  return texto
    .replaceAll('{{contacto}}', contacto)
    .replaceAll('{{whatsapp}}', negocio.whatsapp ? telefonoBonito(negocio.whatsapp) : '{{FALTA_WHATSAPP}}')
    .replaceAll('{{ciudades}}', ciudadesTexto(negocio))
    .replaceAll('{{ubicacion}}', ubicacionTexto())
    .replaceAll('{{lista_precios}}', listaPrecios())
    .replaceAll('{{hashtags}}', (negocio.hashtags || []).join(' '))
    .replace(/\{\{precio:([^}]+)\}\}/g, (_, ref) => precioTexto(ref));
}

// ---------- Reglas de cada día ----------

function fechaISO(d) {
  return d.toISOString().slice(0, 10);
}

function entradaDelDia(fecha) {
  const inicio = new Date(`${calendario.inicio}T00:00:00Z`);
  const dif = Math.round((fecha - inicio) / 86400000);
  const n = calendario.dias.length;
  return calendario.dias[((dif % n) + n) % n];
}

// Si la entrada necesita algo que no tenemos (una foto real, entregas confirmadas),
// usa su "respaldo" gráfico. Devuelve también lo que falta para publicarla.
function resolverEntrada(entrada) {
  const faltantes = [];
  for (const clave of entrada.requiere || []) {
    if (negocio[clave] === null || negocio[clave] === undefined) faltantes.push(`confirmar "${clave}" en config/negocio.json`);
    else if (!negocio[clave] && entrada.respaldo) return resolverEntrada({ ...entrada.respaldo, texto: entrada.respaldo.texto || entrada.texto });
  }
  const foto = entrada.datos?.foto;
  if (foto && !existsSync(join(RAIZ, foto))) {
    if (entrada.respaldo) return resolverEntrada({ ...entrada.respaldo, texto: entrada.respaldo.texto || entrada.texto });
    faltantes.push(`subir la foto ${foto}`);
  }
  return { entrada, faltantes };
}

async function generarDia(fecha) {
  const iso = fechaISO(fecha);
  const dir = join(RAIZ, 'media', iso);
  const { entrada, faltantes } = resolverEntrada(entradaDelDia(fecha));
  const archivos = [];
  let portadaVideo = null;

  if (entrada.formato === 'reel') {
    const tmp = join(RAIZ, '.cache', iso);
    const pngs = [];
    for (const [i, s] of entrada.slides.entries()) {
      pngs.push(await renderPNG(PLANTILLAS.slide(s, negocio), join(tmp, `slide-${i + 1}.png`)));
    }
    archivos.push(renderVideo(pngs, join(dir, 'reel.mp4')));
    portadaVideo = miniatura(pngs[0], join(dir, 'portada.jpg'));
    limpiar(tmp);
  } else {
    archivos.push(await renderPNG(PLANTILLAS[entrada.plantilla](entrada.datos || {}, negocio), join(dir, 'imagen.png')));
  }

  const texto = rellenarTexto(entrada.texto);
  if (!negocio.whatsapp) faltantes.push('poner el número de WhatsApp en config/negocio.json');
  if (texto.replaceAll('{{FALTA_WHATSAPP}}', '').includes('{{')) faltantes.push('el texto tiene datos sin completar');

  const pub = negocio.publicacion;
  const url = (abs) => `${pub.repo_raw_base}/${relative(RAIZ, abs).split('\\').join('/')}`;
  const publicacion = {
    fecha: iso,
    hora: entrada.formato === 'reel' ? pub.hora_reel : pub.hora_imagen,
    zona_horaria: pub.zona_horaria,
    pilar: entrada.pilar,
    tipo_facebook: entrada.formato === 'reel' ? 'REEL' : 'POST',
    titulo_video: entrada.formato === 'reel' ? entrada.slides[0].titulo : undefined,
    texto,
    media: archivos.map(url),
    portada: portadaVideo ? url(portadaVideo) : undefined,
    listo: faltantes.length === 0,
    faltantes: [...new Set(faltantes)],
    programado: false,
  };
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'publicacion.json'), JSON.stringify(publicacion, null, 2) + '\n');
  console.log(`${iso}  ${publicacion.tipo_facebook.padEnd(4)}  ${entrada.pilar.padEnd(10)}  ${publicacion.listo ? 'LISTO' : 'FALTA: ' + publicacion.faltantes.join('; ')}`);
  return publicacion;
}

// ---------- Marca y muestras ----------

async function generarMarca() {
  const dir = join(RAIZ, 'media', 'marca');
  await renderPNG(PLANTILLAS.perfil({}, negocio), join(dir, 'foto-perfil.png'));
  await renderPNG(PLANTILLAS.portada({}, negocio), join(dir, 'portada-facebook.png'));
  console.log('Listo: media/marca/foto-perfil.png y media/marca/portada-facebook.png');
}

async function generarMuestras() {
  const dir = join(RAIZ, 'media', 'muestras');
  const porPlantilla = new Map();
  for (const d of calendario.dias) {
    const { entrada } = resolverEntrada(d);
    if (entrada.formato !== 'reel' && !porPlantilla.has(entrada.plantilla)) porPlantilla.set(entrada.plantilla, entrada);
  }
  for (const [nombre, e] of porPlantilla) {
    await renderPNG(PLANTILLAS[nombre](e.datos || {}, negocio), join(dir, `${nombre}.png`));
    console.log(`muestra: ${nombre}`);
  }
  const reel = calendario.dias.find((d) => d.formato === 'reel');
  const tmp = join(RAIZ, '.cache', 'muestra-reel');
  const pngs = [];
  for (const [i, s] of reel.slides.entries()) {
    pngs.push(await renderPNG(PLANTILLAS.slide(s, negocio), join(tmp, `slide-${i + 1}.png`)));
  }
  for (const [i, p] of pngs.entries()) miniatura(p, join(dir, `reel-diapositiva-${i + 1}.jpg`));
  renderVideo(pngs, join(dir, 'reel.mp4'));
  limpiar(tmp);
  console.log('muestra: reel.mp4');
}

// ---------- Principal ----------

const args = argumentos();
try {
  if (args.marca) await generarMarca();
  else if (args.muestras) await generarMuestras();
  else {
    const desde = args.desde ? new Date(`${args.desde}T00:00:00Z`) : new Date(Date.now() + 86400000);
    const plan = [];
    for (let i = 0; i < args.dias; i++) {
      plan.push(await generarDia(new Date(desde.getTime() + i * 86400000)));
    }
    const listos = plan.filter((p) => p.listo).length;
    console.log(`\n${listos} de ${plan.length} publicaciones listas para programar.`);
  }
} finally {
  await cerrarNavegador();
}
