// app/api/fichas/[id]/pdf/route.ts
// Gera PDF real com @react-pdf/renderer e devolve como download
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole, getPayloadFromRequest } from '@/lib/permissions'
import { renderToBuffer } from '@react-pdf/renderer'
import React, { createElement as h } from 'react'
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
  type DocumentProps,
} from '@react-pdf/renderer'
import fs from 'fs'
import path from 'path'

type Params = { params: Promise<{ id: string }> }

// ── Estilos ───────────────────────────────────────────────────
const C = {
  black: '#18181b',
  zinc7: '#3f3f46',
  zinc5: '#71717a',
  zinc4: '#a1a1aa',
  zinc2: '#e4e4e7',
  zinc1: '#f4f4f5',
  white: '#ffffff',
  green: '#059669',
  greenBg: '#f0fdf4',
  greenBd: '#bbf7d0',
  blue: '#2563eb',
  blueBg: '#eff6ff',
  blueBd: '#bfdbfe',
  red: '#dc2626',
  redBg: '#fff1f2',
  redBd: '#fecdd3',
  gold: '#f59e0b',
}

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', backgroundColor: C.white, fontSize: 10 },
  header: {
    backgroundColor: C.black,
    padding: '18 24',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logo: { height: 32, objectFit: 'contain' },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 4,
  },
  userBlock: { flex: 1 },
  userName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    lineHeight: 1.2,
  },
  userSub: { fontSize: 8, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#52525b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.white },
  scorePill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 7,
    padding: '8 12',
    alignItems: 'center',
  },
  scoreNum: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    lineHeight: 1,
  },
  scoreDenom: { fontSize: 8, color: 'rgba(255,255,255,0.5)' },
  scoreStars: { fontSize: 10, color: C.gold, marginTop: 2 },
  strip: {
    backgroundColor: C.zinc1,
    paddingHorizontal: 24,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.zinc2,
  },
  stripTxt: { fontSize: 8, color: C.zinc5 },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
    borderWidth: 1,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
  },
  bPendente: { backgroundColor: C.zinc1, color: C.zinc5, borderColor: C.zinc2 },
  bChefe: { backgroundColor: C.blueBg, color: C.blue, borderColor: C.blueBd },
  bValidado: {
    backgroundColor: C.greenBg,
    color: C.green,
    borderColor: C.greenBd,
  },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  metaCell: {
    width: '50%',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.zinc1,
  },
  metaLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.zinc4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: { fontSize: 10, color: C.black, marginTop: 2 },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.zinc1,
  },
  secTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.zinc4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  progressLbl: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.black },
  progressVal: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.black },
  progressTrack: { height: 6, backgroundColor: C.zinc1, borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: C.black, borderRadius: 3 },
  progressMeta: { fontSize: 7.5, color: C.zinc4, marginTop: 3 },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.zinc2,
    paddingBottom: 6,
    marginBottom: 2,
  },
  thNome: {
    flex: 1,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.zinc4,
    textTransform: 'uppercase',
  },
  thPeso: {
    width: 40,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.zinc4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  thNota: {
    width: 32,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: C.zinc4,
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#fafafa',
  },
  critNome: { flex: 1, fontSize: 9.5, color: C.black },
  critDesc: { fontSize: 7.5, color: C.zinc4, marginTop: 1 },
  critObs: { fontSize: 7.5, color: C.zinc5, fontStyle: 'italic', marginTop: 1 },
  pesoTag: { width: 40, fontSize: 8, color: C.zinc5, textAlign: 'center' },
  notaBox: {
    width: 26,
    height: 26,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notaTxt: { fontSize: 11, fontFamily: 'Helvetica-Bold' },
  comentario: {
    backgroundColor: '#fafafa',
    borderLeftWidth: 3,
    borderLeftColor: C.zinc2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  comentTxt: {
    fontSize: 9,
    color: '#52525b',
    fontStyle: 'italic',
    lineHeight: 1.5,
  },
  valBox: { borderRadius: 6, padding: 11 },
  valOk: { backgroundColor: C.greenBg, borderWidth: 1, borderColor: C.greenBd },
  valKo: { backgroundColor: C.redBg, borderWidth: 1, borderColor: C.redBd },
  valHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valTitleOk: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#15803d' },
  valTitleKo: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#be123c' },
  valDate: { fontSize: 8, color: C.zinc4 },
  valComment: {
    fontSize: 8.5,
    fontStyle: 'italic',
    marginTop: 5,
    paddingLeft: 8,
    borderLeftWidth: 2,
  },
  valComOk: { color: '#166534', borderLeftColor: '#86efac' },
  valComKo: { color: '#9f1239', borderLeftColor: '#fca5a5' },
  valMeta: { fontSize: 8, color: C.zinc4, marginTop: 4 },
  footer: {
    backgroundColor: '#fafafa',
    borderTopWidth: 1,
    borderTopColor: C.zinc2,
    paddingHorizontal: 24,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerTxt: { fontSize: 7.5, color: C.zinc4 },
  emptySection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyTxt: { fontSize: 10, color: C.zinc4 },
})

// ── Helpers ───────────────────────────────────────────────────
const fmt = (iso: string | Date) =>
  new Date(iso).toLocaleDateString('pt-AO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

const stars = (p: number) =>
  [1, 2, 3, 4, 5].map((n) => (n <= Math.round(p) ? '★' : '☆')).join('')

const estadoLabel: Record<string, string> = {
  Pendente: 'Pendente',
  AvaliadoPorChefe: 'Avaliado pelo Chefe',
  ValidadoPorDirector: 'Validado pelo Director',
}

type FichaData = Awaited<ReturnType<typeof getFichaData>>

async function getFichaData(id: string) {
  return prisma.fichaAvaliacao.findUnique({
    where: { id },
    select: {
      id: true,
      estado: true,
      pontuacaoFinal: true,
      createdAt: true,
      avaliado: {
        select: {
          id: true,
          nomeCompleto: true,
          cargo: true,
          numeroMecanografico: true,
          email: true,
          avatarUrl: true,
          dataAdmissao: true,
          departamento: { select: { nome: true } },
          direcao: { select: { nome: true } },
        },
      },
      periodo: { select: { nome: true, dataInicio: true, dataFim: true } },
      submissao: {
        select: {
          comentarios: true,
          pontuacaoTotal: true,
          dataSubmissao: true,
          avaliador: { select: { nomeCompleto: true, cargo: true } },
          respostas: {
            select: {
              pontuacao: true,
              observacao: true,
              criterio: { select: { nome: true, peso: true, descricao: true } },
            },
            orderBy: { criterio: { nome: 'asc' } },
          },
        },
      },
      validacao: {
        select: {
          aprovado: true,
          comentarios: true,
          dataValidacao: true,
          director: { select: { nomeCompleto: true } },
        },
      },
    },
  })
}

// ── Componente PDF ────────────────────────────────────────────
function FichaPDF({
  ficha,
  logoSrc,
}: {
  ficha: NonNullable<FichaData>
  logoSrc: string | null
}) {
  const initials = ficha.avaliado.nomeCompleto
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')

  const pct =
    ficha.pontuacaoFinal != null ? Math.min(1, ficha.pontuacaoFinal / 5) : 0

  const badgeStyle =
    ficha.estado === 'ValidadoPorDirector'
      ? s.bValidado
      : ficha.estado === 'AvaliadoPorChefe'
        ? s.bChefe
        : s.bPendente

  const notaColors = (p: number) => ({
    bg: p >= 4 ? C.greenBg : p === 3 ? C.blueBg : C.redBg,
    color: p >= 4 ? C.green : p === 3 ? C.blue : C.red,
  })

  return h(
    Document,
    {},
    h(
      Page,
      { size: 'A4', style: s.page },

      // HEADER
      h(
        View,
        { style: s.header },
        logoSrc
          ? h(Image, { src: logoSrc, style: s.logo })
          : h(
              Text,
              {
                style: {
                  fontSize: 14,
                  fontFamily: 'Helvetica-Bold',
                  color: C.white,
                },
              },
              'ADAPEC',
            ),
        h(View, { style: s.divider }),
        h(
          View,
          { style: s.userBlock },
          h(Text, { style: s.userName }, ficha.avaliado.nomeCompleto),
          h(Text, { style: s.userSub }, ficha.avaliado.cargo),
          h(
            Text,
            { style: [s.userSub, { marginTop: 4 }] },
            [ficha.avaliado.departamento?.nome, ficha.avaliado.direcao?.nome]
              .filter(Boolean)
              .join(' · '),
          ),
        ),
        h(
          View,
          { style: s.avatarCircle },
          h(Text, { style: s.avatarText }, initials),
        ),
        ficha.pontuacaoFinal != null
          ? h(
              View,
              { style: s.scorePill },
              h(Text, { style: s.scoreNum }, ficha.pontuacaoFinal.toFixed(1)),
              h(Text, { style: s.scoreDenom }, '/ 5.0'),
              h(Text, { style: s.scoreStars }, stars(ficha.pontuacaoFinal)),
            )
          : null,
      ),

      // STATUS STRIP
      h(
        View,
        { style: s.strip },
        h(
          Text,
          { style: [s.badge, badgeStyle] },
          estadoLabel[ficha.estado] ?? ficha.estado,
        ),
        h(Text, { style: s.stripTxt }, `Criado em ${fmt(ficha.createdAt)}`),
        h(
          Text,
          { style: [s.stripTxt, { marginLeft: 'auto' }] },
          'Sistema de Avaliação de Desempenho',
        ),
      ),

      // META GRID
      h(
        View,
        { style: s.metaGrid },
        ...[
          ['Nº Mecanográfico', ficha.avaliado.numeroMecanografico],
          ['Email', ficha.avaliado.email],
          ['Direcção', ficha.avaliado.direcao?.nome ?? '—'],
          ['Departamento', ficha.avaliado.departamento?.nome ?? '—'],
          ['Período', ficha.periodo.nome],
          ['Data de Admissão', fmt(ficha.avaliado.dataAdmissao)],
          ['Início do Período', fmt(ficha.periodo.dataInicio)],
          ['Fim do Período', fmt(ficha.periodo.dataFim)],
        ].map(([label, value]) =>
          h(
            View,
            { key: label, style: s.metaCell },
            h(Text, { style: s.metaLabel }, label),
            h(Text, { style: s.metaValue }, value),
          ),
        ),
      ),

      // RESULTADO GERAL
      ficha.submissao && ficha.pontuacaoFinal != null
        ? h(
            View,
            { style: s.section },
            h(Text, { style: s.secTitle }, 'Resultado Geral'),
            h(
              View,
              { style: s.progressRow },
              h(Text, { style: s.progressLbl }, 'Pontuação ponderada'),
              h(
                Text,
                { style: s.progressVal },
                `${ficha.pontuacaoFinal.toFixed(2)} / 5.0`,
              ),
            ),
            h(
              View,
              { style: s.progressTrack },
              h(View, { style: [s.progressFill, { width: `${pct * 100}%` }] }),
            ),
            h(
              Text,
              { style: s.progressMeta },
              `Por ${ficha.submissao.avaliador.nomeCompleto} (${ficha.submissao.avaliador.cargo}) · ${fmt(ficha.submissao.dataSubmissao)}`,
            ),
          )
        : null,

      // CRITÉRIOS
      ficha.submissao
        ? h(
            View,
            { style: s.section },
            h(Text, { style: s.secTitle }, 'Critérios Avaliados'),
            h(
              View,
              { style: s.tableHead },
              h(Text, { style: s.thNome }, 'Critério'),
              h(Text, { style: s.thPeso }, 'Peso'),
              h(Text, { style: s.thNota }, 'Nota'),
            ),
            ...ficha.submissao.respostas.map((r) => {
              const nc = notaColors(r.pontuacao)
              return h(
                View,
                { key: r.criterio.nome, style: s.tableRow },
                h(
                  View,
                  { style: { flex: 1 } },
                  h(Text, { style: s.critNome }, r.criterio.nome),
                  r.criterio.descricao
                    ? h(Text, { style: s.critDesc }, r.criterio.descricao)
                    : null,
                ),
                h(Text, { style: s.pesoTag }, `×${r.criterio.peso}`),
                h(
                  View,
                  { style: [s.notaBox, { backgroundColor: nc.bg }] },
                  h(
                    Text,
                    { style: [s.notaTxt, { color: nc.color }] },
                    String(r.pontuacao),
                  ),
                ),
              )
            }),
          )
        : h(
            View,
            { style: s.emptySection },
            h(
              Text,
              { style: s.emptyTxt },
              'Esta ficha ainda não foi avaliada pelo chefe de departamento.',
            ),
          ),

      // COMENTÁRIO
      ficha.submissao?.comentarios
        ? h(
            View,
            { style: s.section },
            h(Text, { style: s.secTitle }, 'Comentário do Avaliador'),
            h(
              View,
              { style: s.comentario },
              h(
                Text,
                { style: s.comentTxt },
                `"${ficha.submissao.comentarios}"`,
              ),
            ),
          )
        : null,

      // VALIDAÇÃO
      ficha.validacao
        ? h(
            View,
            { style: s.section },
            h(Text, { style: s.secTitle }, 'Validação do Director'),
            h(
              View,
              {
                style: [s.valBox, ficha.validacao.aprovado ? s.valOk : s.valKo],
              },
              h(
                View,
                { style: s.valHeader },
                h(
                  Text,
                  {
                    style: ficha.validacao.aprovado
                      ? s.valTitleOk
                      : s.valTitleKo,
                  },
                  ficha.validacao.aprovado ? '✓ Aprovado' : '✗ Rejeitado',
                ),
                h(
                  Text,
                  { style: s.valDate },
                  fmt(ficha.validacao.dataValidacao),
                ),
              ),
              ficha.validacao.comentarios
                ? h(
                    Text,
                    {
                      style: [
                        s.valComment,
                        ficha.validacao.aprovado ? s.valComOk : s.valComKo,
                      ],
                    },
                    `"${ficha.validacao.comentarios}"`,
                  )
                : null,
              h(
                Text,
                { style: s.valMeta },
                `— ${ficha.validacao.director.nomeCompleto}`,
              ),
            ),
          )
        : null,

      // FOOTER
      h(
        View,
        { style: s.footer },
        h(
          Text,
          { style: s.footerTxt },
          `Documento gerado em ${fmt(new Date())} · Confidencial`,
        ),
        h(
          Text,
          { style: s.footerTxt },
          `${ficha.avaliado.numeroMecanografico} · ${ficha.periodo.nome}`,
        ),
      ),
    ),
  )
}

// ── Route handler ─────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const auth = requireRole(req, [
    'Master',
    'Director',
    'ChefeDepartamento',
    'Tecnico',
  ])
  if (auth instanceof NextResponse) return auth

  const payload = getPayloadFromRequest(req)!
  const { id } = await params

  const ficha = await getFichaData(id)

  if (!ficha) {
    return NextResponse.json(
      { error: 'Ficha não encontrada.' },
      { status: 404 },
    )
  }
  if (payload.role === 'Tecnico' && ficha.avaliado.id !== payload.sub) {
    return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  }

  // Logo em base64
  let logoSrc: string | null = null
  const logoPath = path.join(process.cwd(), 'public', 'logo-auth.png')
  if (fs.existsSync(logoPath)) {
    const b64 = fs.readFileSync(logoPath).toString('base64')
    logoSrc = `data:image/png;base64,${b64}`
  }

  try {
    // FichaPDF chamado directamente (não via createElement) e convertido
    // para o tipo que renderToBuffer espera
    const pdfBuffer = await renderToBuffer(
      FichaPDF({
        ficha,
        logoSrc,
      }) as unknown as React.ReactElement<DocumentProps>,
    )

    const filename = `ficha-${ficha.avaliado.numeroMecanografico}.pdf`

    // NextResponse não aceita Buffer — converter para Uint8Array
    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (err) {
    console.error('[PDF_GENERATE]', err)
    return NextResponse.json({ error: 'Erro ao gerar o PDF.' }, { status: 500 })
  }
}
