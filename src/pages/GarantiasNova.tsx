import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GarantiasLayout } from '@/components/layout/GarantiasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Search, Eye, Shield, AlertTriangle, AlertCircle, CheckCircle, 
  Clock, User, Package, Phone, Mail, FileText, History
} from 'lucide-react';
import { getVendas, Venda } from '@/utils/vendasApi';
import { getLojas, getColaboradores } from '@/utils/cadastrosApi';
import { 
  getGarantias, getGarantiasByVendaId, addGarantia, updateGarantia,
  addTratativa, addTimelineEntry, getTratativasByGarantiaId,
  verificarTratativaAtivaByIMEI, calcularStatusExpiracao,
  GarantiaItem
} from '@/utils/garantiasApi';
import { format } from 'date-fns';

export default function GarantiasNova() {
  const navigate = useNavigate();
  const lojas = getLojas();
  const colaboradores = getColaboradores();
  const vendas = getVendas();
  
  // Estados
  const [showVendaModal, setShowVendaModal] = useState(false);
  const [buscaImei, setBuscaImei] = useState('');
  const [buscaLoja, setBuscaLoja] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  // Venda selecionada
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);
  const [garantiaSelecionada, setGarantiaSelecionada] = useState<GarantiaItem | null>(null);
  
  // Tratativa
  const [tipoTratativa, setTipoTratativa] = useState<string>('');
  const [descricaoTratativa, setDescricaoTratativa] = useState('');
  
  // Helpers
  const getLojaName = (id: string) => lojas.find(l => l.id === id)?.nome || id;
  const getColaboradorNome = (id: string) => colaboradores.find(c => c.id === id)?.nome || id;
  
  // Filtrar vendas
  const vendasFiltradas = useMemo(() => {
    return vendas.filter(v => {
      if (v.status === 'Cancelada') return false;
      
      // Filtrar por IMEI
      if (buscaImei) {
        const temImei = v.itens.some(item => item.imei.includes(buscaImei));
        if (!temImei) return false;
      }
      
      // Filtrar por loja
      if (buscaLoja && v.lojaVenda !== buscaLoja) return false;
      
      // Filtrar por data
      if (dataInicio) {
        const data = new Date(v.dataHora);
        if (data < new Date(dataInicio)) return false;
      }
      if (dataFim) {
        const data = new Date(v.dataHora);
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59);
        if (data > fim) return false;
      }
      
      return true;
    });
  }, [vendas, buscaImei, buscaLoja, dataInicio, dataFim]);
  
  // Selecionar venda
  const handleSelectVenda = (venda: Venda) => {
    setVendaSelecionada(venda);
    
    // Buscar garantias existentes para esta venda
    const garantias = getGarantiasByVendaId(venda.id);
    
    if (garantias.length > 0) {
      // Se já tem garantia, usar a primeira
      setGarantiaSelecionada(garantias[0]);
    } else {
      // Criar garantia mock baseada nos itens da venda
      const primeiroItem = venda.itens[0];
      if (primeiroItem) {
        const novaGarantia: GarantiaItem = {
          id: '',
          vendaId: venda.id,
          itemVendaId: primeiroItem.id,
          produtoId: primeiroItem.produtoId,
          imei: primeiroItem.imei,
          modelo: primeiroItem.produto,
          tipoGarantia: 'Garantia - Apple',
          mesesGarantia: 12,
          dataInicioGarantia: venda.dataHora.split('T')[0],
          dataFimGarantia: format(new Date(new Date(venda.dataHora).setMonth(new Date(venda.dataHora).getMonth() + 12)), 'yyyy-MM-dd'),
          status: 'Ativa',
          lojaVenda: venda.lojaVenda,
          clienteId: venda.clienteId,
          clienteNome: venda.clienteNome,
          clienteTelefone: venda.clienteTelefone,
          clienteEmail: venda.clienteEmail
        };
        setGarantiaSelecionada(novaGarantia);
      }
    }
    
    setShowVendaModal(false);
    setBuscaImei('');
    setBuscaLoja('');
  };
  
  // Verificar tratativa ativa
  const tratativaAtiva = useMemo(() => {
    if (!garantiaSelecionada?.imei) return null;
    return verificarTratativaAtivaByIMEI(garantiaSelecionada.imei);
  }, [garantiaSelecionada]);
  
  // Status de expiração
  const statusExpiracao = useMemo(() => {
    if (!garantiaSelecionada) return null;
    return calcularStatusExpiracao(garantiaSelecionada.dataFimGarantia);
  }, [garantiaSelecionada]);
  
  // Registrar tratativa
  const handleRegistrarTratativa = () => {
    if (!tipoTratativa) {
      toast.error('Selecione o tipo de tratativa');
      return;
    }
    if (!descricaoTratativa || descricaoTratativa.length < 10) {
      toast.error('Descrição deve ter pelo menos 10 caracteres');
      return;
    }
    if (!garantiaSelecionada) {
      toast.error('Selecione uma venda primeiro');
      return;
    }
    
    // Verificar se garantia já existe, senão criar
    let garantiaId = garantiaSelecionada.id;
    if (!garantiaId) {
      const novaGarantia = addGarantia({
        ...garantiaSelecionada
      });
      garantiaId = novaGarantia.id;
    }
    
    // Determinar status da tratativa
    const statusTratativa = tipoTratativa === 'Direcionado Apple' || tipoTratativa === 'Troca Direta' 
      ? 'Concluído' 
      : 'Em Andamento';
    
    // Adicionar tratativa
    addTratativa({
      garantiaId,
      tipo: tipoTratativa as any,
      dataHora: new Date().toISOString(),
      usuarioId: 'COL-001',
      usuarioNome: 'Usuário Sistema',
      descricao: descricaoTratativa,
      status: statusTratativa
    });
    
    // Atualizar status da garantia
    const novoStatus = statusTratativa === 'Concluído' ? 'Concluída' : 'Em Tratativa';
    updateGarantia(garantiaId, { status: novoStatus });
    
    // Adicionar timeline
    addTimelineEntry({
      garantiaId,
      dataHora: new Date().toISOString(),
      tipo: 'tratativa',
      titulo: `Tratativa: ${tipoTratativa}`,
      descricao: descricaoTratativa,
      usuarioId: 'COL-001',
      usuarioNome: 'Usuário Sistema'
    });
    
    toast.success('Tratativa registrada com sucesso!');
    
    // Limpar formulário
    setVendaSelecionada(null);
    setGarantiaSelecionada(null);
    setTipoTratativa('');
    setDescricaoTratativa('');
    
    // Navegar para em andamento se não concluído
    if (statusTratativa === 'Em Andamento') {
      navigate('/garantias/em-andamento');
    }
  };
  
  // Histórico de tratativas
  const historicoTratativas = useMemo(() => {
    if (!garantiaSelecionada?.id) return [];
    return getTratativasByGarantiaId(garantiaSelecionada.id);
  }, [garantiaSelecionada]);

  return (
    <GarantiasLayout title="Nova Garantia">
      <div className="space-y-6">
        {/* Quadro Consultar Garantia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Consultar Garantia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowVendaModal(true)} className="gap-2">
              <FileText className="h-4 w-4" />
              Selecionar Venda
            </Button>
            
            {vendaSelecionada && garantiaSelecionada && (
              <div className="mt-6 space-y-6">
                {/* Alertas de Expiração */}
                {statusExpiracao && (
                  <Alert variant={statusExpiracao.status === 'expirada' ? 'destructive' : 'default'} 
                    className={
                      statusExpiracao.status === 'urgente' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' :
                      statusExpiracao.status === 'atencao' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
                      statusExpiracao.status === 'ativa' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''
                    }>
                    {statusExpiracao.status === 'expirada' && <AlertTriangle className="h-4 w-4" />}
                    {statusExpiracao.status === 'urgente' && <AlertCircle className="h-4 w-4 text-orange-500" />}
                    {statusExpiracao.status === 'atencao' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                    {statusExpiracao.status === 'ativa' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    <AlertTitle>
                      {statusExpiracao.status === 'expirada' && '⛔ Garantia Expirada'}
                      {statusExpiracao.status === 'urgente' && '🔴 Garantia Urgente'}
                      {statusExpiracao.status === 'atencao' && '⚠️ Atenção'}
                      {statusExpiracao.status === 'ativa' && '✅ Garantia Válida'}
                    </AlertTitle>
                    <AlertDescription>{statusExpiracao.mensagem}</AlertDescription>
                  </Alert>
                )}
                
                {/* Alerta de tratativa ativa */}
                {tratativaAtiva && (
                  <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <AlertTitle>Tratativa em Andamento</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                      <span>Este IMEI possui tratativa ativa (ID: {tratativaAtiva.garantia.id})</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/garantias/${tratativaAtiva.garantia.id}`)}
                      >
                        Ver Tratativa
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Dados do Cliente */}
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Dados do Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Nome</p>
                        <p className="font-medium">{garantiaSelecionada.clienteNome}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Telefone</p>
                        <p className="font-medium flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {garantiaSelecionada.clienteTelefone || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {garantiaSelecionada.clienteEmail || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">ID Venda</p>
                        <Button 
                          variant="link" 
                          className="p-0 h-auto"
                          onClick={() => navigate(`/vendas/${vendaSelecionada.id}`)}
                        >
                          {vendaSelecionada.id}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Dados do Aparelho */}
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Dados do Aparelho
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Modelo</p>
                        <p className="font-medium">{garantiaSelecionada.modelo}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">IMEI</p>
                        <p className="font-mono text-sm">{garantiaSelecionada.imei}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tipo Garantia</p>
                        <Badge variant="outline">{garantiaSelecionada.tipoGarantia}</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Validade</p>
                        <p className="font-medium">
                          {format(new Date(garantiaSelecionada.dataFimGarantia), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Histórico de tratativas */}
                {historicoTratativas.length > 0 && (
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Histórico de Tratativas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {historicoTratativas.map(t => (
                          <div key={t.id} className="flex items-center justify-between p-2 bg-background rounded">
                            <div>
                              <p className="font-medium text-sm">{t.tipo}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(t.dataHora), 'dd/MM/yyyy HH:mm')} - {t.usuarioNome}
                              </p>
                            </div>
                            <Badge variant={t.status === 'Concluído' ? 'default' : 'secondary'}>
                              {t.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Quadro Tratativas */}
        {vendaSelecionada && garantiaSelecionada && !tratativaAtiva && statusExpiracao?.status !== 'expirada' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Tratativas Garantia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Tratativa *</Label>
                <Select value={tipoTratativa} onValueChange={setTipoTratativa}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo de tratativa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Direcionado Apple">
                      Cliente Direcionado para buscar garantia diretamente na Apple
                    </SelectItem>
                    <SelectItem value="Encaminhado Assistência">
                      Encaminhado para Assistência
                    </SelectItem>
                    <SelectItem value="Assistência + Empréstimo">
                      Aparelho encaminhado para assistência + Aparelho Emprestado
                    </SelectItem>
                    <SelectItem value="Troca Direta">
                      Troca direta
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Textarea 
                  placeholder="Descreva o problema relatado e a tratativa aplicada (mínimo 10 caracteres)"
                  value={descricaoTratativa}
                  onChange={(e) => setDescricaoTratativa(e.target.value)}
                  rows={4}
                />
              </div>
              
              <Separator />
              
              <Button onClick={handleRegistrarTratativa} className="w-full gap-2">
                <Shield className="h-4 w-4" />
                Registrar Tratativa
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Modal Seleção de Venda */}
      <Dialog open={showVendaModal} onOpenChange={setShowVendaModal}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Selecionar Venda para Garantia</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Filtros */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>IMEI</Label>
                <Input 
                  placeholder="Buscar IMEI..."
                  value={buscaImei}
                  onChange={(e) => setBuscaImei(e.target.value)}
                />
              </div>
              <div>
                <Label>Loja</Label>
                <Select value={buscaLoja || 'all'} onValueChange={(v) => setBuscaLoja(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Lojas</SelectItem>
                    {lojas.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data Início</Label>
                <Input 
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input 
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>
            
            {/* Tabela */}
            <div className="max-h-[400px] overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Venda</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasFiltradas.slice(0, 50).map(venda => (
                    <TableRow key={venda.id}>
                      <TableCell className="font-medium">{venda.id}</TableCell>
                      <TableCell>{format(new Date(venda.dataHora), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{getLojaName(venda.lojaVenda)}</TableCell>
                      <TableCell>{venda.clienteNome}</TableCell>
                      <TableCell>
                        {venda.itens.map(i => i.produto).join(', ')}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {venda.itens.map(i => i.imei).join(', ')}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleSelectVenda(venda)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Selecionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVendaModal(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GarantiasLayout>
  );
}
