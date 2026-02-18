import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface BiometricTransitionProps {
  isActive: boolean;
  onComplete: () => void;
}

export const BiometricTransition = ({ isActive, onComplete }: BiometricTransitionProps) => {
  const navigate = useNavigate();
  const setAnimating = useAuthStore((state) => state.setAnimating);

  useEffect(() => {
    if (!isActive) return;

    setAnimating(false);
    navigate('/', { replace: true });
    onComplete();
  }, [isActive, navigate, onComplete, setAnimating]);

  return null;
};
