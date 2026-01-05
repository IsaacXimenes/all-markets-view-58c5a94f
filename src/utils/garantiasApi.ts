// Garantias API - Módulo completo de gerenciamento de garantias
import { format, addMonths, differenceInDays } from 'date-fns';

export interface GarantiaItem {
  id: string;
  vendaId: string;
  itemVendaId: string;
  produtoId: string;
  imei: string;
  modelo: string;
  tipoGarantia: 'Garantia - Apple' | 'Garantia - Thiago Imports';
  mesesGarantia: number;
  dataInicioGarantia: string;
  dataFimGarantia: string;
  status: 'Ativa' | 'Expirada' | 'Em Tratativa' | 'Concluída';
  lojaVenda: string;
  clienteId: string;
  clienteNome: string;
  clienteTelefone?: string;
  clienteEmail?: string;
}

export interface TratativaGarantia {
  id: string;
  garantiaId: string;
  tipo: 'Direcionado Apple' | 'Encaminhado Assistência' | 'Assistência + Empréstimo' | 'Troca Direta';
  dataHora: string;
  usuarioId: string;
  usuarioNome: string;
  descricao: string;
  aparelhoEmprestadoId?: string;
  aparelhoEmprestadoModelo?: string;
  aparelhoEmprestadoImei?: string;
  aparelhoTrocaId?: string;
  aparelhoTrocaModelo?: string;
  aparelhoTrocaImei?: string;
  osId?: string;
  status: 'Em Andamento' | 'Concluído';
}

export interface TimelineGarantia {
  id: string;
  garantiaId: string;
  dataHora: string;
  tipo: 'registro_venda' | 'abertura_garantia' | 'tratativa' | 'os_criada' | 'emprestimo' | 'devolucao' | 'troca' | 'conclusao';
  titulo: string;
  descricao: string;
  usuarioId: string;
  usuarioNome: string;
}

// Dados mockados
const hoje = new Date();
const dataHoje = format(hoje, 'yyyy-MM-dd');

