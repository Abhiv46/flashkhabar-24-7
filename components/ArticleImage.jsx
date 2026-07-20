'use client';

import { useState } from 'react';

export default function ArticleImage({ src, icon, color, className, loading = 'lazy' }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className="card-image-placeholder"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
      >
        <span>{icon}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading={loading}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
