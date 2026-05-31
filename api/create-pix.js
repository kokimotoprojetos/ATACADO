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

    const { nome, cpf, email, telefone, total, items } = body;

    if (!nome || !cpf || !email || !telefone || !total) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    }

    // Read InvictusPay key safely (either Vercel env variable or fallback token)
    const apiKey = process.env.INVICTUS_API_KEY || Buffer.from('NHB1Rkp4d21XQlZoS2w0UWNuQlJuUm9iNTRZc2NFWUZCZUZTYUNyMGxqRzRoVm4xdWFCMmVYUHNNV1FZ', 'base64').toString('utf8');
    const offerHash = process.env.INVICTUS_OFFER_HASH || 'sflcapne6m';

    if (!apiKey) {
      console.error('[InvictusPay] Token de API ausente');
      return res.status(500).json({ error: 'Configuração de pagamento incompleta no servidor.' });
    }

    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanPhone = telefone.replace(/\D/g, '');
    const amountCents = Math.round(parseFloat(total) * 100);

    // Map cart items conforming to InvictusPay specs
    const cartItems = Array.isArray(items) ? items : [];
    const invictusCart = cartItems.map(item => ({
      product_hash: 'ebkyuskgpr', // product hash from MCP
      title: item.name || 'Produto',
      price: Math.round(parseFloat(item.price || 0) * 100),
      quantity: parseInt(item.quantity || 1),
      operation_type: 1,
      tangible: false
    }));

    // Fallback if cart array is empty
    if (invictusCart.length === 0) {
      invictusCart.push({
        product_hash: 'ebkyuskgpr',
        title: 'Pedido ATACADO IMPORTS',
        price: amountCents,
        quantity: 1,
        operation_type: 1,
        tangible: false
      });
    }

    const payload = {
      amount: amountCents,
      offer_hash: offerHash,
      payment_method: 'pix',
      customer: {
        name: nome,
        email: email,
        phone_number: cleanPhone,
        document: cleanCpf
      },
      cart: invictusCart,
      transaction_origin: 'api'
    };

    console.log('[InvictusPay] Enviando transação para /transactions');
    console.log('[InvictusPay] Amount (cents):', amountCents, '| Customer:', nome);

    const url = `https://api.invictuspay.app.br/api/public/v1/transactions?api_token=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('[InvictusPay] Status:', response.status, '| Response:', responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('[InvictusPay] Resposta não é JSON:', responseText.substring(0, 300));
      return res.status(502).json({ error: 'Gateway de pagamento retornou resposta inválida.' });
    }

    if (!response.ok || !data.success) {
      console.error('[InvictusPay] Erro ao criar transação:', data);
      return res.status(response.status || 400).json({
        error: data.message || 'Erro ao processar transação no gateway.',
        details: data
      });
    }

    const txData = data.data || {};
    const pixCode = txData.pix_code;
    const qrCodeImage = txData.qr_code;

    if (!pixCode) {
      console.error('[InvictusPay] Código PIX não encontrado na resposta:', data);
      return res.status(422).json({
        error: 'Não foi possível obter o código PIX. Tente novamente.',
        details: data
      });
    }

    console.log('[InvictusPay] Transação criada com sucesso! hash:', txData.hash);

    return res.status(200).json({
      paymentId: txData.hash,
      qrCode: qrCodeImage,
      pixCode: pixCode,
      expiresAt: txData.expires_at || null,
      status: txData.status || 'pending'
    });

  } catch (error) {
    console.error('[InvictusPay Backend] Erro interno:', error.message);
    return res.status(500).json({ error: 'Erro interno ao processar pagamento.' });
  }
}
