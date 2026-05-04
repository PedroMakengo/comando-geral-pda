import nodemailer from 'nodemailer'

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const roleLabel: Record<string, string> = {
  Master: 'Master',
  Director: 'Director',
  ChefeDepartamento: 'Chefe de Departamento',
  Tecnico: 'Técnico',
}

export async function sendWelcomeEmail({
  nome,
  email,
  numeroMecanografico,
  password,
  role,
}: {
  nome: string
  email: string
  numeroMecanografico: string
  password: string
  role: string
}) {
  const loginUrl = `${process.env.NEXTAUTH_URL}/login`
  const roleName = roleLabel[role] ?? role
  const ano = new Date().getFullYear()

  await transporter.sendMail({
    from: `"PDA — Portal de Avaliação" <${process.env.SMTP_FROM}>`,
    to: email,
    subject:
      'As suas credenciais de acesso — Portal de Avaliação de Desempenho',
    html: `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f1f1; padding: 32px 16px; }
    .wrapper { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }

    /* Header */
    .header { background: #09090b; padding: 28px 36px; display: flex; align-items: center; gap: 14px; }
    .logo   { display: flex; gap: 3px; flex-wrap: wrap; width: 28px; }
    .logo span { display: block; width: 12px; height: 12px; border-radius: 3px; background: white; }
    .logo span:nth-child(1) { opacity: 0.9; }
    .logo span:nth-child(2) { opacity: 0.5; }
    .logo span:nth-child(3) { opacity: 0.5; }
    .logo span:nth-child(4) { opacity: 0.2; }
    .header-title { color: white; font-size: 16px; font-weight: 600; letter-spacing: 0.02em; }
    .header-sub   { color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 2px; }

    /* Body */
    .body { padding: 36px; color: #333; }
    .greeting { font-size: 18px; font-weight: 600; color: #09090b; margin-bottom: 10px; }
    .intro    { font-size: 14px; color: #555; line-height: 1.7; margin-bottom: 24px; }

    /* Credentials box */
    .creds { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 10px; padding: 22px 24px; margin-bottom: 24px; }
    .creds-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13.5px; }
    .creds-row:last-child { border-bottom: none; padding-bottom: 0; }
    .creds-row:first-child { padding-top: 0; }
    .creds-label { color: #888; font-weight: 500; }
    .creds-value { color: #09090b; font-weight: 600; text-align: right; max-width: 60%; word-break: break-all; }
    .creds-password { font-size: 20px; letter-spacing: 3px; color: #09090b; font-family: monospace; }

    /* Role badge */
    .badge { display: inline-block; background: #09090b; color: white; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; letter-spacing: 0.04em; }

    /* Button */
    .btn-wrap { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: #09090b; color: #ffffff; text-decoration: none; padding: 13px 36px; border-radius: 8px; font-weight: 600; font-size: 14px; letter-spacing: 0.02em; }

    /* Warning */
    .warning { background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #78350f; line-height: 1.6; }
    .warning strong { color: #92400e; }

    /* Footer */
    .footer { background: #fafafa; border-top: 1px solid #f0f0f0; text-align: center; padding: 18px; font-size: 12px; color: #aaa; }
  </style>
</head>
<body>
  <div class="wrapper">

    <!-- Header -->
    <div class="header">
      <div class="logo">
        <span></span><span></span><span></span><span></span>
      </div>
      <div>
        <div class="header-title">PDA</div>
        <div class="header-sub">Portal de Avaliação de Desempenho</div>
      </div>
    </div>

    <!-- Body -->
    <div class="body">
      <p class="greeting">Olá, ${nome}</p>
      <p class="intro">
        A sua conta foi criada com sucesso no Portal de Avaliação de Desempenho.
        Abaixo encontra as suas credenciais de acesso.
      </p>

      <!-- Credenciais -->
      <div class="creds">
        <div class="creds-row">
          <span class="creds-label">Email</span>
          <span class="creds-value">${email}</span>
        </div>
        <div class="creds-row">
          <span class="creds-label">Nº Mecanográfico</span>
          <span class="creds-value">${numeroMecanografico}</span>
        </div>
        <div class="creds-row">
          <span class="creds-label">Perfil</span>
          <span class="creds-value"><span class="badge">${roleName}</span></span>
        </div>
        <div class="creds-row">
          <span class="creds-label">Senha temporária</span>
          <span class="creds-value creds-password">${password}</span>
        </div>
      </div>

      <div class="btn-wrap">
        <a href="${loginUrl}" class="btn">Aceder ao Portal</a>
      </div>

      <div class="warning">
        ⚠️ Por segurança, <strong>altere a sua senha após o primeiro acesso</strong> em
        <strong>Meu Perfil → Alterar Senha</strong>.
        Não partilhe estas credenciais com ninguém.
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      © ${ano} Portal de Avaliação de Desempenho &nbsp;·&nbsp; Este email foi gerado automaticamente.
    </div>

  </div>
</body>
</html>
    `,
  })
}

