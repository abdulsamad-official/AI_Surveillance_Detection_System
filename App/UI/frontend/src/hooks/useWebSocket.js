import { useEffect, useState } from 'react';
import wsService from '../services/websocket';

export default function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  useEffect(() => {
    const onConnect    = ()     => setIsConnected(true);
    const onDisconnect = ()     => setIsConnected(false);
    const onMessage    = (data) => setLastMessage(data);

    wsService.on('connected',    onConnect);
    wsService.on('disconnected', onDisconnect);
    wsService.on('message',      onMessage);

    return () => {
      wsService.off('connected',    onConnect);
      wsService.off('disconnected', onDisconnect);
      wsService.off('message',      onMessage);
    };
  }, []);

  const send = (data) => wsService.send(data);

  return { isConnected, lastMessage, send };
}