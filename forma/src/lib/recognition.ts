import type { Category, Garment, Season, Style } from '../types';
import { CATEGORIES, COLORS } from './constants';
import { createId } from './id';

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_UPLOAD_FILES = 20;
const MAX_IMAGE_PIXELS = 60_000_000;
const PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/bmp', 'image/x-ms-bmp', 'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']);
const PHOTO_EXTENSION = /\.(jpe?g|png|webp|gif|avif|bmp|heic|heif)$/i;
const isHEIC = (file: File) => /\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type);
export type RecognitionProgress = { phase: string; percent: number };
export type RecognitionResult = { garment: Garment; categoryDetected: boolean; source: 'local' | 'remote' };

/** An external provider can replace LocalRecognitionProvider without changing the upload flow. */
export interface RecognitionProvider {
  analyze(file: File, progress?: (value: RecognitionProgress) => void): Promise<RecognitionResult>;
}

export function validateImage(file: File): void {
  const mime = file.type.toLowerCase();
  // Some iPhone/file providers omit the MIME type. Decode capabilities decide
  // HEIC support; never reject an otherwise supported iPhone photo by extension.
  if (!PHOTO_MIMES.has(mime) && !((!mime || mime === 'application/octet-stream') && PHOTO_EXTENSION.test(file.name))) {
    throw new Error('Scegli una foto dalla galleria. JPEG, PNG e WebP sono i formati consigliati.');
  }
  if (file.size > MAX_IMAGE_BYTES) throw new Error('Questa foto supera 12 MB. Scegli una versione più leggera.');
  if (!file.size) throw new Error('Questo file è vuoto. Scegli un’altra foto.');
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([img.decode(), new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('decode timeout')), 20_000); })]);
    if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > MAX_IMAGE_PIXELS) {
      img.src = '';
      throw new Error('La risoluzione della foto è troppo elevata. Riducila sotto 60 megapixel e riprova.');
    }
  } catch (error) {
    img.src = '';
    if (error instanceof Error && error.message.includes('60 megapixel')) throw error;
    throw new Error('Non riesco a leggere questa foto. Prova un altro file JPEG, PNG o WebP.');
  } finally { clearTimeout(timeout); }
  return img;
}

function normalizedImage(canvas: HTMLCanvasElement, quality = .86): string {
  const image = canvas.toDataURL('image/webp', quality);
  // Safari may fall back to PNG when WebP encoding is unavailable. Both keep
  // backups portable; the original HEIC is never persisted in IndexedDB.
  if (!/^data:image\/(webp|png|jpeg);base64,/.test(image)) throw new Error('Non riesco a ottimizzare questa foto. Prova con un JPEG o PNG.');
  return image;
}

function imageCanvas(image: HTMLImageElement, maxSize = 1280): HTMLCanvasElement {
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Il browser non supporta la lettura delle immagini.');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function nearestColor(r: number, g: number, b: number): typeof COLORS[number] {
  const light = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  if (saturation < 20) return COLORS.find(c => c.name === (light > 204 ? 'Bianco' : light < 70 ? 'Nero' : 'Grigio'))!;
  return COLORS.reduce((best, color) => {
    const value = parseInt(color.hex.slice(1), 16);
    const distance = (r - (value >> 16)) ** 2 + (g - ((value >> 8) & 255)) ** 2 + (b - (value & 255)) ** 2;
    return distance < best.distance ? { color, distance } : best;
  }, { color: COLORS[0], distance: Infinity }).color;
}

function sampleColors(image: HTMLImageElement): { primary: typeof COLORS[number]; secondary: string[] } {
  const canvas = imageCanvas(image, 96);
  const { width, height } = canvas;
  const data = canvas.getContext('2d')!.getImageData(0, 0, width, height).data;
  const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
  const background = [0, 1, 2].map(channel => corners.reduce((sum, [x, y]) => sum + data[(y * width + x) * 4 + channel], 0) / 4);
  const counts = new Map<string, number>();
  const fallback = new Map<string, number>();
  for (let y = Math.floor(height * .12); y < height * .88; y += 2) {
    for (let x = Math.floor(width * .12); x < width * .88; x += 2) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) continue;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const color = nearestColor(r, g, b).name;
      fallback.set(color, (fallback.get(color) || 0) + 1);
      const distance = Math.sqrt((r - background[0]) ** 2 + (g - background[1]) ** 2 + (b - background[2]) ** 2);
      if (distance < 38) continue;
      counts.set(color, (counts.get(color) || 0) + 1);
    }
  }
  const sorted = [...(counts.size ? counts : fallback)].sort((a, b) => b[1] - a[1]);
  const primary = COLORS.find(c => c.name === sorted[0]?.[0]) || COLORS[2];
  return { primary, secondary: sorted.slice(1).filter(([, count]) => count > (sorted[0]?.[1] || 1) * .28).slice(0, 2).map(([color]) => color) };
}

