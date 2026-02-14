import { DadosSistemaAntigoLayout } from '@/components/layout/DadosSistemaAntigoLayout';
import { DadosAntigoTable } from '@/components/dados-antigo/DadosAntigoTable';
import { Receipt } from 'lucide-react';
import { useXlsxData } from '@/hooks/useXlsxData';

const HEADER_MAP: Record<string, string> = {
  'DATA VENDA': 'Data Venda',
  'LOJA': 'Loja',
  'VENDA_NUMERO': 'Nº Venda',
  'NOME DO CLIENTE': 'Cliente',
  'Path': 'Comprovante',
  'COMENTÁRIO': 'Comentário',
  'VENDEDOR': 'Vendedor',
  'VENDA_FINALIZADA': 'Finalizada',
  'ORIGEM_DA_VENDA': 'Origem',
};

export default function DadosAntigoVendas() {
  const { data, headers, loading, error } = useXlsxData({
    url: '/data/vendas.xlsx',
    headerMap: HEADER_MAP,
    dateColumns: ['Data Venda'],
  });

  return (
    <DadosSistemaAntigoLayout title="Dados - Sistema Antigo">
      <DadosAntigoTable
        icon={<Receipt className="h-5 w-5" />}
        title="Vendas"
        headers={headers}
        data={data as Record<string, any>[]}
        loading={loading}
        error={error}
        linkColumns={['Comprovante']}
      />
    </DadosSistemaAntigoLayout>
  );
}