let garantias: GarantiaItem[] = [
  // 4 Novos Apple (12 meses automático)
  {
    id: 'GAR-0001',
    vendaId: 'VEN-2025-0001',
    itemVendaId: 'ITEM-001',
    produtoId: 'PROD-0010',
    imei: '352123456789012',
    modelo: 'iPhone 15 Pro Max',
    tipoGarantia: 'Garantia - Apple',
    mesesGarantia: 12,
    dataInicioGarantia: '2025-01-15',
    dataFimGarantia: '2026-01-15',
    status: 'Ativa',
    lojaVenda: 'LOJA-001',
    clienteId: 'CLI-001',
    clienteNome: 'João Silva',
    clienteTelefone: '(11) 99999-1111',
    clienteEmail: 'joao@email.com'
  },
  {
    id: 'GAR-0002',
    vendaId: 'VEN-2025-0002',
    itemVendaId: 'ITEM-002',
    produtoId: 'PROD-0011',
    imei: '352123456789013',
    modelo: 'iPhone 15 Pro',
    tipoGarantia: 'Garantia - Apple',
    mesesGarantia: 12,
    dataInicioGarantia: '2025-01-16',
    dataFimGarantia: '2026-02-10',
    status: 'Concluída',
    lojaVenda: 'LOJA-002',
    clienteId: 'CLI-002',
    clienteNome: 'Maria Santos',
    clienteTelefone: '(11) 99999-2222',
    clienteEmail: 'maria@email.com'
  },
  // Garantia expirando em 5 dias (URGENTE)
  {
    id: 'GAR-0003',
    vendaId: 'VEN-2025-0003',
    itemVendaId: 'ITEM-003',
    produtoId: 'PROD-0012',
    imei: '352123456789014',
    modelo: 'iPhone 14 Pro',
    tipoGarantia: 'Garantia - Apple',
    mesesGarantia: 12,
    dataInicioGarantia: '2024-01-10',
    dataFimGarantia: format(addMonths(hoje, 0).setDate(hoje.getDate() + 5), 'yyyy-MM-dd'),
    status: 'Ativa',
    lojaVenda: 'LOJA-004',
    clienteId: 'CLI-003',
    clienteNome: 'Pedro Oliveira',
    clienteTelefone: '(11) 99999-3333',
    clienteEmail: 'pedro@email.com'
  },
  // Garantia expirando em 20 dias (ATENÇÃO)
  {
    id: 'GAR-0004',
    vendaId: 'VEN-2025-0004',
    itemVendaId: 'ITEM-004',
    produtoId: 'PROD-0014',
    imei: '352123456789016',
    modelo: 'iPhone 15',
    tipoGarantia: 'Garantia - Apple',
    mesesGarantia: 12,
    dataInicioGarantia: '2024-01-25',
    dataFimGarantia: format(addMonths(hoje, 0).setDate(hoje.getDate() + 20), 'yyyy-MM-dd'),
    status: 'Ativa',
    lojaVenda: 'LOJA-003',
    clienteId: 'CLI-004',
    clienteNome: 'Ana Costa',
    clienteTelefone: '(11) 99999-4444',
    clienteEmail: 'ana@email.com'
  },
  // 2 Semi-novos Thiago Imports (12 meses)
  {
    id: 'GAR-0005',
    vendaId: 'VEN-2025-0005',
    itemVendaId: 'ITEM-005',
    produtoId: 'PROD-0016',
    imei: '352123456789018',
    modelo: 'iPhone 14 Plus',
    tipoGarantia: 'Garantia - Thiago Imports',
    mesesGarantia: 12,
    dataInicioGarantia: '2025-01-19',
    dataFimGarantia: '2025-12-15',
    status: 'Em Tratativa',
    lojaVenda: 'LOJA-005',
    clienteId: 'CLI-001',
    clienteNome: 'João Silva',
    clienteTelefone: '(11) 99999-1111',
    clienteEmail: 'joao@email.com'
  },
  {
    id: 'GAR-0006',
    vendaId: 'VEN-2024-0050',
    itemVendaId: 'ITEM-050',
    produtoId: 'PROD-0017',
    imei: '352123456789019',
    modelo: 'iPhone SE 2022',
    tipoGarantia: 'Garantia - Thiago Imports',
    mesesGarantia: 12,
    dataInicioGarantia: '2024-11-20',
    dataFimGarantia: '2025-11-20',
    status: 'Concluída',
    lojaVenda: 'LOJA-002',
    clienteId: 'CLI-005',
    clienteNome: 'Carlos Lima',
    clienteTelefone: '(11) 99999-5555',
    clienteEmail: 'carlos@email.com'
  },
  // 2 Semi-novos Apple (meses restantes)
  {
    id: 'GAR-0007',
    vendaId: 'VEN-2024-0060',
    itemVendaId: 'ITEM-060',
    produtoId: 'PROD-0018',
    imei: '352123456789020',
    modelo: 'iPhone 13 Pro',
    tipoGarantia: 'Garantia - Apple',
    mesesGarantia: 6,
    dataInicioGarantia: '2024-12-05',
    dataFimGarantia: '2025-06-05',
    status: 'Em Tratativa',
    lojaVenda: 'LOJA-003',
    clienteId: 'CLI-002',
    clienteNome: 'Maria Santos',
    clienteTelefone: '(11) 99999-2222',
    clienteEmail: 'maria@email.com'
  },
  {
    id: 'GAR-0008',
    vendaId: 'VEN-2024-0070',
    itemVendaId: 'ITEM-070',
    produtoId: 'PROD-0020',
    imei: '352123456789022',
    modelo: 'iPhone 14',
    tipoGarantia: 'Garantia - Apple',
    mesesGarantia: 3,
    dataInicioGarantia: '2024-12-05',
    dataFimGarantia: '2025-03-05',
    status: 'Ativa',
    lojaVenda: 'LOJA-001',
    clienteId: 'CLI-003',
    clienteNome: 'Pedro Oliveira',
    clienteTelefone: '(11) 99999-3333',
    clienteEmail: 'pedro@email.com'
  }
];

