import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoginForm } from './LoginForm';
import { BiometricTransition } from './BiometricTransition';
import loginBg from '@/assets/login_screen_v2_thiago_imports.png';
import { useIsMobile } from '@/hooks/use-mobile';

export const LoginCard = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [formVisible, setFormVisible] = useState(true);
  const [bgFading, setBgFading] = useState(false);
  const isMobile = useIsMobile();

  const handleLoginSuccess = () => {
    // Step 1: fade out form
    setFormVisible(false);
    setTimeout(() => setBgFading(true), 700);
    setTimeout(() => setIsTransitioning(true), 1600);
  };

  return (
    <>
      <motion.div
        className="h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{ backgroundImage: `url(${loginBg})` }}
        animate={bgFading ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
      >
        <AnimatePresence>
          {formVisible && (
            <motion.div
              className="relative z-20 flex items-center justify-center"
              style={{
                width: '420px',
                maxWidth: '90vw',
                marginLeft: isMobile ? '0' : '26%',
              }}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
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
