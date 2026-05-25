import { io } from "socket.io-client";
import { API_BASE } from "./api";

// Single shared socket — created once, reused everywhere.
// withCredentials sends the JWT cookie so the server can verify identity at connect time.
export const socket = io(API_BASE, {
  withCredentials: true,
  autoConnect: false,   // we manually connect after the user is known
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
});
