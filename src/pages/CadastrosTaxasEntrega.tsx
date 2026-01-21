import { useState, useEffect, useMemo } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Pencil, 
  History, 
  Power, 
  Download, 
  MapPin, 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCadastroStore } from '@/store/cadastroStore';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { formatCurrency, exportToCSV } from '@/utils/formatUtils';
import {
  getTaxasEntrega,
  getTaxasEntregaAtivas,
  addTaxaEntrega,
  updateTaxaEntrega,
  toggleStatusTaxaEntrega,
  updateTaxaLocal,
  TaxaEntrega,
  LogAlteracao
} from '@/utils/taxasEntregaApi';

export default function CadastrosTaxasEntrega() {
  const { obterGestores, obterColaboradoresAtivos } = useCadastroStore();
  
  const [taxas, setTaxas] = useState<TaxaEntrega[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroBusca, setFiltroBusca] = useState('');
  
  // Modal de criação/edição
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    local: '',
    valor: '',
    responsavelId: ''
  });
  
  // Modal de histórico
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [historicoSelecionado, setHistoricoSelecionado] = useState<LogAlteracao[]>([]);
  const [taxaSelecionada, setTaxaSelecionada] = useState<TaxaEntrega | null>(null);
  
  const colaboradores = obterColaboradoresAtivos();
  const gestores = obterGestores();

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = () => {
    setTaxas(getTaxasEntrega());
  };

  const resetForm = () => {
    setForm({ local: '', valor: '', responsavelId: '' });
    setEditingId(null);
  };

  const handleOpenDialog = (taxa?: TaxaEntrega) => {
    if (taxa) {
      setEditingId(taxa.id);
      setForm({
        local: taxa.local,
        valor: taxa.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        responsavelId: ''
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.local.trim()) {
      toast.error('Informe o local');
      return;
    }
    
    const valor = parseFloat(form.valor.replace(/\./g, '').replace(',', '.'));
    if (isNaN(valor) || valor <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    
    if (!form.responsavelId) {
      toast.error('Selecione o responsável');
      return;
    }
    
    const responsavel = colaboradores.find(c => c.id === form.responsavelId);
    if (!responsavel) {
      toast.error('Responsável inválido');
      return;
    }

    try {
      if (editingId) {
        updateTaxaEntrega(editingId, valor, form.responsavelId, responsavel.nome);
        // Atualizar local se mudou
        const taxaAtual = taxas.find(t => t.id === editingId);
        if (taxaAtual && taxaAtual.local !== form.local.trim()) {
          updateTaxaLocal(editingId, form.local.trim());
        }
        toast.success('Taxa de entrega atualizada com sucesso');
      } else {
        addTaxaEntrega(form.local.trim(), valor, form.responsavelId, responsavel.nome);
        toast.success('Taxa de entrega cadastrada com sucesso');
      }
      
      carregarDados();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar taxa de entrega');
    }
  };

  const handleToggleStatus = (taxa: TaxaEntrega) => {
    // Usar o primeiro gestor como responsável (em prod seria o usuário logado)
    const responsavel = gestores[0] || colaboradores[0];
    if (!responsavel) {
      toast.error('Nenhum responsável disponível');
      return;
    }
    
    toggleStatusTaxaEntrega(taxa.id, responsavel.id, responsavel.nome);
    toast.success(`Taxa ${taxa.status === 'Ativo' ? 'desativada' : 'ativada'} com sucesso`);
    carregarDados();
  };

  const handleVerHistorico = (taxa: TaxaEntrega) => {
    setTaxaSelecionada(taxa);
    setHistoricoSelecionado(taxa.logs);
    setShowHistoricoModal(true);
  };

  const taxasFiltradas = useMemo(() => {
    return taxas.filter(t => {
      if (filtroStatus !== 'todos' && t.status !== filtroStatus) return false;
      if (filtroBusca && !t.local.toLowerCase().includes(filtroBusca.toLowerCase())) return false;
      return true;
    }).sort((a, b) => a.local.localeCompare(b.local));
  }, [taxas, filtroStatus, filtroBusca]);

  // Estatísticas
  const stats = {
    total: taxas.length,
    ativos: taxas.filter(t => t.status === 'Ativo').length,
    mediaValor: taxas.length > 0 
      ? taxas.reduce((acc, t) => acc + t.valor, 0) / taxas.length 
      : 0,
    maiorValor: taxas.length > 0
      ? Math.max(...taxas.map(t => t.valor))
      : 0
  };

  const handleExportCSV = () => {
    const dataToExport = taxasFiltradas.map(t => ({
      ID: t.id,
      Local: t.local,
      'Valor (R$)': t.valor.toFixed(2),
      Status: t.status,
      'Última Atualização': format(new Date(t.dataAtualizacao), 'dd/MM/yyyy HH:mm')
    }));
    exportToCSV(dataToExport, `taxas_entrega_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast.success('CSV exportado com sucesso!');
  };

  const temFiltroAtivo = filtroStatus !== 'todos' || filtroBusca;

  return (
    <CadastrosLayout title="Taxas de Entrega">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Locais</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Power className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Locais Ativos</p>
                <p className="text-2xl font-bold">{stats.ativos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Média de Valor</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.mediaValor)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Maior Valor</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.maiorValor)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Ações */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>Buscar Local</Label>
              <Input 
                placeholder="Digite o nome do local..."
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
              />
            </div>
            
            <div className="w-[150px]">
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Ativo">Ativos</SelectItem>
                  <SelectItem value="Inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              {temFiltroAtivo && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => { setFiltroStatus('todos'); setFiltroBusca(''); }}
                  title="Limpar filtros"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Taxa
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Taxas de Entrega Cadastradas
            {taxasFiltradas.length !== taxas.length && (
              <Badge variant="secondary" className="ml-2">
                {taxasFiltradas.length} de {taxas.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Atualização</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taxasFiltradas.map((taxa) => (
                  <TableRow key={taxa.id} className={taxa.status === 'Inativo' ? 'opacity-60' : ''}>
                    <TableCell className="font-mono text-xs">{taxa.id}</TableCell>
                    <TableCell className="font-medium">{taxa.local}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(taxa.valor)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={taxa.status === 'Ativo' ? 'default' : 'secondary'}>
                        {taxa.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(taxa.dataAtualizacao), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDialog(taxa)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleVerHistorico(taxa)}
                          title="Histórico"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleStatus(taxa)}
                          title={taxa.status === 'Ativo' ? 'Desativar' : 'Ativar'}
                          className={taxa.status === 'Ativo' ? 'text-destructive' : 'text-green-600'}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {taxasFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma taxa de entrega encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Criação/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Taxa de Entrega' : 'Nova Taxa de Entrega'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="local">Local *</Label>
              <Input
                id="local"
                value={form.local}
                onChange={(e) => setForm(prev => ({ ...prev, local: e.target.value }))}
                placeholder="Ex: Asa Sul, Taguatinga..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <InputComMascara
                id="valor"
                mascara="moeda"
                value={form.valor}
                onChange={(formatted) => setForm(prev => ({ ...prev, valor: formatted }))}
                placeholder="0,00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável pela Alteração *</Label>
              <Select 
                value={form.responsavelId} 
                onValueChange={(v) => setForm(prev => ({ ...prev, responsavelId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map(col => (
                    <SelectItem key={col.id} value={col.id}>{col.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingId ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Histórico */}
      <Dialog open={showHistoricoModal} onOpenChange={setShowHistoricoModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Alterações
            </DialogTitle>
          </DialogHeader>
          {taxaSelecionada && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{taxaSelecionada.local}</p>
                <p className="text-sm text-muted-foreground">
                  Valor atual: {formatCurrency(taxaSelecionada.valor)}
                </p>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {historicoSelecionado.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum histórico de alteração registrado.
                  </p>
                ) : (
                  historicoSelecionado.slice().reverse().map((log) => (
                    <div key={log.id} className="p-3 border rounded-lg text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{log.usuarioNome}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.data), 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {log.acao === 'criacao' ? 'Criação' : 
                           log.acao === 'edicao' ? 'Edição' : 'Status'}
                        </Badge>
                      </div>
                      {log.acao === 'edicao' && (
                        <div className="mt-2 text-xs">
                          <span className="text-muted-foreground">Valor: </span>
                          <span className="line-through text-destructive">
                            {formatCurrency(log.valorAnterior)}
                          </span>
                          <span className="mx-2">→</span>
                          <span className="text-green-600 font-medium">
                            {formatCurrency(log.valorNovo)}
                          </span>
                        </div>
                      )}
                      {log.acao === 'criacao' && (
                        <div className="mt-2 text-xs">
                          <span className="text-muted-foreground">Valor inicial: </span>
                          <span className="text-green-600 font-medium">
                            {formatCurrency(log.valorNovo)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CadastrosLayout>
  );
}
