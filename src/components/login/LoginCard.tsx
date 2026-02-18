import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginForm } from './LoginForm';
import { BiometricTransition } from './BiometricTransition';
import loginBg from '@/assets/login_screen_v2_thiago_imports.png';
import { useIsMobile } from '@/hooks/use-mobile';

export const LoginCard = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [formVisible, setFormVisible] = useState(true);
  const [bgPulse, setBgPulse] = useState(false);
  const isMobile = useIsMobile();

  const handleLoginSuccess = () => {
    setBgPulse(true);
    setFormVisible(false);
    setTimeout(() => setIsTransitioning(true), 600);
  };

  return (
    <>
      {/* Full-screen background image — the image IS the card */}
      <motion.div
        className="h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{ backgroundImage: `url(${loginBg})` }}
        animate={bgPulse ? {
          filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1.1)'],
          scale: [1, 1.1, 1.1],
        } : {}}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
      >
        {/* Golden pulse overlay on success */}
        <AnimatePresence>
          {bgPulse && (
            <motion.div
              className="fixed inset-0 z-10 pointer-events-none"
              style={{ backgroundColor: 'rgba(247, 187, 5, 0.12)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0] }}
              transition={{ duration: 0.6 }}
            />
          )}
        </AnimatePresence>

        {/* Invisible overlay container — positioned over the dark right side of the image */}
        <AnimatePresence>
          {formVisible && (
            <motion.div
              className="relative z-20 flex items-center justify-center"
              style={{
                width: '420px',
                maxWidth: '90vw',
                marginLeft: isMobile ? '0' : '28%',
              }}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <LoginForm onLoginSuccess={handleLoginSuccess} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <BiometricTransition
        isActive={isTransitioning}
        onComplete={() => setIsTransitioning(false)}
      />
    </>
  );
};
