
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PhoneIncoming } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { RETELL_API_KEY } from "../../src/lib/retell";

const ImportPhoneNumber = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [terminationUri, setTerminationUri] = useState("");
  const [sipUsername, setSipUsername] = useState("");
  const [sipPassword, setSipPassword] = useState("");
  const [inboundAgentId, setInboundAgentId] = useState("");
  const [outboundAgentId, setOutboundAgentId] = useState("");
  const [nickname, setNickname] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('https://api.retellai.com/import-phone-number', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RETELL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              phone_number: phoneNumber,
              termination_uri: terminationUri,
              sip_trunk_auth_username: sipUsername || null,
              sip_trunk_auth_password: sipPassword || null,
              inbound_agent_id: inboundAgentId || null,
              outbound_agent_id: outboundAgentId || null,
              nickname: nickname || null,
              inbound_webhook_url: webhookUrl || null,
            }),
          });

          const data = await response.json();

          if (response.ok) {
            toast({
              title: "Phone number imported successfully",
              description: `Number: ${data.phone_number_pretty || data.phone_number}`,
            });
          } else {
            toast({
              variant: "destructive",
              title: "Error importing phone number",
              description: data.message || "Something went wrong",
            });
      }
      navigate('/');
    } catch (err: any) {
      console.error('Error importing phone number:', err);
      toast({
        variant: "destructive",
        title: "Error importing phone number",
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
              <PhoneIncoming className="h-6 w-6" />
              Import Phone Number
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="phoneNumber" className="text-sm font-medium">
                  Phone Number (E.164 format)
                </label>
                <Input
                  id="phoneNumber"
                  placeholder="+14157774444"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  pattern="^\+[1-9]\d{1,14}$"
                  className="font-mono"
                />
                <p className="text-sm text-gray-500">
                  E.164 format: +[country code][number] (e.g., +14157774444)
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="terminationUri" className="text-sm font-medium">
                  Termination URI
                </label>
                <Input
                  id="terminationUri"
                  placeholder="someuri.pstn.twilio.com"
                  value={terminationUri}
                  onChange={(e) => setTerminationUri(e.target.value)}
                  required
                />
                <p className="text-sm text-gray-500">
                  URI to identify your elastic SIP trunk (e.g., someuri.pstn.twilio.com)
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="sipUsername" className="text-sm font-medium">
                  SIP Trunk Username
                </label>
                <Input
                  id="sipUsername"
                  placeholder="Optional: SIP trunk authentication username"
                  value={sipUsername}
                  onChange={(e) => setSipUsername(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="sipPassword" className="text-sm font-medium">
                  SIP Trunk Password
                </label>
                <Input
                  id="sipPassword"
                  type="password"
                  placeholder="Optional: SIP trunk authentication password"
                  value={sipPassword}
                  onChange={(e) => setSipPassword(e.target.value)}
                />
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
                {loading ? "Importing..." : "Import Phone Number"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ImportPhoneNumber;
