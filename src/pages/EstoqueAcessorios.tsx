import { useState, useMemo } from 'react';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ResponsiveCardGrid, ResponsiveFilterGrid, ResponsiveTableContainer } from '@/components/ui/ResponsiveContainers';

import { toast } from 'sonner';
import { Download, Package, Edit, AlertTriangle, DollarSign, Layers, Hash, TrendingUp, X } from 'lucide-react';
import { 
  getAcessorios, 
  getCategoriasAcessorios, 
  updateAcessorioQuantidade,
  updateValorRecomendadoAcessorio,
  formatCurrency, 
  exportAcessoriosToCSV,
  Acessorio,
  HistoricoValorRecomendadoAcessorio
} from '@/utils/acessoriosApi';
import { getFornecedores } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { AutocompleteFornecedor } from '@/components/AutocompleteFornecedor';

export default function EstoqueAcessorios() {
  const { obterLojasAtivas, obterColaboradoresAtivos, obterNomeLoja, obterEstoquistas } = useCadastroStore();
  const fornecedores = getFornecedores();
  const [acessorios, setAcessorios] = useState<Acessorio[]>(getAcessorios());
  const [categorias] = useState<string[]>(getCategoriasAcessorios());
  const lojas = obterLojasAtivas();
  const colaboradores = obterColaboradoresAtivos();

  // Colaboradores com permissão de estoque
  const colaboradoresEstoque = colaboradores.filter(col => col.eh_estoquista || col.eh_gestor);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroLoja, setFiltroLoja] = useState('');
  const [filtroDescricao, setFiltroDescricao] = useState('');
  const [filtroFornecedor, setFiltroFornecedor] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [acessorioSelecionado, setAcessorioSelecionado] = useState<Acessorio | null>(null);
  const [novaQuantidade, setNovaQuantidade] = useState(0);
  
  // Modal de Valor Recomendado
  const [showValorRecomendadoModal, setShowValorRecomendadoModal] = useState(false);
  const [novoValorRecomendado, setNovoValorRecomendado] = useState('');
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState('');

  // Helper para obter nome da loja
  const getLojaNome = (lojaId: string) => obterNomeLoja(lojaId);
  const getFornecedorNome = (fornecedorId?: string) => {
    if (!fornecedorId) return '-';
    const f = fornecedores.find(f => f.id === fornecedorId);
    return f?.nome || '-';
  };

  // Agrupa acessórios por ID/Descrição
  const acessoriosAgrupados = useMemo(() => {
    const agrupados: Record<string, { 
      id: string;
      descricao: string; 
      categoria: string; 
      quantidadeTotal: number; 
      valorCusto: number;
      valorRecomendado?: number;
      historicoValorRecomendado?: HistoricoValorRecomendadoAcessorio[];
      fornecedorId?: string;
      lojas: string[];
      itens: Acessorio[];
    }> = {};

    acessorios.forEach(a => {
      if (!agrupados[a.id]) {
        agrupados[a.id] = {
          id: a.id,
          descricao: a.descricao,
          categoria: a.categoria,
          quantidadeTotal: 0,
          valorCusto: a.valorCusto,
          valorRecomendado: a.valorRecomendado,
          historicoValorRecomendado: a.historicoValorRecomendado,
          fornecedorId: a.fornecedorId,
          lojas: [],
          itens: []
        };
      }
      agrupados[a.id].quantidadeTotal += a.quantidade;
      if (!agrupados[a.id].lojas.includes(a.loja)) {
        agrupados[a.id].lojas.push(a.loja);
      }
      agrupados[a.id].itens.push(a);
    });

    return Object.values(agrupados);
  }, [acessorios]);

  // Filtrar acessórios
  const acessoriosFiltrados = useMemo(() => {
    return acessoriosAgrupados.filter(a => {
      if (filtroCategoria && filtroCategoria !== 'todas' && a.categoria !== filtroCategoria) return false;
      if (filtroLoja && filtroLoja !== 'todas') {
        const temNaLoja = a.itens.some(item => item.loja === filtroLoja && item.quantidade > 0);
        if (!temNaLoja) return false;
      }
      // Filtro de descrição
      if (filtroDescricao && !a.descricao.toLowerCase().includes(filtroDescricao.toLowerCase())) {
        return false;
      }
      // Filtro de fornecedor
      if (filtroFornecedor && a.fornecedorId !== filtroFornecedor) {
        return false;
      }
      return true;
    });
  }, [acessoriosAgrupados, filtroCategoria, filtroLoja, filtroDescricao, filtroFornecedor]);

  // Estatísticas dinâmicas baseadas nos filtros
  const estatisticas = useMemo(() => {
    const totalDistintos = acessoriosFiltrados.length;
    const quantidadeTotal = acessoriosFiltrados.reduce((acc, a) => acc + a.quantidadeTotal, 0);
    const valorCustoTotal = acessoriosFiltrados.reduce((acc, a) => acc + (a.valorCusto * a.quantidadeTotal), 0);
    const valorRecomendadoTotal = acessoriosFiltrados.reduce((acc, a) => 
      acc + ((a.valorRecomendado || 0) * a.quantidadeTotal), 0
    );
    
    return { totalDistintos, quantidadeTotal, valorCustoTotal, valorRecomendadoTotal };
  }, [acessoriosFiltrados]);

  const handleEditQuantidade = (acessorio: Acessorio) => {
    setAcessorioSelecionado(acessorio);
    setNovaQuantidade(acessorio.quantidade);
    setShowEditModal(true);
  };

  const handleSalvarQuantidade = () => {
    if (!acessorioSelecionado) return;
    
    updateAcessorioQuantidade(acessorioSelecionado.id, novaQuantidade);
    setAcessorios(getAcessorios());
    setShowEditModal(false);
    setAcessorioSelecionado(null);
    toast.success('Quantidade atualizada com sucesso!');
  };

  const handleOpenValorRecomendado = (acessorio: Acessorio) => {
    setAcessorioSelecionado(acessorio);
    setNovoValorRecomendado(acessorio.valorRecomendado?.toString() || '');
    setColaboradorSelecionado('');
    setShowValorRecomendadoModal(true);
  };

  const handleSalvarValorRecomendado = () => {
    if (!acessorioSelecionado || !colaboradorSelecionado) {
      toast.error('Selecione o colaborador responsável');
      return;
    }

    const valor = parseFloat(novoValorRecomendado.replace(',', '.'));
    if (isNaN(valor) || valor <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    const colaborador = colaboradores.find(c => c.id === colaboradorSelecionado);
    const nomeColaborador = colaborador?.nome || colaboradorSelecionado;

    updateValorRecomendadoAcessorio(acessorioSelecionado.id, valor, nomeColaborador);
    setAcessorios(getAcessorios());
    setShowValorRecomendadoModal(false);
    setAcessorioSelecionado(null);
    toast.success('Valor recomendado atualizado com sucesso!');
  };

  const handleExportCSV = () => {
    const dataToExport = acessoriosFiltrados.map(a => ({
      id: a.id,
      descricao: a.descricao,
      categoria: a.categoria,
      quantidade: a.quantidadeTotal,
      valorCusto: a.valorCusto,
      valorRecomendado: a.valorRecomendado,
      loja: a.lojas.join(', ')
    }));
    exportAcessoriosToCSV(dataToExport as any, `acessorios_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('CSV exportado com sucesso!');
  };


  return (
    <EstoqueLayout title="Gerenciamento de Acessórios">
      <div className="space-y-6">
        {/* Cards de Estatísticas */}
        <ResponsiveCardGrid cols={4}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Acessórios Distintos</p>
                  <p className="text-2xl font-bold">{estatisticas.totalDistintos}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Hash className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quantidade Total</p>
                  <p className="text-2xl font-bold">{estatisticas.quantidadeTotal}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <DollarSign className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor de Custo Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(estatisticas.valorCustoTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Recomendado Total</p>
                <p className="text-2xl font-bold text-blue-500">{formatCurrency(estatisticas.valorRecomendadoTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </ResponsiveCardGrid>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveFilterGrid cols={5}>
              <div>
                <Label>Descrição</Label>
                <Input
                  placeholder="Buscar por descrição..."
                  value={filtroDescricao}
                  onChange={(e) => setFiltroDescricao(e.target.value)}
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {categorias.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Loja</Label>
                <AutocompleteLoja
                  value={filtroLoja}
                  onChange={setFiltroLoja}
                  placeholder="Todas as lojas"
                />
              </div>
              <div>
                <Label>Fornecedor</Label>
                <AutocompleteFornecedor
                  value={filtroFornecedor}
                  onChange={setFiltroFornecedor}
                  placeholder="Todos os fornecedores"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setFiltroCategoria('');
                    setFiltroLoja('');
                    setFiltroDescricao('');
                    setFiltroFornecedor('');
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
                <Button onClick={handleExportCSV} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>
            </ResponsiveFilterGrid>
          </CardContent>
        </Card>

        {/* Tabela de Acessórios */}
        <Card>
          <CardContent className="pt-6">
            <ResponsiveTableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-20 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Descrição</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead className="text-right">Estoque Disponível</TableHead>
                    <TableHead className="text-right">Valor Custo</TableHead>
                    <TableHead className="text-right">Valor Recomendado</TableHead>
                    <TableHead className="text-right">Lucro Unit.</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acessoriosFiltrados.map(acessorio => (
                    <TableRow key={acessorio.id}>
                      <TableCell className="font-medium sticky left-0 z-10 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{acessorio.descricao}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {acessorio.lojas.map(lojaId => getLojaNome(lojaId)).join(', ')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{acessorio.categoria}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{getFornecedorNome(acessorio.fornecedorId)}</TableCell>
                      <TableCell className="font-mono font-medium">{acessorio.id}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {acessorio.quantidadeTotal < 10 && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                          <span className={acessorio.quantidadeTotal < 10 ? 'text-destructive font-bold' : ''}>
                            {acessorio.quantidadeTotal}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(acessorio.valorCusto)}
                      </TableCell>
                      <TableCell className="text-right">
                        {acessorio.valorRecomendado ? (
                          <span className="font-medium text-primary">
                            {formatCurrency(acessorio.valorRecomendado)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {acessorio.valorRecomendado ? (
                          <span className={`font-bold ${acessorio.valorRecomendado - acessorio.valorCusto >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {formatCurrency(acessorio.valorRecomendado - acessorio.valorCusto)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {acessorio.itens.map(item => (
                            <Button
                              key={item.id + item.loja}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditQuantidade(item)}
                              className="gap-1"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenValorRecomendado(acessorio.itens[0])}
                            className="gap-1"
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {acessoriosFiltrados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        Nenhum acessório encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ResponsiveTableContainer>
          </CardContent>
        </Card>

        {/* Modal de Edição de Quantidade */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Quantidade</DialogTitle>
            </DialogHeader>
            {acessorioSelecionado && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Acessório</p>
                  <p className="font-medium">{acessorioSelecionado.descricao}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Loja</p>
                  <p className="font-medium">{acessorioSelecionado.loja}</p>
                </div>
                <div>
                  <Label htmlFor="quantidade">Nova Quantidade</Label>
                  <Input
                    id="quantidade"
                    type="number"
                    min="0"
                    value={novaQuantidade}
                    onChange={(e) => setNovaQuantidade(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarQuantidade}>
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Valor Recomendado */}
        <Dialog open={showValorRecomendadoModal} onOpenChange={setShowValorRecomendadoModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Informar Valor Recomendado</DialogTitle>
            </DialogHeader>
            {acessorioSelecionado && (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{acessorioSelecionado.descricao}</p>
                  <p className="text-sm text-muted-foreground">{acessorioSelecionado.categoria}</p>
                  <p className="text-sm">Custo: {formatCurrency(acessorioSelecionado.valorCusto)}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valorRecomendado">Valor Recomendado (R$)</Label>
                  <Input
                    id="valorRecomendado"
                    type="text"
                    value={novoValorRecomendado}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d,]/g, '');
                      setNovoValorRecomendado(value);
                    }}
                    placeholder="Ex: 99,00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="colaborador">Usuário que Informou *</Label>
                  <AutocompleteColaborador
                    value={colaboradorSelecionado}
                    onChange={setColaboradorSelecionado}
                    placeholder="Selecione o colaborador"
                    filtrarPorTipo="estoquistas"
                  />
                </div>

                {acessorioSelecionado.historicoValorRecomendado && acessorioSelecionado.historicoValorRecomendado.length > 0 && (
                  <div className="space-y-2">
                    <Label>Histórico de Valor Recomendado</Label>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {acessorioSelecionado.historicoValorRecomendado.map((hist, idx) => (
                        <div key={idx} className="text-xs p-2 bg-muted/50 rounded">
                          <span className="font-medium">{new Date(hist.data).toLocaleDateString('pt-BR')}</span>
                          <span className="mx-2">•</span>
                          <span>{hist.usuario}</span>
                          <span className="mx-2">•</span>
                          <span>
                            {hist.valorAntigo ? formatCurrency(hist.valorAntigo) : 'N/A'} → {formatCurrency(hist.valorNovo)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowValorRecomendadoModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSalvarValorRecomendado}
                disabled={!novoValorRecomendado || !colaboradorSelecionado}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </EstoqueLayout>
  );
}