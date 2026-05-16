export default function Placeholder({ title, icon = 'fa-wrench' }) {
  return (
    <>
      <div className="adm-page-head">
        <div className="left"><h1>{title}</h1></div>
      </div>
      <div className="adm-card">
        <div className="adm-empty" style={{ padding: 80 }}>
          <i className={`fa-solid ${icon}`}></i>
          <p>{title} management coming soon</p>
        </div>
      </div>
    </>
  );
}
