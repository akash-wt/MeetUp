import { Button } from "@repo/ui/button";

const Controls = () => {
    return (
        <div className="flex gap-4 mt-4">
            <Button variant="default" onClick={() => { }}>Start Call</Button>
            <Button variant="destructive" onClick={() => { }}>Leave</Button>
        </div>
    );
};

export default Controls;
