import { useState } from "react";
import { HighlightJsLogs } from "./lib"

function App() {
  const [lines,setLines] = useState("100")
  return (
    <div className="min-h-screen bg-orange-500">
      <div className="p-6 flex flex-col">
        <HighlightJsLogs 
          maxHeight="calc(100vh - 8rem)"
          noScrollBar
          title="Last 24 hours logs" 
          url={`/logs.txt`} 
          fontSize={14}
          actionComponent={
            <select onChange={(e)=>{
              setLines(e.target.value)
              }}
              value={lines}
            >
              <option value={"all"}>
                all
              </option>
      
              <option value={"200"}>
                200
              </option>
      
              <option value={"100"}>
                100
              </option>
            </select>
          }
          {
            ...(
              lines==="all"?{}:{maxLines:Number(lines)}
            )

            
          }
        />
      </div>
    </div>
    
  );
}

export default App;