const categoryHints: Array<[RegExp, Category]> = [
  [/\b(t[ -]?shirt|maglietta|tee)\b/i, 'T-shirt'], [/\b(camicia|shirt)\b/i, 'Camicia'],
  [/\bpolo\b/i, 'Polo'], [/\b(felpa|hoodie|sweatshirt)\b/i, 'Felpa'],
  [/\b(maglione|sweater|knitwear|pullover)\b/i, 'Maglione'], [/\b(cappotto|overcoat|coat)\b/i, 'Cappotto'],
  [/\b(giacca|jacket|blazer)\b/i, 'Giacca'], [/\b(jeans|denim)\b/i, 'Jeans'],
  [/\b(shorts|bermuda|pantaloncini)\b/i, 'Shorts'], [/\b(pantaloni|trousers|pants|chino)\b/i, 'Pantaloni'],
  [/\b(sneakers|sneaker|jordan|trainer)\b/i, 'Sneakers'], [/\b(mocassini|loafers|oxford|derby)\b/i, 'Scarpe eleganti'],
  [/\b(cappello|berretto|cintura|borsa|sciarpa|hat|belt|bag|scarf)\b/i, 'Accessori'],
];

export class LocalRecognitionProvider implements RecognitionProvider {
  async analyze(file: File, progress?: (value: RecognitionProgress) => void): Promise<RecognitionResult> {
    validateImage(file);
    progress?.({ phase: 'Lettura della foto', percent: 12 });
    const url = URL.createObjectURL(file);
    let image: HTMLImageElement | undefined;
    let canvas: HTMLCanvasElement | undefined;
    try {
      try { image = await loadImage(url); }
      catch (error) {
        if (isHEIC(file) && !(error instanceof Error && error.message.includes('60 megapixel'))) {
          throw new Error('Questo browser non riesce ad aprire la foto HEIC. Prova a sceglierla da Foto oppure esportala in JPEG o PNG.');
        }
        throw error;
      }
      progress?.({ phase: 'Ottimizzazione immagine', percent: 45 });
      await new Promise(resolve => setTimeout(resolve, 0));
      canvas = imageCanvas(image);
      const compressed = normalizedImage(canvas);
      progress?.({ phase: 'Estrazione dei colori', percent: 76 });
      await new Promise(resolve => setTimeout(resolve, 0));
      const colors = sampleColors(image);
      const filename = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      const hinted = categoryHints.find(([regex]) => regex.test(filename));
      const category = hinted?.[1] || 'T-shirt';
      const seasons: Season[] = ['Primavera', 'Estate', 'Autunno', 'Inverno'];
      progress?.({ phase: 'Bozza pronta da verificare', percent: 100 });
      return { source: 'local', categoryDetected: Boolean(hinted), garment: {
        id: createId(), name: hinted ? filename.charAt(0).toUpperCase() + filename.slice(1) : 'Nuovo capo',
        category, subcategory: '', color: colors.primary.name, colorHex: colors.primary.hex,
        secondaryColors: colors.secondary, style: 'Casual', seasons, formality: 2, material: '', pattern: 'Da verificare',
        image: compressed, favorite: false, wearCount: 0, lastWorn: null, createdAt: new Date().toISOString(), demo: false,
      } };
    } finally {
      URL.revokeObjectURL(url);
      if (image) image.src = '';
      if (canvas) { canvas.width = 0; canvas.height = 0; }
    }
  }
}

