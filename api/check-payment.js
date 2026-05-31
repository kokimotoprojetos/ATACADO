export default async function handler(req, res) {
  const { paymentId } = req.query;

  if (!paymentId) {
    return res.status(400).json({ error: 'Parâmetro paymentId é obrigatório.' });
  }

  try {
    const apiKey = process.env.LYTRON_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Configuração de pagamento incompleta.' });
    }

    // Endpoint correto conforme documentação: GET /api/v1/charges/{txid}
    const url = `https://api.lytronpay.com/api/v1/charges/${paymentId}`;
    console.log('[LytronPay] Consultando status em:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Api-Access-Key': apiKey,
        'Accept': 'application/json'
      }
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[LytronPay] Resposta não é JSON:', responseText.substring(0, 200));
      return res.status(502).json({ error: 'Gateway retornou resposta inválida.' });
    }

    if (!response.ok) {
      console.error('[LytronPay] Erro ao consultar status:', response.status, data);
      return res.status(200).json({ status: 'pending', rawStatus: 'error' });
    }

    console.log('[LytronPay] Status da charge:', data.status);

    // Verifica se foi pago
    const isPaid = ['paid', 'approved', 'completed', 'success', 'pago', 'aprovado', 'PAID'].includes(
      String(data.status || '').trim()
    );

    return res.status(200).json({
      status: isPaid ? 'approved' : 'pending',
      rawStatus: data.status
    });

  } catch (error) {
    console.error('[LytronPay Status] Erro interno:', error.message);
    return res.status(500).json({ error: 'Erro ao consultar status do pagamento.' });
  }
}
