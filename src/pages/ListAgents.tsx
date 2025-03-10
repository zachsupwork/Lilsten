
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { MoreHorizontal, Plus, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import clsx from "clsx";

import { RETELL_API_KEY } from "../../src/lib/retell";

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
  agent_name: string | null;
  response_engine: {
    type: 'retell-llm';
    llm_id: string;
  };
  voice_id: string;
  voice_model: string | null;
  fallback_voice_ids: string[] | null;
  voice_temperature: number;
  voice_speed: number;
  volume: number;
  responsiveness: number;
  interruption_sensitivity: number;
  enable_backchannel: boolean;
  backchannel_frequency: number;
  backchannel_words: string[] | null;
  reminder_trigger_ms: number;
  reminder_max_count: number;
  ambient_sound: string | null;
  ambient_sound_volume: number;
  language: string;
  webhook_url: string | null;
  boosted_keywords: string[] | null;
  enable_transcription_formatting: boolean;
  opt_out_sensitive_data_storage: boolean;
  pronunciation_dictionary: PronunciationDictionary[] | null;
  normalize_for_speech: boolean;
  end_call_after_silence_ms: number;
  max_call_duration_ms: number;
  enable_voicemail_detection: boolean;
  voicemail_message: string;
  voicemail_detection_timeout_ms: number;
  post_call_analysis_data: PostCallAnalysisData[] | null;
  begin_message_delay_ms: number;
  ring_duration_ms: number;
  last_modification_timestamp: number;
}

export default function ListAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      // console.log("Fetching API key from Supabase...");
      // const { data: apiKeyData, error: apiKeyError } = await supabase.functions.invoke(
      //   'retell-calls',
      //   {
      //     body: {
      //       action: 'getApiKey'
      //     }
      //   }
      // );
      // console.log(apiKeyData);

      // if (apiKeyError || !apiKeyData?.RETELL_API_KEY) {
      //   console.error("Error fetching API key:", apiKeyError);
      //   throw new Error("Failed to fetch API key");
      // }

      console.log("Making request to Retell API...");
      
      const response = await fetch("https://api.retellai.com/list-agents", {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${RETELL_API_KEY}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Retell API error:", response.status, errorText);
        throw new Error(`Failed to fetch agents: ${response.status} ${errorText}`);
      }

      const agentsData = await response.json();
      console.log("Agents fetched successfully:", agentsData);
      setAgents(agentsData);
    } catch (error: any) {
      console.error("Error in fetchAgents:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch agents",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Agents</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchAgents}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/create-agent')}>
                  New Agent
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/create-web-call')}>
                  New Web Call
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/create-call')}>
                  New Phone Call
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading agents...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Voice ID</TableHead>
                  <TableHead>Voice Model</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Last Modified</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">
                      No agents found
                    </TableCell>
                  </TableRow>
                ) : (
                  agents.map((agent) => (
                    <TableRow key={agent.agent_id}>
                      <TableCell className="font-mono text-xs">{agent.agent_id}</TableCell>
                      <TableCell>{agent.agent_name || "N/A"}</TableCell>
                      <TableCell className="font-mono text-xs">{agent.voice_id}</TableCell>
                      <TableCell>{agent.voice_model || "Default"}</TableCell>
                      <TableCell>{agent.language}</TableCell>
                      <TableCell>{formatTimestamp(agent.last_modification_timestamp)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/agents/${agent.agent_id}`)}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/create-web-call/${agent.agent_id}`)}>
                              Create Web Call
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('/create-call')}>
                              Create Phone Call
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
