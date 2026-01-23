import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  getOrdemServicoById, 
  formatCurrency, 
  calcularSLADias,
  OrdemServico,
  updateOrdemServico
} from '@/utils/assistenciaApi';
import { getClientes, getFornecedores } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { AutocompleteColaborador } from '@/components/AutocompleteColaborador';
import { ArrowLeft, FileText, Clock, AlertTriangle, User, Wrench, MapPin, Calendar, CreditCard, Save, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';
import { toast } from 'sonner';

export default function OSAssistenciaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [os, setOS] = useState<OrdemServico | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Editable fields
  const [editClienteId, setEditClienteId] = useState('');
  const [editLojaId, setEditLojaId] = useState('');
  const [editTecnicoId, setEditTecnicoId] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editSetor, setEditSetor] = useState('');
  const [editDescricao, setEditDescricao] = useState('');

  const clientes = getClientes();
  const { obterLojasTipoLoja, obterTecnicos, obterNomeLoja, obterNomeColaborador } = useCadastroStore();
  const lojas = obterLojasTipoLoja();
  const tecnicos = obterTecnicos();
  const fornecedores = getFornecedores();

  useEffect(() => {
    if (id) {
      const ordem = getOrdemServicoById(id);
      setOS(ordem || null);
      if (ordem) {
        setEditClienteId(ordem.clienteId);
        setEditLojaId(ordem.lojaId);
        setEditTecnicoId(ordem.tecnicoId);
        setEditStatus(ordem.status);
        setEditSetor(ordem.setor);
        setEditDescricao(ordem.descricao || '');
      }
    }
  }, [id]);

  useEffect(() => {
    if (os) {
      QRCode.toDataURL(`OS:${os.id}|VALOR:${os.valorTotal}|DATA:${os.dataHora}`)
        .then(url => setQrCodeUrl(url))
        .catch(console.error);
    }
  }, [os]);

  const canEdit = os && os.status !== 'Serviço concluído';

  const handleSaveChanges = () => {
    if (!os) return;
    
    updateOrdemServico(os.id, {
      clienteId: editClienteId,
      lojaId: editLojaId,
      tecnicoId: editTecnicoId,
      status: editStatus as 'Em Análise' | 'Aguardando Peça' | 'Em serviço' | 'Peça Recebida' | 'Serviço concluído' | 'Solicitação Enviada',
      setor: editSetor as 'GARANTIA' | 'ASSISTÊNCIA' | 'TROCA',
      descricao: editDescricao
    });
    
    // Refresh OS data
    const updatedOS = getOrdemServicoById(os.id);
    setOS(updatedOS || null);
    setIsEditing(false);
    toast.success('Alterações salvas com sucesso!');
  };

  const handleVoltar = () => {
    const from = searchParams.get('from');
    if (from === 'solicitacoes') {
      navigate('/os/solicitacoes-pecas');
    } else {
      navigate('/os/assistencia');
    }
  };

  if (!os) {
    return (
      <PageLayout title="OS não encontrada">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Ordem de serviço não encontrada.</p>
          <Button onClick={handleVoltar}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </PageLayout>
    );
  }

  const cliente = clientes.find(c => c.id === (isEditing ? editClienteId : os.clienteId));
  const loja = lojas.find(l => l.id === (isEditing ? editLojaId : os.lojaId));
  const tecnico = tecnicos.find(t => t.id === (isEditing ? editTecnicoId : os.tecnicoId));
  const slaDias = calcularSLADias(os.dataHora);

  const getLojaNome = (lojaId: string) => obterNomeLoja(lojaId);
  const getTecnicoNome = (tecnicoId: string) => obterNomeColaborador(tecnicoId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Serviço concluído':
        return <Badge className="bg-green-500 hover:bg-green-600">Concluído</Badge>;
      case 'Em serviço':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Em serviço</Badge>;
      case 'Aguardando Peça':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Aguardando Peça</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSetorBadge = (setor: string) => {
    switch (setor) {
      case 'GARANTIA':
        return <Badge variant="outline" className="border-green-500 text-green-600">Garantia</Badge>;
      case 'ASSISTÊNCIA':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Assistência</Badge>;
      case 'TROCA':
        return <Badge variant="outline" className="border-purple-500 text-purple-600">Troca</Badge>;
      default:
        return <Badge variant="outline">{setor}</Badge>;
    }
  };

  const getSLADisplay = () => {
    let bgClass = '';
    let icon = null;

    if (slaDias >= 5) {
      bgClass = 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      icon = <AlertTriangle className="h-4 w-4" />;
    } else if (slaDias >= 3) {
      bgClass = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      icon = <Clock className="h-4 w-4" />;
    }

    return (
      <span className={cn('px-3 py-1 rounded text-sm font-medium inline-flex items-center gap-2', bgClass)}>
        {icon}
        {slaDias} dias
      </span>
    );
  };

  const handleGerarRecibo = () => {
    const content = `
===========================================
           RECIBO DE SERVIÇO
===========================================

Nº OS: ${os.id}
Data: ${new Date(os.dataHora).toLocaleString('pt-BR')}
Setor: ${os.setor}
Status: ${os.status}

-------------------------------------------
CLIENTE
-------------------------------------------
Nome: ${cliente?.nome || '-'}
CPF/CNPJ: ${cliente?.cpf || '-'}
Telefone: ${cliente?.telefone || '-'}

-------------------------------------------
TÉCNICO / LOJA
-------------------------------------------
Técnico: ${tecnico?.nome || '-'}
Loja: ${loja?.nome || '-'}

-------------------------------------------
PEÇAS / SERVIÇOS
-------------------------------------------
${os.pecas.map(p => `${p.peca} - ${formatCurrency(p.valorTotal)}`).join('\n')}

-------------------------------------------
PAGAMENTOS
-------------------------------------------
${os.pagamentos.map(p => `${p.meio} - ${formatCurrency(p.valor)}`).join('\n')}

-------------------------------------------
TOTAL: ${formatCurrency(os.valorTotal)}
-------------------------------------------

${os.descricao ? `\nDescrição:\n${os.descricao}` : ''}

===========================================
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recibo-${os.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageLayout title={`Detalhes da OS ${os.id}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleVoltar}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h2 className="text-2xl font-bold">{os.id}</h2>
              <p className="text-sm text-muted-foreground">
                {new Date(os.dataHora).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {getStatusBadge(isEditing ? editStatus : os.status)}
            {getSetorBadge(isEditing ? editSetor : os.setor)}
            {getSLADisplay()}
            {canEdit && !isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar OS
              </Button>
            )}
            {isEditing && (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveChanges}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </>
            )}
            <Button onClick={handleGerarRecibo}>
              <FileText className="h-4 w-4 mr-2" />
              Gerar Recibo
            </Button>
          </div>
        </div>

        {canEdit && !isEditing && (
          <div className="bg-blue-100 dark:bg-blue-950/30 p-3 rounded-lg text-blue-700 dark:text-blue-300 text-sm flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Esta OS ainda pode ser editada. Clique em "Editar OS" para fazer alterações.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Cliente</label>
                      <Select value={editClienteId} onValueChange={setEditClienteId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientes.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.nome} - {c.cpf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {cliente && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-3 bg-muted rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                          <p className="font-medium">{cliente.cpf}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Telefone</p>
                          <p className="font-medium">{cliente.telefone}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">E-mail</p>
                          <p className="font-medium">{cliente.email || '-'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Nome</p>
                      <p className="font-medium">{cliente?.nome || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                      <p className="font-medium">{cliente?.cpf || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="font-medium">{cliente?.telefone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">E-mail</p>
                      <p className="font-medium">{cliente?.email || '-'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Peças/Serviços */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Peças / Serviços
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>IMEI</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Desconto</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Origem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {os.pecas.map((peca, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{peca.peca}</TableCell>
                        <TableCell className="font-mono text-xs">{peca.imei || '-'}</TableCell>
                        <TableCell>{formatCurrency(peca.valor)}</TableCell>
                        <TableCell>{peca.percentual}%</TableCell>
                        <TableCell className="font-medium">{formatCurrency(peca.valorTotal)}</TableCell>
                        <TableCell>
                          {peca.pecaNoEstoque && (
                            <Badge 
                              variant="outline" 
                              className="mr-1 cursor-pointer hover:bg-primary/10"
                              onClick={() => navigate('/os/pecas')}
                            >
                              Estoque
                            </Badge>
                          )}
                          {peca.pecaDeFornecedor && (
                            <Badge variant="outline">
                              {fornecedores.find(f => f.id === peca.fornecedorId)?.nome || 'Fornecedor'}
                            </Badge>
                          )}
                          {peca.servicoTerceirizado && <Badge variant="secondary">Terceirizado</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Pagamentos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pagamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Meio de Pagamento</TableHead>
                      <TableHead>Parcelas</TableHead>
                      <TableHead>Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {os.pagamentos.map((pag, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{pag.meio}</TableCell>
                        <TableCell>{pag.parcelas || '-'}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(pag.valor)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={2} className="font-bold">Total</TableCell>
                      <TableCell className="font-bold text-lg">{formatCurrency(os.valorTotal)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Descrição */}
            <Card>
              <CardHeader>
                <CardTitle>Descrição Detalhada</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea 
                    value={editDescricao}
                    onChange={(e) => setEditDescricao(e.target.value)}
                    placeholder="Descrição detalhada do serviço..."
                    rows={4}
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{os.descricao || 'Nenhuma descrição.'}</p>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timeline da OS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {os.timeline.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        {index < os.timeline.length - 1 && (
                          <div className="w-0.5 h-full bg-border" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="font-medium capitalize">{item.tipo}</p>
                        <p className="text-sm text-muted-foreground">{item.descricao}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(item.data).toLocaleString('pt-BR')} - {item.responsavel}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-6">
            {/* Info Rápida */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Informações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <label className="text-xs text-muted-foreground">Loja</label>
                      <Select value={editLojaId} onValueChange={setEditLojaId}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione a loja" />
                        </SelectTrigger>
                        <SelectContent>
                          {lojas.map(l => (
                            <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-xs text-muted-foreground">Técnico Responsável</label>
                      <Select value={editTecnicoId} onValueChange={setEditTecnicoId}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione o técnico" />
                        </SelectTrigger>
                        <SelectContent>
                          {tecnicos.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-xs text-muted-foreground">Setor</label>
                      <Select value={editSetor} onValueChange={setEditSetor}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione o setor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GARANTIA">Garantia</SelectItem>
                          <SelectItem value="ASSISTÊNCIA">Assistência</SelectItem>
                          <SelectItem value="TROCA">Troca</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-xs text-muted-foreground">Status</label>
                      <Select value={editStatus} onValueChange={setEditStatus}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Em serviço">Em serviço</SelectItem>
                          <SelectItem value="Aguardando Peça">Aguardando Peça</SelectItem>
                          <SelectItem value="Serviço concluído">Serviço concluído</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">SLA</p>
                      <div className="mt-1">{getSLADisplay()}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">Loja</p>
                      <p className="font-medium">{loja?.nome || '-'}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">Técnico Responsável</p>
                      <p className="font-medium">{tecnico?.nome || '-'}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">Setor</p>
                      <div className="mt-1">{getSetorBadge(os.setor)}</div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <div className="mt-1">{getStatusBadge(os.status)}</div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">SLA</p>
                      <div className="mt-1">{getSLADisplay()}</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* QR Code */}
            <Card>
              <CardHeader>
                <CardTitle>QR Code</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR Code da OS" className="w-40 h-40" />
                )}
              </CardContent>
            </Card>

            {/* Resumo Financeiro */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo Financeiro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Peças/Serviços</span>
                  <span className="font-medium">{formatCurrency(os.pecas.reduce((acc, p) => acc + p.valorTotal, 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Pagamentos</span>
                  <span className="font-medium">{formatCurrency(os.pagamentos.reduce((acc, p) => acc + p.valor, 0))}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Valor Total</span>
                  <span className="font-bold text-primary">{formatCurrency(os.valorTotal)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}