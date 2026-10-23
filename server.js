const express = require('express');
const cors = require('cors');
const path = require('path');
const { ledger, DEFAULT_AGENT_WALLET } = require('./services/ledger');
const { apiRegistry } = require('./services/apiRegistry');
const { agentEngine } = require('./services/agentEngine');
const { x402Guard } = require('./middleware/x402');

const app = express();
const PORT = process.env.PORT || 4020;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------
// 1. Core Platform Meta & State Endpoints
// ---------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    protocol: 'x402',
    network: 'Base Sepolia (EVM 84532)',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/services', (req, res) => {
  res.json({
    success: true,
    services: apiRegistry.getAll()
  });
});

app.get('/api/ledger/stats', (req, res) => {
  res.json({
    success: true,
    stats: ledger.getStats()
  });
});

app.get('/api/ledger/transactions', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({
    success: true,
    transactions: ledger.getTransactions(limit)
  });
});

app.post('/api/ledger/faucet', (req, res) => {
  const { address, amount } = req.body;
  const target = address || DEFAULT_AGENT_WALLET;
  const topUpAmount = Number(amount) || 2.000;
  const result = ledger.topUp(target, topUpAmount);
  res.json({
    success: true,
    message: `Faucet granted ${topUpAmount} USDC on Base Sepolia.`,
    wallet: result
  });
});

// ---------------------------------------------------------
// 2. Autonomous Agent Swarm Execution API
// ---------------------------------------------------------

app.get('/api/agent/missions', (req, res) => {
  res.json({
    success: true,
    missions: agentEngine.getMissions()
  });
});

app.post('/api/agent/run-mission', async (req, res) => {
  try {
    const { missionId, walletAddress } = req.body;
    const result = await agentEngine.executeMission(missionId, walletAddress || DEFAULT_AGENT_WALLET);
    res.json({
      success: true,
      result
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// ---------------------------------------------------------
// 3. User-Generated / Provider API Builder
// ---------------------------------------------------------

app.post('/api/services/create', (req, res) => {
  try {
    const { name, category, description, endpoint, priceUSDC, payee, sampleResponse } = req.body;
    if (!name || !endpoint || !priceUSDC) {
      return res.status(400).json({ success: false, error: 'Name, endpoint and price are required' });
    }

    const newService = apiRegistry.registerCustomService({
      name,
      category,
      description,
      endpoint,
      priceUSDC,
      payee,
      sampleResponse
    });

    res.json({
      success: true,
      message: 'x402 protected API endpoint registered successfully!',
      service: newService
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------
// 4. x402 Protected APIs (Strict HTTP 402 Handshake)
// ---------------------------------------------------------

// Register standard x402 services
apiRegistry.getAll().forEach(service => {
  app.get(
    service.endpoint,
    x402Guard({
      id: service.id,
      name: service.name,
      amount: service.priceUSDC,
      payee: service.payee
    }),
    (req, res) => {
      const data = service.handler(req.query);
      res.json({
        success: true,
        protocol: 'x402',
        service: service.name,
        costUSDC: service.priceUSDC,
        paymentReceipt: req.x402?.receipt,
        data
      });
    }
  );
});

// Catch-all dynamic dispatcher for custom x402 endpoints
app.use('/api/x402/custom', (req, res, next) => {
  const fullEndpoint = '/api/x402/custom' + req.path;
  const service = apiRegistry.getByEndpoint(fullEndpoint);
  if (!service) {
    return res.status(404).json({ error: 'x402 service not found' });
  }

  const guard = x402Guard({
    id: service.id,
    name: service.name,
    amount: service.priceUSDC,
    payee: service.payee
  });

  guard(req, res, () => {
    const data = service.handler(req.query);
    res.json({
      success: true,
      protocol: 'x402',
      service: service.name,
      costUSDC: service.priceUSDC,
      paymentReceipt: req.x402?.receipt,
      data
    });
  });
});

// ---------------------------------------------------------
// 5. Fallback & Server Boot
// ---------------------------------------------------------

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`⚡ Synapse402 - x402 Autonomous Micropayment Server`);
  console.log(`🌐 Live at: http://localhost:${PORT}`);
  console.log(`⛓️  Settlement Network: Base Sepolia (EVM 84532)`);
  console.log(`💵 Default Agent Wallet: ${DEFAULT_AGENT_WALLET}`);
  console.log(`=======================================================`);
});
