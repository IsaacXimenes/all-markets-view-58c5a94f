import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  NotaEntrada,
  NotaEntradaStatus,
  AtuacaoAtual,
  TipoPagamentoNota,
  podeEditarNota
} from '@/utils/notaEntradaFluxoApi';
import { getFornecedores } from '@/utils/cadastrosApi';
import { formatCurrency } from '@/utils/formatUtils';
import { 
  Eye, 
  Plus,
  ClipboardCheck,
  Lock,
  Warehouse,
  Landmark,
  CreditCard,
  Clock,
  Zap
} from 'lucide-react';

interface TabelaNotasPendenciasProps {
  notas: NotaEntrada[];
  modulo: 'Estoque' | 'Financeiro';
  onVerDetalhes?: (nota: NotaEntrada) => void;
  onCadastrarProdutos?: (nota: NotaEntrada) => void;
  onConferir?: (nota: NotaEntrada) => void;
  onPagar?: (nota: NotaEntrada) => void;
}

// Helper para obter nome do fornecedor a partir do ID
const obterNomeFornecedor = (idOuNome: string): string => {
  // Se já for um nome (não começa com FORN-), retornar diretamente
  if (!idOuNome.startsWith('FORN-')) {
    return idOuNome;
  }
  
  // Buscar no cadastro de fornecedores
  const fornecedores = getFornecedores();
  const fornecedor = fornecedores.find(f => f.id === idOuNome);
  return fornecedor?.nome || idOuNome;
};

