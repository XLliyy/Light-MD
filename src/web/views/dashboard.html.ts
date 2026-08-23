export function renderDashboardHTML(botName: string): string {
  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${botName} — Control Center</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 500: '#10b981', 600: '#059669', 700: '#047857' }
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Inter:wght@400;500;600;700&display=swap');
    body { font-family: 'Inter', sans-serif; }
    .mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col antialiased selection:bg-brand-500 selection:text-zinc-950">

  <!-- Navigation Bar -->
  <header class="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-500 font-bold">
          ⚡
        </div>
        <div>
          <h1 class="text-sm font-bold text-zinc-100">${botName}</h1>
          <p class="text-xs text-zinc-400">High-Performance WhatsApp Gateway</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div id="statusBadge" class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300 transition">
          <span class="h-2 w-2 rounded-full bg-yellow-400 animate-pulse"></span>
          <span>Connecting...</span>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Grid Content -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">

    <!-- Left Column: Pairing & Actions -->
    <div class="lg:col-span-5 flex flex-col gap-6">

      <!-- Authentication Section -->
      <div class="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-400">Authentication Hub</h2>
          <span class="text-[10px] mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">Multi-Device</span>
        </div>

        <!-- Mode Toggle -->
        <div class="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 mb-6">
          <button id="tabQr" class="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 text-zinc-100 transition">QR Code</button>
          <button id="tabPair" class="flex-1 py-1.5 text-xs font-semibold rounded-lg text-zinc-400 hover:text-zinc-200 transition">Pairing Code</button>
        </div>

        <!-- QR Display -->
        <div id="qrSection" class="flex flex-col items-center justify-center min-h-[280px]">
          <div id="qrContainer" class="p-3 bg-white rounded-2xl shadow-2xl border border-zinc-700">
            <div class="w-56 h-56 flex items-center justify-center text-zinc-500 text-xs mono text-center px-4">
              Waiting for active QR stream...
            </div>
          </div>
          <p class="text-xs text-zinc-500 mt-4 text-center">Scan with WhatsApp &gt; Linked Devices &gt; Link a Device</p>
        </div>

        <!-- Pairing Code Section -->
        <div id="pairSection" class="hidden flex-col gap-4 min-h-[280px] justify-center">
          <div>
            <label class="block text-xs font-medium text-zinc-400 mb-1.5">WhatsApp Phone Number</label>
            <input id="phoneNumberInput" type="tel" placeholder="e.g. 6281234567890 (Country Code Included)" class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-brand-500 transition">
          </div>
          <button id="btnRequestCode" class="w-full bg-brand-600 hover:bg-brand-500 text-zinc-950 font-bold py-2.5 rounded-xl text-sm transition">
            Generate 8-Digit Pairing Code
          </button>
          <div id="codeDisplayWrapper" class="hidden mt-2 p-4 bg-zinc-950 border border-brand-500/40 rounded-xl text-center">
            <span class="text-xs text-zinc-400 block mb-1">Enter this code on your device:</span>
            <span id="pairCodeDisplay" class="mono text-2xl font-bold tracking-widest text-brand-500">----</span>
          </div>
        </div>
      </div>

      <!-- Quick Control Actions -->
      <div class="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">Operations</h2>
        <div class="grid grid-cols-2 gap-3">
          <button id="btnRestartSocket" class="p-3 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 text-xs font-semibold text-zinc-200 transition flex items-center justify-center gap-2">
            🔄 Restart Socket
          </button>
          <button id="btnClearLogs" class="p-3 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 text-xs font-semibold text-zinc-200 transition flex items-center justify-center gap-2">
            🧹 Clear Terminal
          </button>
        </div>
      </div>

    </div>

    <!-- Right Column: Metrics & Terminal Logs -->
    <div class="lg:col-span-7 flex flex-col gap-6">

      <!-- Real-time Metrics Tiles -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 shadow-lg">
          <span class="text-[11px] font-medium text-zinc-500 block">Uptime</span>
          <span id="valUptime" class="mono text-lg font-bold text-zinc-100">0s</span>
        </div>
        <div class="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 shadow-lg">
          <span class="text-[11px] font-medium text-zinc-500 block">Heap RAM</span>
          <span id="valMemory" class="mono text-lg font-bold text-zinc-100">0 MB</span>
        </div>
        <div class="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 shadow-lg">
          <span class="text-[11px] font-medium text-zinc-500 block">Ingested Msgs</span>
          <span id="valIngested" class="mono text-lg font-bold text-zinc-100">0</span>
        </div>
        <div class="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 shadow-lg">
          <span class="text-[11px] font-medium text-zinc-500 block">Commands Ran</span>
          <span id="valCommands" class="mono text-lg font-bold text-brand-500">0</span>
        </div>
      </div>

      <!-- Real-time Terminal Log Console -->
      <div class="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 flex-1 flex flex-col min-h-[440px] shadow-2xl">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-400">Live Traffic & Socket Stream</h2>
          </div>
          <span class="text-[11px] text-zinc-500 mono">WebSocket Sync</span>
        </div>
        <div id="terminal" class="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-y-auto max-h-[460px] mono text-xs space-y-1.5 shadow-inner">
          <div class="text-zinc-600">[System] Real-time logging pipe initialized. Awaiting events...</div>
        </div>
      </div>

    </div>
  </main>

  <script>
    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    let ws;

    const terminal = document.getElementById('terminal');
    const statusBadge = document.getElementById('statusBadge');
    const qrContainer = document.getElementById('qrContainer');
    const valUptime = document.getElementById('valUptime');
    const valMemory = document.getElementById('valMemory');
    const valIngested = document.getElementById('valIngested');
    const valCommands = document.getElementById('valCommands');

    function appendLog(timestamp, level, tag, msg) {
      const line = document.createElement('div');
      let color = 'text-zinc-400';
      if (level === 'success') color = 'text-emerald-400';
      if (level === 'warn') color = 'text-yellow-400';
      if (level === 'error') color = 'text-rose-400';

      line.className = 'leading-relaxed break-words';
      line.innerHTML = \`<span class="text-zinc-600">[\${timestamp}]</span> <span class="font-bold \${color}">[\${tag}]</span> \${escapeHtml(msg)}\`;
      terminal.appendChild(line);
      terminal.scrollTop = terminal.scrollHeight;
    }

    function escapeHtml(str) {
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function updateStatus(status) {
      if (status === 'connected') {
        statusBadge.innerHTML = '<span class="h-2 w-2 rounded-full bg-emerald-500"></span><span class="text-emerald-400 font-semibold">Connected</span>';
      } else if (status === 'connecting') {
        statusBadge.innerHTML = '<span class="h-2 w-2 rounded-full bg-yellow-400 animate-pulse"></span><span class="text-yellow-400 font-semibold">Connecting</span>';
      } else if (status === 'logged_out') {
        statusBadge.innerHTML = '<span class="h-2 w-2 rounded-full bg-rose-600"></span><span class="text-rose-500 font-semibold">Logged Out</span>';
      } else {
        statusBadge.innerHTML = '<span class="h-2 w-2 rounded-full bg-rose-500"></span><span class="text-rose-400 font-semibold">Disconnected</span>';
      }
    }

    function connectWs() {
      ws = new WebSocket(\`\${wsProtocol}//\${location.host}/ws\`);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'qr') {
            qrContainer.innerHTML = \`<img src="\${message.payload.dataUrl}" alt="WhatsApp QR" class="w-56 h-56 rounded-lg"/>\`;
          } else if (message.type === 'status') {
            updateStatus(message.payload);
          } else if (message.type === 'log') {
            appendLog(message.payload.timestamp, message.payload.level, message.payload.tag, message.payload.message);
          } else if (message.type === 'pairing_code') {
            document.getElementById('codeDisplayWrapper').classList.remove('hidden');
            document.getElementById('pairCodeDisplay').innerText = message.payload;
          } else if (message.type === 'metrics') {
            const d = message.payload;
            valUptime.innerText = \`\${d.uptimeSeconds}s\`;
            valMemory.innerText = \`\${d.memory.heapUsedMB} MB\`;
            valIngested.innerText = d.traffic.messagesReceived;
            valCommands.innerText = d.traffic.commandsExecuted;
          }
        } catch (err) {
          console.error('WS Parse Error:', err);
        }
      };

      ws.onclose = () => {
        updateStatus('disconnected');
        setTimeout(connectWs, 2000);
      };
    }

    connectWs();

    // Tab Switches
    const tabQr = document.getElementById('tabQr');
    const tabPair = document.getElementById('tabPair');
    const qrSection = document.getElementById('qrSection');
    const pairSection = document.getElementById('pairSection');

    tabQr.onclick = () => {
      tabQr.className = 'flex-1 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 text-zinc-100 transition';
      tabPair.className = 'flex-1 py-1.5 text-xs font-semibold rounded-lg text-zinc-400 hover:text-zinc-200 transition';
      qrSection.classList.remove('hidden');
      pairSection.classList.add('hidden');
    };

    tabPair.onclick = () => {
      tabPair.className = 'flex-1 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 text-zinc-100 transition';
      tabQr.className = 'flex-1 py-1.5 text-xs font-semibold rounded-lg text-zinc-400 hover:text-zinc-200 transition';
      pairSection.classList.remove('hidden');
      qrSection.classList.add('hidden');
    };

    // Pairing Request Trigger
    document.getElementById('btnRequestCode').onclick = async () => {
      const phoneInput = document.getElementById('phoneNumberInput');
      const phone = phoneInput.value.trim();
      if (!phone) return alert('Please enter a valid WhatsApp phone number.');

      try {
        const res = await fetch('/api/pair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to issue code');
        document.getElementById('codeDisplayWrapper').classList.remove('hidden');
        document.getElementById('pairCodeDisplay').innerText = json.code;
      } catch (err) {
        alert(err.message);
      }
    };

    document.getElementById('btnClearLogs').onclick = () => {
      terminal.innerHTML = '<div class="text-zinc-600">[System] Terminal output cleared.</div>';
    };

    document.getElementById('btnRestartSocket').onclick = async () => {
      if (confirm('Restart WhatsApp socket gateway?')) {
        await fetch('/api/restart', { method: 'POST' });
      }
    };
  </script>
</body>
</html>`;
}
