const WS_URL = 'ws://localhost:8000/ws';

class WebSocketService {
  constructor() {
    this.socket          = null;
    this.listeners       = {};
    this.reconnectDelay  = 3000;
    this.maxDelay        = 15000;
    this.currentDelay    = 3000;
    this.isConnected     = false;
    this.shouldConnect   = true;
    this.reconnectTimer  = null;
  }

  connect() {
    if (!this.shouldConnect) return;
    if (this.socket &&
        (this.socket.readyState === WebSocket.OPEN ||
         this.socket.readyState === WebSocket.CONNECTING)) return;

    try {
      this.socket = new WebSocket(WS_URL);

      this.socket.onopen = () => {
        this.isConnected   = true;
        this.currentDelay  = this.reconnectDelay; // Reset delay
        console.log('[WS] Connected');
        this._emit('connected', {});
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._emit('message', data);
          if (data.type) this._emit(data.type, data);
        } catch (e) {}
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this._emit('disconnected', {});
        // Exponential backoff
        if (this.shouldConnect) {
          this.reconnectTimer = setTimeout(() => {
            this.currentDelay = Math.min(
              this.currentDelay * 1.5,
              this.maxDelay
            );
            this.connect();
          }, this.currentDelay);
        }
      };

      this.socket.onerror = () => {
        // Silent — onclose handles retry
      };

    } catch (e) {
      console.warn('[WS] Connection failed — retrying...');
      if (this.shouldConnect) {
        this.reconnectTimer = setTimeout(
          () => this.connect(),
          this.currentDelay
        );
      }
    }
  }

  disconnect() {
    this.shouldConnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.socket) {
      this.socket.onclose = null;
      try { this.socket.close(); } catch (e) {}
      this.isConnected = false;
    }
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try { this.socket.send(JSON.stringify(data)); } catch (e) {}
    }
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(
      cb => cb !== callback
    );
  }

  _emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => {
      try { cb(data); } catch (e) {}
    });
  }
}

const wsService = new WebSocketService();
export default wsService;