
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Video, Loader2, Code, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { RetellWebClient } from "retell-client-js-sdk";
import { RETELL_API_KEY } from "../../src/lib/retell";

interface Agent {
  agent_id: string;
  agent_name: string | null;
}

const CreateWebCall = () => {
  const { agentId } = useParams();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState(agentId || "");
  const [loading, setLoading] = useState(false);
  const [fetchingAgents, setFetchingAgents] = useState(!agentId);
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);
  const [copied, setCopied] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const retellClientRef = useRef<RetellWebClient | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!agentId) {
      const fetchAgents = async () => {
        try {
          setFetchingAgents(true);

         const response = await fetch('https://api.retellai.com/list-agents', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${RETELL_API_KEY}`,
              'Content-Type': 'application/json',
            }
          });

          if (!response.ok) {
              const errorText = await response.text();
              console.error("Retell API error:", response.status, errorText);
              throw new Error(`Failed to fetch web call phonenumber: ${response.status} ${errorText}`);
            }
      
          const data = await response.json();
          console.log("web call number fetched successfully:", data);
          setAgents(data);
        } catch (err: any) {
          console.error('Error fetching agents:', err);
          toast({
            variant: "destructive",
            title: "Error fetching agents",
            description: err.message || "Failed to load agents",
          });
        } finally {
          setFetchingAgents(false);
        }
      };

      fetchAgents();
    } else {
      setFetchingAgents(false);
    }
  }, [agentId, toast]);

  const checkMicrophonePermission = async () => {
    try {
      // First check if we're in a secure context
      if (!window.isSecureContext) {
        throw new Error("Microphone access requires HTTPS. Please ensure you're accessing this site via HTTPS.");
      }

      // Check if the API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Media devices API is not available in this browser.");
      }

      // Check current permission status
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      if (permissionStatus.state === 'denied') {
        throw new Error("Microphone access is blocked. Please allow access in your browser settings and ensure no other apps are using the microphone.");
      }

      try {
        // Try to get actual microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        
        // If successful, stop all tracks
        stream.getTracks().forEach(track => track.stop());
        return true;
      } catch (mediaError: any) {
        console.error('Media access error:', mediaError);
        
        // Specific error handling for different cases
        if (mediaError.name === 'NotAllowedError' || mediaError.name === 'PermissionDeniedError') {
          throw new Error("Please grant microphone access when prompted and ensure no other apps are using it.");
        } else if (mediaError.name === 'NotFoundError') {
          throw new Error("No microphone found. Please connect a microphone and try again.");
        } else if (mediaError.name === 'NotReadableError' || mediaError.name === 'AbortError') {
          throw new Error("Your microphone is in use by another application. Please close other apps using the microphone.");
        }
        
        throw new Error(mediaError.message || "Failed to access microphone.");
      }
    } catch (err: any) {
      console.error('Permission check error:', err);
      throw err;
    }
  };

  const initializeCall = async () => {
    if (!accessToken) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No access token available. Please create a web call first.",
      });
      return;
    }

    try {
      setIsInitializing(true);

      // Try to get microphone permission
      await checkMicrophonePermission();
      
      console.log('Initializing call with access token:', accessToken);
      
      if (retellClientRef.current) {
        console.log('Cleaning up existing client...');
        retellClientRef.current.stopCall();
        retellClientRef.current = null;
      }

      const client = new RetellWebClient();
      console.log('RetellWebClient instance created');

      client.on("call_started", () => {
        console.log("Call started successfully");
        setIsCallActive(true);
        setIsInitializing(false);
        toast({
          title: "Call started",
          description: "You are now connected with the agent",
        });
      });

      client.on("call_connecting", () => {
        console.log("Call is connecting...");
        setIsInitializing(true);
      });

      client.on("call_ended", () => {
        console.log("Call ended");
        setIsCallActive(false);
        setIsInitializing(false);
        toast({
          title: "Call ended",
          description: "The call has been disconnected",
        });
      });

      client.on("error", (error) => {
        console.error("Call error:", error);
        setIsCallActive(false);
        setIsInitializing(false);
        toast({
          variant: "destructive",
          title: "Call error",
          description: error.message || "An error occurred during the call",
        });
        if (client) {
          client.stopCall();
        }
      });

      retellClientRef.current = client;

      console.log('Starting call with following config:', {
        accessToken,
        captureDeviceId: "default",
      });

      await client.startCall({
        accessToken,
        captureDeviceId: "default",
      });

    } catch (err: any) {
      console.error('Error initializing call:', err);
      setIsCallActive(false);
      setIsInitializing(false);
      toast({
        variant: "destructive",
        title: "Error initializing call",
        description: err.message || "Failed to start the call. Please try again.",
      });
      if (retellClientRef.current) {
        retellClientRef.current.stopCall();
        retellClientRef.current = null;
      }
    }
  };

  const handleEndCall = () => {
    if (retellClientRef.current) {
      console.log('Ending call...');
      retellClientRef.current.stopCall();
      retellClientRef.current = null;
      setIsCallActive(false);
      setIsInitializing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("https://api.retellai.com/v2/create-web-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RETELL_API_KEY}`
        },
        body: JSON.stringify({agent_id: selectedAgentId}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create web call");
      }

      toast({
        title: "Success",
        description: `Web call created with ID: ${data.agent_id}`,
      });

      if (!data || !data.agent_id || !data.access_token) {
        throw new Error("Invalid response from server");
      }

      console.log('Web call created successfully:', data);
      setAccessToken(data.access_token);
      setShowCodeSnippet(true);
    } catch (err: any) {
      console.error('Error creating web call:', err);
      toast({
        variant: "destructive",
        title: "Error creating web call",
        description: err.message || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  const embedCodeSnippet = `
<!-- Add the Retell SDK script -->
<script src="https://cdn.retellai.com/sdk/web-sdk.js"></script>

<!-- Add the call button -->
<button id="start-call-button" style="background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; display: inline-flex; align-items: center; gap: 8px; min-width: 150px; transition: background-color 0.2s;">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
  Start Call
</button>

<script>
(function() {
  // Wait for DOM and SDK to load
  function waitForRetell(callback, maxAttempts = 20) {
    let attempts = 0;
    const interval = setInterval(function() {
      attempts++;
      if (typeof RetellWebClient !== 'undefined') {
        clearInterval(interval);
        callback();
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.error('Failed to load Retell SDK');
        const button = document.getElementById('start-call-button');
        if (button) {
          button.textContent = 'Error: SDK not loaded';
          button.disabled = true;
        }
      }
    }, 100);
  }

  let retellClient = null;
  let isInitializing = false;

  async function checkMicrophonePermission() {
    try {
      if (!window.isSecureContext) {
        throw new Error("HTTPS required for microphone access");
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone API not available");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('Microphone permission error:', err);
      return false;
    }
  }

  async function cleanup() {
    if (retellClient) {
      try {
        retellClient.stopCall();
      } catch (err) {
        console.error('Error stopping call:', err);
      }
      retellClient = null;
    }
    isInitializing = false;
  }

  async function startCall() {
    const button = document.getElementById('start-call-button');
    if (!button || isInitializing) return;
    
    try {
      isInitializing = true;
      button.disabled = true;
      button.innerHTML = '<span style="display: inline-flex; align-items: center; gap: 8px;">Connecting... <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg></span>';

      await cleanup();

      const hasMicPermission = await checkMicrophonePermission();
      if (!hasMicPermission) {
        throw new Error('Please allow microphone access and ensure no other apps are using it');
      }

      retellClient = new RetellWebClient();

      retellClient.on('call_started', () => {
        console.log('Call started');
        button.innerHTML = '<span style="display: inline-flex; align-items: center; gap: 8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>End Call</span>';
        button.disabled = false;
        button.style.backgroundColor = '#dc2626';
      });

      retellClient.on('call_connecting', () => {
        console.log('Call connecting');
        isInitializing = true;
      });

      retellClient.on('call_ended', () => {
        console.log('Call ended');
        button.innerHTML = '<span style="display: inline-flex; align-items: center; gap: 8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>Start Call</span>';
        button.disabled = false;
        button.style.backgroundColor = '#2563eb';
        cleanup();
      });

      retellClient.on('error', (error) => {
        console.error('Call error:', error);
        button.innerHTML = '<span style="display: inline-flex; align-items: center; gap: 8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>Start Call</span>';
        button.disabled = false;
        button.style.backgroundColor = '#2563eb';
        alert(error.message || 'Call error occurred');
        cleanup();
      });

      await retellClient.startCall({
        accessToken: '${accessToken || 'YOUR_ACCESS_TOKEN'}',
        captureDeviceId: 'default'
      });

    } catch (error) {
      console.error('Error starting call:', error);
      button.innerHTML = '<span style="display: inline-flex; align-items: center; gap: 8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>Start Call</span>';
      button.disabled = false;
      button.style.backgroundColor = '#2563eb';
      alert(error.message || 'Failed to start call');
      cleanup();
    }
  }

  function endCall() {
    cleanup();
  }

  // Initialize when everything is loaded
  waitForRetell(() => {
    const button = document.getElementById('start-call-button');
    if (!button) {
      console.error('Call button not found');
      return;
    }

    button.addEventListener('click', function() {
      if (!retellClient) {
        startCall();
      } else {
        endCall();
      }
    });

    // Add keyframe animation for the loading spinner
    const style = document.createElement('style');
    style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  });
})();
</script>`.trim();

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(embedCodeSnippet);
      setCopied(true);
      toast({
        title: "Code copied",
        description: "The code snippet has been copied to your clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Please try copying the code manually",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-6 w-6" />
              {agentId ? "Start Web Call" : "Create New Web Call"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Select Agent
                </label>
                {agentId ? (
                  <input
                    type="text"
                    value={selectedAgentId}
                    disabled
                    className="w-full bg-gray-100 border border-gray-300 rounded-md px-4 py-2"
                  />
                ) : fetchingAgents ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading agents...
                  </div>
                ) : (
                  <Select
                    value={selectedAgentId}
                    onValueChange={(value) => {
                      setSelectedAgentId(value);
                      navigate(`/create-web-call/${value}`);
                    }}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem 
                          key={agent.agent_id} 
                          value={agent.agent_id}
                          className="font-mono"
                        >
                          {agent.agent_name || agent.agent_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-sm text-gray-500">
                  {agentId ? "Using pre-selected agent" : "Choose the agent that will handle this web call"}
                </p>
              </div>

              <Button 
                type="submit" 
                disabled={loading || fetchingAgents || !selectedAgentId}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Web Call"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {accessToken && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-6 w-6" />
                  Connect to Agent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-500">
                  Click the button below to start the call with the agent. Make sure your microphone is enabled.
                </p>
                <div className="flex gap-4">
                  {!isCallActive ? (
                    <Button
                      onClick={initializeCall}
                      disabled={isInitializing}
                      className="w-full"
                      variant="default"
                    >
                      {isInitializing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Video className="mr-2 h-4 w-4" />
                          Start Call
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleEndCall}
                      className="w-full"
                      variant="destructive"
                    >
                      End Call
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {showCodeSnippet && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-6 w-6" />
                    Code Snippet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={handleCopyCode}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <pre className="text-sm">
                      <code>{embedCodeSnippet}</code>
                    </pre>
                  </div>
                  <p className="mt-4 text-sm text-gray-500">
                    Use this code snippet to integrate the web call widget into your website. The button will appear styled and ready to use.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CreateWebCall;
