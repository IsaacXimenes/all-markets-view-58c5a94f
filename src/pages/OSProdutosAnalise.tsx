import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OSLayout } from '@/components/layout/OSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Eye, Wrench, Clock, AlertTriangle, CheckCircle, Package, Filter, Download, AlertCircle, FileText } from 'lucide-react';
import { getProdutosParaAnaliseOS, ProdutoPendente, calcularSLA, updateProdutoPendente } from '@/utils/osApi';
import { getLojas, getLojaById, getColaboradoresByPermissao } from '@/utils/cadastrosApi';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { formatCurrency, exportToCSV } from '@/utils/formatUtils';

export default function OSProdutosAnalise() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<ProdutoPendente[]>([]);
  const lojas = getLojas();
  const tecnicos = getColaboradoresByPermissao('Assistência');

  // Modal de detalhamento/parecer
  const [showModalParecer, setShowModalParecer] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoPendente | null>(null);
  const [parecerForm, setParecerForm] = useState({
    responsavel: '',
    dataHora: '',
    status: '' as '' | 'Validado pela assistência' | 'Aguardando peça' | 'Ajustes realizados',
    observacoes: '',
    custoAssistencia: ''
  });

  const getLojaNome = (lojaId: string) => {
    const loja = getLojaById(lojaId);
    return loja?.nome || lojaId;
  };

  // Filtros
  const [filters, setFilters] = useState({
    imei: '',
    modelo: '',
    loja: 'todas'
  });

  useEffect(() => {
    const data = getProdutosParaAnaliseOS();
    setProdutos(data);
  }, []);

  // Filtrar produtos
  const filteredProdutos = useMemo(() => {
    return produtos.filter(produto => {
      if (filters.imei && !produto.imei.toLowerCase().includes(filters.imei.toLowerCase())) return false;
      if (filters.modelo && !produto.modelo.toLowerCase().includes(filters.modelo.toLowerCase())) return false;
      if (filters.loja !== 'todas' && produto.loja !== filters.loja) return false;
      return true;
    });
  }, [produtos, filters]);

  const getStatusAssistenciaBadge = (produto: ProdutoPendente) => {
    if (!produto.parecerAssistencia) {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Para Análise</Badge>;
    }
    switch (produto.parecerAssistencia.status) {
      case 'Validado pela assistência':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Validado</Badge>;
      case 'Aguardando peça':
        return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">Aguardando Peça</Badge>;
      case 'Ajustes realizados':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Ajustes Realizados</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getOrigemBadge = (origem: string) => {
    if (origem === 'Base de Troca') {
      return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">Base de Troca</Badge>;
    }
    return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Fornecedor</Badge>;
  };

  const getSLABadge = (dataEntrada: string) => {
    const { dias, cor } = calcularSLA(dataEntrada);
    
    if (cor === 'vermelho') {
      return (
        <div className="flex items-center gap-1 bg-red-500/20 text-red-600 px-2 py-1 rounded text-xs font-medium">
          <AlertCircle className="h-3 w-3" />
          {dias} dias
        </div>
      );
    }
    if (cor === 'amarelo') {
      return (
        <div className="flex items-center gap-1 bg-yellow-500/20 text-yellow-600 px-2 py-1 rounded text-xs font-medium">
          <AlertTriangle className="h-3 w-3" />
          {dias} dias
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-muted-foreground text-xs">
        <Clock className="h-3 w-3" />
        {dias} dias
      </div>
    );
  };

  const getSLARowClass = (dataEntrada: string) => {
    const { cor } = calcularSLA(dataEntrada);
    if (cor === 'vermelho') return 'bg-red-500/10';
    if (cor === 'amarelo') return 'bg-yellow-500/10';
    return '';
  };

  const stats = {
    totalAnalise: filteredProdutos.length,
    paraAnalise: filteredProdutos.filter(p => !p.parecerAssistencia).length,
    aguardandoPeca: filteredProdutos.filter(p => p.parecerAssistencia?.status === 'Aguardando peça').length,
    ajustesRealizados: filteredProdutos.filter(p => p.parecerAssistencia?.status === 'Ajustes realizados').length,
    custoTotal: filteredProdutos.reduce((acc, p) => acc + p.custoAssistencia, 0)
  };

  const handleExport = () => {
    const dataToExport = filteredProdutos.map(p => {
      const sla = calcularSLA(p.dataEntrada);
      return {
        ID: p.id,
        IMEI: p.imei,
        Produto: `${p.marca} ${p.modelo}`,
        Cor: p.cor,
        Origem: p.origemEntrada,
        Loja: getLojaNome(p.loja),
        'Custo Original': formatCurrency(p.valorCustoOriginal),
        'Custo Assistência': formatCurrency(p.custoAssistencia),
        'SLA (dias)': sla.dias,
        Status: p.parecerAssistencia ? p.parecerAssistencia.status : 'Para Análise'
      };
    });
    exportToCSV(dataToExport, `os-produtos-analise-${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Dados exportados com sucesso!');
  };

  const handleLimpar = () => {
    setFilters({ imei: '', modelo: '', loja: 'todas' });
  };

  const handleAbrirParecer = (produto: ProdutoPendente) => {
    setProdutoSelecionado(produto);
    // Auto-preencher campos bloqueados
    const tecnicoLogado = tecnicos[0]?.nome || 'Técnico Assistência';
    setParecerForm({
      responsavel: tecnicoLogado,
      dataHora: new Date().toISOString(),
      status: produto.parecerAssistencia?.status || '',
      observacoes: produto.parecerAssistencia?.observacoes || '',
      custoAssistencia: produto.custoAssistencia > 0 ? String(produto.custoAssistencia) : ''
    });
    setShowModalParecer(true);
  };

  const handleSalvarParecer = () => {
    if (!produtoSelecionado) return;
    
    if (!parecerForm.status) {
      toast.error('Selecione o status do parecer');
      return;
    }

    const custo = parecerForm.custoAssistencia ? parseFloat(parecerForm.custoAssistencia.replace(/\D/g, '')) / 100 : 0;

    updateProdutoPendente(produtoSelecionado.id, {
      parecerAssistencia: {
        id: `PA-${Date.now()}`,
        status: parecerForm.status,
        observacoes: parecerForm.observacoes,
        responsavel: parecerForm.responsavel,
        data: parecerForm.dataHora
      },
      custoAssistencia: custo
    });

    setProdutos(getProdutosParaAnaliseOS());
    setShowModalParecer(false);
    toast.success('Parecer registrado com sucesso!');
  };

  const formatCurrencyInput = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseInt(numbers || '0') / 100;
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <OSLayout title="Produtos para Análise">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Total em Análise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAnalise}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Para Análise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.paraAnalise}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Aguardando Peça
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.aguardandoPeca}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              Ajustes Realizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.ajustesRealizados}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo Total Assistência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.custoTotal)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="imei">IMEI</Label>
              <Input
                id="imei"
                placeholder="Buscar por IMEI..."
                value={filters.imei}
                onChange={(e) => setFilters({ ...filters, imei: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="modelo">Modelo</Label>
              <Input
                id="modelo"
                placeholder="Buscar modelo..."
                value={filters.modelo}
                onChange={(e) => setFilters({ ...filters, modelo: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="loja">Loja</Label>
              <Select value={filters.loja} onValueChange={(value) => setFilters({ ...filters, loja: value })}>
                <SelectTrigger id="loja">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {lojas.map(l => (
                    <SelectItem key={l.id} value={l.nome}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={handleLimpar} className="flex-1">
                Limpar
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Produtos */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos Encaminhados para Assistência</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Parecer Assistência</TableHead>
                  <TableHead>Custo Assis.</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProdutos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Nenhum produto em análise na assistência
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProdutos.map((produto) => (
                    <TableRow key={produto.id} className={getSLARowClass(produto.dataEntrada)}>
                      <TableCell className="font-mono text-xs font-medium text-primary">{produto.id}</TableCell>
                      <TableCell className="font-mono text-xs">{produto.imei}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{produto.marca}</div>
                          <div className="text-xs text-muted-foreground">{produto.cor}</div>
                        </div>
                      </TableCell>
                      <TableCell>{produto.modelo}</TableCell>
                      <TableCell>{getLojaNome(produto.loja)}</TableCell>
                      <TableCell>{getOrigemBadge(produto.origemEntrada)}</TableCell>
                      <TableCell>{getSLABadge(produto.dataEntrada)}</TableCell>
                      <TableCell>{getStatusAssistenciaBadge(produto)}</TableCell>
                      <TableCell className={produto.custoAssistencia > 0 ? 'text-red-600 font-medium' : ''}>
                        {produto.custoAssistencia > 0 ? formatCurrency(produto.custoAssistencia) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAbrirParecer(produto)}
                            title="Registrar Parecer"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/os/produto/${produto.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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

      {/* Modal de Parecer Técnico */}
      <Dialog open={showModalParecer} onOpenChange={setShowModalParecer}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Parecer Técnico
            </DialogTitle>
          </DialogHeader>
          
          {produtoSelecionado && (
            <div className="space-y-4">
              {/* Info do produto */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{produtoSelecionado.marca} {produtoSelecionado.modelo}</p>
                <p className="text-xs text-muted-foreground">IMEI: {produtoSelecionado.imei}</p>
              </div>

              {/* Campos automáticos bloqueados */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Input 
                    value={parecerForm.responsavel} 
                    disabled 
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data/Hora</Label>
                  <Input 
                    value={format(new Date(parecerForm.dataHora), 'dd/MM/yyyy HH:mm')} 
                    disabled 
                    className="bg-muted"
                  />
                </div>
              </div>

              {/* Campos editáveis */}
              <div className="space-y-2">
                <Label>Status do Parecer *</Label>
                <Select 
                  value={parecerForm.status} 
                  onValueChange={v => setParecerForm({...parecerForm, status: v as typeof parecerForm.status})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Validado pela assistência">Validado pela assistência</SelectItem>
                    <SelectItem value="Aguardando peça">Aguardando peça</SelectItem>
                    <SelectItem value="Ajustes realizados">Ajustes realizados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Custo de Assistência</Label>
                <Input 
                  value={parecerForm.custoAssistencia ? formatCurrencyInput(parecerForm.custoAssistencia) : ''}
                  onChange={e => setParecerForm({...parecerForm, custoAssistencia: e.target.value.replace(/\D/g, '')})}
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea 
                  value={parecerForm.observacoes}
                  onChange={e => setParecerForm({...parecerForm, observacoes: e.target.value})}
                  placeholder="Descreva o parecer técnico..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModalParecer(false)}>Cancelar</Button>
            <Button onClick={handleSalvarParecer}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Salvar Parecer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OSLayout>
  );
}
