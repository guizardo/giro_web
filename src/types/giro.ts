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

// ── Helpers ────────────────────────────────────────────────────────────────

export const CURVA_GIRO: Record<string, { label: string; color: string }> = {
  A: { label: 'Campeão',   color: 'bg-green-100 text-green-700 border-green-200' },
  B: { label: 'Regular',   color: 'bg-blue-100 text-blue-700 border-blue-200' },
  C: { label: 'Sazonal',   color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  D: { label: 'Encalhado', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  E: { label: 'Inativo',   color: 'bg-red-100 text-red-700 border-red-200' },
};
