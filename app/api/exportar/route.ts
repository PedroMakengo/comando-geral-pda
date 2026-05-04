import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import React from 'react'

// ── Labels ────────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = {
  Master: 'Master',
  Director: 'Director',
  ChefeDepartamento: 'Chefe Dept.',
  Tecnico: 'Tecnico',
}

const ESTADO_AVALIACAO_LABEL: Record<string, string> = {
  Pendente: 'Pendente',
  AutoAvaliacao: 'Auto-Avaliacao',
  AvaliadoPorChefe: 'Avaliado p/ Chefe',
  EmReavaliacao: 'Em Reavaliacao',
  Reavaliado: 'Reavaliado',
  ValidadoPorDirector: 'Validado',
}

function fmtDate(val: string | Date | null | undefined): string {
  if (!val) return '-'
  return new Date(val).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function fileDate(): string {
  return new Date().toISOString().split('T')[0]
}

function today(): string {
  return new Date().toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ── ColDef ────────────────────────────────────────────────────
interface ColDef {
  header: string
  value: (row: any) => string
  flex?: number
}

// ── Estilos PDF ───────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#18181b',
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 8,
    color: '#a1a1aa',
  },
  tableWrapper: {
    paddingHorizontal: 32,
    marginTop: 16,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#f4f4f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tableHeadCell: {
    fontSize: 7,
    color: '#71717a',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e4e4e7',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  tableCell: {
    fontSize: 8,
    color: '#27272a',
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7.5,
    color: '#a1a1aa',
  },
})

// ── Componente PDF ────────────────────────────────────────────
function TabelaPDF({
  rows,
  cols,
  title,
}: {
  rows: any[]
  cols: ColDef[]
  title: string
}) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', orientation: 'landscape', style: styles.page },

      // Cabeçalho
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.headerTitle }, title),
        React.createElement(
          Text,
          { style: styles.headerSub },
          `Exportado em ${today()}  \u00b7  ${rows.length} ${rows.length === 1 ? 'registo' : 'registos'}`,
        ),
      ),

      // Tabela
      React.createElement(
        View,
        { style: styles.tableWrapper },

        // Cabeçalho da tabela
        React.createElement(
          View,
          { style: styles.tableHead },
          ...cols.map((col) =>
            React.createElement(
              Text,
              {
                key: col.header,
                style: [styles.tableHeadCell, { flex: col.flex ?? 1 }],
              },
              col.header,
            ),
          ),
        ),

        // Linhas
        ...rows.map((row, ri) =>
          React.createElement(
            View,
            {
              key: ri,
              style: [styles.tableRow, ri % 2 !== 0 ? styles.tableRowAlt : {}],
              wrap: false,
            },
            ...cols.map((col) =>
              React.createElement(
                Text,
                {
                  key: col.header,
                  style: [styles.tableCell, { flex: col.flex ?? 1 }],
                },
                col.value(row),
              ),
            ),
          ),
        ),
      ),

      // Rodapé fixo em todas as páginas
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, { style: styles.footerText }, title),
        React.createElement(
          Text,
          {
            style: styles.footerText,
            render: ({ pageNumber, totalPages }: any) =>
              `Pagina ${pageNumber} de ${totalPages}`,
          },
          null,
        ),
      ),
    ),
  )
}

// ── Gerador PDF ───────────────────────────────────────────────
async function gerarPDF(
  rows: any[],
  cols: ColDef[],
  title: string,
  filename: string,
): Promise<NextResponse> {
  const element = React.createElement(TabelaPDF, { rows, cols, title })
  const buffer = await renderToBuffer(element as any)

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}_${fileDate()}.pdf"`,
    },
  })
}

// ── Gerador Excel ─────────────────────────────────────────────
async function gerarExcel(
  rows: any[],
  cols: ColDef[],
  sheetName: string,
  filename: string,
): Promise<NextResponse> {
  const XLSX = await import('xlsx')

  const data = rows.map((row) => {
    const obj: Record<string, string> = {}
    for (const col of cols) obj[col.header] = col.value(row)
    return obj
  })

  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = cols.map((c) => ({ wch: Math.round((c.flex ?? 1) * 18) }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}_${fileDate()}.xlsx"`,
    },
  })
}

// ── Colunas por modelo ────────────────────────────────────────

