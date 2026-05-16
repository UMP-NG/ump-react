export function LineChart({ data, color = 'var(--accent)', height = 240, fill = true }) {
  const w = 800, h = height - 30;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = w / (data.length - 1);
  const pts = data.map((v, i) => [
    i * stepX,
    h - ((v - min) / range) * (h - 20) - 10,
  ]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const areaPath = path + ` L ${w},${h} L 0,${h} Z`;
  const labelIdxs = [0, Math.floor(data.length * 0.2), Math.floor(data.length * 0.4),
    Math.floor(data.length * 0.6), Math.floor(data.length * 0.8), data.length - 1];

  return (
    <svg className="chart-svg" viewBox={`0 0 ${w} ${h + 26}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="cgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((p, i) => (
        <line key={i} x1="0" x2={w} y1={h * p} y2={h * p} stroke="#eef0f4" strokeWidth="1" />
      ))}
      {fill && <path d={areaPath} fill="url(#cgrad)" />}
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (i % 5 === 0 || i === pts.length - 1) && (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#fff" stroke={color} strokeWidth="2" />
      ))}
      {labelIdxs.map(i => (
        <text key={i} x={i * stepX} y={h + 18} fontSize="11" fill="#94a3b8" textAnchor="middle">
          {i}
        </text>
      ))}
    </svg>
  );
}

export function BarChart({ data, labels, height = 240 }) {
  const w = 800, h = height - 30;
  const max = Math.max(...data);
  const bw = w / data.length;
  return (
    <svg className="chart-svg" viewBox={`0 0 ${w} ${h + 26}`} preserveAspectRatio="none">
      {[0.25, 0.5, 0.75, 1].map((p, i) => (
        <line key={i} x1="0" x2={w} y1={h * p} y2={h * p} stroke="#eef0f4" />
      ))}
      {data.map((v, i) => {
        const bh = (v / max) * (h - 16);
        return (
          <g key={i}>
            <rect x={i * bw + 6} y={h - bh} width={bw - 12} height={bh} fill="var(--accent)" rx="4" opacity={0.85} />
            {labels?.[i] && (
              <text x={i * bw + bw / 2} y={h + 18} fontSize="10" fill="#94a3b8" textAnchor="middle">
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function PieChart({ data, size = 200 }) {
  const total = data.reduce((a, b) => a + b.v, 0);
  const r = size / 2 - 6;
  const cx = size / 2, cy = size / 2;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {data.map((s, i) => {
        const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
        acc += s.v;
        const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
        const x1 = cx + r * Math.cos(start);
        const y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(end);
        const y2 = cy + r * Math.sin(end);
        const large = end - start > Math.PI ? 1 : 0;
        return (
          <path
            key={i}
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
            fill={s.c}
            stroke="#fff"
            strokeWidth="2"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#fff" />
    </svg>
  );
}

export function Spark({ data }) {
  const max = Math.max(...data);
  return (
    <span className="spark">
      {data.map((v, i) => (
        <span key={i} style={{ height: ((v / max) * 22) + 'px' }} />
      ))}
    </span>
  );
}
