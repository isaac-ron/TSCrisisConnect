# Portable image for the ML service. Render runs it natively (see render.yaml);
# this is for local use or any Docker host.
FROM python:3.12-slim

RUN useradd -m -u 1000 user
USER user
# MALLOC_ARENA_MAX: glibc otherwise gives each request thread its own heap arena,
# which added ~100 MB under concurrent load in testing
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    MALLOC_ARENA_MAX=2
WORKDIR $HOME/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# The int8 ONNX models (~130 MB each) are downloaded from the Hugging Face Hub on startup
COPY --chown=user app.py classifier.py labels.py ./

EXPOSE 8000
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
