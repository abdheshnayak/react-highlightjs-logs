import { HighlightJsLogs } from "./lib"
function App() {
  return (
    <div className="min-h-screen bg-orange-500">
      <div className="p-6 flex flex-col">
        <HighlightJsLogs 
          maxHeight="calc(100vh - 8rem)"
          noScrollBar
          title="Last 24 hours logs" 
          url={`/logs.txt`} 
          fontSize={14}
        />
      </div>
    </div>
    
  );
}

export default App;
