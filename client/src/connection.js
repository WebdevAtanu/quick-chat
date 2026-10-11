import { io } from 'socket.io-client';

export function connection() {
    const uri = import.meta.env.VITE_API_BASE_URL;
    return io(uri);
}
