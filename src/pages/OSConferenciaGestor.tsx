import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OSLayout } from '@/components/layout/OSLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getOrdensServico, getOrdemServicoById, updateOrdemServico, formatCurrency, OrdemServico } from '@/utils/assistenciaApi';
import { getClientes } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { Eye, Check, XCircle, Clock, DollarSign, AlertTriangle, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function OSConferenciaGestor() {
  const navigate = useNavigate();
  const [ordensServico, setOrdensServico] = useState(getOrdensServico());
  const clientes = getClientes();
  const { obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  const user = useAuthStore((s) => s.user);

  // Painel lateral
  const [osSelecionada, setOsSelecionada] = useState<OrdemServico | null>(null);

  // Modal recusa
  const [modalRecusar, setModalRecusar] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState('');

  const recarregar = () => setOrdensServico(getOrdensServico());

  // Filtrar OSs para conferência
  const osConferencia = useMemo(() => {
    return ordensServico.filter(os => {
      return (os.status === 'Pendente de Pagamento' && os.proximaAtuacao === 'Gestor (Conferência)') ||
             (os.status === 'Aguardando Conferência' && os.proximaAtuacao === 'Financeiro: Conferir Lançamento') ||
             (os.status === 'Aguardando Financeiro' && os.proximaAtuacao === 'Financeiro') ||
             os.status === 'Liquidado';
    }).sort((a, b) => {
      // Pendentes primeiro
      const ordem: Record<string, number> = {
        'Pendente de Pagamento': 0,
        'Aguardando Conferência': 0,
        'Aguardando Financeiro': 1,
        'Liquidado': 2,
      };
      const oA = ordem[a.status] ?? 3;
      const oB = ordem[b.status] ?? 3;
      if (oA !== oB) return oA - oB;
      return new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime();
    });
  }, [ordensServico]);

  // Stats
  const pendentes = osConferencia.filter(os => os.status === 'Pendente de Pagamento' || os.status === 'Aguardando Conferência').length;
  const aguardandoFinanceiro = osConferencia.filter(os => os.status === 'Aguardando Financeiro').length;
  const liquidadas = osConferencia.filter(os => os.status === 'Liquidado').length;

  const handleAprovar = () => {
    if (!osSelecionada) return;
    updateOrdemServico(osSelecionada.id, {
      status: 'Aguardando Financeiro',
      proximaAtuacao: 'Financeiro',
      timeline: [...osSelecionada.timeline, {
        data: new Date().toISOString(),
        tipo: 'aprovacao',
        descricao: 'Conferência aprovada pelo gestor. Enviada para o financeiro.',
        responsavel: user?.colaborador?.nome || 'Gestor'
      }]
    });
    toast.success(`OS ${osSelecionada.id} aprovada! Enviada para o financeiro.`);
    setOsSelecionada(null);
    recarregar();
  };

  const handleRecusar = () => {
    if (!osSelecionada || !motivoRecusa.trim()) {
      toast.error('Informe o motivo da recusa.');
      return;
    }
    updateOrdemServico(osSelecionada.id, {
      status: 'Finalizado',
      proximaAtuacao: 'Gestor/Vendedor',
      timeline: [...osSelecionada.timeline, {
        data: new Date().toISOString(),
        tipo: 'rejeicao',
        descricao: `Conferência recusada pelo gestor. Motivo: ${motivoRecusa}`,
        responsavel: user?.colaborador?.nome || 'Gestor'
      }]
    });
    toast.success(`OS ${osSelecionada.id} recusada. Devolvida para o vendedor.`);
    setModalRecusar(false);
    setMotivoRecusa('');
    setOsSelecionada(null);
    recarregar();
  };

  const handleValidarFinanceiro = (os: OrdemServico) => {
    updateOrdemServico(os.id, {
      status: 'Liquidado',
      proximaAtuacao: '-',
      timeline: [...os.timeline, {
        data: new Date().toISOString(),
        tipo: 'validacao_financeiro',
        descricao: 'Lançamento validado pelo financeiro. OS liquidada.',
        responsavel: user?.colaborador?.nome || 'Financeiro'
      }]
    });
    toast.success(`OS ${os.id} liquidada com sucesso!`);
    if (osSelecionada?.id === os.id) setOsSelecionada(null);
    recarregar();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendente de Pagamento':
      case 'Aguardando Conferência':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Pendente Conferência</Badge>;
      case 'Aguardando Financeiro':
        return <Badge className="bg-purple-500 hover:bg-purple-600">Aguardando Financeiro</Badge>;
      case 'Liquidado':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">Liquidado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const podeAprovar = (os: OrdemServico) => {
    return (os.status === 'Pendente de Pagamento' && os.proximaAtuacao === 'Gestor (Conferência)') ||
           (os.status === 'Aguardando Conferência');
  };

  return (
    <OSLayout title="Conferência Gestor - Assistência">
      <div className="flex flex-col xl:flex-row gap-4 xl:gap-6">
        {/* Painel Principal */}
        <div className={`transition-all ${osSelecionada ? 'w-full xl:flex-1 xl:mr-[480px]' : 'w-full'}`}>
          {/* Cards de resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-orange-200 dark:border-orange-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Clock className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pendentes</p>
                    <p className="text-2xl font-bold text-orange-600">{pendentes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <DollarSign className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Aguardando Financeiro</p>
                    <p className="text-2xl font-bold text-purple-600">{aguardandoFinanceiro}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Check className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Liquidadas</p>
                    <p className="text-2xl font-bold text-emerald-600">{liquidadas}</p>
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
                      <TableHead>Loja</TableHead>
                      <TableHead>V. Custo</TableHead>
                      <TableHead>V. Venda</TableHead>
                      <TableHead>Pago</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {osConferencia.map(os => {
                      const cliente = clientes.find(c => c.id === os.clienteId);
                      const totalPago = os.pagamentos.reduce((acc, p) => acc + p.valor, 0);
                      return (
                        <TableRow 
                          key={os.id} 
                          className={cn(
                            'cursor-pointer',
                            osSelecionada?.id === os.id && 'bg-accent',
                            (os.status === 'Pendente de Pagamento' || os.status === 'Aguardando Conferência') && 'bg-orange-500/5',
                            os.status === 'Liquidado' && 'bg-emerald-500/5'
                          )}
                          onClick={() => {
                            const fresh = getOrdemServicoById(os.id);
                            setOsSelecionada(fresh || os);
                          }}
                        >
                          <TableCell className="font-mono text-xs font-medium">{os.id}</TableCell>
                          <TableCell className="text-xs">
                            {format(new Date(os.dataHora), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>{cliente?.nome || '-'}</TableCell>
                          <TableCell className="text-xs">{obterNomeLoja(os.lojaId)}</TableCell>
                          <TableCell className="text-sm">{formatCurrency(os.valorCustoTecnico || 0)}</TableCell>
                          <TableCell className="text-sm font-medium">{formatCurrency(os.valorVendaTecnico || 0)}</TableCell>
                          <TableCell className="text-sm font-medium">{formatCurrency(totalPago)}</TableCell>
                          <TableCell>{getStatusBadge(os.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="sm" onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/os/assistencia/${os.id}`);
                              }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {os.status === 'Aguardando Financeiro' && (
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={(e) => {
                                  e.stopPropagation();
                                  handleValidarFinanceiro(os);
                                }}>
                                  <Check className="h-3.5 w-3.5 mr-1" />
                                  Liquidar
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {osConferencia.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Nenhuma OS para conferência
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Drawer lateral */}
        {osSelecionada && (
          <div className="fixed right-0 top-0 h-screen w-[480px] bg-background border-l shadow-lg z-50 overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">OS {osSelecionada.id}</h3>
                <Button variant="ghost" size="sm" onClick={() => setOsSelecionada(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {getStatusBadge(osSelecionada.status)}

              <Separator />

              {/* Informações básicas */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium">{clientes.find(c => c.id === osSelecionada.clienteId)?.nome || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loja:</span>
                  <span className="font-medium">{obterNomeLoja(osSelecionada.lojaId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Técnico:</span>
                  <span className="font-medium">{obterNomeColaborador(osSelecionada.tecnicoId)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modelo:</span>
                  <span className="font-medium">{osSelecionada.modeloAparelho || '-'}</span>
                </div>
              </div>

              <Separator />

              {/* Resumo da conclusão */}
              {osSelecionada.resumoConclusao && (
                <>
                  <div>
                    <p className="text-sm font-medium mb-1">Resumo da Conclusão</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{osSelecionada.resumoConclusao}</p>
                  </div>
                  <Separator />
                </>
              )}

              {/* Valores */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Valor Custo</p>
                    <p className="text-lg font-bold">{formatCurrency(osSelecionada.valorCustoTecnico || 0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Valor Venda</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(osSelecionada.valorVendaTecnico || 0)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Pagamentos registrados */}
              <div>
                <p className="text-sm font-medium mb-2">Pagamentos Registrados</p>
                {osSelecionada.pagamentos.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Meio</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {osSelecionada.pagamentos.map((pag, i) => (
                        <TableRow key={i}>
                          <TableCell>{pag.meio}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(pag.valor)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell className="font-bold">Total</TableCell>
                        <TableCell className="font-bold">{formatCurrency(osSelecionada.pagamentos.reduce((a, p) => a + p.valor, 0))}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
                )}
              </div>

              {/* Botões de ação */}
              {podeAprovar(osSelecionada) && (
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => {
                      setMotivoRecusa('');
                      setModalRecusar(true);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Recusar
                  </Button>
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handleAprovar}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aprovar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal recusa */}
      <Dialog open={modalRecusar} onOpenChange={setModalRecusar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Conferência - {osSelecionada?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo da Recusa *</Label>
              <Textarea
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                placeholder="Descreva o motivo da recusa..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalRecusar(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRecusar}>
              <XCircle className="h-4 w-4 mr-2" />
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OSLayout>
  );
}
