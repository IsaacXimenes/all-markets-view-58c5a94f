import { useState, useMemo } from 'react';
import { CadastrosLayout } from '@/components/layout/CadastrosLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pencil, Trash2, Target, PlusCircle } from 'lucide-react';
import { useCadastroStore } from '@/store/cadastroStore';
import { getMetas, addMeta, updateMeta, deleteMeta, getMetaByLojaEMes, MetaLoja } from '@/utils/metasApi';
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
  const [lojaIdModal, setLojaIdModal] = useState('');

  // Filtros (apenas Mês e Ano)
  const [filtroMes, setFiltroMes] = useState(String(new Date().getMonth() + 1));
  const [filtroAno, setFiltroAno] = useState(String(anoAtual));

  // Form state
  const [metaFaturamento, setMetaFaturamento] = useState('');
  const [metaAcessorios, setMetaAcessorios] = useState('');
  const [metaGarantia, setMetaGarantia] = useState('');

  // Montar dados da tabela: uma linha por loja
  const linhasTabela = useMemo(() => {
    return lojas.map(loja => {
      const meta = getMetaByLojaEMes(loja.id, Number(filtroMes), Number(filtroAno));
      return { loja, meta };
    });
  }, [lojas, filtroMes, filtroAno, metas]);

  const lojasComMeta = useMemo(() => {
    return linhasTabela.filter(l => l.meta).map(l => l.loja.id);
  }, [linhasTabela]);

  const resetForm = () => {
    setMetaFaturamento('');
    setMetaAcessorios('');
    setMetaGarantia('');
    setEditando(null);
    setLojaIdModal('');
  };

  const abrirDefinir = (lojaId: string) => {
    resetForm();
    setLojaIdModal(lojaId);
    setModalOpen(true);
  };

  const abrirEditar = (meta: MetaLoja) => {
    setEditando(meta);
    setLojaIdModal(meta.lojaId);
    setMetaFaturamento(formatarMoeda(meta.metaFaturamento));
    setMetaAcessorios(String(meta.metaAcessorios));
    setMetaGarantia(formatarMoeda(meta.metaGarantia));
    setModalOpen(true);
  };

  const handleSalvar = () => {
    const data = {
      lojaId: lojaIdModal,
      mes: Number(filtroMes),
      ano: Number(filtroAno),
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
      {/* Filtros: Mês e Ano */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="min-w-[160px]">
              <label className="text-sm font-medium mb-1 block">Mês</label>
              <Select value={filtroMes} onValueChange={setFiltroMes}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MESES.map((nome, i) => <SelectItem key={i} value={String(i + 1)}>{nome}</SelectItem>)}
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
          </div>
        </CardContent>
      </Card>

      {/* Tabela: uma linha por loja */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead className="text-right">Meta Faturamento</TableHead>
                  <TableHead className="text-right">Meta Acessórios (un.)</TableHead>
                  <TableHead className="text-right">Meta Garantia</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasTabela.map(({ loja, meta }) => (
                  <TableRow key={loja.id}>
                    <TableCell className="font-medium">{loja.nome}</TableCell>
                    <TableCell className="text-right">
                      {meta ? formatarMoeda(meta.metaFaturamento) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {meta ? meta.metaAcessorios : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {meta ? formatarMoeda(meta.metaGarantia) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {meta ? (
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => abrirEditar(meta)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleExcluir(meta.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => abrirDefinir(loja.id)}>
                          <PlusCircle className="h-4 w-4 mr-1" />
                          Definir
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Painéis visuais de metas */}
      {lojasComMeta.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lojasComMeta.map(lojaId => (
            <PainelMetasLoja key={lojaId} lojaId={lojaId} />
          ))}
        </div>
      )}

      {/* Modal sem campo Loja */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editando ? 'Editar Meta' : 'Definir Meta'} — {obterNomeLoja(lojaIdModal)} ({MESES[Number(filtroMes) - 1]} {filtroAno})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
