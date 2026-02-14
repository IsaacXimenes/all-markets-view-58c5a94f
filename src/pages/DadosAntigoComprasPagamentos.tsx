import { DadosSistemaAntigoLayout } from '@/components/layout/DadosSistemaAntigoLayout';
import { DadosAntigoTable } from '@/components/dados-antigo/DadosAntigoTable';
import { CreditCard } from 'lucide-react';
import { useXlsxData } from '@/hooks/useXlsxData';

const HEADER_MAP: Record<string, string> = {
  'FORNECEDOR': 'Fornecedor',
  'DATA_PAGAMETO': 'Data Pagamento',
  'PAGAMENTO': 'Pagamento',
  'VALOR': 'Valor',
  'DESCRIÇÃO': 'Descrição',
  'LEMBRETE': 'Lembrete',
};

export default function DadosAntigoComprasPagamentos() {
  const { data, headers, loading, error } = useXlsxData({
    url: '/data/compras-pagamentos.xlsx',
    headerMap: HEADER_MAP,
    dateColumns: ['Data Pagamento'],
  });

  return (
    <DadosSistemaAntigoLayout title="Dados - Sistema Antigo">
      <DadosAntigoTable
        icon={<CreditCard className="h-5 w-5" />}
        title="Compras Pagamentos"
        headers={headers}
        data={data as Record<string, any>[]}
        loading={loading}
        error={error}
      />
    </DadosSistemaAntigoLayout>
  );
}
