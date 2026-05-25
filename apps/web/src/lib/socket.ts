import { io } from 'socket.io-client';

export const socket = io(process.env.NEXT_PUBLIC_API_URL as string, {
  autoConnect: false,
  reconnection: false,
});

export function connectSocket(token: string) {
  // Socket.io is not supported on the current serverless API deployment.
  // Disable silently to avoid console errors.
  if (process.env.NEXT_PUBLIC_ENABLE_SOCKET !== 'true') return;
  socket.auth = { token };
  socket.connect();
}
