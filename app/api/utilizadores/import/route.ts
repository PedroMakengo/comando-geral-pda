// app/api/utilizadores/import/route.ts
// Importa funcionários a partir de um ficheiro Excel (Primavera)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/permissions'
import bcrypt from 'bcryptjs'
import * as XLSX from 'xlsx'

// Mapeamento das colunas do Excel para os campos do modelo
// O Excel do Primavera usa estes cabeçalhos (insensível a maiúsculas)
const COL_MAP: Record<string, string> = {
  // Primavera                  → campo interno
  'nº funcionário': 'numeroMecanografico',
  'numero funcionario': 'numeroMecanografico',
  mecanografico: 'numeroMecanografico',
  nome: 'nomeCompleto',
  'nome completo': 'nomeCompleto',
  'nome abreviado': 'nomeAbreviado',
  email: 'email',
  cargo: 'cargo',
  'data nascimento': 'dataNascimento',
  'data de nascimento': 'dataNascimento',
  género: 'genero',
  genero: 'genero',
  sexo: 'genero',
  nacionalidade: 'nacionalidade',
  naturalidade: 'naturalidade',
  telefone: 'telefone',
  telemóvel: 'telemovel',
  telemovel: 'telemovel',
  extensão: 'extensao',
  extensao: 'extensao',
  morada: 'morada',
  localidade: 'localidade',
  'código postal': 'codigoPostal',
  'codigo postal': 'codigoPostal',
  país: 'pais',
  pais: 'pais',
  província: 'provincia',
  provincia: 'provincia',
  município: 'municipio',
  municipio: 'municipio',
  comuna: 'comuna',
}

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\s+/g, ' ')
}

function parseGenero(val: string): 'Masculino' | 'Feminino' | 'Outro' | null {
  const v = val?.toLowerCase().trim() ?? ''
  if (['m', 'masculino', 'masc'].includes(v)) return 'Masculino'
  if (['f', 'feminino', 'fem'].includes(v)) return 'Feminino'
  if (v) return 'Outro'
  return null
}

