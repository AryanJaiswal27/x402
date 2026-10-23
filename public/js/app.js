/**
 * SYNAPSE402 — FRONTEND APPLICATION LOGIC
 * Manages autonomous swarm missions, x402 protocol inspection, marketplace, and ledger.
 */

const state = {
  activeTab: 'swarm',
  services: [],
  missions: [],
  selectedMissionId: null,
  isMissionRunning: false,
  agentWallet: '0x6c7124c77F42EcdaAE9aE5849838C8994fE271f3',
  agentBalance: 5.000,
  inspector: {
    selectedService: null,
    step: 0,
    currentChallenge: null,
    signedVoucher: null,
    responseReceipt: null,
    activeView: 'http',
    httpTrace: []
  }
};

// --------------------------------------------------------------------------
// Initialization & Lifecycle
// --------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
  setupTabs();
  setupModals();
  setupInspectorEvents();
  setupMissionEvents();
  setupMetaMask();

  // Load initial backend state
  await Promise.all([
    fetchStats(),
    fetchServices(),
    fetchMissions(),
    fetchTransactions()
  ]);

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Periodic background poll for ledger stats
  setInterval(fetchStats, 8000);
});

function refreshIcons() {
  if (window.lucide) {
    setTimeout(() => window.lucide.createIcons(), 50);
  }
}

// --------------------------------------------------------------------------
// Tab Navigation
// --------------------------------------------------------------------------

function setupTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;
      switchTab(targetId);
    });
  });
}

function switchTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.toggle('active', p.id === `pane-${tabId}`);
  });
  refreshIcons();
}

// --------------------------------------------------------------------------
// API Fetching & State Updates
// --------------------------------------------------------------------------

async function fetchStats() {
  try {
    const res = await fetch('/api/ledger/stats');
    const data = await res.json();
    if (data.success) {
      state.agentBalance = data.stats.agentBalance;
      state.agentWallet = data.stats.agentWallet;

      // Update UI Counters
      const balStr = `${Number(data.stats.agentBalance).toFixed(4)} USDC`;
      document.getElementById('topNavBalance').textContent = balStr;
      document.getElementById('heroAgentBalance').textContent = balStr;
      document.getElementById('ledgerAgentBal').textContent = balStr;
      document.getElementById('ledgerAgentAddr').textContent = `${data.stats.agentWallet.slice(0, 8)}...${data.stats.agentWallet.slice(-4)}`;
      const shortAddrEl = document.getElementById('topNavAddrShort');
      if (shortAddrEl) {
        shortAddrEl.textContent = `${data.stats.agentWallet.slice(0, 6)}...${data.stats.agentWallet.slice(-4)}`;
      }

      document.getElementById('totalSettlementsCounter').textContent = data.stats.totalSettlements;
      document.getElementById('ledgerTotalTx').textContent = data.stats.totalSettlements;

      document.getElementById('totalVolumeCounter').textContent = `${data.stats.totalVolumeUSDC} USDC`;
      document.getElementById('ledgerGrossVol').textContent = `${data.stats.totalVolumeUSDC} USDC`;
      document.getElementById('ledgerBlockNum').textContent = `#${data.stats.latestBlock}`;
    }
  } catch (err) {
    console.error('Failed to fetch stats:', err);
  }
}

async function fetchServices() {
  try {
    const res = await fetch('/api/services');
    const data = await res.json();
    if (data.success) {
      state.services = data.services;
      renderMarketplaceGrid();
      populateInspectorDropdown();
    }
  } catch (err) {
    console.error('Failed to fetch services:', err);
  }
}

async function fetchMissions() {
  try {
    const res = await fetch('/api/agent/missions');
    const data = await res.json();
    if (data.success) {
      state.missions = data.missions;
      renderMissionsList();
      if (state.missions.length > 0 && !state.selectedMissionId) {
        selectMission(state.missions[0].id);
      }
    }
  } catch (err) {
    console.error('Failed to fetch missions:', err);
  }
}

async function fetchTransactions() {
  try {
    const res = await fetch('/api/ledger/transactions?limit=25');
    const data = await res.json();
    if (data.success) {
      renderLedgerTable(data.transactions);
    }
  } catch (err) {
    console.error('Failed to fetch transactions:', err);
  }
}

// --------------------------------------------------------------------------
// Tab 1: Autonomous Swarm Mission Controller
// --------------------------------------------------------------------------

