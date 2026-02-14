import { DadosSistemaAntigoLayout } from '@/components/layout/DadosSistemaAntigoLayout';
import { DadosAntigoTable } from '@/components/dados-antigo/DadosAntigoTable';
import { PackageOpen } from 'lucide-react';
import { useXlsxData } from '@/hooks/useXlsxData';

const HEADER_MAP: Record<string, string> = {
  'LOJA': 'Loja',
  'UPC': 'UPC',
  'MARCA': 'Marca',
  'MODELO': 'Modelo',
  'ANOTAÇÃO': 'Anotação',
  'COR': 'Cor',
  'IMEI': 'IMEI',
  'TIPO': 'Tipo',
  'VALOR': 'Valor',
  'QUANTIDADE': 'Qtd',
  'SAÚDE DA BATERIA': 'Bateria',
  'FORNECEDOR': 'Fornecedor',
  'CUSTO': 'Custo',
  'CUSTO_ATUALIZADO': 'Custo Atualizado',
  '_STATUS': 'Status',
  'DATA DE ENTRADA': 'Data Entrada',
};

export default function DadosAntigoEntradas() {
  const { data, headers, loading, error } = useXlsxData({
    url: '/data/entradas.xlsx',
    headerMap: HEADER_MAP,
    dateColumns: ['Data Entrada'],
  });

  return (
    <DadosSistemaAntigoLayout title="Dados - Sistema Antigo">
      <DadosAntigoTable
        icon={<PackageOpen className="h-5 w-5" />}
        title="Entradas"
        headers={headers}
        data={data as Record<string, any>[]}
        loading={loading}
        error={error}
      />
    </DadosSistemaAntigoLayout>
  );
}
