
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PronunciationDictionary {
  word: string;
  alphabet: "ipa" | "cmu";
  phoneme: string;
}

interface PostCallAnalysisData {
  type: "string";
  name: string;
  description: string;
  examples?: string[];
}

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
  pronunciation_dictionary?: PronunciationDictionary[];
  normalize_for_speech?: boolean;
  end_call_after_silence_ms?: number;
  max_call_duration_ms?: number;
  enable_voicemail_detection?: boolean;
  voicemail_message?: string;
  voicemail_detection_timeout_ms?: number;
  post_call_analysis_data?: PostCallAnalysisData[];
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
      const { data: { RETELL_API_KEY } } = await supabase.functions.invoke(
        'retell-calls',
        {
          body: {
            action: 'getApiKey'
          }
        }
      );

      const response = await fetch(`https://api.retellai.com/get-agent/${agentId}`, {
        headers: {
          "Authorization": `Bearer ${RETELL_API_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch agent details");
      }

      const data = await response.json();
      setAgent(data);
    } catch (error: any) {
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
          <CardTitle>{agent.agent_name || "Unnamed Agent"}</CardTitle>
          <Button variant="outline" onClick={() => navigate('/agents')}>
            Back to Agents
          </Button>
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
