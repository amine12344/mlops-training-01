# MLOps Training - Node.js API

This is a simple Node.js API for MLOps training, featuring a basic Express server.

## Prerequisites

- Node.js (version 16 or higher)
- Docker (for containerized deployment)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/amine12344/mlops-training-01.git
   cd mlops-training-01
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Application

### Locally
```bash
npm start
```
The server will start on port 8090.

### Using Docker
1. Build the Docker image:
   ```bash
   docker build -f Dockerfile.vbad -t api-lab-test .
   ```

2. Run the container:
   ```bash
   docker run -p 8090:8090 api-lab-test
   ```

### Using Docker Compose
This repository includes a `docker-compose.yml` stack that starts:
- `proxy`: an NGINX reverse proxy on host port `8070`
- `api`: the API service built from `./api`
- `db`: a PostgreSQL database initialized with `mlops_db`

Run the full stack with:
```bash
docker-compose up --build
```

Then visit:
- `http://localhost:8070` for the proxied API

Stop and remove containers, networks, and volumes with:
```bash
docker-compose down -v
```

## Health Check
Run the health check script:
```bash
npm run health
```

## Project Structure
- `app.js`: Main application file
- `health.js`: Health check script
- `package.json`: Project dependencies and scripts
- `Dockerfile.vbad`: Docker configuration
- `.gitignore`: Git ignore rules
- `.dockerignore`: Docker ignore rules

## Ignoring Files
- `.gitignore`: Ensures that sensitive files, dependencies, and build artifacts are not committed to version control.
- `.dockerignore`: Optimizes Docker builds by excluding unnecessary files from the build context.
