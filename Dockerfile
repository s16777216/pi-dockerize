FROM node:22-bookworm-slim

# 安裝編譯 node-pty 所需的原生依賴與基本工具
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 全域安裝 pi-coding-agent 與 pi-web
RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent && \
    npm install -g @jmfederico/pi-web --allow-scripts=node-pty

# 設定環境變數
ENV PI_WEB_HOST=0.0.0.0
ENV PI_WEB_PORT=8504
ENV SHELL=/bin/bash

WORKDIR /workspace

# 複製並設定啟動腳本
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8504

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
