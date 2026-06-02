FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=10000

WORKDIR /app

# Install system dependencies if any are needed (e.g. git or curl)
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application files
COPY . .

# Expose port 10000 for Telegram webhook
EXPOSE 10000

# Run the Telegram bot
CMD ["python", "bot.py"]
