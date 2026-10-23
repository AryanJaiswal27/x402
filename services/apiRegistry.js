const { PLATFORM_FACILITATOR } = require('./ledger');

class ApiRegistry {
  constructor() {
    this.services = new Map();
    this.initDefaultServices();
  }

  initDefaultServices() {
    const defaults = [
      {
        id: 'deepseek-financial',
        name: 'DeepSeek Financial Sentiment Quant',
        category: 'Financial Intelligence',
        description: 'High-frequency institutional order-flow sentiment, macro volatility index, and alpha momentum indicators for equities and crypto.',
        endpoint: '/api/x402/intel/deepseek-financial',
        method: 'GET',
        priceUSDC: 0.008,
        payee: '0x88402A4f91C27B3C397071F9f6E35F411A402F11',
        rateLimit: '100 req/sec',
        latencyAvg: '38ms',
        icon: 'trending-up',
        tags: ['Finance', 'Alpha', 'LLM-Quant'],
        sampleParams: { symbol: 'NVDA', timeframe: '1h' },
        handler: (query) => {
          const symbol = (query.symbol || 'NVDA').toUpperCase();
          return {
            symbol,
            sentimentScore: 0.884,
            sentimentLabel: 'STRONGLY_BULLISH',
            institutionalOrderFlowRatio: 2.41,
            volatilitySurface: { iv30: 36.4, skew: -0.14 },
            alphaSignals: [
              { signal: 'Institutional Darkpool Accumulation', confidence: 0.94, impact: 'HIGH' },
              { signal: 'Derivatives Gamma Squeeze Probability', confidence: 0.81, impact: 'MEDIUM' }
            ],
            quantumPrediction: {
              targetHorizon: '24h',
              expectedMovePct: '+3.42%',
              confidenceInterval: [ '+1.8%', '+5.1%' ]
            },
            verifiedBy: 'DeepSeek-Quant-Node-7'
          };
        }
      },
      {
        id: 'contract-security-audit',
        name: 'Autonomous EVM Bytecode Auditor',
        category: 'Code & Security',
        description: 'Deep symbolic bytecode execution engine checking reentrancy, access control bypass, oracle manipulation, and ERC-4337 signature flaws.',
        endpoint: '/api/x402/compute/contract-security-audit',
        method: 'GET',
        priceUSDC: 0.025,
        payee: '0x33402778842Ce7711B9d4c20E89Fa34890BE4029',
        rateLimit: '25 req/sec',
        latencyAvg: '62ms',
        icon: 'shield-check',
        tags: ['Security', 'Smart Contracts', 'Bytecode'],
        sampleParams: { address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984' },
        handler: (query) => {
          const target = query.address || '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';
          return {
            targetContract: target,
            auditTimestamp: new Date().toISOString(),
            riskScore: 'LOW (Grade A+)',
            vulnerabilitySummary: {
              critical: 0,
              high: 0,
              medium: 1,
              low: 2,
              gasOptimizations: 5
            },
            findings: [
              {
                id: 'AUD-01',
                severity: 'MEDIUM',
                type: 'Unchecked Return on ERC20 Transfer',
                location: 'swapExactTokensForETHSupportingFeeOnTransferTokens()',
                status: 'Mitigated by SafeERC20 wrapper'
              },
              {
                id: 'AUD-02',
                severity: 'LOW',
                type: 'Potential Front-Running on Slippage Bound',
                location: 'UniswapV2Router02.sol:L384',
                recommendation: 'Enforce private mempool routing (MEV-Share/Flashbots)'
              }
            ],
            slitherCoverage: '98.4%',
            formalVerificationHash: '0xae374b901fc88b71239c091fca0991'
          };
        }
      },
      {
        id: 'geospatial-satellite',
        name: 'Orbital SAR Geospatial Disruption Vector',
        category: 'Physical World Intelligence',
        description: 'Real-time Synthetic Aperture Radar (SAR) analysis of global ports, oil refinery flaring, chip fabrication facilities, and transport bottlenecks.',
        endpoint: '/api/x402/data/geospatial-satellite',
        method: 'GET',
        priceUSDC: 0.012,
        payee: '0x1240298a00B32c9189Dca0147690C512A55C402E',
        rateLimit: '50 req/sec',
        latencyAvg: '44ms',
        icon: 'satellite',
        tags: ['Satellite', 'Supply Chain', 'SAR'],
        sampleParams: { region: 'Port of Rotterdam', sensor: 'Sentinel-1B' },
        handler: (query) => {
          const region = query.region || 'Port of Rotterdam';
          return {
            targetRegion: region,
            passTimestamp: new Date().toISOString(),
            constellation: 'Sentinel-1B SAR Interferometry',
            containerVesselDensity: {
              vesselsAnchored: 47,
              avgWaitTimeDays: 1.8,
              congestionTrend: '-12% WoW'
            },
            thermalFlaringAnomaly: 'Normal (0.02 sigma divergence)',
            supplyChainReadinessIndex: 94.2,
            groundTruthVerification: 'PASS'
          };
        }
      },
      {
        id: 'vector-embeddings',
        name: 'UltraDense 1536d Vector Embedder',
        category: 'AI Infrastructure',
        description: 'Low-latency normalized 1536-dimensional embeddings optimized for agentic RAG, semantic clustering, and cosine similarity lookup.',
        endpoint: '/api/x402/ai/vector-embeddings',
        method: 'GET',
        priceUSDC: 0.003,
        payee: '0x994025112048Cd8296720a442880b91223904021',
        rateLimit: '300 req/sec',
        latencyAvg: '19ms',
        icon: 'cpu',
        tags: ['AI Compute', 'Embeddings', 'RAG'],
        sampleParams: { text: 'x402 is an open internet-native payment protocol for autonomous agents' },
        handler: (query) => {
          const text = query.text || 'x402 protocol specification';
          // Generate mock deterministic 1536 float array sample
          const sampleVector = Array.from({ length: 8 }, (_, i) => 
            Number((Math.sin(i + text.length) * 0.45).toFixed(6))
          );
          return {
            inputChars: text.length,
            tokensCount: Math.ceil(text.length / 4),
            dimension: 1536,
            vectorPreview: sampleVector,
            truncatedNotice: 'Full 1536-float tensor streamed in binary vector format',
            model: 'text-embedding-3-large-distilled',
            cosineNorm: 1.000000
          };
        }
      },
      {
        id: 'clean-web-crawler',
        name: 'Agentic Clean Markdown Extractor',
        category: 'Agent Tooling',
        description: 'Headless stealth extraction that strips cookies, ads, and noise, outputting structured token-dense Markdown with source metadata.',
        endpoint: '/api/x402/agent/web-crawler',
        method: 'GET',
        priceUSDC: 0.005,
        payee: '0x5540203a98B8233C1488c01bA488099238402402',
        rateLimit: '60 req/sec',
        latencyAvg: '48ms',
        icon: 'globe',
        tags: ['Scraping', 'Markdown', 'Stealth'],
        sampleParams: { targetUrl: 'https://coinbase.com/blog/x402' },
        handler: (query) => {
          const url = query.targetUrl || 'https://coinbase.com/blog/x402';
          return {
            targetUrl: url,
            statusCode: 200,
            contentLengthBytes: 14280,
            markdownOutput: `# Extracted Summary from ${url}\n\n- Title: The x402 Payment Standard for Autonomous Agents\n- Summary: Enabling seamless machine-to-machine micropayments via HTTP 402 code.\n- Content Nodes Parsed: 14 paragraphs, 6 tables, 3 code blocks.\n- Bot Detection Bypass: Passed (Cloudflare Turnstile simulated pass)`,
            extractedAt: new Date().toISOString()
          };
        }
      }
    ];

    defaults.forEach(service => this.services.set(service.id, service));
  }

  getAll() {
    return Array.from(this.services.values());
  }

  getById(id) {
    return this.services.get(id);
  }

  getByEndpoint(endpoint) {
    for (const service of this.services.values()) {
      if (service.endpoint === endpoint) return service;
    }
    return null;
  }

  registerCustomService({ name, category, description, endpoint, priceUSDC, payee, sampleResponse }) {
    const id = 'custom-' + Date.now().toString(36);
    const service = {
      id,
      name,
      category: category || 'Custom Monetized API',
      description,
      endpoint: endpoint.startsWith('/') ? endpoint : '/' + endpoint,
      method: 'GET',
      priceUSDC: Number(priceUSDC) || 0.010,
      payee: payee || PLATFORM_FACILITATOR,
      rateLimit: '50 req/sec',
      latencyAvg: '25ms',
      icon: 'sparkles',
      tags: ['Community', 'Custom x402'],
      sampleParams: {},
      isCustom: true,
      handler: () => {
        try {
          return typeof sampleResponse === 'string' ? JSON.parse(sampleResponse) : sampleResponse;
        } catch {
          return { message: 'Custom x402 API payload', data: sampleResponse };
        }
      }
    };

    this.services.set(id, service);
    return service;
  }
}

const apiRegistry = new ApiRegistry();
module.exports = { apiRegistry };
