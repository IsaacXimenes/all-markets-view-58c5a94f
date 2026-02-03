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
        className="h-screen w-full flex items-center justify-center p-4 md:p-8 overflow-hidden"
        style={{
          backgroundImage: `url(${loginBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div
          className={cn(
            'w-full max-w-3xl max-h-[90vh] rounded-2xl md:rounded-3xl overflow-hidden',
            'bg-white/20 backdrop-blur-xl border border-white/30',
            'shadow-[0_25px_80px_-20px_rgba(0,0,0,0.25)]',
            'transition-all duration-300',
            !showContent && 'opacity-0 scale-75'
          )}
        >
          <div className="flex flex-col lg:flex-row h-full">
            {/* Left Panel - Phone & Description - Hidden on mobile */}
            <div className="hidden sm:flex flex-1 flex-col items-center justify-center p-4 md:p-6 lg:p-8 order-2 lg:order-1 min-h-0">
              {/* 3D Phone - Scaled responsively */}
              <div className="flex items-center justify-center flex-shrink-0 scale-[0.7] md:scale-[0.8] lg:scale-90 origin-center">
                <Phone3D />
              </div>

              {/* Description */}
              <p className="text-muted-foreground text-center text-sm max-w-xs mt-2 leading-relaxed flex-shrink-0">
                Sua plataforma completa de gestão. Acesse sua conta para continuar.
              </p>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 order-1 lg:order-2 min-h-0">
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
