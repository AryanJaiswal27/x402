const crypto = require('crypto');

// Default Simulated Agent Wallet & Provider Wallets
const DEFAULT_AGENT_WALLET = '0x71C5696543ae25536F2dE4532B94A42B76a66402';
const PLATFORM_FACILITATOR = '0x4029D8872bF00cA2343E65B9e01103D3b1F89402';

class PaymentLedger {
  constructor() {
    this.balances = new Map([
      [DEFAULT_AGENT_WALLET, 5.000], // Agent starts with 5.00 USDC
      [PLATFORM_FACILITATOR, 128.450]
    ]);
    this.transactions = [];
    this.activeChallenges = new Map();
    this.currentBlock = 19482100;

    // Seed some initial demo transactions for visual richness on load
    this.seedInitialHistory();
  }

  seedInitialHistory() {
    const seedData = [
      {
        apiName: 'DeepSeek Financial Sentiment Quant',
        endpoint: '/api/x402/intel/deepseek-financial',
        payer: DEFAULT_AGENT_WALLET,
        payee: '0x88402...F11A',
        amount: 0.008,
        txHash: '0x' + crypto.randomBytes(32).toString('hex'),
        blockNumber: this.currentBlock - 12,
        timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        status: 'settled',
        network: 'base-sepolia',
        latencyMs: 42
      },
      {
        apiName: 'Smart Contract Bytecode Auditor',
        endpoint: '/api/x402/compute/contract-security-audit',
        payer: DEFAULT_AGENT_WALLET,
        payee: '0x33402...90BE',
        amount: 0.025,
        txHash: '0x' + crypto.randomBytes(32).toString('hex'),
        blockNumber: this.currentBlock - 8,
        timestamp: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
        status: 'settled',
        network: 'base-sepolia',
        latencyMs: 58
      },
      {
        apiName: 'Orbital SAR Geospatial Vector',
        endpoint: '/api/x402/data/geospatial-satellite',
        payer: DEFAULT_AGENT_WALLET,
        payee: '0x12402...A55C',
        amount: 0.012,
        txHash: '0x' + crypto.randomBytes(32).toString('hex'),
        blockNumber: this.currentBlock - 3,
        timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        status: 'settled',
        network: 'base-sepolia',
        latencyMs: 39
      }
    ];

    this.transactions.push(...seedData);
  }

  getBalance(address = DEFAULT_AGENT_WALLET) {
    return this.balances.get(address) || 0.000;
  }

  topUp(address = DEFAULT_AGENT_WALLET, amount = 2.000) {
    const current = this.getBalance(address);
    const updated = Math.round((current + Number(amount)) * 1000) / 1000;
    this.balances.set(address, updated);
    return {
      address,
      balance: updated,
      added: amount
    };
  }

  createChallenge({ apiId, endpoint, amount, payee }) {
    const nonce = 'ch_' + crypto.randomBytes(8).toString('hex');
    const challenge = {
      id: nonce,
      protocol: 'x402',
      version: '1.0',
      network: 'base-sepolia',
      chainId: 84532,
      token: 'USDC',
      tokenAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      amount: Number(amount).toFixed(4),
      payee: payee || PLATFORM_FACILITATOR,
      endpoint,
      apiId,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes validity
    };

    this.activeChallenges.set(nonce, challenge);
    return challenge;
  }

  getChallenge(id) {
    return this.activeChallenges.get(id);
  }

  settlePayment({ payer = DEFAULT_AGENT_WALLET, payee, amount, apiName, endpoint, challengeId }) {
    const cost = Number(amount);
    const payerBalance = this.getBalance(payer);

    if (payerBalance < cost) {
      throw new Error(`Insufficient agent wallet balance: ${payerBalance.toFixed(4)} USDC available, ${cost.toFixed(4)} required.`);
    }

    // Debit payer
    const newPayerBal = Math.round((payerBalance - cost) * 10000) / 10000;
    this.balances.set(payer, newPayerBal);

    // Credit payee
    const currentPayeeBal = this.getBalance(payee);
    this.balances.set(payee, Math.round((currentPayeeBal + cost) * 10000) / 10000);

    // Advance block
    this.currentBlock += Math.floor(Math.random() * 2) + 1;

    // Generate cryptographic tx receipt
    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const receipt = {
      txHash,
      blockNumber: this.currentBlock,
      payer,
      payee,
      amount: cost,
      token: 'USDC',
      network: 'base-sepolia',
      apiName: apiName || 'Custom x402 Endpoint',
      endpoint,
      challengeId,
      timestamp: new Date().toISOString(),
      status: 'settled',
      gasFeeUSDC: '0.0001',
      latencyMs: Math.floor(Math.random() * 35) + 25
    };

    this.transactions.unshift(receipt);
    if (challengeId) {
      this.activeChallenges.delete(challengeId);
    }

    return receipt;
  }

  getTransactions(limit = 50) {
    return this.transactions.slice(0, limit);
  }

  getStats() {
    const totalVolume = this.transactions.reduce((acc, tx) => acc + (tx.amount || 0), 0);
    return {
      agentBalance: this.getBalance(DEFAULT_AGENT_WALLET),
      agentWallet: DEFAULT_AGENT_WALLET,
      totalSettlements: this.transactions.length,
      totalVolumeUSDC: Math.round(totalVolume * 10000) / 10000,
      activeChallengesCount: this.activeChallenges.size,
      latestBlock: this.currentBlock,
      network: 'Base Sepolia (EVM 84532)'
    };
  }
}

const ledger = new PaymentLedger();
module.exports = {
  ledger,
  DEFAULT_AGENT_WALLET,
  PLATFORM_FACILITATOR
};
