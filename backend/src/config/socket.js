// Socket.io instance holder
// Set by server.js, accessed by controllers

let io = null;

const setIO = (ioInstance) => {
  io = ioInstance;
};

const getIO = () => {
  return io;
};

module.exports = { setIO, getIO };
