/* eslint-env node */
import axios from 'axios';
import express from 'express';
import db from '../config/databases.js';

const router = express.Router();

const PAYPAL_BASE_URL =
  process.env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

const getPayPalAccessToken = async () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await axios.post(`${PAYPAL_BASE_URL}/v1/oauth2/token`, 'grant_type=client_credentials', {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.data.access_token;
  } catch (error) {
    console.error('PayPal access token error:', error.response?.data || error.message);
    throw new Error(`Failed to get PayPal access token: ${error.message}`);
  }
};

router.post('/create-order', async (req, res) => {
  try {
    const { steamId, email, tokens, amount } = req.body;

    if (!steamId || !tokens || !amount) {
      return res.status(400).json({ error: 'Missing required fields: steamId, tokens, amount' });
    }

    const accessToken = await getPayPalAccessToken();

    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'GBP',
            value: amount.toString(),
          },
          description: `${tokens} Tokens for ${steamId}`,
          custom_id: JSON.stringify({ steamId, tokens, email }),
        },
      ],
      application_context: {
        brand_name: 'DarkRP Store',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/store?success=true`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/store?canceled=true`,
      },
    };

    const response = await axios.post(`${PAYPAL_BASE_URL}/v2/checkout/orders`, orderData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    try {
      await db.query(
        'tokens',
        'INSERT INTO roasts_transactions (steamid, amount, type, description, paypal_order_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [steamId, tokens, 'purchase', `Purchase ${tokens} tokens via PayPal`, response.data.id, 'pending']
      );
    } catch (dbError) {
      console.error('Database error saving order:', dbError);
    }

    const approvalLink = response.data.links.find((link) => link.rel === 'approve');

    if (!approvalLink) {
      throw new Error('No approval link found in PayPal response');
    }

    res.json({
      orderId: response.data.id,
      approvalUrl: approvalLink.href,
    });
  } catch (error) {
    console.error('PayPal create order error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to create PayPal order',
      details: error.response?.data || error.message,
    });
  }
});

router.post('/capture-order', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Missing orderId' });
    }

    const accessToken = await getPayPalAccessToken();

    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const capture = response.data;
    const purchaseUnit = capture.purchase_units[0];
    const customData = JSON.parse(purchaseUnit.custom_id || '{}');
    const { steamId, tokens } = customData;

    try {
      await db.query(
        'tokens',
        'UPDATE roasts_transactions SET status = ?, paypal_payer_id = ?, paypal_transaction_id = ?, updated_at = NOW() WHERE paypal_order_id = ?',
        ['completed', capture.payer?.payer_id, purchaseUnit.payments?.captures?.[0]?.id, orderId]
      );

      const existingTokens = await db.query('tokens', 'SELECT * FROM roasts_tokens WHERE steamid = ?', [steamId]);

      if (existingTokens.length > 0) {
        await db.query('tokens', 'UPDATE roasts_tokens SET tokens = tokens + ? WHERE steamid = ?', [tokens, steamId]);
      } else {
        await db.query('tokens', 'INSERT INTO roasts_tokens (steamid, tokens) VALUES (?, ?)', [steamId, tokens]);
      }
    } catch (dbError) {
      console.error('Database error updating order:', dbError);
    }

    res.json({
      success: true,
      orderId: capture.id,
      status: capture.status,
      tokens,
      steamId,
    });
  } catch (error) {
    console.error('PayPal capture order error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to capture PayPal order',
      details: error.response?.data || error.message,
    });
  }
});

export default router;

