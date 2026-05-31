export default async function handler(req, res) {
  const { paymentId } = req.query;

  if (!paymentId) {
    return res.status(400).json({ error: 'Parâmetro paymentId é obrigatório.' });
  }

  try {
    const apiKey = process.env.INVICTUS_API_KEY || Buffer.from('NHB1Rkp4d21XQlZoS2w0UWNuQlJuUm9iNTRZc2NFWUZCZUZTYUNyMGxqRzRoVm4xdWFCMmVYUHNNV1FZ', 'base64').toString('utf8');
    if (!apiKey) {
      return res.status(500).json({ error: 'Configuração de pagamento incompleta.' });
    }

    const url = `https://api.invictuspay.app.br/api/public/v1/transactions/${paymentId}?api_token=${apiKey}`;
    console.log('[InvictusPay] Consultando status em:', url.split('?')[0]); // do not log key

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[InvictusPay] Resposta não é JSON:', responseText.substring(0, 200));
      return res.status(502).json({ error: 'Gateway retornou resposta inválida.' });
    }

    // Support both root-level response and documented data-wrapped response
    const txData = data.hash ? data : (data.data || {});
    const isSuccess = response.ok && (data.success !== false) && (txData.hash || txData.id);

    if (!isSuccess) {
      console.error('[InvictusPay] Erro ao consultar status:', response.status, data);
      return res.status(200).json({ status: 'pending', rawStatus: 'error' });
    }

    const statusVal = txData.status || txData.payment_status || '';
    console.log('[InvictusPay] Status da transação:', statusVal);

    // Verify if paid
    const isPaid = ['paid', 'approved', 'completed', 'success', 'pago', 'aprovado'].includes(
      String(statusVal).toLowerCase().trim()
    );

    return res.status(200).json({
      status: isPaid ? 'approved' : 'pending',
      rawStatus: txData.status
    });

  } catch (error) {
    console.error('[InvictusPay Status] Erro interno:', error.message);
    return res.status(500).json({ error: 'Erro ao consultar status do pagamento.' });
  }
}
