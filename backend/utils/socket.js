// Singleton holder for the Socket.io server instance.
// server.js calls setIO() once on startup; controllers call getIO() at runtime.
// This breaks the server.js ↔ messageController.js circular import.
let _io = null;

export const setIO = (io) => { _io = io; };
export const getIO = () => _io;
