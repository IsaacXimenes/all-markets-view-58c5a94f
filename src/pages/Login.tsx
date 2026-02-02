import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { LoginCard } from '@/components/login/LoginCard';

const Login = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAnimating = useAuthStore((state) => state.isAnimating);

  // Redirecionar se já estiver autenticado e não estiver animando
  useEffect(() => {
    if (isAuthenticated && !isAnimating) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isAnimating, navigate]);

  return <LoginCard />;
};

export default Login;
