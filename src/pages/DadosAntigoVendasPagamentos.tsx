import { DadosSistemaAntigoLayout } from '@/components/layout/DadosSistemaAntigoLayout';
import { DadosAntigoTable } from '@/components/dados-antigo/DadosAntigoTable';
import { ListOrdered } from 'lucide-react';
import { useXlsxData } from '@/hooks/useXlsxData';

const HEADER_MAP: Record<string, string> = {
  'DATA_PAGAMETO': 'Data Pagamento',
  'PAGAMENTO': 'Pagamento',
  'PARCELA': 'Parcela',
  'VALOR': 'Valor',
  'TAXA': 'Taxa',
  'MODELO': 'Modelo',
  'IMEI_TROCA': 'IMEI Troca',
  'CONFERIDO': 'Conferido',
};

export default function DadosAntigoVendasPagamentos() {
  const { data, headers, loading, error } = useXlsxData({
    url: '/data/vendas-pagamentos.xlsx',
    headerMap: HEADER_MAP,
    dateColumns: ['Data Pagamento'],
  });

  return (
    <DadosSistemaAntigoLayout title="Dados - Sistema Antigo">
      <DadosAntigoTable
        icon={<ListOrdered className="h-5 w-5" />}
        title="Vendas Pagamentos"
        headers={headers}
        data={data as Record<string, any>[]}
        loading={loading}
        error={error}
      />
    </DadosSistemaAntigoLayout>
  );
}