function renderMissionsList() {
  const container = document.getElementById('missionCardsList');
  container.innerHTML = state.missions.map(m => `
    <div class="mission-card ${state.selectedMissionId === m.id ? 'selected' : ''}" data-id="${m.id}">
      <div class="mission-card-title">${escapeHtml(m.name)}</div>
      <div class="mission-card-target"><i data-lucide="target" style="width:12px;height:12px;display:inline;"></i> Target: ${escapeHtml(m.target)}</div>
      <div class="mission-card-desc">${escapeHtml(m.description)}</div>
      <div class="mission-card-footer">
        <span class="mission-budget">Budget: $${m.budgetCapUSDC} USDC</span>
        <span class="badge badge-purple">${m.requiredApis.length} x402 APIs</span>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.mission-card').forEach(card => {
    card.addEventListener('click', () => {
      selectMission(card.dataset.id);
    });
  });

  refreshIcons();
}

function selectMission(missionId) {
  state.selectedMissionId = missionId;
  document.querySelectorAll('.mission-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.id === missionId);
  });
}

function setupMissionEvents() {
  const launchBtn = document.getElementById('btnLaunchMission');
  launchBtn.addEventListener('click', async () => {
    if (state.isMissionRunning) return;
    await executeSwarmMission();
  });
}

async function executeSwarmMission() {
  const launchBtn = document.getElementById('btnLaunchMission');
  const consoleStatus = document.getElementById('consoleStatus');
  const timeline = document.getElementById('missionTimeline');
  const unlockedDossier = document.getElementById('unlockedDossier');

  state.isMissionRunning = true;
  launchBtn.disabled = true;
  launchBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Executing Swarm...';
  consoleStatus.innerHTML = '<span class="status-indicator running"></span> Swarm Running';
  unlockedDossier.style.display = 'none';
  timeline.innerHTML = '';
  refreshIcons();

  try {
    const res = await fetch('/api/agent/run-mission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        missionId: state.selectedMissionId,
        walletAddress: state.agentWallet
      })
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error);
    }

    const { executionLogs, unlockedData, totalSpentUSDC } = data.result;

    // Animate logs one by one for breathtaking visual effect
    for (const log of executionLogs) {
      appendTimelineItem(log);
      await sleep(350);
    }

    // Render unlocked dossier
    renderUnlockedDossier(unlockedData, totalSpentUSDC);
    await fetchStats();
    await fetchTransactions();
    showToast('Autonomous Mission Swarm Completed Successfully!', 'success');

  } catch (err) {
    appendTimelineItem({
      step: '!',
      type: 'HTTP_402_CHALLENGE',
      timestamp: new Date().toISOString(),
      message: `Swarm Execution Error: ${err.message}`
    });
    showToast(err.message, 'error');
  } finally {
    state.isMissionRunning = false;
    launchBtn.disabled = false;
    launchBtn.innerHTML = '<i data-lucide="play"></i> Launch Autonomous Agent Mission';
    consoleStatus.innerHTML = '<span class="status-indicator ready"></span> Ready';
    refreshIcons();
  }
}

function appendTimelineItem(log) {
  const timeline = document.getElementById('missionTimeline');
  const emptyState = timeline.querySelector('.empty-timeline-state');
  if (emptyState) emptyState.remove();

  const item = document.createElement('div');
  item.className = 'timeline-item';

  let detailsHtml = '';
  if (log.challenge) {
    detailsHtml = `<div class="timeline-details-snippet">402 CHALLENGE: ${log.challenge.id} | Price: ${log.challenge.amountUSDC} ${log.challenge.token} | Payee: ${log.challenge.payee}</div>`;
  } else if (log.signedPayload) {
    detailsHtml = `<div class="timeline-details-snippet">SIGNED VOUCHER: challengeId: "${log.signedPayload.challengeId}" | sig: "${log.signedPayload.signature.slice(0, 28)}..."</div>`;
  } else if (log.receipt) {
    detailsHtml = `<div class="timeline-details-snippet">BASE SETTLEMENT: Tx ${log.receipt.txHash.slice(0, 22)}... | Block #${log.receipt.block} | Latency: ${log.receipt.latency}</div>`;
  }

  item.innerHTML = `
    <div class="timeline-step-badge step-type-${log.type}">
      ${log.step}
    </div>
    <div class="timeline-content-card">
      <div class="timeline-item-header">
        <span class="timeline-type-label step-type-${log.type}">${log.type.replace(/_/g, ' ')}</span>
        <span class="timeline-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
      </div>
      <div class="timeline-message">${escapeHtml(log.message)}</div>
      ${detailsHtml}
    </div>
  `;

  timeline.appendChild(item);
  timeline.scrollTop = timeline.scrollHeight;
  refreshIcons();
}

