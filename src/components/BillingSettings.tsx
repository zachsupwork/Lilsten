
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BillingSettings {
  setup_fee_cents: number;
  monthly_fee_cents: number;
  call_cost_multiplier: number;
}

interface UserBilling {
  credit_balance_cents: number;
  next_billing_date: string | null;
}

const BillingSettings = () => {
  const [loading, setLoading] = useState(false);
  const [billingInfo, setBillingInfo] = useState<BillingSettings | null>(null);
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [userBilling, setUserBilling] = useState<UserBilling | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    loadBillingInfo();
    loadUserBillingInfo();
  }, []);

  const loadUserBillingInfo = async () => {
    try {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from('user_billing')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;
      setUserBilling(data);
    } catch (error: any) {
      console.error('Error loading user billing info:', error);
    }
  };

  const loadBillingInfo = async () => {
    try {
      const { data: billingSettings, error } = await supabase
        .from("billing_settings")
        .select("*")
        .single();

      if (error) throw error;

      if (billingSettings) {
        setBillingInfo(billingSettings);
      }
    } catch (error: any) {
      console.error("Error loading billing info:", error);
      toast({
        variant: "destructive",
        title: "Error loading billing information",
        description: error.message,
      });
    }
  };

  const redirectToPayment = async () => {
    if (!session?.user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please sign in to make a payment.",
      });
      return;
    }

    setLoading(true);
    try {
      const amount = billingInfo ? billingInfo.setup_fee_cents + billingInfo.monthly_fee_cents : 5000; // Default to $50 if no billing info
      
      const { data, error } = await supabase.functions.invoke(
        'stripe-billing',
        {
          body: {
            action: 'createPaymentSession',
            userId: session.user.id,
            amount: amount,
          },
        }
      );

      if (error) throw error;

      // Redirect to Stripe Checkout
      if (data?.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
    } catch (error: any) {
      console.error('Error creating payment session:', error);
      toast({
        variant: "destructive",
        title: "Error setting up payment",
        description: error.message || "Failed to create payment session",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for successful payment
    const queryParams = new URLSearchParams(window.location.search);
    const sessionId = queryParams.get('session_id');

    if (sessionId) {
      handlePaymentSuccess(sessionId);
    }
  }, []);

  const handlePaymentSuccess = async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'stripe-billing',
        {
          body: {
            action: 'handlePaymentSuccess',
            sessionId: sessionId,
          },
        }
      );

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Payment successful",
          description: "Your payment has been processed and credits have been added to your account.",
        });
        loadUserBillingInfo(); // Refresh the billing info
      }
    } catch (error: any) {
      console.error('Error handling payment success:', error);
      toast({
        variant: "destructive",
        title: "Error processing payment",
        description: error.message || "Failed to process payment confirmation",
      });
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {billingInfo && (
          <div className="space-y-2">
            <p>Initial Payment: {formatCurrency(billingInfo.setup_fee_cents + billingInfo.monthly_fee_cents)}</p>
            <p>Call Cost Multiplier: {billingInfo.call_cost_multiplier}x standard rate</p>
          </div>
        )}
        {userBilling && (
          <div className="space-y-2 pt-4 border-t">
            <p>Current Credit Balance: {formatCurrency(userBilling.credit_balance_cents)}</p>
            {userBilling.next_billing_date && (
              <p>Next Billing Date: {new Date(userBilling.next_billing_date).toLocaleDateString()}</p>
            )}
          </div>
        )}
        <Button
          onClick={redirectToPayment}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Processing..." : "Add Credits"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BillingSettings;
