import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { OSLayout } from '@/components/layout/OSLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Eye, Check, Clock, AlertTriangle, AlertCircle, 
  Shield, Package
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCadastroStore } from '@/store/cadastroStore';
import { 
  getRegistrosAnaliseGarantia, aprovarAnaliseGarantia, 
  RegistroAnaliseGarantia, getGarantiaById
} from '@/utils/garantiasApi';
import { updateProdutoPendente, getProdutoPendenteById } from '@/utils/osApi';
import { addOrdemServico } from '@/utils/assistenciaApi';
import { getClientes } from '@/utils/cadastrosApi';
import { formatIMEI, unformatIMEI } from '@/utils/imeiMask';

export default function OSAnaliseGarantia() {
  const navigate = useNavigate();
  const [registros, setRegistros] = useState<RegistroAnaliseGarantia[]>(getRegistrosAnaliseGarantia());
  const { obterTecnicos, obterLojasTipoLoja, obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  const tecnicos = obterTecnicos();
  const lojas = obterLojasTipoLoja();
  
  // Filtros
  const [filtroOrigem, setFiltroOrigem] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroIMEI, setFiltroIMEI] = useState('');

  const extrairIMEI = (descricao: string): string => {
    const match = descricao.match(/IMEI[:\s]*([0-9\-\s]+)/i);
    return match ? match[1].replace(/\D/g, '') : '';
  };
  
  // Modal aprovar
  const [showAprovarModal, setShowAprovarModal] = useState(false);
  const [registroSelecionado, setRegistroSelecionado] = useState<RegistroAnaliseGarantia | null>(null);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState('');
  const [lojaSelecionada, setLojaSelecionada] = useState('');
  const [dataHoraAprovacao] = useState(new Date().toISOString());
  
  // Modal detalhes
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [detalheRegistro, setDetalheRegistro] = useState<RegistroAnaliseGarantia | null>(null);

  const calcularSLA = (dataChegada: string): number => {
    const hoje = new Date();
    const chegada = new Date(dataChegada);
    const dias = Math.floor((hoje.getTime() - chegada.getTime()) / (1000 * 60 * 60 * 24));
    return dias;
  };

  const registrosFiltrados = useMemo(() => {
    return registros.filter(r => {
      if (filtroOrigem !== 'todos' && r.origem !== filtroOrigem) return false;
      if (filtroStatus !== 'todos' && r.status !== filtroStatus) return false;
      if (filtroIMEI) {
        const imeiRegistro = extrairIMEI(r.clienteDescricao);
        if (!imeiRegistro || !imeiRegistro.includes(unformatIMEI(filtroIMEI))) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.dataChegada).getTime() - new Date(a.dataChegada).getTime());
  }, [registros, filtroOrigem, filtroStatus, filtroIMEI]);

  const getOrigemBadge = (origem: string) => {
    switch (origem) {
      case 'Garantia':
        return <Badge className="bg-blue-500 hover:bg-blue-600"><Shield className="h-3 w-3 mr-1" />Garantia</Badge>;
      case 'Estoque':
        return <Badge className="bg-purple-500 hover:bg-purple-600"><Package className="h-3 w-3 mr-1" />Estoque</Badge>;
      default:
        return <Badge variant="secondary">{origem}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendente':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>;
      case 'Solicitação Aprovada':
        return <Badge className="bg-green-500 hover:bg-green-600">Solicitação Aprovada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSLABadge = (dataChegada: string) => {
    const sla = calcularSLA(dataChegada);
    
    if (sla > 3) {
      return (
        <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 inline-flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {sla} dias
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 inline-flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {sla} dias
      </span>
    );
  };

  const handleAbrirAprovar = (registro: RegistroAnaliseGarantia) => {
    setRegistroSelecionado(registro);
    setTecnicoSelecionado('');
    setLojaSelecionada(lojas[0]?.id || '');
    setShowAprovarModal(true);
  };

  const handleVerDetalhes = (registro: RegistroAnaliseGarantia) => {
    setDetalheRegistro(registro);
    setShowDetalhesModal(true);
  };

  const handleConfirmarAprovacao = () => {
    if (!registroSelecionado || !tecnicoSelecionado) {
      toast.error('Selecione um técnico');
      return;
    }
    
    if (!lojaSelecionada) {
      toast.error('Selecione uma loja');
      return;
    }

    const tecnico = tecnicos.find(t => t.id === tecnicoSelecionado);
    const registroAprovado = aprovarAnaliseGarantia(registroSelecionado.id, {
      tecnicoId: tecnicoSelecionado,
      tecnicoNome: tecnico?.nome || '',
      dataAprovacao: dataHoraAprovacao,
      usuarioAprovacao: 'Usuário Sistema'
    });

    if (registroAprovado) {
      // Atualizar statusGeral do produto pendente
      if (registroAprovado.origemId) {
        updateProdutoPendente(registroAprovado.origemId, {
          statusGeral: 'Em Análise Assistência'
        });
      }

      // Criar OS diretamente
      const clientes = getClientes();
      let clienteId = '';
      let modeloAparelho = '';
      let imeiAparelho = '';
      let origemOS: 'Garantia' | 'Estoque' | 'Venda' | 'Balcão' = 'Balcão';

      if (registroAprovado.origem === 'Garantia' && registroAprovado.origemId) {
        origemOS = 'Garantia';
        const garantia = getGarantiaById(registroAprovado.origemId);
        if (garantia) {
          const cliente = clientes.find(c => c.nome === garantia.clienteNome || c.id === garantia.clienteId);
          if (cliente) clienteId = cliente.id;
          modeloAparelho = garantia.modelo || '';
          imeiAparelho = garantia.imei || '';
        }
    } else if (registroAprovado.origem === 'Estoque') {
        origemOS = 'Estoque';
        if (registroAprovado.origemId) {
          const produtoPendente = getProdutoPendenteById(registroAprovado.origemId);
          if (produtoPendente) {
            modeloAparelho = produtoPendente.modelo || '';
            imeiAparelho = produtoPendente.imei || '';
          }
        }
      }

      addOrdemServico({
        dataHora: new Date().toISOString(),
        clienteId,
        lojaId: lojaSelecionada,
        tecnicoId: tecnicoSelecionado,
        setor: registroAprovado.origem === 'Garantia' ? 'GARANTIA' : 'ASSISTÊNCIA',
        status: 'Em serviço',
        pecas: [],
        pagamentos: [],
        valorTotal: 0,
        custoTotal: 0,
        descricao: `Origem: ${registroAprovado.origem} - ${registroAprovado.clienteDescricao}`,
        timeline: [{
          data: new Date().toISOString(),
          tipo: 'registro' as const,
          descricao: `OS criada a partir da Análise de Tratativas (${registroAprovado.id})`,
          responsavel: 'Sistema'
        }],
        origemOS,
        proximaAtuacao: 'Técnico: Avaliar/Executar',
        garantiaId: registroAprovado.origem === 'Garantia' ? registroAprovado.origemId : undefined,
        modeloAparelho,
        imeiAparelho,
      });

      toast.success('Solicitação aprovada e OS criada com sucesso!');
      // Navegar para a aba Nova Assistência (lista)
      navigate('/os/assistencia');
    }

    setRegistros(getRegistrosAnaliseGarantia());
    setShowAprovarModal(false);
  };

  // Stats
  const totalRegistros = registros.length;
  const pendentes = registros.filter(r => r.status === 'Pendente').length;
  const aprovados = registros.filter(r => r.status === 'Solicitação Aprovada').length;
  const slaCritico = registros.filter(r => calcularSLA(r.dataChegada) > 3).length;

  return (
    <OSLayout title="Análise de Tratativas">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalRegistros}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{pendentes}</div>
            <div className="text-xs text-muted-foreground">Pendentes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{aprovados}</div>
            <div className="text-xs text-muted-foreground">Aprovados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{slaCritico}</div>
            <div className="text-xs text-muted-foreground">SLA Crítico (&gt;3 dias)</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div className="space-y-2">
              <Label>IMEI</Label>
              <Input
                placeholder="Buscar por IMEI..."
                value={filtroIMEI}
                onChange={e => setFiltroIMEI(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Garantia">Garantia</SelectItem>
                  <SelectItem value="Estoque">Estoque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Solicitação Aprovada">Solicitação Aprovada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => { setFiltroOrigem('todos'); setFiltroStatus('todos'); setFiltroIMEI(''); }}>
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>IMEI</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Cliente/Descrição</TableHead>
              <TableHead>Data Chegada</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrosFiltrados.map(registro => {
              const sla = calcularSLA(registro.dataChegada);
              return (
                <TableRow key={registro.id} className={sla > 3 ? 'bg-red-500/10' : ''}>
                  <TableCell className="font-mono text-xs">{registro.id}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {extrairIMEI(registro.clienteDescricao) ? formatIMEI(extrairIMEI(registro.clienteDescricao)) : '-'}
                  </TableCell>
                  <TableCell>{getOrigemBadge(registro.origem)}</TableCell>
                  <TableCell className="font-medium">{registro.clienteDescricao}</TableCell>
                  <TableCell>{format(new Date(registro.dataChegada), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>{getSLABadge(registro.dataChegada)}</TableCell>
                  <TableCell>{getStatusBadge(registro.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleVerDetalhes(registro)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {registro.status === 'Pendente' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-green-600 hover:text-green-700"
                          onClick={() => handleAbrirAprovar(registro)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {registrosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Aprovar */}
      <Dialog open={showAprovarModal} onOpenChange={setShowAprovarModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Solicitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Técnico Responsável *</Label>
              <Select value={tecnicoSelecionado} onValueChange={setTecnicoSelecionado}>
                <SelectTrigger><SelectValue placeholder="Selecione um técnico..." /></SelectTrigger>
                <SelectContent>
                  {tecnicos.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loja *</Label>
              <Select value={lojaSelecionada} onValueChange={setLojaSelecionada}>
                <SelectTrigger><SelectValue placeholder="Selecione uma loja..." /></SelectTrigger>
                <SelectContent>
                  {lojas.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data/Hora</Label>
              <Input 
                value={format(new Date(dataHoraAprovacao), 'dd/MM/yyyy HH:mm')} 
                disabled 
                className="bg-muted"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAprovarModal(false)}>Cancelar</Button>
            <Button onClick={handleConfirmarAprovacao}>
              <Check className="h-4 w-4 mr-2" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes */}
      <Dialog open={showDetalhesModal} onOpenChange={setShowDetalhesModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Registro</DialogTitle>
          </DialogHeader>
          {detalheRegistro && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">ID</Label>
                  <p className="font-mono">{detalheRegistro.id}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Origem</Label>
                  <div className="mt-1">{getOrigemBadge(detalheRegistro.origem)}</div>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Cliente/Descrição</Label>
                  <p className="font-medium">{detalheRegistro.clienteDescricao}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data Chegada</Label>
                  <p>{format(new Date(detalheRegistro.dataChegada), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">SLA</Label>
                  <div className="mt-1">{getSLABadge(detalheRegistro.dataChegada)}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(detalheRegistro.status)}</div>
                </div>
                {detalheRegistro.tecnicoId && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Técnico</Label>
                    <p>{detalheRegistro.tecnicoNome || obterNomeColaborador(detalheRegistro.tecnicoId)}</p>
                  </div>
                )}
                {detalheRegistro.dataAprovacao && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Data Aprovação</Label>
                    <p>{format(new Date(detalheRegistro.dataAprovacao), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetalhesModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OSLayout>
  );
}