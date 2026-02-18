import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginForm } from './LoginForm';
import { BiometricTransition } from './BiometricTransition';
import loginBg from '@/assets/login_screen_v2_thiago_imports.png';
import logo from '@/assets/thiago-imports-logo.png';
import { useIsMobile } from '@/hooks/use-mobile';

export const LoginCard = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showCard, setShowCard] = useState(true);
  const [bgPulse, setBgPulse] = useState(false);
  const isMobile = useIsMobile();

  const handleLoginSuccess = () => {
    setBgPulse(true);
    setTimeout(() => setShowCard(false), 200);
    setTimeout(() => setIsTransitioning(true), 400);
  };

  const handleTransitionComplete = () => {
    setIsTransitioning(false);
  };

  return (
    <>
      <div className="h-screen w-full flex items-center justify-center p-4 md:p-8 overflow-hidden relative">
        {/* Background with circuit image */}
        <motion.div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${loginBg})` }}
          animate={bgPulse ? { filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'] } : {}}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />

        {/* Golden pulse overlay */}
        <AnimatePresence>
          {bgPulse && (
            <motion.div
              className="absolute inset-0 z-10"
              style={{ backgroundColor: 'rgba(247, 187, 5, 0.15)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 0.6 }}
            />
          )}
        </AnimatePresence>

        {/* Card */}
        <AnimatePresence>
          {showCard && (
            <motion.div
              className="relative z-20 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl"
              initial={{ scale: 1, opacity: 1 }}
              exit={
                isMobile
                  ? { opacity: 0, transition: { duration: 0.3 } }
                  : { scale: 1.5, opacity: 0, transition: { duration: 0.6, ease: 'easeIn' } }
              }
            >
              <div className="flex flex-col md:flex-row min-h-[500px]">
                {/* Left Panel - White with logo & illustration */}
                <div
                  className="hidden md:flex flex-1 flex-col items-center justify-center p-10 gap-8"
                  style={{ backgroundColor: '#FFFFFF' }}
                >
                  <img src={logo} alt="Thiago Imports" className="w-44 object-contain" />

                  {/* Tech illustration SVG */}
                  <svg viewBox="0 0 300 200" className="w-64 opacity-80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Laptop */}
                    <rect x="60" y="50" width="120" height="80" rx="6" stroke="#111111" strokeWidth="2" fill="#f5f5f5" />
                    <rect x="68" y="58" width="104" height="60" rx="2" fill="#212121" />
                    <rect x="76" y="66" width="40" height="6" rx="2" fill="#F7BB05" />
                    <rect x="76" y="78" width="88" height="4" rx="2" fill="#555" />
                    <rect x="76" y="86" width="60" height="4" rx="2" fill="#555" />
                    <rect x="76" y="94" width="75" height="4" rx="2" fill="#555" />
                    <rect x="76" y="102" width="50" height="4" rx="2" fill="#F7BB05" opacity="0.6" />
                    <path d="M40 130 H200 Q210 130 210 135 L210 138 H30 L30 135 Q30 130 40 130Z" fill="#ddd" stroke="#ccc" strokeWidth="1" />
                    {/* Phone */}
                    <rect x="210" y="60" width="45" height="80" rx="8" stroke="#111111" strokeWidth="2" fill="#f5f5f5" />
                    <rect x="216" y="72" width="33" height="56" rx="2" fill="#212121" />
                    <rect x="222" y="80" width="21" height="4" rx="1" fill="#F7BB05" />
                    <rect x="222" y="88" width="21" height="3" rx="1" fill="#555" />
                    <rect x="222" y="95" width="15" height="3" rx="1" fill="#555" />
                    <circle cx="232.5" cy="68" r="2" fill="#333" />
                    {/* Connection lines */}
                    <path d="M180 90 Q195 90 210 85" stroke="#F7BB05" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
                    {/* Cloud */}
                    <ellipse cx="120" cy="30" rx="30" ry="14" fill="none" stroke="#111" strokeWidth="1.5" />
                    <path d="M100 30 Q100 20 110 18 Q115 10 125 12 Q135 8 140 18 Q150 20 150 30" fill="none" stroke="#111" strokeWidth="1.5" />
                    <path d="M120 44 L120 50" stroke="#F7BB05" strokeWidth="1.5" strokeDasharray="3 2" />
                    {/* Data dots */}
                    <circle cx="50" cy="80" r="3" fill="#F7BB05" opacity="0.5" />
                    <circle cx="45" cy="95" r="2" fill="#F7BB05" opacity="0.3" />
                    <circle cx="260" cy="155" r="3" fill="#F7BB05" opacity="0.5" />
                  </svg>

                  <p className="text-sm text-center max-w-[220px]" style={{ color: '#7F7F7F', fontFamily: 'Inter, sans-serif' }}>
                    Gestão inteligente para sua empresa
                  </p>
                </div>

                {/* Right Panel - Dark with form */}
                <div
                  className="flex-1 flex items-center justify-center p-6 sm:p-10"
                  style={{ backgroundColor: '#111111' }}
                >
                  <LoginForm onLoginSuccess={handleLoginSuccess} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BiometricTransition
        isActive={isTransitioning}
        onComplete={handleTransitionComplete}
      />
    </>
  );
};
