
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MoreHorizontal, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RETELL_API_KEY } from "../../src/lib/retell";

interface Agent {
  agent_id: string;
  response_engine: {
    type: "retell-llm";
    llm_id: string;
  };
  agent_name?: string;
  voice_id: string;
  voice_model?: string;
  fallback_voice_ids?: string[];
  voice_temperature?: number;
  voice_speed?: number;
  volume?: number;
  responsiveness?: number;
  interruption_sensitivity?: number;
  enable_backchannel?: boolean;
  backchannel_frequency?: number;
  backchannel_words?: string[];
  reminder_trigger_ms?: number;
  reminder_max_count?: number;
  ambient_sound?: string;
  ambient_sound_volume?: number;
  language?: string;
  webhook_url?: string;
  boosted_keywords?: string[];
  enable_transcription_formatting?: boolean;
  opt_out_sensitive_data_storage?: boolean;
  pronunciation_dictionary?: Array<{
    word: string;
    alphabet: "ipa" | "cmu";
    phoneme: string;
  }>;
  normalize_for_speech?: boolean;
  end_call_after_silence_ms?: number;
  max_call_duration_ms?: number;
  enable_voicemail_detection?: boolean;
  voicemail_message?: string;
  voicemail_detection_timeout_ms?: number;
  post_call_analysis_data?: Array<{
    type: string;
    name: string;
    description: string;
    examples?: string[];
  }>;
  begin_message_delay_ms?: number;
  ring_duration_ms?: number;
}

export default function AgentDetails() {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { agentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (agentId) {
      fetchAgentDetails();
    }
  }, [agentId]);

  const fetchAgentDetails = async () => {
    try {
      if (!agentId) {
        throw new Error("Agent ID is required");
      }

      setIsLoading(true);
      console.log("Making request to Retell API...");
      
      const response = await fetch(`https://api.retellai.com/get-agent/${agentId}`, {
        method: 'GET',
        headers: {
          "Authorization": `Bearer ${RETELL_API_KEY}`,
          "Content-Type": "application/json"
        }
      });

      const responseText = await response.text();
      console.log("Raw API Response:", responseText);

      if (!response.ok) {
        console.error("Retell API error:", response.status, responseText);
        throw new Error(`Failed to fetch agent details: ${response.status} ${responseText}`);
      }

      try {
        const agentData = JSON.parse(responseText);
        console.log("Agent details fetched successfully:", agentData);
        setAgent(agentData);
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        throw new Error("Failed to parse agent details response");
      }
    } catch (error: any) {
      console.error("Error in fetchAgentDetails:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch agent details",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderValue = (value: any) => {
    if (value === undefined || value === null) return "N/A";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return value.toString();
  };

  if (isLoading) {
    return <div className="container mx-auto py-8 text-center">Loading agent details...</div>;
  }

  if (!agent) {
    return <div className="container mx-auto py-8 text-center">Agent not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/agents')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>{agent?.agent_name || "Unnamed Agent"}</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchAgentDetails}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  Create Call
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/create-web-call')}>
                  New Web Call
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/create-call')}>
                  New Phone Call
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/create-batch-call')}>
                  New Batch Call
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(agent).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <div className="font-medium">{key}</div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {renderValue(value)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
