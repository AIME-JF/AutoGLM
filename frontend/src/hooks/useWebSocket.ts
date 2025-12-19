import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketOptions {
    onMessage?: (data: any) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (error: Event) => void;
    heartbeatInterval?: number; // 心跳间隔（毫秒）
    reconnectDelay?: number; // 重连延迟（毫秒）
    maxReconnectAttempts?: number;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export function useWebSocket(url: string | null, options: UseWebSocketOptions = {}) {
    const {
        onMessage,
        onOpen,
        onClose,
        onError,
        heartbeatInterval = 30000,
        reconnectDelay = 3000,
        maxReconnectAttempts = 5,
    } = options;

    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [reconnectCount, setReconnectCount] = useState(0);

    const wsRef = useRef<WebSocket | null>(null);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const shouldReconnectRef = useRef(true);

    // 清理心跳定时器
    const clearHeartbeat = useCallback(() => {
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
    }, []);

    // 清理重连定时器
    const clearReconnectTimeout = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
    }, []);

    // 启动心跳
    const startHeartbeat = useCallback(() => {
        clearHeartbeat();
        heartbeatRef.current = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'ping' }));
            }
        }, heartbeatInterval);
    }, [heartbeatInterval, clearHeartbeat]);

    // 连接 WebSocket
    const connect = useCallback(() => {
        if (!url) return;

        setStatus('connecting');
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            setStatus('connected');
            setReconnectCount(0);
            startHeartbeat();
            onOpen?.();
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // 忽略 pong 响应
                if (data.type === 'pong') return;
                onMessage?.(data);
            } catch (e) {
                console.error('WebSocket message parse error:', e);
            }
        };

        ws.onclose = () => {
            setStatus('disconnected');
            clearHeartbeat();
            onClose?.();

            // 自动重连
            if (shouldReconnectRef.current && reconnectCount < maxReconnectAttempts) {
                setStatus('reconnecting');
                reconnectTimeoutRef.current = setTimeout(() => {
                    setReconnectCount((c) => c + 1);
                    connect();
                }, reconnectDelay);
            }
        };

        ws.onerror = (error) => {
            onError?.(error);
        };
    }, [url, onMessage, onOpen, onClose, onError, startHeartbeat, clearHeartbeat, reconnectCount, reconnectDelay, maxReconnectAttempts]);

    // 断开连接
    const disconnect = useCallback(() => {
        shouldReconnectRef.current = false;
        clearHeartbeat();
        clearReconnectTimeout();
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setStatus('disconnected');
    }, [clearHeartbeat, clearReconnectTimeout]);

    // 发送消息
    const send = useCallback((data: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);

    // URL 变化时重新连接
    useEffect(() => {
        if (url) {
            shouldReconnectRef.current = true;
            connect();
        }

        return () => {
            disconnect();
        };
    }, [url]);

    return {
        status,
        reconnectCount,
        send,
        disconnect,
        reconnect: connect,
    };
}
