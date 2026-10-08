import { Request, Response } from "express"

export const sendCode = async (req: Request, res: Response) => {
  try {
    const serviceToken = process.env.SMS_SERVICE_ACCOUNT_API_KEY as string
    const serviceUrl = process.env.SMS_SERVICE_URL as string

    const service = {
      token: serviceToken,
      url: serviceUrl,
    }

    const { code, phone } = req.body

    if (code && phone) {
      const message = `[ListaPix] Seu token de acesso: ${code}.`

      const cleanPhone = `0${phone.replace(/\D/g, "")}`

      const body = {
        Sender: "webstore",
        Receivers: cleanPhone,
        Content: message,
      }

      await fetch(service.url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "auth-key": service.token,
        },
      })
        .then(async (result) => {
          const resData = await result.json()

          if (resData.Success) {
            res.status(200).json({ sended: true })
          } else {
            res.status(400).json({
              sended: false,
              error:
                "Houve um erro ao enviar o código. Tente novamente mais tarde.",
            })
          }
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