import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useCadastroStore } from "@/store/cadastroStore";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Login from "./pages/Login";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Performance from "./pages/Performance";
import Settings from "./pages/Settings";
import RecursosHumanos from "./pages/RecursosHumanos";
import LojaRH from "./pages/LojaRH";
import FuncionarioDetalhes from "./pages/FuncionarioDetalhes";
import RHFeedback from "./pages/RHFeedback";
import RHComissoes from "./pages/RHComissoes";
import RHComissaoPorLoja from "./pages/RHComissaoPorLoja";
import RHSalarioColaborador from "./pages/RHSalarioColaborador";
import RHVales from "./pages/RHVales";
import RHAdiantamentos from "./pages/RHAdiantamentos";
import RHMotoboyRemuneracao from "./pages/RHMotoboyRemuneracao";
import FinanceiroConferencia from "./pages/FinanceiroConferencia";
import FinanceiroContas from "./pages/FinanceiroContas";
import FinanceiroCentralDespesas from "./pages/FinanceiroCentralDespesas";
import FinanceiroConferenciaNotas from "./pages/FinanceiroConferenciaNotas";
import Estoque from "./pages/Estoque";
import EstoqueProdutos from "./pages/EstoqueProdutos";
import EstoqueProdutoDetalhes from "./pages/EstoqueProdutoDetalhes";
import EstoqueProdutosPendentes from "./pages/EstoqueProdutosPendentes";
import EstoqueProdutoPendenteDetalhes from "./pages/EstoqueProdutoPendenteDetalhes";
import EstoqueNotasCompra from "./pages/EstoqueNotasCompra";
import EstoqueNotaDetalhes from "./pages/EstoqueNotaDetalhes";
import EstoqueNotaCadastrar from "./pages/EstoqueNotaCadastrar";
import EstoqueMovimentacoes from "./pages/EstoqueMovimentacoes";
import EstoqueMovimentacoesAcessorios from "./pages/EstoqueMovimentacoesAcessorios";
import EstoqueMovimentacoesMatriz from "./pages/EstoqueMovimentacoesMatriz";
import EstoqueNovaMovimentacaoMatriz from "./pages/EstoqueNovaMovimentacaoMatriz";
import EstoqueMovimentacaoMatrizDetalhes from "./pages/EstoqueMovimentacaoMatrizDetalhes";
import EstoqueNotasUrgenciaPendentes from "./pages/EstoqueNotasUrgenciaPendentes";
import EstoqueNotasPendencias from "./pages/EstoqueNotasPendencias";
import EstoqueNotaCadastrarProdutos from "./pages/EstoqueNotaCadastrarProdutos";
import EstoqueNotaConferencia from "./pages/EstoqueNotaConferencia";
import EstoquePendenciasBaseTrocas from "./pages/EstoquePendenciasBaseTrocas";
import Cadastros from "./pages/Cadastros";
import CadastrosLojas from "./pages/CadastrosLojas";
import CadastrosClientes from "./pages/CadastrosClientes";
import CadastrosColaboradores from "./pages/CadastrosColaboradores";
import CadastrosFornecedores from "./pages/CadastrosFornecedores";
import CadastrosOrigensVenda from "./pages/CadastrosOrigensVenda";
import CadastrosProdutos from "./pages/CadastrosProdutos";
import CadastrosPecas from "./pages/CadastrosPecas";
import CadastrosAcessorios from "./pages/CadastrosAcessorios";
import CadastrosTiposDesconto from "./pages/CadastrosTiposDesconto";
import CadastrosCargos from "./pages/CadastrosCargos";
import CadastrosModelosPagamento from "./pages/CadastrosModelosPagamento";
import CadastrosContasFinanceiras from "./pages/CadastrosContasFinanceiras";
import CadastrosMaquinas from "./pages/CadastrosMaquinas";
import CadastrosCores from "./pages/CadastrosCores";
import CadastrosTaxasEntrega from "./pages/CadastrosTaxasEntrega";
import CadastrosConfigWhatsApp from "./pages/CadastrosConfigWhatsApp";
import Vendas from "./pages/Vendas";
import VendasNova from "./pages/VendasNova";
import VendaDetalhes from "./pages/VendaDetalhes";
import VendasNovaDigital from "./pages/VendasNovaDigital";
import VendasPendentesDigitais from "./pages/VendasPendentesDigitais";
import VendasFinalizarDigital from "./pages/VendasFinalizarDigital";
import VendasAcessorios from "./pages/VendasAcessorios";
import VendasConferenciaGestor from "./pages/VendasConferenciaGestor";
import VendasConferenciaGestorDetalhes from "./pages/VendasConferenciaGestorDetalhes";
import VendasEditarGestor from "./pages/VendasEditarGestor";
import VendasConferenciaLancamento from "./pages/VendasConferenciaLancamento";
import EstoqueAcessorios from "./pages/EstoqueAcessorios";
import OSProdutosAnalise from "./pages/OSProdutosAnalise";
import OSHistoricoAssistencia from "./pages/OSHistoricoAssistencia";
import OSProdutoDetalhes from "./pages/OSProdutoDetalhes";
import OSAssistencia from "./pages/OSAssistencia";
import OSAssistenciaNova from "./pages/OSAssistenciaNova";
import OSAssistenciaDetalhes from "./pages/OSAssistenciaDetalhes";
import OSAssistenciaEditar from "./pages/OSAssistenciaEditar";
import OSOficina from "./pages/OSOficina";
import OSConferenciaGestor from "./pages/OSConferenciaGestor";
import OSSolicitacoesPecas from "./pages/OSSolicitacoesPecas";
import OSHistoricoNotas from "./pages/OSHistoricoNotas";
import OSPecas from "./pages/OSPecas";
import OSMovimentacaoPecas from "./pages/OSMovimentacaoPecas";
import FinanceiroNotasAssistencia from "./pages/FinanceiroNotasAssistencia";
import FinanceiroExtrato from "./pages/FinanceiroExtrato";
import FinanceiroFiado from "./pages/FinanceiroFiado";
import FinanceiroLotesPagamento from "./pages/FinanceiroLotesPagamento";
import FinanceiroExecucaoLotes from "./pages/FinanceiroExecucaoLotes";
import FinanceiroPagamentosDowngrade from "./pages/FinanceiroPagamentosDowngrade";
import FinanceiroTetoBancario from "./pages/FinanceiroTetoBancario";
import FinanceiroExtratoContas from "./pages/FinanceiroExtratoContas";
import FinanceiroNotasPendencias from "./pages/FinanceiroNotasPendencias";
import AssistenciaLotesPagamento from "./pages/AssistenciaLotesPagamento";
import AssistRetiradaPecas from "./pages/AssistRetiradaPecas";
import AssistRetiradaPecasDetalhes from "./pages/AssistRetiradaPecasDetalhes";
import Relatorios from "./pages/Relatorios";
import GarantiasNova from "./pages/GarantiasNova";
import GarantiasNovaManual from "./pages/GarantiasNovaManual";
import GarantiasEmAndamento from "./pages/GarantiasEmAndamento";
import GarantiasHistorico from "./pages/GarantiasHistorico";
import GarantiaDetalhes from "./pages/GarantiaDetalhes";
import GarantiasExtendida from "./pages/GarantiasExtendida";
import GarantiaExtendidaDetalhes from "./pages/GarantiaExtendidaDetalhes";
import GarantiaContatosAtivos from "./pages/GarantiaContatosAtivos";
import GarantiaContatosAtivosNovo from "./pages/GarantiaContatosAtivosNovo";
import GarantiaContatosAtivosEditar from "./pages/GarantiaContatosAtivosEditar";
import OSAnaliseGarantia from "./pages/OSAnaliseGarantia";
import CadastrosPlanosGarantia from "./pages/CadastrosPlanosGarantia";
import VendasEditar from "./pages/VendasEditar";
import GestaoAdministrativa from "./pages/GestaoAdministrativa";
import GestaoAdministrativaLogs from "./pages/GestaoAdministrativaLogs";
import GestaoAdmStoriesLotes from "./pages/GestaoAdmStoriesLotes";
import GestaoAdmStoriesConferencia from "./pages/GestaoAdmStoriesConferencia";
import GestaoAdmStoriesValidacao from "./pages/GestaoAdmStoriesValidacao";
import GestaoAdmStoriesIndicadores from "./pages/GestaoAdmStoriesIndicadores";
import GestaoAdmIndicadores from "./pages/GestaoAdmIndicadores";
import GestaoAdmAtividades from "./pages/GestaoAdmAtividades";
import CadastrosAtividades from "./pages/CadastrosAtividades";
import CadastrosLogsAuditoria from "./pages/CadastrosLogsAuditoria";
import DadosAntigoClientes from "./pages/DadosAntigoClientes";
import DadosAntigoCompras from "./pages/DadosAntigoCompras";
import DadosAntigoComprasPagamentos from "./pages/DadosAntigoComprasPagamentos";
import DadosAntigoEntradas from "./pages/DadosAntigoEntradas";
import DadosAntigoOrdemServico from "./pages/DadosAntigoOrdemServico";
import DadosAntigoReparos from "./pages/DadosAntigoReparos";
import DadosAntigoVendas from "./pages/DadosAntigoVendas";
import DadosAntigoVendasPagamentos from "./pages/DadosAntigoVendasPagamentos";
import DadosAntigoVendasProdutos from "./pages/DadosAntigoVendasProdutos";

