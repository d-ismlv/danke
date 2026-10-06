<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/card-dark.png">
  <img src="docs/card-light.png" width="880" alt="A danke study card asking “Why does Kerberoasting work for any domain user?”, its answer, and the four grade keys">
</picture>

# danke

![Next.js](https://img.shields.io/badge/Next.js_16-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)
![FSRS](https://img.shields.io/badge/FSRS-spaced_repetition-6047E8)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![Self-hosted](https://img.shields.io/badge/self--hosted-0F7A55)
![MIT](https://img.shields.io/badge/License-MIT-green)

</div>

A self-hosted spaced-repetition app for flashcards you write yourself in Markdown.
Paste your notes in, press Study, and FSRS decides what comes back and when — everything lives in one SQLite file you own.

## Run

```bash
docker run -d --name danke -p 32323:32323 -e AUTH_PASSWORD=change-me -v danke-data:/app/data ghcr.io/d-ismlv/danke:latest
```

Or with Compose:

```bash
cat > docker-compose.yml <<'EOF'
services:
  danke:
    image: ghcr.io/d-ismlv/danke:latest
    ports:
      - "32323:32323"
    environment:
      - AUTH_PASSWORD=change-me
    volumes:
      - danke-data:/app/data
    restart: unless-stopped

volumes:
  danke-data:
EOF
docker compose up -d
```

Open <http://localhost:32323> and sign in with `change-me`.
