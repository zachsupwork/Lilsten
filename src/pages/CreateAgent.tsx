
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PostCallAnalysisData {
  type: "string";
  name: string;
  description: string;
  examples?: string[];
}

interface PronunciationDictionary {
  word: string;
  alphabet: "ipa" | "cmu";
  phoneme: string;
}

interface AgentForm {
  response_engine: {
    type: "retell-llm";
    llm_id: string;
  };
  voice_id: string;
  agent_name?: string;
  voice_model?: "eleven_turbo_v2" | "eleven_flash_v2" | "eleven_turbo_v2_5" | "eleven_flash_v2_5" | "eleven_multilingual_v2" | "Play3.0-mini" | "PlayDialog" | null;
  fallback_voice_ids?: string[] | null;
  voice_temperature?: number;
  voice_speed?: number;
  volume?: number;
  responsiveness?: number;
  interruption_sensitivity?: number;
  enable_backchannel?: boolean;
  backchannel_frequency?: number;
  backchannel_words?: string[] | null;
  reminder_trigger_ms?: number;
  reminder_max_count?: number;
  ambient_sound?: "coffee-shop" | "convention-hall" | "summer-outdoor" | "mountain-outdoor" | "static-noise" | "call-center" | null;
  ambient_sound_volume?: number;
  language?: string;
  webhook_url?: string | null;
  boosted_keywords?: string[] | null;
  enable_transcription_formatting?: boolean;
  opt_out_sensitive_data_storage?: boolean;
  pronunciation_dictionary?: PronunciationDictionary[] | null;
  normalize_for_speech?: boolean;
  end_call_after_silence_ms?: number;
  max_call_duration_ms?: number;
  enable_voicemail_detection?: boolean;
  voicemail_message?: string;
  voicemail_detection_timeout_ms?: number;
  post_call_analysis_data?: PostCallAnalysisData[] | null;
  begin_message_delay_ms?: number;
  ring_duration_ms?: number;
}

const languages = [
  "en-US", "en-IN", "en-GB", "de-DE", "es-ES", "es-419", "hi-IN", "ja-JP",
  "pt-PT", "pt-BR", "fr-FR", "zh-CN", "ru-RU", "it-IT", "ko-KR", "nl-NL",
  "pl-PL", "tr-TR", "vi-VN", "multi"
];

const voiceModels = [
  "eleven_turbo_v2", "eleven_flash_v2", "eleven_turbo_v2_5", "eleven_flash_v2_5",
  "eleven_multilingual_v2", "Play3.0-mini", "PlayDialog"
];

const ambientSounds = [
  "coffee-shop", "convention-hall", "summer-outdoor", "mountain-outdoor",
  "static-noise", "call-center"
];

