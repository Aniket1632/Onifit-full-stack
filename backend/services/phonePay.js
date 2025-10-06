// services/phonepe.js
import axios from 'axios';
import crypto from 'crypto';

const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const SALT_KEY = process.env.PHONEPE_SALT_KEY;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || '1';
const ENV = process.env.PHONEPE_ENV || 'sandbox';

const ENDPOINT =
  ENV === 'prod'
    ? 'https://api.phonepe.com/apis/pg/v1'   // production base (confirm with PhonePe)
    : 'https://staging-phonepe-merchant.qa.phonepe.com/apis/pg/v1'; // sandbox base (example)"

function buildChecksum(payloadBase64, path) {
  // PhonePe checksum: sha256(payloadBase64 + path + saltkey) hex
  const data = payloadBase64 + path + SALT_KEY;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export async function initiatePaymentPhonePe({ amount, merchantTransactionId, merchantUserId, redirectUrl }) {
  // amount in paise (integer)
  const path = '/pay';
  const payload = {
    merchantId: MERCHANT_ID,
    merchantTransactionId,
    merchantUserId,
    amount: amount, // paise
    redirectUrl,   // server route to receive callback (public)
    callbackUrl: redirectUrl,
    // other optional fields:
    // orderMeta, paymentInstrument, merchantOrderId, etc.
    paymentInstrument: {
      type: 'PAY_PAGE'
    }
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  const checksum = buildChecksum(payloadBase64, '/pg/v1' + path);
  const checksumHeader = `${checksum}###${SALT_INDEX}`;

  const url = `${ENDPOINT}/pay`;

  const body = { request: payloadBase64 };

  const headers = {
    'Content-Type': 'application/json',
    'X-MERCHANT-ID': MERCHANT_ID,
    'X-VERIFY': checksumHeader
  };

  const res = await axios.post(url, body, { headers, timeout: 15000 });
  return res.data; // inspect and return upstream
}
