import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { getNotaEntradaById, NotaEntrada } from '@/utils/notaEntradaFluxoApi';
import { NotaDetalhesContent } from '@/components/estoque/NotaDetalhesContent';

export default function EstoqueNotaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [nota, setNota] = useState<NotaEntrada | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    const notaEncontrada = getNotaEntradaById(id);
    setNota(notaEncontrada);
    setIsLoading(false);
  }, [id]);

  if (isLoading) {
    return (
      <EstoqueLayout title="Carregando...">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando detalhes da nota...</p>
        </div>
      </EstoqueLayout>
    );
  }

  if (!nota) {
    return (
      <EstoqueLayout title="Nota não encontrada">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Nota não encontrada (ID: {id})</p>
          <Button onClick={() => navigate('/estoque/notas-pendencias')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Notas
          </Button>
        </div>
      </EstoqueLayout>
    );
  }

  return (
    <EstoqueLayout title={`Detalhes da Nota ${nota.numeroNota}`}>
      <div className="space-y-6">
        <div className="flex justify-start">
          <Button variant="ghost" onClick={() => navigate('/estoque/notas-pendencias')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Notas Pendências
          </Button>
        </div>

        <NotaDetalhesContent nota={nota} showActions={true} />
      </div>
    </EstoqueLayout>
  );
}
