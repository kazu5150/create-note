export type DiagramNode = { id: string; label: string };
export type DiagramEdge = { from: string; to: string; label?: string };
export type DiagramType = "flowchart" | "concept-map" | "comparison";

export type DiagramSpec = {
  type: DiagramType;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

const WIDTH = 600;
const NODE_W = 160;
const NODE_H = 44;
const NODE_RX = 8;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(text: string, maxChars = 16): string[] {
  const words = text.split("");
  const lines: string[] = [];
  let line = "";
  for (const ch of words) {
    line += ch;
    if (line.length >= maxChars) {
      lines.push(line);
      line = "";
    }
  }
  if (line) lines.push(line);
  return lines;
}

function svgNode(x: number, y: number, label: string, fill = "#e8f4fd"): string {
  const lines = wrapText(label);
  const lineHeight = 18;
  const totalTextH = lines.length * lineHeight;
  const textY = y + NODE_H / 2 - totalTextH / 2 + lineHeight * 0.8;
  const linesHtml = lines
    .map(
      (l, i) =>
        `<text x="${x + NODE_W / 2}" y="${textY + i * lineHeight}" text-anchor="middle" font-size="13" font-family="sans-serif" fill="#1a1a2e">${escapeXml(l)}</text>`
    )
    .join("");
  return `<rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="${NODE_RX}" fill="${fill}" stroke="#4a90d9" stroke-width="1.5"/>
${linesHtml}`;
}

function svgArrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label?: string
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const labelEl = label
    ? `<text x="${mx}" y="${my - 4}" text-anchor="middle" font-size="11" fill="#555" font-family="sans-serif">${escapeXml(label)}</text>`
    : "";
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#4a90d9" stroke-width="1.5" marker-end="url(#arrow)"/>
${labelEl}`;
}

function buildFlowchart(spec: DiagramSpec): string {
  const colGap = 60;
  const rowGap = 70;
  const cols = Math.min(spec.nodes.length, 3);
  const rows = Math.ceil(spec.nodes.length / cols);
  const totalW = cols * NODE_W + (cols - 1) * colGap;
  const startX = (WIDTH - totalW) / 2;
  const height = rows * NODE_H + (rows - 1) * rowGap + 80;

  const positions: Record<string, { cx: number; cy: number; x: number; y: number }> = {};
  spec.nodes.forEach((n, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (NODE_W + colGap);
    const y = 40 + row * (NODE_H + rowGap);
    positions[n.id] = { x, y, cx: x + NODE_W / 2, cy: y + NODE_H / 2 };
  });

  const nodesSvg = spec.nodes
    .map((n) => svgNode(positions[n.id].x, positions[n.id].y, n.label))
    .join("\n");

  const edgesSvg = spec.edges
    .map((e) => {
      const from = positions[e.from];
      const to = positions[e.to];
      if (!from || !to) return "";
      return svgArrow(from.cx, from.cy + NODE_H / 2, to.cx, to.cy - NODE_H / 2, e.label);
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#4a90d9"/></marker></defs>
${edgesSvg}
${nodesSvg}
</svg>`;
}

function buildConceptMap(spec: DiagramSpec): string {
  const height = 400;
  const cx = WIDTH / 2;
  const cy = height / 2;
  const radius = 140;
  const center = spec.nodes[0];
  const leaves = spec.nodes.slice(1);

  const positions: Record<string, { x: number; y: number; cx: number; cy: number }> = {};
  if (center) {
    positions[center.id] = {
      x: cx - NODE_W / 2,
      y: cy - NODE_H / 2,
      cx,
      cy,
    };
  }
  leaves.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / leaves.length - Math.PI / 2;
    const lx = cx + radius * Math.cos(angle);
    const ly = cy + radius * Math.sin(angle);
    positions[n.id] = {
      x: lx - NODE_W / 2,
      y: ly - NODE_H / 2,
      cx: lx,
      cy: ly,
    };
  });

  const nodesSvg = spec.nodes
    .map((n, i) =>
      svgNode(
        positions[n.id].x,
        positions[n.id].y,
        n.label,
        i === 0 ? "#c8e6fa" : "#e8f4fd"
      )
    )
    .join("\n");

  const edgesSvg = spec.edges
    .map((e) => {
      const from = positions[e.from];
      const to = positions[e.to];
      if (!from || !to) return "";
      return svgArrow(from.cx, from.cy, to.cx, to.cy, e.label);
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#4a90d9"/></marker></defs>
${edgesSvg}
${nodesSvg}
</svg>`;
}

function buildComparison(spec: DiagramSpec): string {
  const rowH = 48;
  const colW = 200;
  const headerH = 44;
  const leftNodes = spec.nodes.filter((_, i) => i % 2 === 0);
  const rightNodes = spec.nodes.filter((_, i) => i % 2 === 1);
  const rows = Math.max(leftNodes.length, rightNodes.length);
  const height = headerH + rows * rowH + 40;

  const leftLabel = spec.edges[0]?.label ?? "A";
  const rightLabel = spec.edges[1]?.label ?? "B";

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}">
<rect x="${(WIDTH - colW * 2 - 20) / 2}" y="10" width="${colW}" height="${headerH - 4}" rx="6" fill="#4a90d9"/>
<text x="${(WIDTH - colW * 2 - 20) / 2 + colW / 2}" y="${10 + (headerH - 4) / 2 + 5}" text-anchor="middle" font-size="14" font-weight="bold" fill="white" font-family="sans-serif">${escapeXml(leftLabel)}</text>
<rect x="${(WIDTH - colW * 2 - 20) / 2 + colW + 20}" y="10" width="${colW}" height="${headerH - 4}" rx="6" fill="#4a90d9"/>
<text x="${(WIDTH - colW * 2 - 20) / 2 + colW + 20 + colW / 2}" y="${10 + (headerH - 4) / 2 + 5}" text-anchor="middle" font-size="14" font-weight="bold" fill="white" font-family="sans-serif">${escapeXml(rightLabel)}</text>
`;

  for (let i = 0; i < rows; i++) {
    const y = headerH + i * rowH;
    const lx = (WIDTH - colW * 2 - 20) / 2;
    const rx = lx + colW + 20;
    const fill = i % 2 === 0 ? "#f0f7ff" : "#e8f4fd";
    if (leftNodes[i]) {
      svg += `<rect x="${lx}" y="${y + 4}" width="${colW}" height="${rowH - 8}" rx="4" fill="${fill}" stroke="#c8dff0" stroke-width="1"/>
<text x="${lx + colW / 2}" y="${y + rowH / 2 + 4}" text-anchor="middle" font-size="13" font-family="sans-serif" fill="#1a1a2e">${escapeXml(leftNodes[i].label)}</text>`;
    }
    if (rightNodes[i]) {
      svg += `<rect x="${rx}" y="${y + 4}" width="${colW}" height="${rowH - 8}" rx="4" fill="${fill}" stroke="#c8dff0" stroke-width="1"/>
<text x="${rx + colW / 2}" y="${y + rowH / 2 + 4}" text-anchor="middle" font-size="13" font-family="sans-serif" fill="#1a1a2e">${escapeXml(rightNodes[i].label)}</text>`;
    }
  }

  svg += "</svg>";
  return svg;
}

export function generateSvg(spec: DiagramSpec): string {
  switch (spec.type) {
    case "concept-map":
      return buildConceptMap(spec);
    case "comparison":
      return buildComparison(spec);
    case "flowchart":
    default:
      return buildFlowchart(spec);
  }
}
