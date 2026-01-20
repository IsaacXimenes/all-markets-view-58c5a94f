import { useState, useMemo } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getNotasCompra, finalizarNota, NotaCompra } from '@/utils/estoqueApi';
import { getContasFinanceiras, getFornecedores } from '@/utils/cadastrosApi';
import { Eye, CheckCircle, Download, Filter, X, Check, FileText, Clock, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { migrarProdutosNotaParaPendentes } from '@/utils/osApi';
import { adicionarEstoqueAcessorio, getOrCreateAcessorio } from '@/utils/acessoriosApi';
import { useCadastroStore } from '@/store/cadastroStore';

import { formatCurrency } from '@/utils/formatUtils';

// Tipo estendido para incluir status do localStorage
interface NotaEstendida extends NotaCompra {
  statusExtendido?: 'Pendente' | 'Concluído' | 'Recusado' | 'Enviado para Financeiro';
}

export default function FinanceiroConferenciaNotas() {
  const [notasBase] = useState(getNotasCompra());
  
  // Mesclar status do localStorage com notas
  const notas: NotaEstendida[] = useMemo(() => {
    return notasBase.map(nota => {
      const storedStatus = localStorage.getItem(`nota_status_${nota.id}`);
      return {
        ...nota,
        statusExtendido: (storedStatus as NotaEstendida['statusExtendido']) || nota.status as NotaEstendida['statusExtendido']
      };
    });
  }, [notasBase]);
  const [notaSelecionada, setNotaSelecionada] = useState<NotaEstendida | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { obterLojasAtivas, obterFinanceiros, obterNomeLoja } = useCadastroStore();
  
  const contasFinanceiras = getContasFinanceiras().filter(c => c.status === 'Ativo');
  const colaboradoresFinanceiros = obterFinanceiros();
  const fornecedoresList = getFornecedores();
  const lojas = obterLojasAtivas();
  
  const [contaPagamento, setContaPagamento] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [responsavelFinanceiro, setResponsavelFinanceiro] = useState('');
  const [lojaDestino, setLojaDestino] = useState('');

  // Filtros - igual à Conferência de Contas
  const [filters, setFilters] = useState({
    dataInicio: '',
    dataFim: '',
    fornecedor: 'todos',
    palavraChave: ''
  });

  // Filtrar apenas notas "Enviado para Financeiro" e ordenar
  const filteredNotas = useMemo(() => {
    let filtered = notas.filter(nota => {
      // Mostrar apenas notas enviadas para financeiro ou concluídas
      if (nota.statusExtendido !== 'Enviado para Financeiro' && nota.statusExtendido !== 'Concluído') return false;
      
      if (filters.dataInicio && nota.data < filters.dataInicio) return false;
      if (filters.dataFim && nota.data > filters.dataFim) return false;
      if (filters.fornecedor !== 'todos' && nota.fornecedor !== filters.fornecedor) return false;
      if (filters.palavraChave && !nota.numeroNota.toLowerCase().includes(filters.palavraChave.toLowerCase()) && 
          !nota.fornecedor.toLowerCase().includes(filters.palavraChave.toLowerCase())) return false;
      return true;
    });

    // Ordenar: pendentes (enviados para financeiro) primeiro, depois concluídos
    return filtered.sort((a, b) => {
      if (a.statusExtendido === 'Enviado para Financeiro' && b.statusExtendido !== 'Enviado para Financeiro') return -1;
      if (a.statusExtendido !== 'Enviado para Financeiro' && b.statusExtendido === 'Enviado para Financeiro') return 1;
      return new Date(b.data).getTime() - new Date(a.data).getTime();
    });
  }, [notas, filters]);

  // Cards dinâmicos de resumo
  const resumoNotas = useMemo(() => {
    const valorTotal = filteredNotas.reduce((acc, n) => acc + n.valorTotal, 0);
    const valorConferido = filteredNotas
      .filter(n => n.statusExtendido === 'Concluído')
      .reduce((acc, n) => acc + n.valorTotal, 0);
    const valorPendente = filteredNotas
      .filter(n => n.statusExtendido === 'Enviado para Financeiro')
      .reduce((acc, n) => acc + n.valorTotal, 0);
    
    return { valorTotal, valorConferido, valorPendente };
  }, [filteredNotas]);

  const totalPendente = useMemo(() => {
    return filteredNotas
      .filter(n => n.statusExtendido === 'Enviado para Financeiro')
      .reduce((acc, n) => acc + n.valorTotal, 0);
  }, [filteredNotas]);

  const handleVerNota = (nota: NotaCompra) => {
    setNotaSelecionada(nota);
    setContaPagamento('');
    setFormaPagamento('');
    setParcelas('1');
    setResponsavelFinanceiro('');
    setLojaDestino('');
    setDialogOpen(true);
  };

  const mostrarCampoParcelas = formaPagamento === 'Cartão de Crédito' || formaPagamento === 'Boleto';
  
  const botaoDesabilitado = !contaPagamento || !formaPagamento || !responsavelFinanceiro || !lojaDestino || (mostrarCampoParcelas && !parcelas);

  const handleFinalizarNota = () => {
    if (!notaSelecionada || botaoDesabilitado) return;

    const pagamento = {
      formaPagamento,
      parcelas: parseInt(parcelas || '1'),
      valorParcela: notaSelecionada.valorTotal / parseInt(parcelas || '1'),
      dataVencimento: new Date().toISOString().split('T')[0]
    };

    // TRATAMENTO ESPECIAL PARA NOTAS DE URGÊNCIA
    if (notaSelecionada.origem === 'Urgência') {
      // Não finalizar a nota, apenas atualizar status para aguardar produtos
      localStorage.setItem(`nota_status_${notaSelecionada.id}`, 'Pago - Aguardando Produtos');
      localStorage.setItem(`nota_statusUrgencia_${notaSelecionada.id}`, 'Pago - Aguardando Produtos');
      localStorage.setItem(`nota_dataPagamentoFinanceiro_${notaSelecionada.id}`, new Date().toISOString());
      localStorage.setItem(`nota_pagamento_${notaSelecionada.id}`, JSON.stringify(pagamento));
      localStorage.setItem(`nota_responsavelFinanceiro_${notaSelecionada.id}`, responsavelFinanceiro);
      localStorage.setItem(`nota_lojaDestino_${notaSelecionada.id}`, lojaDestino);
      
      // Adicionar timeline de aprovação
      const storedTimeline = localStorage.getItem(`nota_timeline_${notaSelecionada.id}`);
      const timeline = storedTimeline ? JSON.parse(storedTimeline) : [];
      const newEntry = {
        id: `TL-${notaSelecionada.id}-${String(timeline.length + 1).padStart(3, '0')}`,
        dataHora: new Date().toISOString(),
        usuarioId: 'FIN-001',
        usuarioNome: responsavelFinanceiro,
        tipoEvento: 'aprovado_financeiro_urgencia',
        observacoes: `Nota de urgência aprovada pelo financeiro. Pagamento: ${formaPagamento}, Parcelas: ${parcelas}. Aguardando inserção de produtos pelo Estoque.`
      };
      localStorage.setItem(`nota_timeline_${notaSelecionada.id}`, JSON.stringify([newEntry, ...timeline]));
      
      setDialogOpen(false);
      
      toast.success(`✅ Nota de Urgência ${notaSelecionada.id} aprovada! Aguardando inserção de produtos pelo Estoque.`, {
        duration: 5000,
        style: {
          background: '#f97316',
          color: 'white',
          border: 'none'
        }
      });
      
      window.location.reload();
      return;
    }

    // FLUXO NORMAL PARA NOTAS REGULARES
    const notaFinalizada = finalizarNota(notaSelecionada.id, pagamento, responsavelFinanceiro);
    
    if (notaFinalizada) {
      // Atualizar status no localStorage para Concluído
      localStorage.setItem(`nota_status_${notaSelecionada.id}`, 'Concluído');
      
      // Adicionar timeline de aprovação
      const storedTimeline = localStorage.getItem(`nota_timeline_${notaSelecionada.id}`);
      const timeline = storedTimeline ? JSON.parse(storedTimeline) : [];
      const newEntry = {
        id: `TL-${notaSelecionada.id}-${String(timeline.length + 1).padStart(3, '0')}`,
        dataHora: new Date().toISOString(),
        usuarioId: 'FIN-001',
        usuarioNome: responsavelFinanceiro,
        tipoEvento: 'aprovado_financeiro',
        observacoes: `Nota aprovada pelo financeiro. Pagamento: ${formaPagamento}, Parcelas: ${parcelas}`
      };
      localStorage.setItem(`nota_timeline_${notaSelecionada.id}`, JSON.stringify([newEntry, ...timeline]));
      
      // NOVO: Migrar aparelhos para Aparelhos Pendentes (Triagem)
      const aparelhos = notaFinalizada.produtos.filter(p => 
        p.tipoProduto === 'Aparelho' || !p.tipoProduto // fallback para aparelho se não definido
      );
      
      let qtdAparelhosMigrados = 0;
      if (aparelhos.length > 0) {
        const produtosMigrados = migrarProdutosNotaParaPendentes(
          aparelhos,
          notaFinalizada.id,
          notaFinalizada.fornecedor,
          lojaDestino,
          responsavelFinanceiro
        );
        qtdAparelhosMigrados = produtosMigrados.length;
        console.log(`[FINANCEIRO] ${qtdAparelhosMigrados} aparelho(s) migrado(s) para Aparelhos Pendentes`);
      }
      
      // NOVO: Adicionar acessórios diretamente ao estoque
      const acessorios = notaFinalizada.produtos.filter(p => p.tipoProduto === 'Acessório');
      let qtdAcessoriosAdicionados = 0;
      for (const acessorio of acessorios) {
        const acessorioExistente = getOrCreateAcessorio(
          `${acessorio.marca} ${acessorio.modelo}`, // descrição
          acessorio.marca, // categoria
          acessorio.quantidade, // quantidade
          acessorio.valorUnitario, // valorCusto
          lojaDestino // loja
        );
        adicionarEstoqueAcessorio(acessorioExistente.id, acessorio.quantidade, acessorio.valorUnitario);
        qtdAcessoriosAdicionados += acessorio.quantidade;
        console.log(`[FINANCEIRO] Acessório ${acessorio.marca} ${acessorio.modelo} adicionado ao estoque`);
      }
      
      setDialogOpen(false);
      
      // Mensagem de sucesso detalhada
      let mensagem = `✅ Nota ${notaFinalizada.id} liberada!`;
      if (qtdAparelhosMigrados > 0) {
        mensagem += ` ${qtdAparelhosMigrados} aparelho(s) enviado(s) para triagem.`;
      }
      if (qtdAcessoriosAdicionados > 0) {
        mensagem += ` ${qtdAcessoriosAdicionados} acessório(s) adicionado(s) ao estoque.`;
      }
      
      toast.success(mensagem, {
        duration: 5000,
        style: {
          background: '#22c55e',
          color: 'white',
          border: 'none'
        }
      });
      
      // Forçar refresh da página para atualizar lista
      window.location.reload();
    }
  };

  const handleExport = () => {
    const dataToExport = filteredNotas.map(n => ({
      ID: n.id,
      Data: new Date(n.data).toLocaleDateString('pt-BR'),
      'Nº Nota': n.numeroNota,
      Fornecedor: n.fornecedor,
      'Valor Total': formatCurrency(n.valorTotal),
      Status: n.status
    }));
    
    const csvContent = Object.keys(dataToExport[0] || {}).join(';') + '\n' +
      dataToExport.map(row => Object.values(row).join(';')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `conferencia-notas-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success('Dados exportados com sucesso!');
  };

  const handleLimpar = () => {
    setFilters({
      dataInicio: '',
      dataFim: '',
      fornecedor: 'todos',
      palavraChave: ''
    });
  };

  return (
    <FinanceiroLayout title="Conferência de Notas de Entrada">
      <div className="space-y-6">
        {/* Cards de Resumo Dinâmicos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total das Notas</p>
                  <p className="text-2xl font-bold">{formatCurrency(resumoNotas.valorTotal)}</p>
                </div>
                <FileText className="h-10 w-10 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Conferido</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(resumoNotas.valorConferido)}</p>
                </div>
                <CheckCircle2 className="h-10 w-10 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Pendente de Conferência</p>
                  <p className="text-2xl font-bold text-yellow-600">{formatCurrency(resumoNotas.valorPendente)}</p>
                </div>
                <Clock className="h-10 w-10 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros - Igual à Conferência de Contas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="dataInicio">Data Início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="dataFim">Data Fim</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Select value={filters.fornecedor} onValueChange={(value) => setFilters({ ...filters, fornecedor: value })}>
                  <SelectTrigger id="fornecedor">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {fornecedoresList.map(f => (
                      <SelectItem key={f.id} value={f.nome}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="palavraChave">Palavra-chave</Label>
                <Input
                  id="palavraChave"
                  placeholder="Buscar..."
                  value={filters.palavraChave}
                  onChange={(e) => setFilters({ ...filters, palavraChave: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={handleLimpar}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Notas */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Notas de Entrada</CardTitle>
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Nº Nota</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhuma nota encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredNotas.map(nota => (
                      <TableRow 
                        key={nota.id}
                        className={nota.statusExtendido === 'Enviado para Financeiro' ? 'bg-blue-500/20' : 'bg-green-500/20'}
                      >
                        <TableCell className="font-mono text-xs">{nota.id}</TableCell>
                        <TableCell>{new Date(nota.data).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="font-mono text-xs">{nota.numeroNota}</TableCell>
                        <TableCell>{nota.fornecedor}</TableCell>
                        <TableCell>
                          <Badge variant={nota.origem === 'Urgência' ? 'destructive' : 'outline'} className={nota.origem === 'Urgência' ? 'bg-orange-500 hover:bg-orange-600' : ''}>
                            {nota.origem || 'Normal'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(nota.valorTotal)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={nota.statusExtendido === 'Concluído' ? 'default' : 'secondary'} className={nota.statusExtendido === 'Enviado para Financeiro' ? 'bg-blue-500 text-white' : ''}>
                            {nota.statusExtendido}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {nota.statusExtendido === 'Enviado para Financeiro' ? (
                            <Button size="sm" onClick={() => handleVerNota(nota)}>
                              <Check className="h-4 w-4 mr-1" />
                              Conferir
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => handleVerNota(nota)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {filteredNotas.filter(n => n.statusExtendido === 'Enviado para Financeiro').length} nota(s) aguardando conferência
              </span>
              <span className="text-lg font-bold">
                Total Pendente: {formatCurrency(totalPendente)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Conferir Nota {notaSelecionada?.id}</DialogTitle>
            </DialogHeader>
            
            {notaSelecionada && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nº da Nota</Label>
                      <Input value={notaSelecionada.numeroNota} disabled />
                    </div>
                    <div>
                      <Label>Data</Label>
                      <Input value={new Date(notaSelecionada.data).toLocaleDateString('pt-BR')} disabled />
                    </div>
                  </div>

                  <div>
                    <Label>Fornecedor</Label>
                    <Input value={notaSelecionada.fornecedor} disabled />
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Produtos (Somente Leitura)</h3>
                    <div className="space-y-2 text-sm">
                      {notaSelecionada.produtos.map((prod, idx) => (
                        <div key={idx} className="p-3 bg-muted/30 rounded">
                          <div className="flex justify-between">
                            <span className="font-medium">{prod.marca} {prod.modelo} - {prod.cor}</span>
                            <span>{formatCurrency(prod.valorTotal)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            IMEI: {prod.imei} | Qtd: {prod.quantidade} | Tipo: {prod.tipo}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {notaSelecionada.statusExtendido === 'Enviado para Financeiro' && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-3 text-primary">Seção "Pagamento" (Habilitada)</h3>
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor="lojaDestino">Loja de Destino dos Produtos *</Label>
                          <Select value={lojaDestino} onValueChange={setLojaDestino}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a loja" />
                            </SelectTrigger>
                            <SelectContent>
                              {lojas.map(l => (
                                <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!lojaDestino && (
                            <p className="text-sm text-muted-foreground mt-1">Selecione a loja de destino dos aparelhos</p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="contaPagamento">Conta de Pagamento *</Label>
                          <Select value={contaPagamento} onValueChange={setContaPagamento}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a conta" />
                            </SelectTrigger>
                            <SelectContent>
                              {contasFinanceiras.map(c => (
                                <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="formaPagamento">Forma de Pagamento *</Label>
                          <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pix">Pix</SelectItem>
                              <SelectItem value="Transferência Bancária">Transferência Bancária</SelectItem>
                              <SelectItem value="Boleto">Boleto</SelectItem>
                              <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {mostrarCampoParcelas && (
                          <div>
                            <Label htmlFor="parcelas">Nº de Parcelas *</Label>
                            <Input 
                              id="parcelas" 
                              type="number" 
                              min="1" 
                              value={parcelas}
                              onChange={(e) => setParcelas(e.target.value)}
                            />
                            {!parcelas && (
                              <p className="text-sm text-destructive mt-1">Informe o número de parcelas</p>
                            )}
                          </div>
                        )}

                        <div>
                          <Label htmlFor="responsavelFinanceiro">Responsável Financeiro *</Label>
                          <Select value={responsavelFinanceiro} onValueChange={setResponsavelFinanceiro}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o responsável" />
                            </SelectTrigger>
                            <SelectContent>
                              {colaboradoresFinanceiros.map(col => (
                                <SelectItem key={col.id} value={col.nome}>{col.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {!responsavelFinanceiro && (
                            <p className="text-sm text-muted-foreground mt-1">Selecione um colaborador com permissão financeira</p>
                          )}
                        </div>

                        <div>
                          <Label>Valor Total</Label>
                          <Input 
                            value={formatCurrency(notaSelecionada.valorTotal)} 
                            disabled 
                            className="font-bold text-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    {notaSelecionada.statusExtendido === 'Enviado para Financeiro' ? 'Cancelar' : 'Fechar'}
                  </Button>
                  {notaSelecionada.statusExtendido === 'Enviado para Financeiro' && (
                    <Button 
                      onClick={handleFinalizarNota}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={botaoDesabilitado}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Aprovar e Finalizar
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </FinanceiroLayout>
  );
}
