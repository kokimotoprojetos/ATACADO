import crypto from 'node:crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // Verify webhook signature if secret is configured
  const signature = req.headers['transaction-hash'];
  const webhookSecret = process.env.LYTRON_WEBHOOK_SECRET;

  if (webhookSecret && signature) {
    try {
      const payloadString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const computedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payloadString)
        .digest('hex');

      if (computedSignature !== signature) {
        console.warn('[LytronPay Webhook] Signature verification failed. Computed:', computedSignature, 'Received:', signature);
        return res.status(401).json({ error: 'Invalid signature' });
      }
      console.log('[LytronPay Webhook] Signature verified successfully.');
    } catch (err) {
      console.error('[LytronPay Webhook] Error verifying signature:', err);
      return res.status(400).json({ error: 'Signature verification error' });
    }
  }

  try {
    const payload = req.body || {};
    console.log('[LytronPay Webhook] Received notification payload:', JSON.stringify(payload, null, 2));

    // Resolve status value from payload
    const statusVal = payload.status || (payload.data ? payload.data.status : null);
    
    if (statusVal) {
      const isPaid = ['paid', 'approved', 'completed', 'success', 'pago', 'aprovado'].includes(
        String(statusVal).toLowerCase().trim()
      );
      
      if (isPaid) {
        const paymentId = payload.hash || payload.id || (payload.data ? payload.data.id : null);
        console.log(`[LytronPay Webhook] Payment ${paymentId} successfully processed and confirmed!`);
        // Optional: Trigger fulfillment logic here (e.g. database updates, emails, etc.)
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[LytronPay Webhook] Error processing webhook notification:', error);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
}
