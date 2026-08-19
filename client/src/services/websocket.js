export class HarnessWebSocket {
  constructor(onMessage, onStatusChange) {
    this.ws = null;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
    this.reconnectTimer = null;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.onStatusChange('connected');
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.onMessage(data);
        } catch (e) {
          console.error('WS Parse Error', e);
        }
      };

      this.ws.onclose = () => {
        this.onStatusChange('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('WS Error:', err);
        this.onStatusChange('error');
      };
    } catch (e) {
      this.onStatusChange('error');
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 3000);
    }
  }

  send(type, payload = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
  }
}