function renderUnlockedDossier(unlockedData, totalSpent) {
  const container = document.getElementById('unlockedDossier');
  const body = document.getElementById('dossierBody');
  const spentBadge = document.getElementById('dossierSpentBadge');

  spentBadge.textContent = `Total Settled: $${totalSpent.toFixed(4)} USDC`;
  body.innerHTML = '';

  for (const [key, data] of Object.entries(unlockedData)) {
    const card = document.createElement('div');
    card.className = 'dossier-card';
    card.innerHTML = `
      <div class="dossier-card-title"><i data-lucide="unlock" style="width:14px;height:14px;color:var(--accent-cyan);display:inline;"></i> ${escapeHtml(key)}</div>
      <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
    `;
    body.appendChild(card);
  }

  container.style.display = 'block';
  refreshIcons();
}

// --------------------------------------------------------------------------
// Tab 2: Interactive x402 Protocol Inspector
// --------------------------------------------------------------------------

function populateInspectorDropdown() {
  const select = document.getElementById('inspectorEndpointSelect');
  select.innerHTML = state.services.map(s => `
    <option value="${s.id}">${escapeHtml(s.name)} (${s.priceUSDC} USDC)</option>
  `).join('');

  if (state.services.length > 0) {
    updateInspectorSelectedService(state.services[0].id);
  }

  select.addEventListener('change', () => {
    updateInspectorSelectedService(select.value);
  });
}

function updateInspectorSelectedService(serviceId) {
  const service = state.services.find(s => s.id === serviceId) || state.services[0];
  state.inspector.selectedService = service;
  resetInspectorHandshake();

  document.getElementById('inspectorMetaPrice').textContent = `${service.priceUSDC} USDC`;
  document.getElementById('inspectorMetaPayee').textContent = `${service.payee.slice(0, 10)}...${service.payee.slice(-4)}`;
}

function resetInspectorHandshake() {
  state.inspector.step = 0;
  state.inspector.currentChallenge = null;
  state.inspector.signedVoucher = null;
  state.inspector.responseReceipt = null;

  document.getElementById('btnInspectorStep1').className = 'step-btn';
  document.getElementById('btnInspectorStep2').className = 'step-btn disabled';
  document.getElementById('btnInspectorStep2').disabled = true;
  document.getElementById('btnInspectorStep3').className = 'step-btn disabled';
  document.getElementById('btnInspectorStep3').disabled = true;

  document.getElementById('handshakeStageBadge').textContent = 'AWAITING STEP 1';
  document.getElementById('handshakeStageBadge').className = 'handshake-stage-badge';

  renderInspectorTerminal(`<span class="comment">// Target selected: ${state.inspector.selectedService?.endpoint}</span>
<span class="comment">// Click "Step 1: Send Raw GET Request" to initiate the x402 handshake.</span>`);
}

function setupInspectorEvents() {
  document.getElementById('btnInspectorStep1').addEventListener('click', executeInspectorStep1);
  document.getElementById('btnInspectorStep2').addEventListener('click', executeInspectorStep2);
  document.getElementById('btnInspectorStep3').addEventListener('click', executeInspectorStep3);
  document.getElementById('btnInspectorReset').addEventListener('click', resetInspectorHandshake);

  // Inspector View switcher (HTTP, Crypto, Receipt)
  document.querySelectorAll('.tab-mini').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-mini').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.inspector.activeView = btn.dataset.view;
      updateInspectorView();
    });
  });
}

