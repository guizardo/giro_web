// ---------------------------------------------------------------------------
// Estoque — Análise de Giro de Estoque
// Fonte: CONS_GIRO_ATUAL via MVC_LOGIDOC  GET /api/giro/*
// ---------------------------------------------------------------------------

export interface GiroFilial {
  codigo:   number;
  empresa:  string;
  fantasia: string;
}

export interface GiroFiliaisResponse {
  filiais: GiroFilial[];
  Count:   number;
}

export interface GiroOverview {
  filial:         number;
  total_produtos: number;
  curva_a:        number;
  curva_b:        number;
  curva_c:        number;
  curva_d:        number;
  curva_e:        number;
  StartsAt:       string;
  EndsAt:         string;
}

// ── Relatório 1 — Parados ──────────────────────────────────────────────────

export interface GiroParadosTotais {
  parados:          number;
  muito_lentos:     number;
  lentos:           number;
  sem_venda_12m:    number;
  em_queda:         number;
  unidades_paradas: number;
  valor_total:      number;
}

export interface GiroParadoItem {
  id_dadospro:  number;
  cod_pro:      string;
  produto:      string;
  secao:        string;
  grupo:        string;
  curva:        string;
  giro_30d:     number;
  giro_12m:     number;
  estoque:      number;
  custo:        number;
  valor_estoque: number;
  venda_7d:     number;
  venda_30d:    number;
  venda_60d:    number;
  venda_90d:    number;
  venda_12m:    number;
  dias_oportunidade_7d:   number;
  dias_oportunidade_30d:  number;
  dias_oportunidade_60d:  number;
  dias_oportunidade_90d:  number;
  dias_oportunidade_365d: number;
  acao:         string;
}

export interface GiroParadosResponse {
  filial:   number;
  totais:   GiroParadosTotais;
  dados:    GiroParadoItem[];
  Count:    number;
  StartsAt: string;
  EndsAt:   string;
}

// ── Relatório 2 — Ruptura ──────────────────────────────────────────────────

export interface GiroRupturaTotais {
  total_risco:      number;
  em_ruptura:       number;
  estoque_negativo: number;
  cobertura_7d:     number;
  abaixo_minimo:    number;
  sem_compra_90d:   number;
}

export interface GiroRupturaItem {
  id_dadospro:    number;
  cod_filial?:    number; // so vem preenchido na resposta de /api/giro/ruptura-fornecedor
  cod_pro:        string;
  produto:        string;
  secao:          string;
  grupo:          string;
  curva:          string;
  giro_30d:       number;
  giro_12m:       number;
  estoque:        number;
  cobertura_dias: number;
  delta_minimo:   number;
  venda_7d:       number;
  venda_30d:      number;
  venda_60d:      number;
  venda_90d:      number;
  venda_12m:      number;
  dias_oportunidade_7d:   number;
  dias_oportunidade_30d:  number;
  dias_oportunidade_60d:  number;
  dias_oportunidade_90d:  number;
  dias_oportunidade_365d: number;
  situacao:       'CRITICO' | 'URGENTE' | 'RISCO';
}

export interface GiroRupturaResponse {
  filial:   number;
  totais:   GiroRupturaTotais;
  dados:    GiroRupturaItem[];
  Count:    number;
  StartsAt: string;
  EndsAt:   string;
}

// ── Relatório 2b — Ruptura por fornecedor ───────────────────────────────────

export interface GiroFornecedor {
  cod_for:    number;
  for_filial: number;
  nome_for:   string;
  fantas_for: string;
}

export interface GiroFornecedoresResponse {
  fornecedores: GiroFornecedor[];
  Count:        number;
}

export interface GiroRupturaFornecedorResponse {
  filial:     number;
  fornecedor: number;
  totais:     GiroRupturaTotais;
  dados:      GiroRupturaItem[];
  Count:      number;
}

// ── CLD (custo líquido / lucro líquido com impostos) de um produto ─────────
// Fonte: GET /api/giro/produto-cld — mesma lógica de TDtM1.CalculaImposto do
// Retaguarda desktop, usando preço/custo atuais de TBLDADOSPRO.

export interface GiroProdutoCLDAliquotas {
  icms:       number;
  pis:        number;
  cofins:     number;
  fcp:        number;
  custo_fixo: number;
  comissao:   number;
  cst_pis:    string;
  cst_cofins: string;
}

export interface GiroProdutoCLDValores {
  icms:   number;
  pis:    number;
  cofins: number;
  fcp?:   number; // nao existe em impostos_creditos (FCP nao gera credito)
}

export interface GiroProdutoCLDNF {
  numero: number | null;
  data:   string | null;
  cfop:   string | null;
}

export interface GiroProdutoCLD {
  id_dadospro:       number;
  cod_filial:        number;
  produto:           string;
  preco:             number;
  custo:             number;
  imposto:           number;
  lucro_liquido:     number;
  margem_cld:        number;
  markup_cld:        number;
  cst_desc_saida:    string;
  cst_desc_entrada:  string;
  aliquotas_custos:  GiroProdutoCLDAliquotas;
  impostos_creditos: GiroProdutoCLDValores;
  impostos_debitos:  GiroProdutoCLDValores;
  impostos_a_pagar:  GiroProdutoCLDValores;
  custo_liquido:     { custo: number };
  nf:                GiroProdutoCLDNF;
}

