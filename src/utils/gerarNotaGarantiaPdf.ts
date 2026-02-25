import jsPDF from 'jspdf';
import { Venda } from './vendasApi';
import { getClienteById, getLojaById, getColaboradorById } from './cadastrosApi';
import { useCadastroStore } from '../store/cadastroStore';
import { formatCurrency } from './formatUtils';
import logoBase64Promise from './notaGarantiaLogo';

// Converte imagem importada para base64
const getLogoBase64 = async (): Promise<string> => {
  return logoBase64Promise;
};

/** Retorna cabeçalho condicional por loja */
interface DadosLoja {
  subtitulo: string;
  endereco: string;
  razaoSocial: string;
  cnpj: string;
  cidade: string;
  cep: string;
}

export const getCabecalhoLoja = (lojaId: string): DadosLoja => {
  const padrao: DadosLoja = {
    subtitulo: 'FEIRA DOS IMPORTADOS',
    endereco: 'BLOCO D, LOJA 433/434 – BRASÍLIA',
    razaoSocial: 'THIAGO IMPORTS',
    cnpj: '46.197.533/0001-06',
    cidade: 'BRASÍLIA',
    cep: '71208-900',
  };
  // Dados fiscais específicos por loja (CNPJ, Razão Social não existem no cadastro)
  const dadosFiscais: Record<string, DadosLoja> = {
    '3ac7e00c': padrao,
    'fcc78c1a': padrao,
    '5b9446d5': {
      subtitulo: 'SHOPPING SUL',
      endereco: 'BR-040 – PARQUE ESPLANADA III, VALPARAÍSO DE GOIÁS',
      razaoSocial: 'THIAGOIMPORTS',
      cnpj: '55.449.390/0001-73',
      cidade: 'VALPARAISO DE GOIAS',
      cep: '72.876-902',
    },
    '0d06e7db': {
      subtitulo: 'SHOPPING ÁGUAS LINDAS',
      endereco: 'BR-070 – MANSÕES CENTROESTE, ÁGUAS LINDAS DE GOIÁS',
      razaoSocial: 'THIAGOIMPORTS',
      cnpj: '56.221.743/0001-46',
      cidade: 'AGUAS LINDAS DE GOIAS',
      cep: '72.915-705',
    },
    'db894e7d': {
      subtitulo: 'JK SHOPPING',
      endereco: 'ST. M NORTE QNM 34 ÁREA ESPECIAL 01 – TAGUATINGA',
      razaoSocial: 'THIAGOIMPORTS',
      cnpj: '62.968.637/0001-23',
      cidade: 'BRASILIA',
      cep: '72.145-450',
    },
  };

  // Primeiro tentar dados fiscais hardcoded
  if (dadosFiscais[lojaId]) return dadosFiscais[lojaId];

  // Fallback: buscar dados dinâmicos do cadastro de lojas
  const lojaCadastro = getLojaById(lojaId);
  if (lojaCadastro) {
    return {
      subtitulo: lojaCadastro.nome.toUpperCase(),
      endereco: lojaCadastro.endereco?.toUpperCase() || padrao.endereco,
      razaoSocial: padrao.razaoSocial,
      cnpj: padrao.cnpj,
      cidade: lojaCadastro.cidade?.toUpperCase() || padrao.cidade,
      cep: lojaCadastro.cep || padrao.cep,
    };
  }

  return padrao;
};

/** Carrega imagem como base64 data URL */
const loadImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = reject;
    img.src = url;
  });
};

/** Resolve nome do motoboy por múltiplas fontes */
const getNomeMotoboy = (motoboyId?: string): string => {
  if (!motoboyId) return '-';

  const colaboradorCadastros = getColaboradorById(motoboyId);
  if (colaboradorCadastros?.nome) return colaboradorCadastros.nome;

  const cadastroStore = useCadastroStore.getState();
  const colaboradorStore = cadastroStore.obterColaboradorById(motoboyId);
  if (colaboradorStore?.nome) return colaboradorStore.nome;

  return motoboyId;
};

/**
 * Gera a Nota de Garantia em PDF baseado no modelo Thiago Imports
 */
