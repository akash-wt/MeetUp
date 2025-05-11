import { useState, useEffect } from "react";
import { useSetRecoilState } from "recoil";
import { currentRoomIdState } from "../store/roomState";
import { nanoid } from "nanoid";

const useCreateRoomId = () => {
  const setRoomId = useSetRecoilState(currentRoomIdState);
  const [roomId] = useState(() => nanoid());

  useEffect(() => {
    setRoomId(roomId);
  }, [roomId, setRoomId]);

  return roomId;
};

export default useCreateRoomId;
