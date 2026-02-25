import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GarantiasLayout } from '@/components/layout/GarantiasLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Eye, Download, X } from 'lucide-react';
import { exportToCSV } from '@/utils/formatUtils';
import { format } from 'date-fns';
import { formatCurrency } from '@/utils/planosGarantiaApi';

import { getContatosAtivos, verificarEGerarContatosAutomaticos, ContatoAtivoGarantia } from '@/utils/garantiasApi';

export default function GarantiaContatosAtivos() {
  const navigate = useNavigate();
  
  // Estados
  const [contatos, setContatos] = useState<ContatoAtivoGarantia[]>([]);
  
  useEffect(() => {
    verificarEGerarContatosAutomaticos();
    setContatos(getContatosAtivos());
  }, []);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [contatoSelecionado, setContatoSelecionado] = useState<ContatoAtivoGarantia | null>(null);
  
  // Filtros
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  
  const contatosFiltrados = useMemo(() => {
    return contatos.filter(c => {
      if (filtroCliente && !c.cliente.nome.toLowerCase().includes(filtroCliente.toLowerCase())) return false;
      if (filtroStatus !== 'todos' && c.status !== filtroStatus) return false;
      return true;
    }).sort((a, b) => new Date(b.dataLancamento).getTime() - new Date(a.dataLancamento).getTime());
  }, [contatos, filtroCliente, filtroStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pendente':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>;
      case 'Garantia Criada':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Garantia Criada</Badge>;
      case 'Entregue':
        return <Badge className="bg-green-500 hover:bg-green-600">Entregue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleVerDetalhes = (contato: ContatoAtivoGarantia) => {
    setContatoSelecionado(contato);
    setShowDetalhesModal(true);
  };

  const handleEditar = (contato: ContatoAtivoGarantia) => {
    navigate(`/garantias/contatos-ativos/editar/${contato.id}`);
  };

  // Stats
  const totalContatos = contatos.length;
  const pendentes = contatos.filter(c => c.status === 'Pendente').length;
  const garantiasCriadas = contatos.filter(c => c.status === 'Garantia Criada').length;
  const entregues = contatos.filter(c => c.status === 'Entregue').length;

  // Limpar filtros
  const handleLimparFiltros = () => {
    setFiltroCliente('');
    setFiltroStatus('todos');
  };

  const temFiltroAtivo = filtroCliente || filtroStatus !== 'todos';

  return (
    <GarantiasLayout title="Contatos - Ativos">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalContatos}</div>
            <div className="text-xs text-muted-foreground">Total Contatos</div>
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
            <div className="text-2xl font-bold text-blue-600">{garantiasCriadas}</div>
            <div className="text-xs text-muted-foreground">Garantias Criadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{entregues}</div>
            <div className="text-xs text-muted-foreground">Entregues</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input
                placeholder="Buscar cliente..."
                value={filtroCliente}
                onChange={e => setFiltroCliente(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Garantia Criada">Garantia Criada</SelectItem>
                  <SelectItem value="Entregue">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 md:col-span-2">
              {temFiltroAtivo && (
                <Button variant="ghost" size="icon" onClick={handleLimparFiltros} title="Limpar filtros">
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" onClick={() => {
                const data = contatosFiltrados.map(c => ({
                  ID: c.id,
                  Data: format(new Date(c.dataLancamento), 'dd/MM/yyyy'),
                  Cliente: c.cliente.nome,
                  Telefone: c.cliente.telefone,
                  Aparelho: c.aparelho.modelo,
                  IMEI: c.aparelho.imei,
                  Motoboy: c.logistica.motoboyNome,
                  'Entrega Prevista': c.logistica.dataEntregaPrevista ? format(new Date(c.logistica.dataEntregaPrevista), 'dd/MM/yyyy') : '-',
                  'Garantia Estendida': c.garantiaEstendida?.aderida ? 'Sim' : 'Não',
                  Status: c.status
                }));
                exportToCSV(data, `contatos_ativos_${format(new Date(), 'dd_MM_yyyy')}.csv`);
              }}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Button onClick={() => navigate('/garantias/contatos-ativos/novo')} className="flex-1">
                <Plus className="h-4 w-4 mr-2" />
                Novo Lançamento
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
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Aparelho</TableHead>
              <TableHead>IMEI</TableHead>
              <TableHead>Motoboy</TableHead>
              <TableHead>Entrega Prevista</TableHead>
              <TableHead>Garantia Ext.</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contatosFiltrados.map(contato => (
              <TableRow key={contato.id}>
                <TableCell className="font-mono text-xs">{contato.id}</TableCell>
                <TableCell>{format(new Date(contato.dataLancamento), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="font-medium">{contato.cliente.nome}</TableCell>
                <TableCell>
                  <div>
                    {contato.aparelho.modelo}
                    {contato.aparelho.condicao && (
                      <Badge variant="outline" className="ml-2 text-xs">{contato.aparelho.condicao}</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{contato.aparelho.imei}</TableCell>
                <TableCell>{contato.logistica.motoboyNome}</TableCell>
                <TableCell>{contato.logistica.dataEntregaPrevista ? format(new Date(contato.logistica.dataEntregaPrevista), 'dd/MM/yyyy') : '-'}</TableCell>
                <TableCell>
                  {contato.garantiaEstendida?.aderida ? (
                    <div className="space-y-1">
                      <Badge className="bg-green-500">
                        {contato.garantiaEstendida.planoNome || contato.garantiaEstendida.plano}
                      </Badge>
                      {contato.garantiaEstendida.valor && (
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(contato.garantiaEstendida.valor)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Badge variant="outline">Não</Badge>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(contato.status)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleVerDetalhes(contato)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditar(contato)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {contatosFiltrados.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Nenhum contato encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Detalhes */}
      <Dialog open={showDetalhesModal} onOpenChange={setShowDetalhesModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Contato</DialogTitle>
          </DialogHeader>
          {contatoSelecionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">ID</Label>
                  <p className="font-mono">{contatoSelecionado.id}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(contatoSelecionado.status)}</div>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Cliente</Label>
                  <p className="font-medium">{contatoSelecionado.cliente.nome}</p>
                  <p className="text-sm text-muted-foreground">{contatoSelecionado.cliente.telefone}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Aparelho</Label>
                  <p>{contatoSelecionado.aparelho.modelo}</p>
                  {contatoSelecionado.aparelho.condicao && (
                    <Badge variant="outline" className="mt-1">{contatoSelecionado.aparelho.condicao}</Badge>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">IMEI</Label>
                  <p className="font-mono text-xs">{contatoSelecionado.aparelho.imei}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Motoboy</Label>
                  <p>{contatoSelecionado.logistica.motoboyNome}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Entrega Prevista</Label>
                  <p>{format(new Date(contatoSelecionado.logistica.dataEntregaPrevista), 'dd/MM/yyyy')}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Endereço</Label>
                  <p className="text-sm">{contatoSelecionado.logistica.enderecoEntrega}</p>
                </div>
                {contatoSelecionado.logistica.observacoes && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Observações</Label>
                    <p className="text-sm">{contatoSelecionado.logistica.observacoes}</p>
                  </div>
                )}
                {contatoSelecionado.garantiaEstendida?.aderida && (
                  <div className="col-span-2 p-3 bg-green-50 rounded-lg">
                    <Label className="text-xs text-green-700">Garantia Estendida</Label>
                    <p className="font-medium text-green-800">
                      {contatoSelecionado.garantiaEstendida.planoNome || contatoSelecionado.garantiaEstendida.plano}
                      {contatoSelecionado.garantiaEstendida.planoMeses && (
                        <span className="font-normal text-sm"> ({contatoSelecionado.garantiaEstendida.planoMeses} meses)</span>
                      )}
                    </p>
                    {contatoSelecionado.garantiaEstendida.valor && (
                      <p className="text-lg font-bold text-green-700">
                        {formatCurrency(contatoSelecionado.garantiaEstendida.valor)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Timeline */}
              {contatoSelecionado.timeline && contatoSelecionado.timeline.length > 0 && (
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium">Timeline</Label>
                  <div className="mt-2 space-y-2">
                    {contatoSelecionado.timeline.map(entry => (
                      <div key={entry.id} className="text-sm p-2 bg-muted rounded">
                        <div className="font-medium">{entry.descricao}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(entry.dataHora), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetalhesModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GarantiasLayout>
  );
}
