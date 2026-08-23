<div align="center">

# ⚡ Bun WhatsApp Engine
### Ultra-Fast, Zero-Downtime WhatsApp Bot Template for Bun & TypeScript

[![Bun Version](https://img.shields.io/badge/Bun-v1.4+-f472b6?style=for-the-badge&logo=bun&logoColor=black)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Baileys](https://img.shields.io/badge/Baileys-Multi--Device-25d366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

<p align="center">
  A minimalist, production-ready WhatsApp Bot <b>starter template and architectural foundation</b>. Built from the ground up for maximum throughput, low memory footprint, and a seamless developer experience with <b>zero-downtime live hot-reloading</b>.
</p>

[Key Features](#-key-features) • [Installation](#-installation--quick-start) • [Configuration](#-configuration) • [Command Development](#-creating-commands) • [Web Dashboard](#-web-dashboard) • [Deployment](#-production-deployment)

<p align="center">
<img height="600" width="600" src="https://iili.io/Ctxj7GS.md.png" alt="stars" border="0"></a>
</p>

</div>

---

## 💡 Why This Template?

Most WhatsApp bot repositories are bloated with hundreds of unstructured plugins, suffer from memory leaks under heavy traffic, and force you to restart the entire bot (dropping the WhatsApp WebSocket connection) whenever you edit a command.

**Bun WhatsApp Engine** is engineered as a **clean, rock-solid base template**:
- 🚫 **No Feature Bloat:** Only essential administrative, diagnostic, and template commands included.
- ⚡ **Instant Live Hot-Reloading:** Create, edit, or delete commands on the fly without reconnecting or scanning QR codes again.
- 🧠 **Leak-Free Memory Safety:** Self-pruning generational LRU stores for messages, rate-limiters, and group metadata.
- 🏎 **Zero-Allocation Hot-Paths:** Direct pointer indexing for JID parsing and message unwrapping.
- 🌐 **Real-time Web Control Center:** Web dashboard for QR scanning, pairing code generation, live logs, and system telemetry.

---

## ✨ Key Features

- **Dynamic Command Auto-Loader:** Uses `Bun.Glob` to recursively discover and register command modules from `src/commands/**/*` on startup.
- **Zero-Downtime Hot Module Replacement (HMR):** Built-in file-watcher with atomic cache-busting swaps modified commands in memory within **~2ms** while keeping the Baileys socket active.
- **Dual Pairing Options:** Link via live-streaming QR Code on the Web Dashboard or request an 8-Digit Pairing Code directly via API/UI.
- **Pre-Indexed Group Telemetry:** Group permissions and admin rosters use $\mathcal{O}(1)$ `Set` lookups instead of $\mathcal{O}(N)$ array iterations.
- **Token-Bucket Rate Limiter:** Per-user command cooldowns with automatic TTL eviction.
- **Production Observability:** Built-in system metrics tracking RSS memory, Heap allocations, message ingestion throughput, and error rates.

---

## 📋 System Requirements

- **Operating System:** Linux (Ubuntu/Debian recommended), macOS, or Windows (via WSL2).
- **Runtime:** [Bun](https://bun.sh) (v1.4.0 or newer).

---

## 🚀 Installation & Quick Start

### 1. Install Bun

If you do not have Bun installed on your system, install it using the official command:

#### Linux & macOS:
```bash
curl -fsSL https://bun.sh/install | bash
```

#### Windows (PowerShell):
```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Verify your installation:
```bash
bun --version
```

---

### 2. Clone the Repository

```bash
git clone https://github.com/XLliyy/Bun-Whatsapp-bot.git
cd Bun-Whatsapp-bot
```

---

### 3. Install Dependencies

```bash
bun install
```

---

### 4. Configure Environment Variables

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

Open `.env` in your editor and configure your settings:

```env
# Application Brand
BOT_NAME="Bun WhatsApp Engine"

# Command Prefixes (comma-separated for multiple)
PREFIX="/"

# Bot Owner Numbers with country code (no '+' or '-' symbols)
OWNER_NUMBERS="6281234567890,6289876543210"

# Web Dashboard & Health Probe Port
PORT=3000

# Session Storage Path
SESSION_DIR="./sessions"

# Logger Level: fatal | error | warn | info | debug | trace | silent
LOG_LEVEL="silent"

# Max message frame retention in memory for retry callbacks
MAX_STORE_SIZE=5000

# Default per-command cooldown in milliseconds
DEFAULT_COOLDOWN_MS=1500
```

---

### 5. Start the Engine

#### Development Mode (with Live Hot-Reloading & Bun HMR):
```bash
bun run dev
```

#### Production Mode:
```bash
bun run start
```

Once running, open your browser and navigate to:
```
http://localhost:3000
```
Use the Web Dashboard to scan the **QR Code** or input your phone number to receive an **8-Digit Pairing Code**.

---

## 📂 Project Structure

```
Bun-Whatsapp-bot/
├── src/
│   ├── commands/                 # 📂 All command modules reside here (categorized)
│   │   ├── general/              # Public commands (ping, menu, stats, help)
│   │   ├── group/                # Group management commands (hidetag, tagall, groupinfo)
│   │   └── owner/                # Owner commands (eval, exec, restart, broadcast, reload)
│   ├── core/                     # ⚙️ Core engine infrastructure
│   │   ├── emitter.ts            # Typed event pipeline for logs and telemetry
│   │   ├── metrics.ts            # Live throughput and memory telemetry collector
│   │   ├── socket.ts             # Baileys Multi-Device socket lifecycle manager
│   │   └── store.ts              # Bounded LRU store with automatic TTL sweeps
│   ├── handlers/                 # 🎛 Ingestion and execution routers
│   │   ├── command.loader.ts     # Bun.Glob auto-loader & dynamic hot-reload watcher
│   │   ├── command.registry.ts   # Central command dictionary, alias mapper & cooldowns
│   │   └── message.handler.ts    # High-throughput packet ingestion pipeline
│   ├── middleware/               # 🛡 Sanitizers, context builders & role guards
│   │   ├── context.ts            # Fluent CommandContext builder with helper methods
│   │   └── sanitizer.ts          # Zero-allocation payload unpacker & JID parser
│   ├── web/                      # 🌐 Web Control Center
│   │   ├── views/
│   │   │   └── dashboard.html.ts # Embedded TailwindCSS Real-Time Dashboard UI
│   │   └── server.ts             # Bun.serve HTTP and WebSocket server
│   ├── config.ts                 # Validated environment configuration singleton
│   └── index.ts                  # Engine bootstrap & graceful shutdown hooks
├── .env.example                  # Environment variable blueprint
├── package.json                  # Project manifest and script targets
├── tsconfig.json                 # Strict TypeScript configuration
└── README.md                     # Documentation
```

---

## 🛠 Creating Commands

To create a new command, create a `.ts` file inside any subfolder under `src/commands/`. The dynamic auto-loader will automatically detect, validate, and load it into memory.

### Basic Command Example

`src/commands/general/hello.ts`:
```ts
import type { Command } from '../../handlers/command.registry';

export const helloCommand: Command = {
  name: 'hello',
  aliases: ['hi', 'greet'],
  category: 'General',
  description: 'Replies with a personalized greeting',
  usage: 'hello',
  cooldownMs: 3000,
  execute: async (ctx) => {
    await ctx.reply(`👋 Hello, @${ctx.senderNumber}! Welcome to ${ctx.clean.senderName}.`);
  },
};
```

---

### Protected Group & Admin Command Example

`src/commands/group/kick.ts`:
```ts
import type { Command } from '../../handlers/command.registry';

export const kickCommand: Command = {
  name: 'kick',
  aliases: ['remove'],
  category: 'Group',
  description: 'Removes a mentioned participant from the group',
  usage: 'kick @user',
  isGroupOnly: true,     // Only runs in groups
  isAdminOnly: true,     // Requires the user to be a Group Admin
  isBotAdminOnly: true,  // Requires the bot to be a Group Admin
  execute: async (ctx) => {
    const target = ctx.mentionedJids[0] || ctx.clean.quoted?.participant;

    if (!target) {
      await ctx.reply('⚠️ Please mention or quote the user you wish to kick.');
      return;
    }

    await ctx.sock.groupParticipantsUpdate(ctx.remoteJid, [target], 'remove');
    await ctx.reply(`👢 Successfully removed @${target.split('@')[0]} from the group.`);
  },
};
```

---

### Command Interface Reference

```ts
export interface Command {
  readonly name: string;                      // Primary command trigger
  readonly aliases?: readonly string[];       // Alternative triggers
  readonly category: string;                  // Menu classification
  readonly description: string;               // Help summary
  readonly usage?: string;                    // Usage manual
  readonly isOwner?: boolean;                 // Owner-only restriction
  readonly isGroupOnly?: boolean;             // Group-only restriction
  readonly isAdminOnly?: boolean;             // Sender group admin restriction
  readonly isBotAdminOnly?: boolean;          // Bot group admin restriction
  readonly cooldownMs?: number;               // Custom rate-limit cooldown
  execute(ctx: CommandContext): Promise<void>; // Execution logic
}
```

---

### `CommandContext` Helper Methods

Every `execute(ctx)` receives an optimized `CommandContext` object:

| Property / Method | Type | Description |
| :--- | :--- | :--- |
| `ctx.sock` | `WASocket` | Raw Baileys socket instance. |
| `ctx.remoteJid` | `string` | Normalized JID of the current chat/group. |
| `ctx.sender` | `string` | Normalized JID of the message author. |
| `ctx.senderNumber` | `string` | Numeric phone digits extracted without string splits. |
| `ctx.isOwner` | `boolean` | `true` if the sender's number is listed in `OWNER_NUMBERS`. |
| `ctx.isGroup` | `boolean` | `true` if invoked inside a WhatsApp group. |
| `ctx.args` | `string[]` | Array of parsed string arguments following the command name. |
| `ctx.reply(text, quoted?)` | `Promise<WebMessageInfo>` | Replies with text; quotes the original message by default. |
| `ctx.replyWithMentions(text, mentions)` | `Promise<WebMessageInfo>` | Replies with explicit JID mentions. |
| `ctx.react(emoji)` | `Promise<WebMessageInfo>` | Reacts to the incoming message with an emoji. |
| `ctx.send(content, options?)` | `Promise<WebMessageInfo>` | Sends custom Baileys payload (images, audio, documents, etc.). |
| `ctx.isSenderAdmin()` | `Promise<boolean>` | $\mathcal{O}(1)$ check if the sender is an admin of the group. |
| `ctx.isBotAdmin()` | `Promise<boolean>` | $\mathcal{O}(1)$ check if the bot is an admin of the group. |
| `ctx.getGroupMetadata()` | `Promise<GroupMetadata>` | Returns cached group metadata. |

---

## 🌐 Web Dashboard

The built-in web dashboard provides real-time control and system observability directly in the browser at `http://localhost:3000`:

- **Live QR Stream:** Dynamically displays freshly generated QR codes over WebSockets.
- **Pairing Code Generator:** Input a phone number to generate an 8-digit WhatsApp linking code.
- **Real-Time Terminal:** Streams internal engine logs, command executions, and errors.
- **Live Telemetry:** Tracks uptime, memory allocation (Heap & RSS), total packet ingestion, and command throughput.
- **Rest APIs:**
  - `GET /api/health` — Container health checks (returns 200 OK when connected).
  - `GET /api/metrics` — JSON snapshot of current performance telemetry.
  - `POST /api/pair` — Programmatic pairing code issuance (`{"phone": "..."}`).
  - `POST /api/restart` — Soft socket restart endpoint.

---

## ⚡ Performance & Complexity Breakdown

| Pipeline Stage | Baseline Approach | Bun Engine Optimization | Complexity |
| :--- | :--- | :--- | :--- |
| **JID Normalization** | Multiple `.split()` & RegEx instantiation | Index-based byte scanner | $\mathcal{O}(S)$ Zero Allocations |
| **Message Unwrapping** | Recursive call stack traversal | Flat `while` loop unwrapper | $\mathcal{O}(D)$ Iterative |
| **Admin Check** | Array linear scan: `participants.find()` | Pre-indexed `Set<string>` lookup | $\mathcal{O}(1)$ Constant |
| **Cache Storage** | Native JS Object / Unbounded Map | Bounded LRU + Generational TTL Sweeper | $\mathcal{O}(1)$ Eviction |
| **Command Lookup** | Iterative array scan | Dual-keyed Hash Map | $\mathcal{O}(1)$ Lookup |

---

## 🚢 Production Deployment

### Using Systemd (Linux)

Create a system service `/etc/systemd/system/Bun-Whatsapp-bot.service`:

```ini
[Unit]
Description=Bun WhatsApp Engine
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/Bun-Whatsapp-bot
ExecStart=/root/.bun/bin/bun run start
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable Bun-Whatsapp-bot
sudo systemctl start Bun-Whatsapp-bot
```

---

### Using Docker

Create a `Dockerfile` in the root directory:

```dockerfile
FROM oven/bun:1-alpine
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

COPY . .

EXPOSE 3000
CMD ["bun", "run", "start"]
```

Build and run the container:
```bash
docker build -t Bun-Whatsapp-bot .
docker run -d --name Bun-Whatsapp-bot -p 3000:3000 -v $(pwd)/sessions:/app/sessions Bun-Whatsapp-bot
```

---

## 🛡 Security & Best Practices

1. **Keep Sessions Secure:** Never commit the `sessions/` directory or share session credentials publicly. Keep it in `.gitignore`.
2. **Owner Commands:** Commands like `eval` and `exec` give root access to your runtime and host system. Ensure `OWNER_NUMBERS` in `.env` only contains numbers you control.
3. **Paced Broadcasts:** When broadcasting to large numbers of groups, use paced batches (included in `src/commands/owner/broadcast.ts`) to avoid spam detection.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built for the modern web with Bun, TypeScript, and Baileys.</sub>
</div>
