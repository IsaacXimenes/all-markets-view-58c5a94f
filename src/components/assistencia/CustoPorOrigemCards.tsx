import React, { useMemo } from 'react';
import { Wrench, Shield, Package, PackageCheck } from 'lucide-react';
import { OrdemServico, PecaServico } from '@/utils/assistenciaApi';
import { formatCurrency } from '@/utils/formatUtils';
import { Card, CardContent } from '@/components/ui/card';

interface DetalheOrigem {
  consignado: number;
  estoqueThiago: number;
  retirada: number;
  fornecedor: number;
  manual: number;
}

const emptyDetalhe = (): DetalheOrigem => ({ consignado: 0, estoqueThiago: 0, retirada: 0, fornecedor: 0, manual: 0 });

export interface CustosPorOrigem {
  custoBalcao: number;
  custoGarantia: number;
  custoEstoque: number;
  investimentoConsignados: number;
  detalheBalcao: DetalheOrigem;
  detalheGarantia: DetalheOrigem;
  detalheEstoque: DetalheOrigem;
}

const acumularDetalhe = (detalhe: DetalheOrigem, origemPeca: string | undefined, custo: number) => {
  if (origemPeca === 'Consignado') detalhe.consignado += custo;
  else if (origemPeca === 'Estoque Thiago') detalhe.estoqueThiago += custo;
  else if (origemPeca === 'Retirada de Pecas') detalhe.retirada += custo;
  else if (origemPeca === 'Fornecedor') detalhe.fornecedor += custo;
  else detalhe.manual += custo;
};

const calcularDePecas = (pecas: PecaServico[]): CustosPorOrigem => {
  const result: CustosPorOrigem = {
    custoBalcao: 0, custoGarantia: 0, custoEstoque: 0, investimentoConsignados: 0,
    detalheBalcao: emptyDetalhe(), detalheGarantia: emptyDetalhe(), detalheEstoque: emptyDetalhe(),
  };

  pecas.forEach(p => {
    const custo = p.valorCustoReal ?? 0;
    if (p.origemServico === 'Balcao') { result.custoBalcao += custo; acumularDetalhe(result.detalheBalcao, p.origemPeca, custo); }
    if (p.origemServico === 'Garantia') { result.custoGarantia += custo; acumularDetalhe(result.detalheGarantia, p.origemPeca, custo); }
    if (p.origemServico === 'Estoque') { result.custoEstoque += custo; acumularDetalhe(result.detalheEstoque, p.origemPeca, custo); }
    if (p.origemPeca === 'Consignado') result.investimentoConsignados += custo;
  });

  return result;
};

export const calcularCustosPorOrigem = (osList: OrdemServico[]): CustosPorOrigem => {
  const allPecas = osList.flatMap(os => os.pecas);
  return calcularDePecas(allPecas);
};

export const calcularCustosDePecas = (pecas: PecaServico[]): CustosPorOrigem => calcularDePecas(pecas);

function DetalheOrigemList({ detalhe }: { detalhe: DetalheOrigem }) {
  const items = [
    { label: 'Consignado', value: detalhe.consignado },
    { label: 'Est. Thiago', value: detalhe.estoqueThiago },
    { label: 'Retirada', value: detalhe.retirada },
    { label: 'Fornecedor', value: detalhe.fornecedor },
    { label: 'Manual', value: detalhe.manual },
  ].filter(i => i.value > 0);

  if (items.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
      {items.map(i => (
        <span key={i.label} className="text-[10px] text-muted-foreground whitespace-nowrap">
          {i.label}: {formatCurrency(i.value)}
        </span>
      ))}
    </div>
  );
}

interface CostCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  className: string;
  detalhe: DetalheOrigem;
}

function CostCard({ title, value, icon, className, detalhe }: CostCardProps) {
  return (
    <Card className={`transition-all duration-300 hover:shadow-md overflow-hidden ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <div className="h-5 w-5 text-primary">{icon}</div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold truncate">{formatCurrency(value)}</p>
            <DetalheOrigemList detalhe={detalhe} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CustoPorOrigemCardsProps {
  ordensServico?: OrdemServico[];
  pecas?: PecaServico[];
  titulo?: string;
}

export function CustoPorOrigemCards({ ordensServico, pecas, titulo }: CustoPorOrigemCardsProps) {
  const custos = useMemo(() => {
    if (pecas) return calcularCustosDePecas(pecas);
    if (ordensServico) return calcularCustosPorOrigem(ordensServico);
    return { custoBalcao: 0, custoGarantia: 0, custoEstoque: 0, investimentoConsignados: 0, detalheBalcao: emptyDetalhe(), detalheGarantia: emptyDetalhe(), detalheEstoque: emptyDetalhe() };
  }, [ordensServico, pecas]);

  const temDados = custos.custoBalcao > 0 || custos.custoGarantia > 0 || custos.custoEstoque > 0 || custos.investimentoConsignados > 0;

  if (!temDados) return null;

  return (
    <div className="space-y-2">
      {titulo && <h3 className="text-sm font-semibold text-muted-foreground">{titulo}</h3>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CostCard title="Custo - Balcão" value={custos.custoBalcao} icon={<Wrench />} className="bg-blue-500/5 border-blue-500/20" detalhe={custos.detalheBalcao} />
        <CostCard title="Custo - Garantia" value={custos.custoGarantia} icon={<Shield />} className="bg-red-500/5 border-red-500/20" detalhe={custos.detalheGarantia} />
        <CostCard title="Custo - Estoque" value={custos.custoEstoque} icon={<Package />} className="bg-green-500/5 border-green-500/20" detalhe={custos.detalheEstoque} />
        <CostCard title="Invest. Consignados" value={custos.investimentoConsignados} icon={<PackageCheck />} className="bg-violet-500/5 border-violet-500/20" detalhe={emptyDetalhe()} />
      </div>
    </div>
  );
}