const llmVoices = [
  { id: "9BWtsMINqrJLrRacOk9x", name: "Aria" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George" },
  { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum" },
  { id: "SAz9YHcvj6GT2YYXdXww", name: "River" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda" },
  { id: "bIHbv24MWmeRgasZH58o", name: "Will" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica" },
  { id: "cjVigY5qzO86Huf0OWal", name: "Eric" },
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily" },
  { id: "pqHfZKP75CvOlQylNhV4", name: "Bill" }
];

const llmOptions = [
  { id: "llm_default_conversation", name: "Default Conversation" },
  { id: "llm_customer_service", name: "Customer Service" },
  { id: "llm_sales", name: "Sales Representative" },
  { id: "llm_technical_support", name: "Technical Support" },
  { id: "llm_healthcare", name: "Healthcare Assistant" }
];

export default function CreateAgent() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<AgentForm>({
    response_engine: {
      type: "retell-llm",
      llm_id: ""
    },
    voice_id: "",
    agent_name: "",
    voice_model: null,
    voice_temperature: 1,
    voice_speed: 1,
    volume: 1,
    responsiveness: 1,
    interruption_sensitivity: 1,
    enable_backchannel: false,
    backchannel_frequency: 0.8,
    backchannel_words: [],
    reminder_trigger_ms: 10000,
    reminder_max_count: 1,
    ambient_sound: null,
    ambient_sound_volume: 1,
    language: "en-US",
    webhook_url: null,
    boosted_keywords: [],
    enable_transcription_formatting: true,
    opt_out_sensitive_data_storage: false,
    pronunciation_dictionary: null,
    normalize_for_speech: true,
    end_call_after_silence_ms: 600000,
    max_call_duration_ms: 3600000,
    enable_voicemail_detection: false,
    voicemail_message: "",
    voicemail_detection_timeout_ms: 30000,
    post_call_analysis_data: null,
    begin_message_delay_ms: 1000,
    ring_duration_ms: 30000
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { RETELL_API_KEY } } = await supabase.functions.invoke(
        'retell-calls',
        {
          body: {
            action: 'getApiKey'
          }
        }
      );

      const response = await fetch("https://api.retellai.com/create-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RETELL_API_KEY}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create agent");
      }

      toast({
        title: "Success",
        description: `Agent created with ID: ${data.agent_id}`,
      });

      navigate("/");
    } catch (error: any) {
      console.error("Error creating agent:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create agent",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <Label>LLM ID</Label>
                  <Select
                    value={formData.response_engine.llm_id}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      response_engine: { ...prev.response_engine, llm_id: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select LLM type" />
                    </SelectTrigger>
                    <SelectContent>
                      {llmOptions.map((llm) => (
                        <SelectItem key={llm.id} value={llm.id}>
                          {llm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Agent Name</Label>
                  <Input
                    value={formData.agent_name || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, agent_name: e.target.value }))}
                    placeholder="Enter agent name"
                  />
                </div>

                <div>
                  <Label>Voice</Label>
                  <Select
                    value={formData.voice_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, voice_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {llmVoices.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Voice Model</Label>
                  <Select
                    value={formData.voice_model || ""}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      voice_model: value as typeof prev.voice_model
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select voice model" />
                    </SelectTrigger>
                    <SelectContent>
                      {voiceModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Language</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang} value={lang}>
                          {lang}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Voice Temperature (0-2)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={formData.voice_temperature}
                    onChange={(e) => setFormData(prev => ({ ...prev, voice_temperature: parseFloat(e.target.value) }))}
                  />
                </div>

                <div>
                  <Label>Voice Speed (0.5-2)</Label>
                  <Input
                    type="number"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={formData.voice_speed}
                    onChange={(e) => setFormData(prev => ({ ...prev, voice_speed: parseFloat(e.target.value) }))}
                  />
                </div>

                <div>
                  <Label>Volume (0-2)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={formData.volume}
                    onChange={(e) => setFormData(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                  />
                </div>

                <div>
                  <Label>Webhook URL</Label>
                  <Input
                    value={formData.webhook_url || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
                    placeholder="Enter webhook URL"
                  />
                </div>

                <div>
                  <Label>Boosted Keywords (comma-separated)</Label>
                  <Input
                    value={formData.boosted_keywords?.join(", ") || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      boosted_keywords: e.target.value.split(",").map(k => k.trim()).filter(k => k)
                    }))}
                    placeholder="Enter keywords"
                  />
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="space-y-4">
                <div>
                  <Label>Responsiveness (0-1)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.responsiveness}
                    onChange={(e) => setFormData(prev => ({ ...prev, responsiveness: parseFloat(e.target.value) }))}
                  />
                </div>

                <div>
                  <Label>Interruption Sensitivity (0-1)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.interruption_sensitivity}
                    onChange={(e) => setFormData(prev => ({ ...prev, interruption_sensitivity: parseFloat(e.target.value) }))}
                  />
                </div>

                <div>
                  <Label>Ambient Sound</Label>
                  <Select
                    value={formData.ambient_sound || ""}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, ambient_sound: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ambient sound" />
                    </SelectTrigger>
                    <SelectContent>
                      {ambientSounds.map((sound) => (
                        <SelectItem key={sound} value={sound}>
                          {sound}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Ambient Sound Volume (0-2)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={formData.ambient_sound_volume}
                    onChange={(e) => setFormData(prev => ({ ...prev, ambient_sound_volume: parseFloat(e.target.value) }))}
                  />
                </div>

                <div>
                  <Label>Backchannel Words (comma-separated)</Label>
                  <Input
                    value={formData.backchannel_words?.join(", ") || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      backchannel_words: e.target.value.split(",").map(w => w.trim()).filter(w => w)
                    }))}
                    placeholder="Enter backchannel words"
                    disabled={!formData.enable_backchannel}
                  />
                </div>

                <div>
                  <Label>End Call After Silence (ms)</Label>
                  <Input
                    type="number"
                    min="10000"
                    value={formData.end_call_after_silence_ms}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_call_after_silence_ms: parseInt(e.target.value) }))}
                  />
                </div>

                <div>
                  <Label>Max Call Duration (ms)</Label>
                  <Input
                    type="number"
                    min="60000"
                    max="7200000"
                    value={formData.max_call_duration_ms}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_call_duration_ms: parseInt(e.target.value) }))}
                  />
                </div>

                {formData.enable_voicemail_detection && (
                  <div>
                    <Label>Voicemail Message</Label>
                    <Input
                      value={formData.voicemail_message || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, voicemail_message: e.target.value }))}
                      placeholder="Enter voicemail message"
                    />
                  </div>
                )}

                <div>
                  <Label>Voicemail Detection Timeout (ms)</Label>
                  <Input
                    type="number"
                    min="5000"
                    max="180000"
                    value={formData.voicemail_detection_timeout_ms}
                    onChange={(e) => setFormData(prev => ({ ...prev, voicemail_detection_timeout_ms: parseInt(e.target.value) }))}
                    disabled={!formData.enable_voicemail_detection}
                  />
                </div>

                <div>
                  <Label>Begin Message Delay (ms)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="5000"
                    value={formData.begin_message_delay_ms}
                    onChange={(e) => setFormData(prev => ({ ...prev, begin_message_delay_ms: parseInt(e.target.value) }))}
                  />
                </div>

                <div>
                  <Label>Ring Duration (ms)</Label>
                  <Input
                    type="number"
                    min="5000"
                    max="90000"
                    value={formData.ring_duration_ms}
                    onChange={(e) => setFormData(prev => ({ ...prev, ring_duration_ms: parseInt(e.target.value) }))}
                  />
                </div>

                {/* Toggle Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Enable Backchannel</Label>
                    <Switch
                      checked={formData.enable_backchannel}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enable_backchannel: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Enable Transcription Formatting</Label>
                    <Switch
                      checked={formData.enable_transcription_formatting}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enable_transcription_formatting: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Normalize for Speech</Label>
                    <Switch
                      checked={formData.normalize_for_speech}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, normalize_for_speech: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Enable Voicemail Detection</Label>
                    <Switch
                      checked={formData.enable_voicemail_detection}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enable_voicemail_detection: checked }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Agent"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
