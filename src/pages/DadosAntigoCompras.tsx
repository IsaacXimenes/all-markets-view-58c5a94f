import { DadosSistemaAntigoLayout } from '@/components/layout/DadosSistemaAntigoLayout';
import { DadosAntigoTable } from '@/components/dados-antigo/DadosAntigoTable';
import { ShoppingCart } from 'lucide-react';
import { useXlsxData } from '@/hooks/useXlsxData';

const HEADER_MAP: Record<string, string> = {
  'COMPRA_iD': 'ID',
  'RESPONSÁVEL': 'Responsável',
  'DATA_COMPRA': 'Data Compra',
  'FORNECEDOR': 'Fornecedor',
  'CNPJ_CPF': 'CPF/CNPJ',
  'TELEFONE': 'Telefone',
  'EMAIL': 'E-mail',
  'CIDADE': 'Cidade',
  'TIMESTAMP': 'Registro',
};

export default function DadosAntigoCompras() {
  const { data, headers, loading, error } = useXlsxData({
    url: '/data/compras.xlsx',
    headerMap: HEADER_MAP,
    dateColumns: ['Data Compra'],
  });

  return (
    <DadosSistemaAntigoLayout title="Dados - Sistema Antigo">
      <DadosAntigoTable
        icon={<ShoppingCart className="h-5 w-5" />}
        title="Compras"
        headers={headers}
        data={data as Record<string, any>[]}
        loading={loading}
        error={error}
      />
    </DadosSistemaAntigoLayout>
  );
}
