import type { Hit } from "../autodarts/parse";

/** Autodarts `coordsX/Y` are Board-plane mm ÷ this radius. */
export const COORDS_NORM_RADIUS_MM = 170;

/** WDF scoring-face radii (mm), 20 at the top, clockwise. */
export const RADII = {
  ib: 6.35,
  ob: 15.9,
  ti: 97.9,
  to: 105.9,
  di: 160.5,
  do: 168.5,
  out: 170,
  num: 186,
} as const;

const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5] as const;

export type BoardWedge = {
  number: number;
  labelX: number;
  labelY: number;
  paths: { d: string; fill: string }[];
};

function pt(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
}

function wedge(r0: number, r1: number, a0: number, a1: number): string {
  const [x0, y0] = pt(r1, a0);
  const [x1, y1] = pt(r1, a1);
  const [x2, y2] = pt(r0, a1);
  const [x3, y3] = pt(r0, a0);
  return `M${x0},${y0} A${r1},${r1} 0 0 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 0 0 ${x3},${y3} Z`;
}

export function boardWedges(): BoardWedge[] {
  return SECTORS.map((number, i) => {
    const a0 = i * 18 - 9;
    const a1 = a0 + 18;
    const dark = i % 2 === 0;
    const single = dark ? "#1f2225" : "#e8e2d2";
    const ring = dark ? "#c8322e" : "#2e8b3f";
    const [labelX, labelY] = pt(RADII.num, a0 + 9);
    return {
      number,
      labelX,
      labelY,
      paths: [
        { d: wedge(RADII.ob, RADII.ti, a0, a1), fill: single },
        { d: wedge(RADII.ti, RADII.to, a0, a1), fill: ring },
        { d: wedge(RADII.to, RADII.di, a0, a1), fill: single },
        { d: wedge(RADII.di, RADII.do, a0, a1), fill: ring },
      ],
    };
  });
}

export const BOARD_WEDGES = boardWedges();

/** Board mm on the SVG. +y on the wire is up, so Autodarts Y is flipped. No coords → no marker. */
export function hitMarker(hit: Hit): { x: number; y: number } | null {
  if (hit.coordsX === null || hit.coordsY === null) return null;
  return {
    x: hit.coordsX * COORDS_NORM_RADIUS_MM,
    y: -hit.coordsY * COORDS_NORM_RADIUS_MM,
  };
}

/** SVG viewBox units are millimetres; SVG y grows down, Board y grows toward 20. */
export function svgPointToBoardMm(x: number, y: number): { xMm: number; yMm: number } {
  return { xMm: x, yMm: -y };
}
