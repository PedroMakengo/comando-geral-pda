// app/api/exportar/inline/route.ts
//
// Recebe os dados já serializados do cliente (rows + cols + titulo + formato)
// e devolve o ficheiro PDF ou Excel.
// Usado por FichasBase, FichasBaseChefeDepartamento e ReavaliacoesChefe —
// componentes que têm os dados filtrados em memória e não precisam de
// fazer uma segunda query à BD.

import { NextRequest, NextResponse } from 'next/server'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import React from 'react'

interface ColDef {
  header: string
  flex?: number
}

interface InlinePayload {
  rows: Record<string, string>[]
  cols: ColDef[]
  titulo: string
  filename: string
  formato: 'pdf' | 'excel'
}

function fileDate() {
  return new Date().toISOString().split('T')[0]
}
function today() {
  return new Date().toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

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
  headerSub: { fontSize: 8, color: '#a1a1aa' },
  tableWrapper: { paddingHorizontal: 32, marginTop: 16 },
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
  tableRowAlt: { backgroundColor: '#fafafa' },
  tableCell: { fontSize: 8, color: '#27272a' },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7.5, color: '#a1a1aa' },
})

function TabelaPDF({
  rows,
  cols,
  title,
}: {
  rows: Record<string, string>[]
  cols: ColDef[]
  title: string
}) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', orientation: 'landscape', style: styles.page },
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
      React.createElement(
        View,
        { style: styles.tableWrapper },
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
                row[col.header] ?? '-',
              ),
            ),
          ),
        ),
      ),
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

export async function POST(req: NextRequest) {
  let payload: InlinePayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Payload invalido.' }, { status: 400 })
  }

  const { rows, cols, titulo, filename, formato } = payload
  if (!rows || !cols || !titulo || !filename || !formato)
    return NextResponse.json(
      { error: 'Campos obrigatorios em falta.' },
      { status: 400 },
    )

  try {
    if (formato === 'pdf') {
      const element = React.createElement(TabelaPDF, {
        rows,
        cols,
        title: titulo,
      })
      const buffer = await renderToBuffer(element as any)
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}_${fileDate()}.pdf"`,
        },
      })
    }

    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = cols.map((c) => ({ wch: Math.round((c.flex ?? 1) * 18) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, titulo.slice(0, 31))
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}_${fileDate()}.xlsx"`,
      },
    })
  } catch (err) {
    console.error('[EXPORTAR/INLINE]', err)
    return NextResponse.json(
      { error: 'Erro interno ao gerar exportacao.' },
      { status: 500 },
    )
  }
}
