import { useState, useEffect, useCallback, useRef } from 'react';

interface HeroSlideshowProps {
  /** Base path without number, e.g. "/images/home/hommes/hero" */
  basePath: string;
  /** Number of images (hero1.jpg → hero{count}.jpg) */
  count: number;
  /** Interval in ms (default 10000 = 10s) */
  interval?: number;
  /** Additional className */
  className?: string;
}

/**
 * Luxurious crossfade slideshow with subtle Ken Burns zoom effect.
 * Two image layers alternate opacity to create a smooth dissolve transition.
 */
export function HeroSlideshow({ basePath, count, interval = 10000, className = '' }: HeroSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Generate image URLs
  const images = Array.from({ length: count }, (_, i) => `${basePath}${i + 1}.jpg`);

  const advance = useCallback(() => {
    setIsTransitioning(true);
    const next = (currentIndex + 1) % count;
    setNextIndex(next);
    
    // After the crossfade completes (1.5s), swap layers
    setTimeout(() => {
      setCurrentIndex(next);
      setIsTransitioning(false);
    }, 1500);
  }, [currentIndex, count]);

  useEffect(() => {
    if (count <= 1) return;
    timerRef.current = setInterval(advance, interval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [advance, interval, count]);

  // Preload all images on mount
  useEffect(() => {
    images.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  if (count <= 0) return null;
  if (count === 1) {
    return (
      <img
        src={images[0]}
        alt="Hero"
        className={`absolute inset-0 w-full h-full object-cover ${className}`}
      />
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Bottom layer (current) – always visible */}
      <img
        key={`current-${currentIndex}`}
        src={images[currentIndex]}
        alt="Hero"
        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-[12s] ease-linear ${className}`}
        style={{
          animation: `kenBurns ${interval}ms ease-in-out infinite alternate`,
        }}
      />

      {/* Top layer (next) – fades in during transition */}
      <img
        key={`next-${nextIndex}`}
        src={images[nextIndex]}
        alt="Hero next"
        className={`absolute inset-0 w-full h-full object-cover ${className}`}
        style={{
          opacity: isTransitioning ? 1 : 0,
          transition: 'opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isTransitioning ? 'scale(1.05)' : 'scale(1)',
          transitionProperty: 'opacity, transform',
          transitionDuration: '1.5s, 12s',
        }}
      />
    </div>
  );
}