// modelo: Utilizador
function colsUtilizadores(): ColDef[] {
  return [
    { header: 'Nome Completo', value: (r) => r.nomeCompleto ?? '-', flex: 2.2 },
    { header: 'Email', value: (r) => r.email ?? '-', flex: 2.2 },
    {
      header: 'No. Mecano.',
      value: (r) => r.numeroMecanografico ?? '-',
      flex: 1.2,
    },
    { header: 'Cargo', value: (r) => r.cargo ?? '-', flex: 1.8 },
    {
      header: 'Perfil',
      value: (r) => ROLE_LABEL[r.role] ?? r.role ?? '-',
      flex: 1.2,
    },
    {
      header: 'Departamento',
      value: (r) => r.departamento?.nome ?? '-',
      flex: 1.8,
    },
    { header: 'Direcao', value: (r) => r.direcao?.nome ?? '-', flex: 1.8 },
    { header: 'Pelouro', value: (r) => r.pelouro?.nome ?? '-', flex: 1.5 },
    { header: 'Estado', value: (r) => r.estado ?? '-', flex: 0.9 },
    {
      header: 'Data Admissao',
      value: (r) => fmtDate(r.dataAdmissao),
      flex: 1.2,
    },
  ]
}

// modelo: Pelouro
function colsPelouros(): ColDef[] {
  return [
    { header: 'Pelouro', value: (r) => r.nome ?? '-', flex: 2.5 },
    { header: 'Descricao', value: (r) => r.descricao ?? '-', flex: 3.5 },
    {
      header: 'Direcoes',
      value: (r) => String(r._count?.direcoes ?? 0),
      flex: 1,
    },
    {
      header: 'Funcionarios',
      value: (r) => String(r._count?.utilizadores ?? 0),
      flex: 1,
    },
    { header: 'Criado em', value: (r) => fmtDate(r.dataCriacao), flex: 1.2 },
  ]
}

// modelo: Direcao
function colsDirecoes(): ColDef[] {
  return [
    { header: 'Direcao', value: (r) => r.nome ?? '-', flex: 2.2 },
    { header: 'Pelouro', value: (r) => r.pelouro?.nome ?? '-', flex: 1.8 },
    { header: 'Descricao', value: (r) => r.descricao ?? '-', flex: 2.5 },
    {
      header: 'Departamentos',
      value: (r) => String(r._count?.departamentos ?? 0),
      flex: 1,
    },
    {
      header: 'Funcionarios',
      value: (r) => String(r._count?.utilizadores ?? 0),
      flex: 1,
    },
    { header: 'Criado em', value: (r) => fmtDate(r.dataCriacao), flex: 1.2 },
  ]
}

// modelo: Departamento
function colsDepartamentos(): ColDef[] {
  return [
    { header: 'Departamento', value: (r) => r.nome ?? '-', flex: 2.5 },
    { header: 'Direcao', value: (r) => r.direcao?.nome ?? '-', flex: 2 },
    { header: 'Chefe', value: (r) => r.chefe?.nomeCompleto ?? '-', flex: 2 },
    {
      header: 'Funcionarios',
      value: (r) => String(r._count?.utilizadores ?? 0),
      flex: 1,
    },
    {
      header: 'Criterios',
      value: (r) => String(r._count?.criterios ?? 0),
      flex: 1,
    },
    { header: 'Criado em', value: (r) => fmtDate(r.dataCriacao), flex: 1.2 },
  ]
}

// modelo: PeriodoAvaliacao  (@@map("periodo_avaliacao"))
function colsPeriodos(): ColDef[] {
  return [
    { header: 'Periodo', value: (r) => r.nome ?? '-', flex: 2.5 },
    { header: 'Inicio', value: (r) => fmtDate(r.dataInicio), flex: 1.2 },
    { header: 'Fim', value: (r) => fmtDate(r.dataFim), flex: 1.2 },
    {
      header: 'Fichas',
      value: (r) => String(r._count?.fichas ?? 0),
      flex: 0.8,
    },
    {
      header: 'Estado',
      value: (r) => (r.activo ? 'Activo' : 'Inactivo'),
      flex: 1,
    },
    { header: 'Criado em', value: (r) => fmtDate(r.createdAt), flex: 1.2 },
  ]
}

// modelo: Criterio
function colsCriterios(): ColDef[] {
  return [
    { header: 'Criterio', value: (r) => r.nome ?? '-', flex: 2.5 },
    { header: 'Descricao', value: (r) => r.descricao ?? '-', flex: 3 },
    { header: 'Peso', value: (r) => String(r.peso ?? 1), flex: 0.8 },
    {
      header: 'Departamentos',
      value: (r) => String(r._count?.departamentos ?? 0),
      flex: 1.2,
    },
    {
      header: 'Tecnico',
      value: (r) => r.tecnico?.nomeCompleto ?? '-',
      flex: 2,
    },
    { header: 'Criado em', value: (r) => fmtDate(r.createdAt), flex: 1.2 },
  ]
}