let tratativas: TratativaGarantia[] = [
  // 2 Direcionado Apple (Concluído)
  {
    id: 'TRAT-0001',
    garantiaId: 'GAR-0001',
    tipo: 'Direcionado Apple',
    dataHora: '2025-01-20T10:30:00',
    usuarioId: 'COL-001',
    usuarioNome: 'Lucas Mendes',
    descricao: 'Cliente orientado a procurar Apple Store mais próxima para acionamento de garantia.',
    status: 'Concluído'
  },
  {
    id: 'TRAT-0002',
    garantiaId: 'GAR-0002',
    tipo: 'Direcionado Apple',
    dataHora: '2025-01-18T14:00:00',
    usuarioId: 'COL-002',
    usuarioNome: 'Fernanda Lima',
    descricao: 'Problema na câmera. Cliente direcionado para Apple para reparo sob garantia.',
    status: 'Concluído'
  },
  // 2 Encaminhado Assistência (1 Concluído, 1 Em Andamento)
  {
    id: 'TRAT-0003',
    garantiaId: 'GAR-0006',
    tipo: 'Encaminhado Assistência',
    dataHora: '2024-12-10T09:00:00',
    usuarioId: 'COL-001',
    usuarioNome: 'Lucas Mendes',
    descricao: 'Tela com manchas. Encaminhado para assistência técnica interna.',
    osId: 'OS-0050',
    status: 'Concluído'
  },
  {
    id: 'TRAT-0004',
    garantiaId: 'GAR-0007',
    tipo: 'Encaminhado Assistência',
    dataHora: '2025-01-02T11:30:00',
    usuarioId: 'COL-003',
    usuarioNome: 'Roberto Alves',
    descricao: 'Bateria não carrega corretamente. Em análise na assistência.',
    osId: 'OS-0051',
    status: 'Em Andamento'
  },
  // 2 Empréstimo (1 ativo, 1 devolvido)
  {
    id: 'TRAT-0005',
    garantiaId: 'GAR-0005',
    tipo: 'Assistência + Empréstimo',
    dataHora: '2024-12-20T14:35:00',
    usuarioId: 'COL-002',
    usuarioNome: 'Fernanda Lima',
    descricao: 'Problema no microfone. Cliente recebeu aparelho emprestado enquanto aguarda reparo.',
    aparelhoEmprestadoId: 'PROD-0100',
    aparelhoEmprestadoModelo: 'iPhone 13',
    aparelhoEmprestadoImei: '999000111222333',
    osId: 'OS-0052',
    status: 'Em Andamento'
  },
  {
    id: 'TRAT-0006',
    garantiaId: 'GAR-0006',
    tipo: 'Assistência + Empréstimo',
    dataHora: '2024-11-25T10:00:00',
    usuarioId: 'COL-001',
    usuarioNome: 'Lucas Mendes',
    descricao: 'Alto-falante com ruído. Cliente utilizou aparelho emprestado por 5 dias.',
    aparelhoEmprestadoId: 'PROD-0101',
    aparelhoEmprestadoModelo: 'iPhone 12',
    aparelhoEmprestadoImei: '999000111222334',
    osId: 'OS-0053',
    status: 'Concluído'
  },
  // 2 Troca Direta (Concluído)
  {
    id: 'TRAT-0007',
    garantiaId: 'GAR-0002',
    tipo: 'Troca Direta',
    dataHora: '2025-01-22T16:00:00',
    usuarioId: 'COL-003',
    usuarioNome: 'Roberto Alves',
    descricao: 'Defeito de fabricação identificado. Realizada troca direta por novo aparelho.',
    aparelhoTrocaId: 'PROD-0102',
    aparelhoTrocaModelo: 'iPhone 15 Pro',
    aparelhoTrocaImei: '999000111222335',
    status: 'Concluído'
  },
  {
    id: 'TRAT-0008',
    garantiaId: 'GAR-0006',
    tipo: 'Troca Direta',
    dataHora: '2024-12-15T09:30:00',
    usuarioId: 'COL-002',
    usuarioNome: 'Fernanda Lima',
    descricao: 'Problema recorrente após reparo. Cliente optou por troca direta.',
    aparelhoTrocaId: 'PROD-0103',
    aparelhoTrocaModelo: 'iPhone SE 2022',
    aparelhoTrocaImei: '999000111222336',
    status: 'Concluído'
  }
];

