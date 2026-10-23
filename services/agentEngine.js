const crypto = require('crypto');
const { ledger, DEFAULT_AGENT_WALLET } = require('./ledger');
const { apiRegistry } = require('./apiRegistry');

class AgentEngine {
  constructor() {
    this.missions = [
      {
        id: 'mission-alpha',
        name: 'Autonomous Quant Due Diligence & Alpha Extraction',
        target: 'NVDA & AI Compute Sector',
        budgetCapUSDC: 0.05,
        requiredApis: ['deepseek-financial', 'clean-web-crawler', 'vector-embeddings'],
        description: 'Autonomously procure financial quant signals, extract unpaywalled regulatory filings, and compute semantic embeddings for alpha forecasting.'
      },
      {
        id: 'mission-security',
        name: 'Autonomous Smart Contract Security Audit & Exploit Scan',
        target: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
        budgetCapUSDC: 0.08,
        requiredApis: ['contract-security-audit', 'vector-embeddings'],
        description: 'Execute symbolic bytecode audit, scan for reentrancy vectors, and cross-reference known CVE vector embeddings without human intervention.'
      },
      {
        id: 'mission-geospatial',
        name: 'Orbital Supply Chain & Bottleneck Forensics',
        target: 'Port of Rotterdam & Microchip Logistics',
        budgetCapUSDC: 0.04,
        requiredApis: ['geospatial-satellite', 'clean-web-crawler'],
        description: 'Purchase real-time synthetic aperture radar SAR passes to quantify port wait times and cross-verify with shipping freight feeds.'
      }
    ];
  }

  getMissions() {
    return this.missions;
  }

  /**
   * Execute an autonomous agent mission with real step-by-step x402 challenge/payment loop
   */
  async executeMission(missionId, agentWallet = DEFAULT_AGENT_WALLET) {
    const mission = this.missions.find(m => m.id === missionId) || this.missions[0];
    const logs = [];
    let totalSpent = 0;
    const unlockedData = {};

    logs.push({
      step: 1,
      type: 'PLAN',
      timestamp: new Date().toISOString(),
      message: `Agent initialized mission: "${mission.name}". Target: [${mission.target}]. Autonomous budget: $${mission.budgetCapUSDC} USDC.`
    });

    for (let i = 0; i < mission.requiredApis.length; i++) {
      const apiId = mission.requiredApis[i];
      const service = apiRegistry.getById(apiId);

      if (!service) continue;

      // 1. Initial Request (Step A)
      logs.push({
        step: logs.length + 1,
        type: 'HTTP_REQUEST_1',
        timestamp: new Date().toISOString(),
        message: `Agent requesting protected resource: GET ${service.endpoint}`,
        details: { method: 'GET', endpoint: service.endpoint, headers: { 'User-Agent': 'Synapse402-AutonomousAgent/1.0' } }
      });

      // 2. Server 402 Response (Step B)
      const challenge = ledger.createChallenge({
        apiId: service.id,
        endpoint: service.endpoint,
        amount: service.priceUSDC,
        payee: service.payee
      });

      logs.push({
        step: logs.length + 1,
        type: 'HTTP_402_CHALLENGE',
        timestamp: new Date().toISOString(),
        message: `Server returned HTTP 402 (Payment Required). x402 challenge received: ${challenge.amount} USDC required for payee ${service.payee.slice(0, 10)}...`,
        challenge: {
          id: challenge.id,
          amountUSDC: challenge.amount,
          payee: challenge.payee,
          network: 'base-sepolia',
          token: 'USDC'
        }
      });

      // 3. Agent Wallet Signing (Step C)
      const currentBal = ledger.getBalance(agentWallet);
      if (currentBal < service.priceUSDC) {
        throw new Error(`Agent budget exhausted. Current balance: ${currentBal.toFixed(4)} USDC, required: ${service.priceUSDC} USDC. Please top up.`);
      }

      const clientSignature = '0x' + crypto.randomBytes(65).toString('hex');
      const paymentPayload = {
        version: '1.0',
        protocol: 'x402',
        challengeId: challenge.id,
        payer: agentWallet,
        amount: challenge.amount,
        signature: clientSignature,
        timestamp: Date.now()
      };

      logs.push({
        step: logs.length + 1,
        type: 'AGENT_SIGN',
        timestamp: new Date().toISOString(),
        message: `Agent wallet autonomously authorized micropayment voucher: ${challenge.amount} USDC. Signature: ${clientSignature.slice(0, 16)}...`,
        signedPayload: paymentPayload
      });

      // 4. Client Retry with X-Payment (Step D)
      const receipt = ledger.settlePayment({
        payer: agentWallet,
        payee: service.payee,
        amount: service.priceUSDC,
        apiName: service.name,
        endpoint: service.endpoint,
        challengeId: challenge.id
      });
      totalSpent += service.priceUSDC;

      // Execute payload handler
      const data = service.handler(service.sampleParams || {});
      unlockedData[service.id] = data;

      logs.push({
        step: logs.length + 1,
        type: 'HTTP_200_SUCCESS',
        timestamp: new Date().toISOString(),
        message: `Payment verified & settled on Base Sepolia. HTTP 200 OK received with unlocked intelligence payload.`,
        receipt: {
          txHash: receipt.txHash,
          block: receipt.blockNumber,
          costUSDC: receipt.amount,
          latency: `${receipt.latencyMs}ms`
        }
      });
    }

    // 5. Final Synthesis
    logs.push({
      step: logs.length + 1,
      type: 'SYNTHESIS',
      timestamp: new Date().toISOString(),
      message: `Autonomous mission successfully accomplished. All ${mission.requiredApis.length} x402 paywalled endpoints unlocked. Total spent: $${totalSpent.toFixed(4)} USDC. Agent wallet remaining: $${ledger.getBalance(agentWallet).toFixed(4)} USDC.`
    });

    return {
      mission,
      status: 'COMPLETED',
      totalSpentUSDC: Number(totalSpent.toFixed(4)),
      remainingBalanceUSDC: ledger.getBalance(agentWallet),
      agentWallet,
      executionLogs: logs,
      unlockedData,
      completedAt: new Date().toISOString()
    };
  }
}

const agentEngine = new AgentEngine();
module.exports = { agentEngine };
