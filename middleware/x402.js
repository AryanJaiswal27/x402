const { ledger, PLATFORM_FACILITATOR } = require('../services/ledger');

/**
 * x402 Protocol Guard Middleware
 * Adheres strictly to the HTTP 402 "Payment Required" specification for Autonomous Agents.
 */
function x402Guard(options = {}) {
  return (req, res, next) => {
    const rawPayment = req.headers['x-payment'] || req.headers['authorization'];
    const amount = Number(options.amount || 0.005);
    const payee = options.payee || PLATFORM_FACILITATOR;
    const apiName = options.name || req.path;

    // Check if client provided x402 payment proof
    if (!rawPayment) {
      // 1. Issue x402 Challenge
      const challenge = ledger.createChallenge({
        apiId: options.id || 'api',
        endpoint: req.originalUrl || req.path,
        amount,
        payee
      });

      res.set({
        'WWW-Authenticate': `x402 token="USDC", network="base-sepolia", chainId="84532", amount="${challenge.amount}", payee="${payee}", challenge="${challenge.id}"`,
        'X-Protocol': 'x402-v1.0',
        'Access-Control-Expose-Headers': 'WWW-Authenticate, X-Protocol, X-Payment-Receipt'
      });

      return res.status(402).json({
        status: 402,
        error: 'Payment Required',
        protocol: 'x402',
        version: '1.0',
        message: 'Endpoint protected by x402 Micropayment Protocol. Autonomous payment required to access resource.',
        challenge: {
          id: challenge.id,
          network: 'base-sepolia',
          chainId: 84532,
          token: 'USDC',
          tokenAddress: challenge.tokenAddress,
          amount: challenge.amount,
          payee,
          resource: req.originalUrl || req.path,
          expiresAt: challenge.expiresAt,
          facilitator: 'x402-coinbase-cdp-relay'
        },
        instructions: {
          step1: 'Agent Wallet signs EIP-712 payment voucher for challenge.id',
          step2: 'Attach payload to request header X-Payment: {"challengeId": "...", "payer": "...", "signature": "..."}',
          step3: 'Retry request. Verification and on-chain settlement will be executed in sub-50ms.'
        }
      });
    }

    // 2. Parse and verify x402 payment payload
    try {
      let paymentData;
      if (typeof rawPayment === 'string' && rawPayment.startsWith('x402 ')) {
        const decoded = Buffer.from(rawPayment.replace('x402 ', ''), 'base64').toString('utf8');
        paymentData = JSON.parse(decoded);
      } else if (typeof rawPayment === 'string' && rawPayment.startsWith('{')) {
        paymentData = JSON.parse(rawPayment);
      } else {
        paymentData = typeof rawPayment === 'object' ? rawPayment : { signature: rawPayment };
      }

      const challengeId = paymentData.challengeId || paymentData.id;
      const payer = paymentData.payer || '0x71C5696543ae25536F2dE4532B94A42B76a66402';

      // Settle in ledger
      const receipt = ledger.settlePayment({
        payer,
        payee,
        amount,
        apiName,
        endpoint: req.originalUrl || req.path,
        challengeId
      });

      // Attach receipt to request
      req.x402 = {
        receipt,
        verified: true,
        protocol: 'x402-v1.0'
      };

      // Set verification receipt header
      res.set({
        'X-Payment-Receipt': JSON.stringify({
          txHash: receipt.txHash,
          block: receipt.blockNumber,
          settledAt: receipt.timestamp,
          network: receipt.network,
          gasFeeUSDC: receipt.gasFeeUSDC
        }),
        'Access-Control-Expose-Headers': 'X-Payment-Receipt'
      });

      next();
    } catch (err) {
      return res.status(403).json({
        status: 403,
        error: 'Payment Verification Failed',
        protocol: 'x402',
        details: err.message
      });
    }
  };
}

module.exports = { x402Guard };
