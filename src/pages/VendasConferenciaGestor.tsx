import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendasLayout } from '@/components/layout/VendasLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Eye, Download, Filter, X, Pencil, Check, XCircle, AlertTriangle, Clock, Undo2 } from 'lucide-react';
import { useFluxoVendas } from '@/hooks/useFluxoVendas';
import { 
  aprovarGestor, 
  recusarGestor,
  getCorBadgeStatus,
  exportFluxoToCSV,
  VendaComFluxo,
  StatusVenda
} from '@/utils/fluxoVendasApi';
import { formatCurrency } from '@/utils/formatUtils';
import { getLojas, getColaboradores } from '@/utils/cadastrosApi';
import { toast } from 'sonner';

// Mock do usuário logado (gestor)
const usuarioLogado = { id: 'COL-001', nome: 'João Gestor' };

export default function VendasConferenciaGestor() {
  const navigate = useNavigate();
  const { vendas, recarregar } = useFluxoVendas({
    status: ['Conferência Gestor', 'Devolvido pelo Financeiro', 'Conferência Financeiro', 'Finalizado']
  });
  
  const lojas = getLojas();
  const colaboradores = getColaboradores();
  
  // Filtros
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroLoja, setFiltroLoja] = useState('todas');
  const [filtroResponsavel, setFiltroResponsavel] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  
  // Modais
  const [modalAprovar, setModalAprovar] = useState(false);
  const [modalRecusar, setModalRecusar] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaComFluxo | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');

  // Filtrar vendas
  const vendasFiltradas = useMemo(() => {
    let resultado = [...vendas];

    if (filtroDataInicio) {
      resultado = resultado.filter(v => 
        new Date(v.dataHora) >= new Date(filtroDataInicio)
      );
    }
    if (filtroDataFim) {
      const dataFim = new Date(filtroDataFim);
      dataFim.setHours(23, 59, 59);
      resultado = resultado.filter(v => 
        new Date(v.dataHora) <= dataFim
      );
    }
    if (filtroLoja !== 'todas') {
      resultado = resultado.filter(v => v.lojaVenda === filtroLoja);
    }
    if (filtroResponsavel !== 'todos') {
      resultado = resultado.filter(v => v.vendedor === filtroResponsavel);
    }
    if (filtroStatus !== 'todos') {
      resultado = resultado.filter(v => v.statusFluxo === filtroStatus);
    }

    // Ordenação: Pendentes primeiro
    resultado.sort((a, b) => {
      const ordem: Record<string, number> = {
        'Conferência Gestor': 0,
        'Devolvido pelo Financeiro': 1,
        'Conferência Financeiro': 2,
        'Finalizado': 3
      };
      const ordemA = ordem[a.statusFluxo || ''] ?? 4;
      const ordemB = ordem[b.statusFluxo || ''] ?? 4;
      if (ordemA !== ordemB) return ordemA - ordemB;
      return new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime();
    });

    return resultado;
  }, [vendas, filtroDataInicio, filtroDataFim, filtroLoja, filtroResponsavel, filtroStatus]);

  // Contadores
  const conferenciaGestorCount = vendas.filter(v => v.statusFluxo === 'Conferência Gestor').length;
  const devolvidoFinanceiroCount = vendas.filter(v => v.statusFluxo === 'Devolvido pelo Financeiro').length;
  const conferenciaFinanceiroCount = vendas.filter(v => v.statusFluxo === 'Conferência Financeiro').length;
  const finalizadoCount = vendas.filter(v => v.statusFluxo === 'Finalizado').length;

  const limparFiltros = () => {
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setFiltroLoja('todas');
    setFiltroResponsavel('todos');
    setFiltroStatus('todos');
  };

  const handleExportar = () => {
    const dataAtual = new Date().toISOString().split('T')[0];
    exportFluxoToCSV(vendasFiltradas, `conferencia-gestor-${dataAtual}.csv`);
    toast.success('Dados exportados com sucesso!');
  };

  const handleAbrirModalAprovar = (venda: VendaComFluxo) => {
    setVendaSelecionada(venda);
    setModalAprovar(true);
  };

  const handleAbrirModalRecusar = (venda: VendaComFluxo) => {
    setVendaSelecionada(venda);
    setMotivoRecusa('');
    setModalRecusar(true);
  };

  const handleAprovarGestor = () => {
    if (!vendaSelecionada) return;

    const resultado = aprovarGestor(
      vendaSelecionada.id,
      usuarioLogado.id,
      usuarioLogado.nome
    );

    if (resultado) {
      toast.success(`Venda ${vendaSelecionada.id} aprovada! Enviada para Conferência Financeira.`);
      setModalAprovar(false);
      setVendaSelecionada(null);
      recarregar();
    } else {
      toast.error('Erro ao aprovar venda. Verifique o status.');
    }
  };

  const handleRecusarGestor = () => {
    if (!vendaSelecionada || !motivoRecusa.trim()) {
      toast.error('Por favor, informe o motivo da recusa.');
      return;
    }

    const resultado = recusarGestor(
      vendaSelecionada.id,
      usuarioLogado.id,
      usuarioLogado.nome,
      motivoRecusa.trim()
    );

    if (resultado) {
      toast.success(`Venda ${vendaSelecionada.id} recusada. Devolvida para lançamento.`);
      setModalRecusar(false);
      setVendaSelecionada(null);
      setMotivoRecusa('');
      recarregar();
    } else {
      toast.error('Erro ao recusar venda. Verifique o status.');
    }
  };

  const getStatusBadge = (status: StatusVenda) => {
    const cores = getCorBadgeStatus(status);
    return (
      <Badge 
        variant="outline" 
        className={`${cores.bg} ${cores.text} ${cores.border} whitespace-nowrap dark:bg-opacity-20`}
      >
        {status}
      </Badge>
    );
  };

  const getRowClassName = (status: StatusVenda) => {
    switch (status) {
      case 'Conferência Gestor':
        return 'bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/50';
      case 'Devolvido pelo Financeiro':
        return 'bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-950/50';
      case 'Conferência Financeiro':
        return 'bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/50';
      case 'Finalizado':
        return 'bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50';
      default:
        return '';
    }
  };

  const getLojaNome = (lojaId: string) => {
    return lojas.find(l => l.id === lojaId)?.nome || lojaId;
  };

  const getVendedorNome = (vendedorId: string) => {
    return colaboradores.find(c => c.id === vendedorId)?.nome || vendedorId;
  };

  const podeAprovarOuRecusar = (status: StatusVenda) => {
    return status === 'Conferência Gestor' || status === 'Devolvido pelo Financeiro';
  };

  return (
    <VendasLayout title="Conferência de Vendas - Gestor">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-orange-500 opacity-70" />
              <div>
                <p className="text-sm text-muted-foreground">Conferência Gestor</p>
                <p className="text-3xl font-bold text-orange-600">{conferenciaGestorCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Undo2 className="h-8 w-8 text-purple-500 opacity-70" />
              <div>
                <p className="text-sm text-muted-foreground">Devolvido Financeiro</p>
                <p className="text-3xl font-bold text-purple-600">{devolvidoFinanceiroCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Conferência Financeiro</p>
              <p className="text-3xl font-bold text-yellow-600">{conferenciaFinanceiroCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Finalizado</p>
              <p className="text-3xl font-bold text-green-600">{finalizadoCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Data Início</label>
              <Input 
                type="date" 
                value={filtroDataInicio} 
                onChange={e => setFiltroDataInicio(e.target.value)} 
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Data Fim</label>
              <Input 
                type="date" 
                value={filtroDataFim} 
                onChange={e => setFiltroDataFim(e.target.value)} 
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Loja</label>
              <Select value={filtroLoja} onValueChange={setFiltroLoja}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as lojas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as lojas</SelectItem>
                  {lojas.map(loja => (
                    <SelectItem key={loja.id} value={loja.id}>{loja.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Responsável pela Venda</label>
              <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {colaboradores.map(col => (
                    <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Status</label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Conferência Gestor">Conferência Gestor</SelectItem>
                  <SelectItem value="Devolvido pelo Financeiro">Devolvido pelo Financeiro</SelectItem>
                  <SelectItem value="Conferência Financeiro">Conferência Financeiro</SelectItem>
                  <SelectItem value="Finalizado">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={limparFiltros} className="flex-1">
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
              <Button onClick={handleExportar} variant="secondary">
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Venda</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma venda encontrada com os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  vendasFiltradas.map(venda => (
                    <TableRow 
                      key={venda.id}
                      className={getRowClassName(venda.statusFluxo as StatusVenda)}
                    >
                      <TableCell className="font-medium">{venda.id}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(venda.dataHora).toLocaleDateString('pt-BR')}
                        <span className="text-muted-foreground ml-1">
                          {new Date(venda.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {getLojaNome(venda.lojaVenda)}
                      </TableCell>
                      <TableCell>{getVendedorNome(venda.vendedor)}</TableCell>
                      <TableCell className="max-w-[120px] truncate" title={venda.clienteNome}>
                        {venda.clienteNome}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(venda.total)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(venda.statusFluxo as StatusVenda)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => navigate(`/vendas/${venda.id}`)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {podeAprovarOuRecusar(venda.statusFluxo as StatusVenda) && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate(`/vendas/editar-gestor/${venda.id}`)}
                                title="Editar venda"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAbrirModalRecusar(venda)}
                                title="Recusar"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => handleAbrirModalAprovar(venda)}
                                title="Aprovar"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Rodapé */}
      <div className="mt-4 flex flex-wrap justify-between items-center text-sm text-muted-foreground gap-2">
        <span>Exibindo {vendasFiltradas.length} de {vendas.length} registros</span>
        <span className="flex flex-wrap gap-2">
          <span>Gestor: <strong className="text-orange-600">{conferenciaGestorCount}</strong></span>
          <span>|</span>
          <span>Devolvido: <strong className="text-purple-600">{devolvidoFinanceiroCount}</strong></span>
          <span>|</span>
          <span>Financeiro: <strong className="text-yellow-600">{conferenciaFinanceiroCount}</strong></span>
          <span>|</span>
          <span>Finalizado: <strong className="text-green-600">{finalizadoCount}</strong></span>
        </span>
      </div>

      {/* Modal de Aprovação */}
      <Dialog open={modalAprovar} onOpenChange={setModalAprovar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Venda</DialogTitle>
            <DialogDescription>
              Você está prestes a aprovar esta venda e enviá-la para conferência financeira.
            </DialogDescription>
          </DialogHeader>
          
          {vendaSelecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">ID Venda</p>
                  <p className="font-medium">{vendaSelecionada.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{vendaSelecionada.clienteNome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-medium text-lg">{formatCurrency(vendaSelecionada.total)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lucro</p>
                  <p className={`font-medium text-lg ${vendaSelecionada.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(vendaSelecionada.lucro)}
                  </p>
                </div>
              </div>

              {vendaSelecionada.statusFluxo === 'Devolvido pelo Financeiro' && vendaSelecionada.devolucaoFinanceiro && (
                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-1">
                    Motivo da Devolução pelo Financeiro:
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-300">
                    {vendaSelecionada.devolucaoFinanceiro.motivo}
                  </p>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                <p>Ao aprovar, a venda será enviada para:</p>
                <p className="font-medium text-foreground mt-1">💰 Conferência Financeira</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAprovar(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAprovarGestor} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              Confirmar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Recusa */}
      <Dialog open={modalRecusar} onOpenChange={setModalRecusar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Recusar Venda
            </DialogTitle>
            <DialogDescription>
              Ao recusar, a venda será devolvida para o lançador corrigir.
            </DialogDescription>
          </DialogHeader>
          
          {vendaSelecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">ID Venda</p>
                  <p className="font-medium">{vendaSelecionada.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{vendaSelecionada.clienteNome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-medium">{formatCurrency(vendaSelecionada.total)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status Atual</p>
                  <p className="font-medium">{vendaSelecionada.statusFluxo}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="motivoRecusa" className="text-sm font-medium">
                  Motivo da Recusa <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="motivoRecusa"
                  placeholder="Descreva o motivo da recusa..."
                  value={motivoRecusa}
                  onChange={(e) => setMotivoRecusa(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalRecusar(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRecusarGestor}
              disabled={!motivoRecusa.trim()}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VendasLayout>
  );
}