// modelo: FichaAvaliacao
function colsFichas(): ColDef[] {
  return [
    {
      header: 'Avaliado',
      value: (r) => r.avaliado?.nomeCompleto ?? '-',
      flex: 2.2,
    },
    {
      header: 'Departamento',
      value: (r) => r.avaliado?.departamento?.nome ?? '-',
      flex: 1.8,
    },
    { header: 'Periodo', value: (r) => r.periodo?.nome ?? '-', flex: 1.8 },
    {
      header: 'Estado',
      value: (r) => ESTADO_AVALIACAO_LABEL[r.estado] ?? r.estado ?? '-',
      flex: 1.5,
    },
    {
      header: 'Pontuacao',
      value: (r) => (r.pontuacaoFinal != null ? String(r.pontuacaoFinal) : '-'),
      flex: 1,
    },
    { header: 'Criado em', value: (r) => fmtDate(r.createdAt), flex: 1.2 },
  ]
}

// ── Queries Prisma ────────────────────────────────────────────

async function fetchUtilizadores() {
  return prisma.utilizador.findMany({
    orderBy: { nomeCompleto: 'asc' },
    include: {
      departamento: { select: { id: true, nome: true } },
      direcao: { select: { id: true, nome: true } },
      pelouro: { select: { id: true, nome: true } },
    },
  })
}

async function fetchPelouros() {
  return prisma.pelouro.findMany({
    orderBy: { nome: 'asc' },
    include: {
      _count: { select: { direcoes: true, utilizadores: true } },
    },
  })
}

async function fetchDirecoes() {
  return prisma.direcao.findMany({
    orderBy: { nome: 'asc' },
    include: {
      pelouro: { select: { id: true, nome: true } },
      _count: { select: { departamentos: true, utilizadores: true } },
    },
  })
}

async function fetchDepartamentos() {
  return prisma.departamento.findMany({
    orderBy: { nome: 'asc' },
    include: {
      direcao: { select: { id: true, nome: true } },
      chefe: { select: { id: true, nomeCompleto: true } },
      _count: { select: { utilizadores: true, criterios: true } },
    },
  })
}

async function fetchPeriodos() {
  // modelo: PeriodoAvaliacao  →  prisma.periodoAvaliacao
  return prisma.periodoAvaliacao.findMany({
    orderBy: { dataInicio: 'desc' },
    include: {
      _count: { select: { fichas: true } },
    },
  })
}

async function fetchCriterios() {
  return prisma.criterio.findMany({
    orderBy: { nome: 'asc' },
    include: {
      tecnico: { select: { id: true, nomeCompleto: true } },
      _count: { select: { departamentos: true } },
    },
  })
}

async function fetchFichas() {
  // modelo: FichaAvaliacao  →  prisma.fichaAvaliacao
  return prisma.fichaAvaliacao.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      avaliado: {
        select: {
          id: true,
          nomeCompleto: true,
          departamento: { select: { id: true, nome: true } },
        },
      },
      periodo: { select: { id: true, nome: true } },
    },
  })
}

// ── Handler principal ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') ?? ''
  const formato = searchParams.get('formato') ?? 'excel'

  const config: Record<
    string,
    {
      fetch: () => Promise<any[]>
      cols: () => ColDef[]
      title: string
      filename: string
    }
  > = {
    utilizadores: {
      fetch: fetchUtilizadores,
      cols: colsUtilizadores,
      title: 'Relatorio de Funcionarios',
      filename: 'funcionarios',
    },
    pelouros: {
      fetch: fetchPelouros,
      cols: colsPelouros,
      title: 'Relatorio de Pelouros',
      filename: 'pelouros',
    },
    direcoes: {
      fetch: fetchDirecoes,
      cols: colsDirecoes,
      title: 'Relatorio de Direcoes',
      filename: 'direcoes',
    },
    departamentos: {
      fetch: fetchDepartamentos,
      cols: colsDepartamentos,
      title: 'Relatorio de Departamentos',
      filename: 'departamentos',
    },
    periodos: {
      fetch: fetchPeriodos,
      cols: colsPeriodos,
      title: 'Periodos de Avaliacao',
      filename: 'periodos_avaliacao',
    },
    criterios: {
      fetch: fetchCriterios,
      cols: colsCriterios,
      title: 'Criterios de Avaliacao',
      filename: 'criterios',
    },
    fichas: {
      fetch: fetchFichas,
      cols: colsFichas,
      title: 'Fichas de Avaliacao',
      filename: 'fichas_avaliacao',
    },
  }

  const cfg = config[tipo]
  if (!cfg) {
    return NextResponse.json(
      { error: `Tipo invalido. Use: ${Object.keys(config).join(', ')}` },
      { status: 400 },
    )
  }

  try {
    const rows = await cfg.fetch()
    const cols = cfg.cols()

    if (formato === 'pdf') {
      return await gerarPDF(rows, cols, cfg.title, cfg.filename)
    }
    return await gerarExcel(rows, cols, cfg.title, cfg.filename)
  } catch (err) {
    console.error(`[EXPORTAR] tipo=${tipo} formato=${formato}`, err)
    return NextResponse.json(
      { error: 'Erro interno ao gerar exportacao.' },
      { status: 500 },
    )
  }
}