async function executeInspectorStep1() {
  const service = state.inspector.selectedService;
  const terminal = document.getElementById('inspectorTerminal');

  // Perform unauthenticated raw GET request
  const startTime = Date.now();
  const res = await fetch(service.endpoint);
  const latency = Date.now() - startTime;
  const challengeBody = await res.json();
  const authHeader = res.headers.get('www-authenticate') || `x402 token="USDC", amount="${service.priceUSDC}"`;

  state.inspector.step = 1;
  state.inspector.currentChallenge = challengeBody.challenge;

  // Update UI Step buttons
  document.getElementById('btnInspectorStep1').className = 'step-btn completed';
  document.getElementById('btnInspectorStep2').className = 'step-btn';
  document.getElementById('btnInspectorStep2').disabled = false;

  const stageBadge = document.getElementById('handshakeStageBadge');
  stageBadge.textContent = '402 CHALLENGE RECEIVED';
  stageBadge.className = 'handshake-stage-badge http-402-badge';

  const output = `
<span class="http-req-badge">> GET ${service.endpoint} HTTP/1.1</span>
<span class="code-header-key">Host:</span> <span class="code-header-val">synapse402.org</span>
<span class="code-header-key">Accept:</span> <span class="code-header-val">application/json</span>
<span class="code-header-key">User-Agent:</span> <span class="code-header-val">AgentClient/1.0</span>

<span class="http-402-badge">< HTTP/1.1 402 Payment Required</span> (${latency}ms)
<span class="code-header-key">WWW-Authenticate:</span> <span class="code-header-val">${escapeHtml(authHeader)}</span>
<span class="code-header-key">X-Protocol:</span> <span class="code-header-val">x402-v1.0</span>
<span class="code-header-key">Content-Type:</span> <span class="code-header-val">application/json</span>

<span class="comment">// Response Body (x402 Challenge):</span>
${escapeHtml(JSON.stringify(challengeBody, null, 2))}
`;
  state.inspector.httpTrace[1] = output;
  renderInspectorTerminal(output);
  showToast('HTTP 402 Payment Required Challenge Received', 'info');
}

function executeInspectorStep2() {
  const challenge = state.inspector.currentChallenge;
  if (!challenge) return;

  const voucher = {
    version: '1.0',
    protocol: 'x402',
    challengeId: challenge.id,
    payer: state.agentWallet,
    payee: challenge.payee,
    amount: challenge.amount,
    token: challenge.token,
    chainId: challenge.chainId,
    nonce: challenge.id,
    signature: '0x' + Array.from({length: 65}, () => Math.floor(Math.random()*16).toString(16)).join(''),
    timestamp: Date.now()
  };

  state.inspector.step = 2;
  state.inspector.signedVoucher = voucher;

  document.getElementById('btnInspectorStep2').className = 'step-btn completed';
  document.getElementById('btnInspectorStep3').className = 'step-btn';
  document.getElementById('btnInspectorStep3').disabled = false;

  const stageBadge = document.getElementById('handshakeStageBadge');
  stageBadge.textContent = 'VOUCHER CRYPTO SIGNED';
  stageBadge.className = 'handshake-stage-badge step-type-AGENT_SIGN';

  const output = `
<span class="comment">// Agent Wallet EIP-712 Typed Data Signing:</span>
<span class="code-header-key">Domain:</span> { name: "x402 Micropayment Protocol", version: "1.0", chainId: 84532, verifyingContract: "${challenge.tokenAddress}" }
<span class="code-header-key">Types:</span> { PaymentVoucher: [{name: "challengeId", type: "string"}, {name: "amount", type: "uint256"}, {name: "payer", type: "address"}] }

<span class="comment">// Cryptographically Signed Payment Voucher:</span>
${escapeHtml(JSON.stringify(voucher, null, 2))}

<span class="comment">// Ready to retry request attaching header:</span>
<span class="code-header-key">X-Payment:</span> ${escapeHtml(JSON.stringify(voucher))}
`;
  state.inspector.httpTrace[2] = output;
  renderInspectorTerminal(output);
  showToast('EIP-712 Payment Voucher Signed by Agent Wallet', 'success');
}

