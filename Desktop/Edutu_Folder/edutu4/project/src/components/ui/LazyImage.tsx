import React, { useState, useRef, useEffect } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  errorFallback?: React.ReactNode;
  loading?: 'lazy' | 'eager';
  aspectRatio?: 'square' | '4/3' | '16/9' | '3/2' | 'auto';
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  placeholderClassName = '',
  errorFallback,
  loading = 'lazy',
  aspectRatio = 'auto',
  ...props
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [inView, setInView] = useState(loading === 'eager');
  const imgRef = useRef<HTMLImageElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading === 'eager' || inView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before the image comes into view
        threshold: 0.1
      }
    );

    if (placeholderRef.current) {
      observer.observe(placeholderRef.current);
    }

    return () => observer.disconnect();
  }, [loading, inView]);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true); // Stop showing loading state
  };

  const aspectRatioClasses = {
    'square': 'aspect-square',
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-video',
    '3/2': 'aspect-[3/2]',
    'auto': ''
  };

  const baseImageClasses = `transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${className}`;
  const placeholderClasses = `flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${aspectRatioClasses[aspectRatio]} ${placeholderClassName}`;

  if (imageError && errorFallback) {
    return <div className={placeholderClasses}>{errorFallback}</div>;
  }

  if (imageError && !errorFallback) {
    return (
      <div className={placeholderClasses}>
        <div className="text-center p-4">
          <svg
            className="mx-auto h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Image failed to load
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${aspectRatio !== 'auto' ? aspectRatioClasses[aspectRatio] : ''}`}>
      {/* Placeholder */}
      {!imageLoaded && (
        <div ref={placeholderRef} className={`absolute inset-0 ${placeholderClasses}`}>
          <div className="animate-pulse flex items-center justify-center">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Actual Image */}
      {inView && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={baseImageClasses}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={loading}
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
};

export default LazyImage;