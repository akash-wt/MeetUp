import Room from './pages/Room';
import ErrorBoundary from './components/ErrorBoundry';
import "./App.css"
import { Phone } from 'lucide-react';

function App() {
  return (
    // <div className="p-4 space-y-4">
    //   <h1 className="text-xl font-bold">SFU Client</h1>
    //  



    //   </div >

    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="p-4 border-b border-gray-800 bg-gray-900 flex items-center">
        <div className="flex items-center">
          <Phone className="w-6 h-6 text-indigo-500 mr-2" />
          <h1 className="text-xl font-semibold">MeetUp</h1>
        </div>
      </header>

      <ErrorBoundary>
        <Room />
      
      </ErrorBoundary>

      {/* <main className="flex-1 overflow-hidden">
        {roomId ? (
          <VideoRoom
            roomId={roomId}
            userName={userName}
            onLeaveRoom={handleLeaveRoom}
          />
        ) : (
          <JoinRoom onJoinRoom={handleJoinRoom} />
        )}
      </main> */}
    </div>


  );
}

export default App;
