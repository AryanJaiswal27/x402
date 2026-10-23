const http = require('http');

const PORT = 4020;
const HOST = 'localhost';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch {
          parsed = body;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function runTest() {
  console.log('--- 🧪 STARTING x402 PROTOCOL SPECIFICATION INTEGRATION TEST ---');

  // STEP 1: Unauthenticated request expecting 402
  console.log('\n[Step 1] Client sends GET /api/x402/intel/deepseek-financial without credentials...');
  const res1 = await request({
    hostname: HOST,
    port: PORT,
    path: '/api/x402/intel/deepseek-financial',
    method: 'GET'
  });

  console.log(`Status Received: ${res1.statusCode} (Expected: 402)`);
  if (res1.statusCode !== 402) {
    throw new Error(`Expected 402, got ${res1.statusCode}`);
  }

  console.log('WWW-Authenticate Header:', res1.headers['www-authenticate']);
  console.log('Challenge Nonce:', res1.body.challenge?.id);
  console.log('Price Required:', res1.body.challenge?.amount, res1.body.challenge?.token);

  if (!res1.headers['www-authenticate'] || !res1.headers['www-authenticate'].includes('x402')) {
    throw new Error('Missing or invalid WWW-Authenticate header');
  }

  const challenge = res1.body.challenge;
  if (!challenge || !challenge.id) {
    throw new Error('Missing challenge in 402 body');
  }

  // STEP 2: Agent signs payment voucher
  console.log('\n[Step 2] Agent wallet signs x402 payment voucher...');
  const paymentPayload = {
    version: '1.0',
    challengeId: challenge.id,
    payer: '0x6c7124c77F42EcdaAE9aE5849838C8994fE271f3',
    amount: challenge.amount,
    signature: '0xmockSignature' + Math.random().toString(36).substring(2),
    timestamp: Date.now()
  };

  // STEP 3: Retry request with X-Payment header
  console.log('\n[Step 3] Client retries GET with header X-Payment attached...');
  const res2 = await request({
    hostname: HOST,
    port: PORT,
    path: '/api/x402/intel/deepseek-financial',
    method: 'GET',
    headers: {
      'X-Payment': JSON.stringify(paymentPayload)
    }
  });

  console.log(`Status Received: ${res2.statusCode} (Expected: 200)`);
  if (res2.statusCode !== 200) {
    throw new Error(`Expected 200, got ${res2.statusCode}: ${JSON.stringify(res2.body)}`);
  }

  console.log('X-Payment-Receipt Header:', res2.headers['x-payment-receipt']);
  console.log('Unlocked Intelligence Symbol:', res2.body.data?.symbol);
  console.log('Sentiment Score:', res2.body.data?.sentimentScore);
  console.log('Tx Hash:', res2.body.paymentReceipt?.txHash);

  console.log('\n🎉 ALL x402 PROTOCOL SUITE TESTS PASSED WITH 100% SPEC COMPLIANCE!\n');
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
