import { useState, useMemo } from 'react';
import { EstoqueLayout } from '@/components/layout/EstoqueLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getAcessorios, Acessorio } from '@/utils/acessoriosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { AutocompleteLoja } from '@/components/AutocompleteLoja';
import { Download, Plus, CheckCircle, Clock, Eye, Edit, Package, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ResponsiveTableContainer } from '@/components/ui/ResponsiveContainers';
import { useAuthStore } from '@/store/authStore';

interface MovimentacaoAcessorio {
  id: string;
  data: string;
  acessorio: string;
  acessorioId: string;
  quantidade: number;
  origem: string;
  destino: string;
  responsavel: string;
  motivo: string;
  status: 'Pendente' | 'Recebido';
  dataRecebimento?: string;
  responsavelRecebimento?: string;
}

// Mock data
const mockMovimentacoes: MovimentacaoAcessorio[] = [
  {
    id: 'MOV-ACESS-001',
    data: '2024-01-15',
    acessorio: 'Capa iPhone 14 Pro Silicone',
    acessorioId: 'ACESS-001',
    quantidade: 5,
    origem: '3ac7e00c',
    destino: 'db894e7d',
    responsavel: 'Maria Souza',
    motivo: 'Reposição de estoque',
    status: 'Recebido',
    dataRecebimento: '2024-01-16T10:30:00',
    responsavelRecebimento: 'João Silva'
  },
  {
    id: 'MOV-ACESS-002',
    data: '2024-01-16',
    acessorio: 'Película Vidro Samsung S23',
    acessorioId: 'ACESS-002',
    quantidade: 10,
    origem: '3ac7e00c',
    destino: '5b9446d5',
    responsavel: 'João Silva',
    motivo: 'Transferência',
    status: 'Pendente'
  },
  {
    id: 'MOV-ACESS-003',
    data: '2024-01-18',
    acessorio: 'Carregador USB-C 20W',
    acessorioId: 'ACESS-003',
    quantidade: 3,
    origem: 'db894e7d',
    destino: '0d06e7db',
    responsavel: 'Ana Costa',
    motivo: 'Devolução',
    status: 'Recebido',
    dataRecebimento: '2024-01-19T14:00:00',
    responsavelRecebimento: 'Pedro Santos'
  }
];

let movimentacoesData = [...mockMovimentacoes];

