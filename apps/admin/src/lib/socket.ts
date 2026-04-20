import { io } from 'socket.io-client';

export const socket = io(process.env.NEXT_PUBLIC_API_URL as string, {
  autoConnect: false,
});

export function connectSocket(token: string) {
  socket.auth = { token };
  socket.connect();
}
