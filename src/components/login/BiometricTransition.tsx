import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

interface BiometricTransitionProps {
  isActive: boolean;
  onComplete: () => void;
}

export const BiometricTransition = ({ isActive, onComplete }: BiometricTransitionProps) => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const setAnimating = useAuthStore((state) => state.setAnimating);

  useEffect(() => {
    if (!isActive) {
      setVisible(false);
      return;
    }

    // Fade in do overlay branco
    setVisible(true);

    const timer = setTimeout(() => {
      setAnimating(false);
      navigate('/', { replace: true });
      onComplete();
    }, 600);

    return () => clearTimeout(timer);
  }, [isActive, navigate, onComplete, setAnimating]);

  if (!isActive && !visible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-white transition-opacity duration-500 ease-out',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    />
  );
};
