import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Volume2, VolumeX, Play, Pause, Maximize2, X } from 'lucide-react';

interface VideoItem {
  id: string;
  url: string;
  name?: string;
  type: 'local' | 'remote';
}

function VideoCard({ video, onZoom }: { video: VideoItem, onZoom: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Intersection Observer – only play when visible
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (isVisible) {
      vid.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  }, [isVisible]);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const togglePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  }, []);

  return (
    <div
      ref={cardRef}
      className="relative shrink-0 w-[220px] md:w-[260px] aspect-[9/16] rounded-xl overflow-hidden border border-border/50 bg-card shadow-xl group cursor-pointer"
      onClick={onZoom}
    >
      <video
        ref={videoRef}
        src={video.url}
        className="absolute inset-0 w-full h-full object-cover"
        muted={isMuted}
        loop
        playsInline
        preload="metadata"
      />

      {/* Top gradient overlay */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent z-10 pointer-events-none" />

      {/* Bottom gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-10 pointer-events-none" />

      {/* Controls */}
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        <button
          onClick={toggleMute}
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-all"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-all"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onZoom(); }}
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-all"
          title="Agrandir"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Name label */}
      {video.name && (
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <p className="text-white text-sm font-serif truncate drop-shadow-lg">{video.name}</p>
        </div>
      )}

      {/* Play icon when paused (center) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center z-10" onClick={togglePlay}>
          <div className="w-14 h-14 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center shadow-xl animate-pulse">
            <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
          </div>
        </div>
      )}

      {/* Shimmer ring around the card */}
      <div className="absolute inset-0 rounded-xl pointer-events-none z-30 ring-1 ring-inset ring-white/10" />
    </div>
  );
}

export function VideoStories() {
  const [zoomedVideo, setZoomedVideo] = useState<VideoItem | null>(null);

  // Fetch videos from the same API used by the admin media library.
  const { data: remoteVideos = [] } = useQuery({
    queryKey: ['video-stories'],
    queryFn: async () => {
      const response = await fetch('/api/media/published');
      if (!response.ok) throw new Error('Impossible de charger les vidéos.');
      const media = await response.json();
      return (Array.isArray(media) ? media : []).filter((item: any) => item.type === 'video').slice(0, 20).map((m: any) => ({
        id: m.id,
        url: m.url,
        name: m.name || m.title || 'Promotion',
        type: 'remote' as const,
      }));
    },
    staleTime: 60_000,
  });

  // Build local video list by checking which vd*.mp4 files exist
  const [localVideos, setLocalVideos] = useState<VideoItem[]>([]);

  useEffect(() => {
    const checkVideos = async () => {
      const found: VideoItem[] = [];
      // Try vd1.mp4 through vd20.mp4
      for (let i = 1; i <= 20; i++) {
        const url = `/video/vd${i}.mp4`;
        try {
          const res = await fetch(url, { method: 'HEAD' });
          if (res.ok) {
            found.push({
              id: `local-vd${i}`,
              url,
              name: `Story #${i}`,
              type: 'local',
            });
          } else {
            break; // Stop at first missing file
          }
        } catch {
          break;
        }
      }
      setLocalVideos(found);
    };
    checkVideos();
  }, []);

  // Combine: local videos first, then remote
  const allVideos = [...localVideos, ...remoteVideos];

  if (allVideos.length === 0) return null;

  return (
    <section className="py-20 bg-background border-y border-border overflow-hidden">
      <div className="container mx-auto px-4 mb-10">
        <div className="flex flex-col md:flex-row items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-medium">Stories</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif text-foreground">Customers and Models Who Buy From Us</h2>
          </div>
          <p className="text-muted-foreground text-sm">Découvrez notre communauté et nos ambassadeurs</p>
        </div>
      </div>

      {/* Horizontal scrollable stories */}
      <div className="overflow-x-auto scrollbar-none">
        <div
          className="flex gap-5 px-[max(1rem,calc((100%-1280px)/2))] pb-4"
          style={{ width: 'max-content' }}
        >
          {allVideos.map(video => (
            <VideoCard key={video.id} video={video} onZoom={() => setZoomedVideo(video)} />
          ))}
        </div>
      </div>

      {/* ZOOM MODAL */}
      {zoomedVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={() => setZoomedVideo(null)}>
          <button 
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
            onClick={(e) => { e.stopPropagation(); setZoomedVideo(null); }}
          >
            <X className="w-6 h-6" />
          </button>
          
          <div 
            className="relative w-full max-w-[400px] aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <video 
              src={zoomedVideo.url} 
              className="w-full h-full object-cover" 
              autoPlay 
              controls 
              playsInline 
            />
            {zoomedVideo.name && (
              <div className="absolute bottom-4 left-4 right-4 z-20">
                <p className="text-white text-lg font-serif drop-shadow-lg">{zoomedVideo.name}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