export default function EstoqueMovimentacoesAcessorios() {
  const { obterLojasTipoLoja, obterColaboradoresAtivos, obterLojaById, obterNomeLoja } = useCadastroStore();
  const user = useAuthStore(state => state.user);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoAcessorio[]>(movimentacoesData);
  const [origemFilter, setOrigemFilter] = useState<string>('todas');
  const [destinoFilter, setDestinoFilter] = useState<string>('todas');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // Apenas lojas do tipo 'Loja' para movimentações
  const lojas = obterLojasTipoLoja();
  const acessorios = getAcessorios();
  const colaboradores = obterColaboradoresAtivos();
  
  // Colaboradores com permissão de estoque ou gestor
  const colaboradoresComPermissao = colaboradores.filter(
    col => col.eh_estoquista || col.eh_gestor
  );

  // Estados para modais de ações
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [movimentacaoDetalhe, setMovimentacaoDetalhe] = useState<MovimentacaoAcessorio | null>(null);
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [movimentacaoParaEditar, setMovimentacaoParaEditar] = useState<MovimentacaoAcessorio | null>(null);
  const [editFormData, setEditFormData] = useState({
    destino: '',
    motivo: '',
  });
  
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [movimentacaoParaConfirmar, setMovimentacaoParaConfirmar] = useState<string | null>(null);
  const [responsavelConfirmacao, setResponsavelConfirmacao] = useState<string>('');

  // Estado do formulário de nova movimentação
  const [formOrigem, setFormOrigem] = useState<string>('');
  const [formDestino, setFormDestino] = useState<string>('');

  const getLojaNome = (lojaIdOuNome: string) => {
    const loja = obterLojaById(lojaIdOuNome);
    if (loja) return loja.nome;
    return obterNomeLoja(lojaIdOuNome);
  };

  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes.filter(m => {
      if (origemFilter !== 'todas' && m.origem !== origemFilter) return false;
      if (destinoFilter !== 'todas' && m.destino !== destinoFilter) return false;
      return true;
    });
  }, [movimentacoes, origemFilter, destinoFilter]);

  // Abrir diálogo de confirmação
  const handleAbrirConfirmacao = (movId: string) => {
    setMovimentacaoParaConfirmar(movId);
    setResponsavelConfirmacao(user?.colaborador?.id || '');
    setConfirmDialogOpen(true);
  };

  // Confirmar recebimento
  const handleConfirmarRecebimento = () => {
    if (!movimentacaoParaConfirmar || !responsavelConfirmacao) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione o responsável pela confirmação',
        variant: 'destructive'
      });
      return;
    }

    const nomeResponsavel = colaboradores.find(c => c.id === responsavelConfirmacao)?.nome || responsavelConfirmacao;
    
    const movIndex = movimentacoes.findIndex(m => m.id === movimentacaoParaConfirmar);
    if (movIndex !== -1) {
      const updatedMov = {
        ...movimentacoes[movIndex],
        status: 'Recebido' as const,
        dataRecebimento: new Date().toISOString(),
        responsavelRecebimento: nomeResponsavel
      };
      const newMovimentacoes = [...movimentacoes];
      newMovimentacoes[movIndex] = updatedMov;
      setMovimentacoes(newMovimentacoes);
      movimentacoesData = newMovimentacoes;
    }
    
    setConfirmDialogOpen(false);
    setMovimentacaoParaConfirmar(null);
    setResponsavelConfirmacao('');
    toast({
      title: 'Recebimento confirmado',
      description: `Movimentação ${movimentacaoParaConfirmar} confirmada por ${nomeResponsavel}`,
    });
  };

  // Salvar edição
  const handleSalvarEdicao = () => {
    if (!movimentacaoParaEditar) return;

    if (!editFormData.destino) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione o destino',
        variant: 'destructive'
      });
      return;
    }

    if (!editFormData.motivo || !editFormData.motivo.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o motivo',
        variant: 'destructive'
      });
      return;
    }

    const movIndex = movimentacoes.findIndex(m => m.id === movimentacaoParaEditar.id);
    if (movIndex !== -1) {
      const updatedMov = {
        ...movimentacoes[movIndex],
        destino: editFormData.destino,
        motivo: editFormData.motivo,
      };
      const newMovimentacoes = [...movimentacoes];
      newMovimentacoes[movIndex] = updatedMov;
      setMovimentacoes(newMovimentacoes);
      movimentacoesData = newMovimentacoes;
    }

    setEditDialogOpen(false);
    setMovimentacaoParaEditar(null);
    toast({
      title: 'Movimentação atualizada',
      description: 'Os dados da movimentação foram atualizados com sucesso',
    });
  };

  const handleExport = () => {
    const headers = ['ID', 'Data', 'Acessório', 'Quantidade', 'Origem', 'Destino', 'Responsável', 'Motivo', 'Status'];
    const rows = movimentacoesFiltradas.map(m => [
      m.id,
      new Date(m.data).toLocaleDateString('pt-BR'),
      m.acessorio,
      m.quantidade.toString(),
      m.origem,
      m.destino,
      m.responsavel,
      m.motivo,
      m.status
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'movimentacoes-acessorios.csv';
    link.click();
  };

  const handleRegistrarMovimentacao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const acessorioId = formData.get('acessorioId') as string;
    const acessorio = acessorios.find(a => a.id === acessorioId);
    
    const responsavelId = formData.get('responsavel') as string;
    const responsavelNome = colaboradoresComPermissao.find(c => c.id === responsavelId)?.nome || responsavelId;
    
    const motivo = formData.get('motivo') as string;
    
    if (!motivo || !motivo.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o motivo da movimentação',
        variant: 'destructive'
      });
      return;
    }

    if (!formOrigem || !formDestino) {
      toast({
        title: 'Campo obrigatório',
        description: 'Selecione origem e destino',
        variant: 'destructive'
      });
      return;
    }

    // Obter nome da loja pelo ID
    const origemNome = obterNomeLoja(formOrigem);
    const destinoNome = obterNomeLoja(formDestino);
    
    const novaMovimentacao: MovimentacaoAcessorio = {
      id: `MOV-ACESS-${Date.now()}`,
      data: formData.get('data') as string,
      acessorio: acessorio?.descricao || '',
      acessorioId,
      quantidade: parseInt(formData.get('quantidade') as string),
      origem: origemNome,
      destino: destinoNome,
      responsavel: responsavelNome,
      motivo: motivo,
      status: 'Pendente'
    };

    movimentacoesData = [...movimentacoesData, novaMovimentacao];
    setMovimentacoes(movimentacoesData);
    setDialogOpen(false);
    setFormOrigem('');
    setFormDestino('');
    toast({
      title: 'Movimentação registrada',
      description: `Movimentação ${novaMovimentacao.id} registrada com sucesso`,
    });
  };

  return (
    <EstoqueLayout title="Movimentações - Acessórios">
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Origem</Label>
                <AutocompleteLoja
                  value={origemFilter === 'todas' ? '' : origemFilter}
                  onChange={(v) => setOrigemFilter(v || 'todas')}
                  placeholder="Todas as origens"
                  apenasLojasTipoLoja
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Destino</Label>
                <AutocompleteLoja
                  value={destinoFilter === 'todas' ? '' : destinoFilter}
                  onChange={(v) => setDestinoFilter(v || 'todas')}
                  placeholder="Todos os destinos"
                  apenasLojasTipoLoja
                />
              </div>

              <div className="flex items-end">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setOrigemFilter('todas');
                    setDestinoFilter('todas');
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Limpar
                </Button>
              </div>

              <div className="flex items-end gap-2 justify-end">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Nova Movimentação
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Registrar Movimentação de Acessório</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRegistrarMovimentacao} className="space-y-4">
                  <div>
                    <Label htmlFor="data">Data</Label>
                    <Input id="data" name="data" type="date" required />
                  </div>

                  <div>
                    <Label htmlFor="acessorioId">Acessório</Label>
                    <Select name="acessorioId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {acessorios.filter(a => a.quantidade > 0).map(acessorio => (
                          <SelectItem key={acessorio.id} value={acessorio.id}>
                            {acessorio.descricao} (Qtd: {acessorio.quantidade})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="quantidade">Quantidade</Label>
                    <Input id="quantidade" name="quantidade" type="number" defaultValue="1" required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="origem">Origem *</Label>
                      <AutocompleteLoja
                        value={formOrigem}
                        onChange={(v) => setFormOrigem(v)}
                        placeholder="Selecione a origem"
                        apenasLojasTipoLoja
                      />
                    </div>

                    <div>
                      <Label htmlFor="destino">Destino *</Label>
                      <AutocompleteLoja
                        value={formDestino}
                        onChange={(v) => setFormDestino(v)}
                        placeholder="Selecione o destino"
                        apenasLojasTipoLoja
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="responsavel">Responsável *</Label>
                    <input type="hidden" name="responsavel" value={user?.colaborador?.id || ''} />
                    <Input
                      value={user?.colaborador?.nome || 'Não identificado'}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div>
                    <Label htmlFor="motivo">Motivo *</Label>
                    <Textarea id="motivo" name="motivo" required placeholder="Informe o motivo da movimentação" />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Registrar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <ResponsiveTableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-20 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Acessório</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoesFiltradas.map(mov => (
                <TableRow 
                  key={mov.id}
                  className={cn(
                    mov.status === 'Pendente' && 'bg-yellow-500/10',
                    mov.status === 'Recebido' && 'bg-green-500/10'
                  )}
                >
                  <TableCell className="sticky left-0 z-10 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{mov.acessorio}</TableCell>
                  <TableCell className="font-mono text-xs">{mov.id}</TableCell>
                  <TableCell>{new Date(mov.data).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>{mov.quantidade}</TableCell>
                  <TableCell>{getLojaNome(mov.origem)}</TableCell>
                  <TableCell>{getLojaNome(mov.destino)}</TableCell>
                  <TableCell>{mov.responsavel}</TableCell>
                  <TableCell>
                    {mov.status === 'Recebido' ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Recebido
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate" title={mov.motivo}>{mov.motivo}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Botão Ver Detalhes */}
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setMovimentacaoDetalhe(mov);
                          setShowDetalhesModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {/* Botão Editar - só disponível enquanto pendente */}
                      {mov.status === 'Pendente' && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setMovimentacaoParaEditar(mov);
                            setEditFormData({
                              destino: mov.destino,
                              motivo: mov.motivo,
                            });
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Botão Confirmar - só disponível enquanto pendente */}
                      {mov.status === 'Pendente' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => handleAbrirConfirmacao(mov.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Confirmar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ResponsiveTableContainer>

        {/* Dialog de Confirmação de Recebimento */}
        <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Recebimento</AlertDialogTitle>
              <AlertDialogDescription>
                Selecione o responsável que está confirmando o recebimento desta movimentação.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="responsavelConfirmacao">Responsável *</Label>
              <Input
                value={user?.colaborador?.nome || 'Não identificado'}
                disabled
                className="bg-muted mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setConfirmDialogOpen(false);
                setMovimentacaoParaConfirmar(null);
                setResponsavelConfirmacao('');
              }}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmarRecebimento}>
                Confirmar Recebimento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Detalhes da Movimentação (Timeline) */}
        <Dialog open={showDetalhesModal} onOpenChange={setShowDetalhesModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline da Movimentação
              </DialogTitle>
            </DialogHeader>
            {movimentacaoDetalhe && (
              <div className="space-y-4">
                {/* Acessório */}
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">Acessório</p>
                  <p className="font-medium">{movimentacaoDetalhe.acessorio}</p>
                  <p className="text-sm text-muted-foreground">Quantidade: {movimentacaoDetalhe.quantidade}</p>
                </div>

                {/* Timeline Visual */}
                <div className="relative">
                  {/* Linha de conexão */}
                  <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-border" />
                  
                  {/* Etapa 1 - Envio */}
                  <div className="relative flex gap-4 pb-6">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center z-10">
                      <Package className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">Envio Registrado</p>
                      <div className="bg-muted/30 p-3 rounded-md mt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Loja de Origem</p>
                            <p className="font-medium">{getLojaNome(movimentacaoDetalhe.origem)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Data de Envio</p>
                            <p className="font-medium">{new Date(movimentacaoDetalhe.data).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Usuário que Enviou</p>
                          <p className="font-medium">{movimentacaoDetalhe.responsavel}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Etapa 2 - Destino */}
                  <div className="relative flex gap-4 pb-6">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center z-10",
                      movimentacaoDetalhe.status === 'Recebido' 
                        ? "bg-green-500" 
                        : "bg-yellow-500"
                    )}>
                      {movimentacaoDetalhe.status === 'Recebido' 
                        ? <CheckCircle className="h-4 w-4 text-white" />
                        : <Clock className="h-4 w-4 text-white" />
                      }
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {movimentacaoDetalhe.status === 'Recebido' 
                          ? 'Recebimento Confirmado' 
                          : 'Aguardando Recebimento'}
                      </p>
                      <div className="bg-muted/30 p-3 rounded-md mt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Loja de Destino</p>
                            <p className="font-medium">{getLojaNome(movimentacaoDetalhe.destino)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Data de Recebimento</p>
                            <p className="font-medium">
                              {movimentacaoDetalhe.dataRecebimento 
                                ? new Date(movimentacaoDetalhe.dataRecebimento).toLocaleString('pt-BR')
                                : <span className="text-yellow-600">Pendente</span>}
                            </p>
                          </div>
                        </div>
                        {movimentacaoDetalhe.status === 'Recebido' && (
                          <div>
                            <p className="text-muted-foreground text-xs">Usuário que Recebeu</p>
                            <p className="font-medium">{movimentacaoDetalhe.responsavelRecebimento || '-'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Motivo */}
                {movimentacaoDetalhe.motivo && (
                  <div>
                    <p className="text-sm text-muted-foreground">Motivo</p>
                    <p className="text-sm bg-muted/30 p-2 rounded">{movimentacaoDetalhe.motivo}</p>
                  </div>
                )}

                {/* Status Final */}
                {movimentacaoDetalhe.status === 'Pendente' && (
                  <div className="border-t pt-4">
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                      <Clock className="h-3 w-3 mr-1" />
                      Acessório em trânsito
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Edição da Movimentação */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Movimentação</DialogTitle>
            </DialogHeader>
            {movimentacaoParaEditar && (
              <div className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm text-muted-foreground">Acessório</p>
                  <p className="font-medium">{movimentacaoParaEditar.acessorio}</p>
                  <p className="text-sm text-muted-foreground">Quantidade: {movimentacaoParaEditar.quantidade}</p>
                </div>

                <div>
                  <Label>Origem</Label>
                  <Input value={getLojaNome(movimentacaoParaEditar.origem)} disabled />
                </div>

                <div>
                  <Label htmlFor="editDestino">Destino *</Label>
                  <Select 
                    value={editFormData.destino}
                    onValueChange={(v) => setEditFormData(prev => ({ ...prev, destino: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {lojas
                        .filter(loja => loja.nome !== movimentacaoParaEditar.origem)
                        .map(loja => (
                          <SelectItem key={loja.id} value={loja.nome}>{loja.nome}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="editMotivo">Motivo *</Label>
                  <Textarea 
                    id="editMotivo"
                    value={editFormData.motivo}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, motivo: e.target.value }))}
                    placeholder="Informe o motivo da movimentação"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setEditDialogOpen(false);
                      setMovimentacaoParaEditar(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSalvarEdicao}>Salvar</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </EstoqueLayout>
  );
}
