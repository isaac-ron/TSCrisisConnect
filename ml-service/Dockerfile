# Image for a Hugging Face Docker Space (free CPU tier). Also runs anywhere else with Docker.
FROM python:3.11-slim

# Spaces run the container as UID 1000
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1
WORKDIR $HOME/app

# CPU-only torch wheel: the default one bundles CUDA and is several GB
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir torch==2.14.1 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

ENV BINARY_MODEL=ron4444444/crisis-binary-model \
    SEVERITY_MODEL=ron4444444/crisis-severity-model

# Bake the weights into the image so a Space waking from sleep doesn't re-download them
RUN python -c "import os; from huggingface_hub import snapshot_download; [snapshot_download(os.environ[k]) for k in ('BINARY_MODEL', 'SEVERITY_MODEL')]"

COPY --chown=user app.py labels.py ./

EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
