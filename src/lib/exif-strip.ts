/**
 * Photo preprocessing for sightings.
 *
 * Two jobs, done together so the original file is only decoded once:
 *  1. Read the GPS coordinates from the photo's EXIF metadata *before* we throw
 *     it away. We never upload these — they are surfaced to the observer as a
 *     location *suggestion* so they can place (and deliberately obscure) the
 *     sighting without typing coordinates by hand.
 *  2. Strip all EXIF (including GPS) by re-encoding through a canvas. Canvas
 *     image encoding never carries source metadata — the standard defense for
 *     citizen-science apps where sensitive species coords must not leak via
 *     photo metadata. Also downscales to max 1600px on the long edge.
 */

export type GpsCoords = { lat: number; lng: number };

export type ProcessedPhoto = {
  /** EXIF-free, downscaled JPEG safe to upload. */
  blob: Blob;
  /** GPS read from the original EXIF, if present. Never uploaded. */
  gps: GpsCoords | null;
};

export async function stripExifAndDownscale(file: File, maxEdge = 1600): Promise<ProcessedPhoto> {
  const gps = await readGpsFromExif(file).catch(() => null);

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const { width, height } = fitInside(img.width, img.height, maxEdge);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas no disponible");
    ctx.drawImage(img, 0, 0, width, height);
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Encoding failed"))),
        "image/jpeg",
        0.82,
      );
    });
    return { blob, gps };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fitInside(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const r = w > h ? max / w : max / h;
  return { width: Math.round(w * r), height: Math.round(h * r) };
}

/**
 * Minimal EXIF GPS reader for JPEGs. Walks the JPEG marker segments to the
 * APP1/EXIF block, parses the TIFF header + IFD0 to locate the GPS IFD, then
 * reads the latitude/longitude rationals and their N/S/E/W references.
 * Returns null for any image without usable GPS (PNGs, screenshots, scrubbed
 * photos, etc.) rather than throwing.
 */
export async function readGpsFromExif(file: File): Promise<GpsCoords | null> {
  const buf = await file.arrayBuffer();
  const view = new DataView(buf);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null; // not a JPEG

  // Find the APP1 (0xFFE1) segment that carries the "Exif\0\0" header.
  let offset = 2;
  let tiffStart = -1;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    if ((marker & 0xff00) !== 0xff00) break; // not a marker — bail out
    const size = view.getUint16(offset + 2);
    if (marker === 0xffe1) {
      const headerStart = offset + 4;
      // "Exif" + 0x00 0x00
      if (
        view.getUint32(headerStart) === 0x45786966 &&
        view.getUint16(headerStart + 4) === 0x0000
      ) {
        tiffStart = headerStart + 6;
        break;
      }
    }
    if (marker === 0xffda) break; // start of scan — no more metadata
    offset += 2 + size;
  }
  if (tiffStart < 0 || tiffStart + 8 > view.byteLength) return null;

  // TIFF header: byte order, magic 0x002A, offset to IFD0.
  const byteOrder = view.getUint16(tiffStart);
  const little = byteOrder === 0x4949; // "II" = little-endian, "MM" = big-endian
  if (!little && byteOrder !== 0x4d4d) return null;
  if (view.getUint16(tiffStart + 2, little) !== 0x002a) return null;

  const ifd0 = tiffStart + view.getUint32(tiffStart + 4, little);
  const gpsIfdOffset = findTag(view, ifd0, tiffStart, little, 0x8825);
  if (gpsIfdOffset == null) return null;

  const gpsIfd = tiffStart + gpsIfdOffset;
  const latRef = readAscii(view, gpsIfd, tiffStart, little, 0x0001);
  const lat = readRationalTriplet(view, gpsIfd, tiffStart, little, 0x0002);
  const lngRef = readAscii(view, gpsIfd, tiffStart, little, 0x0003);
  const lng = readRationalTriplet(view, gpsIfd, tiffStart, little, 0x0004);
  if (lat == null || lng == null) return null;

  let latVal = dmsToDecimal(lat);
  let lngVal = dmsToDecimal(lng);
  if (latRef === "S") latVal = -latVal;
  if (lngRef === "W") lngVal = -lngVal;
  if (!Number.isFinite(latVal) || !Number.isFinite(lngVal)) return null;
  if (latVal === 0 && lngVal === 0) return null; // unset GPS often encodes as 0,0
  if (latVal < -90 || latVal > 90 || lngVal < -180 || lngVal > 180) return null;

  return { lat: round6(latVal), lng: round6(lngVal) };
}

/** Read an IFD entry's value offset (for pointer/SHORT/LONG tags). */
function findTag(
  view: DataView,
  ifd: number,
  tiffStart: number,
  little: boolean,
  tag: number,
): number | null {
  const entry = findEntry(view, ifd, little, tag);
  if (entry == null) return null;
  const type = view.getUint16(entry + 2, little);
  // type 3 = SHORT, type 4 = LONG; value sits in the 4-byte value field.
  return type === 3 ? view.getUint16(entry + 8, little) : view.getUint32(entry + 8, little);
}

function readAscii(
  view: DataView,
  ifd: number,
  tiffStart: number,
  little: boolean,
  tag: number,
): string | null {
  const entry = findEntry(view, ifd, little, tag);
  if (entry == null) return null;
  // GPS ref values are a single ASCII char that fits inline in the value field.
  const code = view.getUint8(entry + 8);
  return code ? String.fromCharCode(code).toUpperCase() : null;
}

function readRationalTriplet(
  view: DataView,
  ifd: number,
  tiffStart: number,
  little: boolean,
  tag: number,
): [number, number, number] | null {
  const entry = findEntry(view, ifd, little, tag);
  if (entry == null) return null;
  const count = view.getUint32(entry + 4, little);
  if (count < 3) return null;
  const valueOffset = tiffStart + view.getUint32(entry + 8, little);
  const out: number[] = [];
  for (let i = 0; i < 3; i++) {
    const base = valueOffset + i * 8;
    if (base + 8 > view.byteLength) return null;
    const numerator = view.getUint32(base, little);
    const denominator = view.getUint32(base + 4, little);
    out.push(denominator === 0 ? 0 : numerator / denominator);
  }
  return [out[0], out[1], out[2]];
}

/** Locate an IFD entry by tag id; returns the entry's byte offset or null. */
function findEntry(view: DataView, ifd: number, little: boolean, tag: number): number | null {
  if (ifd + 2 > view.byteLength) return null;
  const count = view.getUint16(ifd, little);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > view.byteLength) return null;
    if (view.getUint16(entry, little) === tag) return entry;
  }
  return null;
}

function dmsToDecimal([deg, min, sec]: [number, number, number]): number {
  return deg + min / 60 + sec / 3600;
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
