
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Loader2, 
  Phone, 
  Video, 
  Clock, 
  Calendar,
  Activity,
  AlertTriangle,
  MessageSquare,
  PlayCircle,
  DollarSign,
  Users,
  FileText,
  Link as LinkIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface CallData {
  call_type: "web_call" | "phone_call";
  call_id: string;
  agent_id: string;
  call_status: "registered" | "ongoing" | "ended" | "error";
  transcript?: string;
  transcript_object?: {
    role: "agent" | "user";
    content: string;
    words: {
      word: string;
      start: number;
      end: number;
    }[];
  }[];
  recording_url?: string;
  public_log_url?: string;
  from_number?: string;
  to_number?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  disconnection_reason?: string;
  call_analysis?: {
    call_summary: string;
    user_sentiment: "Positive" | "Negative" | "Neutral" | "Unknown";
    call_successful: boolean;
    in_voicemail?: boolean;
  };
  call_cost?: {
    product_costs: {
      product: string;
      unitPrice: number;
      cost: number;
    }[];
    total_duration_seconds: number;
    total_duration_unit_price: number;
    total_one_time_price: number;
    combined_cost: number;
  };
  latency?: {
    e2e?: {
      p50: number;
      p90: number;
      p95: number;
      p99: number;
      max: number;
      min: number;
      num: number;
      values: number[];
    };
  };
}

