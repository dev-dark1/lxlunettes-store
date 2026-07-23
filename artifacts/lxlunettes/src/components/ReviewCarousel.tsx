import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  productName?: string;
  createdAt: string;
  imageUrl?: string;
}

export function ReviewCarousel() {
  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ['public-reviews'],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(12);
      return (data || []).map((r: any) => ({
        id: r.id,
        customerName: r.customer_name || r.customerName || 'Client',
        rating: r.rating || 5,
        comment: r.comment || r.text || '',
        productName: r.product_name || r.productName || '',
        createdAt: r.created_at || r.createdAt || '',
        imageUrl: r.image_url || r.imageUrl || r.image || r.photo || null,
      }));
    },
    staleTime: 120_000,
  });

  const [current, setCurrent] = useState(0);
  const total = reviews.length;

  const next = useCallback(() => setCurrent(c => (c + 1) % total), [total]);
  const prev = useCallback(() => setCurrent(c => (c - 1 + total) % total), [total]);

  // Auto-rotate
  useEffect(() => {
    if (total <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, total]);

  if (total === 0) {
    return (
      <section className="py-24 bg-card border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-4">Ce Que Disent Nos Clients</h2>
          <div className="w-12 h-[2px] bg-primary mx-auto mb-8" />
          <p className="text-muted-foreground">Aucun avis pour le moment.</p>
        </div>
      </section>
    );
  }

  // Show 3 cards: prev, current, next
  const getIndex = (offset: number) => (current + offset + total) % total;
  const positions = [-1, 0, 1];

  return (
    <section className="py-24 bg-card border-t border-border overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-4">Ce Que Disent Nos Clients</h2>
          <div className="w-12 h-[2px] bg-primary mx-auto" />
        </div>

        {/* 3D Carousel */}
        <div className="relative h-[320px] flex items-center justify-center" style={{ perspective: '1200px' }}>
          <AnimatePresence mode="popLayout">
            {positions.map(offset => {
              const idx = getIndex(offset);
              const review = reviews[idx];
              if (!review) return null;

              const isCenter = offset === 0;
              const rotateY = offset * 35;
              const translateZ = isCenter ? 80 : -60;
              const translateX = offset * 320;
              const opacity = isCenter ? 1 : 0.5;
              const scale = isCenter ? 1 : 0.85;

              return (
                <motion.div
                  key={`${review.id}-${offset}`}
                  initial={{ opacity: 0, rotateY: rotateY + 20, translateZ: -100 }}
                  animate={{
                    opacity,
                    rotateY,
                    translateZ,
                    translateX,
                    scale,
                  }}
                  exit={{ opacity: 0, rotateY: rotateY - 20, translateZ: -100 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                  className="absolute w-[340px]"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className={`bg-background border rounded-sm p-8 ${isCenter ? 'border-primary/40 shadow-[0_0_40px_rgba(201,168,76,0.1)]' : 'border-border'}`}>
                    {/* Stars */}
                    <div className="flex gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${s <= review.rating ? 'text-primary fill-primary' : 'text-muted-foreground'}`}
                        />
                      ))}
                    </div>

                    {/* Comment */}
                    <p className="text-white/90 text-sm leading-relaxed mb-6 line-clamp-4 italic font-light">
                      "{review.comment}"
                    </p>

                    {/* Customer & Image */}
                    <div className="flex flex-col gap-4 border-t border-border pt-4">
                      {review.imageUrl && (
                        <div className="w-full h-32 rounded-sm overflow-hidden bg-[#111]">
                          <img src={review.imageUrl} alt="Review" className="w-full h-full object-cover opacity-90" />
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-serif uppercase shrink-0">
                          {review.customerName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{review.customerName}</p>
                          {review.productName && (
                            <p className="text-muted-foreground text-[10px] uppercase tracking-widest">{review.productName}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Controls */}
        {total > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full border border-border bg-background hover:border-primary hover:text-primary text-muted-foreground flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              {reviews.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all ${i === current ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="w-10 h-10 rounded-full border border-border bg-background hover:border-primary hover:text-primary text-muted-foreground flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
