import { useState, useEffect, useMemo } from 'react';
import { RHLayout } from '@/components/layout/RHLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DollarSign, Users, Percent, History, Save, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { 
  getSalariosComColaboradores,
  updateSalario,
  getHistoricoSalario,
  SalarioComColaborador,
  HistoricoSalario
} from '@/utils/salarioColaboradorApi';
import { getLojaById, getCargoNome } from '@/utils/cadastrosApi';
import { useNavigate } from 'react-router-dom';

interface SalarioEditavel extends SalarioComColaborador {
  novoSalarioFixo: number;
  novaAjudaCusto: number;
  novaComissao: number;
  editando: boolean;
}

export default function RHSalarioColaborador() {
  const navigate = useNavigate();
  const [salarios, setSalarios] = useState<SalarioEditavel[]>([]);
  
  // Modal de histórico
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [historicoSelecionado, setHistoricoSelecionado] = useState<HistoricoSalario[]>([]);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<string>('');
  
  // Modal de comissão por loja
  const [showComissaoLojaModal, setShowComissaoLojaModal] = useState(false);
  const [comissaoLojaSelecionada, setComissaoLojaSelecionada] = useState<{ nome: string; percentual: number } | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = () => {
    const dados = getSalariosComColaboradores();
    setSalarios(dados.map(s => ({
      ...s,
      novoSalarioFixo: s.salarioFixo,
      novaAjudaCusto: s.ajudaCusto,
      novaComissao: s.percentualComissao,
      editando: false
    })));
  };

  const handleEditChange = (colaboradorId: string, field: 'novoSalarioFixo' | 'novaAjudaCusto' | 'novaComissao', value: number) => {
    setSalarios(prev =>
      prev.map(s =>
        s.colaboradorId === colaboradorId
          ? { ...s, [field]: value, editando: true }
          : s
      )
    );
  };

  const handleSalvar = (colaboradorId: string) => {
    const salario = salarios.find(s => s.colaboradorId === colaboradorId);
    if (!salario) return;

    updateSalario(
      colaboradorId,
      {
        salarioFixo: salario.novoSalarioFixo,
        ajudaCusto: salario.novaAjudaCusto,
        percentualComissao: salario.novaComissao
      },
      'GESTOR-001',
      'Gestor RH'
    );

    setSalarios(prev =>
      prev.map(s =>
        s.colaboradorId === colaboradorId
          ? {
              ...s,
              salarioFixo: s.novoSalarioFixo,
              ajudaCusto: s.novaAjudaCusto,
              percentualComissao: s.novaComissao,
              editando: false
            }
          : s
      )
    );

    toast.success(`Salário de ${salario.colaborador.nome} atualizado com sucesso`);
  };

  const handleVerHistorico = (colaboradorId: string, nome: string) => {
    const historico = getHistoricoSalario(colaboradorId);
    setHistoricoSelecionado(historico);
    setColaboradorSelecionado(nome);
    setShowHistoricoModal(true);
  };

  const handleVerComissaoLoja = (nome: string, percentual?: number) => {
    if (percentual !== undefined) {
      setComissaoLojaSelecionada({ nome, percentual });
      setShowComissaoLojaModal(true);
    }
  };

  // Estatísticas
  const totalColaboradores = salarios.length;
  const totalSalariosFixos = salarios.reduce((acc, s) => acc + s.salarioFixo, 0);
  const totalAjudaCusto = salarios.reduce((acc, s) => acc + s.ajudaCusto, 0);
  const mediaComissao = salarios.length > 0
    ? salarios.reduce((acc, s) => acc + s.percentualComissao, 0) / salarios.length
    : 0;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <RHLayout title="Salário - Colaborador">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Colaboradores</p>
                <p className="text-2xl font-bold">{totalColaboradores}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Salários Fixos</p>
                <p className="text-xl font-bold">{formatCurrency(totalSalariosFixos)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Ajuda de Custo</p>
                <p className="text-xl font-bold">{formatCurrency(totalAjudaCusto)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Percent className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Média Comissão</p>
                <p className="text-2xl font-bold">{mediaComissao.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Salários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Configuração de Salários
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Admissão</TableHead>
                  <TableHead className="text-center">Salário Fixo</TableHead>
                  <TableHead className="text-center">Ajuda de Custo</TableHead>
                  <TableHead className="text-center">Comissão</TableHead>
                  <TableHead className="text-center">Comissão Loja</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salarios.map((salario) => {
                  const temAlteracao = 
                    salario.novoSalarioFixo !== salario.salarioFixo ||
                    salario.novaAjudaCusto !== salario.ajudaCusto ||
                    salario.novaComissao !== salario.percentualComissao;
                  
                  return (
                    <TableRow 
                      key={salario.id}
                      className={temAlteracao ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}
                    >
                      <TableCell className="font-mono text-xs">{salario.colaboradorId}</TableCell>
                      <TableCell className="font-medium">{salario.colaborador.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getCargoNome(salario.colaborador.cargo)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(salario.colaborador.dataAdmissao), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <div className="relative w-36">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                            <Input
                              type="text"
                              value={salario.novoSalarioFixo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                handleEditChange(salario.colaboradorId, 'novoSalarioFixo', Number(value) / 100);
                              }}
                              className="pl-9 text-right"
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <div className="relative w-32">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                            <Input
                              type="text"
                              value={salario.novaAjudaCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                handleEditChange(salario.colaboradorId, 'novaAjudaCusto', Number(value) / 100);
                              }}
                              className="pl-9 text-right"
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <div className="relative w-24">
                            <Input
                              type="text"
                              value={salario.novaComissao.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                                handleEditChange(salario.colaboradorId, 'novaComissao', parseFloat(value) || 0);
                              }}
                              className="pr-7 text-right"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {salario.comissaoPorLoja !== undefined ? (
                          <Button
                            variant="link"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleVerComissaoLoja(salario.colaborador.nome, salario.comissaoPorLoja)}
                          >
                            {salario.comissaoPorLoja.toFixed(2)}%
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant={temAlteracao ? 'default' : 'ghost'}
                            onClick={() => handleSalvar(salario.colaboradorId)}
                            disabled={!temAlteracao}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleVerHistorico(salario.colaboradorId, salario.colaborador.nome)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Histórico */}
      <Dialog open={showHistoricoModal} onOpenChange={setShowHistoricoModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Alterações - {colaboradorSelecionado}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {historicoSelecionado.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma alteração registrada.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead className="text-right">Anterior</TableHead>
                    <TableHead className="text-right">Novo</TableHead>
                    <TableHead className="text-center">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicoSelecionado.map((registro) => (
                    <TableRow key={registro.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(registro.createdAt), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{registro.usuarioNome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{registro.campoAlterado}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {registro.valorAnterior || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {registro.valorNovo}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={registro.tipoAcao === 'Criação' ? 'default' : 'secondary'}>
                          {registro.tipoAcao}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Comissão por Loja */}
      <Dialog open={showComissaoLojaModal} onOpenChange={setShowComissaoLojaModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comissão por Loja - {comissaoLojaSelecionada?.nome}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="text-center p-6 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Percentual de Comissão sobre Lucro da Loja</p>
              <p className="text-4xl font-bold text-green-600">
                {comissaoLojaSelecionada?.percentual.toFixed(2)}%
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Este percentual é aplicado sobre o lucro residual da loja onde o colaborador atua.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => navigate('/rh/comissao-por-loja')}>
              Gerenciar Comissões por Loja
            </Button>
            <Button onClick={() => setShowComissaoLojaModal(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RHLayout>
  );
}
