# TSS PPM v2.0 Deployment Guide

This guide covers deploying TSS PPM v2.0 in various environments.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Docker Deployment](#docker-deployment)
4. [Production Deployment](#production-deployment)
5. [Environment Variables](#environment-variables)
6. [Keycloak Configuration](#keycloak-configuration)
7. [Database Setup](#database-setup)
8. [Monitoring & Health Checks](#monitoring--health-checks)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20+ | Frontend build, API runtime |
| npm | 10+ | Package management |
| Docker | 24+ | Container runtime |
| Docker Compose | 2.20+ | Container orchestration |
| Git | 2.40+ | Version control |

### Hardware Requirements

| Component | Development | Production |
|-----------|-------------|------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 10 GB | 50+ GB |
| Network | Local | HTTPS capable |

---

## Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/SimonvanAs/tss_ppm.git
cd tss_ppm
```

### 2. Frontend Development

```bash
cd hr-performance-app

# Install dependencies
npm install

# Start development server (auth disabled)
npm run dev

# Access at http://localhost:5173
```

### 3. API Development

```bash
cd api

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Start development server
npm run dev

# API available at http://localhost:3000
# Swagger docs at http://localhost:3000/documentation
```

### 4. Running Tests

```bash
# Frontend tests
cd hr-performance-app
npm run test:run       # Unit tests
npm run test:e2e       # E2E tests (requires dev server)

# API tests
cd api
npm run test:run       # Unit tests
npm run test:coverage  # With coverage report
```

---

## Docker Deployment

### Quick Start

```bash
# Clone and navigate to project
git clone https://github.com/SimonvanAs/tss_ppm.git
cd tss_ppm

# Create environment file
cp .env.example .env

# Edit environment variables
nano .env

# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f
```

### Services Overview

| Service | Port (Internal) | Port (External) | Purpose |
|---------|-----------------|-----------------|---------|
| caddy | 80, 443 | 80, 443 | Reverse proxy, HTTPS |
| frontend | 80 | - | React SPA (nginx) |
| api | 3000 | - | Fastify backend |
| whisper | 3001 | - | Speech-to-text |
| postgres | 5432 | - | Database |
| keycloak | 8080 | - | Authentication |

### Docker Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f [service]

# Rebuild specific service
docker compose build [service]

# Access container shell
docker compose exec [service] sh

# View running containers
docker compose ps
```

---

## Production Deployment

### 1. Server Preparation

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
apt install docker-compose-plugin

# Create deployment user
useradd -m -s /bin/bash tssppm
usermod -aG docker tssppm
```

### 2. Deploy Application

```bash
# Switch to deployment user
su - tssppm

# Clone repository
git clone https://github.com/SimonvanAs/tss_ppm.git
cd tss_ppm

# Create production environment file
cat > .env << 'EOF'
# Domain Configuration
DOMAIN=ppm.yourcompany.com

# Database (CHANGE THESE!)
DB_PASSWORD=your-secure-password-here

# Keycloak (CHANGE THESE!)
KC_ADMIN=admin
KC_ADMIN_PASSWORD=your-secure-admin-password

# API Configuration
NODE_ENV=production
JWT_SECRET=your-256-bit-secret-key

# Whisper Configuration
WHISPER_MODEL=small
WHISPER_COMPUTE_TYPE=int8
WHISPER_WORKERS=2
EOF

# Set secure permissions
chmod 600 .env

# Deploy
docker compose -f docker-compose.yml up -d --build
```

### 3. SSL/TLS Configuration

Caddy automatically obtains Let's Encrypt certificates when:
- Port 80 and 443 are accessible from the internet
- `DOMAIN` environment variable is set to your actual domain
- DNS is configured to point to your server

```bash
# Verify certificate status
docker compose exec caddy caddy list-certificates
```

### 4. Firewall Configuration

```bash
# Allow HTTP/HTTPS traffic
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DOMAIN` | Production domain | `ppm.example.com` |
| `DB_PASSWORD` | PostgreSQL password | `secure-password` |
| `KC_ADMIN` | Keycloak admin username | `admin` |
| `KC_ADMIN_PASSWORD` | Keycloak admin password | `secure-password` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WHISPER_MODEL` | `small` | Whisper model size (tiny/base/small/medium/large) |
| `WHISPER_COMPUTE_TYPE` | `int8` | Compute precision (int8/int16/float32) |
| `WHISPER_WORKERS` | `2` | Number of Gunicorn workers |
| `LOG_LEVEL` | `info` | API log level |

### Frontend Variables (Build-time)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_KEYCLOAK_URL` | `http://localhost:8080` | Keycloak server URL |
| `VITE_KEYCLOAK_REALM` | `tss-ppm` | Keycloak realm name |
| `VITE_KEYCLOAK_CLIENT_ID` | `tss-ppm-frontend` | Keycloak client ID |
| `VITE_AUTH_ENABLED` | `true` | Enable/disable authentication |
| `VITE_API_URL` | `/api/v1` | API base URL |

---

## Keycloak Configuration

### 1. Access Admin Console

After deployment, access Keycloak at:
- URL: `https://your-domain/auth`
- Username: Value of `KC_ADMIN`
- Password: Value of `KC_ADMIN_PASSWORD`

### 2. Create Realm

1. Click "Create Realm"
2. Name: `tss-ppm`
3. Click "Create"

### 3. Create Clients

#### Frontend Client
```
Client ID: tss-ppm-frontend
Client Protocol: openid-connect
Access Type: public
Valid Redirect URIs: https://your-domain/*
Web Origins: https://your-domain
```

#### API Client (for service-to-service)
```
Client ID: tss-ppm-api
Client Protocol: openid-connect
Access Type: confidential
Service Accounts Enabled: Yes
```

### 4. Configure Roles

Create the following realm roles:
- `employee` (default)
- `manager`
- `hr`
- `opco-admin`
- `tss-super-admin`

### 5. Identity Provider (Optional)

To enable Microsoft EntraID (Azure AD):

1. Go to Identity Providers
2. Add "OpenID Connect v1.0"
3. Configure:
   - Alias: `entra`
   - Authorization URL: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`
   - Token URL: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`
   - Client ID: Your Azure App Registration client ID
   - Client Secret: Your Azure App secret

---

## Database Setup

### Initial Setup

The database is automatically initialized when Docker starts. To seed with default data:

```bash
# Access API container
docker compose exec api sh

# Run seed script
npm run db:seed
```

### Migrations

```bash
# Create migration (development)
cd api
npx prisma migrate dev --name your_migration_name

# Apply migrations (production)
docker compose exec api npx prisma migrate deploy
```

### Backup

```bash
# Create backup
docker compose exec postgres pg_dump -U postgres tss_ppm > backup.sql

# Restore backup
cat backup.sql | docker compose exec -T postgres psql -U postgres tss_ppm
```

---

## Monitoring & Health Checks

### Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/v1/health` | Overall health status |
| `/api/v1/health/ready` | Readiness check |
| `/api/v1/health/live` | Liveness check |

### Docker Health Checks

All services include Docker health checks:

```bash
# View health status
docker compose ps

# Check specific service
docker inspect --format='{{.State.Health.Status}}' tss_ppm-api-1
```

### Log Aggregation

```bash
# View all logs
docker compose logs -f

# View specific service
docker compose logs -f api

# Export logs
docker compose logs --no-color > logs.txt
```

---

## Troubleshooting

### Common Issues

#### Keycloak Not Starting

```bash
# Check logs
docker compose logs keycloak

# Common fix: Wait for PostgreSQL
# Keycloak depends on postgres, ensure it's healthy first
docker compose restart keycloak
```

#### Database Connection Errors

```bash
# Verify PostgreSQL is running
docker compose exec postgres pg_isready

# Check connection from API
docker compose exec api nc -zv postgres 5432
```

#### SSL Certificate Issues

```bash
# Check Caddy logs
docker compose logs caddy

# Force certificate renewal
docker compose exec caddy caddy reload
```

#### Whisper Memory Issues

```bash
# Increase memory limit in docker-compose.yml
whisper:
  deploy:
    resources:
      limits:
        memory: 8G

# Or use smaller model
WHISPER_MODEL=base
```

### Reset Everything

```bash
# Stop and remove all containers, volumes
docker compose down -v

# Remove all images
docker compose down --rmi all

# Fresh start
docker compose up -d --build
```

---

## Updating

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose up -d --build

# Run any new migrations
docker compose exec api npx prisma migrate deploy
```

### Update Dependencies

```bash
# Update npm packages
npm update

# Rebuild Docker images
docker compose build --no-cache
```

---

## Security Checklist

Before going to production:

- [ ] Change all default passwords
- [ ] Configure proper `DOMAIN` for HTTPS
- [ ] Set up firewall rules
- [ ] Enable Keycloak brute force protection
- [ ] Review CORS settings
- [ ] Set up log aggregation
- [ ] Configure backup schedule
- [ ] Test restore procedure
- [ ] Enable MFA for admin accounts
- [ ] Review and apply security headers

---

## Support

- **Documentation:** [ROADMAP.md](../ROADMAP.md)
- **Security Issues:** Report via GitHub Security Advisories
- **Bug Reports:** [GitHub Issues](https://github.com/SimonvanAs/tss_ppm/issues)
