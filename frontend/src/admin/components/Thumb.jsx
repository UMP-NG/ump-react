import { useState } from 'react';

export default function Thumb({ src, kind = 'default', label = '', className = '' }) {
  const [broken, setBroken] = useState(false);

  if (src && !broken) {
    return (
      <div className={`adm-thumb ${className}`}>
        <img
          src={src}
          alt={label}
          onError={() => setBroken(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
        />
      </div>
    );
  }

  return (
    <div className={`adm-thumb ${className}`}>
      <div className={`img-ph ph-${kind}`} style={{ height: '100%', fontSize: '.8rem' }}>
        {label}
      </div>
    </div>
  );
}
