import { useState } from 'react';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Plus, Pencil, Trash2, Download, History, ChevronDown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
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

const formVazio = { modelo: '', marca: 'Apple', condicao: 'Semi-novo' as 'Novo' | 'Semi-novo', valorMin: 0, valorMax: 0, valorSugerido: 0 };

export default function EstoqueValoresTroca() {
  const [busca, setBusca] = useState('');
  const [dados, setDados] = useState<ValorRecomendadoTroca[]>(getValoresRecomendadosTroca());
  const [logs, setLogs] = useState<LogValorTroca[]>(getLogsValorTroca());
  const [logsAberto, setLogsAberto] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(formVazio);
  const [excluirId, setExcluirId] = useState<string | null>(null);

  const recarregar = () => {
    setDados(busca ? buscarValoresRecomendados(busca) : getValoresRecomendadosTroca());
    setLogs(getLogsValorTroca());
  };

  const handleBusca = (v: string) => {
    setBusca(v);
    setDados(v ? buscarValoresRecomendados(v) : getValoresRecomendadosTroca());
  };

  const abrirNovo = () => {
    setEditandoId(null);
    setForm(formVazio);
    setModalAberto(true);
  };

  const abrirEditar = (item: ValorRecomendadoTroca) => {
    setEditandoId(item.id);
    setForm({ modelo: item.modelo, marca: item.marca, condicao: item.condicao, valorMin: item.valorMin, valorMax: item.valorMax, valorSugerido: item.valorSugerido });
    setModalAberto(true);
  };

  const salvar = () => {
    if (!form.modelo.trim() || !form.marca.trim()) {
      toast.error('Preencha modelo e marca');
      return;
    }
    if (form.valorMin <= 0 || form.valorMax <= 0 || form.valorSugerido <= 0) {
      toast.error('Valores devem ser maiores que zero');
      return;
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
                  <TableHead>Condição</TableHead>
                  <TableHead className="text-right">Valor Mín</TableHead>
                  <TableHead className="text-right">Valor Máx</TableHead>
                  <TableHead className="text-right">Valor Sugerido</TableHead>
                  <TableHead>Atualização</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum valor encontrado</TableCell></TableRow>
                ) : dados.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.modelo}</TableCell>
                    <TableCell>{item.marca}</TableCell>
                    <TableCell><Badge variant={item.condicao === 'Novo' ? 'default' : 'secondary'}>{item.condicao}</Badge></TableCell>
                    <TableCell className="text-right">{fmt(item.valorMin)}</TableCell>
                    <TableCell className="text-right">{fmt(item.valorMax)}</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(item.valorSugerido)}</TableCell>
                    <TableCell>{item.ultimaAtualizacao}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
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

        {/* Logs */}
        <Collapsible open={logsAberto} onOpenChange={setLogsAberto}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" />Histórico de Alterações ({logs.length})</CardTitle>
                  <ChevronDown className={`h-4 w-4 transition-transform ${logsAberto ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma alteração registrada</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {logs.map(log => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 text-sm">
                        <Badge variant={log.tipo === 'criacao' ? 'default' : log.tipo === 'edicao' ? 'secondary' : 'destructive'} className="mt-0.5 shrink-0">
                          {log.tipo === 'criacao' ? 'Criação' : log.tipo === 'edicao' ? 'Edição' : 'Exclusão'}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{log.modelo}</p>
                          <p className="text-muted-foreground">{log.detalhes}</p>
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
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Modal Criar/Editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoId ? 'Editar Valor de Troca' : 'Novo Valor de Troca'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Modelo</Label><Input value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} placeholder="Ex: iPhone 15 Pro" /></div>
              <div><Label>Marca</Label><Input value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} placeholder="Ex: Apple" /></div>
            </div>
            <div>
              <Label>Condição</Label>
              <Select value={form.condicao} onValueChange={v => setForm(f => ({ ...f, condicao: v as 'Novo' | 'Semi-novo' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Novo">Novo</SelectItem>
                  <SelectItem value="Semi-novo">Semi-novo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Valor Mín (R$)</Label><Input type="number" value={form.valorMin || ''} onChange={e => setForm(f => ({ ...f, valorMin: Number(e.target.value) }))} /></div>
              <div><Label>Valor Máx (R$)</Label><Input type="number" value={form.valorMax || ''} onChange={e => setForm(f => ({ ...f, valorMax: Number(e.target.value) }))} /></div>
              <div><Label>Valor Sugerido (R$)</Label><Input type="number" value={form.valorSugerido || ''} onChange={e => setForm(f => ({ ...f, valorSugerido: Number(e.target.value) }))} /></div>
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
