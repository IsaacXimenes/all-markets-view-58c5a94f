import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Cadastros() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/cadastros/lojas', { replace: true });
  }, [navigate]);

  return null;
}
