import { Request, Response } from "express"

export const sendWhatsapp = async (req: Request, res: Response) => {
  try {
    const service = {
      baseUrl: process.env.WHATSAPP_SERVICE_BASE_URL as string,
      clientToken: process.env.WHATSAPP_SERVICE_CLIENT_TOKEN as string,
    }

    const phone = req.body.phone as string
    const document = req.body.document as string
    const fileName = req.body.fileName as string
    const caption = req.body.caption as string

    if (!phone || !document || !fileName || !caption) {
      return res
        .status(400)
        .json({ error: "Verifique as informações e tente novamente" })
    }

    const requestHeaders = new Headers()

    requestHeaders.append("Content-Type", "application/json")
    requestHeaders.append("Client-Token", service.clientToken)

    await fetch(`${service.baseUrl}/send-document/pdf`, {
      method: "POST",
      body: JSON.stringify({
        phone,
        document,
        fileName,
        caption,
      }),
      headers: requestHeaders,
    })
      .then(async (response) => {
        const result = await response.json()
        const success = response.status === 200 && !!result.messageId

        if (success) res.status(200).json({ sended: success })
        else
          throw new Error(
            "Houve um erro ao enviar o código. Tente novamente mais tarde"
          )
      })
      .catch((err) => {
        res.status(200).json({ sended: false })
      })
  } catch (error) {
    res.status(400).json({ sended: false, error })
  }
}

export const sendCode = async (req: Request, res: Response) => {
  try {
    const service = {
      baseUrl: process.env.WHATSAPP_SERVICE_BASE_URL as string,
      clientToken: process.env.WHATSAPP_SERVICE_CLIENT_TOKEN as string,
    }

    const { code, phone } = req.body

    if (code && phone) {
      const message = `[ListaPix] Seu token de acesso: *${code}*.`

      const requestHeaders = new Headers()

      requestHeaders.append("Content-Type", "application/json")
      requestHeaders.append("Client-Token", service.clientToken)

      await fetch(`${service.baseUrl}/send-button-otp`, {
        method: "POST",
        body: JSON.stringify({
          phone,
          message,
          code: `${code}`
        }),
        headers: requestHeaders,
      })
        .then(async (response) => {
          const result = await response.json()
          const success = response.status === 200 && !!result.messageId

          if (success) res.status(200).json({ sended: success })
          else
            throw new Error(
              "Houve um erro ao enviar o código. Tente novamente mais tarde"
            )
        })
        .catch((err) => {
          throw new Error(
            "Houve um erro ao enviar o código. Verifique o número e tente novamente."
          )
        })
    } else
      throw new Error(
        "Houve um erro ao enviar o código. Verifique o número e tente novamente."
      )
  } catch (error) {
    res.status(400).json({ sended: false, error })
  }
}

export const ping = async (req: Request, res: Response) => {
  return res.json({ pong: true })
}
