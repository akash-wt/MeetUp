import { RecoilRoot, useSetRecoilState } from 'recoil';
import { currentRoomIdState } from './store/roomState';
import Room from './pages/Room';
import ErrorBoundary from './components/ErrorBoundry';

function App() {
  const setRoom = useSetRecoilState(currentRoomIdState);

  return (
    <RecoilRoot>
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">SFU Client</h1>
        <button
          onClick={() => setRoom('my-room-id')}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Join Room
        </button>
        <ErrorBoundary>
          <Room />
        </ErrorBoundary>
      </div>
    </RecoilRoot>
  );
}

export default App;
