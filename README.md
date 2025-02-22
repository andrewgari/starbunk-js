# 🤖 BunkBot Discord Bot

A powerful Discord bot designed for seamless cross-server communication and community management.

## ✨ Features

- 🔄 **Cross-Server Sync**: Bridge channels between Snowbunk and StarBunk communities
- 🎮 **Smart Message Relay**: Intelligent webhook system for natural communication flow
- 🎵 **Media Support**: High-quality audio playback with ffmpeg integration
- 🐳 **Modern Deployment**: Containerized with Docker for reliable hosting
- 🔒 **Secure Design**: Runs with non-root user in production

## 🚀 Getting Started

### Prerequisites

- Node.js 20 or higher
- Docker (optional for containerized deployment)
- Discord Bot Token
- Server Admin permissions

### 🛠️ Development Setup

1. Clone the repository:

    ```bash
    git clone https://github.com/yourusername/bunkbot.git
    cd bunkbot
    ```

2. Create `.env` file with required configuration:

    ```env
    DISCORD_TOKEN=your_bot_token
    NODE_ENV=development
    ```

3. Install dependencies:

    ```bash
    npm install
    ```

4. Start development server:
    ```bash
    npm run dev
    ```

### 🐳 Docker Deployment

1. Build and run with Docker Compose:

    ```bash
    docker-compose -f docker-compose.dev.yml up --build
    ```

2. For production:
    ```bash
    docker-compose up -d
    ```

## 🔧 Configuration

- Configure server IDs in `src/discord/guildIDs.ts`
- Adjust webhook settings in `src/webhooks/webhookService.ts`
- Customize bot permissions in Discord Developer Portal

## 📚 Documentation

For detailed API documentation and advanced configuration options, please visit our [Wiki](https://github.com/yourusername/bunkbot/wiki).

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
