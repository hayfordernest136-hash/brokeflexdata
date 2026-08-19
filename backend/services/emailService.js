const { Resend } = require('resend');
const { API_KEY, EMAIL_FROM, ADMIN_EMAIL } = require('../config/resend');
const { logError, logInfo } = require('../utils/logger');
const { run } = require('../db/init');

const resend = API_KEY ? new Resend(API_KEY) : null;

const SITE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const CHECK_ORDER_URL = `${SITE_URL}/check`;

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

/* ==================== SHARED EMAIL LAYOUT ==================== */

function buildBaseEmail(to, subject, title, subtitle, bodyContent, footerContent) {
    return {
        from: EMAIL_FROM,
        to,
        subject,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #f9fafb; margin: 0; padding: 20px; color: #111827; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; }
    .logo { display: flex; align-items: center; justify-content: center; gap: 8px; }
    .logo-text { color: #fbbf24; font-weight: 700; font-size: 24px; }
    .logo-subtext { color: #f1f5f9; font-size: 16px; }
    .title { color: #ffffff; font-size: 20px; font-weight: 600; margin: 0; }
    .subtitle { color: #cbd5e1; font-size: 14px; margin: 4px 0 0; }
    .content { padding: 32px 24px; }
    .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #6b7280; font-size: 14px; }
    .value { font-weight: 500; font-size: 14px; color: #111827; }
    .total-row { font-size: 18px; font-weight: 600; }
    .total-row .value { color: #0f172a; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; color: #ffffff; }
    .highlight { background: #fffbeb; padding: 16px 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 16px 0; }
    .highlight p { margin: 0; font-size: 14px; color: #92400e; }
    .btn { display: inline-block; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
    .btn-primary { background: #fbbf24; color: #1e293b; }
    .footer { background: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
    .footer a { color: #6b7280; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <span class="logo-text">Brokeflex</span>
        <span class="logo-subtext">Data</span>
      </div>
      <h1 class="title">${title}</h1>
      <p class="subtitle">${subtitle}</p>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>Brokeflex Data &middot; ${new Date().getFullYear()} &middot; All rights reserved</p>
      <p style="margin-top: 8px;">Help: <a href="mailto:support@brokeflexdata.com">support@brokeflexdata.com</a></p>
    </div>
  </div>
</body>
</html>`
    };
}

function buildDetailRow(label, value) {
    return `<div class="detail-row"><span class="label">${label}</span><span class="value">${value}</span></div>`;
}

function buildStatusBadge(status, color) {
    return `<span class="status-badge" style="background: ${color};">${status}</span>`;
}

/* ==================== CUSTOMER EMAILS ==================== */

function buildOrderConfirmationEmail(order) {
    const bundleLabel = `${order.bundle_capacity_string}GB`;
    const formattedAmount = formatGhanaCedis(order.amount);
    const dateTime = formatDateTime(order.created_at);
    const reference = order.reference;

    const body = `
  <p style="margin-top: 0; font-size: 16px; color: #111827;">Hello ${order.email ? order.email : ''},</p>
  <p style="font-size: 16px; color: #374151;">Thank you for your order. Your details have been received and we are processing your request.</p>

  <div class="highlight">
    <p><strong>Order Reference:</strong> ${reference}</p>
    <p style="margin-top: 4px; font-size: 14px; color: #92400e;">Save this reference to track your order.</p>
  </div>

  ${buildDetailRow('Network', order.network)}
  ${buildDetailRow('Data Bundle', `${bundleLabel}`)}
  ${buildDetailRow('Recipient Number', order.phone_number)}
  ${buildDetailRow('Amount Paid', formattedAmount)}
  ${buildDetailRow('Order Date', dateTime)}

  <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
    <div class="detail-row">
      <span class="label">Total Amount</span>
      <span class="value total-row">${formattedAmount}</span>
    </div>
  </div>

  <p style="margin-top: 24px; font-size: 14px; color: #4b5563;">
    Your payment is being processed via Paystack. Once payment is confirmed, your data bundle will be delivered to ${order.phone_number}. You can track your order status anytime using your order reference.
  </p>

  <div style="text-align: center; margin-top: 24px;">
    <a href="${CHECK_ORDER_URL}" class="btn btn-primary">Track Your Order</a>
  </div>
`;

    return buildBaseEmail(
        order.email,
        `Order Confirmation - ${order.reference}`,
        'Order Confirmation',
        'Your order has been placed successfully',
        body
    );
}

function buildPaymentSuccessEmail(order) {
    const bundleLabel = `${order.bundle_capacity_string}GB`;
    const formattedAmount = formatGhanaCedis(order.amount);
    const dateTime = formatDateTime(order.updated_at || order.created_at);
    const reference = order.reference;

    const body = `
  <p style="margin-top: 0; font-size: 16px; color: #111827;">Hello,</p>
  <p style="font-size: 16px; color: #374151;">Your payment has been confirmed and your order is being processed.</p>

  <div class="highlight">
    <p><strong>Order Reference:</strong> ${reference}</p>
    <p style="margin-top: 4px; font-size: 14px; color: #92400e;">Payment status: Successful</p>
  </div>

  ${buildDetailRow('Network', order.network)}
  ${buildDetailRow('Data Bundle', bundleLabel)}
  ${buildDetailRow('Recipient Number', order.phone_number)}
  ${buildDetailRow('Amount Paid', formattedAmount)}
  ${buildDetailRow('Payment Date', dateTime)}

  <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
    <div class="detail-row">
      <span class="label">Delivery Status</span>
      <span class="value">
        ${order.fulfillment_status === 'delivered'
            ? buildStatusBadge('Delivered', '#16a34a')
            : buildStatusBadge('Processing', '#d97706')}
      </span>
    </div>
  </div>

  <p style="margin-top: 24px; font-size: 14px; color: #4b5563;">
    ${order.fulfillment_status === 'delivered'
        ? 'Your data bundle has been successfully delivered. If you do not see it on your device, please allow a few more minutes and then restart your phone.'
        : 'Your data bundle is being processed. Data is usually delivered within a few moments. You will receive another email when delivery is complete.'}
  </p>

  <div style="text-align: center; margin-top: 24px;">
    <a href="${CHECK_ORDER_URL}" class="btn btn-primary">Track Your Order</a>
  </div>
`;

    return buildBaseEmail(
        order.email,
        `Payment Confirmed - ${order.reference}`,
        'Payment Successful',
        'Your order has been confirmed',
        body
    );
}

function buildPaymentFailedEmail(order) {
    const formattedAmount = formatGhanaCedis(order.amount);
    const dateTime = formatDateTime(order.updated_at || order.created_at);
    const reference = order.reference;

    const body = `
  <p style="margin-top: 0; font-size: 16px; color: #111827;">Hello,</p>
  <p style="font-size: 16px; color: #374151;">We were unable to confirm your payment for this order.</p>

  <div class="highlight" style="background: #fef2f2; border-left-color: #ef4444;">
    <p><strong>Order Reference:</strong> ${reference}</p>
    <p style="margin-top: 4px; font-size: 14px; color: #991818;">Payment status: Not completed</p>
  </div>

  ${buildDetailRow('Network', order.network)}
  ${buildDetailRow('Data Bundle', `${order.bundle_capacity_string}GB`)}
  ${buildDetailRow('Recipient Number', order.phone_number)}
  ${buildDetailRow('Amount', formattedAmount)}
  ${buildDetailRow('Date', dateTime)}

  <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
    <div class="detail-row">
      <span class="label">Payment Status</span>
      <span class="value">${buildStatusBadge('Failed', '#dc2626')}</span>
    </div>
  </div>

  <p style="margin-top: 24px; font-size: 14px; color: #4b5563;">
    No charges were made to your payment method. You can try again by placing a new order at the Brokeflex Data website.
  </p>

  <p style="margin-top: 8px; font-size: 14px; color: #4b5563;">
    If you believe this is an error, please contact support with your order reference <strong>${reference}</strong>.
  </p>

  <div style="text-align: center; margin-top: 24px;">
    <a href="${SITE_URL}/buy" class="btn btn-primary">Buy Data Again</a>
  </div>
`;

    return buildBaseEmail(
        order.email,
        `Payment Unsuccessful - ${order.reference}`,
        'Payment Issue',
        'Your payment could not be processed',
        body
    );
}

function buildDeliveryCompleteEmail(order) {
    const bundleLabel = `${order.bundle_capacity_string}GB`;
    const formattedAmount = formatGhanaCedis(order.amount);
    const dateTime = formatDateTime(order.updated_at || order.created_at);
    const reference = order.reference;

    const body = `
  <p style="margin-top: 0; font-size: 16px; color: #111827;">Hello,</p>
  <p style="font-size: 16px; color: #374151;">Great news! Your data bundle has been successfully delivered.</p>

  <div class="highlight" style="background: #dcfce8; border-left-color: #16a34a;">
    <p><strong>Order Reference:</strong> ${reference}</p>
    <p style="margin-top: 4px; font-size: 14px; color: #14532d;">Delivery status: Complete</p>
  </div>

  ${buildDetailRow('Network', order.network)}
  ${buildDetailRow('Data Bundle', bundleLabel)}
  ${buildDetailRow('Delivered To', order.phone_number)}
  ${buildDetailRow('Amount Paid', formattedAmount)}
  ${buildDetailRow('Delivered On', dateTime)}

  <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
    <div class="detail-row">
      <span class="label">Delivery Status</span>
      <span class="value">${buildStatusBadge('Delivered', '#16a34a')}</span>
    </div>
  </div>

  <p style="margin-top: 24px; font-size: 14px; color: #4b5563;">
    The data should now be available on the recipient's device. If you do not see it, please allow a few minutes and then restart the phone.
  </p>

  <div style="text-align: center; margin-top: 24px;">
    <a href="${SITE_URL}" class="btn btn-primary">Buy Again</a>
  </div>
`;

    return buildBaseEmail(
        order.email,
        `Delivery Complete - ${order.reference}`,
        'Data Delivered',
        'Your order has been completed successfully',
        body
    );
}

function buildStatusUpdateEmail(order) {
    const formattedAmount = formatGhanaCedis(order.amount);
    const dateTime = formatDateTime(order.updated_at || order.created_at);
    const reference = order.reference;

    let statusText = '';
    let highlightBg = '#fffbeb';
    let highlightBorder = '#f59e0b';

    if (order.fulfillment_status === 'delivered') {
        statusText = 'Your data bundle has been delivered successfully.';
        highlightBg = '#dcfce8';
        highlightBorder = '#16a34a';
    } else if (order.fulfillment_status === 'failed') {
        statusText = 'There was an issue delivering your data bundle.';
        highlightBg = '#fef2f2';
        highlightBorder = '#ef4444';
    } else {
        statusText = 'Your order is being processed.';
    }

    const body = `
  <p style="margin-top: 0; font-size: 16px; color: #111827;">Hello,</p>
  <p style="font-size: 16px; color: #374151;">${statusText}</p>

  <div class="highlight" style="background: ${highlightBg}; border-left-color: ${highlightBorder};">
    <p><strong>Order Reference:</strong> ${reference}</p>
    <p style="margin-top: 4px; font-size: 14px;">${order.payment_status === 'successful' ? 'Payment: Successful' : 'Payment: ' + order.payment_status}</p>
  </div>

  ${buildDetailRow('Network', order.network)}
  ${buildDetailRow('Data Bundle', `${order.bundle_capacity_string}GB`)}
  ${buildDetailRow('Recipient Number', order.phone_number)}
  ${buildDetailRow('Amount Paid', formattedAmount)}
  ${buildDetailRow('Last Updated', dateTime)}

  <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
    <div class="detail-row">
      <span class="label">Payment Status</span>
      <span class="value">${buildStatusBadge(order.payment_status === 'successful' ? 'Paid' : order.payment_status, order.payment_status === 'successful' ? '#16a34a' : '#dc2626')}</span>
    </div>
    ${buildDetailRow('Delivery Status', order.fulfillment_status === 'delivered' ? 'Delivered' : order.fulfillment_status === 'failed' ? 'Failed' : 'Processing')}
  </div>

  <p style="margin-top: 24px; font-size: 14px; color: #4b5563;">
    You can check your order status anytime at the link below.
  </p>

  <div style="text-align: center; margin-top: 24px;">
    <a href="${CHECK_ORDER_URL}" class="btn btn-primary">Track Your Order</a>
  </div>
`;

    return buildBaseEmail(
        order.email,
        `Order Update - ${order.reference}`,
        'Order Status Update',
        statusText,
        body
    );
}

/* ==================== ADMIN EMAILS ==================== */

function buildAdminNotificationEmail(order, event) {
    const formattedAmount = formatGhanaCedis(order.amount);
    const eventLabel = event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const body = `
  <p style="margin-top: 0; font-size: 16px; color: #111827;">Hello Admin,</p>
  <p style="font-size: 16px; color: #374151;">An event has occurred for an order.</p>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p><strong>Event:</strong> ${eventLabel}</p>
    <p style="margin-top: 4px; font-size: 14px; color: #64748b;"><strong>Time:</strong> ${formatDateTime(new Date().toISOString())}</p>
  </div>

  ${buildDetailRow('Order Reference', order.reference)}
  ${buildDetailRow('Network', order.network)}
  ${buildDetailRow('Network Code', order.network_code || 'N/A')}
  ${buildDetailRow('Data Bundle', `${order.bundle_capacity_string}GB`)}
  ${buildDetailRow('Recipient Number', order.phone_number)}
  ${buildDetailRow('Customer Email', order.email)}
  ${buildDetailRow('Amount', formattedAmount)}
  ${buildDetailRow('Payment Status', order.payment_status)}
  ${buildDetailRow('Fulfillment Status', order.fulfillment_status)}
  ${buildDetailRow('Provider Reference', order.datamart_order_reference || 'N/A')}
  ${buildDetailRow('Provider Purchase ID', order.datamart_purchase_id || 'N/A')}
  ${buildDetailRow('Created', formatDateTime(order.created_at))}
  ${buildDetailRow('Updated', formatDateTime(order.updated_at))}

  ${order.datamart_response ? `
  <div style="margin-top: 16px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
    <p style="font-size: 12px; color: #64748b; margin-bottom: 4px;"><strong>Provider Response:</strong></p>
    <pre style="font-size: 11px; white-space: pre-wrap; word-wrap: break-word; color: #334155;">${JSON.stringify(order.datamart_response, null, 2)}</pre>
  </div>
  ` : ''}
`;

    return buildBaseEmail(
        ADMIN_EMAIL,
        `Admin Alert: ${eventLabel} - ${order.reference}`,
        'Admin Alert',
        `Order ${eventLabel}`,
        body
    );
}

/* ==================== SEND FUNCTIONS ==================== */

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

async function sendPaymentSuccess(order) {
    if (!resend) {
        logInfo('Resend not configured. Skipping email.');
        return { skipped: true };
    }

    try {
        const email = buildPaymentSuccessEmail(order);
        const result = await resend.emails.send(email);

        if (result.error) {
            logError(`Failed to send payment success email: ${JSON.stringify(result.error)}`);
            await logEmailEvent(order.reference, order.email, 'payment_success', 'failed', null, JSON.stringify(result.error));
            return { error: result.error };
        }

        logInfo(`Payment success email sent to ${maskEmail(order.email)} for order ${order.reference}`);
        await logEmailEvent(order.reference, order.email, 'payment_success', 'sent', result.data?.id);
        return result;
    } catch (err) {
        logError(`Failed to send payment success email: ${err.message}`);
        await logEmailEvent(order.reference, order.email, 'payment_success', 'failed', null, err.message);
        return { error: err.message };
    }
}

async function sendPaymentFailed(order) {
    if (!resend) {
        logInfo('Resend not configured. Skipping email.');
        return { skipped: true };
    }

    try {
        const email = buildPaymentFailedEmail(order);
        const result = await resend.emails.send(email);

        if (result.error) {
            logError(`Failed to send payment failed email: ${JSON.stringify(result.error)}`);
            await logEmailEvent(order.reference, order.email, 'payment_failed', 'failed', null, JSON.stringify(result.error));
            return { error: result.error };
        }

        logInfo(`Payment failed email sent to ${maskEmail(order.email)} for order ${order.reference}`);
        await logEmailEvent(order.reference, order.email, 'payment_failed', 'sent', result.data?.id);
        return result;
    } catch (err) {
        logError(`Failed to send payment failed email: ${err.message}`);
        await logEmailEvent(order.reference, order.email, 'payment_failed', 'failed', null, err.message);
        return { error: err.message };
    }
}

async function sendDeliveryComplete(order) {
    if (!resend) {
        logInfo('Resend not configured. Skipping email.');
        return { skipped: true };
    }

    try {
        const email = buildDeliveryCompleteEmail(order);
        const result = await resend.emails.send(email);

        if (result.error) {
            logError(`Failed to send delivery complete email: ${JSON.stringify(result.error)}`);
            await logEmailEvent(order.reference, order.email, 'delivery_complete', 'failed', null, JSON.stringify(result.error));
            return { error: result.error };
        }

        logInfo(`Delivery complete email sent to ${maskEmail(order.email)} for order ${order.reference}`);
        await logEmailEvent(order.reference, order.email, 'delivery_complete', 'sent', result.data?.id);
        return result;
    } catch (err) {
        logError(`Failed to send delivery complete email: ${err.message}`);
        await logEmailEvent(order.reference, order.email, 'delivery_complete', 'failed', null, err.message);
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

/* ==================== CHECKER EMAILS ==================== */

function buildCheckerResultEmail(order) {
    const formattedAmount = formatGhanaCedis(order.amount);
    const dateTime = formatDateTime(order.created_at);
    const reference = order.reference;
    const checkerTypeLabel = order.checker_type === 'WAEC' ? 'WAEC' : order.checker_type === 'BECE' ? 'BECE' : order.checker_type;

    const body = `
  <p style="margin-top: 0; font-size: 16px; color: #111827;">Hello,</p>
  <p style="font-size: 16px; color: #374151;">Congratulations! Your result checker has been successfully purchased and is ready for use.</p>

  <div class="highlight" style="background: #dcfce8; border-left-color: #16a34a;">
    <p><strong>Order Reference:</strong> ${reference}</p>
    <p style="margin-top: 4px; font-size: 14px; color: #14532d;">Status: Successfully Fulfilled</p>
  </div>

  ${buildDetailRow('Result Checker Type', checkerTypeLabel)}
  ${buildDetailRow('Serial Number', `<span style="font-family: monospace; font-weight: bold; letter-spacing: 1px;">${order.serial_number || '—'}</span>`)}
  ${buildDetailRow('PIN', `<span style="font-family: monospace; font-weight: bold; letter-spacing: 1px;">${order.pin || '—'}</span>`)}
  ${buildDetailRow('Delivery Number', order.phone_number)}
  ${buildDetailRow('Amount Paid', formattedAmount)}
  ${buildDetailRow('Purchase Date', dateTime)}

  <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 16px;">
    <div class="detail-row">
      <span class="label">Payment Status</span>
      <span class="value">${buildStatusBadge('Paid', '#16a34a')}</span>
    </div>
    <div class="detail-row">
      <span class="label">Fulfillment Status</span>
      <span class="value">${buildStatusBadge('Completed', '#16a34a')}</span>
    </div>
  </div>

  <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-top: 20px;">
    <p style="font-size: 14px; color: #92400e; margin: 0 0 8px 0;">
      <strong>How to use your result checker:</strong>
    </p>
    <ul style="font-size: 13px; color: #92400e; margin: 0; padding-left: 20px; line-height: 1.6;">
      <li>Keep your serial number and PIN safe and confidential.</li>
      <li>Use them on the official WAEC/BECE result checker portal.</li>
      <li>Do not share these credentials with anyone.</li>
    </ul>
  </div>

  <div style="text-align: center; margin-top: 24px;">
    <a href="${CHECK_ORDER_URL}" class="btn btn-primary">Track Your Order</a>
  </div>
`;

    return buildBaseEmail(
        order.email,
        `Result Checker Purchased - ${order.reference}`,
        'Result Checker Purchased',
        'Your result checker has been successfully purchased',
        body
    );
}

function buildCheckerAdminNotification(order, event) {
    const formattedAmount = formatGhanaCedis(order.amount);
    const eventLabel = event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const checkerTypeLabel = order.checker_type === 'WAEC' ? 'WAEC' : order.checker_type === 'BECE' ? 'BECE' : order.checker_type;

    const body = `
  <p style="margin-top: 0; font-size: 16px; color: #111827;">Hello Admin,</p>
  <p style="font-size: 16px; color: #374151;">A result checker event has occurred.</p>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <p><strong>Event:</strong> ${eventLabel}</p>
    <p style="margin-top: 4px; font-size: 14px; color: #64748b;"><strong>Time:</strong> ${formatDateTime(new Date().toISOString())}</p>
  </div>

  ${buildDetailRow('Order Reference', order.reference)}
  ${buildDetailRow('Checker Type', checkerTypeLabel)}
  ${buildDetailRow('Customer Email', order.email)}
  ${buildDetailRow('Phone Number', order.phone_number)}
  ${buildDetailRow('Amount', formattedAmount)}
  ${buildDetailRow('Payment Status', order.payment_status)}
  ${buildDetailRow('Fulfillment Status', order.fulfillment_status)}
  ${order.datamart_reference ? buildDetailRow('DataMart Reference', order.datamart_reference) : ''}
  ${order.datamart_purchase_id ? buildDetailRow('DataMart Purchase ID', order.datamart_purchase_id) : ''}
  ${order.serial_number ? buildDetailRow('Serial Number', order.serial_number) : ''}
  ${order.pin ? buildDetailRow('PIN', order.pin) : ''}
  ${buildDetailRow('Created', formatDateTime(order.created_at))}
  ${buildDetailRow('Updated', formatDateTime(order.updated_at))}
`;

    return buildBaseEmail(
        ADMIN_EMAIL,
        `Admin Alert: ${eventLabel} - ${order.reference}`,
        'Admin Alert',
        `Checker Order ${eventLabel}`,
        body
    );
}

async function sendCheckerResultEmail(order) {
    if (!resend) {
        logInfo('Resend not configured. Skipping checker result email.');
        return { skipped: true };
    }

    try {
        const email = buildCheckerResultEmail(order);
        const result = await resend.emails.send(email);

        if (result.error) {
            logError(`Failed to send checker result email: ${JSON.stringify(result.error)}`);
            await logEmailEvent(order.reference, order.email, 'checker_result', 'failed', null, JSON.stringify(result.error));
            return { error: result.error };
        }

        logInfo(`Checker result email sent to ${maskEmail(order.email)} for order ${order.reference}`);
        await logEmailEvent(order.reference, order.email, 'checker_result', 'sent', result.data?.id);
        return result;
    } catch (err) {
        logError(`Failed to send checker result email: ${err.message}`);
        await logEmailEvent(order.reference, order.email, 'checker_result', 'failed', null, err.message);
        return { error: err.message };
    }
}

async function sendCheckerAdminNotification(order, event) {
    if (!resend) {
        logInfo('Resend not configured. Skipping checker admin notification.');
        return { skipped: true };
    }

    try {
        const email = buildCheckerAdminNotification(order, event);
        const result = await resend.emails.send(email);

        if (result.error) {
            logError(`Failed to send checker admin notification: ${JSON.stringify(result.error)}`);
            await logEmailEvent(order.reference, ADMIN_EMAIL, `checker_admin_${event}`, 'failed', null, JSON.stringify(result.error));
            return { error: result.error };
        }

        logInfo(`Checker admin notification sent for order ${order.reference} event: ${event}`);
        await logEmailEvent(order.reference, ADMIN_EMAIL, `checker_admin_${event}`, 'sent', result.data?.id);
        return result;
    } catch (err) {
        logError(`Failed to send checker admin notification: ${err.message}`);
        await logEmailEvent(order.reference, ADMIN_EMAIL, `checker_admin_${event}`, 'failed', null, err.message);
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
    sendPaymentSuccess,
    sendPaymentFailed,
    sendDeliveryComplete,
    sendStatusUpdate,
    sendAdminNotification,
    sendCheckerResultEmail,
    sendCheckerAdminNotification,
    buildOrderConfirmationEmail,
    buildPaymentSuccessEmail,
    buildPaymentFailedEmail,
    buildDeliveryCompleteEmail,
    buildStatusUpdateEmail,
    buildAdminNotificationEmail,
    buildCheckerResultEmail,
    buildCheckerAdminNotification,
    sendTestEmail,
    formatGhanaCedis,
    formatDateTime
};
