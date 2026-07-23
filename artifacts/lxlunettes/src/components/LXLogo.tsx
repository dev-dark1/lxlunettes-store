import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function LXLogo({ className, compact = false }: { className?: string; compact?: boolean }) {
  const logoRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!logoRef.current) return;
    const rect = logoRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const intensity = 20; // 3D rotation intensity
    const rotateX = ((y - centerY) / centerY) * -intensity;
    const rotateY = ((x - centerX) / centerX) * intensity;
    
    setTransform({ rotateX, rotateY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTransform({ rotateX: 0, rotateY: 0 });
  }, []);

  return (
    <div 
      ref={logoRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("cursor-pointer inline-block", className)}
      style={{ perspective: '800px' }}
    >
      <motion.div
        animate={{
          rotateX: transform.rotateX,
          rotateY: transform.rotateY,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.5 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <svg 
          viewBox="100 0 700 340" 
          role="img" 
          aria-label="Luxe Lunettes — Maison d'Optique, Paris"
          className={compact ? "h-10 w-auto" : "h-16 md:h-20 w-auto"}
        >
          <defs>
            <style>
              {`
              @import url('https://fonts.googleapis.com/css2?family=Marcellus&family=Cormorant+Garamond:wght@500;600&display=swap');

              .lxlogo-text { font-family: 'Marcellus','Cormorant Garamond',serif; }

              .lxlogo-ltr {
                opacity: 0;
                animation: letterIn .9s cubic-bezier(.2,.8,.2,1) forwards;
              }
              @keyframes letterIn {
                0%   { opacity: 0; transform: translateY(26px) scale(.8); }
                65%  { opacity: 1; transform: translateY(-5px) scale(1.05); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
              }

              .lxlogo-diamond {
                opacity: 0;
                transform-box: fill-box;
                transform-origin: center;
                animation: diaIn 1s cubic-bezier(.2,.8,.2,1) forwards;
                animation-delay: 1.05s;
              }
              @keyframes diaIn {
                0%   { opacity: 0; transform: rotate(-160deg) scale(0); }
                65%  { opacity: 1; transform: rotate(12deg) scale(1.2); }
                100% { opacity: 1; transform: rotate(0deg) scale(1); }
              }

              .lxlogo-underline {
                stroke-dasharray: 664;
                stroke-dashoffset: 664;
                animation: drawLine 1.1s cubic-bezier(.3,.7,.2,1) forwards;
                animation-delay: 1.7s;
              }
              @keyframes drawLine { to { stroke-dashoffset: 0; } }

              .lxlogo-tagline {
                opacity: 0;
                transform: translateY(10px);
                animation: tagIn 1s ease forwards;
                animation-delay: 2.4s;
              }
              @keyframes tagIn { to { opacity: .75; transform: translateY(0); } }

              .lxlogo-glow {
                transform-box: fill-box;
                transform-origin: center;
                animation: glowPulse 3.6s ease-in-out infinite;
                animation-delay: .2s;
              }
              @keyframes glowPulse {
                0%,100% { opacity: .5; transform: scale(1); }
                50%     { opacity: .8; transform: scale(1.06); }
              }

              @media (prefers-reduced-motion: reduce) {
                .lxlogo-ltr, .lxlogo-diamond, .lxlogo-tagline { animation: none; opacity: 1; transform: none; }
                .lxlogo-underline { animation: none; stroke-dashoffset: 0; }
                .lxlogo-glow { animation: none; }
                .lxlogo-shimmer-group { display: none; }
              }
              `}
            </style>

            <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5DFA0"/>
              <stop offset="45%" stopColor="#CBA046"/>
              <stop offset="100%" stopColor="#8A661F"/>
            </linearGradient>

            <radialGradient id="ambient" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#4A3510" stopOpacity="0.55"/>
              <stop offset="100%" stopColor="#000000" stopOpacity="0"/>
            </radialGradient>

            <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0"/>
              <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0"/>
              <stop offset="50%" stopColor="#FFF8E4" stopOpacity="0.95"/>
              <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0"/>
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"/>
            </linearGradient>

            <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            <mask id="textMask" maskUnits="userSpaceOnUse" x="0" y="0" width="900" height="340">
              <rect x="0" y="0" width="900" height="340" fill="black"/>
              <g fontSize="60" fill="white" className="lxlogo-text">
                <text x="130" y="190">L</text><text x="178" y="190">U</text>
                <text x="226" y="190">X</text><text x="274" y="190">E</text>
                <text x="410" y="190">L</text><text x="458" y="190">U</text>
                <text x="506" y="190">N</text><text x="554" y="190">E</text>
                <text x="602" y="190">T</text><text x="650" y="190">T</text>
                <text x="698" y="190">E</text><text x="746" y="190">S</text>
              </g>
              <path d="M365,163 L378,176 L365,189 L352,176 Z" fill="white"/>
            </mask>
          </defs>

          {/* J'ai commenté le fond noir pour que le logo s'intègre parfaitement à la navbar transparente */}
          {/* <rect width="900" height="340" fill="#0B0A0C"/> */}
          
          <ellipse className="lxlogo-glow" cx="450" cy="170" rx="380" ry="150" fill="url(#ambient)"/>

          <g filter="url(#softGlow)">
            <g fontSize="60" fill="url(#gold)" className="lxlogo-text">
              <text className="lxlogo-ltr" x="130" y="190" style={{ animationDelay: '.05s' }}>L</text>
              <text className="lxlogo-ltr" x="178" y="190" style={{ animationDelay: '.12s' }}>U</text>
              <text className="lxlogo-ltr" x="226" y="190" style={{ animationDelay: '.19s' }}>X</text>
              <text className="lxlogo-ltr" x="274" y="190" style={{ animationDelay: '.26s' }}>E</text>

              <text className="lxlogo-ltr" x="410" y="190" style={{ animationDelay: '.40s' }}>L</text>
              <text className="lxlogo-ltr" x="458" y="190" style={{ animationDelay: '.47s' }}>U</text>
              <text className="lxlogo-ltr" x="506" y="190" style={{ animationDelay: '.54s' }}>N</text>
              <text className="lxlogo-ltr" x="554" y="190" style={{ animationDelay: '.61s' }}>E</text>
              <text className="lxlogo-ltr" x="602" y="190" style={{ animationDelay: '.68s' }}>T</text>
              <text className="lxlogo-ltr" x="650" y="190" style={{ animationDelay: '.75s' }}>T</text>
              <text className="lxlogo-ltr" x="698" y="190" style={{ animationDelay: '.82s' }}>E</text>
              <text className="lxlogo-ltr" x="746" y="190" style={{ animationDelay: '.89s' }}>S</text>
            </g>

            <path className="lxlogo-diamond" d="M365,163 L378,176 L365,189 L352,176 Z" fill="url(#gold)"/>
          </g>

          <line className="lxlogo-underline" x1="128" y1="225" x2="792" y2="225" stroke="url(#gold)" strokeWidth="1.5"/>

          <text className="lxlogo-tagline" x="450" y="262" textAnchor="middle" fontSize="15" letterSpacing="5" fill="#E9E1CC" fontFamily="'Cormorant Garamond',serif">
            MAISON D'OPTIQUE &#183; PARIS
          </text>

          <g className="lxlogo-shimmer-group" mask="url(#textMask)">
            <g transform="skewX(-20)">
              <rect x="-500" y="-50" width="260" height="440" fill="url(#shine)">
                <animateTransform attributeName="transform" type="translate" from="0 0" to="1500 0" begin="3s" dur="3.6s" repeatCount="indefinite"/>
              </rect>
            </g>
          </g>
        </svg>
      </motion.div>
    </div>
  );
}