let timeline: TimelineGarantia[] = [
  // Timeline para GAR-0005 (Empréstimo ativo)
  {
    id: 'TL-0001',
    garantiaId: 'GAR-0005',
    dataHora: '2025-01-19T10:00:00',
    tipo: 'registro_venda',
    titulo: 'Venda registrada',
    descricao: 'Venda VEN-2025-0005 realizada com garantia Thiago Imports (12 meses)',
    usuarioId: 'COL-004',
    usuarioNome: 'Carlos Santos'
  },
  {
    id: 'TL-0002',
    garantiaId: 'GAR-0005',
    dataHora: '2024-12-20T14:30:00',
    tipo: 'abertura_garantia',
    titulo: 'Garantia acionada',
    descricao: 'Cliente relatou problema no microfone durante ligações',
    usuarioId: 'COL-002',
    usuarioNome: 'Fernanda Lima'
  },
  {
    id: 'TL-0003',
    garantiaId: 'GAR-0005',
    dataHora: '2024-12-20T14:35:00',
    tipo: 'tratativa',
    titulo: 'Tratativa: Assistência + Empréstimo',
    descricao: 'Definida tratativa com aparelho emprestado',
    usuarioId: 'COL-002',
    usuarioNome: 'Fernanda Lima'
  },
  {
    id: 'TL-0004',
    garantiaId: 'GAR-0005',
    dataHora: '2024-12-20T14:35:00',
    tipo: 'os_criada',
    titulo: 'OS criada: OS-0052',
    descricao: 'Ordem de serviço criada para reparo do microfone',
    usuarioId: 'COL-002',
    usuarioNome: 'Fernanda Lima'
  },
  {
    id: 'TL-0005',
    garantiaId: 'GAR-0005',
    dataHora: '2024-12-20T14:40:00',
    tipo: 'emprestimo',
    titulo: 'Aparelho emprestado',
    descricao: 'iPhone 13 (IMEI: 999000111222333) emprestado ao cliente',
    usuarioId: 'COL-002',
    usuarioNome: 'Fernanda Lima'
  },
  // Timeline para GAR-0006 (Concluída)
  {
    id: 'TL-0006',
    garantiaId: 'GAR-0006',
    dataHora: '2024-11-20T11:00:00',
    tipo: 'registro_venda',
    titulo: 'Venda registrada',
    descricao: 'Venda VEN-2024-0050 realizada com garantia Thiago Imports (12 meses)',
    usuarioId: 'COL-004',
    usuarioNome: 'Carlos Santos'
  },
  {
    id: 'TL-0007',
    garantiaId: 'GAR-0006',
    dataHora: '2024-12-15T09:30:00',
    tipo: 'troca',
    titulo: 'Troca realizada',
    descricao: 'Aparelho trocado por iPhone SE 2022 (IMEI: 999000111222336)',
    usuarioId: 'COL-002',
    usuarioNome: 'Fernanda Lima'
  },
  {
    id: 'TL-0008',
    garantiaId: 'GAR-0006',
    dataHora: '2024-12-15T09:35:00',
    tipo: 'conclusao',
    titulo: 'Garantia concluída',
    descricao: 'Tratativa finalizada com sucesso',
    usuarioId: 'COL-002',
    usuarioNome: 'Fernanda Lima'
  }
];

