import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VendasLayout } from '@/components/layout/VendasLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CheckCircle2, Clock, Send, User, Package, CreditCard, TrendingUp, FileText, DollarSign } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getVendaConferenciaById, validarVendaGestor, getGestores, formatCurrency, VendaConferencia, StatusConferencia } from '@/utils/conferenciaGestorApi';

export default function VendasConferenciaGestorDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venda, setVenda] = useState<VendaConferencia | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [gestorSelecionado, setGestorSelecionado] = useState('');
  const [observacao, setObservacao] = useState('');
  const [gestores, setGestores] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      const data = getVendaConferenciaById(id);
      setVenda(data);
      const gestoresList = getGestores();
      setGestores(gestoresList.length > 0 ? gestoresList.map(g => ({ id: g.id, nome: g.nome })) : [
        { id: 'COL-001', nome: 'Lucas Mendes' },
        { id: 'COL-002', nome: 'Fernanda Lima' }
      ]);
    }
  }, [id]);

  const handleValidar = () => {
    if (!gestorSelecionado || !venda) return;
    setLoading(true);
    const gestor = gestores.find(g => g.id === gestorSelecionado);
    const result = validarVendaGestor(venda.id, gestorSelecionado, gestor?.nome || '', observacao);
    
    if (result) {
      toast({
        title: "Venda Validada!",
        description: `Venda ${venda.vendaId} conferida e enviada ao Financeiro.`,
      });
      setShowModal(false);
      navigate('/vendas/conferencia-gestor');
    }
    setLoading(false);
  };

  if (!venda) {
    return (
      <VendasLayout title="Detalhes da Conferência">
        <div className="text-center py-12 text-muted-foreground">Venda não encontrada.</div>
      </VendasLayout>
    );
  }

  const getTimelineIcon = (tipo: string) => {
    switch (tipo) {
      case 'registro': return <FileText className="h-4 w-4" />;
      case 'conferencia_gestor': return <CheckCircle2 className="h-4 w-4" />;
      case 'envio_financeiro': return <Send className="h-4 w-4" />;
      case 'finalizado': return <DollarSign className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: StatusConferencia) => {
    switch (status) {
      case 'Conferência - Gestor':
        return <Badge variant="destructive">Conferência - Gestor</Badge>;
      case 'Conferência - Financeiro':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Conferência - Financeiro</Badge>;
      case 'Concluído':
        return <Badge className="bg-green-600 hover:bg-green-700 text-white">Concluído</Badge>;
    }
  };

  return (
    <VendasLayout title="Detalhes da Conferência">
      <Button variant="ghost" onClick={() => navigate('/vendas/conferencia-gestor')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info da Venda */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Venda {venda.vendaId}</CardTitle>
              {getStatusBadge(venda.status)}
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-muted-foreground">Data:</span><br/><strong>{new Date(venda.dataRegistro).toLocaleString('pt-BR')}</strong></div>
              <div><span className="text-muted-foreground">Loja:</span><br/><strong>{venda.lojaNome}</strong></div>
              <div><span className="text-muted-foreground">Responsável:</span><br/><strong>{venda.vendedorNome}</strong></div>
              <div><span className="text-muted-foreground">Tipo:</span><br/><Badge variant="outline">{venda.tipoVenda}</Badge></div>
            </CardContent>
          </Card>

          {/* Cliente */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Cliente</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">Nome:</span><br/><strong>{venda.clienteNome}</strong></div>
              <div><span className="text-muted-foreground">CPF:</span><br/><strong>{venda.dadosVenda.clienteCpf || '-'}</strong></div>
              <div><span className="text-muted-foreground">Telefone:</span><br/><strong>{venda.dadosVenda.clienteTelefone || '-'}</strong></div>
            </CardContent>
          </Card>

          {/* Itens */}
          {(venda.dadosVenda.itens?.length || venda.dadosVenda.acessorios?.length) && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Itens</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>IMEI/Qtd</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {venda.dadosVenda.itens?.map((item: any, i: number) => (
                      <TableRow key={i}><TableCell>{item.produto}</TableCell><TableCell>{item.imei}</TableCell><TableCell className="text-right">{formatCurrency(item.valorVenda)}</TableCell></TableRow>
                    ))}
                    {venda.dadosVenda.acessorios?.map((acc: any, i: number) => (
                      <TableRow key={`acc-${i}`}><TableCell>{acc.nome}</TableCell><TableCell>{acc.quantidade}x</TableCell><TableCell className="text-right">{formatCurrency(acc.valorUnitario * acc.quantidade)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Trade-Ins */}
          {venda.dadosVenda.tradeIns && venda.dadosVenda.tradeIns.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Trade-In</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Modelo</TableHead><TableHead>IMEI</TableHead><TableHead className="text-right">Abatimento</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {venda.dadosVenda.tradeIns.map((ti: any, i: number) => (
                      <TableRow key={i}><TableCell>{ti.modelo}</TableCell><TableCell>{ti.imei}</TableCell><TableCell className="text-right text-orange-600">-{formatCurrency(ti.valorAbatimento)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Pagamentos */}
          {venda.dadosVenda.pagamentos && venda.dadosVenda.pagamentos.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Pagamentos</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Meio</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {venda.dadosVenda.pagamentos.map((pag: any, i: number) => (
                      <TableRow key={i}><TableCell>{pag.meioPagamento}</TableCell><TableCell className="text-right">{formatCurrency(pag.valor)}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          {/* Resumo Financeiro */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Resumo</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span>Subtotal:</span><strong>{formatCurrency(venda.dadosVenda.subtotal)}</strong></div>
              {venda.dadosVenda.totalTradeIn > 0 && <div className="flex justify-between"><span>Trade-In:</span><strong className="text-orange-600">-{formatCurrency(venda.dadosVenda.totalTradeIn)}</strong></div>}
              <Separator />
              <div className="flex justify-between text-base"><span>Total:</span><strong className="text-primary">{formatCurrency(venda.dadosVenda.total)}</strong></div>
              <div className="flex justify-between"><span>Lucro:</span><strong className={venda.dadosVenda.lucro >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(venda.dadosVenda.lucro)}</strong></div>
              <div className="flex justify-between"><span>Margem:</span><strong>{venda.dadosVenda.margem.toFixed(2)}%</strong></div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {venda.timeline.map((evento, i) => (
                  <div key={evento.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`p-2 rounded-full ${
                        evento.tipo === 'finalizado' 
                          ? 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400' 
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {getTimelineIcon(evento.tipo)}
                      </div>
                      {i < venda.timeline.length - 1 && <div className="w-0.5 h-full bg-border mt-2" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-medium text-sm">{evento.titulo}</p>
                      <p className="text-xs text-muted-foreground">{new Date(evento.dataHora).toLocaleString('pt-BR')}</p>
                      {evento.responsavel && <p className="text-xs">Por: {evento.responsavel}</p>}
                      {evento.observacao && <p className="text-xs italic mt-1">"{evento.observacao}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Botão Validar */}
          {venda.status === 'Conferência - Gestor' && (
            <Button className="w-full" size="lg" onClick={() => setShowModal(true)}>
              <CheckCircle2 className="h-5 w-5 mr-2" /> Validar Venda
            </Button>
          )}
        </div>
      </div>

      {/* Modal de Validação */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Validar Venda {venda.vendaId}</DialogTitle>
            <DialogDescription>Confirme a validação desta venda para enviar ao Financeiro.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Gestor Responsável *</label>
              <Select value={gestorSelecionado} onValueChange={setGestorSelecionado}>
                <SelectTrigger><SelectValue placeholder="Selecione o gestor" /></SelectTrigger>
                <SelectContent>
                  {gestores.map(g => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Observação (opcional)</label>
              <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Adicione observações se necessário..." />
            </div>
            <div className="text-sm text-muted-foreground">Data/Hora: {new Date().toLocaleString('pt-BR')}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleValidar} disabled={!gestorSelecionado || loading}>Confirmar Validação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </VendasLayout>
  );
}