export interface GiroProdutoCLDResponse {
  cld:      GiroProdutoCLD;
  StartsAt: string;
  EndsAt:   string;
}

// ── Simulador de preço com CBS 2027 ───────────────────────────────────────
// Fonte: GET /api/giro/simulador-cbs — CLD de todos os produtos da filial com a
// CBS no lugar de PIS/COFINS (Delphi: UCalculoCLD.CalculaCBS2027).

export type GiroBeneficioCBS = 'perdeu' | 'ganhou' | 'sem_mudanca';

export interface GiroSimuladorCBSParametros {
  aliquota_cbs:    number;
  modo:            'fora' | 'dentro';
  credito_simples: number;
  margem_alvo:     number | null;
}

export interface GiroSimuladorCBSTotais {
  regime_simples:           boolean;
  produtos:                 number;
  perdem_margem:            number;
  perderam_beneficio:       number;
  ganharam_beneficio:       number;
  sem_cclasstrib:           number;
  fornecedor_simples:       number;
  com_preco_sugerido:       number;
  impacto_mensal:           number;
  reajuste_medio_ponderado: number | null;
}

export interface GiroSimuladorCBSItem {
  id_dadospro:          number;
  cod_filial:           number;
  cod_pro:              string;
  produto:              string;
  secao:                string;
  grupo:                string;
  curva:                string;
  venda_30d:            number;
  preco:                number;
  custo:                number;
  cclasstrib:           string;
  cst_ibs_cbs:          string;
  sem_cclasstrib:       boolean;
  cclasstrib_do_ncm:    boolean;
  tratamento_cbs:       string;
  reducao_cbs:          number;
  aliquota_cbs_efetiva: number;
  custo_cld_hoje:       number;
  margem_hoje:          number;
  pis_cofins_pagar:     number;
  carga_federal_hoje:   number;
  cbs_debito:           number;
  cbs_credito:          number;
  cbs_pagar:            number;
  custo_cld_2027:       number;
  margem_2027:          number;
  preco_sugerido:       number | null;
  variacao_valor:       number | null;
  variacao_perc:        number | null;
  impacto_mensal:       number;
  beneficio:            GiroBeneficioCBS;
  crt_fornecedor:       number;
  fornecedor_simples:   boolean;
  tem_nf_entrada:       boolean;
}

// Campos fora de dados/totais (parametros, regime) chegam em todas as paginas.
export interface GiroSimuladorCBSResponse {
  filial:         number;
  parametros:     GiroSimuladorCBSParametros;
  crt_filial:     number;
  regime_simples: boolean;
  totais:         GiroSimuladorCBSTotais;
  dados:          GiroSimuladorCBSItem[];
  Count:          number;
  Total:          number;
}

// ── Fornecedores do Simples (crédito de CBS perdido) ──────────────────────
// Fonte: GET /api/giro/fornecedores-simples — compras da filial no período por
// fornecedor; com fornecedor=&for_filial= devolve os produtos daquele fornecedor.

export type GiroRegimeFornecedor = 'simples' | 'mei' | 'normal';

export interface GiroFornSimplesTotais {
  fornecedores:         number;
  fornecedores_simples: number;
  compras_total:        number;
  compras_simples:      number;
  perc_compras_simples: number;
  produtos_simples:     number;
  credito_perdido:      number;
}

export interface GiroFornSimplesItem {
  cod_for:          number;
  for_filial:       number;
  nome_for:         string;
  fantas_for:       string;
  crt:              number;
  regime:           GiroRegimeFornecedor;
  compras:          number;
  perc_compras:     number;
  produtos:         number;
  ultima_compra:    string;
  credito_integral: number;
  credito_estimado: number;
  credito_perdido:  number;
}

export interface GiroFornSimplesProduto {
  id_pro:                    number;
  pro_filial:                number;
  produto:                   string;
  compras:                   number;
  qtde:                      number;
  ultima_compra:             string;
  cclasstrib:                string;
  sem_cclasstrib:            boolean;
  tratamento_cbs:            string;
  aliquota_cbs_efetiva:      number;
  credito_integral:          number;
  credito_estimado:          number;
  credito_perdido:           number;
  alternativa_regime_normal: string | null;
}

export interface GiroFornSimplesProdutosResponse {
  totais: GiroFornSimplesTotais;
  dados:  GiroFornSimplesProduto[];
  Count:  number;
  Total:  number;
}

// ── Detalhe bruto (suporte/diagnostico) ─────────────────────────────────────
// Fonte: GET /api/giro/produto-detalhe — dump de todos os campos de
// CONS_GIRO_ATUAL (linha atual) + historico de CONS_GIRO_MENSAL, sem curadoria.

export type GiroCampoBruto = string | number | boolean | null;

