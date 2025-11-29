import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Estoque() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/estoque/produtos', { replace: true });
  }, [navigate]);

  return null;
}
