import { useState, useEffect, useMemo } from 'react';
import { RHLayout } from '@/components/layout/RHLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { DollarSign, Save, History } from 'lucide-react';
import { 
  getColaboradores, 
  getLojaById, 
  getCargoNome,
  Colaborador 
} from '@/utils/cadastrosApi';
import { 
  getComissaoColaborador, 
  updateComissaoColaborador,
  getHistoricoComissao,
  HistoricoComissao
} from '@/utils/comissoesApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface ColaboradorComissao extends Colaborador {
  salarioFixo: number;
  percentualComissao: number;
  editando: boolean;
  novoFixo: number;
  novaComissao: number;
}

export default function RHComissoes() {
  const [colaboradoresComissao, setColaboradoresComissao] = useState<ColaboradorComissao[]>([]);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [historicoSelecionado, setHistoricoSelecionado] = useState<HistoricoComissao[]>([]);
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<string>('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = () => {
    const colaboradores = getColaboradores().filter(c => c.status === 'Ativo');
    const comissaoData: ColaboradorComissao[] = colaboradores.map(col => {
      const { fixo, comissao } = getComissaoColaborador(col.id);
      return {
        ...col,
        salarioFixo: fixo,
        percentualComissao: comissao,
        editando: false,
        novoFixo: fixo,
        novaComissao: comissao
      };
    });
    setColaboradoresComissao(comissaoData);
  };

  const handleEditChange = (colaboradorId: string, field: 'novoFixo' | 'novaComissao', value: number) => {
    setColaboradoresComissao(prev =>
      prev.map(col =>
        col.id === colaboradorId
          ? { ...col, [field]: value, editando: true }
          : col
      )
    );
  };

  const handleSalvar = (colaboradorId: string) => {
    const col = colaboradoresComissao.find(c => c.id === colaboradorId);
    if (!col) return;

    updateComissaoColaborador(
      colaboradorId,
      col.novoFixo,
      col.novaComissao,
      'Gestor RH' // Em produção, seria o usuário logado
    );

    setColaboradoresComissao(prev =>
      prev.map(c =>
        c.id === colaboradorId
          ? { 
              ...c, 
              salarioFixo: c.novoFixo, 
              percentualComissao: c.novaComissao, 
              editando: false 
            }
          : c
      )
    );

    toast({
      title: "Comissão atualizada",
      description: `Comissão de ${col.nome} foi atualizada com sucesso.`
    });
  };

  const handleVerHistorico = (colaboradorId: string, nome: string) => {
    const historico = getHistoricoComissao(colaboradorId);
    setHistoricoSelecionado(historico);
    setColaboradorSelecionado(nome);
    setShowHistoricoModal(true);
  };

  // Estatísticas
  const totalColaboradores = colaboradoresComissao.length;
  const mediaComissao = colaboradoresComissao.reduce((acc, c) => acc + c.percentualComissao, 0) / totalColaboradores || 0;
  const totalSalariosFixos = colaboradoresComissao.reduce((acc, c) => acc + c.salarioFixo, 0);

  return (
    <RHLayout title="Salários - Comissões">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
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
                <p className="text-sm text-muted-foreground">Média Comissão</p>
                <p className="text-2xl font-bold">{mediaComissao.toFixed(1)}%</p>
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
                <p className="text-sm text-muted-foreground">Total Salários Fixos</p>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSalariosFixos)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Comissões */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Configuração de Comissões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead className="text-center">Salário Fixo</TableHead>
                  <TableHead className="text-center">Comissão</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {colaboradoresComissao.map((colaborador) => {
                  const loja = getLojaById(colaborador.loja);
                  const temAlteracao = colaborador.novoFixo !== colaborador.salarioFixo || 
                                       colaborador.novaComissao !== colaborador.percentualComissao;
                  
                  return (
                    <TableRow 
                      key={colaborador.id}
                      className={temAlteracao ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}
                    >
                      <TableCell className="font-medium">{colaborador.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getCargoNome(colaborador.cargo)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{loja?.nome || '-'}</TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <div className="relative w-36">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                            <Input
                              type="text"
                              value={colaborador.novoFixo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                handleEditChange(colaborador.id, 'novoFixo', Number(value) / 100);
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
                              value={colaborador.novaComissao.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^\d.,]/g, '').replace(',', '.');
                                handleEditChange(colaborador.id, 'novaComissao', parseFloat(value) || 0);
                              }}
                              className="pr-7 text-right"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant={temAlteracao ? 'default' : 'ghost'}
                            onClick={() => handleSalvar(colaborador.id)}
                            disabled={!temAlteracao}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleVerHistorico(colaborador.id, colaborador.nome)}
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
                    <TableHead className="text-right">Fixo Anterior</TableHead>
                    <TableHead className="text-right">Fixo Novo</TableHead>
                    <TableHead className="text-right">Comissão Anterior</TableHead>
                    <TableHead className="text-right">Comissão Nova</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicoSelecionado.map((registro) => (
                    <TableRow key={registro.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(registro.dataAlteracao), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{registro.usuarioAlterou}</TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(registro.fixoAnterior)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(registro.fixoNovo)}
                      </TableCell>
                      <TableCell className="text-right">{registro.comissaoAnterior}%</TableCell>
                      <TableCell className="text-right font-medium">{registro.comissaoNova}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </RHLayout>
  );
}
