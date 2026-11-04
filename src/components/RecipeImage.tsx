import React, { useEffect, useState } from 'react';
import { Utensils } from 'lucide-react';

interface RecipeImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export const RecipeImage: React.FC<RecipeImageProps> = ({ src, alt, className = '' }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-zinc-100 via-stone-100 to-emerald-50/60 text-zinc-500 p-4 text-center select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="w-10 h-10 rounded-full bg-white/90 border border-zinc-200/80 flex items-center justify-center mb-2 text-emerald-700">
          <Utensils className="w-5 h-5" />
        </div>
        <span className="text-xs font-medium text-zinc-600 line-clamp-2 max-w-[18ch]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setHasError(true)}
      className={`object-cover ${className}`}
    />
  );
};