function parseDate(val: unknown): Date | null {
  if (!val) return null
  // Excel pode devolver número serial ou string
  if (typeof val === 'number') {
    // Data serial do Excel (dias desde 1899-12-30)
    const d = new Date((val - 25569) * 86400 * 1000)
    return isNaN(d.getTime()) ? null : d
  }
  if (typeof val === 'string') {
    // Formatos comuns: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    const cleaned = val.trim()
    const ptMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (ptMatch) {
      const [, d, m, y] = ptMatch
      const date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
      return isNaN(date.getTime()) ? null : date
    }
    const iso = new Date(cleaned)
    return isNaN(iso.getTime()) ? null : iso
  }
  if (val instanceof Date) return val
  return null
}

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ['Master'])
  if (auth instanceof NextResponse) return auth

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Ficheiro não enviado.' },
        { status: 400 },
      )
    }

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      return NextResponse.json(
        { error: 'Formato inválido. Use .xlsx, .xls ou .csv.' },
        { status: 400 },
      )
    }

    // Ler ficheiro
    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: '',
    })

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Ficheiro sem dados.' },
        { status: 400 },
      )
    }

    // Normalizar cabeçalhos
    const firstRow = rows[0]
    const headerMap: Record<string, string> = {}
    for (const rawKey of Object.keys(firstRow)) {
      const norm = normalizeHeader(rawKey)
      const campo = COL_MAP[norm]
      if (campo) headerMap[rawKey] = campo
    }

    if (
      !headerMap[
        Object.keys(headerMap).find((k) => headerMap[k] === 'nomeCompleto') ??
          ''
      ] &&
      !Object.values(headerMap).includes('nomeCompleto')
    ) {
      return NextResponse.json(
        { error: 'Coluna "Nome" não encontrada. Verifique o ficheiro.' },
        { status: 422 },
      )
    }

    const passwordHash = await bcrypt.hash('Adapec@2025', 12)

    const resultados = {
      criados: 0,
      actualizados: 0,
      ignorados: 0,
      erros: [] as { linha: number; motivo: string }[],
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const linha = i + 2 // +2 porque linha 1 são cabeçalhos

      try {
        // Mapear campos
        const mapped: Record<string, unknown> = {}
        for (const [rawKey, campo] of Object.entries(headerMap)) {
          mapped[campo] = row[rawKey]
        }

        const nomeCompleto = String(mapped.nomeCompleto ?? '').trim()
        const numeroMecanografico = String(
          mapped.numeroMecanografico ?? '',
        ).trim()

        if (!nomeCompleto) {
          resultados.ignorados++
          resultados.erros.push({
            linha,
            motivo: 'Nome em branco — linha ignorada.',
          })
          continue
        }

        // Gerar email se não vier no ficheiro
        const email =
          String(mapped.email ?? '').trim() ||
          `${nomeCompleto.split(' ')[0].toLowerCase()}.${numeroMecanografico.toLowerCase()}@adapec.ao`

        const data: Record<string, unknown> = {
          nomeCompleto,
          email,
          passwordHash,
          cargo: String(mapped.cargo ?? 'Técnico').trim() || 'Técnico',
          avatarUrl: '',
        }

        if (numeroMecanografico) data.numeroMecanografico = numeroMecanografico

        // Campos opcionais
        if (mapped.nomeAbreviado)
          data.nomeAbreviado = String(mapped.nomeAbreviado).trim()
        if (mapped.nacionalidade)
          data.nacionalidade = String(mapped.nacionalidade).trim()
        if (mapped.naturalidade)
          data.naturalidade = String(mapped.naturalidade).trim()
        if (mapped.telefone) data.telefone = String(mapped.telefone).trim()
        if (mapped.telemovel) data.telemovel = String(mapped.telemovel).trim()
        if (mapped.extensao) data.extensao = String(mapped.extensao).trim()
        if (mapped.morada) data.morada = String(mapped.morada).trim()
        if (mapped.localidade)
          data.localidade = String(mapped.localidade).trim()
        if (mapped.codigoPostal)
          data.codigoPostal = String(mapped.codigoPostal).trim()
        if (mapped.pais) data.pais = String(mapped.pais).trim()
        if (mapped.provincia) data.provincia = String(mapped.provincia).trim()
        if (mapped.municipio) data.municipio = String(mapped.municipio).trim()
        if (mapped.comuna) data.comuna = String(mapped.comuna).trim()

        const genero = parseGenero(String(mapped.genero ?? ''))
        if (genero) data.genero = genero

        const dataNasc = parseDate(mapped.dataNascimento)
        if (dataNasc) data.dataNascimento = dataNasc

        // Upsert por numeroMecanografico (se existir) ou email
        if (numeroMecanografico) {
          const existe = await prisma.utilizador.findUnique({
            where: { numeroMecanografico },
          })
          if (existe) {
            // Actualizar — não sobrescreve senha nem role
            const { passwordHash: _ph, ...updateData } = data as any
            await prisma.utilizador.update({
              where: { id: existe.id },
              data: updateData,
            })
            resultados.actualizados++
          } else {
            await prisma.utilizador.create({ data: data as any })
            resultados.criados++
          }
        } else {
          // Sem nº mecanográfico — tentar por email
          const existe = await prisma.utilizador.findUnique({
            where: { email },
          })
          if (existe) {
            const { passwordHash: _ph, ...updateData } = data as any
            await prisma.utilizador.update({
              where: { id: existe.id },
              data: updateData as any,
            })
            resultados.actualizados++
          } else {
            // Gerar nº mecanográfico automático
            const count = await prisma.utilizador.count()
            data.numeroMecanografico = `IMP-${String(count + 1).padStart(4, '0')}`
            await prisma.utilizador.create({ data: data as any })
            resultados.criados++
          }
        }
      } catch (rowErr: any) {
        resultados.ignorados++
        resultados.erros.push({
          linha,
          motivo: rowErr?.message?.includes('Unique constraint')
            ? 'Email ou nº mecanográfico duplicado.'
            : (rowErr?.message ?? 'Erro desconhecido.'),
        })
      }
    }

    return NextResponse.json({
      total: rows.length,
      criados: resultados.criados,
      actualizados: resultados.actualizados,
      ignorados: resultados.ignorados,
      erros: resultados.erros.slice(0, 20), // max 20 erros no response
    })
  } catch (error) {
    console.error('[IMPORT_UTILIZADORES]', error)
    return NextResponse.json(
      { error: 'Erro ao processar o ficheiro.' },
      { status: 500 },
    )
  }
}
