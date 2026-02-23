import { useState, useMemo } from 'react';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Pencil, Trash2, Download, History, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { getProdutosCadastro } from '@/utils/cadastrosApi';
import {
  getValoresRecomendadosTroca,
  criarValorRecomendado,
  editarValorRecomendado,
  excluirValorRecomendado,
  buscarValoresRecomendados,
  getLogsValorTroca,
  exportarValoresCSV,
  type ValorRecomendadoTroca,
  type LogValorTroca,
} from '@/utils/valoresRecomendadosTrocaApi';

const formVazio = { modelo: '', marca: '', condicao: 'Semi-novo' as const, valorSugerido: 0 };

export default function EstoqueValoresTroca() {
  const [busca, setBusca] = useState('');
  const [dados, setDados] = useState<ValorRecomendadoTroca[]>(getValoresRecomendadosTroca());
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(formVazio);
  const [excluirId, setExcluirId] = useState<string | null>(null);
  const [historicoId, setHistoricoId] = useState<string | null>(null);
  const [historicoLogs, setHistoricoLogs] = useState<LogValorTroca[]>([]);

  // Autocomplete modelo
  const [filtroModelo, setFiltroModelo] = useState('');
  const [modeloAberto, setModeloAberto] = useState(false);

  const produtos = useMemo(() => getProdutosCadastro(), []);
  const modelosExistentes = useMemo(() => {
    const atuais = getValoresRecomendadosTroca();
    return new Set(atuais.map(v => v.modelo));
  }, [dados]);

  const produtosFiltrados = useMemo(() => {
    if (!filtroModelo.trim()) return produtos;
    const termo = filtroModelo.toLowerCase();
    return produtos.filter(p => p.produto.toLowerCase().includes(termo));
  }, [produtos, filtroModelo]);

  const recarregar = () => {
    setDados(busca ? buscarValoresRecomendados(busca) : getValoresRecomendadosTroca());
  };

  const handleBusca = (v: string) => {
    setBusca(v);
    setDados(v ? buscarValoresRecomendados(v) : getValoresRecomendadosTroca());
  };

  const abrirNovo = () => {
    setEditandoId(null);
    setForm(formVazio);
    setFiltroModelo('');
    setModalAberto(true);
  };

  const abrirEditar = (item: ValorRecomendadoTroca) => {
    setEditandoId(item.id);
    setForm({ modelo: item.modelo, marca: item.marca, condicao: 'Semi-novo', valorSugerido: item.valorSugerido });
    setFiltroModelo(item.modelo);
    setModalAberto(true);
  };

  const abrirHistorico = (item: ValorRecomendadoTroca) => {
    setHistoricoId(item.id);
    setHistoricoLogs(getLogsValorTroca(item.id));
  };

  const handleSelecionarModelo = (produto: { produto: string; marca: string }) => {
    setForm(f => ({ ...f, modelo: produto.produto, marca: produto.marca }));
    setFiltroModelo(produto.produto);
    setModeloAberto(false);
  };

  const salvar = () => {
    if (!form.modelo.trim() || !form.marca.trim()) {
      toast.error('Preencha modelo e marca');
      return;
    }
    if (form.valorSugerido <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }
    if (!editandoId) {
      if (modelosExistentes.has(form.modelo)) {
        toast.error(`Já existe um valor cadastrado para "${form.modelo}"`);
        return;
      }
    }
    if (editandoId) {
      editarValorRecomendado(editandoId, form);
      toast.success('Valor atualizado com sucesso');
    } else {
      criarValorRecomendado(form);
      toast.success('Novo valor cadastrado');
    }
    setModalAberto(false);
    recarregar();
  };

  const confirmarExcluir = () => {
    if (excluirId) {
      excluirValorRecomendado(excluirId);
      toast.success('Valor removido');
      setExcluirId(null);
      recarregar();
    }
  };

  const handleExportCSV = () => {
    const csv = exportarValoresCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'valores-troca.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado');
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <EstoqueLayout title="Valores de Troca" icon={DollarSign}>
      <div className="space-y-4">
        {/* Barra de ações */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar modelo ou marca..." value={busca} onChange={e => handleBusca(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="h-4 w-4 mr-1" />CSV</Button>
            <Button size="sm" onClick={abrirNovo}><Plus className="h-4 w-4 mr-1" />Novo Valor</Button>
          </div>
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead className="text-right">Valor Sugerido</TableHead>
                  <TableHead>Atualização</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum valor encontrado</TableCell></TableRow>
                ) : dados.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.modelo}</TableCell>
                    <TableCell>{item.marca}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(item.valorSugerido)}</TableCell>
                    <TableCell>{item.ultimaAtualizacao}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" title="Histórico" onClick={() => abrirHistorico(item)}><History className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => abrirEditar(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setExcluirId(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modal Histórico por registro */}
      <Dialog open={!!historicoId} onOpenChange={v => !v && setHistoricoId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-4 w-4" />Histórico de Alterações</DialogTitle>
          </DialogHeader>
          {historicoLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma alteração registrada para este registro.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {historicoLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 text-sm">
                  <Badge variant={log.tipo === 'criacao' ? 'default' : log.tipo === 'edicao' ? 'secondary' : 'destructive'} className="mt-0.5 shrink-0">
                    {log.tipo === 'criacao' ? 'Criação' : log.tipo === 'edicao' ? 'Edição' : 'Exclusão'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-muted-foreground whitespace-pre-line">{log.detalhes}</p>
                  </div>
                  <div className="text-right shrink-0 text-muted-foreground">
                    <p>{new Date(log.dataHora).toLocaleDateString('pt-BR')}</p>
                    <p>{new Date(log.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-xs">{log.usuario}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Criar/Editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoId ? 'Editar Valor de Troca' : 'Novo Valor de Troca'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Modelo</Label>
              <div className="relative">
                <Input
                  value={filtroModelo}
                  onChange={e => {
                    setFiltroModelo(e.target.value);
                    setModeloAberto(true);
                    if (!e.target.value) {
                      setForm(f => ({ ...f, modelo: '', marca: '' }));
                    }
                  }}
                  onFocus={() => setModeloAberto(true)}
                  onBlur={() => setTimeout(() => setModeloAberto(false), 200)}
                  placeholder="Buscar aparelho..."
                  disabled={!!editandoId}
                />
                {modeloAberto && !editandoId && produtosFiltrados.length > 0 && (
                  <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      {produtosFiltrados.map(p => {
                        const jaCadastrado = modelosExistentes.has(p.produto);
                        return (
                          <div
                            key={p.id}
                            className={`flex items-center justify-between px-3 py-2 text-sm ${jaCadastrado ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent cursor-pointer'}`}
                            onMouseDown={() => {
                              if (!jaCadastrado) handleSelecionarModelo(p);
                            }}
                          >
                            <span>{p.produto}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{p.marca}</span>
                              {jaCadastrado && <Badge variant="outline" className="text-xs">Já cadastrado</Badge>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {modeloAberto && !editandoId && produtosFiltrados.length === 0 && filtroModelo && (
                  <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
                    Nenhum aparelho encontrado
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Marca</Label>
              <Input value={form.marca} readOnly disabled className="bg-muted" placeholder="Preenchido ao selecionar modelo" />
            </div>

            <div>
              <Label>Valor Sugerido</Label>
              <InputComMascara
                mascara="moeda"
                value={form.valorSugerido}
                onChange={(_formatted, raw) => setForm(f => ({ ...f, valorSugerido: Number(raw) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={salvar}>{editandoId ? 'Salvar' : 'Cadastrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!excluirId} onOpenChange={v => !v && setExcluirId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este valor de troca? Esta ação será registrada no histórico.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExcluir}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </EstoqueLayout>
  );
}