/** The endpoint runs on the application's server; never put provider secrets in browser code. */
export class RemoteRecognitionProvider implements RecognitionProvider {
  constructor(private endpoint: string) {}
  async analyze(file: File, progress?: (value: RecognitionProgress) => void): Promise<RecognitionResult> {
    const local = await new LocalRecognitionProvider().analyze(file, progress);
    progress?.({ phase: 'Riconoscimento del capo', percent: 90 });
    const response = await fetch(this.endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: local.garment.image, filename: file.name }),
    });
    if (!response.ok) throw new Error('Il servizio di riconoscimento non è disponibile. Riprova con l’analisi locale.');
    const result = await response.json() as { category?: Category; name?: string; subcategory?: string; color?: string; secondaryColors?: string[]; style?: Style; seasons?: Season[]; material?: string; pattern?: string; formality?: number };
    const garment = { ...local.garment };
    if (typeof result.name === 'string') garment.name = result.name.slice(0, 100);
    if (typeof result.subcategory === 'string') garment.subcategory = result.subcategory.slice(0, 100);
    if (result.category && CATEGORIES.includes(result.category)) garment.category = result.category;
    const color = COLORS.find(c => c.name === result.color);
    if (color) { garment.color = color.name; garment.colorHex = color.hex; }
    if (Array.isArray(result.secondaryColors)) garment.secondaryColors = result.secondaryColors.filter(c => COLORS.some(item => item.name === c)).slice(0, 5);
    if (result.style && ['Minimal', 'Casual', 'Streetwear', 'Elegante', 'Sportivo'].includes(result.style)) garment.style = result.style;
    if (Array.isArray(result.seasons)) { const seasons = result.seasons.filter(s => ['Primavera', 'Estate', 'Autunno', 'Inverno'].includes(s)); if (seasons.length) garment.seasons = seasons; }
    if (typeof result.material === 'string') garment.material = result.material.slice(0, 100);
    if (typeof result.pattern === 'string') garment.pattern = result.pattern.slice(0, 100);
    if (typeof result.formality === 'number') garment.formality = Math.round(Math.max(1, Math.min(5, result.formality)));
    progress?.({ phase: 'Bozza pronta da verificare', percent: 100 });
    return { garment, source: 'remote', categoryDetected: Boolean(result.category && CATEGORIES.includes(result.category)) };
  }
}

/** Removes only edge-connected pixels matching a sufficiently uniform background. */
export async function removeUniformBackground(src: string): Promise<string> {
  const image = await loadImage(src);
  const canvas = imageCanvas(image);
  const { width, height } = canvas;
  const ctx = canvas.getContext('2d')!;
  const frame = ctx.getImageData(0, 0, width, height);
  const pixels = frame.data;
  const samples: number[][] = [];
  for (let step = 0; step < 20; step++) {
    const x = Math.min(width - 1, Math.floor(step * width / 20));
    const y = Math.min(height - 1, Math.floor(step * height / 20));
    for (const i of [x * 4, ((height - 1) * width + x) * 4, y * width * 4, (y * width + width - 1) * 4]) {
      if (pixels[i + 3] > 128) samples.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
    }
  }
  if (samples.length < 10) throw new Error('Questa immagine ha già uno sfondo trasparente.');
  const average = [0, 1, 2].map(channel => samples.reduce((sum, pixel) => sum + pixel[channel], 0) / samples.length);
  const distance = (r: number, g: number, b: number) => Math.sqrt((r - average[0]) ** 2 + (g - average[1]) ** 2 + (b - average[2]) ** 2);
  const matching = samples.filter(p => distance(p[0], p[1], p[2]) < 40).length;
  if (matching / samples.length < .84) throw new Error('Lo sfondo non è abbastanza uniforme. Prova una foto su un fondo a tinta unita.');
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  let removed = 0;
  const add = (index: number) => {
    if (visited[index]) return;
    visited[index] = 1;
    const offset = index * 4;
    if (pixels[offset + 3] < 20 || distance(pixels[offset], pixels[offset + 1], pixels[offset + 2]) < 48) queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
  while (head < tail) {
    const index = queue[head++];
    pixels[index * 4 + 3] = 0;
    removed++;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) add(index - 1);
    if (x < width - 1) add(index + 1);
    if (y > 0) add(index - width);
    if (y < height - 1) add(index + width);
  }
  if (removed > width * height * .95) throw new Error('Capo e sfondo hanno colori troppo simili. Mantieni la foto originale.');
  ctx.putImageData(frame, 0, 0);
  const result = normalizedImage(canvas, .9);
  image.src = '';
  canvas.width = 0;
  canvas.height = 0;
  return result;
}
