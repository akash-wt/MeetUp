import Room from './pages/Room';
import ErrorBoundary from './components/ErrorBoundry';

function App() {
return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">SFU Client</h1>
        <ErrorBoundary>
          <Room />
        </ErrorBoundary>
      </div>
  );
}

export default App;