let garantiaCounter = garantias.length;
let tratativaCounter = tratativas.length;
let timelineCounter = timeline.length;

// ==================== FUNÇÕES CRUD ====================

// Garantias
export const getGarantias = (): GarantiaItem[] => {
  return [...garantias];
};

export const getGarantiaById = (id: string): GarantiaItem | undefined => {
  return garantias.find(g => g.id === id);
};

export const getGarantiasByVendaId = (vendaId: string): GarantiaItem[] => {
  return garantias.filter(g => g.vendaId === vendaId);
};

export const addGarantia = (garantia: Omit<GarantiaItem, 'id'>): GarantiaItem => {
  garantiaCounter++;
  const newGarantia: GarantiaItem = {
    ...garantia,
    id: `GAR-${String(garantiaCounter).padStart(4, '0')}`
  };
  garantias.push(newGarantia);
  return newGarantia;
};

export const updateGarantia = (id: string, updates: Partial<GarantiaItem>): void => {
  const index = garantias.findIndex(g => g.id === id);
  if (index !== -1) {
    garantias[index] = { ...garantias[index], ...updates };
  }
};

// Tratativas
export const getTratativas = (): TratativaGarantia[] => {
  return [...tratativas];
};

export const addTratativa = (tratativa: Omit<TratativaGarantia, 'id'>): TratativaGarantia => {
  tratativaCounter++;
  const newTratativa: TratativaGarantia = {
    ...tratativa,
    id: `TRAT-${String(tratativaCounter).padStart(4, '0')}`
  };
  tratativas.push(newTratativa);
  return newTratativa;
};

export const getTratativasByGarantiaId = (garantiaId: string): TratativaGarantia[] => {
  return tratativas.filter(t => t.garantiaId === garantiaId);
};

export const updateTratativa = (id: string, updates: Partial<TratativaGarantia>): void => {
  const index = tratativas.findIndex(t => t.id === id);
  if (index !== -1) {
    tratativas[index] = { ...tratativas[index], ...updates };
  }
};

// Timeline
export const addTimelineEntry = (entry: Omit<TimelineGarantia, 'id'>): TimelineGarantia => {
  timelineCounter++;
  const newEntry: TimelineGarantia = {
    ...entry,
    id: `TL-${String(timelineCounter).padStart(4, '0')}`
  };
  timeline.push(newEntry);
  return newEntry;
};

export const getTimelineByGarantiaId = (garantiaId: string): TimelineGarantia[] => {
  return timeline.filter(t => t.garantiaId === garantiaId).sort((a, b) => 
    new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()
  );
};

// ==================== CONSULTAS ESPECIAIS ====================

export const getGarantiasEmAndamento = (): GarantiaItem[] => {
  return garantias.filter(g => g.status === 'Em Tratativa');
};

export const getGarantiasExpirandoEm7Dias = (): GarantiaItem[] => {
  const hoje = new Date();
  return garantias.filter(g => {
    if (g.status !== 'Ativa') return false;
    const dataFim = new Date(g.dataFimGarantia);
    const dias = differenceInDays(dataFim, hoje);
    return dias >= 0 && dias <= 7;
  });
};

export const getGarantiasExpirandoEm30Dias = (): GarantiaItem[] => {
  const hoje = new Date();
  return garantias.filter(g => {
    if (g.status !== 'Ativa') return false;
    const dataFim = new Date(g.dataFimGarantia);
    const dias = differenceInDays(dataFim, hoje);
    return dias > 7 && dias <= 30;
  });
};

// Validação IMEI única
export const verificarGarantiaAtivaByIMEI = (imei: string): GarantiaItem | null => {
  const garantiaAtiva = garantias.find(g => 
    g.imei === imei && (g.status === 'Ativa' || g.status === 'Em Tratativa')
  );
  return garantiaAtiva || null;
};

