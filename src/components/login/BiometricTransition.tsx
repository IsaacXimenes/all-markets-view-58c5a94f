import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useIsMobile } from '@/hooks/use-mobile';

interface BiometricTransitionProps {
  isActive: boolean;
  onComplete: () => void;
}

export const BiometricTransition = ({ isActive, onComplete }: BiometricTransitionProps) => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const setAnimating = useAuthStore((state) => state.setAnimating);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isActive) return;

    setVisible(true);

    const timer = setTimeout(() => {
      setAnimating(false);
      navigate('/', { replace: true });
      onComplete();
    }, isMobile ? 400 : 1000);

    return () => clearTimeout(timer);
  }, [isActive, navigate, onComplete, setAnimating, isMobile]);

  return (
    <AnimatePresence>
      {visible && isActive && (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ backdropFilter: 'blur(20px)', opacity: 1 }}
          animate={{ backdropFilter: 'blur(0px)', opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: isMobile ? 0.4 : 1.0, ease: 'easeOut' }}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
        />
      )}
    </AnimatePresence>
  );
};