export async function sendChefeDepartamentoEmail({
  nome,
  email,
  departamentoNome,
  direcaoNome,
}: {
  nome: string
  email: string
  departamentoNome: string
  direcaoNome: string
}) {
  const loginUrl = `${process.env.NEXTAUTH_URL}/login`
  const ano = new Date().getFullYear()

  await transporter.sendMail({
    from: `"PDA — Portal de Avaliação" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: `Nomeado Chefe de Departamento — ${departamentoNome}`,
    html: `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f1f1; padding: 32px 16px; }
    .wrapper { max-width: 540px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
    .header { background: #09090b; padding: 28px 36px; display: flex; align-items: center; gap: 14px; }
    .logo { display: flex; gap: 3px; flex-wrap: wrap; width: 28px; }
    .logo span { display: block; width: 12px; height: 12px; border-radius: 3px; background: white; }
    .logo span:nth-child(1) { opacity: 0.9; }
    .logo span:nth-child(2) { opacity: 0.5; }
    .logo span:nth-child(3) { opacity: 0.5; }
    .logo span:nth-child(4) { opacity: 0.2; }
    .header-title { color: white; font-size: 16px; font-weight: 600; }
    .header-sub   { color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 2px; }
    .body { padding: 36px; }
    .greeting { font-size: 17px; font-weight: 600; color: #09090b; margin-bottom: 10px; }
    .intro { font-size: 14px; color: #555; line-height: 1.7; margin-bottom: 24px; }
    .info-box { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 10px; padding: 22px 24px; margin-bottom: 24px; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13.5px; }
    .info-row:last-child { border-bottom: none; padding-bottom: 0; }
    .info-row:first-child { padding-top: 0; }
    .info-label { color: #888; font-weight: 500; }
    .info-value { color: #09090b; font-weight: 600; }
    .badge { display: inline-block; background: #09090b; color: white; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
    .btn-wrap { text-align: center; margin: 24px 0 8px; }
    .btn { display: inline-block; background: #09090b; color: #fff; text-decoration: none; padding: 13px 36px; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .footer { background: #fafafa; border-top: 1px solid #f0f0f0; text-align: center; padding: 18px; font-size: 12px; color: #aaa; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo"><span></span><span></span><span></span><span></span></div>
      <div>
        <div class="header-title">PDA</div>
        <div class="header-sub">Portal de Avaliação de Desempenho</div>
      </div>
    </div>
    <div class="body">
      <p class="greeting">Olá, ${nome}</p>
      <p class="intro">
        Foi nomeado <strong>Chefe de Departamento</strong> no Portal de Avaliação de Desempenho.
        A partir de agora é responsável pela gestão e avaliação da sua equipa.
      </p>
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Departamento</span>
          <span class="info-value">${departamentoNome}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Direção</span>
          <span class="info-value">${direcaoNome}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Perfil</span>
          <span class="info-value"><span class="badge">Chefe de Departamento</span></span>
        </div>
      </div>
      <div class="btn-wrap">
        <a href="${loginUrl}" class="btn">Aceder ao Portal</a>
      </div>
    </div>
    <div class="footer">
      © ${ano} Portal de Avaliação de Desempenho &nbsp;·&nbsp; Este email foi gerado automaticamente.
    </div>
  </div>
</body>
</html>
    `,
  })
}

export async function sendPasswordResetEmail({
  nome,
  email,
  novaSenha,
}: {
  nome: string
  email: string
  novaSenha: string
}) {
  const ano = new Date().getFullYear()

  await transporter.sendMail({
    from: `"PDA — Portal de Avaliação" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: 'Senha redefinida — Portal de Avaliação de Desempenho',
    html: `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f1f1; padding: 32px 16px; }
    .wrapper { max-width: 540px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
    .header { background: #09090b; padding: 28px 36px; }
    .header-title { color: white; font-size: 16px; font-weight: 600; }
    .header-sub   { color: rgba(255,255,255,0.4); font-size: 12px; margin-top: 2px; }
    .body { padding: 36px; }
    .greeting { font-size: 17px; font-weight: 600; color: #09090b; margin-bottom: 10px; }
    .intro { font-size: 14px; color: #555; line-height: 1.7; margin-bottom: 24px; }
    .creds { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 10px; padding: 22px 24px; margin-bottom: 24px; text-align: center; }
    .creds-label    { font-size: 12px; color: #888; margin-bottom: 8px; }
    .creds-password { font-size: 26px; font-weight: 700; letter-spacing: 4px; color: #09090b; font-family: monospace; }
    .warning { background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #78350f; line-height: 1.6; }
    .footer { background: #fafafa; border-top: 1px solid #f0f0f0; text-align: center; padding: 18px; font-size: 12px; color: #aaa; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-title">PDA</div>
      <div class="header-sub">Portal de Avaliação de Desempenho</div>
    </div>
    <div class="body">
      <p class="greeting">Olá, ${nome}</p>
      <p class="intro">A sua senha foi redefinida pelo administrador. Use a senha abaixo para aceder ao portal.</p>
      <div class="creds">
        <p class="creds-label">Nova senha temporária</p>
        <p class="creds-password">${novaSenha}</p>
      </div>
      <div class="warning">
        ⚠️ <strong>Altere esta senha imediatamente</strong> após o acesso em <strong>Meu Perfil → Alterar Senha</strong>.
      </div>
    </div>
    <div class="footer">
      © ${ano} Portal de Avaliação de Desempenho &nbsp;·&nbsp; Este email foi gerado automaticamente.
    </div>
  </div>
</body>
</html>
    `,
  })
}
