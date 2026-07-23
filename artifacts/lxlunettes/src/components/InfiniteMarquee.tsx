import { ReactNode, useRef } from 'react';
import { cn } from '@/lib/utils';

interface InfiniteMarqueeProps {
  children: ReactNode;
  speed?: number;       // seconds for one full loop
  direction?: 'left' | 'right';
  pauseOnHover?: boolean;
  className?: string;
  gap?: number;         // gap in px between items
}

export function InfiniteMarquee({
  children,
  speed = 40,
  direction = 'left',
  pauseOnHover = true,
  className = '',
  gap = 48,
}: InfiniteMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]',
        className
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center',
          pauseOnHover && 'hover:[animation-play-state:paused]'
        )}
        style={{
          gap: `${gap}px`,
          animation: `marquee-scroll ${speed}s linear infinite`,
          animationDirection: direction === 'right' ? 'reverse' : 'normal',
        }}
      >
        {children}
        {children}
      </div>
      <div
        className={cn(
          'flex shrink-0 items-center',
          pauseOnHover && 'hover:[animation-play-state:paused]'
        )}
        style={{
          gap: `${gap}px`,
          animation: `marquee-scroll ${speed}s linear infinite`,
          animationDirection: direction === 'right' ? 'reverse' : 'normal',
        }}
        aria-hidden
      >
        {children}
        {children}
      </div>

      {/* Inject keyframes once */}
      <style>{`
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
