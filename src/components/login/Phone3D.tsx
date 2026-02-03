import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface Phone3DProps {
  className?: string;
  isAnimating?: boolean;
  animationPhase?: 'idle' | 'centering' | 'scanning' | 'expanding';
}

export const Phone3D = ({ className, isAnimating, animationPhase = 'idle' }: Phone3DProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    };
    const formatted = date.toLocaleDateString('pt-BR', options);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  return (
    <div
      className={cn(
        'relative transition-all duration-500 ease-out',
        animationPhase === 'centering' && 'scale-150',
        animationPhase === 'expanding' && 'scale-[20] opacity-0',
        className
      )}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Phone Body */}
      <div
        className="relative w-48 h-96 rounded-[3rem] p-1"
        style={{
          background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 50%, #0a0a0a 100%)',
          boxShadow: `
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.15),
            20px 20px 60px rgba(0, 0, 0, 0.3),
            -20px -20px 60px rgba(255, 255, 255, 0.05)
          `,
          transform: 'rotateY(-5deg) rotateX(5deg)',
        }}
      >
        {/* Screen Bezel */}
        <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden bg-black">
          {/* Dynamic Island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-7 bg-black rounded-full z-20 flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-800" />
            <div className="w-3 h-3 rounded-full bg-gray-900 ring-1 ring-gray-700" />
          </div>

          {/* Screen */}
          <div
            className="absolute inset-1 rounded-[2.3rem] overflow-hidden bg-white"
          >
            {/* Clock Display */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2 text-center z-10">
              <div 
                className="text-black text-4xl tracking-wider"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro", system-ui, sans-serif', fontWeight: 700 }}
              >
                {formatTime(currentTime)}
              </div>
              <div 
                className="text-black/70 text-sm mt-1"
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", system-ui, sans-serif', fontWeight: 400 }}
              >
                {formatDate(currentTime)}
              </div>
            </div>

            {/* Face ID Scan Animation */}
            {(animationPhase === 'scanning' || animationPhase === 'centering') && (
              <>
                {/* Scan Line */}
                <div
                  className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-scan-line z-30"
                />
                
                {/* Face ID Circle */}
                <div className="absolute inset-0 flex items-center justify-center z-30">
                  <div className="relative">
                    {/* Outer Ring */}
                    <div className="w-24 h-24 rounded-full border-2 border-green-400/50 animate-face-id-pulse" />
                    {/* Inner Ring */}
                    <div className="absolute inset-2 rounded-full border-2 border-green-400 animate-face-id-pulse" style={{ animationDelay: '0.2s' }} />
                    {/* Center Dot */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-green-400 animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Glow Effect */}
                <div className="absolute inset-0 bg-green-400/10 animate-glow z-20" />
              </>
            )}

            {/* Screen Reflection */}
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, transparent 100%)',
              }}
            />
          </div>

          {/* Home Indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Side Button (Power) */}
        <div
          className="absolute -right-0.5 top-28 w-1 h-12 rounded-r-sm"
          style={{
            background: 'linear-gradient(90deg, #1a1a1a, #2a2a2a)',
          }}
        />

        {/* Volume Buttons */}
        <div
          className="absolute -left-0.5 top-24 w-1 h-6 rounded-l-sm"
          style={{
            background: 'linear-gradient(90deg, #2a2a2a, #1a1a1a)',
          }}
        />
        <div
          className="absolute -left-0.5 top-32 w-1 h-12 rounded-l-sm"
          style={{
            background: 'linear-gradient(90deg, #2a2a2a, #1a1a1a)',
          }}
        />
      </div>

      {/* Phone Shadow */}
      <div
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-40 h-8 rounded-full blur-2xl opacity-50"
        style={{
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.5) 0%, transparent 70%)',
        }}
      />
    </div>
  );
};