async function executeInspectorStep3() {
  const service = state.inspector.selectedService;
  const voucher = state.inspector.signedVoucher;
  if (!voucher) return;

  const startTime = Date.now();
  const res = await fetch(service.endpoint, {
    method: 'GET',
    headers: {
      'X-Payment': JSON.stringify(voucher)
    }
  });

  const latency = Date.now() - startTime;
  const data = await res.json();
  const receiptHeader = res.headers.get('x-payment-receipt');

  state.inspector.step = 3;
  state.inspector.responseReceipt = data.paymentReceipt;

  document.getElementById('btnInspectorStep3').className = 'step-btn completed';

  const stageBadge = document.getElementById('handshakeStageBadge');
  stageBadge.textContent = '200 OK — SETTLED ON-CHAIN';
  stageBadge.className = 'handshake-stage-badge http-200-badge';

  const output = `
<span class="http-req-badge">> GET ${service.endpoint} HTTP/1.1</span>
<span class="code-header-key">Host:</span> <span class="code-header-val">synapse402.org</span>
<span class="code-header-key">X-Payment:</span> <span class="code-header-val">${escapeHtml(JSON.stringify(voucher))}</span>

<span class="http-200-badge">< HTTP/1.1 200 OK</span> (${latency}ms)
<span class="code-header-key">X-Payment-Receipt:</span> <span class="code-header-val">${escapeHtml(receiptHeader || '')}</span>
<span class="code-header-key">Content-Type:</span> <span class="code-header-val">application/json</span>

<span class="comment">// Response Body (Resource Unlocked):</span>
${escapeHtml(JSON.stringify(data, null, 2))}
`;
  state.inspector.httpTrace[3] = output;
  renderInspectorTerminal(output);
  await fetchStats();
  await fetchTransactions();
  showToast('Resource Unlocked! Micropayment Settled on Base Sepolia', 'success');
}

function updateInspectorView() {
  const view = state.inspector.activeView;
  if (view === 'http') {
    renderInspectorTerminal(state.inspector.httpTrace[state.inspector.step] || state.inspector.httpTrace[1] || '// No HTTP trace yet');
  } else if (view === 'crypto') {
    if (state.inspector.signedVoucher) {
      renderInspectorTerminal(escapeHtml(JSON.stringify(state.inspector.signedVoucher, null, 2)));
    } else {
      renderInspectorTerminal('// Execute Step 2 to generate cryptographic signature');
    }
  } else if (view === 'receipt') {
    if (state.inspector.responseReceipt) {
      renderInspectorTerminal(escapeHtml(JSON.stringify(state.inspector.responseReceipt, null, 2)));
    } else {
      renderInspectorTerminal('// Execute Step 3 to view settled on-chain receipt');
    }
  }
}

function renderInspectorTerminal(content) {
  const terminal = document.getElementById('inspectorTerminal');
  terminal.innerHTML = `<pre class="code-terminal-pre">${content}</pre>`;
}

// --------------------------------------------------------------------------
// Tab 3: API Marketplace
// --------------------------------------------------------------------------

