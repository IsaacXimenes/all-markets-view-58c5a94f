import { useState } from 'react';
import { Phone3D } from './Phone3D';
import { LoginForm } from './LoginForm';
import { BiometricTransition } from './BiometricTransition';
import { cn } from '@/lib/utils';
import loginBackground from '@/assets/login-background.jpg';

export const LoginCard = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showContent, setShowContent] = useState(true);

  const handleLoginSuccess = () => {
    setShowContent(false);
    setIsTransitioning(true);
  };

  const handleTransitionComplete = () => {
    setIsTransitioning(false);
  };

  return (
    <>
      <div 
        className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 overflow-y-auto"
        style={{
          backgroundImage: `url(${loginBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div
          className={cn(
            'w-full max-w-3xl rounded-2xl md:rounded-3xl overflow-hidden',
            'bg-white/20 backdrop-blur-xl border border-white/30',
            'shadow-[0_25px_80px_-20px_rgba(0,0,0,0.25)]',
            'transition-all duration-300',
            'scale-[0.95] sm:scale-[0.85]',
            !showContent && 'opacity-0 scale-75'
          )}
        >
          <div className="flex flex-col lg:flex-row">
            {/* Left Panel - Phone & Description - Hidden on mobile */}
            <div className="hidden sm:flex flex-1 flex-col items-center justify-center p-6 lg:p-12 order-2 lg:order-1">
              {/* 3D Phone */}
              <div className="flex-1 flex items-center justify-center py-4">
                <Phone3D />
              </div>

              {/* Description */}
              <p className="text-muted-foreground text-center text-sm max-w-xs mt-4 leading-relaxed">
                Sua plataforma completa de gestão. Acesse sua conta para continuar.
              </p>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 order-1 lg:order-2">
              <LoginForm onLoginSuccess={handleLoginSuccess} />
            </div>
          </div>
        </div>
      </div>

      {/* Biometric Transition Overlay */}
      <BiometricTransition
        isActive={isTransitioning}
        onComplete={handleTransitionComplete}
      />
    </>
  );
};
