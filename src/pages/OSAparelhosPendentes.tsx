import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OSLayout } from '@/components/layout/OSLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getOrdensServico, getOrdemServicoById, updateOrdemServico, formatCurrency, OrdemServico } from '@/utils/assistenciaApi';
import { getProdutoByIMEI, atualizarCustoAssistencia, updateProduto } from '@/utils/estoqueApi';
import { getClientes } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { formatIMEI } from '@/utils/imeiMask';
import { Eye, CheckCircle, XCircle, Package, RotateCcw, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function OSAparelhosPendentes() {
  const navigate = useNavigate();
  const [ordensServico, setOrdensServico] = useState(getOrdensServico());
  const clientes = getClientes();
  const { obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  const user = useAuthStore((s) => s.user);

  // Modais
  const [aprovarModal, setAprovarModal] = useState(false);
  const [recusarModal, setRecusarModal] = useState(false);
  const [osSelecionada, setOsSelecionada] = useState<OrdemServico | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');

  // Filtrar OSs pendentes de validação do estoque
  const osPendentes = useMemo(() => {
    return ordensServico
      .filter(os => os.status === 'Serviço Concluído - Validar Aparelho')
      .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  }, [ordensServico]);

  const recarregar = () => setOrdensServico(getOrdensServico());

  const handleAbrirAprovar = (os: OrdemServico) => {
    setOsSelecionada(os);
    setAprovarModal(true);
  };

  const handleAbrirRecusar = (os: OrdemServico) => {
    setOsSelecionada(os);
    setMotivoRecusa('');
    setRecusarModal(true);
  };

  const handleAprovar = () => {
    if (!osSelecionada) return;
    const osFresh = getOrdemServicoById(osSelecionada.id);
    if (!osFresh) return;

    const nomeResponsavel = user?.colaborador?.nome || 'Gestor (Estoque)';
    const custoReparo = osFresh.valorCustoTecnico || 0;

    // Atualizar custo no produto do estoque (atômico)
    if (osFresh.imeiAparelho) {
      const produto = getProdutoByIMEI(osFresh.imeiAparelho);
      if (produto) {
        atualizarCustoAssistencia(produto.id, osFresh.id, custoReparo);
        // Marcar como disponível
        updateProduto(produto.id, {
          statusEmprestimo: null,
          emprestimoOsId: undefined,
        });
      }
    }

    // Atualizar OS
    updateOrdemServico(osSelecionada.id, {
      status: 'Liquidado' as any,
      proximaAtuacao: '-',
      timeline: [...osFresh.timeline, {
        data: new Date().toISOString(),
        tipo: 'validacao_financeiro',
        descricao: `Aparelho aprovado pelo Gestor de Estoque. Custo de reparo: R$ ${custoReparo.toFixed(2)} incorporado ao custo do aparelho.`,
        responsavel: nomeResponsavel
      }]
    });

    toast.success(`Aparelho aprovado! Custo de R$ ${custoReparo.toFixed(2)} incorporado ao cadastro.`);
    setAprovarModal(false);
    setOsSelecionada(null);
    recarregar();
  };

  const handleRecusar = () => {
    if (!osSelecionada) return;
    if (!motivoRecusa.trim()) {
      toast.error('Informe o motivo da recusa.');
      return;
    }
    const osFresh = getOrdemServicoById(osSelecionada.id);
    if (!osFresh) return;

    const nomeResponsavel = user?.colaborador?.nome || 'Gestor (Estoque)';

    updateOrdemServico(osSelecionada.id, {
      status: 'Retrabalho - Recusado pelo Estoque' as any,
      proximaAtuacao: 'Técnico',
      timeline: [...osFresh.timeline, {
        data: new Date().toISOString(),
        tipo: 'status',
        descricao: `🔄 Retrabalho solicitado por ${nomeResponsavel} - Motivo: ${motivoRecusa}`,
        responsavel: nomeResponsavel,
        motivo: motivoRecusa
      }]
    });

    toast.success(`OS ${osSelecionada.id} devolvida para retrabalho.`);
    setRecusarModal(false);
    setOsSelecionada(null);
    setMotivoRecusa('');
    recarregar();
  };

  // Calcular custo composto
  const getCustoComposto = (os: OrdemServico) => {
    if (!os.imeiAparelho) return { custoOriginal: 0, custoReparo: 0, custoTotal: 0 };
    const produto = getProdutoByIMEI(os.imeiAparelho);
    const custoOriginal = produto?.valorCusto || 0;
    const custoAssistenciaAnterior = produto?.custoAssistencia || 0;
    const custoReparo = os.valorCustoTecnico || 0;
    return {
      custoOriginal,
      custoReparo,
      custoAssistenciaAnterior,
      custoTotal: custoOriginal + custoAssistenciaAnterior + custoReparo
    };
  };

  return (
    <OSLayout title="Aparelhos Pendentes">
      {/* Card de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Package className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aguardando Validação</p>
                <p className="text-2xl font-bold text-orange-600">{osPendentes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Total Pendente</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(osPendentes.reduce((acc, os) => acc + (os.valorCustoTecnico || 0), 0))}
                </p>
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
                  <TableHead>Modelo</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Custo Reparo</TableHead>
                  <TableHead>Resumo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {osPendentes.map(os => (
                  <TableRow key={os.id} className="bg-orange-500/5">
                    <TableCell className="font-mono text-xs font-medium">{os.id}</TableCell>
                    <TableCell className="text-xs">
                      {format(new Date(os.dataHora), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="font-medium">{os.modeloAparelho || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{formatIMEI(os.imeiAparelho || '')}</TableCell>
                    <TableCell className="text-sm">{obterNomeColaborador(os.tecnicoId)}</TableCell>
                    <TableCell className="font-medium text-orange-600">
                      {formatCurrency(os.valorCustoTecnico || 0)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {os.resumoConclusao || '-'}
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
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 gap-1"
                          onClick={() => handleAbrirAprovar(os)}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          onClick={() => handleAbrirRecusar(os)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Recusar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {osPendentes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum aparelho pendente de validação
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Aprovar */}
      <Dialog open={aprovarModal} onOpenChange={setAprovarModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Aprovar Retorno - {osSelecionada?.id}
            </DialogTitle>
          </DialogHeader>
          {osSelecionada && (() => {
            const custo = getCustoComposto(osSelecionada);
            return (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/50">
                  <div>
                    <Label className="text-xs text-muted-foreground">Modelo</Label>
                    <p className="font-medium text-sm">{osSelecionada.modeloAparelho || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">IMEI</Label>
                    <p className="font-medium text-sm font-mono">{formatIMEI(osSelecionada.imeiAparelho || '')}</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg border space-y-2">
                  <p className="font-semibold text-sm">Cálculo do Custo Composto</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Custo de Aquisição</span>
                    <span className="font-medium">{formatCurrency(custo.custoOriginal)}</span>
                  </div>
                  {(custo as any).custoAssistenciaAnterior > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Reparos Anteriores</span>
                      <span className="font-medium text-orange-600">{formatCurrency((custo as any).custoAssistenciaAnterior)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Reparo Atual ({osSelecionada.id})</span>
                    <span className="font-medium text-orange-600">{formatCurrency(custo.custoReparo)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-sm font-bold">
                    <span>Custo Total do Aparelho</span>
                    <span className="text-primary">{formatCurrency(custo.custoTotal)}</span>
                  </div>
                </div>
                {osSelecionada.resumoConclusao && (
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Resumo do Técnico</p>
                    <p className="text-sm text-green-800 dark:text-green-200">{osSelecionada.resumoConclusao}</p>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAprovarModal(false)}>Cancelar</Button>
            <Button onClick={handleAprovar} className="bg-green-600 hover:bg-green-700 gap-1">
              <CheckCircle className="h-4 w-4" />
              Confirmar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Recusar */}
      <Dialog open={recusarModal} onOpenChange={setRecusarModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-destructive" />
              Solicitar Retrabalho - {osSelecionada?.id}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/50">
              <div>
                <Label className="text-xs text-muted-foreground">Modelo</Label>
                <p className="font-medium text-sm">{osSelecionada?.modeloAparelho || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">IMEI</Label>
                <p className="font-medium text-sm font-mono">{formatIMEI(osSelecionada?.imeiAparelho || '')}</p>
              </div>
            </div>
            {osSelecionada?.resumoConclusao && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Resumo do Técnico</p>
                <p className="text-sm">{osSelecionada.resumoConclusao}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Motivo da Recusa *</Label>
              <Textarea
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                placeholder="Descreva o motivo pelo qual o serviço não está satisfatório..."
                rows={4}
                className={cn(!motivoRecusa && 'border-destructive')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecusarModal(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRecusar} className="gap-1">
              <RotateCcw className="h-4 w-4" />
              Devolver para Retrabalho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OSLayout>
  );
}
