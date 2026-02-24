import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  getNotasParaEstoque, 
  NotaEntrada,
  ProdutoNotaEntrada,
  gerarCreditoFornecedor
} from '@/utils/notaEntradaFluxoApi';
import { 
  criarLoteRevisao, 
  encaminharLoteParaAssistencia,
  ItemRevisao
} from '@/utils/loteRevisaoApi';
import { marcarProdutosEmRevisaoTecnica } from '@/utils/estoqueApi';
import { LoteRevisaoResumo } from '@/components/estoque/LoteRevisaoResumo';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency } from '@/utils/formatUtils';
import { formatIMEI } from '@/utils/imeiMask';
import { 
  AlertTriangle, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Package, 
  Send, 
  Trash2, 
  Wrench,
  Coins
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ItemDefeitoTemp {
  produtoNotaId: string;
  marca: string;
  modelo: string;
  imei?: string;
  motivoAssistencia: string;
  observacao?: string;
  responsavelRegistro: string;
  dataRegistro: string;
}

export default function EstoqueEncaminharAssistencia() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const responsavel = user?.colaborador?.nome || user?.username || 'Usuário Sistema';

  // Pre-select nota from URL param
  const notaIdFromUrl = searchParams.get('nota') || '';

  // State
  const [notaSelecionadaId, setNotaSelecionadaId] = useState<string>(notaIdFromUrl);
  const [itensDefeituosos, setItensDefeituosos] = useState<ItemDefeitoTemp[]>([]);
  
  // Modal de defeito
  const [modalDefeitoOpen, setModalDefeitoOpen] = useState(false);
  const [produtoParaDefeito, setProdutoParaDefeito] = useState<ProdutoNotaEntrada | null>(null);
  const [motivoDefeito, setMotivoDefeito] = useState('');

  // Confirmação em duas etapas - encaminhamento
  const [checkConfirmacao, setCheckConfirmacao] = useState(false);
  const [modalConfirmacaoFinal, setModalConfirmacaoFinal] = useState(false);
  const [checkConfirmacaoFinal, setCheckConfirmacaoFinal] = useState(false);

  // Carregar notas com produtos cadastrados
  const notas = useMemo(() => {
    return getNotasParaEstoque().filter(n => 
      n.produtos.length > 0 && 
      n.status !== 'Criada' &&
      n.atuacaoAtual !== 'Encerrado'
    );
  }, []);

  const notaSelecionada = useMemo(() => {
    return notas.find(n => n.id === notaSelecionadaId) || null;
  }, [notas, notaSelecionadaId]);

  // Produtos disponíveis (que NÃO estão marcados como defeituosos)
  const produtosDisponiveis = useMemo(() => {
    if (!notaSelecionada) return [];
    const idsDefeituosos = itensDefeituosos.map(i => i.produtoNotaId);
    return notaSelecionada.produtos.filter(p => !idsDefeituosos.includes(p.id));
  }, [notaSelecionada, itensDefeituosos]);

  const handleSelecionarNota = (id: string) => {
    setNotaSelecionadaId(id);
    setItensDefeituosos([]);
  };

  const handleAbrirModalDefeito = (produto: ProdutoNotaEntrada) => {
    setProdutoParaDefeito(produto);
    setMotivoDefeito('');
    setCheckConfirmacao(false);
    setModalDefeitoOpen(true);
  };

  const handleConfirmarDefeito = () => {
    if (!produtoParaDefeito || !motivoDefeito.trim()) {
      toast.error('Informe o motivo da assistência');
      return;
    }
    if (!checkConfirmacao) {
      toast.error('Confirme a marcação na caixa de seleção');
      return;
    }

    const novoItem: ItemDefeitoTemp = {
      produtoNotaId: produtoParaDefeito.id,
      marca: produtoParaDefeito.marca,
      modelo: produtoParaDefeito.modelo,
      imei: produtoParaDefeito.imei,
      motivoAssistencia: motivoDefeito.trim(),
      responsavelRegistro: responsavel,
      dataRegistro: new Date().toISOString()
    };

    setItensDefeituosos(prev => [...prev, novoItem]);
    setModalDefeitoOpen(false);
    toast.success(`${produtoParaDefeito.modelo} marcado como defeituoso`);
  };

  const handleRemoverDefeito = (produtoNotaId: string) => {
    setItensDefeituosos(prev => prev.filter(i => i.produtoNotaId !== produtoNotaId));
  };

  const handleEncaminhar = () => {
    if (itensDefeituosos.length === 0) {
      toast.error('Nenhum aparelho marcado para assistência');
      return;
    }
    setCheckConfirmacaoFinal(false);
    setModalConfirmacaoFinal(true);
  };

  const handleConfirmarEncaminhamento = () => {
    if (!checkConfirmacaoFinal) {
      toast.error('Confirme o encaminhamento na caixa de seleção');
      return;
    }

    // Criar lote de revisão
    const lote = criarLoteRevisao(
      notaSelecionadaId,
      itensDefeituosos.map(item => ({
        produtoNotaId: item.produtoNotaId,
        marca: item.marca,
        modelo: item.modelo,
        imei: item.imei,
        motivoAssistencia: item.motivoAssistencia,
        responsavelRegistro: item.responsavelRegistro,
        dataRegistro: item.dataRegistro
      })),
      responsavel
    );

    if (!lote) {
      toast.error('Erro ao criar lote de revisão');
      return;
    }

    // Encaminhar para assistência (gera OS automaticamente)
    const loteEncaminhado = encaminharLoteParaAssistencia(lote.id, responsavel);

    if (!loteEncaminhado) {
      toast.error('Erro ao encaminhar lote para assistência');
      return;
    }

    // Marcar produtos como Em Revisão Técnica no estoque
    const imeisEncaminhados = itensDefeituosos
      .filter(item => item.imei)
      .map(item => item.imei!);
    if (imeisEncaminhados.length > 0) {
      marcarProdutosEmRevisaoTecnica(imeisEncaminhados, lote.id);
    }

    // Geração automática de Vale-Crédito para notas antecipadas
    if (notaSelecionada?.tipoPagamento === 'Pagamento 100% Antecipado') {
      const valorTotalDefeituosos = itensDefeituosos.reduce((acc, item) => {
        const produtoOriginal = notaSelecionada.produtos.find(p => p.id === item.produtoNotaId);
        return acc + (produtoOriginal?.custoTotal || 0);
      }, 0);
      
      if (valorTotalDefeituosos > 0) {
        const credito = gerarCreditoFornecedor(
          notaSelecionada.fornecedor,
          valorTotalDefeituosos,
          notaSelecionada.id,
          `Vale-Crédito por ${itensDefeituosos.length} aparelho(s) defeituoso(s) da nota ${notaSelecionada.numeroNota}`
        );
        toast.success(`Vale-Crédito gerado: ${formatCurrency(credito.valor)} para ${notaSelecionada.fornecedor}`, {
          icon: <Coins className="h-4 w-4" />,
          duration: 6000
        });
      }
    }

    toast.success(
      `Lote ${loteEncaminhado.id} criado — ${loteEncaminhado.itens.length} aparelho(s) encaminhado(s) para Análise de Tratativas`
    );

    setModalConfirmacaoFinal(false);
    navigate('/estoque/notas-pendencias');
  };

  return (
    <EstoqueLayout title="Encaminhar Nota para Assistência">
      <div className="space-y-6">
        {/* Voltar */}
        <Button variant="ghost" onClick={() => navigate('/estoque/notas-pendencias')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Notas de Entrada
        </Button>

        {/* Seletor de Nota */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Selecionar Nota de Entrada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-lg">
              <Label>Nota de Entrada</Label>
              <Select value={notaSelecionadaId} onValueChange={handleSelecionarNota}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma nota..." />
                </SelectTrigger>
                <SelectContent>
                  {notas.map(n => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.numeroNota} - {n.fornecedor} - {format(new Date(n.dataCriacao), 'dd/MM/yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {notaSelecionada && (
          <>
            {/* Quadro 1: Relação Original da Nota */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Quadro 1 — Relação Original da Nota ({produtosDisponiveis.length} produtos)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {produtosDisponiveis.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Todos os produtos foram marcados como defeituosos
                  </p>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Marca</TableHead>
                          <TableHead>Modelo</TableHead>
                          <TableHead>IMEI</TableHead>
                          <TableHead>Cor</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Custo Unit.</TableHead>
                          <TableHead>Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {produtosDisponiveis.map(p => (
                          <TableRow key={p.id}>
                            <TableCell>{p.marca}</TableCell>
                            <TableCell className="font-medium">{p.modelo}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {p.imei ? formatIMEI(p.imei) : '-'}
                            </TableCell>
                            <TableCell>{p.cor || '-'}</TableCell>
                            <TableCell>
                              {p.categoria ? (
                                <Badge variant={p.categoria === 'Novo' ? 'default' : 'secondary'}>
                                  {p.categoria}
                                </Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell>{formatCurrency(p.custoUnitario)}</TableCell>
                            <TableCell>
                              {p.categoria === 'Novo' ? (
                                <Badge variant="secondary" className="text-xs">Novo — sem defeito</Badge>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => handleAbrirModalDefeito(p)}
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Reportar Defeito
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quadro 2: Produtos para Assistência */}
            <Card className={itensDefeituosos.length > 0 ? 'border-primary/30' : ''}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Quadro 2 — Relação de Produtos para Assistência ({itensDefeituosos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {itensDefeituosos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum produto marcado para assistência ainda. Use "Reportar Defeito" no Quadro 1.
                  </p>
                ) : (
                  <>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Marca</TableHead>
                            <TableHead>Modelo</TableHead>
                            <TableHead>IMEI</TableHead>
                            <TableHead>Motivo da Assistência</TableHead>
                            <TableHead>Responsável</TableHead>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead>Ação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itensDefeituosos.map(item => (
                            <TableRow key={item.produtoNotaId}>
                              <TableCell>{item.marca}</TableCell>
                              <TableCell className="font-medium">{item.modelo}</TableCell>
                              <TableCell className="font-mono text-xs">
                                {item.imei ? formatIMEI(item.imei) : '-'}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">{item.motivoAssistencia}</TableCell>
                              <TableCell>{item.responsavelRegistro}</TableCell>
                              <TableCell className="text-xs">
                                {format(new Date(item.dataRegistro), 'dd/MM/yyyy HH:mm')}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleRemoverDefeito(item.produtoNotaId)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Botão Encaminhar */}
                    <div className="flex justify-end mt-6">
                      <Button 
                        onClick={handleEncaminhar}
                        className="gap-2"
                      >
                        <Send className="h-4 w-4" />
                        Encaminhar para Assistência ({itensDefeituosos.length} aparelhos)
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Modal: Registro de Defeito */}
        <Dialog open={modalDefeitoOpen} onOpenChange={setModalDefeitoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reportar Defeito</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Modelo</Label>
                  <p className="font-medium">{produtoParaDefeito?.marca} {produtoParaDefeito?.modelo}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">IMEI</Label>
                  <p className="font-mono text-xs">
                    {produtoParaDefeito?.imei ? formatIMEI(produtoParaDefeito.imei) : 'N/A'}
                  </p>
                </div>
              </div>

              <div>
                <Label>Motivo da Assistência *</Label>
                <Textarea
                  value={motivoDefeito}
                  onChange={e => setMotivoDefeito(e.target.value)}
                  placeholder="Descreva o defeito encontrado..."
                  className={!motivoDefeito.trim() ? 'border-destructive' : ''}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Data/Hora do Registro</Label>
                  <p>{format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Responsável</Label>
                  <p>{responsavel}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 border rounded-md p-3 bg-muted/30">
                <Checkbox
                  checked={checkConfirmacao}
                  onCheckedChange={(checked) => setCheckConfirmacao(checked as boolean)}
                />
                <Label className="text-sm cursor-pointer">
                  Confirmo que o defeito foi verificado e este aparelho deve ser encaminhado para assistência
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalDefeitoOpen(false)}>Cancelar</Button>
              <Button 
                onClick={handleConfirmarDefeito}
                disabled={!motivoDefeito.trim() || !checkConfirmacao}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirmar Defeito
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Confirmação Final de Encaminhamento */}
        <Dialog open={modalConfirmacaoFinal} onOpenChange={setModalConfirmacaoFinal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Encaminhamento para Assistência</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted/30 rounded-md p-4 space-y-2 text-sm">
                <p><strong>Nota:</strong> {notaSelecionada?.numeroNota}</p>
                <p><strong>Fornecedor:</strong> {notaSelecionada?.fornecedor}</p>
                <p><strong>Aparelhos para assistência:</strong> {itensDefeituosos.length}</p>
                <p><strong>Responsável:</strong> {responsavel}</p>
              </div>

              <div className="bg-primary/5 rounded-md p-4 text-sm">
                <p className="font-medium mb-1">O que será feito:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Um Lote de Revisão (REV-NOTA-XXXXX) será criado</li>
                  <li>{itensDefeituosos.length} Ordem(s) de Serviço será(ão) gerada(s) automaticamente</li>
                  <li>Todas as OS terão origem "Estoque"</li>
                  <li>A descrição conterá "Nota de Entrada - {notaSelecionada?.numeroNota}"</li>
                </ul>
              </div>

              <div className="flex items-center gap-2 border rounded-md p-3 bg-muted/30">
                <Checkbox
                  checked={checkConfirmacaoFinal}
                  onCheckedChange={(checked) => setCheckConfirmacaoFinal(checked as boolean)}
                />
                <Label className="text-sm cursor-pointer">
                  Confirmo o encaminhamento de {itensDefeituosos.length} aparelho(s) para o módulo de Assistência
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalConfirmacaoFinal(false)}>Cancelar</Button>
              <Button 
                onClick={handleConfirmarEncaminhamento}
                disabled={!checkConfirmacaoFinal}
              >
                <Send className="h-4 w-4 mr-2" />
                Confirmar Encaminhamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </EstoqueLayout>
  );
}
