Infrastructure Overview: barczynski.dev

This document outlines the architecture, services, and deployment workflows for the barczynski.dev self-hosted environment.

🏗️ High-Level Architecture

The infrastructure is built around a single Virtual Private Server (VPS) running Linux, managed entirely by Coolify (an open-source, self-hosted PaaS). Cloudflare acts as the DNS provider, CDN, and first line of defense (SSL/Proxy).

Domain: barczynski.dev

DNS & Security: Cloudflare (Strict SSL, Proxy enabled)

Server Management: Coolify

Reverse Proxy: Traefik (Integrated with Coolify)

Containerization: Docker

🌐 Network & DNS Configuration (Cloudflare)

All subdomains are managed via Cloudflare and proxied (orange cloud enabled) to the VPS IP address (46.225.25.197).

Subdomain / Record

Type

Target IP

Proxy Status

Purpose

barczynski.dev

A

46.225.25.197

Proxied

Main portfolio/website (Planned)

panel

A

46.225.25.197

Proxied

Coolify Management Dashboard

db

A

46.225.25.197

Proxied

Database GUI (CloudBeaver)

apps

A

46.225.25.197

Proxied

Hosted web applications & games

cloud

A

46.225.25.197

Proxied

Nextcloud instance (Optional)

💾 Databases & Data Management

Engine: PostgreSQL (Deployed via Coolify Services)

Network: Attached to the internal Coolify Docker network. Not exposed directly to the public internet for security reasons.

Management GUI: CloudBeaver (https://db.barczynski.dev)

Deployed as a custom Docker Image (dbeaver/cloudbeaver:latest).

Configured to expose port 8978.

Connects to the database using the internal Docker container hostname (e.g., josks4owwg4kkwwcwc0o0wg8).

⚙️ CI/CD & Deployment Workflow

The deployment process is fully automated utilizing Coolify's GitHub App integration.

Development: Code is written locally and tested.

Push: Developer commits and pushes code to the main branch of the private GitHub repository.

Webhook Trigger: GitHub sends a webhook payload to Coolify.

Build & Deploy:

Coolify pulls the latest commit.

Detects the Build Pack: Dockerfile.

Builds the new Docker image in isolation.

Gracefully shuts down the old container and starts the new one.

Traefik automatically routes traffic to the newly spun-up container without downtime.

🔒 Security & Backups

SSL/TLS: Handled automatically by Cloudflare (Edge Certificates) and Traefik (Let's Encrypt for internal routing).

Firewall: Only ports 80 (HTTP), 443 (HTTPS), and 22 (SSH) need to be open on the VPS. Traefik handles the rest internally.

Secrets: API keys, database passwords, and environment variables are securely injected into containers via Coolify's Environment Variables tab.