import { useSetRecoilState } from 'recoil';
import { currentRoomIdState } from '../store/roomState';
import { nanoid } from 'nanoid';

const useCreateRoom = () => {
    const setRoomId = useSetRecoilState(currentRoomIdState);

    const createRoom = () => {
        const roomId = nanoid();
        setRoomId(roomId);
        return roomId;
    };

    return { createRoom };
};

export default useCreateRoom;
