import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  ArrowLeft, Shield, User, Package, Phone, Mail, Clock, 
  FileText, CheckCircle, AlertCircle, Smartphone, Wrench, ArrowRightLeft,
  Plus, Search
} from 'lucide-react';
import { 
  getGarantiaById, getTratativasByGarantiaId, getTimelineByGarantiaId,
  calcularStatusExpiracao, addTratativa, addTimelineEntry, updateGarantia
} from '@/utils/garantiasApi';
import { getProdutos, updateProduto, addMovimentacao, Produto } from '@/utils/estoqueApi';
import { getLojas } from '@/utils/cadastrosApi';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function GarantiaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const lojas = getLojas();
  
  const garantia = id ? getGarantiaById(id) : null;
  const tratativas = id ? getTratativasByGarantiaId(id) : [];
  const timeline = id ? getTimelineByGarantiaId(id) : [];
  
  // Estados do formulário de tratativa
  const [tipoTratativa, setTipoTratativa] = useState<string>('');
  const [descricaoTratativa, setDescricaoTratativa] = useState('');
  const [showModalAparelho, setShowModalAparelho] = useState(false);
  const [aparelhoSelecionado, setAparelhoSelecionado] = useState<Produto | null>(null);
  const [buscaAparelho, setBuscaAparelho] = useState('');
  
  const statusExpiracao = useMemo(() => {
    if (!garantia) return null;
    return calcularStatusExpiracao(garantia.dataFimGarantia);
  }, [garantia]);
  
  // Lista de aparelhos disponíveis para empréstimo/troca
  const aparelhosDisponiveis = useMemo(() => {
    const produtos = getProdutos();
    return produtos.filter(p => 
      p.quantidade > 0 && 
      (buscaAparelho === '' || 
        p.imei?.toLowerCase().includes(buscaAparelho.toLowerCase()) ||
        p.modelo.toLowerCase().includes(buscaAparelho.toLowerCase()))
    );
  }, [buscaAparelho]);
  
  const getLojaName = (lojaId: string) => lojas.find(l => l.id === lojaId)?.nome || lojaId;
  
  const getTipoTimeline = (tipo: string) => {
    switch (tipo) {
      case 'Direcionado Apple': return 'tratativa';
      case 'Encaminhado Assistência': return 'os_criada';
      case 'Assistência + Empréstimo': return 'emprestimo';
      case 'Troca Direta': return 'troca';
      default: return 'tratativa';
    }
  };

  const getTituloTimeline = (tipo: string) => {
    switch (tipo) {
      case 'Direcionado Apple': return 'Cliente Direcionado para Apple';
      case 'Encaminhado Assistência': return 'Aparelho Encaminhado para Assistência';
      case 'Assistência + Empréstimo': return 'Assistência + Aparelho Emprestado';
      case 'Troca Direta': return 'Troca Direta Realizada';
      default: return 'Tratativa Registrada';
    }
  };
  
  const handleRegistrarTratativa = () => {
    if (!garantia) return;
    
    // Validações
    if (!tipoTratativa || !descricaoTratativa) {
      toast.error('Preencha tipo e descrição da tratativa');
      return;
    }
    
    if ((tipoTratativa === 'Assistência + Empréstimo' || tipoTratativa === 'Troca Direta') && !aparelhoSelecionado) {
      toast.error('Selecione um aparelho para esta tratativa');
      return;
    }

    // Criar tratativa
    addTratativa({
      garantiaId: garantia.id,
      tipo: tipoTratativa as 'Direcionado Apple' | 'Encaminhado Assistência' | 'Assistência + Empréstimo' | 'Troca Direta',
      dataHora: new Date().toISOString(),
      usuarioId: 'COL-001',
      usuarioNome: 'Usuário Sistema',
      descricao: descricaoTratativa,
      aparelhoEmprestadoId: tipoTratativa === 'Assistência + Empréstimo' ? aparelhoSelecionado?.id : undefined,
      aparelhoEmprestadoModelo: tipoTratativa === 'Assistência + Empréstimo' ? aparelhoSelecionado?.modelo : undefined,
      aparelhoEmprestadoImei: tipoTratativa === 'Assistência + Empréstimo' ? aparelhoSelecionado?.imei : undefined,
      aparelhoTrocaId: tipoTratativa === 'Troca Direta' ? aparelhoSelecionado?.id : undefined,
      aparelhoTrocaModelo: tipoTratativa === 'Troca Direta' ? aparelhoSelecionado?.modelo : undefined,
      aparelhoTrocaImei: tipoTratativa === 'Troca Direta' ? aparelhoSelecionado?.imei : undefined,
      osId: tipoTratativa.includes('Assistência') ? 'OS-AUTO' : undefined,
      status: 'Em Andamento'
    });

    // Adicionar entrada na timeline
    addTimelineEntry({
      garantiaId: garantia.id,
      dataHora: new Date().toISOString(),
      tipo: getTipoTimeline(tipoTratativa),
      titulo: getTituloTimeline(tipoTratativa),
      descricao: descricaoTratativa,
      usuarioId: 'COL-001',
      usuarioNome: 'Usuário Sistema'
    });

    // Atualizar status da garantia
    updateGarantia(garantia.id, { status: 'Em Tratativa' });

    // Ações específicas por tipo
    if (tipoTratativa === 'Assistência + Empréstimo' && aparelhoSelecionado) {
      updateProduto(aparelhoSelecionado.id, { quantidade: 0 });
      addMovimentacao({
        data: new Date().toISOString(),
        produto: aparelhoSelecionado.modelo,
        imei: aparelhoSelecionado.imei || '',
        quantidade: 1,
        origem: aparelhoSelecionado.loja,
        destino: 'Empréstimo - Garantia',
        responsavel: 'Usuário Sistema',
        motivo: `Empréstimo garantia ${garantia.id}`
      });
    }

    if (tipoTratativa === 'Troca Direta' && aparelhoSelecionado) {
      updateProduto(aparelhoSelecionado.id, { quantidade: 0 });
      addMovimentacao({
        data: new Date().toISOString(),
        produto: aparelhoSelecionado.modelo,
        imei: aparelhoSelecionado.imei || '',
        quantidade: 1,
        origem: aparelhoSelecionado.loja,
        destino: 'Saída - Troca Garantia',
        responsavel: 'Usuário Sistema',
        motivo: `Troca direta garantia ${garantia.id}`
      });
    }

    toast.success('Tratativa registrada com sucesso!');
    setTipoTratativa('');
    setDescricaoTratativa('');
    setAparelhoSelecionado(null);
    
    // Recarregar página
    window.location.reload();
  };
  
  const handleSelecionarAparelho = (produto: Produto) => {
    setAparelhoSelecionado(produto);
    setShowModalAparelho(false);
    setBuscaAparelho('');
  };
  
  const getTimelineIcon = (tipo: string) => {
    switch (tipo) {
      case 'registro_venda': return <FileText className="h-4 w-4" />;
      case 'abertura_garantia': return <Shield className="h-4 w-4" />;
      case 'tratativa': return <Clock className="h-4 w-4" />;
      case 'os_criada': return <Wrench className="h-4 w-4" />;
      case 'emprestimo': return <Smartphone className="h-4 w-4" />;
      case 'devolucao': return <Package className="h-4 w-4" />;
      case 'troca': return <ArrowRightLeft className="h-4 w-4" />;
      case 'conclusao': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };
  
  const getTimelineColor = (tipo: string) => {
    switch (tipo) {
      case 'registro_venda': return 'bg-blue-500';
      case 'abertura_garantia': return 'bg-purple-500';
      case 'tratativa': return 'bg-yellow-500';
      case 'os_criada': return 'bg-orange-500';
      case 'emprestimo': return 'bg-cyan-500';
      case 'devolucao': return 'bg-green-500';
      case 'troca': return 'bg-pink-500';
      case 'conclusao': return 'bg-green-600';
      default: return 'bg-gray-500';
    }
  };

  const precisaAparelho = tipoTratativa === 'Assistência + Empréstimo' || tipoTratativa === 'Troca Direta';

  if (!garantia) {
    return (
      <PageLayout title="Garantia não encontrada">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">A garantia solicitada não foi encontrada.</p>
          <Button onClick={() => navigate('/garantias/historico')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Histórico
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={`Detalhes da Garantia ${garantia.id}`}>
      {/* Botão Voltar */}
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate('/garantias/historico')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dados da Venda Original */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Dados da Venda Original
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID Venda</p>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto"
                    onClick={() => navigate(`/vendas/${garantia.vendaId}`)}
                  >
                    {garantia.vendaId}
                  </Button>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">{format(new Date(garantia.dataInicioGarantia), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Loja</p>
                  <p className="font-medium">{getLojaName(garantia.lojaVenda)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status Garantia</p>
                  <Badge 
                    variant={
                      garantia.status === 'Concluída' ? 'default' :
                      garantia.status === 'Ativa' ? 'secondary' :
                      garantia.status === 'Expirada' ? 'destructive' :
                      'outline'
                    }
                  >
                    {garantia.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Dados do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{garantia.clienteNome}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {garantia.clienteTelefone || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {garantia.clienteEmail || '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Dados do Aparelho */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Dados do Aparelho + Garantia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Modelo</p>
                  <p className="font-medium">{garantia.modelo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IMEI</p>
                  <p className="font-mono text-sm">{garantia.imei}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo Garantia</p>
                  <Badge variant="outline">{garantia.tipoGarantia}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Meses</p>
                  <p className="font-medium">{garantia.mesesGarantia} meses</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Início</p>
                  <p className="font-medium">{format(new Date(garantia.dataInicioGarantia), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Fim</p>
                  <p className="font-medium">{format(new Date(garantia.dataFimGarantia), 'dd/MM/yyyy')}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Status Expiração</p>
                  {statusExpiracao && (
                    <Badge 
                      variant={statusExpiracao.status === 'expirada' ? 'destructive' : 'secondary'}
                      className={
                        statusExpiracao.status === 'urgente' ? 'bg-orange-500 text-white' :
                        statusExpiracao.status === 'ativa' ? 'bg-green-500 text-white' : ''
                      }
                    >
                      {statusExpiracao.mensagem}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Timeline Visual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline Completa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhum evento registrado</p>
              ) : (
                <div className="relative">
                  {/* Linha vertical */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                  
                  <div className="space-y-6">
                    {timeline.map((entry, index) => (
                      <div key={entry.id} className="relative flex gap-4 pl-10">
                        {/* Ícone */}
                        <div className={`absolute left-0 p-2 rounded-full ${getTimelineColor(entry.tipo)} text-white`}>
                          {getTimelineIcon(entry.tipo)}
                        </div>
                        
                        {/* Conteúdo */}
                        <div className="flex-1 bg-muted/30 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{entry.titulo}</h4>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.dataHora), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{entry.descricao}</p>
                          <p className="text-xs text-muted-foreground mt-2">Por: {entry.usuarioNome}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Coluna Lateral */}
        <div className="space-y-6">
          {/* Card Registrar Nova Tratativa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Registrar Nova Tratativa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Tratativa *</Label>
                <Select value={tipoTratativa} onValueChange={setTipoTratativa}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Direcionado Apple">Direcionado Apple</SelectItem>
                    <SelectItem value="Encaminhado Assistência">Encaminhado Assistência</SelectItem>
                    <SelectItem value="Assistência + Empréstimo">Assistência + Empréstimo</SelectItem>
                    <SelectItem value="Troca Direta">Troca Direta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Textarea 
                  placeholder="Descreva a tratativa..."
                  value={descricaoTratativa}
                  onChange={(e) => setDescricaoTratativa(e.target.value)}
                  rows={3}
                />
              </div>
              
              {precisaAparelho && (
                <div className="space-y-2">
                  <Label>
                    {tipoTratativa === 'Assistência + Empréstimo' ? 'Aparelho Empréstimo' : 'Aparelho Troca'} *
                  </Label>
                  {aparelhoSelecionado ? (
                    <div className="p-3 bg-muted/50 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{aparelhoSelecionado.modelo}</p>
                        <p className="text-xs text-muted-foreground">{aparelhoSelecionado.imei}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowModalAparelho(true)}
                      >
                        Trocar
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowModalAparelho(true)}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Selecionar Aparelho
                    </Button>
                  )}
                </div>
              )}
              
              <Separator />
              
              <Button 
                className="w-full" 
                onClick={handleRegistrarTratativa}
                disabled={!tipoTratativa || !descricaoTratativa || (precisaAparelho && !aparelhoSelecionado)}
              >
                Registrar Tratativa
              </Button>
            </CardContent>
          </Card>
          
          {/* Tratativas Registradas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Tratativas Registradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tratativas.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Nenhuma tratativa registrada</p>
              ) : (
                <div className="space-y-4">
                  {tratativas.map(t => (
                    <div key={t.id} className="p-4 bg-muted/30 rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline">{t.tipo}</Badge>
                        <Badge variant={t.status === 'Concluído' ? 'default' : 'secondary'}>
                          {t.status}
                        </Badge>
                      </div>
                      <p className="text-sm">{t.descricao}</p>
                      <div className="text-xs text-muted-foreground">
                        <p>{format(new Date(t.dataHora), 'dd/MM/yyyy HH:mm')}</p>
                        <p>Por: {t.usuarioNome}</p>
                      </div>
                      
                      {t.aparelhoEmprestadoId && (
                        <div className="mt-2 p-2 bg-yellow-500/10 rounded">
                          <p className="text-xs text-yellow-700 dark:text-yellow-400">
                            <Smartphone className="h-3 w-3 inline mr-1" />
                            Emprestado: {t.aparelhoEmprestadoModelo}
                          </p>
                        </div>
                      )}
                      
                      {t.aparelhoTrocaId && (
                        <div className="mt-2 p-2 bg-pink-500/10 rounded">
                          <p className="text-xs text-pink-700 dark:text-pink-400">
                            <ArrowRightLeft className="h-3 w-3 inline mr-1" />
                            Troca: {t.aparelhoTrocaModelo}
                          </p>
                        </div>
                      )}
                      
                      {t.osId && (
                        <div className="mt-2 p-2 bg-orange-500/10 rounded">
                          <p className="text-xs text-orange-700 dark:text-orange-400">
                            <Wrench className="h-3 w-3 inline mr-1" />
                            OS: {t.osId}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Modal Seleção de Aparelho */}
      <Dialog open={showModalAparelho} onOpenChange={setShowModalAparelho}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {tipoTratativa === 'Assistência + Empréstimo' ? 'Selecionar Aparelho para Empréstimo' : 'Selecionar Aparelho para Troca'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por IMEI ou modelo..."
                value={buscaAparelho}
                onChange={(e) => setBuscaAparelho(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Bateria</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aparelhosDisponiveis.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum aparelho disponível encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    aparelhosDisponiveis.slice(0, 20).map(produto => (
                      <TableRow 
                        key={produto.id}
                        className={aparelhoSelecionado?.id === produto.id ? 'bg-primary/10' : ''}
                      >
                        <TableCell className="font-mono text-xs">{produto.imei}</TableCell>
                        <TableCell>{produto.modelo}</TableCell>
                        <TableCell>{produto.cor}</TableCell>
                        <TableCell>{produto.saudeBateria}%</TableCell>
                        <TableCell>{getLojaName(produto.loja)}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant={aparelhoSelecionado?.id === produto.id ? 'default' : 'outline'}
                            onClick={() => handleSelecionarAparelho(produto)}
                          >
                            {aparelhoSelecionado?.id === produto.id ? 'Selecionado' : 'Selecionar'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
