# Build context is the REPO ROOT (the backend imports from ml/):
#   docker build -f backend/Dockerfile -t vaultscan-backend .
FROM python:3.11-slim

WORKDIR /app

# Install deps first for layer caching.
COPY backend/requirements.txt backend/requirements.txt
COPY ml/requirements.txt ml/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy source.
COPY ml/ ml/
COPY backend/ backend/

# Train the model at build time so the image is self-contained (uses the
# synthetic dataset; drop a real ml/data/creditcard.csv in to train on it).
RUN python -m ml.train

ENV REPLAY_SPEED_TPS=10
EXPOSE 8000

# Cloud Run / Render provide $PORT; default to 8000 locally.
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
