import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AssistenciaLayout } from '@/components/layout/AssistenciaLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  getRetiradaPecasById,
  iniciarDesmonte,
  adicionarPecaRetirada,
  removerPecaRetirada,
  finalizarDesmonte,
  cancelarRetiradaPecas,
  validarCustoRetirada,
  RetiradaPecas
} from '@/utils/retiradaPecasApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { useAuthStore } from '@/store/authStore';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { formatCurrency, parseMoeda } from '@/utils/formatUtils';
import { formatIMEI } from '@/utils/imeiMask';
import { InputComMascara } from '@/components/ui/InputComMascara';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Scissors, 
  Clock, 
  Wrench, 
  CheckCircle, 
  XCircle,
  Plus,
  Trash2,
  AlertTriangle,
  Play,
  Check,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AssistRetiradaPecasDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { obterNomeLoja } = useCadastroStore();
  
  // Marcas de aparelhos disponíveis
  const marcas = ['Apple', 'Samsung', 'Motorola', 'Xiaomi', 'LG', 'Asus'];
  const [retirada, setRetirada] = useState<RetiradaPecas | null>(null);
  const [validacao, setValidacao] = useState({ valido: false, somaPecas: 0, custoAparelho: 0, diferenca: 0 });
  
  // Modal para adicionar peça
  const [showAddPecaModal, setShowAddPecaModal] = useState(false);
  const [novaPeca, setNovaPeca] = useState({
    marca: '',
    nome: '',
    valor: '',
    quantidade: '1'
  });
  
  // Modal de confirmação para ações
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [acaoConfirmacao, setAcaoConfirmacao] = useState<'iniciar' | 'finalizar' | 'cancelar' | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState('');
  const [lojaDestinoPecas, setLojaDestinoPecas] = useState('');
  
  

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = () => {
    if (id) {
      const data = getRetiradaPecasById(id);
      setRetirada(data);
      if (data) {
        setValidacao(validarCustoRetirada(id));
        setLojaDestinoPecas(data.lojaId);
      }
    }
  };

  if (!retirada) {
    return (
      <AssistenciaLayout title="Retirada não encontrada">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Solicitação de retirada não encontrada</p>
          <Button onClick={() => navigate('/os/retirada-pecas')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </AssistenciaLayout>
    );
  }

  const podeEditar = retirada.status === 'Pendente Assistência' || retirada.status === 'Em Desmonte';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendente Assistência':
        return <Badge className="bg-yellow-500">
          <Clock className="h-3 w-3 mr-1" />
          Pendente Assistência
        </Badge>;
      case 'Em Desmonte':
        return <Badge className="bg-blue-500">
          <Wrench className="h-3 w-3 mr-1" />
          Em Desmonte
        </Badge>;
      case 'Concluída':
        return <Badge className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Concluída
        </Badge>;
      case 'Cancelada':
        return <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelada
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTimelineIcon = (tipo: string) => {
    switch (tipo) {
      case 'solicitacao_retirada_pecas':
        return <Scissors className="h-4 w-4" />;
      case 'desmonte_iniciado':
        return <Play className="h-4 w-4" />;
      case 'pecas_geradas':
        return <Plus className="h-4 w-4" />;
      case 'desmonte_finalizado':
        return <CheckCircle className="h-4 w-4" />;
      case 'desmonte_cancelado':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleAddPeca = () => {
    if (!novaPeca.marca || !novaPeca.nome || !novaPeca.valor) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const valor = parseMoeda(novaPeca.valor);
    if (isNaN(valor) || valor <= 0) {
      toast.error('Valor inválido');
      return;
    }

    const resultado = adicionarPecaRetirada(retirada.id, {
      marca: novaPeca.marca,
      nome: novaPeca.nome,
      valorCustoPeca: valor,
      quantidade: parseInt(novaPeca.quantidade) || 1
    });

    if (resultado.sucesso) {
      toast.success('Peça adicionada');
      setNovaPeca({ marca: '', nome: '', valor: '', quantidade: '1' });
      setShowAddPecaModal(false);
      carregarDados();
    } else {
      toast.error(resultado.mensagem);
    }
  };

  const handleRemoverPeca = (pecaId: string) => {
    const resultado = removerPecaRetirada(retirada.id, pecaId);
    if (resultado.sucesso) {
      toast.success('Peça removida');
      carregarDados();
    } else {
      toast.error(resultado.mensagem);
    }
  };

  const abrirConfirmacao = (acao: 'iniciar' | 'finalizar' | 'cancelar') => {
    setAcaoConfirmacao(acao);
    setTecnicoSelecionado(user?.username || '');
    setMotivoCancelamento('');
    setShowConfirmModal(true);
  };

  const executarAcao = () => {
    if (!user) {
      toast.error('Usuário não identificado');
      return;
    }

    let resultado;

    switch (acaoConfirmacao) {
      case 'iniciar':
        resultado = iniciarDesmonte(retirada.id, user.username);
        if (resultado.sucesso) {
          toast.success('Desmonte iniciado com sucesso');
        }
        break;

      case 'finalizar':
        if (!lojaDestinoPecas) {
          toast.error('Selecione a loja de destino das peças');
          return;
        }
        resultado = finalizarDesmonte(retirada.id, user.username, lojaDestinoPecas);
        if (resultado.sucesso) {
          toast.success(`Desmonte finalizado! ${resultado.pecasGeradas} peça(s) adicionada(s) ao estoque.`);
        }
        break;

      case 'cancelar':
        if (!motivoCancelamento.trim()) {
          toast.error('Informe o motivo do cancelamento');
          return;
        }
        resultado = cancelarRetiradaPecas(retirada.id, user.username, motivoCancelamento);
        if (resultado.sucesso) {
          toast.success('Retirada cancelada. Aparelho reativado no estoque.');
        }
        break;
    }

    if (resultado && !resultado.sucesso) {
      toast.error(resultado.mensagem);
    } else {
      setShowConfirmModal(false);
      carregarDados();
    }
  };

  return (
    <AssistenciaLayout title="Detalhes da Retirada de Peças">
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/os/retirada-pecas')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-orange-500/10">
              <Scissors className="h-8 w-8 text-orange-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{retirada.id}</h2>
              <p className="text-muted-foreground">{retirada.modeloOriginal} • {retirada.corOriginal}</p>
            </div>
          </div>
          {getStatusBadge(retirada.status)}
        </div>

        {/* Card de Prejuízo na Desmontagem */}
        {retirada.pecasRetiradas.length > 0 && validacao.somaPecas < validacao.custoAparelho && (
          <Card className="border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertTriangle className="h-4 w-4" />
                Prejuízo na Desmontagem
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Custo do Aparelho</p>
                    <p className="text-lg font-bold">{formatCurrency(validacao.custoAparelho)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Total Peças</p>
                    <p className="text-lg font-bold">{formatCurrency(validacao.somaPecas)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Prejuízo</p>
                    <p className="text-lg font-bold text-red-600">-{formatCurrency(validacao.custoAparelho - validacao.somaPecas)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações da Solicitação */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Informações do Aparelho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID Aparelho</p>
                  <p className="font-mono font-semibold">{retirada.aparelhoId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IMEI</p>
                  <p className="font-mono font-semibold">{formatIMEI(retirada.imeiOriginal)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Modelo</p>
                  <p className="font-semibold">{retirada.modeloOriginal}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cor</p>
                  <p className="font-semibold">{retirada.corOriginal}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Loja</p>
                  <p className="font-semibold">{obterNomeLoja(retirada.lojaId)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor de Custo</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(retirada.valorCustoAparelho)}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Motivo da Retirada</p>
                <p className="p-3 bg-muted rounded-lg">{retirada.motivo}</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Responsável Solicitação</p>
                  <p className="font-semibold">{retirada.responsavelSolicitacao}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Solicitação</p>
                  <p className="font-semibold">{new Date(retirada.dataSolicitacao).toLocaleString('pt-BR')}</p>
                </div>
                {retirada.tecnicoResponsavel && (
                  <div>
                    <p className="text-sm text-muted-foreground">Técnico Responsável</p>
                    <p className="font-semibold">{retirada.tecnicoResponsavel}</p>
                  </div>
                )}
                {retirada.dataConclusao && (
                  <div>
                    <p className="text-sm text-muted-foreground">Data Conclusão</p>
                    <p className="font-semibold">{new Date(retirada.dataConclusao).toLocaleString('pt-BR')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {retirada.status === 'Pendente Assistência' && (
                <Button 
                  className="w-full bg-blue-500 hover:bg-blue-600"
                  onClick={() => abrirConfirmacao('iniciar')}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Desmonte
                </Button>
              )}

              {retirada.status === 'Em Desmonte' && (
                <Button 
                  className="w-full bg-green-500 hover:bg-green-600"
                  onClick={() => abrirConfirmacao('finalizar')}
                  disabled={retirada.pecasRetiradas.length === 0}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Finalizar Desmonte
                </Button>
              )}

              {podeEditar && (
                <Button 
                  variant="destructive"
                  className="w-full"
                  onClick={() => abrirConfirmacao('cancelar')}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar Retirada
                </Button>
              )}

              {!podeEditar && (
                <p className="text-sm text-center text-muted-foreground">
                  {retirada.status === 'Concluída' ? 'Desmonte finalizado' : 'Retirada cancelada'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Relação de Peças */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Relação de Peças</CardTitle>
            {podeEditar && (
              <Button onClick={() => setShowAddPecaModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Peça
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {/* Validação de Custo */}
            <div className={cn(
              "mb-4 p-4 rounded-lg border",
              validacao.valido 
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
            )}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {validacao.valido ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  <span className={cn("font-medium", validacao.valido ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400")}>
                    {validacao.valido ? 'Validação OK' : 'Desmonte com prejuízo'}
                  </span>
                </div>
                <div className="text-sm space-x-4">
                  <span>Custo Aparelho: <strong>{formatCurrency(validacao.custoAparelho)}</strong></span>
                  <span>Soma Peças: <strong>{formatCurrency(validacao.somaPecas)}</strong></span>
                  <span className={cn(validacao.valido ? "text-green-600" : "text-red-600")}>
                    Diferença: <strong>{formatCurrency(validacao.diferenca)}</strong>
                  </span>
                </div>
              </div>
              {!validacao.valido && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  O valor total das peças é inferior ao custo do aparelho ({formatCurrency(validacao.custoAparelho)}). O desmonte será finalizado com prejuízo.
                </p>
              )}
            </div>

            {/* Tabela de Peças */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marca</TableHead>
                  <TableHead>Nome da Peça</TableHead>
                  <TableHead>Valor Unitário</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Valor Total</TableHead>
                  {podeEditar && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {retirada.pecasRetiradas.map(peca => (
                  <TableRow key={peca.id}>
                    <TableCell>{peca.marca}</TableCell>
                    <TableCell className="font-medium">{peca.nome}</TableCell>
                    <TableCell>{formatCurrency(peca.valorCustoPeca)}</TableCell>
                    <TableCell>{peca.quantidade}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(peca.valorCustoPeca * peca.quantidade)}</TableCell>
                    {podeEditar && (
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoverPeca(peca.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {retirada.pecasRetiradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={podeEditar ? 6 : 5} className="text-center py-8 text-muted-foreground">
                      Nenhuma peça adicionada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timeline da Retirada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {retirada.timeline.map((entry) => (
                <div 
                  key={entry.id}
                  className="flex gap-4 p-4 bg-muted/30 rounded-lg border-l-4 border-primary"
                >
                  <div className="p-2 rounded-full bg-primary/10">
                    {getTimelineIcon(entry.tipo)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold">{entry.titulo}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.dataHora).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{entry.descricao}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Responsável: {entry.responsavel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Logs de Auditoria */}
        {retirada.logsAuditoria && retirada.logsAuditoria.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Logs de Auditoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Detalhes da Alteração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retirada.logsAuditoria.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(log.dataHora).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="font-medium">{log.usuario}</TableCell>
                      <TableCell className="text-sm">{log.detalhes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal Adicionar Peça */}
      <Dialog open={showAddPecaModal} onOpenChange={setShowAddPecaModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Peça</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Marca *</Label>
              <Select value={novaPeca.marca} onValueChange={v => setNovaPeca({...novaPeca, marca: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a marca..." />
                </SelectTrigger>
                <SelectContent>
                  {marcas.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nome da Peça *</Label>
              <Input
                placeholder="Ex: Tela, Bateria, Placa..."
                value={novaPeca.nome}
                onChange={e => setNovaPeca({...novaPeca, nome: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor da Peça *</Label>
                <InputComMascara
                  mascara="moeda"
                  value={novaPeca.valor}
                  onChange={(formatted) => setNovaPeca({...novaPeca, valor: formatted})}
                  placeholder="R$ 0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={novaPeca.quantidade}
                  onChange={e => setNovaPeca({...novaPeca, quantidade: e.target.value})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPecaModal(false)}>Cancelar</Button>
            <Button onClick={handleAddPeca}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {acaoConfirmacao === 'iniciar' && 'Iniciar Desmonte'}
              {acaoConfirmacao === 'finalizar' && 'Finalizar Desmonte'}
              {acaoConfirmacao === 'cancelar' && 'Cancelar Retirada'}
            </DialogTitle>
            <DialogDescription>
              {acaoConfirmacao === 'iniciar' && 'Você está prestes a iniciar o desmonte deste aparelho.'}
              {acaoConfirmacao === 'finalizar' && 'Confirme a finalização do desmonte e geração das peças.'}
              {acaoConfirmacao === 'cancelar' && 'O aparelho será reativado no estoque.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {acaoConfirmacao === 'finalizar' && (
              <div className="space-y-2">
                <Label>Loja de Destino das Peças *</Label>
                <AutocompleteLoja
                  value={lojaDestinoPecas}
                  onChange={setLojaDestinoPecas}
                  apenasLojasTipoLoja
                  placeholder="Selecione a loja..."
                />
              </div>
            )}

            {acaoConfirmacao === 'cancelar' && (
              <div className="space-y-2">
                <Label>Motivo do Cancelamento *</Label>
                <Textarea
                  placeholder="Informe o motivo..."
                  value={motivoCancelamento}
                  onChange={e => setMotivoCancelamento(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="font-semibold">{retirada.modeloOriginal}</p>
              <p className="text-sm text-muted-foreground">IMEI: {formatIMEI(retirada.imeiOriginal)}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Voltar
            </Button>
            <Button 
              onClick={executarAcao}
              variant={acaoConfirmacao === 'cancelar' ? 'destructive' : 'default'}
              className={acaoConfirmacao === 'iniciar' ? 'bg-blue-500 hover:bg-blue-600' : acaoConfirmacao === 'finalizar' ? 'bg-green-500 hover:bg-green-600' : ''}
            >
              {acaoConfirmacao === 'iniciar' && 'Confirmar Início'}
              {acaoConfirmacao === 'finalizar' && 'Confirmar Finalização'}
              {acaoConfirmacao === 'cancelar' && 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AssistenciaLayout>
  );
}
