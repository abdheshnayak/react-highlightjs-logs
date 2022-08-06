import { HighlightJsLogs } from "./lib"
function App() {
  return (
    <div className="p-6">
      <HighlightJsLogs title="Last 24 hours logs" data="Hello World!" follow selectableLines/>
    </div>
  );
}

export default App;
