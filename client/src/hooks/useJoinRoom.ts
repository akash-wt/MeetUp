import socket from "../lib/socket";
import { getMediasoupDevice } from "../lib/mediasoup";
import useCreateRoomId from "./useCreateRoomId";
import { types as mediasoupTypes, Device } from "mediasoup-client";
import { useState } from "react";

const useJoinRoom = () => {
  const [device, setDevice] = useState<Device | null>(null);
  const roomId = useCreateRoomId();
  console.log("room id " + roomId);

  const joinRoom = () => {
    socket.emit(
      "joinRoom",
      roomId,
      async (rtpCapabilities: mediasoupTypes.RtpCapabilities) => {
        try {
          const newDevice = await getMediasoupDevice(rtpCapabilities);
          setDevice(newDevice);
          // console.log("device id " + JSON.stringify(device));
        } catch (err) {
          console.log("error " + err);
        }
      }
    );
  };

  return { device, joinRoom };
};
export default useJoinRoom;
