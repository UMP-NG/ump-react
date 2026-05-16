export function StatCard({ label, value, delta, icon, badge, down }) {
  return (
    <div className="adm-stat">
      <div className="lbl">
        <span className="ico"><i className={`fa-solid ${icon}`}></i></span>
        {label}
      </div>
      <div className="v">{value}</div>
      <div className={`delta${down ? ' down' : ''}`}>
        <i className={`fa-solid ${down ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i> {delta}
      </div>
      {badge}
    </div>
  );
}

export function MiniStat({ label, value, icon, color }) {
  return (
    <div className="adm-stat" style={{ padding: '14px 16px' }}>
      <div className="lbl">
        <span className="ico" style={{ background: color + '22', color }}>
          <i className={`fa-solid ${icon}`}></i>
        </span>
        {label}
      </div>
      <div className="v" style={{ fontSize: '2.4rem', marginTop: 6 }}>{value}</div>
    </div>
  );
}
