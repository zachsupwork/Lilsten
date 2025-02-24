import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, DollarSign, Phone, Video, RefreshCcw, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import BillingSettings from "@/components/BillingSettings";

interface CallData {
  call_type: "web_call" | "phone_call";
  call_id: string;
  agent_id: string;
  call_status: "registered" | "ongoing" | "ended" | "error";
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  from_number?: string;
  to_number?: string;
  direction?: "inbound" | "outbound";
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
}

const Index = () => {
  const [calls, setCalls] = useState<CallData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBilling, setUserBilling] = useState<any>(null);
  const { toast } = useToast();

  const fetchCalls = async () => {
    try {
      setLoading(true);
      
      const { data: response, error } = await supabase.functions.invoke(
        'retell-calls',
        {
          body: { 
            action: 'listCalls',
            limit: 50 
          }
        }
      );

      if (error) throw error;
      if (!Array.isArray(response)) {
        throw new Error('Invalid response format from API');
      }

      for (const call of response) {
        if (call.call_cost && userBilling?.stripe_subscription_id) {
          if (userBilling.credit_balance < 0) {
            await supabase.functions.invoke('stripe-billing', {
              body: {
                action: 'reportUsage',
                subscriptionId: userBilling.stripe_subscription_id,
                creditBalance: userBilling.credit_balance,
                units: call.call_cost.combined_cost,
              },
            });
          }

          const newBalance = userBilling.credit_balance - (call.call_cost.combined_cost * 3);
          await supabase
            .from('user_billing')
            .update({ credit_balance: newBalance })
            .eq('user_id', userBilling.user_id);

          setUserBilling(prev => ({ ...prev, credit_balance: newBalance }));
        }
      }

      setCalls(response);
    } catch (err: any) {
      console.error('Error fetching calls:', err);
      toast({
        variant: "destructive",
        title: "Error fetching calls",
        description: err.message || "Failed to load calls",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadUserBilling = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: billing } = await supabase
          .from('user_billing')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        setUserBilling(billing);
      }
    };

    loadUserBilling();
    fetchCalls();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ongoing":
        return "bg-green-500";
      case "ended":
        return "bg-gray-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };

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
        return "bg-green-500";
      case "Negative":
        return "bg-red-500";
      case "Neutral":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getDisconnectionReason = (reason: string) => {
    return reason?.replace(/_/g, ' ').toLowerCase();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {userBilling && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-6 w-6" />
                Billing Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Credit Balance: ${userBilling.credit_balance.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        )}

        {!userBilling?.stripe_subscription_id && <BillingSettings />}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-6 w-6" />
              Call History
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCalls}
              className="flex items-center gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead>Call ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Success</TableHead>
                    <TableHead>Disconnect Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 12 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-[100px]" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : calls.length > 0 ? (
                    calls.map((call) => (
                      <TableRow key={call.call_id}>
                        <TableCell>
                          <Badge className={`${getStatusColor(call.call_status)} text-white`}>
                            {call.call_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link 
                            to={`/calls/${call.call_id}`}
                            className="text-blue-500 hover:text-blue-700 font-mono text-sm"
                          >
                            {call.call_id}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {call.call_type === "web_call" ? (
                              <Video className="h-4 w-4 mr-1" />
                            ) : (
                              <Phone className="h-4 w-4 mr-1" />
                            )}
                            <span className="capitalize">{call.call_type.replace('_', ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {call.direction && (
                            <Badge variant="secondary" className="capitalize">
                              {call.direction}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{call.from_number || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{call.to_number || '-'}</TableCell>
                        <TableCell>
                          {call.start_timestamp ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-gray-500" />
                              {formatDistanceToNow(call.start_timestamp, { addSuffix: true })}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {call.duration_ms ? formatDuration(call.duration_ms) : '-'}
                        </TableCell>
                        <TableCell>
                          {call.call_cost ? (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-gray-500" />
                              {(call.call_cost.combined_cost / 100).toFixed(2)}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {call.call_analysis?.user_sentiment ? (
                            <Badge className={`${getSentimentColor(call.call_analysis.user_sentiment)} text-white`}>
                              {call.call_analysis.user_sentiment}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {call.call_analysis?.call_successful !== undefined ? (
                            <Badge className={call.call_analysis.call_successful ? 'bg-green-500' : 'bg-red-500'}>
                              {call.call_analysis.call_successful ? 'Yes' : 'No'}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {call.disconnection_reason ? (
                            <div className="flex items-center gap-1 text-sm">
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              {getDisconnectionReason(call.disconnection_reason)}
                            </div>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8">
                        No calls found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
