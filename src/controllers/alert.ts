import crypto from "crypto"
import { Request, Response } from "express"
import nodemailer from "nodemailer"

/**
 * Alerta operacional para a equipe Oi (KAN-292): e-mail pelo SMTP e WhatsApp
 * de texto pelo Z-API. Chamado só pelo backend, com o segredo ALERT_SECRET no
 * cabeçalho X-Alert-Secret. Sem o segredo configurado, a rota fica fechada:
 * texto livre sem autenticação viraria disparador de spam pelo número oficial.
 */

const MAX_RECIPIENTS = 5
const MAX_TEXT = 2000

function secretMatches(received: string | undefined): boolean {
  const expected = (process.env.ALERT_SECRET || "").trim()
  if (!expected || !received) return false
  const a = Buffer.from(String(received))
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(new Uint8Array(a), new Uint8Array(b))
}

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length <= MAX_RECIPIENTS &&
  value.every((v) => typeof v === "string" && v.trim().length > 0)

async function sendAlertEmail(to: string[], subject: string, text: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_EMAIL_USER,
      pass: process.env.SMTP_EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  })
  await transporter.sendMail({
    from: "ListaPix",
    to: to.join(","),
    subject,
    text,
    encoding: "utf-8",
  })
}

async function sendAlertWhatsapp(phone: string, message: string): Promise<boolean> {
  const headers = new Headers()
  headers.append("Content-Type", "application/json")
  headers.append("Client-Token", process.env.WHATSAPP_SERVICE_CLIENT_TOKEN as string)
  const response = await fetch(`${process.env.WHATSAPP_SERVICE_BASE_URL}/send-text`, {
    method: "POST",
    body: JSON.stringify({ phone, message }),
    headers,
  })
  const result = await response.json().catch(() => ({}))
  return response.status === 200 && !!result.messageId
}

export const sendAlert = async (req: Request, res: Response) => {
  if (!secretMatches(req.get("x-alert-secret"))) {
    return res.status(401).json({ sended: false, error: "unauthorized" })
  }

  const { emails = [], phones = [], subject, text } = req.body || {}
  if (
    !isStringList(emails) ||
    !isStringList(phones) ||
    emails.length + phones.length === 0 ||
    typeof subject !== "string" ||
    !subject.trim() ||
    typeof text !== "string" ||
    !text.trim() ||
    text.length > MAX_TEXT
  ) {
    return res.status(400).json({ sended: false, error: "invalid payload" })
  }

  let email = false
  if (emails.length > 0) {
    try {
      await sendAlertEmail(emails, subject.slice(0, 200), text)
      email = true
    } catch (err) {
      console.error("[alert] e-mail falhou", (err as Error)?.message)
    }
  }

  const whatsapp: boolean[] = []
  for (const phone of phones) {
    try {
      const digits = phone.replace(/\D/g, "")
      const full = digits.startsWith("55") ? digits : `55${digits}`
      whatsapp.push(await sendAlertWhatsapp(full, `*${subject}*\n\n${text}`))
    } catch (err) {
      console.error("[alert] whatsapp falhou", (err as Error)?.message)
      whatsapp.push(false)
    }
  }

  return res.status(200).json({ sended: email || whatsapp.some(Boolean), email, whatsapp })
}
