export class HarnessWebSocket {
  constructor(onMessage, onStatusChange) {
    this.ws = null;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
    this.reconnectTimer = null;
    this.pingInterval = null;
    this.listeners = new Set();
    this.connectionAttempts = 0;
  }

  addListener(cb) {
    if (typeof cb === 'function') {
      this.listeners.add(cb);
    }
  }

  removeListener(cb) {
    this.listeners.delete(cb);
  }

  getWsUrls() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const urls = [`${protocol}//${host}/ws`];

    // In dev mode, also add direct backend port 3001 as fallback
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      urls.push(`ws://${window.location.hostname}:3001/ws`);
    }

    return urls;
  }

  connect() {
    this.disconnect(false);

    const urls = this.getWsUrls();
    const targetUrl = urls[this.connectionAttempts % urls.length];

    try {
      this.ws = new WebSocket(targetUrl);

      this.ws.onopen = () => {
        this.connectionAttempts = 0;
        if (this.onStatusChange) this.onStatusChange('connected');
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

        // Start heartbeat ping
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PONG') return; // Handled heartbeat
          if (this.onMessage) this.onMessage(data);
          this.listeners.forEach((cb) => {
            try {
              cb(data);
            } catch (err) {
              console.error('Error in WS listener:', err);
            }
          });
        } catch (e) {
          console.error('WS Parse Error', e);
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        if (this.onStatusChange) this.onStatusChange('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('WS Connection Error on', targetUrl, err);
        this.stopHeartbeat();
        if (this.onStatusChange) this.onStatusChange('disconnected');
      };
    } catch (e) {
      if (this.onStatusChange) this.onStatusChange('disconnected');
      this.scheduleReconnect();
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      this.send('PING', { time: Date.now() });
    }, 15000);
  }

  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.connectionAttempts += 1;
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 2500);
    }
  }

  send(type, payload = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  disconnect(permanent = true) {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    if (permanent && this.onStatusChange) {
      this.onStatusChange('disconnected');
    }
  }
}
