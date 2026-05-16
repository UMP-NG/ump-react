export default function Thumb({ kind = 'default', label = '', className = '' }) {
  return (
    <div className={`adm-thumb ${className}`}>
      <div className={`img-ph ph-${kind}`} style={{ height: '100%', fontSize: '.8rem' }}>
        {label}
      </div>
    </div>
  );
}
