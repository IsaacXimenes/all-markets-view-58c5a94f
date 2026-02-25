import { useState, useMemo } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Target } from 'lucide-react';
import { useCadastroStore } from '@/store/cadastroStore';
import { getMetas, addMeta, updateMeta, deleteMeta, MetaLoja } from '@/utils/metasApi';
import { PainelMetasLoja } from '@/components/vendas/PainelMetasLoja';
import { formatarMoeda, parseMoeda, moedaMask } from '@/utils/formatUtils';
import { toast } from 'sonner';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const anoAtual = new Date().getFullYear();
const ANOS = [anoAtual - 1, anoAtual, anoAtual + 1];

export default function CadastrosMetas() {
  const { obterLojasTipoLoja, obterNomeLoja } = useCadastroStore();
  const lojas = obterLojasTipoLoja();
  const [metas, setMetas] = useState<MetaLoja[]>(getMetas());
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<MetaLoja | null>(null);

  // Form state
  const [lojaId, setLojaId] = useState('');
  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const [ano, setAno] = useState(String(anoAtual));
  const [metaFaturamento, setMetaFaturamento] = useState('');
  const [metaAcessorios, setMetaAcessorios] = useState('');
  const [metaGarantia, setMetaGarantia] = useState('');

  // Filtros
  const [filtroLoja, setFiltroLoja] = useState('');
  const [filtroAno, setFiltroAno] = useState(String(anoAtual));

  const metasFiltradas = useMemo(() => {
    return metas
      .filter(m => !filtroLoja || m.lojaId === filtroLoja)
      .filter(m => !filtroAno || String(m.ano) === filtroAno)
      .sort((a, b) => a.mes - b.mes);
  }, [metas, filtroLoja, filtroAno]);

  const resetForm = () => {
    setLojaId('');
    setMes(String(new Date().getMonth() + 1));
    setAno(String(anoAtual));
    setMetaFaturamento('');
    setMetaAcessorios('');
    setMetaGarantia('');
    setEditando(null);
  };

  const abrirNovo = () => {
    resetForm();
    setModalOpen(true);
  };

  const abrirEditar = (meta: MetaLoja) => {
    setEditando(meta);
    setLojaId(meta.lojaId);
    setMes(String(meta.mes));
    setAno(String(meta.ano));
    setMetaFaturamento(formatarMoeda(meta.metaFaturamento));
    setMetaAcessorios(String(meta.metaAcessorios));
    setMetaGarantia(formatarMoeda(meta.metaGarantia));
    setModalOpen(true);
  };

  const handleSalvar = () => {
    if (!lojaId) {
      toast.error('Selecione uma loja');
      return;
    }

    const data = {
      lojaId,
      mes: Number(mes),
      ano: Number(ano),
      metaFaturamento: parseMoeda(metaFaturamento),
      metaAcessorios: Number(metaAcessorios) || 0,
      metaGarantia: parseMoeda(metaGarantia),
    };

    if (editando) {
      updateMeta(editando.id, data);
      toast.success('Meta atualizada com sucesso!');
    } else {
      addMeta(data);
      toast.success('Meta cadastrada com sucesso!');
    }

    setMetas(getMetas());
    setModalOpen(false);
    resetForm();
  };

  const handleExcluir = (id: string) => {
    deleteMeta(id);
    setMetas(getMetas());
    toast.success('Meta excluída');
  };

  return (
    <CadastrosLayout title="Metas por Loja" icon={Target}>
      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Loja</label>
              <Select value={filtroLoja || 'all'} onValueChange={v => setFiltroLoja(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Lojas</SelectItem>
                  {lojas.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[120px]">
              <label className="text-sm font-medium mb-1 block">Ano</label>
              <Select value={filtroAno} onValueChange={setFiltroAno}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={abrirNovo}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Meta
            </Button>
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
                  <TableHead>Loja</TableHead>
                  <TableHead>Mês/Ano</TableHead>
                  <TableHead className="text-right">Meta Faturamento</TableHead>
                  <TableHead className="text-right">Meta Acessórios (un.)</TableHead>
                  <TableHead className="text-right">Meta Garantia</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metasFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma meta cadastrada para o período selecionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  metasFiltradas.map(meta => (
                    <TableRow key={meta.id}>
                      <TableCell className="font-medium">{obterNomeLoja(meta.lojaId)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{MESES[meta.mes - 1]} {meta.ano}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatarMoeda(meta.metaFaturamento)}</TableCell>
                      <TableCell className="text-right">{meta.metaAcessorios}</TableCell>
                      <TableCell className="text-right">{formatarMoeda(meta.metaGarantia)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => abrirEditar(meta)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleExcluir(meta.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Painéis visuais de metas */}
      {(() => {
        const lojasComMeta = [...new Set(metasFiltradas.map(m => m.lojaId))];
        if (lojasComMeta.length === 0) return null;
        return (
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lojasComMeta.map(lojaId => (
              <PainelMetasLoja key={lojaId} lojaId={lojaId} />
            ))}
          </div>
        );
      })()}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Loja *</label>
              <Select value={lojaId} onValueChange={setLojaId}>
                <SelectTrigger><SelectValue placeholder="Selecione a loja" /></SelectTrigger>
                <SelectContent>
                  {lojas.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Mês</label>
                <Select value={mes} onValueChange={setMes}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((nome, i) => <SelectItem key={i} value={String(i + 1)}>{nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Ano</label>
                <Select value={ano} onValueChange={setAno}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Meta Faturamento (R$)</label>
              <Input
                value={metaFaturamento}
                onChange={e => setMetaFaturamento(moedaMask(e.target.value))}
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Meta Acessórios (unidades)</label>
              <Input
                type="number"
                value={metaAcessorios}
                onChange={e => setMetaAcessorios(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Meta Garantia (R$)</label>
              <Input
                value={metaGarantia}
                onChange={e => setMetaGarantia(moedaMask(e.target.value))}
                placeholder="R$ 0,00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CadastrosLayout>
  );
}