export const gerarNotaGarantiaPdf = async (venda: Venda) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Buscar dados do cliente
  const cliente = getClienteById(venda.clienteId);

  // Cores
  const preto = '#000000';
  const cinzaClaro = '#f0f0f0';
  const cinzaTexto = '#333333';

  // Helper: desenhar retângulo com borda
  const drawBox = (x: number, yPos: number, w: number, h: number) => {
    doc.setDrawColor(preto);
    doc.setLineWidth(0.3);
    doc.rect(x, yPos, w, h);
  };

  // Helper: campo label + valor
  const drawField = (label: string, value: string, x: number, yPos: number, w: number, h: number = 10) => {
    drawBox(x, yPos, w, h);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(cinzaTexto);
    doc.text(label, x + 1.5, yPos + 3.5);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(preto);
    doc.text(value || '', x + 1.5, yPos + 7.5);
  };

  // Helper: cabeçalho de seção
  const drawSectionHeader = (title: string, yPos: number) => {
    doc.setFillColor(cinzaClaro);
    doc.rect(margin, yPos, contentWidth, 6, 'F');
    drawBox(margin, yPos, contentWidth, 6);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(preto);
    doc.text(title, margin + 2, yPos + 4);
    return yPos + 6;
  };

  // Formatar data
  const formatarData = (dataStr: string) => {
    const d = new Date(dataStr);
    return d.toLocaleDateString('pt-BR');
  };

  const formatarDataHora = (date: Date) => {
    return date.toLocaleString('pt-BR');
  };

  // ==========================================
  // CABEÇALHO
  // ==========================================
  const headerHeight = 28;
  drawBox(margin, y, contentWidth, headerHeight);

  // Logo
  try {
    const logoData = await getLogoBase64();
    if (logoData) {
      doc.addImage(logoData, 'PNG', margin + 2, y + 2, 24, 24);
    }
  } catch {
    // Logo não disponível
  }

  // Texto do cabeçalho (condicional por loja)
  const cabecalho = getCabecalhoLoja(venda.lojaVenda || '');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('THIAGO IMPORTS', margin + 30, y + 8);
  doc.setFontSize(9);
  doc.text(cabecalho.subtitulo, margin + 30, y + 13);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTA DE GARANTIA', margin + 30, y + 19);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(cabecalho.endereco, margin + 30, y + 24);

  // Campos do lado direito: Nº, DATA, IDENTIFICAÇÃO
  const rightColX = margin + 140;
  const rightColW = contentWidth - 140;
  drawField('Nº', String(venda.numero || venda.id), rightColX, y, rightColW, 9);
  drawField('DATA', formatarData(venda.dataHora), rightColX, y + 9, rightColW, 9);
  drawField('IDENTIFICAÇÃO', venda.id, rightColX, y + 18, rightColW, 10);

  y += headerHeight;

  // ==========================================
  // EMITENTE
  // ==========================================
  y = drawSectionHeader('EMITENTE', y);

  const emitenteH = 10;
  const col1 = margin;
  const col1W = contentWidth * 0.5;
  const col2 = margin + col1W;
  const col2W = contentWidth * 0.25;
  const col3 = col2 + col2W;
  const col3W = contentWidth * 0.25;

  drawField('NOME / RAZÃO SOCIAL', cabecalho.razaoSocial, col1, y, col1W, emitenteH);
  drawField('CNPJ / CPF', cabecalho.cnpj, col2, y, col2W, emitenteH);
  drawField('EMAIL', 'acessoriathiagoimports@gmail.com', col3, y, col3W, emitenteH);
  y += emitenteH;

  drawField('CIDADE', cabecalho.cidade, col1, y, col1W, emitenteH);
  drawField('CEP', cabecalho.cep, col2, y, col2W, emitenteH);
  drawField('DATA DA EMISSÃO', formatarData(venda.dataHora), col3, y, col3W, emitenteH);
  y += emitenteH;

  // ==========================================
  // DESTINATÁRIO
  // ==========================================
  y = drawSectionHeader('DESTINATÁRIO', y);

  const destH = 10;
  const destCol1W = contentWidth * 0.45;
  const destCol2W = contentWidth * 0.25;
  const destCol3W = contentWidth * 0.30;

  // Linha 1
  drawField('NOME / RAZÃO SOCIAL', venda.clienteNome || '', col1, y, destCol1W, destH);
  drawField('CNPJ / CPF', venda.clienteCpf || '', col1 + destCol1W, y, destCol2W, destH);
  drawField('DATA DA SAÍDA', formatarData(venda.dataHora), col1 + destCol1W + destCol2W, y, destCol3W, destH);
  y += destH;

  // Linha 2
  const enderecoCompleto = cliente 
    ? `${cliente.endereco}${cliente.numero ? ', ' + cliente.numero : ''}` 
    : '';
  const bairro = cliente?.bairro || '';
  const cep = cliente?.cep || '';

  drawField('ENDEREÇO', enderecoCompleto, col1, y, destCol1W, destH);
  drawField('BAIRRO / DISTRITO', bairro, col1 + destCol1W, y, destCol2W, destH);
  drawField('CEP', cep, col1 + destCol1W + destCol2W, y, destCol3W, destH);
  y += destH;

  // Linha 3
  const municipio = cliente?.cidade || venda.clienteCidade || '';
  const uf = cliente?.estado || '';
  const telefone = venda.clienteTelefone || '';
  const email = venda.clienteEmail || '';

  const destL3Col1W = contentWidth * 0.30;
  const destL3Col2W = contentWidth * 0.10;
  const destL3Col3W = contentWidth * 0.25;
  const destL3Col4W = contentWidth * 0.35;

  drawField('MUNICÍPIO', municipio, col1, y, destL3Col1W, destH);
  drawField('UF', uf, col1 + destL3Col1W, y, destL3Col2W, destH);
  drawField('TELEFONE / FAX', telefone, col1 + destL3Col1W + destL3Col2W, y, destL3Col3W, destH);
  drawField('EMAIL', email, col1 + destL3Col1W + destL3Col2W + destL3Col3W, y, destL3Col4W, destH);
  y += destH;

  // ==========================================
  // FORMA DE PAGAMENTO
  // ==========================================
  y = drawSectionHeader('FORMA DE PAGAMENTO', y);

  // Cabeçalho da tabela
  const pagColDesc = margin;
  const pagColDescW = contentWidth * 0.7;
  const pagColValor = pagColDesc + pagColDescW;
  const pagColValorW = contentWidth * 0.3;
  const rowH = 7;

  doc.setFillColor(cinzaClaro);
  doc.rect(pagColDesc, y, pagColDescW, rowH, 'F');
  doc.rect(pagColValor, y, pagColValorW, rowH, 'F');
  drawBox(pagColDesc, y, pagColDescW, rowH);
  drawBox(pagColValor, y, pagColValorW, rowH);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIÇÃO', pagColDesc + 2, y + 5);
  doc.text('VALOR', pagColValor + 2, y + 5);
  y += rowH;

  // Linhas de pagamento
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  venda.pagamentos.forEach(pag => {
    let desc = pag.meioPagamento;
    if (pag.parcelas && pag.parcelas > 1) {
      desc += ` (${pag.parcelas}x)`;
    }
    drawBox(pagColDesc, y, pagColDescW, rowH);
    drawBox(pagColValor, y, pagColValorW, rowH);
    doc.text(desc, pagColDesc + 2, y + 5);
    doc.text(formatCurrency(pag.valor), pagColValor + 2, y + 5);
    y += rowH;
  });

  // Total dos pagamentos
  drawBox(pagColDesc, y, pagColDescW, rowH);
  drawBox(pagColValor, y, pagColValorW, rowH);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', pagColDesc + 2, y + 5);
  doc.text(formatCurrency(venda.total), pagColValor + 2, y + 5);
  y += rowH;

  // ==========================================
  // FRETE / ENTREGA
  // ==========================================
  y = drawSectionHeader('FRETE / ENTREGA', y);
  const freteH = 10;
  const temFrete = venda.tipoRetirada === 'Entrega';
  const freteCol1W = contentWidth * 0.10;
  const freteCol2W = contentWidth * 0.10;
  const freteCol3W = contentWidth * 0.25;
  const freteCol4W = contentWidth * 0.55;

  drawField('SIM', temFrete ? 'X' : '', margin, y, freteCol1W, freteH);
  drawField('NÃO', !temFrete ? 'X' : '', margin + freteCol1W, y, freteCol2W, freteH);
  drawField('TIPO DE RETIRADA', venda.tipoRetirada || '-', margin + freteCol1W + freteCol2W, y, freteCol3W, freteH);
  drawField('ENDEREÇO / LOCAL', temFrete ? (venda.localRetirada || 'Endereço de entrega') : (venda.localRetirada || '-'), margin + freteCol1W + freteCol2W + freteCol3W, y, freteCol4W, freteH);
  y += freteH;

  // Linha 2: Taxa de entrega e observações
  if (temFrete) {
    const freteL2Col1W = contentWidth * 0.20;
    const freteL2Col2W = contentWidth * 0.80;
    drawField('TAXA DE ENTREGA', venda.taxaEntrega ? formatCurrency(venda.taxaEntrega) : 'Grátis', margin, y, freteL2Col1W, freteH);
    const motoboyNome = getNomeMotoboy(venda.motoboyId);
    drawField('MOTOBOY / OBSERVAÇÕES', motoboyNome, margin + freteL2Col1W, y, freteL2Col2W, freteH);
    y += freteH;
  }

  // ==========================================
  // DADOS DOS PRODUTOS
  // ==========================================
  y = drawSectionHeader('DADOS DOS PRODUTOS / SERVIÇOS', y);

  // Cabeçalho tabela produtos
  const prodColQtd = margin;
  const prodColQtdW = contentWidth * 0.08;
  const prodColDesc = prodColQtd + prodColQtdW;
  const prodColDescW = contentWidth * 0.57;
  const prodColTipo = prodColDesc + prodColDescW;
  const prodColTipoW = contentWidth * 0.15;
  const prodColValor = prodColTipo + prodColTipoW;
  const prodColValorW = contentWidth * 0.20;

  doc.setFillColor(cinzaClaro);
  doc.rect(prodColQtd, y, prodColQtdW, rowH, 'F');
  doc.rect(prodColDesc, y, prodColDescW, rowH, 'F');
  doc.rect(prodColTipo, y, prodColTipoW, rowH, 'F');
  doc.rect(prodColValor, y, prodColValorW, rowH, 'F');
  drawBox(prodColQtd, y, prodColQtdW, rowH);
  drawBox(prodColDesc, y, prodColDescW, rowH);
  drawBox(prodColTipo, y, prodColTipoW, rowH);
  drawBox(prodColValor, y, prodColValorW, rowH);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('QTD', prodColQtd + 2, y + 5);
  doc.text('DESCRIÇÃO DO PRODUTO / ACESSÓRIO', prodColDesc + 2, y + 5);
  doc.text('TIPO', prodColTipo + 2, y + 5);
  doc.text('VALOR', prodColValor + 2, y + 5);
  y += rowH;

  // Linhas de produtos
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  venda.itens.forEach(item => {
    const descProduto = item.imei ? `${item.produto} - IMEI: ${item.imei}` : item.produto;
    drawBox(prodColQtd, y, prodColQtdW, rowH);
    drawBox(prodColDesc, y, prodColDescW, rowH);
    drawBox(prodColTipo, y, prodColTipoW, rowH);
    drawBox(prodColValor, y, prodColValorW, rowH);
    doc.text(String(item.quantidade), prodColQtd + 2, y + 5);
    doc.text(descProduto.substring(0, 70), prodColDesc + 2, y + 5);
    doc.text(item.categoria || 'Aparelho', prodColTipo + 2, y + 5);
    doc.text(formatCurrency(item.valorVenda), prodColValor + 2, y + 5);
    y += rowH;
  });

  // Acessórios
  if (venda.acessorios && venda.acessorios.length > 0) {
    venda.acessorios.forEach(acc => {
      drawBox(prodColQtd, y, prodColQtdW, rowH);
      drawBox(prodColDesc, y, prodColDescW, rowH);
      drawBox(prodColTipo, y, prodColTipoW, rowH);
      drawBox(prodColValor, y, prodColValorW, rowH);
      doc.text(String(acc.quantidade || 1), prodColQtd + 2, y + 5);
      doc.text(acc.descricao || '', prodColDesc + 2, y + 5);
      doc.text('Acessório', prodColTipo + 2, y + 5);
      doc.text(formatCurrency(acc.valorUnitario || 0), prodColValor + 2, y + 5);
      y += rowH;
    });
  }

  // Garantia Estendida
  if (venda.garantiaExtendida && venda.garantiaExtendida.valor > 0) {
    const descGarantia = `Plano de Garantia Estendido - ${venda.garantiaExtendida.planoNome} (${venda.garantiaExtendida.meses} meses)`;
    drawBox(prodColQtd, y, prodColQtdW, rowH);
    drawBox(prodColDesc, y, prodColDescW, rowH);
    drawBox(prodColTipo, y, prodColTipoW, rowH);
    drawBox(prodColValor, y, prodColValorW, rowH);
    doc.text('1', prodColQtd + 2, y + 5);
    doc.text(descGarantia.substring(0, 70), prodColDesc + 2, y + 5);
    doc.text('Garantia', prodColTipo + 2, y + 5);
    doc.text(formatCurrency(venda.garantiaExtendida.valor), prodColValor + 2, y + 5);
    y += rowH;
  }

  // Base de Troca (Trade-In)
  if (venda.tradeIns && venda.tradeIns.length > 0) {
    venda.tradeIns.forEach(tradeIn => {
      const descTradeIn = `Aparelho de Troca - ${tradeIn.modelo}${tradeIn.descricao ? ' (' + tradeIn.descricao + ')' : ''} - IMEI: ${tradeIn.imei}`;
      drawBox(prodColQtd, y, prodColQtdW, rowH);
      drawBox(prodColDesc, y, prodColDescW, rowH);
      drawBox(prodColTipo, y, prodColTipoW, rowH);
      drawBox(prodColValor, y, prodColValorW, rowH);
      doc.text('1', prodColQtd + 2, y + 5);
      doc.text(descTradeIn.substring(0, 70), prodColDesc + 2, y + 5);
      doc.text('Base de Troca', prodColTipo + 2, y + 5);
      doc.text('- ' + formatCurrency(tradeIn.valorCompraUsado), prodColValor + 2, y + 5);
      y += rowH;
    });
  }

  // Taxa de Entrega (como item na tabela de produtos)
  if (venda.taxaEntrega && venda.taxaEntrega > 0) {
    drawBox(prodColQtd, y, prodColQtdW, rowH);
    drawBox(prodColDesc, y, prodColDescW, rowH);
    drawBox(prodColTipo, y, prodColTipoW, rowH);
    drawBox(prodColValor, y, prodColValorW, rowH);
    doc.text('1', prodColQtd + 2, y + 5);
    doc.text('Taxa de Entrega', prodColDesc + 2, y + 5);
    doc.text('Entrega', prodColTipo + 2, y + 5);
    doc.text(formatCurrency(venda.taxaEntrega), prodColValor + 2, y + 5);
    y += rowH;
  }

  // Total produtos
  drawBox(prodColQtd, y, prodColQtdW + prodColDescW + prodColTipoW, rowH);
  drawBox(prodColValor, y, prodColValorW, rowH);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', prodColQtd + 2, y + 5);
  doc.text(formatCurrency(venda.total), prodColValor + 2, y + 5);
  y += rowH;

  // ==========================================
  // DADOS ADICIONAIS
  // ==========================================
  y = drawSectionHeader('DADOS ADICIONAIS', y);
  const dadosAdH = 15;
  drawBox(margin, y, contentWidth, dadosAdH);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const obs = venda.observacoes || 'Sem observações';
  const obsLines = doc.splitTextToSize(obs, contentWidth - 4);
  doc.text(obsLines, margin + 2, y + 5);
  y += dadosAdH;

  // ==========================================
  // INFORMAÇÕES COMPLEMENTARES
  // ==========================================
  y = drawSectionHeader('INFORMAÇÕES COMPLEMENTARES', y);
  const infoH = 18;
  drawBox(margin, y, contentWidth, infoH);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('IMPORTANTE', margin + 2, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('TODOS OS PRODUTOS DA LOJA CONTÊM 01 (UM) ANO DE GARANTIA PELA LOJA.', margin + 2, y + 10);
  doc.text('A GARANTIA NÃO COBRE MAU USO, QUEBRA OU APARELHO MOLHADO', margin + 2, y + 14);
  y += infoH;

  // ==========================================
  // RODAPÉ
  // ==========================================
  y += 4;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`DATA E HORA DA IMPRESSÃO: ${formatarDataHora(new Date())}`, margin, y + 4);
  doc.text('Sistema: Thiago Imports', margin + contentWidth - 40, y + 4);

  // Anexar páginas do Termo de Garantia
  let termoAnexado = false;
  try {
    const [p1Data, p2Data] = await Promise.all([
      loadImageAsBase64('/docs/termo-garantia-p1.jpg'),
      loadImageAsBase64('/docs/termo-garantia-p2.jpg'),
    ]);
    const pageW = 210;
    const pageH = 297;
    if (p1Data) {
      doc.addPage('a4', 'p');
      doc.addImage(p1Data, 'JPEG', 0, 0, pageW, pageH);
    }
    if (p2Data) {
      doc.addPage('a4', 'p');
      doc.addImage(p2Data, 'JPEG', 0, 0, pageW, pageH);
    }
    termoAnexado = !!(p1Data && p2Data);
  } catch (err) {
    console.warn('Não foi possível anexar o Termo de Garantia ao PDF.', err);
  }

  if (!termoAnexado) {
    // Adicionar página de aviso caso as imagens não carreguem
    doc.addPage('a4', 'p');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('AVISO: Termo de Garantia não disponível', 20, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('As imagens do Termo de Garantia não puderam ser carregadas.', 20, 55);
    doc.text('Consulte a versão impressa do termo disponível na loja.', 20, 65);
  }

  // Abrir em nova aba
  const pdfUrl = doc.output('bloburl');
  window.open(pdfUrl as unknown as string, '_blank');
};
