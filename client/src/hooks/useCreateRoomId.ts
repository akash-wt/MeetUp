import { useSetRecoilState } from "recoil";
import { currentRoomIdState } from "../store/roomState";
import { nanoid } from "nanoid";

const useCreateRoomId = () => {
  const setRoomId = useSetRecoilState(currentRoomIdState);
  const roomId = nanoid();
  setRoomId(roomId);
  return roomId;
};

export default useCreateRoomId;