// Calcular dias decorridos
const calcularDiasDecorridos = (data: string): number => {
  const dataInicio = new Date(data);
  const hoje = new Date();
  return Math.ceil((hoje.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
};

// Formatar data/hora para exibição
const formatarDataHora = (dataISO: string): string => {
  const data = new Date(dataISO);
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function TabelaNotasPendencias({
  notas,
  modulo,
  onVerDetalhes,
  onCadastrarProdutos,
  onConferir,
  onPagar
}: TabelaNotasPendenciasProps) {
  const navigate = useNavigate();

  // Memoizar lookup de fornecedores para performance
  const fornecedoresMap = useMemo(() => {
    const map = new Map<string, string>();
    getFornecedores().forEach(f => {
      map.set(f.id, f.nome);
    });
    return map;
  }, []);

  const getNomeFornecedor = (idOuNome: string): string => {
    if (!idOuNome.startsWith('FORN-')) {
      return idOuNome;
    }
    return fornecedoresMap.get(idOuNome) || idOuNome;
  };

  const getStatusBadge = (status: NotaEntradaStatus) => {
    const statusConfig: Record<NotaEntradaStatus, { bg: string; text: string; label: string }> = {
      'Criada': { bg: 'bg-secondary', text: 'text-secondary-foreground', label: 'Criada' },
      'Aguardando Pagamento Inicial': { bg: 'bg-primary/10', text: 'text-primary', label: 'Aguard. Pag. Inicial' },
      'Pagamento Parcial Realizado': { bg: 'bg-primary/20', text: 'text-primary', label: 'Pag. Parcial' },
      'Pagamento Concluido': { bg: 'bg-primary/30', text: 'text-primary', label: 'Pago' },
      'Aguardando Conferencia': { bg: 'bg-accent', text: 'text-accent-foreground', label: 'Aguard. Conf.' },
      'Conferencia Parcial': { bg: 'bg-accent', text: 'text-accent-foreground', label: 'Conf. Parcial' },
      'Conferencia Concluida': { bg: 'bg-primary/40', text: 'text-primary', label: 'Conf. Concluída' },
      'Aguardando Pagamento Final': { bg: 'bg-primary/10', text: 'text-primary', label: 'Aguard. Pag. Final' },
      'Com Divergencia': { bg: 'bg-destructive/10', text: 'text-destructive', label: 'Divergência' },
      'Finalizada': { bg: 'bg-primary', text: 'text-primary-foreground', label: 'Finalizada' }
    };
    
    const config = statusConfig[status] || { bg: 'bg-muted', text: 'text-muted-foreground', label: status };
    
    return (
      <Badge variant="outline" className={`${config.bg} ${config.text}`}>
        {config.label}
      </Badge>
    );
  };

  const getTipoPagamentoBadge = (tipo: TipoPagamentoNota) => {
    switch (tipo) {
      case 'Pagamento 100% Antecipado':
        return <Badge variant="outline" className="bg-primary/10 text-primary">100% Antecipado</Badge>;
      case 'Pagamento Parcial':
        return <Badge variant="outline" className="bg-accent text-accent-foreground">Parcial</Badge>;
      case 'Pagamento Pos':
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Pós</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  const getAtuacaoBadge = (atuacao: AtuacaoAtual) => {
    switch (atuacao) {
      case 'Estoque':
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">
            <Warehouse className="h-3 w-3" />
            Estoque
          </Badge>
        );
      case 'Financeiro':
        return (
          <Badge className="bg-accent text-accent-foreground gap-1">
            <Landmark className="h-3 w-3" />
            Financeiro
          </Badge>
        );
      case 'Encerrado':
        return (
          <Badge variant="secondary" className="gap-1">
            <Lock className="h-3 w-3" />
            Encerrado
          </Badge>
        );
      default:
        return <Badge variant="outline">{atuacao}</Badge>;
    }
  };

  const podeEditar = (nota: NotaEntrada) => podeEditarNota(nota, modulo);

  const getRowClass = (nota: NotaEntrada) => {
    // Notas finalizadas ficam com fundo verde claro
    if (nota.status === 'Finalizada' || nota.atuacaoAtual === 'Encerrado') return 'bg-green-500/10';
    if (nota.status === 'Com Divergencia') return 'bg-destructive/10';
    if (nota.alertas.some(a => !a.resolvido && a.tipo === 'status_critico')) return 'bg-warning/10';
    if (nota.atuacaoAtual === modulo) return 'bg-primary/5';
    return '';
  };

  const handleVerDetalhes = (nota: NotaEntrada) => {
    if (onVerDetalhes) {
      onVerDetalhes(nota);
    } else {
      navigate(`/estoque/nota/${nota.id}`);
    }
  };

  const handleCadastrarProdutos = (nota: NotaEntrada) => {
    if (onCadastrarProdutos) {
      onCadastrarProdutos(nota);
    } else {
      navigate(`/estoque/nota/${nota.id}/cadastrar-produtos`);
    }
  };

  const handleConferir = (nota: NotaEntrada) => {
    if (onConferir) {
      onConferir(nota);
    } else {
      navigate(`/estoque/nota/${nota.id}/conferencia`);
    }
  };

  const handlePagar = (nota: NotaEntrada) => {
    if (onPagar) {
      onPagar(nota);
    }
  };

  // Calcular percentual de conferência (usa qtdCadastrada como base)
  const calcularPercentualConferencia = (nota: NotaEntrada): number => {
    if (nota.qtdCadastrada === 0) return 0;
    return Math.round((nota.qtdConferida / nota.qtdCadastrada) * 100);
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data/Hora</TableHead>
            <TableHead>Nº Nota</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead>Urgência</TableHead>
            <TableHead>Tipo Pag.</TableHead>
            <TableHead>Atuação Atual</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Qtd Inf./Cad./Conf.</TableHead>
            <TableHead>% Conf.</TableHead>
            <TableHead>Valor Total</TableHead>
            <TableHead>Valor Pago</TableHead>
            <TableHead>Saldo Devedor</TableHead>
            <TableHead>Dias</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                Nenhuma nota pendente encontrada
              </TableCell>
            </TableRow>
          ) : (
            notas.map(nota => {
              const percentual = calcularPercentualConferencia(nota);
              const dias = calcularDiasDecorridos(nota.data);
              const podeEditarNota = podeEditar(nota);
              
              return (
                <TableRow key={nota.id} className={getRowClass(nota)}>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                      <Clock className="h-3 w-3" />
                      {formatarDataHora(nota.dataCriacao)}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{nota.numeroNota}</TableCell>
                  <TableCell>{getNomeFornecedor(nota.fornecedor)}</TableCell>
                  <TableCell>
                    {nota.urgente ? (
                      <Badge variant="destructive" className="gap-1">
                        <Zap className="h-3 w-3" />
                        Urgente
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getTipoPagamentoBadge(nota.tipoPagamento)}</TableCell>
                  <TableCell>{getAtuacaoBadge(nota.atuacaoAtual)}</TableCell>
                  <TableCell>{getStatusBadge(nota.status)}</TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs text-muted-foreground">
                      {nota.qtdInformada} / {nota.qtdCadastrada} / {nota.qtdConferida}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={percentual} className="w-12 h-2" />
                      <Badge variant="outline" className={
                        percentual === 100 
                          ? 'bg-primary/20 text-primary' 
                          : percentual >= 50 
                            ? 'bg-accent text-accent-foreground'
                            : 'bg-muted text-muted-foreground'
                      }>
                        {percentual}%
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(nota.valorTotal)}</TableCell>
                  <TableCell>{formatCurrency(nota.valorPago)}</TableCell>
                  <TableCell>
                    {nota.status === 'Finalizada' || Math.abs(nota.valorPendente) <= 0.01 ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary">Quitado</Badge>
                    ) : (
                      <span className="text-destructive font-medium">{formatCurrency(nota.valorPendente)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      dias >= 7 ? 'bg-destructive/10 text-destructive' :
                      dias >= 5 ? 'bg-warning/10 text-warning-foreground' :
                      'bg-muted text-muted-foreground'
                    }>
                      {dias}d
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleVerDetalhes(nota)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver detalhes</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {/* Ações do Estoque */}
                      {modulo === 'Estoque' && podeEditarNota && (
                        <>
                          {/* Botão para cadastrar produtos - aparece quando qtd cadastrada < informada OU quando qtdInformada > 0 e ainda há espaço */}
                          {(nota.qtdCadastrada < nota.qtdInformada || nota.qtdInformada === 0) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-primary hover:text-primary"
                                    onClick={() => handleCadastrarProdutos(nota)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Cadastrar produtos</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          
                          {nota.qtdCadastrada > 0 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-primary hover:text-primary"
                                    onClick={() => handleConferir(nota)}
                                  >
                                    <ClipboardCheck className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Conferir produtos</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </>
                      )}
                      
                      {/* Ações do Financeiro */}
                      {modulo === 'Financeiro' && nota.valorPago < nota.valorTotal && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className={podeEditarNota 
                                    ? "text-primary hover:text-primary" 
                                    : "text-muted-foreground cursor-not-allowed"
                                  }
                                  onClick={() => podeEditarNota && handlePagar(nota)}
                                  disabled={!podeEditarNota}
                                >
                                  {podeEditarNota ? (
                                    <CreditCard className="h-4 w-4" />
                                  ) : (
                                    <Lock className="h-4 w-4" />
                                  )}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {podeEditarNota 
                                ? 'Registrar pagamento' 
                                : `Aguardando ação do ${nota.atuacaoAtual}`
                              }
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      {/* Indicador de bloqueio quando não pode editar */}
                      {!podeEditarNota && modulo === 'Estoque' && nota.atuacaoAtual !== 'Encerrado' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center px-2 text-muted-foreground">
                                <Lock className="h-4 w-4" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Aguardando ação do {nota.atuacaoAtual}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
