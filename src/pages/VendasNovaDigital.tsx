import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendasLayout } from '@/components/layout/VendasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Send, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { 
  criarPreCadastro, 
  formatCurrency 
} from '@/utils/vendasDigitalApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';

export default function VendasNovaDigital() {
  const navigate = useNavigate();
  const { obterVendedores } = useCadastroStore();
  const colaboradoresDigital = obterVendedores();
  const user = useAuthStore(state => state.user);
  
  const [responsavelId, setResponsavelId] = useState(user?.colaborador?.id || '');
  const [clienteNome, setClienteNome] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);

  const year = new Date().getFullYear();
  const nextId = `VEN-DIG-${year}-XXXX`;
  const dataHora = new Date().toLocaleString('pt-BR');

  const formatarValor = (valor: string) => {
    const numeros = valor.replace(/\D/g, '');
    const valorNumerico = parseInt(numeros) / 100;
    if (isNaN(valorNumerico)) return '';
    return valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarValor(e.target.value);
    setValorTotal(formatted);
  };

  const getValorNumerico = () => {
    const numeros = valorTotal.replace(/\D/g, '');
    return parseInt(numeros) / 100 || 0;
  };

  const handleSubmit = () => {
    if (!responsavelId || !clienteNome || !valorTotal) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    
    const colaborador = colaboradoresDigital.find(c => c.id === responsavelId);
    if (!colaborador) {
      toast.error('Colaborador não encontrado');
      setLoading(false);
      return;
    }

    const novaVenda = criarPreCadastro(
      responsavelId,
      colaborador.nome,
      clienteNome,
      getValorNumerico()
    );

    toast.success('Pré-cadastro enviado para finalização', {
      description: `ID: ${novaVenda.id}`
    });

    setLoading(false);
    navigate('/vendas/pendentes-digitais');
  };

  return (
    <VendasLayout title="Nova Venda - Digital">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Smartphone className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl">Pré-Cadastro Rápido</CardTitle>
            </div>
            <Badge variant="outline" className="w-fit mx-auto">
              Venda Digital
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* ID e Data automáticos */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">ID Venda</Label>
                <p className="font-mono font-medium">{nextId}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data/Hora</Label>
                <p className="font-medium">{dataHora}</p>
              </div>
            </div>

            {/* Responsável pela Venda (auto-preenchido) */}
            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável pela Venda *</Label>
              <Input
                value={user?.colaborador?.nome || 'Não identificado'}
                disabled
                className="bg-muted"
              />
            </div>

            {/* Nome do Cliente */}
            <div className="space-y-2">
              <Label htmlFor="cliente">Nome do Cliente *</Label>
              <Input
                id="cliente"
                placeholder="Digite o nome do cliente"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Dados completos serão preenchidos na finalização
              </p>
            </div>

            {/* Valor Total */}
            <div className="space-y-2">
              <Label htmlFor="valor">Valor Total *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="valor"
                  className="pl-10 text-lg font-semibold"
                  placeholder="0,00"
                  value={valorTotal}
                  onChange={handleValorChange}
                />
              </div>
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label htmlFor="observacao">Observação</Label>
              <textarea
                id="observacao"
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                placeholder="Observações adicionais (opcional)"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>

            {/* Resumo */}
            {valorTotal && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">Valor da Venda</p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(getValorNumerico())}
                </p>
              </div>
            )}

            {/* Botão Enviar */}
            <Button 
              size="lg" 
              className="w-full h-14 text-lg"
              onClick={handleSubmit}
              disabled={loading || !responsavelId || !clienteNome || !valorTotal}
            >
              <Send className="h-5 w-5 mr-2" />
              Enviar para Finalização
            </Button>
          </CardContent>
        </Card>
      </div>
    </VendasLayout>
  );
}
