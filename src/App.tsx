
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Index from "@/pages/Index";
import Call from "@/pages/Call";
import CreateCall from "@/pages/CreateCall";
import CreateWebCall from "@/pages/CreateWebCall";
import CreateBatchCall from "@/pages/CreateBatchCall";
import CreatePhoneNumber from "@/pages/CreatePhoneNumber";
import ImportPhoneNumber from "@/pages/ImportPhoneNumber";
import CreateAgent from "@/pages/CreateAgent";
import ListAgents from "@/pages/ListAgents";
import AgentDetails from "@/pages/AgentDetails";
import NotFound from "@/pages/NotFound";
import SideMenu from "@/components/SideMenu";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="flex">
        <SideMenu />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/calls/:callId" element={<Call />} />
            <Route path="/create-call" element={<CreateCall />} />
            <Route path="/create-web-call" element={<CreateWebCall />} />
            <Route path="/create-web-call/:agentId" element={<CreateWebCall />} />
            <Route path="/create-batch-call" element={<CreateBatchCall />} />
            <Route path="/create-phone-number" element={<CreatePhoneNumber />} />
            <Route path="/import-phone-number" element={<ImportPhoneNumber />} />
            <Route path="/create-agent" element={<CreateAgent />} />
            <Route path="/agents" element={<ListAgents />} />
            <Route path="/agents/:agentId" element={<AgentDetails />} />
            <Route path="/calls" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </div>
      </div>
    </Router>
  );
}

export default App;
