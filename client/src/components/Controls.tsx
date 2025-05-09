import { Button } from "../components/Button";

interface ControlsProps {

    startCall: () => void;
    leaveCall: () => void;
}

const Controls = ({ startCall, leaveCall }: ControlsProps) => {
    return (
        <div className="flex gap-4 mt-4">
            <Button variant="default" onClick={startCall}>Start Call</Button>
            <Button variant="destructive" onClick={leaveCall}>Leave</Button>
        </div>
    );
};

export default Controls;
