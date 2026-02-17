import { DadosSistemaAntigoLayout } from '@/components/layout/DadosSistemaAntigoLayout';
import { DadosAntigoTable } from '@/components/dados-antigo/DadosAntigoTable';
import { Calendar } from 'lucide-react';
import { useXlsxData } from '@/hooks/useXlsxData';

const HEADER_MAP: Record<string, string> = {
  'LOJA': 'Loja',
  'UPC': 'UPC',
  'MARCA': 'Marca',
  'MODELO': 'Modelo',
  'COR': 'Cor',
  'IMEI': 'IMEI',
  'TIPO': 'Tipo',
  'VALOR': 'Valor',
  'QUANTIDADE': 'Qtd',
  'FLAG': 'Flag',
  'SAÚDE DA BATERIA': 'Bateria',
  'FORNECEDOR': 'Fornecedor',
  'CUSTO': 'Custo',
  'PAGAMENTO': 'Pagamento',
  'DATA DE ENTRADA': 'Data Entrada',
};

export default function DadosAntigo2023() {
  const { data, headers, loading, error } = useXlsxData({
    url: '/data/dados-2023.xlsx',
    headerMap: HEADER_MAP,
    dateColumns: ['Data Entrada'],
  });

  return (
    <DadosSistemaAntigoLayout title="Dados - Sistema Antigo">
      <DadosAntigoTable
        icon={<Calendar className="h-5 w-5" />}
        title="Dados - 2023"
        headers={headers}
        data={data as Record<string, any>[]}
        loading={loading}
        error={error}
      />
    </DadosSistemaAntigoLayout>
  );
}
