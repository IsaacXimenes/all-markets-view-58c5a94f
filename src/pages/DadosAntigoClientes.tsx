import { DadosSistemaAntigoLayout } from '@/components/layout/DadosSistemaAntigoLayout';
import { DadosAntigoTable } from '@/components/dados-antigo/DadosAntigoTable';
import { Users } from 'lucide-react';
import { useXlsxData } from '@/hooks/useXlsxData';

const HEADER_MAP: Record<string, string> = {
  'NOME': 'Nome',
  'TELEFONE': 'Telefone',
  'EMAIL': 'E-mail',
  'CNPJ_CPF': 'CPF/CNPJ',
  'CIDADE': 'Cidade',
};

export default function DadosAntigoClientes() {
  const { data, headers, loading, error } = useXlsxData({
    url: '/data/cadastros-clientes.xlsx',
    headerMap: HEADER_MAP,
  });

  return (
    <DadosSistemaAntigoLayout title="Dados - Sistema Antigo">
      <DadosAntigoTable
        icon={<Users className="h-5 w-5" />}
        title="Cadastro de Clientes"
        headers={headers}
        data={data as Record<string, any>[]}
        loading={loading}
        error={error}
      />
    </DadosSistemaAntigoLayout>
  );
}
