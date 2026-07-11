# X99

X99 is a lightweight WhatsApp automation bot built with Bun, TypeScript and Baileys. It connects to WhatsApp, preserves session state for reliable restarts and routes incoming messages through a modular command system that makes it easy to extend.

## Disclaimer

X99 is intended for personal, educational and experimental use. Please use it responsibly and in accordance with WhatsApp's terms of service and local laws. Avoid spamming users or sending unsolicited messages.

## Why X99?

This project is built to turn a simple WhatsApp chat into a responsive automation layer with minimal setup:

- Fast, reliable WhatsApp connectivity for message-driven automation.
- Persistent authentication so the bot can reconnect without re-pairing every time.
- A command architecture that lets new features be added without rewriting the core flow.
- Lightweight, maintainable code that is easy to extend for personal bots, communities or internal tools.

## Features

- WhatsApp connection setup with Baileys.
- Local authentication persistence for session stability.
- Dynamic command loading from the commands folder.
- Built-in commands:
  - /ping: Checks responsiveness and reports latency.
  - /test: Echoes provided arguments or reports when none are given.
- Structured logging with pino.

## Prerequisites

- Bun 1.3 or newer.
- A valid none personal phone number for WhatsApp pairing.
- An active internet connection.

## Quick Start

### 1. Install dependencies

```bash
bun install
```

### 2. Configure pairing information

You can optionally set a phone number in your environment:

```bash
PAIRING_CODE_PHONE_NUMBER=your_phone_number
```

If this variable is not set, the bot will prompt for a phone number when it starts.

### 3. Run the bot

```bash
bun run dev
```

When the bot starts for the first time, it will prepare auth storage and prompt for WhatsApp pairing details. If pairing is required, it will print a pairing code that you can enter in WhatsApp.

## Configuration

| Variable                    | Description                                          | Default             |
| --------------------------- | ---------------------------------------------------- | ------------------- |
| `PAIRING_CODE_PHONE_NUMBER` | Optional phone number used for pairing-code requests | Prompted at startup |

## Project Structure

The main source files are organized as follows:

- [src/index.ts](src/index.ts): application entry point and shutdown handling
- [src/connection.ts](src/connection.ts): WhatsApp connection setup, listeners, and reconnect logic
- [src/handlers/message.handler.ts](src/handlers/message.handler.ts): message parsing and command dispatch
- [src/commands](src/commands): command modules such as ping and test
- [src/auth/state.ts](src/auth/state.ts): local authentication state persistence
- [src/utils/logger.ts](src/utils/logger.ts): logging setup

## Available Commands

- /ping: Sends a ping reply and reports latency in milliseconds.
- /test: Returns the arguments supplied to the command, or a default message if none were provided.

## Development

To add a new command:

1. Create a new file in [src/commands](src/commands) with the suffix `.command.ts`
2. Export a default command object with:
   - `name`
   - `aliases` (optional)
   - `description`
   - `execute`
3. Restart the bot so the command loader can discover it

A simple command shape looks like this:

```ts
const myCommand = {
  name: 'hello',
  description: 'Says hello',
  execute: async (sock, message, args) => {
    await message.reply('Hello from X99!');
  },
};

export default myCommand;
```

## Troubleshooting

- If the bot does not respond, confirm that it is connected and that the message starts with the expected command prefix `/`.
- If authentication fails, remove the local auth state folder and run the bot again to re-authenticate.
- If a command is not found, verify that the command file exists in [src/commands](src/commands) and that it exports a valid `execute` function.

## Notes

- Authentication state is stored locally in the `auth_state` directory.
- The bot logs out gracefully when it receives a shutdown signal.
- The current command set is intentionally small and easy to extend.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