const queryClient = new QueryClient();

const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const { inicializarDadosMockados, inicializado } = useCadastroStore();
  
  useEffect(() => {
    if (!inicializado) {
      inicializarDadosMockados();
    }
  }, [inicializarDadosMockados, inicializado]);
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppInitializer>
        <Toaster />
        <Sonner />
        
        <BrowserRouter>
          <Routes>
            {/* Rota pública de login */}
            <Route path="/login" element={<Login />} />
            
            {/* Rotas protegidas */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Index />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/rh" element={<RecursosHumanos />} />
              <Route path="/rh/loja/:id" element={<LojaRH />} />
              <Route path="/rh/funcionario/:id" element={<FuncionarioDetalhes />} />
              <Route path="/rh/feedback" element={<RHFeedback />} />
              <Route path="/rh/comissoes" element={<RHComissoes />} />
              <Route path="/rh/comissao-por-loja" element={<RHComissaoPorLoja />} />
              <Route path="/rh/salario-colaborador" element={<RHSalarioColaborador />} />
              <Route path="/rh/vales" element={<RHVales />} />
              <Route path="/rh/adiantamentos" element={<RHAdiantamentos />} />
              <Route path="/rh/motoboy-remuneracao" element={<RHMotoboyRemuneracao />} />
              <Route path="/financeiro/conferencia" element={<FinanceiroConferencia />} />
              <Route path="/financeiro/fiado" element={<FinanceiroFiado />} />
              <Route path="/financeiro/contas" element={<FinanceiroContas />} />
              <Route path="/financeiro/despesas" element={<FinanceiroCentralDespesas />} />
              <Route path="/financeiro/conferencia-notas-entrada" element={<FinanceiroConferenciaNotas />} />
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/estoque/produtos" element={<EstoqueProdutos />} />
              <Route path="/estoque/produto/:id" element={<EstoqueProdutoDetalhes />} />
              <Route path="/estoque/produtos-pendentes" element={<EstoqueProdutosPendentes />} />
              <Route path="/estoque/produto-pendente/:id" element={<EstoqueProdutoPendenteDetalhes />} />
              <Route path="/estoque/notas-compra" element={<EstoqueNotasCompra />} />
              <Route path="/estoque/nota/cadastrar" element={<EstoqueNotaCadastrar />} />
              <Route path="/estoque/nota/:id" element={<EstoqueNotaDetalhes />} />
              <Route path="/estoque/movimentacoes" element={<EstoqueMovimentacoes />} />
              <Route path="/estoque/movimentacoes-acessorios" element={<EstoqueMovimentacoesAcessorios />} />
              <Route path="/estoque/movimentacoes-matriz" element={<EstoqueMovimentacoesMatriz />} />
              <Route path="/estoque/movimentacoes-matriz/nova" element={<EstoqueNovaMovimentacaoMatriz />} />
              <Route path="/estoque/movimentacoes-matriz/:id" element={<EstoqueMovimentacaoMatrizDetalhes />} />
              <Route path="/estoque/notas-urgencia" element={<EstoqueNotasUrgenciaPendentes />} />
              <Route path="/estoque/notas-pendencias" element={<EstoqueNotasPendencias />} />
              <Route path="/estoque/nota/:id/cadastrar-produtos" element={<EstoqueNotaCadastrarProdutos />} />
              <Route path="/estoque/nota/:id/conferencia" element={<EstoqueNotaConferencia />} />
              <Route path="/estoque/acessorios" element={<EstoqueAcessorios />} />
              <Route path="/estoque/pendencias-base-trocas" element={<EstoquePendenciasBaseTrocas />} />
              <Route path="/os/produtos-analise" element={<OSProdutosAnalise />} />
              <Route path="/os/historico-assistencia" element={<OSHistoricoAssistencia />} />
              <Route path="/os/produto/:id" element={<OSProdutoDetalhes />} />
              <Route path="/os/assistencia" element={<OSAssistencia />} />
              <Route path="/os/assistencia/nova" element={<OSAssistenciaNova />} />
              <Route path="/os/assistencia/:id" element={<OSAssistenciaDetalhes />} />
              <Route path="/os/assistencia/:id/editar" element={<OSAssistenciaEditar />} />
              <Route path="/os/oficina" element={<OSOficina />} />
              <Route path="/os/conferencia-gestor" element={<OSConferenciaGestor />} />
              <Route path="/os/solicitacoes-pecas" element={<OSSolicitacoesPecas />} />
              <Route path="/os/historico-notas" element={<OSHistoricoNotas />} />
              <Route path="/os/analise-garantia" element={<OSAnaliseGarantia />} />
              <Route path="/os/pecas" element={<OSPecas />} />
              <Route path="/os/movimentacao-pecas" element={<OSMovimentacaoPecas />} />
              <Route path="/os/retirada-pecas" element={<AssistRetiradaPecas />} />
              <Route path="/os/retirada-pecas/:id" element={<AssistRetiradaPecasDetalhes />} />
              <Route path="/financeiro/notas-assistencia" element={<FinanceiroNotasAssistencia />} />
              <Route path="/financeiro/extrato" element={<FinanceiroExtrato />} />
              <Route path="/financeiro/lotes-pagamento" element={<FinanceiroLotesPagamento />} />
              <Route path="/financeiro/execucao-lotes" element={<FinanceiroExecucaoLotes />} />
              <Route path="/financeiro/pagamentos-downgrade" element={<FinanceiroPagamentosDowngrade />} />
              <Route path="/financeiro/teto-bancario" element={<FinanceiroTetoBancario />} />
              <Route path="/financeiro/extrato-contas" element={<FinanceiroExtratoContas />} />
              <Route path="/financeiro/notas-pendencias" element={<FinanceiroNotasPendencias />} />
              <Route path="/assistencia/lotes-pagamento" element={<AssistenciaLotesPagamento />} />
              <Route path="/cadastros" element={<Cadastros />} />
              <Route path="/cadastros/planos-garantia" element={<CadastrosPlanosGarantia />} />
              <Route path="/cadastros/lojas" element={<CadastrosLojas />} />
              <Route path="/cadastros/clientes" element={<CadastrosClientes />} />
              <Route path="/cadastros/colaboradores" element={<CadastrosColaboradores />} />
              <Route path="/cadastros/fornecedores" element={<CadastrosFornecedores />} />
              <Route path="/cadastros/origens-venda" element={<CadastrosOrigensVenda />} />
              <Route path="/cadastros/produtos" element={<CadastrosProdutos />} />
              <Route path="/cadastros/pecas" element={<CadastrosPecas />} />
              <Route path="/cadastros/acessorios" element={<CadastrosAcessorios />} />
              <Route path="/cadastros/tipos-desconto" element={<CadastrosTiposDesconto />} />
              <Route path="/cadastros/cargos" element={<CadastrosCargos />} />
              <Route path="/cadastros/modelos-pagamento" element={<CadastrosModelosPagamento />} />
              <Route path="/cadastros/contas-financeiras" element={<CadastrosContasFinanceiras />} />
              <Route path="/cadastros/maquinas" element={<CadastrosMaquinas />} />
              <Route path="/cadastros/cores" element={<CadastrosCores />} />
              <Route path="/cadastros/taxas-entrega" element={<CadastrosTaxasEntrega />} />
              <Route path="/cadastros/config-whatsapp" element={<CadastrosConfigWhatsApp />} />
              <Route path="/cadastros/atividades" element={<CadastrosAtividades />} />
              <Route path="/cadastros/logs-auditoria" element={<CadastrosLogsAuditoria />} />
              <Route path="/vendas" element={<Vendas />} />
              <Route path="/vendas/nova" element={<VendasNova />} />
              <Route path="/vendas/nova-digital" element={<VendasNovaDigital />} />
              <Route path="/vendas/pendentes-digitais" element={<VendasPendentesDigitais />} />
              <Route path="/vendas/finalizar-digital/:id" element={<VendasFinalizarDigital />} />
              <Route path="/vendas/balcao" element={<VendasAcessorios />} />
              <Route path="/vendas/conferencia-lancamento" element={<VendasConferenciaLancamento />} />
              <Route path="/vendas/conferencia-gestor" element={<VendasConferenciaGestor />} />
              <Route path="/vendas/conferencia-gestor/:id" element={<VendasConferenciaGestorDetalhes />} />
              <Route path="/vendas/editar-gestor/:id" element={<VendasEditarGestor />} />
              <Route path="/vendas/editar/:id" element={<VendasEditar />} />
              <Route path="/vendas/:id" element={<VendaDetalhes />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/garantias" element={<GarantiasNova />} />
              <Route path="/garantias/nova" element={<GarantiasNova />} />
              <Route path="/garantias/nova/manual" element={<GarantiasNovaManual />} />
              <Route path="/garantias/em-andamento" element={<GarantiasEmAndamento />} />
              <Route path="/garantias/contatos-ativos" element={<GarantiaContatosAtivos />} />
              <Route path="/garantias/contatos-ativos/novo" element={<GarantiaContatosAtivosNovo />} />
              <Route path="/garantias/contatos-ativos/editar/:id" element={<GarantiaContatosAtivosEditar />} />
              <Route path="/garantias/historico" element={<GarantiasHistorico />} />
              <Route path="/garantias/extendida" element={<GarantiasExtendida />} />
              <Route path="/garantias/extendida/:id" element={<GarantiaExtendidaDetalhes />} />
              <Route path="/garantias/:id" element={<GarantiaDetalhes />} />
              
              {/* Gestão Administrativa */}
              <Route path="/gestao-administrativa" element={<GestaoAdministrativa />} />
              <Route path="/gestao-administrativa/logs" element={<GestaoAdministrativaLogs />} />
              <Route path="/gestao-administrativa/stories" element={<GestaoAdmStoriesLotes />} />
              <Route path="/gestao-administrativa/stories/indicadores" element={<GestaoAdmStoriesIndicadores />} />
              <Route path="/gestao-administrativa/indicadores" element={<GestaoAdmIndicadores />} />
              <Route path="/gestao-administrativa/atividades" element={<GestaoAdmAtividades />} />
              <Route path="/gestao-administrativa/stories/lote/:id/conferencia" element={<GestaoAdmStoriesConferencia />} />
              <Route path="/gestao-administrativa/stories/lote/:id/validacao" element={<GestaoAdmStoriesValidacao />} />

              {/* Dados - Sistema Antigo */}
              <Route path="/dados-sistema-antigo/clientes" element={<DadosAntigoClientes />} />
              <Route path="/dados-sistema-antigo/compras" element={<DadosAntigoCompras />} />
              <Route path="/dados-sistema-antigo/compras-pagamentos" element={<DadosAntigoComprasPagamentos />} />
              <Route path="/dados-sistema-antigo/entradas" element={<DadosAntigoEntradas />} />
              <Route path="/dados-sistema-antigo/ordem-servico" element={<DadosAntigoOrdemServico />} />
              <Route path="/dados-sistema-antigo/reparos" element={<DadosAntigoReparos />} />
              <Route path="/dados-sistema-antigo/vendas" element={<DadosAntigoVendas />} />
              <Route path="/dados-sistema-antigo/vendas-pagamentos" element={<DadosAntigoVendasPagamentos />} />
              <Route path="/dados-sistema-antigo/vendas-produtos" element={<DadosAntigoVendasProdutos />} />
            </Route>
            
            {/* Rota 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppInitializer>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