export interface GiroProdutoDetalheResponse {
  atual:    Record<string, GiroCampoBruto>;
  mensal:   Record<string, GiroCampoBruto>[];
  StartsAt: string;
  EndsAt:   string;
}

// ── Relatório 3 — Perda ────────────────────────────────────────────────────

export interface GiroPerdaTotais {
  produtos_perda:   number;
  perda_30d_un:     number;
  perda_12m_un:     number;
  valor_perda_30d:  number;
  valor_perda_12m:  number;
  perda_critica:    number;
  perda_alta:       number;
  perc_perda_desc:  number;
}

export interface GiroPerdaItem {
  id_dadospro: number;
  cod_pro:     string;
  produto:     string;
  secao:       string;
  grupo:       string;
  curva:       string;
  giro_30d:    number;
  perda_30d:   number;
  perda_12m:   number;
  valor_perda_30d: number;
  valor_perda_12m: number;
  venda_7d:    number;
  venda_30d:   number;
  venda_60d:   number;
  venda_90d:   number;
  venda_12m:   number;
  dias_oportunidade_7d:   number;
  dias_oportunidade_30d:  number;
  dias_oportunidade_60d:  number;
  dias_oportunidade_90d:  number;
  dias_oportunidade_365d: number;
  perc_perda:  number;
}

export interface GiroPerdaResponse {
  filial:   number;
  totais:   GiroPerdaTotais;
  dados:    GiroPerdaItem[];
  Count:    number;
  StartsAt: string;
  EndsAt:   string;
}

// ── Relatório 3b — Perda por período (intervalo de datas arbitrário) ───────

export interface GiroPerdaPeriodoTotais {
  produtos_perda:      number;
  perda_periodo_un:    number;
  valor_perda_periodo: number;
}

export interface GiroPerdaPeriodoItem {
  id_dadospro: number;
  cod_pro:     string;
  produto:     string;
  secao:       string;
  grupo:       string;
  curva:       string;
  perda_un:    number;
  valor_perda: number;
  ocorrencias: number;
}

export interface GiroPerdaPeriodoResponse {
  filial:   number;
  data_ini: string;
  data_fim: string;
  totais:   GiroPerdaPeriodoTotais;
  dados:    GiroPerdaPeriodoItem[];
  Count:    number;
}

// ── Relatório 4 — Correlação de produtos (cesta de compras) ────────────────
// Fonte: GET /api/giro/correlacao — le CONS_PRODUTO_CORRELACAO, populada pelo
// worker Monitor_Giro\UCorrelacaoWorker.pas via análise de coocorrência de
// produtos no mesmo cupom (SRQNF ∪ SRQNFD ∪ NOTAF+PRODNF, janela 365 dias).

// 'COMPLEMENTO' = correlação genuína (comportamento de compra real).
// 'COMPENSACAO' = item genérico/universal (aparece em cesta grande
// independente do produto base) mas com margem real - so informativo, a
// PONTUACAO ja recebe penalidade continua por genericidade/margem baixa,
// entao a ordenacao/inclusao na lista nao depende deste tipo. Ver
// UCorrelacaoWorker.pas.
export type GiroTipoCorrelacao = 'COMPLEMENTO' | 'COMPENSACAO';

// Nota 0-100 comparativa (percentil de PONTUACAO dentro da distribuicao real
// deste banco - "regua por cliente", ver AtualizaPercentisCliente em
// UCorrelacaoWorker.pas). Pode vir null em linhas gravadas antes da coluna
// existir ou de bancos que ainda nao rodaram o primeiro lote completo.
export type GiroNotaComparativa = number | null;

export interface GiroCorrelato {
  rank:                  number;
  id_produto_correlato:  number;
  desc_correlato:        string;
  cod_correlato:         string;
  juntos:                number;
  confianca_pct:         number;
  alavancagem:           number;
  margem_rs:             number;
  // Pode vir null em linhas gravadas antes da coluna existir.
  preco_medio:           number | null;
  pontuacao:             number;
  tipo_correlacao:       GiroTipoCorrelacao;
  nota_comparativa:      GiroNotaComparativa;
}

export interface GiroCorrelacaoProduto {
  id_produto_base: number;
  desc_base:       string;
  ean_base:        string;
  pontuacao_base:  number;
  correlatos:      GiroCorrelato[];
}

export interface GiroCorrelacaoTotais {
  total_base: number;
}

export interface GiroCorrelacaoResponse {
  filial:   number;
  totais:   GiroCorrelacaoTotais;
  dados:    GiroCorrelacaoProduto[];
  Count:    number;
  StartsAt: string;
  EndsAt:   string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

export const CURVA_GIRO: Record<string, { label: string; color: string }> = {
  A: { label: 'Campeão',   color: 'bg-green-100 text-green-700 border-green-200' },
  B: { label: 'Regular',   color: 'bg-blue-100 text-blue-700 border-blue-200' },
  C: { label: 'Sazonal',   color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  D: { label: 'Encalhado', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  E: { label: 'Inativo',   color: 'bg-red-100 text-red-700 border-red-200' },
};
