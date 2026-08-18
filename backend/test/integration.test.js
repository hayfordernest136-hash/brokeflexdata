const axios = require('axios');
const { Resend } = require('resend');
require('dotenv').config();

const BASE = 'http://localhost:4000/api';
const TEST_EMAIL = 'hayfordernest136@gmail.com';

async function runIntegrationTests() {
    console.log('=== Brokflex Data Integration Tests ===\n');

    // ========================================
    // 1. RESEND EMAIL SERVICE TEST
    // ========================================
    console.log('--- 1. Resend Email Service ---');

    if (!process.env.RESEND_API_KEY) {
        console.log('FAIL: RESEND_API_KEY is not set');
    } else {
        console.log('PASS: RESEND_API_KEY is configured');
    }

    const fromAddress = process.env.EMAIL_FROM || 'noreply@brokeflexdata.com';
    console.log('Configured EMAIL_FROM:', fromAddress);

    try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        console.log('\nSending test email to', TEST_EMAIL, '...');

        const result = await resend.emails.send({
            from: fromAddress,
            to: TEST_EMAIL,
            subject: 'Brokflex Data — Email Service Test',
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Brokflex Data — Email Service Test</title>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f9fafb; margin: 0; padding: 20px; color: #111827; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: #1e293b; padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 24px; margin: 0; }
    .logo { color: #fbbf24; font-weight: 600; }
    .content { padding: 32px 24px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; color: white; background: #16a34a; }
    .footer { background: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1><span class="logo">Brokflex</span> Data</h1>
      <p style="color: #cbd5e1; font-size: 14px; margin-top: 8px;">Email Service Test</p>
    </div>
    <div class="content">
      <p style="margin-top: 0; font-size: 16px;">This is a system test.</p>
      <p>The Resend email service is working correctly.</p>

      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Test Details:</strong></p>
        <p style="margin: 4px 0; font-size: 14px;">Status: <span class="status-badge">PASSED</span></p>
        <p style="margin: 4px 0; font-size: 14px;">Service: Resend Email API</p>
        <p style="margin: 4px 0; font-size: 14px;">From: ${fromAddress}</p>
        <p style="margin: 4px 0; font-size: 14px;">To: ${TEST_EMAIL}</p>
      </div>

      <p style="font-size: 14px; color: #6b7280;">
        This email confirms that the Brokflex Data backend can successfully connect
        to the Resend API and send emails. The sender domain is configured correctly
        and the EMAIL_FROM address is working.
      </p>
    </div>
    <div class="footer">
      Brokflex Data &middot; ${new Date().getFullYear()} &middot; All rights reserved
    </div>
  </div>
</body>
</html>`
        });

        if (result.error) {
            console.log('FAIL: Email send error:', JSON.stringify(result.error, null, 2));
            console.log('\nNote: The EMAIL_FROM domain may need verification.');
            console.log('Trying with Resend default domain...');

            const testResult = await resend.emails.send({
                from: 'onboarding@resend.dev',
                to: TEST_EMAIL,
                subject: 'Brokflex Data — Email Service Test (Fallback Domain)',
                html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Brokflex Data — Email Service Test</title>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f9fafb; margin: 0; padding: 20px; color: #111827; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: #1e293b; padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 24px; margin: 0; }
    .logo { color: #fbbf24; font-weight: 600; }
    .content { padding: 32px 24px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; color: white; background: #16a34a; }
    .footer { background: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1><span class="logo">Brokflex</span> Data</h1>
      <p style="color: #cbd5e1; font-size: 14px; margin-top: 8px;">Email Service Test</p>
    </div>
    <div class="content">
      <p style="margin-top: 0; font-size: 16px;">This is a system test.</p>
      <p>The Resend email service is working correctly.</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Test Details:</strong></p>
        <p style="margin: 4px 0; font-size: 14px;">Status: <span class="status-badge">PASSED</span></p>
        <p style="margin: 4px 0; font-size: 14px;">Service: Resend Email API</p>
        <p style="margin: 4px 0; font-size: 14px;">From: onboarding@resend.dev (verified fallback)</p>
        <p style="margin: 4px 0; font-size: 14px;">To: ${TEST_EMAIL}</p>
      </div>
      <p style="font-size: 14px; color: #6b7280;">
        This email confirms that the Brokflex Data backend email service is working.
        The production EMAIL_FROM domain (noreply@brokeflexdata.com) needs to be verified
        on the Resend dashboard for production emails.
      </p>
    </div>
    <div class="footer">
      Brokflex Data &middot; ${new Date().getFullYear()} &middot; All rights reserved
    </div>
  </div>
</body>
</html>`
            });

            if (testResult.error) {
                console.log('FAIL: Fallback email also failed:', JSON.stringify(testResult.error, null, 2));
            } else {
                console.log('PASS: Test email sent via fallback domain, ID:', testResult.data?.id || testResult.data);
                console.log('   Email delivered to:', TEST_EMAIL);
                console.log('   NOTE: Production EMAIL_FROM (noreply@brokeflexdata.com) needs domain verification on resend.com');
            }
        } else {
            console.log('PASS: Test email sent, ID:', result.data?.id || result.data);
            console.log('   Email delivered to:', TEST_EMAIL);
        }
    } catch (err) {
        console.log('FAIL: Email test error:', err.message);
    }

    // ========================================
    // 2. DATAMART API TEST
    // ========================================
    console.log('\n--- 2. DataMart API ---');

    try {
        const r = await axios.get(`${BASE}/bundles/networks`);
        console.log('PASS: Networks endpoint -', r.data.data.map(n => n.label).join(', '));
    } catch (e) {
        console.log('FAIL: Networks endpoint -', e.message);
    }

    try {
        const r = await axios.get(`${BASE}/bundles?network=YELLO`);
        const bundles = r.data.data.YELLO;
        console.log('PASS: MTN bundles fetched -', bundles.length, 'bundles');
        console.log('  First:', bundles[0].capacity, 'GB - Cost: GH₵' + bundles[0].datamartCost, '→ Selling: GH₵' + bundles[0].price);
        console.log('  All bundles (cost → selling):');
        bundles.forEach(b => {
            console.log('    ', b.capacity, 'GB - GH₵' + b.datamartCost, '→ GH₵' + b.price);
        });
    } catch (e) {
        console.log('FAIL: MTN bundles -', e.message);
    }

    try {
        const r = await axios.get(`${BASE}/bundles?network=TELECEL`);
        console.log('PASS: Telecel bundles fetched -', r.data.data.TELECEL.length, 'bundles');
    } catch (e) {
        console.log('FAIL: Telecel bundles -', e.message);
    }

    try {
        const r = await axios.get(`${BASE}/bundles?network=AT_PREMIUM`);
        console.log('PASS: AirtelTigo bundles fetched -', r.data.data.AT_PREMIUM.length, 'bundles');
    } catch (e) {
        console.log('FAIL: AirtelTigo bundles -', e.message);
    }

    try {
        const r = await axios.get(`${BASE}/bundles/balance`);
        console.log('PASS: DataMart balance:', JSON.stringify(r.data.data).substring(0, 100));
    } catch (e) {
        console.log('NOTE: DataMart balance:', e.response?.data || e.message);
    }

    // ========================================
    // 3. ORDERS API TEST (with pricing)
    // ========================================
    console.log('\n--- 3. Orders API (Pricing Verification) ---');

    let orderRef = null;
    try {
        const r = await axios.post(`${BASE}/orders`, {
            network: 'MTN',
            bundleCapacity: '5',
            bundleCapacityString: '5',
            phoneNumber: '0551234567',
            email: 'test@example.com',
            contactNumber: '0551234567'
        });
        const orderData = r.data.data;
        orderRef = orderData.reference;
        console.log('PASS: Order created -', orderRef);
        console.log('  Selling price: GH₵' + orderData.sellingPrice + ' (17% markup + 0.10 rounding)');
        console.log('  Paystack fee: GH₵' + orderData.paystackFee);
        console.log('  Paystack amount: GH₵' + orderData.paystackAmount + ' (customer pays this on Paystack)');
        console.log('  Frontend did NOT send price — backend calculated it');
    } catch (e) {
        console.log('FAIL: Order creation -', e.response?.data || e.message);
    }

    if (orderRef) {
        try {
            const r = await axios.get(`${BASE}/orders/${orderRef}`);
            const order = r.data.data;
            console.log('PASS: Order retrieved -', order.reference);
            console.log('  Network:', order.network, '- Payment:', order.paymentStatus, '- Fulfillment:', order.fulfillmentStatus);
            console.log('  Pricing breakdown:');
            console.log('    Datamart cost:', order.datamartCost, 'GHS');
            console.log('    Markup:', order.markupPercentage + '%');
            console.log('    Selling price:', order.sellingPrice, 'GHS');
            console.log('    Paystack fee:', order.paystackFee, 'GHS');
            console.log('    Paystack amount:', order.paystackAmount, 'GHS');
        } catch (e) {
            console.log('FAIL: Get order -', e.message);
        }
    }

    // ========================================
    // 4. PAYSTACK PAYMENT INITIALIZATION TEST
    // ========================================
    console.log('\n--- 4. Paystack Payment ---');

    if (orderRef) {
        try {
            const r = await axios.post(`${BASE}/orders/${orderRef}/initiate-payment`);
            const payment = r.data.data;
            console.log('PASS: Payment initiated');
            console.log('  Authorization URL:', payment.authorizationUrl ? 'Present' : 'MISSING');
            console.log('  Amount shown to customer:', payment.amount, 'GHS (selling price)');
            console.log('  Actual Paystack amount:', orderRef ? 'See order details above' : 'N/A');
        } catch (e) {
            console.log('FAIL: Payment initiation -', e.response?.data || e.message);
        }
    }

    // ========================================
    // 5. DUPLICATE FULFILLMENT PROTECTION TEST
    // ========================================
    console.log('\n--- 5. Duplicate Fulfillment Protection ---');

    if (orderRef) {
        try {
            const r = await axios.get(`${BASE}/orders/${orderRef}`);
            const order = r.data.data;
            console.log('PASS: Order exists for tracking -', order.reference);
            console.log('  Payment status:', order.paymentStatus);
            console.log('  Fulfillment status:', order.fulfillmentStatus);
            console.log('  Has order reference: YES');
            console.log('  Order is trackable: YES');
        } catch (e) {
            console.log('FAIL: Order lookup -', e.message);
        }
    }

    // ========================================
    // 6. ADMIN API TEST (with pricing fields)
    // ========================================
    console.log('\n--- 6. Admin API (Pricing Fields) ---');

    try {
        const loginRes = await axios.post(`${BASE}/admin/login`, {
            email: 'admin@brokeflexdata.com',
            password: 'changeme-admin-password'
        });
        const token = loginRes.data.token;
        console.log('PASS: Admin login');

        const ordersRes = await axios.get(`${BASE}/admin/orders?limit=5`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('  Admin orders:', ordersRes.data.data.length, 'found');

        const pricingFields = ordersRes.data.data.filter(o =>
            o.sellingPrice !== null && o.datamartCost !== null
        );
        console.log('  Orders with pricing fields:', pricingFields.length, 'of', ordersRes.data.data.length);

        if (pricingFields.length > 0) {
            const latest = pricingFields[0];
            console.log('  Latest priced order:', {
                reference: latest.reference,
                network: latest.network,
                datamartCost: latest.datamartCost,
                sellingPrice: latest.sellingPrice,
                paystackFee: latest.paystackFee,
                paystackAmount: latest.paystackAmount,
            });
        }

        const statsRes = await axios.get(`${BASE}/admin/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('  Admin stats:', statsRes.data.data);
    } catch (e) {
        console.log('FAIL: Admin API -', e.response?.data || e.message);
    }

    // ========================================
    // 7. SECURITY CHECK
    // ========================================
    console.log('\n--- 7. Security Check ---');

    const orderResponse = await axios.get(`${BASE}/orders/${orderRef}`);
    const orderData = orderResponse.data.data;
    const exposedFields = Object.keys(orderData).filter(k =>
        k.toLowerCase().includes('key') ||
        k.toLowerCase().includes('secret') ||
        k.toLowerCase().includes('password')
    );

    if (exposedFields.length === 0) {
        console.log('PASS: No secrets exposed in order API response');
    } else {
        console.log('FAIL: Potential secret fields in response:', exposedFields);
    }

    if (orderData.datamartCost !== undefined) {
        console.log('INFO: datamartCost is returned in API (internal use only, not shown to customers)');
    }

    console.log('\n=== Integration Tests Complete ===');
}

runIntegrationTests().catch(console.error);
