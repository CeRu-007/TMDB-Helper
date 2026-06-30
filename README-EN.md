<div align="center">

<img src="https://github.com/user-attachments/assets/7fabd3b5-dc7d-416f-83f8-ad79d223adc9" alt="TMDB-Helper Logo" width="200">

# TMDB-Helper

**A TMDB Media Maintenance Tool**

[![Version](https://img.shields.io/badge/version-0.7.5-blue.svg)](https://github.com/CeRu-007/TMDB-Helper/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-supported-brightgreen.svg)](https://hub.docker.com/r/ceru007/tmdb-helper)

[中文](README.md) · [Quick Start](#quick-start) · [Deployment](#deployment) · [Docs](https://github.com/CeRu-007/TMDB-Helper/wiki) · [Releases](https://github.com/CeRu-007/TMDB-Helper/releases)

<img width="2489" height="1352" alt="image" src="https://github.com/user-attachments/assets/7a599a85-3a42-4d31-a4a8-6ba0569d2093" />

</div>

---

## Features

> This project is fully developed with AI assistance (AI Vibe Coding). Please bear with us as we're still learning.

- Entry Management - Maintenance list, card/table views, batch editing
- Scheduled Tasks - Auto scrape and import to TMDB
- Integrated Tools - TMDB-Import visual interface, CSV editor
- AI Episode Synopsis - Generate titles and summaries from subtitles
- Hard Subtitle Extract - Extract embedded subtitles from video
- Video Screenshot - Extract keyframe images
- Image Crop - Crop to TMDB-compliant ratios
- Media News - Upcoming and recently aired content
- Watch Schedule - Aggregates Bilibili/iQiyi/Tencent Video schedules
- Streaming Nav - Quick access to global streaming platforms
- Image Recognition - Identify movies/TV shows from images
- AI Chat - Multi-turn conversation assistant
- Data Import/Export - JSON/CSV format
- Multiple Themes - 15+ preset themes
- Multi-language - Chinese, English, Japanese, Korean, etc.

## Deployment

### Docker (Recommended)

```bash
docker-compose up -d
```

Or run manually:

```bash
docker run -d \
  --name tmdb-helper \
  -p 4949:4949 \
  -v tmdb_data:/app/data \
  -e JWT_SECRET=your_jwt_secret_key \
  ceru007/tmdb-helper:latest
```

### Desktop

Download from [GitHub Releases](https://github.com/CeRu-007/TMDB-Helper/releases).

### Web

```bash
git clone https://github.com/CeRu-007/TMDB-Helper.git
cd TMDB-Helper
pnpm install
pnpm dev
```

Requires Node.js 22+.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | - | JWT secret (**required in production**) |
| `SESSION_EXPIRY_DAYS` | `7` | Session expiry (days) |
| `PORT` | `4949` | Application port |

## Documentation

For detailed usage instructions, see the [Wiki](https://github.com/CeRu-007/TMDB-Helper/wiki).

## Contributing

Issues and Pull Requests are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/xxx`)
3. Commit changes (`git commit -m 'Add xxx'`)
4. Push to the branch (`git push origin feature/xxx`)
5. Open a Pull Request

## License

[MIT](LICENSE)

## Acknowledgments

- [fzlins/TMDB-Import](https://github.com/fzlins/TMDB-Import) - TMDB data import tool
