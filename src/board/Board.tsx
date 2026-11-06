import type { Hit } from "../autodarts/parse";
import { BOARD_WEDGES, RADII, hitMarker, svgPointToBoardMm } from "./geometry";

const WIRES = [RADII.ob, RADII.ti, RADII.to, RADII.di, RADII.do];

type BoardProps = {
  hits: Hit[];
  paused: boolean;
  onPick?: (xMm: number, yMm: number) => void;
};

export function Board({ hits, paused, onPick }: BoardProps) {
  return (
    <div className={`board-wrap${paused ? " paused" : ""}${onPick ? " picking" : ""}`}>
      <svg
        viewBox="-200 -200 400 400"
        role="img"
        aria-label={onPick ? "Board, click a Segment" : "Board"}
        onClick={
          onPick
            ? (event) => {
                const svg = event.currentTarget;
                const point = svg.createSVGPoint();
                point.x = event.clientX;
                point.y = event.clientY;
                const matrix = svg.getScreenCTM();
                if (!matrix) return;
                const local = point.matrixTransform(matrix.inverse());
                const board = svgPointToBoardMm(local.x, local.y);
                onPick(board.xMm, board.yMm);
              }
            : undefined
        }
      >
        <circle cx={0} cy={0} r={198} fill="#161a1e" />
        {BOARD_WEDGES.map((sector) => (
          <g key={sector.number}>
            {sector.paths.map((path) => (
              <path key={path.d} d={path.d} fill={path.fill} />
            ))}
            <text
              x={sector.labelX}
              y={sector.labelY}
              fill="#c9ced4"
              fontSize={13}
              fontWeight={700}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {sector.number}
            </text>
          </g>
        ))}
        <circle cx={0} cy={0} r={RADII.ob} fill="#2e8b3f" />
        <circle cx={0} cy={0} r={RADII.ib} fill="#c8322e" />
        {WIRES.map((r) => (
          <circle key={r} cx={0} cy={0} r={r} fill="none" stroke="#9aa3ad" strokeWidth={0.6} />
        ))}
        {hits.map((hit, index) => {
          const marker = hitMarker(hit);
          if (!marker) return null;
          return (
            <g key={`${hit.segmentName}-${index}`}>
              <circle className="hit-dot" cx={marker.x} cy={marker.y} r={7} />
              <text
                x={marker.x}
                y={marker.y}
                fill="#fff"
                fontSize={9}
                fontWeight={700}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {index + 1}
              </text>
            </g>
          );
        })}
      </svg>
      {paused ? <p className="pause-banner">Paused — Autodarts disconnected</p> : null}
    </div>
  );
}
