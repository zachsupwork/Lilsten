
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const CreatePhoneNumber = () => {
  const [areaCode, setAreaCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [inboundAgentId, setInboundAgentId] = useState("");
  const [outboundAgentId, setOutboundAgentId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        'retell-calls',
        {
          body: {
            action: 'createPhoneNumber',
            area_code: parseInt(areaCode),
            nickname: nickname || null,
            inbound_agent_id: inboundAgentId || null,
            outbound_agent_id: outboundAgentId || null,
            inbound_webhook_url: webhookUrl || null,
          }
        }
      );

      if (error) throw error;

      toast({
        title: "Phone number created successfully",
        description: `Number: ${data.phone_number_pretty || data.phone_number}`,
      });

      // Redirect to phone numbers list (we'll implement this later)
      navigate("/");
    } catch (err: any) {
      console.error('Error creating phone number:', err);
      toast({
        variant: "destructive",
        title: "Error creating phone number",
        description: err.message || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-6 w-6" />
              Create New Phone Number
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="areaCode" className="text-sm font-medium">
                  Area Code (US only)
                </label>
                <Input
                  id="areaCode"
                  placeholder="415"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                  required
                  pattern="^[2-9][0-9]{2}$"
                  className="font-mono"
                  maxLength={3}
                />
                <p className="text-sm text-gray-500">
                  3-digit US area code (e.g., 415 for San Francisco)
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="nickname" className="text-sm font-medium">
                  Nickname
                </label>
                <Input
                  id="nickname"
                  placeholder="Front Desk Number"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  Optional: Give this number a memorable name
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="inboundAgentId" className="text-sm font-medium">
                  Inbound Agent ID
                </label>
                <Input
                  id="inboundAgentId"
                  placeholder="oBeDLoLOeuAbiuaMFXRtDOLriTJ5tSxD"
                  value={inboundAgentId}
                  onChange={(e) => setInboundAgentId(e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  Optional: Agent to handle incoming calls
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="outboundAgentId" className="text-sm font-medium">
                  Outbound Agent ID
                </label>
                <Input
                  id="outboundAgentId"
                  placeholder="oBeDLoLOeuAbiuaMFXRtDOLriTJ5tSxD"
                  value={outboundAgentId}
                  onChange={(e) => setOutboundAgentId(e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  Optional: Agent to handle outgoing calls
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="webhookUrl" className="text-sm font-medium">
                  Inbound Webhook URL
                </label>
                <Input
                  id="webhookUrl"
                  type="url"
                  placeholder="https://example.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  Optional: URL to receive webhooks for incoming calls
                </p>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Phone Number"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreatePhoneNumber;
