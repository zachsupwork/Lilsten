
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
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
import Auth from "@/pages/Auth";
import SideMenu from "@/components/SideMenu";
import { supabase } from "@/integrations/supabase/client";
import "./App.css";

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return null; // or a loading spinner
  }

  return (
    <Router>
      <div className="flex">
        <SideMenu />
        <div className="flex-1">
          <Routes>
            <Route 
              path="/auth" 
              element={session ? <Navigate to="/" /> : <Auth />} 
            />
            <Route
              path="/"
              element={session ? <Index /> : <Navigate to="/auth" />}
            />
            <Route
              path="/calls/:callId"
              element={session ? <Call /> : <Navigate to="/auth" />}
            />
            <Route
              path="/create-call"
              element={session ? <CreateCall /> : <Navigate to="/auth" />}
            />
            <Route
              path="/create-web-call"
              element={session ? <CreateWebCall /> : <Navigate to="/auth" />}
            />
            <Route
              path="/create-web-call/:agentId"
              element={session ? <CreateWebCall /> : <Navigate to="/auth" />}
            />
            <Route
              path="/create-batch-call"
              element={session ? <CreateBatchCall /> : <Navigate to="/auth" />}
            />
            <Route
              path="/create-phone-number"
              element={session ? <CreatePhoneNumber /> : <Navigate to="/auth" />}
            />
            <Route
              path="/import-phone-number"
              element={session ? <ImportPhoneNumber /> : <Navigate to="/auth" />}
            />
            <Route
              path="/create-agent"
              element={session ? <CreateAgent /> : <Navigate to="/auth" />}
            />
            <Route
              path="/agents"
              element={session ? <ListAgents /> : <Navigate to="/auth" />}
            />
            <Route
              path="/agents/:agentId"
              element={session ? <AgentDetails /> : <Navigate to="/auth" />}
            />
            <Route
              path="/calls"
              element={session ? <Index /> : <Navigate to="/auth" />}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </div>
      </div>
    </Router>
  );
}

export default App;
