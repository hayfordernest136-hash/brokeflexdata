const { Resend } = require('resend');
const { API_KEY, EMAIL_FROM, ADMIN_EMAIL } = require('../config/resend');
const { logError, logInfo } = require('../utils/logger');
const { run } = require('../db/init');

const resend = API_KEY ? new Resend(API_KEY) : null;

async function logEmailEvent(orderReference, recipientEmail, emailType, status, resendId, error) {
    try {
        await run(
            `INSERT INTO email_events (order_reference, recipient_email, email_type, status, resend_id, error) VALUES (?, ?, ?, ?, ?, ?)`,
            [orderReference || null, recipientEmail, emailType, status, resendId || null, error || null]
        );
    } catch (err) {
        logError(`Failed to log email event: ${err.message}`);
    }
}

function formatGhanaCedis(amount) {
    return `₵${parseFloat(amount).toFixed(2)}`;
}

function maskEmail(email) {
    if (!email) return '—';
    const [local, domain] = email.split('@');
    if (!domain) return email;
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local.slice(0, 2)}***@${domain}`;
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-GH', {
        timeZone: 'Africa/Accra',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function buildOrderConfirmationEmail(order) {
    const networkLabel = order.network;
    const bundleLabel = `${order.bundle_capacity_string}GB`;
    const formattedAmount = formatGhanaCedis(order.amount);
    const paymentStatus = order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1);
    const fulfillmentStatus = order.fulfillment_status.charAt(0).toUpperCase() + order.fulfillment_status.slice(1);
    const dateTime = formatDateTime(order.created_at);

    const paymentStatusColor = order.payment_status === 'successful' ? '#16a34a' : '#dc2626';
    const fulfillmentStatusColor = order.fulfillment_status === 'delivered' ? '#16a34a' :
        order.fulfillment_status === 'failed' ? '#dc2626' : '#d97706';

    return {
        from: EMAIL_FROM,
        to: order.email,
        subject: `Order Confirmation - ${order.reference}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - ${order.reference}</title>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f9fafb; margin: 0; padding: 20px; color: #111827; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: #1e293b; padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 24px; margin: 0; }
    .logo { color: #fbbf24; font-weight: 600; }
    .content { padding: 32px 24px; }
    .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .label { color: #6b7280; font-size: 14px; }
    .value { font-weight: 500; font-size: 14px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; color: white; }
    .total-row { font-size: 18px; font-weight: 600; margin-top: 8px; }
    .footer { background: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
        <h1><span class="logo">Brokeflex</span> Data</h1>
        <p style="color: #cbd5e1; font-size: 14px; margin: 8px 0 0; margin-top: 8px;">Order Confirmation</p>
    </div>
    <div class="content">
      <p style="margin-top: 0; font-size: 16px;">Thank you for your order!</p>
      <p>${order.reference}</p>

      <div class="detail-row">
        <span class="label">Network</span>
        <span class="value">${networkLabel}</span>
      </div>
      <div class="detail-row">
        <span class="label">Data Bundle</span>
        <span class="value">${bundleLabel}</span>
      </div>
      <div class="detail-row">
        <span class="label">Recipient Number</span>
        <span class="value">${order.phone_number}</span>
      </div>
      <div class="detail-row">
        <span class="label">Customer Email</span>
        <span class="value">${order.email}</span>
      </div>
      <div class="detail-row">
        <span class="label">Amount</span>
        <span class="value">${formattedAmount}</span>
      </div>
      <div class="detail-row">
        <span class="label">Payment Status</span>
        <span class="value"><span class="status-badge" style="background:${paymentStatusColor}">${paymentStatus}</span></span>
      </div>
      <div class="detail-row">
        <span class="label">Delivery Status</span>
        <span class="value"><span class="status-badge" style="background:${fulfillmentStatusColor}">${fulfillmentStatus}</span></span>
      </div>
      <div class="detail-row">
        <span class="label">Date</span>
        <span class="value">${dateTime}</span>
      </div>
      ${order.datamart_order_reference ? `
      <div class="detail-row">
        <span class="label">Provider Reference</span>
        <span class="value">${order.datamart_order_reference}</span>
      </div>
      ` : ''}

      <div class="detail-row total-row">
        <span>Total</span>
        <span>${formattedAmount}</span>
      </div>

      <p style="margin-top: 24px; font-size: 14px; color: #4b5563;">
        You can check your order status anytime at <a href="https://brokeflexdata.com/check-order" style="color: #fbbf24;">brokeflexdata.com/check-order</a>
        using your order reference <strong>${order.reference}</strong>.
      </p>
    </div>
    <div class="footer">
      Brokeflex Data &middot; ${new Date().getFullYear()} &middot; All rights reserved
    </div>
  </div>
</body>
</html>`
    };
}

function buildStatusUpdateEmail(order) {
    const formattedAmount = formatGhanaCedis(order.amount);
    const paymentStatus = order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1);
    const fulfillmentStatus = order.fulfillment_status.charAt(0).toUpperCase() + order.fulfillment_status.slice(1);
    const dateTime = formatDateTime(order.updated_at || order.created_at);

    return {
        from: EMAIL_FROM,
        to: order.email,
        subject: `Order Update - ${order.reference}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Update - ${order.reference}</title>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f9fafb; margin: 0; padding: 20px; color: #111827; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: #1e293b; padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 24px; margin: 0; }
    .logo { color: #fbbf24; font-weight: 600; }
    .content { padding: 32px 24px; }
    .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .label { color: #6b7280; font-size: 14px; }
    .value { font-weight: 500; font-size: 14px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; color: white; }
    .footer { background: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
        <h1><span class="logo">Brokeflex</span> Data</h1>
        <p style="color: #cbd5e1; font-size: 14px; margin-top: 8px;">Order Status Update</p>
    </div>
    <div class="content">
      <p style="margin-top: 0;">Hello,</p>
      <p>Your order <strong>${order.reference}</strong> has been updated.</p>

      <div class="detail-row">
        <span class="label">Network</span>
        <span class="value">${order.network}</span>
      </div>
      <div class="detail-row">
        <span class="label">Bundle</span>
        <span class="value">${order.bundle_capacity_string}GB (${formattedAmount})</span>
      </div>
      <div class="detail-row">
        <span class="label">Recipient</span>
        <span class="value">${order.phone_number}</span>
      </div>
      <div class="detail-row">
        <span class="label">Payment Status</span>
        <span class="value"><span class="status-badge" style="background:${order.payment_status === 'successful' ? '#16a34a' : '#dc2626'}">${paymentStatus}</span></span>
      </div>
      <div class="detail-row">
        <span class="label">Delivery Status</span>
        <span class="value"><span class="status-badge" style="background:${order.fulfillment_status === 'delivered' ? '#16a34a' : order.fulfillment_status === 'failed' ? '#dc2626' : '#d97706'}">${fulfillmentStatus}</span></span>
      </div>
      <div class="detail-row">
        <span class="label">Last Updated</span>
        <span class="value">${dateTime}</span>
      </div>
    </div>
    <div class="footer">
      Brokeflex Data &middot; ${new Date().getFullYear()} &middot; All rights reserved
    </div>
  </div>
</body>
</html>`
    };
}

function buildAdminNotificationEmail(order, event) {
    const formattedAmount = formatGhanaCedis(order.amount);

    return {
        from: EMAIL_FROM,
        to: ADMIN_EMAIL,
        subject: `Admin Alert: Order ${event} - ${order.reference}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Admin Alert</title></head>
<body style="font-family: 'Inter', sans-serif; background: #f9fafb; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 24px;">
    <h2 style="color: #1e293b;">Admin Alert: Order ${event}</h2>
    <p><strong>Reference:</strong> ${order.reference}</p>
    <p><strong>Network:</strong> ${order.network} (${order.network_code})</p>
    <p><strong>Bundle:</strong> ${order.bundle_capacity_string}GB - ${formattedAmount}</p>
    <p><strong>Phone:</strong> ${order.phone_number}</p>
    <p><strong>Email:</strong> ${order.email}</p>
    <p><strong>Payment Status:</strong> ${order.payment_status}</p>
    <p><strong>Fulfillment Status:</strong> ${order.fulfillment_status}</p>
    <p><strong>DataMart Purchase ID:</strong> ${order.datamart_purchase_id || 'N/A'}</p>
    <p><strong>DataMart Order Reference:</strong> ${order.datamart_order_reference || 'N/A'}</p>
    <p><strong>Created:</strong> ${order.created_at}</p>
    <p><strong>Updated:</strong> ${order.updated_at}</p>
    ${order.datamart_response ? `<p><strong>DataMart Response:</strong> <pre>${JSON.stringify(order.datamart_response, null, 2)}</pre></p>` : ''}
  </div>
</body>
</html>`
    };
}

async function sendOrderConfirmation(order) {
    if (!resend) {
        logInfo('Resend not configured. Skipping email.');
        return { skipped: true };
    }

    try {
        const email = buildOrderConfirmationEmail(order);
        const result = await resend.emails.send(email);

        if (result.error) {
            logError(`Failed to send confirmation email: ${JSON.stringify(result.error)}`);
            await logEmailEvent(order.reference, order.email, 'order_confirmation', 'failed', null, JSON.stringify(result.error));
            return { error: result.error };
        }

        logInfo(`Order confirmation email sent to ${maskEmail(order.email)} for order ${order.reference}`);
        await logEmailEvent(order.reference, order.email, 'order_confirmation', 'sent', result.data?.id);
        return result;
    } catch (err) {
        logError(`Failed to send confirmation email: ${err.message}`);
        await logEmailEvent(order.reference, order.email, 'order_confirmation', 'failed', null, err.message);
        return { error: err.message };
    }
}

async function sendStatusUpdate(order) {
    if (!resend) {
        logInfo('Resend not configured. Skipping email.');
        return { skipped: true };
    }

    try {
        const email = buildStatusUpdateEmail(order);
        const result = await resend.emails.send(email);

        if (result.error) {
            logError(`Failed to send status update email: ${JSON.stringify(result.error)}`);
            await logEmailEvent(order.reference, order.email, 'status_update', 'failed', null, JSON.stringify(result.error));
            return { error: result.error };
        }

        logInfo(`Status update email sent to ${maskEmail(order.email)} for order ${order.reference}`);
        await logEmailEvent(order.reference, order.email, 'status_update', 'sent', result.data?.id);
        return result;
    } catch (err) {
        logError(`Failed to send status update email: ${err.message}`);
        await logEmailEvent(order.reference, order.email, 'status_update', 'failed', null, err.message);
        return { error: err.message };
    }
}

async function sendAdminNotification(order, event) {
    if (!resend) {
        logInfo('Resend not configured. Skipping admin notification.');
        return { skipped: true };
    }

    try {
        const email = buildAdminNotificationEmail(order, event);
        const result = await resend.emails.send(email);

        if (result.error) {
            logError(`Failed to send admin notification: ${JSON.stringify(result.error)}`);

            const fallbackEmail = { ...email, from: 'onboarding@resend.dev' };
            const fallbackResult = await resend.emails.send(fallbackEmail);

            if (fallbackResult.error) {
                logError(`Fallback admin notification also failed: ${JSON.stringify(fallbackResult.error)}`);
                await logEmailEvent(order.reference, ADMIN_EMAIL, `admin_${event}`, 'failed', null, JSON.stringify(fallbackResult.error));
                return { error: fallbackResult.error };
            }

            logInfo(`Admin notification sent via fallback domain for order ${order.reference} event: ${event}`);
            await logEmailEvent(order.reference, 'onboarding@resend.dev', `admin_${event}`, 'sent', fallbackResult.data?.id);
            return fallbackResult;
        }

        logInfo(`Admin notification email sent for order ${order.reference} event: ${event}`);
        await logEmailEvent(order.reference, ADMIN_EMAIL, `admin_${event}`, 'sent', result.data?.id);
        return result;
    } catch (err) {
        logError(`Failed to send admin notification: ${err.message}`);
        await logEmailEvent(order.reference, ADMIN_EMAIL, `admin_${event}`, 'failed', null, err.message);
        return { error: err.message };
    }
}

async function sendTestEmail(toEmail, subject, htmlContent) {
    if (!resend) {
        return { error: 'Resend is not configured. Set RESEND_API_KEY in your environment.' };
    }

    try {
        const result = await resend.emails.send({
            from: EMAIL_FROM,
            to: toEmail,
            subject,
            html: htmlContent,
        });

        if (result.error) {
            logError(`Test email failed: ${JSON.stringify(result.error)}`);
            await logEmailEvent(null, toEmail, 'test', 'failed', null, JSON.stringify(result.error));
            return { error: result.error.message || 'Failed to send test email.' };
        }

        logInfo(`Test email sent to ${toEmail}`);
        await logEmailEvent(null, toEmail, 'test', 'sent', result.data?.id);
        return { success: true, id: result.data?.id };
    } catch (err) {
        logError(`Test email error: ${err.message}`);
        await logEmailEvent(null, toEmail, 'test', 'failed', null, err.message);
        return { error: err.message };
    }
}

module.exports = {
    sendOrderConfirmation,
    sendStatusUpdate,
    sendAdminNotification,
    buildOrderConfirmationEmail,
    buildStatusUpdateEmail,
    buildAdminNotificationEmail,
    sendTestEmail,
    formatGhanaCedis,
    formatDateTime
};
