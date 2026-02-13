import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OSLayout } from '@/components/layout/OSLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getOrdensServico, getOrdemServicoById, updateOrdemServico, calcularSLADias, formatCurrency, OrdemServico } from '@/utils/assistenciaApi';
import { getClientes } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { Eye, Play, CheckCircle, Clock, Wrench, AlertTriangle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function OSOficina() {
  const navigate = useNavigate();
  const [ordensServico, setOrdensServico] = useState(getOrdensServico());
  const clientes = getClientes();
  const { obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  const user = useAuthStore((s) => s.user);

  // Modal de Finalização
  const [finalizarModal, setFinalizarModal] = useState(false);
  const [osParaFinalizar, setOsParaFinalizar] = useState<OrdemServico | null>(null);
  const [resumoConclusao, setResumoConclusao] = useState('');
  const [valorCusto, setValorCusto] = useState<number>(0);
  const [valorVenda, setValorVenda] = useState<number>(0);

  // Filtrar OSs onde proximaAtuacao contém "Técnico"
  const osTecnico = useMemo(() => {
    return ordensServico.filter(os => {
      const atuacao = os.proximaAtuacao || '';
      return atuacao === 'Técnico' || 
             atuacao === 'Técnico (Recebimento)' || 
             atuacao === 'Técnico: Avaliar/Executar';
    }).sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  }, [ordensServico]);

  // Stats
  const aguardandoCheckin = osTecnico.filter(os => os.status === 'Aguardando Análise' || os.status === 'Em Aberto').length;
  const emServico = osTecnico.filter(os => os.status === 'Em serviço').length;
  const aguardandoPeca = osTecnico.filter(os => 
    os.proximaAtuacao === 'Técnico (Recebimento)' || os.status === 'Peça Recebida'
  ).length;

  const recarregar = () => setOrdensServico(getOrdensServico());

  const handleAssumir = (os: OrdemServico) => {
    updateOrdemServico(os.id, {
      status: 'Em serviço',
      proximaAtuacao: 'Técnico',
      timeline: [...os.timeline, {
        data: new Date().toISOString(),
        tipo: 'status',
        descricao: 'OS assumida pelo técnico',
        responsavel: user?.colaborador?.nome || 'Técnico'
      }]
    });
    toast.success(`OS ${os.id} assumida com sucesso!`);
    recarregar();
  };

  const handleConfirmarRecebimento = (os: OrdemServico) => {
    updateOrdemServico(os.id, {
      status: 'Em serviço',
      proximaAtuacao: 'Técnico',
      timeline: [...os.timeline, {
        data: new Date().toISOString(),
        tipo: 'peca',
        descricao: 'Recebimento de peça confirmado pelo técnico',
        responsavel: user?.colaborador?.nome || 'Técnico'
      }]
    });
    toast.success(`Recebimento confirmado para OS ${os.id}!`);
    recarregar();
  };

  const handleAbrirFinalizar = (os: OrdemServico) => {
    setOsParaFinalizar(os);
    setResumoConclusao(os.resumoConclusao || '');
    setValorCusto(os.valorCustoTecnico || 0);
    setValorVenda(os.valorVendaTecnico || 0);
    setFinalizarModal(true);
  };

  const handleFinalizar = () => {
    if (!osParaFinalizar) return;
    if (!resumoConclusao.trim()) {
      toast.error('Preencha o Resumo da Conclusão para finalizar.');
      return;
    }
    if (!valorCusto || valorCusto <= 0) {
      toast.error('Informe o Valor de Custo (deve ser maior que 0).');
      return;
    }
    if (!valorVenda || valorVenda <= 0) {
      toast.error('Informe o Valor de Venda (deve ser maior que 0).');
      return;
    }

    updateOrdemServico(osParaFinalizar.id, {
      status: 'Finalizado',
      proximaAtuacao: 'Gestor/Vendedor',
      resumoConclusao,
      valorCustoTecnico: valorCusto,
      valorVendaTecnico: valorVenda,
      timeline: [...osParaFinalizar.timeline, {
        data: new Date().toISOString(),
        tipo: 'conclusao_servico',
        descricao: `OS finalizada pelo técnico. Custo: R$ ${valorCusto.toFixed(2)}, Venda: R$ ${valorVenda.toFixed(2)}. Resumo: ${resumoConclusao}`,
        responsavel: user?.colaborador?.nome || 'Técnico'
      }]
    });
    toast.success(`OS ${osParaFinalizar.id} finalizada com sucesso!`);
    setFinalizarModal(false);
    setOsParaFinalizar(null);
    recarregar();
  };

  const getStatusBadge = (os: OrdemServico) => {
    const status = os.status;
    if (status === 'Aguardando Análise' || status === 'Em Aberto') {
      return <Badge className="bg-slate-500 hover:bg-slate-600">Aguardando Check-in</Badge>;
    }
    if (status === 'Em serviço') {
      return <Badge className="bg-blue-500 hover:bg-blue-600">Em Serviço</Badge>;
    }
    if (os.proximaAtuacao === 'Técnico (Recebimento)' || status === 'Peça Recebida' || status === 'Pagamento Concluído') {
      return <Badge className="bg-emerald-500 hover:bg-emerald-600">Peça Recebida</Badge>;
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const getAcoes = (os: OrdemServico) => {
    const status = os.status;
    const atuacao = os.proximaAtuacao || '';

    // Aguardando check-in
    if (status === 'Aguardando Análise' || status === 'Em Aberto') {
      return (
        <Button size="sm" onClick={() => handleAssumir(os)} className="gap-1">
          <Play className="h-3.5 w-3.5" />
          Assumir
        </Button>
      );
    }

    // Peça recebida - confirmar recebimento
    if (atuacao === 'Técnico (Recebimento)') {
      return (
        <Button size="sm" variant="outline" onClick={() => handleConfirmarRecebimento(os)} className="gap-1">
          <Package className="h-3.5 w-3.5" />
          Confirmar Recebimento
        </Button>
      );
    }

    // Em serviço - pode finalizar
    if (status === 'Em serviço') {
      return (
        <Button size="sm" onClick={() => handleAbrirFinalizar(os)} className="gap-1 bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-3.5 w-3.5" />
          Finalizar
        </Button>
      );
    }

    return null;
  };

  return (
    <OSLayout title="Serviços">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-500/10">
                <Clock className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aguardando Check-in</p>
                <p className="text-2xl font-bold">{aguardandoCheckin}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Wrench className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Em Serviço</p>
                <p className="text-2xl font-bold text-blue-600">{emServico}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Package className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aguardando Peça</p>
                <p className="text-2xl font-bold text-emerald-600">{aguardandoPeca}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº OS</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {osTecnico.map(os => {
                  const cliente = clientes.find(c => c.id === os.clienteId);
                  const slaDias = calcularSLADias(os.dataHora);
                  return (
                    <TableRow key={os.id}>
                      <TableCell className="font-mono text-xs font-medium">{os.id}</TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(os.dataHora), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{cliente?.nome || '-'}</TableCell>
                      <TableCell className="text-sm">{os.modeloAparelho || '-'}</TableCell>
                      <TableCell className="text-xs">{obterNomeLoja(os.lojaId)}</TableCell>
                      <TableCell>{getStatusBadge(os)}</TableCell>
                      <TableCell>
                        <span className={cn(
                          'px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1',
                          slaDias >= 5 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                          slaDias >= 3 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : ''
                        )}>
                          {slaDias >= 5 && <AlertTriangle className="h-3 w-3" />}
                          {slaDias} dias
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/os/assistencia/${os.id}`)}
                            title="Ver Detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {getAcoes(os)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {osTecnico.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma OS aguardando ação do técnico
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Finalizar */}
      <Dialog open={finalizarModal} onOpenChange={setFinalizarModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Finalizar OS {osParaFinalizar?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Resumo da Conclusão *</Label>
              <Textarea
                value={resumoConclusao}
                onChange={(e) => setResumoConclusao(e.target.value)}
                placeholder="Descreva o serviço realizado, peças utilizadas e resultado..."
                rows={4}
                className={cn(!resumoConclusao && 'border-destructive')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor de Custo (R$) *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={valorCusto || ''}
                  onChange={(e) => setValorCusto(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className={cn(!valorCusto && 'border-destructive')}
                />
                <p className="text-xs text-muted-foreground">Custo de peças/insumos</p>
              </div>
              <div className="space-y-2">
                <Label>Valor de Venda (R$) *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={valorVenda || ''}
                  onChange={(e) => setValorVenda(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className={cn(!valorVenda && 'border-destructive')}
                />
                <p className="text-xs text-muted-foreground">Valor cobrado do cliente</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizarModal(false)}>Cancelar</Button>
            <Button onClick={handleFinalizar} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Finalizar OS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OSLayout>
  );
}