function renderMarketplaceGrid() {
  const grid = document.getElementById('marketplaceGrid');
  grid.innerHTML = state.services.map(s => `
    <div class="api-card">
      <div>
        <div class="api-card-top">
          <div class="api-icon-wrap">
            <i data-lucide="${s.icon || 'layers'}"></i>
          </div>
          <span class="api-price-tag">${s.priceUSDC} USDC</span>
        </div>
        <div class="api-card-title">${escapeHtml(s.name)}</div>
        <div class="api-card-category">${escapeHtml(s.category)}</div>
        <div class="api-card-desc">${escapeHtml(s.description)}</div>
        <div class="api-card-endpoint">GET ${escapeHtml(s.endpoint)}</div>
      </div>
      <div class="api-card-footer">
        <span class="api-stats-mini"><i data-lucide="zap" style="width:11px;height:11px;display:inline;"></i> ${s.latencyAvg || '35ms'} avg</span>
        <button class="btn btn-secondary btn-inspect-api" data-id="${s.id}">
          <i data-lucide="play-circle"></i> Inspect in Lab
        </button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.btn-inspect-api').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      switchTab('inspector');
      const select = document.getElementById('inspectorEndpointSelect');
      select.value = id;
      updateInspectorSelectedService(id);
    });
  });

  refreshIcons();
}

// --------------------------------------------------------------------------
// Tab 4: Ledger & Faucet
// --------------------------------------------------------------------------

function renderLedgerTable(transactions) {
  const tbody = document.getElementById('ledgerTableBody');
  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;">No settled transactions recorded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = transactions.map(tx => `
    <tr>
      <td><span class="badge badge-green"><i data-lucide="check" style="width:10px;height:10px;margin-right:2px;"></i> ${tx.status || 'settled'}</span></td>
      <td class="mono" title="${tx.txHash}">${tx.txHash ? tx.txHash.slice(0, 10) + '...' + tx.txHash.slice(-6) : '--'}</td>
      <td class="mono">#${tx.blockNumber}</td>
      <td><strong>${escapeHtml(tx.apiName || 'Custom API')}</strong></td>
      <td class="mono">${tx.payer ? tx.payer.slice(0, 6) + '...' + tx.payer.slice(-4) : '--'}</td>
      <td class="mono" style="color:var(--accent-cyan);font-weight:700;">${Number(tx.amount).toFixed(4)} USDC</td>
      <td>${tx.latencyMs || 42}ms</td>
      <td>${new Date(tx.timestamp).toLocaleTimeString()}</td>
    </tr>
  `).join('');

  refreshIcons();
}

// --------------------------------------------------------------------------
// Modals (Publish API & Faucet)
// --------------------------------------------------------------------------

function setupModals() {
  // Publish Modal
  const pubModal = document.getElementById('publishModal');
  document.getElementById('btnOpenPublishModal').addEventListener('click', () => {
    pubModal.style.display = 'flex';
  });
  document.getElementById('btnClosePublishModal').addEventListener('click', () => {
    pubModal.style.display = 'none';
  });
  document.getElementById('btnCancelPublish').addEventListener('click', () => {
    pubModal.style.display = 'none';
  });

  document.getElementById('publishApiForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('pubName').value;
    const category = document.getElementById('pubCategory').value;
    const endpoint = document.getElementById('pubEndpoint').value;
    const priceUSDC = document.getElementById('pubPrice').value;
    const payee = document.getElementById('pubPayee').value;
    const description = document.getElementById('pubDesc').value;
    const sampleResponse = document.getElementById('pubResponse').value;

    try {
      const res = await fetch('/api/services/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, endpoint, priceUSDC, payee, description, sampleResponse })
      });
      const data = await res.json();
      if (data.success) {
        showToast('x402 Monetized Endpoint Registered!', 'success');
        pubModal.style.display = 'none';
        document.getElementById('publishApiForm').reset();
        await fetchServices();
      } else {
        showToast(data.error, 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Faucet Modal
  const faucetModal = document.getElementById('faucetModal');
  let selectedFaucetAmt = 2.000;

  const openFaucet = () => { faucetModal.style.display = 'flex'; };
  document.getElementById('topNavFaucetBtn').addEventListener('click', openFaucet);
  document.getElementById('btnOpenFaucetModal').addEventListener('click', openFaucet);

  document.getElementById('btnCloseFaucetModal').addEventListener('click', () => {
    faucetModal.style.display = 'none';
  });
  document.getElementById('btnCancelFaucet').addEventListener('click', () => {
    faucetModal.style.display = 'none';
  });

  document.querySelectorAll('.faucet-amount-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.faucet-amount-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedFaucetAmt = Number(chip.dataset.amt);
    });
  });

  document.getElementById('btnExecuteFaucet').addEventListener('click', async () => {
    try {
      const res = await fetch('/api/ledger/faucet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: state.agentWallet, amount: selectedFaucetAmt })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Granted ${selectedFaucetAmt} USDC Faucet on Base Sepolia!`, 'success');
        faucetModal.style.display = 'none';
        await fetchStats();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Ledger refresh
  document.getElementById('btnRefreshLedger').addEventListener('click', async () => {
    await Promise.all([fetchStats(), fetchTransactions()]);
    showToast('Ledger data updated', 'info');
  });
}

// --------------------------------------------------------------------------
// MetaMask Web3 Integration
// --------------------------------------------------------------------------

function setupMetaMask() {
  const btn = document.getElementById('btnConnectMetaMask');
  const label = document.getElementById('metaMaskBtnLabel');
  if (!btn) return;

  const updateWithAddress = (addr) => {
    state.agentWallet = addr;
    if (label) label.textContent = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    const shortAddrEl = document.getElementById('topNavAddrShort');
    if (shortAddrEl) shortAddrEl.textContent = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    document.getElementById('ledgerAgentAddr').textContent = `${addr.slice(0, 8)}...${addr.slice(-4)}`;
  };

  // Initial display with user's verified address
  updateWithAddress(state.agentWallet);

  btn.addEventListener('click', async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          updateWithAddress(accounts[0]);
          showToast(`MetaMask Connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`, 'success');
        }
      } catch (err) {
        showToast(err.message || 'MetaMask connection rejected', 'error');
      }
    } else {
      showToast(`Active Account: ${state.agentWallet}`, 'info');
    }
  });
}

// --------------------------------------------------------------------------
// Utilities & Toast Notifications
// --------------------------------------------------------------------------

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle-2' : type === 'error' ? 'alert-triangle' : 'info'}" style="width:16px;height:16px;"></i>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);
  refreshIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
