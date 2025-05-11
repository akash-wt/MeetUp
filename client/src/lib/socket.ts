import { io } from "socket.io-client";

const socket = io("http://localhost:5080");

export default socket;
