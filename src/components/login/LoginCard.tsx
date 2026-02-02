import { useState } from 'react';
import { Phone3D } from './Phone3D';
import { LoginForm } from './LoginForm';
import { BiometricTransition } from './BiometricTransition';
import logoThiago from '@/assets/thiago-imports-logo.png';
import { cn } from '@/lib/utils';

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
      <div className="min-h-screen w-full flex items-center justify-center bg-white p-4 md:p-8">
        <div
          className={cn(
            'w-full max-w-5xl bg-white rounded-3xl overflow-hidden',
            'shadow-[0_25px_80px_-20px_rgba(0,0,0,0.15)]',
            'transition-all duration-300',
            !showContent && 'opacity-0 scale-95'
          )}
        >
          <div className="flex flex-col lg:flex-row min-h-[600px]">
            {/* Left Panel - Branding & Phone */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 bg-white order-2 lg:order-1">
              {/* Logo */}
              <div className="mb-6">
                <img
                  src={logoThiago}
                  alt="Thiago Imports"
                  className="h-12 w-auto object-contain"
                />
              </div>

              {/* Brand Name */}
              <h2 className="text-2xl font-bold text-foreground mb-8 tracking-tight">
                THIAGO IMPORTS
              </h2>

              {/* 3D Phone */}
              <div className="flex-1 flex items-center justify-center py-4">
                <Phone3D />
              </div>

              {/* Description */}
              <p className="text-gray-500 text-center text-sm max-w-xs mt-6 leading-relaxed">
                Sua plataforma completa de gestão de importações. Acesse sua conta para continuar.
              </p>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-gray-50/50 order-1 lg:order-2">
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