const Call = () => {
  const { callId } = useParams();
  const [call, setCall] = useState<CallData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCall = async () => {
    try {
      setLoading(true);
      console.info('Fetching call details for ID:', callId);

      const { data, error } = await supabase.functions.invoke(
        'retell-calls',
        {
          body: {
            action: 'getCall',
            call_id: callId
          }
        }
      );

      if (error) {
        console.error('Error from Supabase:', error);
        throw error;
      }

      if (!data) {
        console.error('No data received from server');
        throw new Error("No data received from the server");
      }

      console.log('Received call data:', data);
      setCall(data);
    } catch (err: any) {
      console.error('Error fetching call:', err);
      toast({
        variant: "destructive",
        title: "Error fetching call",
        description: err.message || "Failed to load call details",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (callId) {
      fetchCall();
      const interval = setInterval(() => {
        if (call?.call_status === "ongoing") {
          fetchCall();
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [callId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-gray-500">Call not found</p>
                <Button asChild className="mt-4">
                  <Link to="/calls">Back to calls</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "Positive":
        return "text-green-600";
      case "Negative":
        return "text-red-600";
      case "Neutral":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ongoing":
        return "text-green-600";
      case "ended":
        return "text-blue-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const formatLatency = (latency: number) => {
    return `${latency.toFixed(0)}ms`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button 
          variant="outline" 
          asChild
          className="mb-4"
        >
          <Link to="/calls">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to calls
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {call.call_type === "web_call" ? (
                <Video className="h-5 w-5" />
              ) : (
                <Phone className="h-5 w-5" />
              )}
              Call Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Call ID</p>
                  <p className="text-sm font-mono text-gray-500">{call.call_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Agent ID</p>
                  <p className="text-sm font-mono text-gray-500">{call.agent_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Type</p>
                  <div className="flex items-center gap-2">
                    {call.call_type === "web_call" ? (
                      <Video className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Phone className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="text-sm text-gray-500 capitalize">
                      {call.call_type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p className={`text-sm font-medium capitalize ${getStatusColor(call.call_status)}`}>
                    {call.call_status}
                  </p>
                </div>
                {call.from_number && call.to_number && (
                  <>
                    <div>
                      <p className="text-sm font-medium">From</p>
                      <p className="text-sm font-mono text-gray-500">{call.from_number}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">To</p>
                      <p className="text-sm font-mono text-gray-500">{call.to_number}</p>
                    </div>
                  </>
                )}
                {call.start_timestamp && (
                  <div>
                    <p className="text-sm font-medium">Start Time</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <p className="text-sm text-gray-500">
                        {format(new Date(call.start_timestamp), 'PPpp')}
                      </p>
                    </div>
                  </div>
                )}
                {call.end_timestamp && (
                  <div>
                    <p className="text-sm font-medium">End Time</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <p className="text-sm text-gray-500">
                        {format(new Date(call.end_timestamp), 'PPpp')}
                      </p>
                    </div>
                  </div>
                )}
                {call.duration_ms && (
                  <div>
                    <p className="text-sm font-medium">Duration</p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <p className="text-sm text-gray-500">{formatDuration(call.duration_ms)}</p>
                    </div>
                  </div>
                )}
                {call.disconnection_reason && (
                  <div>
                    <p className="text-sm font-medium">Disconnection Reason</p>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <p className="text-sm text-gray-500 capitalize">
                        {call.disconnection_reason.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Latency Info */}
              {call.latency?.e2e && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Latency Metrics
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium">P50</p>
                      <p className="text-sm text-gray-500">{formatLatency(call.latency.e2e.p50)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">P90</p>
                      <p className="text-sm text-gray-500">{formatLatency(call.latency.e2e.p90)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Min</p>
                      <p className="text-sm text-gray-500">{formatLatency(call.latency.e2e.min)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Max</p>
                      <p className="text-sm text-gray-500">{formatLatency(call.latency.e2e.max)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cost Info */}
              {call.call_cost && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Cost Breakdown
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Total Cost</p>
                        <p className="text-sm text-gray-500">
                          ${(call.call_cost.combined_cost / 100).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Duration Cost</p>
                        <p className="text-sm text-gray-500">
                          ${(call.call_cost.total_duration_unit_price * call.call_cost.total_duration_seconds / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {call.call_cost.product_costs.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Product Costs</p>
                        <div className="space-y-2">
                          {call.call_cost.product_costs.map((cost, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-gray-500 capitalize">{cost.product}</span>
                              <span className="text-gray-500">${(cost.cost / 100).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Call Analysis */}
              {call.call_analysis && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Call Analysis
                  </h3>
                  <div className="space-y-4">
                    {call.call_analysis.call_summary && (
                      <div>
                        <p className="text-sm font-medium">Summary</p>
                        <p className="text-sm text-gray-500 mt-1">{call.call_analysis.call_summary}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium">Sentiment</p>
                        <p className={`text-sm font-medium ${getSentimentColor(call.call_analysis.user_sentiment)}`}>
                          {call.call_analysis.user_sentiment}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Call Success</p>
                        <Badge 
                          variant="outline"
                          className={call.call_analysis.call_successful ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'}
                        >
                          {call.call_analysis.call_successful ? 'Successful' : 'Unsuccessful'}
                        </Badge>
                      </div>
                      {call.call_analysis.in_voicemail !== undefined && (
                        <div>
                          <p className="text-sm font-medium">Voicemail Detected</p>
                          <Badge 
                            variant="outline"
                            className={call.call_analysis.in_voicemail ? 'border-yellow-500 text-yellow-700' : 'border-gray-500 text-gray-700'}
                          >
                            {call.call_analysis.in_voicemail ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Transcript */}
              {call.transcript_object && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Transcript
                  </h3>
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    {call.transcript_object.map((entry, index) => (
                      <div key={index} className="flex gap-3">
                        <Badge 
                          variant="outline"
                          className={entry.role === "agent" ? "border-blue-500 text-blue-700" : "border-gray-500 text-gray-700"}
                        >
                          {entry.role === "agent" ? "Agent" : "User"}
                        </Badge>
                        <p className="text-sm text-gray-700">{entry.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Resources
                </h3>
                <div className="space-y-3">
                  {call.recording_url && (
                    <div>
                      <p className="text-sm font-medium flex items-center gap-2">
                        <PlayCircle className="h-4 w-4" />
                        Recording
                      </p>
                      <audio controls className="w-full mt-2">
                        <source src={call.recording_url} type="audio/wav" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}
                  {call.public_log_url && (
                    <div>
                      <p className="text-sm font-medium">Public Log</p>
                      <a 
                        href={call.public_log_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        View call logs
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Call;