export const getHistoricoGarantiasByIMEI = (imei: string): GarantiaItem[] => {
  return garantias.filter(g => g.imei === imei);
};

// Verificar se IMEI tem tratativa em andamento
export const verificarTratativaAtivaByIMEI = (imei: string): { garantia: GarantiaItem; tratativa: TratativaGarantia } | null => {
  const garantia = garantias.find(g => g.imei === imei && g.status === 'Em Tratativa');
  if (!garantia) return null;
  
  const tratativaAtiva = tratativas.find(t => 
    t.garantiaId === garantia.id && t.status === 'Em Andamento'
  );
  
  if (tratativaAtiva) {
    return { garantia, tratativa: tratativaAtiva };
  }
  return null;
};

// Contadores para dashboard
export const getContadoresGarantia = () => {
  const emAndamento = garantias.filter(g => g.status === 'Em Tratativa').length;
  
  const aparelhosEmprestados = tratativas.filter(t => 
    t.status === 'Em Andamento' && t.aparelhoEmprestadoId
  ).length;
  
  const emAssistencia = tratativas.filter(t => 
    t.status === 'Em Andamento' && t.osId
  ).length;
  
  const maisde7Dias = tratativas.filter(t => {
    if (t.status !== 'Em Andamento') return false;
    const dias = differenceInDays(new Date(), new Date(t.dataHora));
    return dias > 7;
  }).length;
  
  return { emAndamento, aparelhosEmprestados, emAssistencia, maisde7Dias };
};

// Função para calcular status de expiração da garantia
export const calcularStatusExpiracao = (dataFimGarantia: string): {
  status: 'expirada' | 'urgente' | 'atencao' | 'ativa';
  diasRestantes: number;
  mensagem: string;
  cor: string;
} => {
  const hoje = new Date();
  const dataFim = new Date(dataFimGarantia);
  const dias = differenceInDays(dataFim, hoje);
  
  if (dias < 0) {
    return {
      status: 'expirada',
      diasRestantes: dias,
      mensagem: `Fora do período de garantia (expirou em ${format(dataFim, 'dd/MM/yyyy')})`,
      cor: 'destructive'
    };
  }
  
  if (dias <= 7) {
    return {
      status: 'urgente',
      diasRestantes: dias,
      mensagem: `URGENTE: Garantia expira em ${dias} dia${dias !== 1 ? 's' : ''}`,
      cor: 'warning'
    };
  }
  
  if (dias <= 30) {
    return {
      status: 'atencao',
      diasRestantes: dias,
      mensagem: `Atenção: Garantia expira em ${dias} dias`,
      cor: 'secondary'
    };
  }
  
  return {
    status: 'ativa',
    diasRestantes: dias,
    mensagem: `Garantia válida até ${format(dataFim, 'dd/MM/yyyy')}`,
    cor: 'success'
  };
};

// Export para CSV
export const exportGarantiasToCSV = (garantiasFiltradas: GarantiaItem[], filename: string) => {
  const headers = [
    'Data Venda', 'ID Garantia', 'IMEI', 'Modelo', 'Cliente', 
    'Resp. Garantia', 'Data Fim', 'Status', 'Tipo Tratativa', 'Data Tratativa'
  ];
  
  const rows = garantiasFiltradas.map(g => {
    const tratativasGarantia = getTratativasByGarantiaId(g.id);
    const ultimaTratativa = tratativasGarantia[tratativasGarantia.length - 1];
    
    return [
      format(new Date(g.dataInicioGarantia), 'dd/MM/yyyy'),
      g.id,
      g.imei,
      g.modelo,
      g.clienteNome,
      g.tipoGarantia,
      format(new Date(g.dataFimGarantia), 'dd/MM/yyyy'),
      g.status,
      ultimaTratativa?.tipo || '-',
      ultimaTratativa ? format(new Date(ultimaTratativa.dataHora), 'dd/MM/yyyy') : '-'
    ];
  });
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};
