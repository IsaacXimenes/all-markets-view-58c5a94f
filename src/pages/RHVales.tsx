import React, { useState, useMemo } from 'react';
import { RHLayout } from '@/components/layout/RHLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, History, Download, X, Users, DollarSign, CreditCard, Calendar } from 'lucide-react';
import { formatCurrency, formatDateTime, exportToCSV } from '@/utils/formatUtils';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { 
  getVales, 
  addVale, 
  updateVale, 
  deleteVale, 
  Vale, 
  HistoricoAlteracao,
  calcularValorParcela,
  getProximosMeses,
  calcularSituacaoParcelas
} from '@/utils/valesApi';

const RHVales: React.FC = () => {
  const { toast } = useToast();
  const { obterLojasAtivas, obterColaboradoresAtivos, obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  const [vales, setVales] = useState<Vale[]>(getVales());
  const lojas = obterLojasAtivas();
  const colaboradores = obterColaboradoresAtivos();
  
  // Modais
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isHistoricoDialogOpen, setIsHistoricoDialogOpen] = useState(false);
  
  // Estado de edição
  const [editingVale, setEditingVale] = useState<Vale | null>(null);
  const [valeToDelete, setValeToDelete] = useState<Vale | null>(null);
  const [valeHistorico, setValeHistorico] = useState<Vale | null>(null);
  
  // Formulário
  const [formData, setFormData] = useState({
    lojaId: '',
    colaboradorId: '',
    observacao: '',
    valorFinal: '',
    quantidadeVezes: '',
    inicioCompetencia: ''
  });
  
  // Filtros
  const [filtroColaborador, setFiltroColaborador] = useState('');
  const [filtroLoja, setFiltroLoja] = useState('');
  const [filtroPeriodoInicio, setFiltroPeriodoInicio] = useState('');
  const [filtroPeriodoFim, setFiltroPeriodoFim] = useState('');
  const [filtroCompetencia, setFiltroCompetencia] = useState('');
  
  // Meses disponíveis para competência
  const mesesDisponiveis = getProximosMeses();
  
  // Filtrar vales
  const valesFiltrados = useMemo(() => {
    return vales.filter(vale => {
      // Filtro por colaborador
      if (filtroColaborador && vale.colaboradorId !== filtroColaborador) return false;
      
      // Filtro por loja
      if (filtroLoja && vale.lojaId !== filtroLoja) return false;
      
      // Filtro por período
      if (filtroPeriodoInicio) {
        const dataVale = new Date(vale.dataLancamento);
        const dataInicio = new Date(filtroPeriodoInicio);
        if (dataVale < dataInicio) return false;
      }
      
      if (filtroPeriodoFim) {
        const dataVale = new Date(vale.dataLancamento);
        const dataFim = new Date(filtroPeriodoFim);
        dataFim.setHours(23, 59, 59);
        if (dataVale > dataFim) return false;
      }
      
      // Filtro por competência
      if (filtroCompetencia && vale.inicioCompetencia !== filtroCompetencia) return false;
      
      return true;
    });
  }, [vales, filtroColaborador, filtroLoja, filtroPeriodoInicio, filtroPeriodoFim, filtroCompetencia]);
  
  // Card de resumo
  const resumo = useMemo(() => {
    const mesAtual = new Date();
    const mesAtualStr = `${['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][mesAtual.getMonth()]}-${mesAtual.getFullYear()}`;
    
    const valesDoMes = valesFiltrados.filter(v => {
      const dataVale = new Date(v.dataLancamento);
      return dataVale.getMonth() === mesAtual.getMonth() && 
             dataVale.getFullYear() === mesAtual.getFullYear();
    });
    
    const totalVales = valesFiltrados.length;
    const valorTotal = valesFiltrados.reduce((acc, v) => acc + v.valorFinal, 0);
    
    // Calcular valor em parcelas do mês atual
    let valorEmParcelas = 0;
    valesFiltrados.forEach(vale => {
      const situacao = calcularSituacaoParcelas(vale.inicioCompetencia, vale.quantidadeVezes);
      if (situacao.pagas > 0 && situacao.pagas <= situacao.total) {
        const valorParcela = calcularValorParcela(vale.valorFinal, vale.quantidadeVezes);
        valorEmParcelas += valorParcela;
      }
    });
    
    const colaboradoresUnicos = new Set(valesFiltrados.map(v => v.colaboradorId)).size;
    
    return { 
      mesAtualStr, 
      totalVales, 
      valorTotal, 
      valorEmParcelas, 
      colaboradoresUnicos 
    };
  }, [valesFiltrados]);
  
  // Helpers
  const getColaboradorNome = (id: string) => obterNomeColaborador(id);
  const getLojaNome = (id: string) => obterNomeLoja(id);
  
  const resetForm = () => {
    setFormData({
      lojaId: '',
      colaboradorId: '',
      observacao: '',
      valorFinal: '',
      quantidadeVezes: '',
      inicioCompetencia: ''
    });
    setEditingVale(null);
  };
  
  const handleOpenDialog = (vale?: Vale) => {
    if (vale) {
      setEditingVale(vale);
      setFormData({
        lojaId: vale.lojaId,
        colaboradorId: vale.colaboradorId,
        observacao: vale.observacao,
        valorFinal: vale.valorFinal.toString(),
        quantidadeVezes: vale.quantidadeVezes.toString(),
        inicioCompetencia: vale.inicioCompetencia
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };
  
  const handleSave = () => {
    // Validações
    if (!formData.lojaId || !formData.colaboradorId || !formData.valorFinal || !formData.quantidadeVezes || !formData.inicioCompetencia) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }
    
    const valorFinal = parseFloat(formData.valorFinal.replace(/[^\d,]/g, '').replace(',', '.'));
    const quantidadeVezes = parseInt(formData.quantidadeVezes);
    
    if (valorFinal <= 0) {
      toast({
        title: "Erro",
        description: "Valor final deve ser maior que zero",
        variant: "destructive"
      });
      return;
    }
    
    if (quantidadeVezes < 1 || quantidadeVezes > 12) {
      toast({
        title: "Erro",
        description: "Quantidade de vezes deve ser entre 1 e 12",
        variant: "destructive"
      });
      return;
    }
    
    const agora = new Date().toISOString();
    const usuarioLogado = { id: 'COL-001', nome: 'Lucas Mendes' }; // Mock
    
    if (editingVale) {
      // Edição
      const novoHistorico: HistoricoAlteracao[] = [...editingVale.historico];
      
      // Registrar alterações
      const camposParaVerificar = [
        { campo: 'Loja', antigo: getLojaNome(editingVale.lojaId), novo: getLojaNome(formData.lojaId), valorAntigo: editingVale.lojaId, valorNovo: formData.lojaId },
        { campo: 'Colaborador', antigo: getColaboradorNome(editingVale.colaboradorId), novo: getColaboradorNome(formData.colaboradorId), valorAntigo: editingVale.colaboradorId, valorNovo: formData.colaboradorId },
        { campo: 'Observação', antigo: editingVale.observacao, novo: formData.observacao, valorAntigo: editingVale.observacao, valorNovo: formData.observacao },
        { campo: 'Valor Final', antigo: formatCurrency(editingVale.valorFinal), novo: formatCurrency(valorFinal), valorAntigo: editingVale.valorFinal.toString(), valorNovo: valorFinal.toString() },
        { campo: 'Quantidade de Vezes', antigo: editingVale.quantidadeVezes.toString(), novo: quantidadeVezes.toString(), valorAntigo: editingVale.quantidadeVezes.toString(), valorNovo: quantidadeVezes.toString() },
        { campo: 'Início Competência', antigo: editingVale.inicioCompetencia, novo: formData.inicioCompetencia, valorAntigo: editingVale.inicioCompetencia, valorNovo: formData.inicioCompetencia }
      ];
      
      camposParaVerificar.forEach(({ campo, antigo, novo, valorAntigo, valorNovo }) => {
        if (valorAntigo !== valorNovo) {
          novoHistorico.push({
            dataHora: agora,
            usuarioId: usuarioLogado.id,
            usuarioNome: usuarioLogado.nome,
            campoAlterado: campo,
            valorAnterior: antigo,
            valorNovo: novo,
            tipoAcao: 'Edição'
          });
        }
      });
      
      updateVale(editingVale.id, {
        lojaId: formData.lojaId,
        colaboradorId: formData.colaboradorId,
        observacao: formData.observacao,
        valorFinal,
        quantidadeVezes,
        inicioCompetencia: formData.inicioCompetencia,
        historico: novoHistorico
      });
      
      toast({
        title: "Sucesso",
        description: "Vale atualizado com sucesso"
      });
    } else {
      // Criação
      const novoVale: Omit<Vale, 'id'> = {
        dataLancamento: agora,
        lancadoPor: usuarioLogado.id,
        lancadoPorNome: usuarioLogado.nome,
        lojaId: formData.lojaId,
        colaboradorId: formData.colaboradorId,
        observacao: formData.observacao,
        valorFinal,
        quantidadeVezes,
        inicioCompetencia: formData.inicioCompetencia,
        historico: [{
          dataHora: agora,
          usuarioId: usuarioLogado.id,
          usuarioNome: usuarioLogado.nome,
          campoAlterado: '-',
          valorAnterior: '-',
          valorNovo: '-',
          tipoAcao: 'Criação'
        }]
      };
      
      addVale(novoVale);
      
      toast({
        title: "Sucesso",
        description: "Vale criado com sucesso"
      });
    }
    
    setVales(getVales());
    setIsDialogOpen(false);
    resetForm();
  };
  
  const handleDelete = () => {
    if (!valeToDelete) return;
    
    deleteVale(valeToDelete.id);
    setVales(getVales());
    setIsDeleteDialogOpen(false);
    setValeToDelete(null);
    
    toast({
      title: "Sucesso",
      description: "Vale deletado com sucesso"
    });
  };
  
  const handleExportCSV = () => {
    const data = valesFiltrados.map(vale => {
      const situacao = calcularSituacaoParcelas(vale.inicioCompetencia, vale.quantidadeVezes);
      return {
        'Data de Lançamento': formatDateTime(vale.dataLancamento),
        'Lançado por': vale.lancadoPorNome,
        'Loja': getLojaNome(vale.lojaId),
        'Colaborador': getColaboradorNome(vale.colaboradorId),
        'Observação': vale.observacao,
        'Valor Final': formatCurrency(vale.valorFinal),
        'Valor da Parcela': formatCurrency(calcularValorParcela(vale.valorFinal, vale.quantidadeVezes)),
        'Quantidade de Vezes': vale.quantidadeVezes,
        'Início da Competência': vale.inicioCompetencia,
        'Situação': `${situacao.pagas}/${situacao.total} parcelas pagas`
      };
    });
    
    const hoje = new Date().toISOString().split('T')[0];
    exportToCSV(data, `vales_${hoje}.csv`);
    
    toast({
      title: "Sucesso",
      description: "Arquivo CSV exportado com sucesso"
    });
  };
  
  const limparFiltros = () => {
    setFiltroColaborador('');
    setFiltroLoja('');
    setFiltroPeriodoInicio('');
    setFiltroPeriodoFim('');
    setFiltroCompetencia('');
  };
  
  // Máscara de moeda
  const handleValorChange = (value: string) => {
    const numerico = value.replace(/\D/g, '');
    const numero = parseInt(numerico || '0') / 100;
    const formatado = numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setFormData(prev => ({ ...prev, valorFinal: formatado }));
  };
  
  const valorParcela = useMemo(() => {
    const valor = parseFloat(formData.valorFinal.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    const qtd = parseInt(formData.quantidadeVezes) || 1;
    return calcularValorParcela(valor, qtd);
  }, [formData.valorFinal, formData.quantidadeVezes]);
  
  // Render situação com indicador visual
  const renderSituacao = (vale: Vale) => {
    const situacao = calcularSituacaoParcelas(vale.inicioCompetencia, vale.quantidadeVezes);
    
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Progress value={situacao.percentual} className="w-20 h-2" />
          <span className="text-xs text-muted-foreground">
            {situacao.pagas}/{situacao.total}
          </span>
        </div>
        <span className={`text-xs ${
          situacao.pagas === situacao.total 
            ? 'text-green-600' 
            : situacao.pagas > 0 
              ? 'text-yellow-600' 
              : 'text-muted-foreground'
        }`}>
          {situacao.pagas === situacao.total 
            ? 'Todas as parcelas pagas' 
            : situacao.pagas === 0 
              ? 'Nenhuma parcela paga'
              : `${situacao.total - situacao.pagas} parcela(s) restante(s)`
          }
        </span>
      </div>
    );
  };
  
  return (
    <RHLayout title="Vales">
      {/* Card de Resumo */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vales</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo.totalVales}</div>
            <p className="text-xs text-muted-foreground">Vales lançados</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(resumo.valorTotal)}</div>
            <p className="text-xs text-muted-foreground">Soma dos vales</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor em Parcelas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(resumo.valorEmParcelas)}</div>
            <p className="text-xs text-muted-foreground">{resumo.mesAtualStr}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumo.colaboradoresUnicos}</div>
            <p className="text-xs text-muted-foreground">Com vales ativos</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div>
              <Label>Colaborador</Label>
              <AutocompleteColaborador
                value={filtroColaborador}
                onChange={setFiltroColaborador}
                placeholder="Todos os colaboradores"
              />
            </div>
            
            <div>
              <Label>Loja</Label>
              <AutocompleteLoja
                value={filtroLoja}
                onChange={setFiltroLoja}
                placeholder="Todas as lojas"
                apenasLojasTipoLoja
              />
            </div>
            
            <div>
              <Label>Período Início</Label>
              <Input 
                type="date" 
                value={filtroPeriodoInicio} 
                onChange={e => setFiltroPeriodoInicio(e.target.value)} 
              />
            </div>
            
            <div>
              <Label>Período Fim</Label>
              <Input 
                type="date" 
                value={filtroPeriodoFim} 
                onChange={e => setFiltroPeriodoFim(e.target.value)} 
              />
            </div>
            
            <div>
              <Label>Competência</Label>
              <Select value={filtroCompetencia || "all"} onValueChange={v => setFiltroCompetencia(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {mesesDisponiveis.slice(0, 12).map(mes => (
                    <SelectItem key={mes} value={mes}>{mes}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={limparFiltros}>
              <X className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabela */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vales</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Vale
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data de Lançamento</TableHead>
                <TableHead>Lançado por</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead>Valor Final</TableHead>
                <TableHead>Valor da Parcela</TableHead>
                <TableHead>Qtd. Vezes</TableHead>
                <TableHead>Início Competência</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {valesFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground">
                    Nenhum vale encontrado
                  </TableCell>
                </TableRow>
              ) : (
                valesFiltrados.map(vale => {
                  const situacao = calcularSituacaoParcelas(vale.inicioCompetencia, vale.quantidadeVezes);
                  const getValeRowClass = () => {
                    if (situacao.pagas === situacao.total) return 'bg-green-500/10';
                    if (situacao.pagas > 0) return 'bg-yellow-500/10';
                    return '';
                  };
                  return (
                  <TableRow key={vale.id} className={getValeRowClass()}>
                    <TableCell>{formatDateTime(vale.dataLancamento)}</TableCell>
                    <TableCell>{vale.lancadoPorNome}</TableCell>
                    <TableCell>{getLojaNome(vale.lojaId)}</TableCell>
                    <TableCell>{getColaboradorNome(vale.colaboradorId)}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={vale.observacao}>
                      {vale.observacao || '-'}
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(vale.valorFinal)}</TableCell>
                    <TableCell>{formatCurrency(calcularValorParcela(vale.valorFinal, vale.quantidadeVezes))}</TableCell>
                    <TableCell>{vale.quantidadeVezes}x</TableCell>
                    <TableCell>
                      <Badge variant="outline">{vale.inicioCompetencia}</Badge>
                    </TableCell>
                    <TableCell>{renderSituacao(vale)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleOpenDialog(vale)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            setValeToDelete(vale);
                            setIsDeleteDialogOpen(true);
                          }}
                          title="Deletar"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            setValeHistorico(vale);
                            setIsHistoricoDialogOpen(true);
                          }}
                          title="Histórico"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Modal de Novo/Editar Vale */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingVale ? 'Editar Vale' : 'Novo Vale'}</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {editingVale && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Lançamento</Label>
                    <Input value={formatDateTime(editingVale.dataLancamento)} disabled />
                  </div>
                  <div>
                    <Label>Lançado por</Label>
                    <Input value={editingVale.lancadoPorNome} disabled />
                  </div>
                </div>
              </>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Loja *</Label>
                <AutocompleteLoja
                  value={formData.lojaId}
                  onChange={v => setFormData(prev => ({ ...prev, lojaId: v }))}
                  placeholder="Selecione uma loja"
                  apenasLojasTipoLoja
                />
              </div>
              
              <div>
                <Label>Colaborador *</Label>
                <AutocompleteColaborador
                  value={formData.colaboradorId}
                  onChange={v => setFormData(prev => ({ ...prev, colaboradorId: v }))}
                  placeholder="Selecione um colaborador"
                />
              </div>
            </div>
            
            <div>
              <Label>Observação</Label>
              <Textarea 
                value={formData.observacao}
                onChange={e => setFormData(prev => ({ ...prev, observacao: e.target.value.slice(0, 500) }))}
                placeholder="Adicione observações sobre este vale (ex: motivo, autorização, etc)"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">{formData.observacao.length}/500 caracteres</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor Final *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input 
                    value={formData.valorFinal}
                    onChange={e => handleValorChange(e.target.value)}
                    placeholder="0,00"
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div>
                <Label>Quantidade de Vezes *</Label>
                <Input 
                  type="number"
                  min={1}
                  max={12}
                  value={formData.quantidadeVezes}
                  onChange={e => setFormData(prev => ({ ...prev, quantidadeVezes: e.target.value }))}
                  placeholder="Ex: 3"
                />
              </div>
            </div>
            
            {formData.valorFinal && formData.quantidadeVezes && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <span className="text-muted-foreground">Valor da parcela: </span>
                  <span className="font-medium">{formatCurrency(valorParcela)}</span>
                </p>
              </div>
            )}
            
            <div>
              <Label>Início da Competência *</Label>
              <Select value={formData.inicioCompetencia} onValueChange={v => setFormData(prev => ({ ...prev, inicioCompetencia: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês..." />
                </SelectTrigger>
                <SelectContent>
                  {mesesDisponiveis.map(mes => (
                    <SelectItem key={mes} value={mes}>{mes}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSave}>
              {editingVale ? 'Salvar Alterações' : 'Salvar Vale'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Confirmação de Deleção */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Deleção</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Tem certeza que deseja deletar este vale? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Confirmar Deleção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Histórico */}
      <Dialog open={isHistoricoDialogOpen} onOpenChange={setIsHistoricoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de Alterações - Vale {valeHistorico?.id}</DialogTitle>
          </DialogHeader>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Campo Alterado</TableHead>
                <TableHead>Valor Anterior</TableHead>
                <TableHead>Valor Novo</TableHead>
                <TableHead>Tipo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {valeHistorico?.historico.map((h, idx) => (
                <TableRow key={idx}>
                  <TableCell>{formatDateTime(h.dataHora)}</TableCell>
                  <TableCell>{h.usuarioNome}</TableCell>
                  <TableCell>{h.campoAlterado}</TableCell>
                  <TableCell>{h.valorAnterior}</TableCell>
                  <TableCell>{h.valorNovo}</TableCell>
                  <TableCell>
                    <Badge variant={h.tipoAcao === 'Criação' ? 'default' : 'secondary'}>
                      {h.tipoAcao}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Fechar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RHLayout>
  );
};

export default RHVales;
