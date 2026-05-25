function fmtLabel(lbl) {
  if (!lbl && lbl !== 0) return '';
  if (typeof lbl === 'string' && lbl.length === 10) {
    // "2024-01-15" → "15 Jan"
    const d = new Date(lbl + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
  if (typeof lbl === 'string' && lbl.length === 7) {
    // "2024-01" → "Jan '24"
    const d = new Date(lbl + '-01T12:00:00');
    return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  }
  return String(lbl);
}

export function LineChart({ data, data2, color = 'var(--accent)', color2 = '#22c55e', height = 240, fill = true, labels }) {
  if (!data || data.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.2rem' }}>No data</div>;
  }
  const w = 800, h = height - 30;

  // Scale both series on the same axis so they're comparable
  const all = data2 ? [...data, ...data2] : data;
  const max = Math.max(...all);
  const min = Math.min(...all);
  const range = max - min || 1;

  const stepX = data.length > 1 ? w / (data.length - 1) : w;

  function mkPts(arr) {
    return arr.map((v, i) => [
      arr.length > 1 ? i * stepX : w / 2,
      h - ((v - min) / range) * (h - 20) - 10,
    ]);
  }

  const pts  = mkPts(data);
  const pts2 = data2 ? mkPts(data2) : null;

  function mkPath(p) {
    return p.map((pt, i) => (i ? 'L' : 'M') + pt[0].toFixed(1) + ',' + pt[1].toFixed(1)).join(' ');
  }

  const path     = mkPath(pts);
  const areaPath = path + ` L ${w},${h} L 0,${h} Z`;
  const gradId   = `cg_${color.replace(/[^a-z0-9]/gi, '_')}`;

  // Spread ~6 label slots evenly; always include first and last
  const MAX_LABELS = 6;
  const step = Math.max(1, Math.floor(data.length / MAX_LABELS));
  const labelIdxs = [];
  for (let i = 0; i < data.length; i += step) labelIdxs.push(i);
  if (labelIdxs[labelIdxs.length - 1] !== data.length - 1) labelIdxs.push(data.length - 1);

  return (
    <svg className="chart-svg" viewBox={`0 0 ${w} ${h + 26}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((p, i) => (
        <line key={i} x1="0" x2={w} y1={h * p} y2={h * p} stroke="#eef0f4" strokeWidth="1" />
      ))}
      {fill && <path d={areaPath} fill={`url(#${gradId})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts2 && (
        <path d={mkPath(pts2)} fill="none" stroke={color2} strokeWidth="2" strokeDasharray="6 3" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {pts.map((p, i) => (i % 5 === 0 || i === pts.length - 1) && (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#fff" stroke={color} strokeWidth="2" />
      ))}
      {labelIdxs.map(i => (
        <text key={i} x={data.length > 1 ? i * stepX : w / 2} y={h + 18} fontSize="11" fill="#94a3b8" textAnchor="middle">
          {labels ? fmtLabel(labels[i]) : i}
        </text>
      ))}
    </svg>
  );
}

export function BarChart({ data, labels, height = 240 }) {
  if (!data || data.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '1.2rem' }}>No data</div>;
  }
  const w = 800, h = height - 30;
  const max = Math.max(...data) || 1;
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
  if (!total) {
    return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}><circle cx={size/2} cy={size/2} r={size/2-6} fill="#f1f5f9" /><circle cx={size/2} cy={size/2} r={(size/2-6)*0.55} fill="#fff" /></svg>;
  }
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
  if (!data || data.length === 0) return <span className="spark" />;
  const max = Math.max(...data) || 1;
  return (
    <span className="spark">
      {data.map((v, i) => (
        <span key={i} style={{ height: ((v / max) * 22) + 'px' }} />
      ))}
    </span>
  );
}
