import crypto from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Parse body safely
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {
        return res.status(400).json({ error: 'Corpo da requisição inválido.' });
      }
    }
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Corpo da requisição vazio.' });
    }

    const { nome, cpf, email, telefone, total } = body;

    if (!nome || !cpf || !email || !telefone || !total) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    }

    const apiKey = process.env.LYTRON_API_KEY;
    const secretHash = process.env.LYTRON_SECRET;

    if (!apiKey || !secretHash) {
      console.error('[LytronPay] Variáveis de ambiente ausentes');
      return res.status(500).json({ error: 'Configuração de pagamento incompleta no servidor.' });
    }

    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanPhone = telefone.replace(/\D/g, '');
    const amountFloat = parseFloat(Number(total).toFixed(2));

    // Payload conforme documentação oficial:
    // POST https://api.lytronpay.com/api/v1/charges
    const payload = {
      amount: amountFloat,
      description: 'Pedido ATACADO IMPORTS',
      customer: {
        name: nome,
        email: email,
        phone: cleanPhone,
        document: {
          type: 'cpf',
          number: cleanCpf
        }
      }
    };

    const rawBody = JSON.stringify(payload);

    // Gerar assinatura HMAC-SHA256 conforme documentação
    const transactionHash = crypto
      .createHmac('sha256', secretHash)
      .update(rawBody)
      .digest('hex');

    console.log('[LytronPay] Enviando charge para /api/v1/charges');
    console.log('[LytronPay] Amount:', amountFloat, '| Customer:', nome);

    const response = await fetch('https://api.lytronpay.com/api/v1/charges', {
      method: 'POST',
      headers: {
        'Api-Access-Key': apiKey,
        'Transaction-Hash': transactionHash,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: rawBody
    });

    const responseText = await response.text();
    console.log('[LytronPay] Status:', response.status, '| Response:', responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[LytronPay] Resposta não é JSON:', responseText.substring(0, 300));
      return res.status(502).json({ error: 'Gateway de pagamento retornou resposta inválida.' });
    }

    // Tratar erros específicos da API
    if (!response.ok) {
      if (response.status === 401) {
        console.error('[LytronPay] API key inválida ou inativa:', data);
        return res.status(401).json({
          error: 'Credenciais da Lytron Pay inválidas. Verifique sua conta.',
          details: data
        });
      }
      if (response.status === 422) {
        console.error('[LytronPay] Erro de validação / KYC:', data);
        return res.status(422).json({
          error: data.message || 'Erro de validação no gateway de pagamento.',
          details: data
        });
      }
      console.error('[LytronPay] Erro inesperado:', response.status, data);
      return res.status(502).json({
        error: 'Erro ao processar pagamento no gateway.',
        details: data
      });
    }

    // Resposta bem-sucedida (201)
    // Campos conforme doc: { txid, status, amount, qrcode, copyPaste, expiresAt }
    const pixCode = data.copyPaste || data.qrcode;
    const qrCodeImage = data.qrcode_base64 || data.qr_code_base64 || null;

    if (!pixCode) {
      console.error('[LytronPay] Código PIX não encontrado na resposta:', data);
      return res.status(422).json({
        error: 'Não foi possível obter o código PIX. Tente novamente.',
        details: data
      });
    }

    console.log('[LytronPay] Charge criada com sucesso! txid:', data.txid);

    return res.status(200).json({
      paymentId: data.txid || `pay_${Date.now()}`,
      qrCode: qrCodeImage,
      pixCode: pixCode,
      expiresAt: data.expiresAt || null,
      status: data.status || 'pending'
    });

  } catch (error) {
    console.error('[LytronPay Backend] Erro interno:', error.message);
    return res.status(500).json({ error: 'Erro interno ao processar pagamento.' });
  }
}
