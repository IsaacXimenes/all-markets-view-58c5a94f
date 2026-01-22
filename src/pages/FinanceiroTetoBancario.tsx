import { useState, useMemo } from 'react';
import { FinanceiroLayout } from '@/components/layout/FinanceiroLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, Lock, AlertTriangle, AlertCircle, 
  DollarSign, TrendingUp
} from 'lucide-react';

import { getContasFinanceiras, ContaFinanceira } from '@/utils/cadastrosApi';
import { useCadastroStore } from '@/store/cadastroStore';
import { formatarMoeda } from '@/utils/formatUtils';

const formatCurrency = formatarMoeda;

// Constantes do sistema
const TETO_BANCARIO = 120000; // R$ 120.000
const ALERTA_LIMITE = 100000; // R$ 100.000

export default function FinanceiroTetoBancario() {
  const { obterNomeLoja } = useCadastroStore();
  const [contasFinanceiras] = useState<ContaFinanceira[]>(getContasFinanceiras());
  
  // Separar contas por tipo de máquina
  const { contasProprias, contasTerceirizadas, totais } = useMemo(() => {
    const proprias = contasFinanceiras.filter(c => c.statusMaquina === 'Própria' && c.status === 'Ativo');
    const terceirizadas = contasFinanceiras.filter(c => c.statusMaquina === 'Terceirizada' && c.status === 'Ativo');
    
    const totalProprias = proprias.reduce((acc, c) => acc + (c.saldoInicial || 0), 0);
    const totalTerceirizadas = terceirizadas.reduce((acc, c) => acc + (c.saldoInicial || 0), 0);
    const contasEmAlerta = proprias.filter(c => (c.saldoInicial || 0) >= ALERTA_LIMITE).length;
    const contasNoTeto = proprias.filter(c => (c.saldoInicial || 0) >= TETO_BANCARIO).length;
    
    return {
      contasProprias: proprias,
      contasTerceirizadas: terceirizadas,
      totais: { totalProprias, totalTerceirizadas, contasEmAlerta, contasNoTeto }
    };
  }, [contasFinanceiras]);

  return (
    <FinanceiroLayout title="Teto Bancário">
      <div className="space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Lock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contas Próprias</p>
                  <p className="text-2xl font-bold">{contasProprias.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contas Terceirizadas</p>
                  <p className="text-2xl font-bold">{contasTerceirizadas.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Em Alerta (&ge;100k)</p>
                  <p className="text-2xl font-bold text-orange-600">{totais.contasEmAlerta}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">No Teto (&ge;120k)</p>
                  <p className="text-2xl font-bold text-red-600">{totais.contasNoTeto}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seção: Contas Próprias */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold">Contas Próprias</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Monitoramento de limite bancário (teto: {formatCurrency(TETO_BANCARIO)})
          </p>
          
          {contasProprias.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma conta própria cadastrada
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contasProprias.map(conta => {
                const saldoAtual = conta.saldoInicial || 0;
                const percentual = Math.min(100, (saldoAtual / TETO_BANCARIO) * 100);
                const emAlerta = saldoAtual >= ALERTA_LIMITE;
                const atingiuTeto = saldoAtual >= TETO_BANCARIO;
                
                return (
                  <Card 
                    key={conta.id} 
                    className={
                      atingiuTeto 
                        ? 'border-2 border-red-500' 
                        : emAlerta 
                          ? 'border-2 border-orange-500' 
                          : ''
                    }
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="truncate">{conta.nome}</span>
                        <div className="flex items-center gap-1">
                          {atingiuTeto && <AlertCircle className="h-5 w-5 text-red-500" />}
                          {emAlerta && !atingiuTeto && <AlertTriangle className="h-5 w-5 text-orange-500" />}
                        </div>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{obterNomeLoja(conta.lojaVinculada)}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Saldo Atual</span>
                          <span className={`font-bold ${atingiuTeto ? 'text-red-600' : emAlerta ? 'text-orange-600' : 'text-green-600'}`}>
                            {formatCurrency(saldoAtual)}
                          </span>
                        </div>
                        
                        {/* Barra de progresso */}
                        <div className="space-y-1">
                          <Progress 
                            value={percentual} 
                            className={`h-3 ${atingiuTeto ? '[&>div]:bg-red-500' : emAlerta ? '[&>div]:bg-orange-500' : '[&>div]:bg-green-500'}`}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{percentual.toFixed(1)}%</span>
                            <span>Teto: {formatCurrency(TETO_BANCARIO)}</span>
                          </div>
                        </div>
                        
                        {/* Alertas visuais */}
                        {emAlerta && !atingiuTeto && (
                          <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded text-xs text-orange-700 dark:text-orange-300 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            <span>Atenção: Próximo do limite!</span>
                          </div>
                        )}
                        {atingiuTeto && (
                          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>Teto bancário atingido!</span>
                          </div>
                        )}
                        
                        {/* Info adicional */}
                        <div className="pt-2 border-t text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Banco:</span>
                            <span>{conta.banco || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tipo:</span>
                            <span>{conta.tipo || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          
          {/* Total das contas próprias */}
          {contasProprias.length > 0 && (
            <div className="flex justify-end">
              <Card className="inline-block">
                <CardContent className="py-3 px-6 flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Contas Próprias</p>
                    <p className="text-lg font-bold">{formatCurrency(totais.totalProprias)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <Separator className="my-6" />

        {/* Seção: Contas Terceirizadas */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold">Contas Terceirizadas</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Visualização de montante (sem limite de teto)
          </p>
          
          {contasTerceirizadas.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma conta terceirizada cadastrada
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contasTerceirizadas.map(conta => (
                <Card key={conta.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base truncate">{conta.nome}</CardTitle>
                    <p className="text-xs text-muted-foreground">{obterNomeLoja(conta.lojaVinculada)}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Montante</span>
                        <span className="text-xl font-bold">{formatCurrency(conta.saldoInicial || 0)}</span>
                      </div>
                      
                      {/* Info adicional */}
                      <div className="pt-2 border-t text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>Banco:</span>
                          <span>{conta.banco || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tipo:</span>
                          <span>{conta.tipo || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Total das contas terceirizadas */}
          {contasTerceirizadas.length > 0 && (
            <div className="flex justify-end">
              <Card className="inline-block">
                <CardContent className="py-3 px-6 flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total Contas Terceirizadas</p>
                    <p className="text-lg font-bold">{formatCurrency(totais.totalTerceirizadas)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </FinanceiroLayout>
  );
}
