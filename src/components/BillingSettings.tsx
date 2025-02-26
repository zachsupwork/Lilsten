import { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const stripePromise = loadStripe("pk_test_51Lcuo7ByONQ6hwN8gUOzq0AwshsrVERzHtQCUxQWfDBBAo6b8BQ8nUyTUqI6YIcAz3sriDyVigVRD2276EMJh9S200CUlrWUaX");

interface BillingSettings {
  setup_fee_cents: number;
  monthly_fee_cents: number;
  call_cost_multiplier: number;
}

interface UserBilling {
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  credit_balance_cents: number;
  next_billing_date: string | null;
}

const BillingSettings = () => {
  const [loading, setLoading] = useState(false);
  const [billingInfo, setBillingInfo] = useState<BillingSettings | null>(null);
  const [setupIntent, setSetupIntent] = useState<string | null>(null);
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    loadBillingInfo();
  }, []);

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

  const setupBilling = async () => {
    if (!session?.user) return;

    setLoading(true);
    try {
      console.log('Starting billing setup for user:', session.user.email);
      
      // Step 1: Create Stripe customer
      const { data: customerData, error: customerError } = await supabase.functions.invoke(
        "stripe-billing",
        {
          body: {
            action: "createCustomer",
            email: session.user.email,
            userId: session.user.id,
          },
        }
      );

      if (customerError || !customerData?.customerId) {
        console.error('Customer creation error:', customerError);
        throw new Error(customerError?.message || "Failed to create Stripe customer");
      }

      console.log('Customer created:', customerData.customerId);

      // Step 2: Create subscription with metered billing
      const { data: subscriptionData, error: subscriptionError } = await supabase.functions.invoke(
        "stripe-billing",
        {
          body: {
            action: "createSubscription",
            customerId: customerData.customerId,
            userId: session.user.id,
            setupFeeCents: billingInfo?.setup_fee_cents,
            monthlyFeeCents: billingInfo?.monthly_fee_cents,
            callCostMultiplier: billingInfo?.call_cost_multiplier,
          },
        }
      );

      if (subscriptionError || !subscriptionData?.subscriptionId) {
        console.error('Subscription creation error:', subscriptionError);
        throw new Error(subscriptionError?.message || "Failed to create subscription");
      }

      console.log('Subscription created:', subscriptionData.subscriptionId);

      // Step 3: Update user_billing record
      const { error: updateError } = await supabase
        .from("user_billing")
        .upsert({
          user_id: session.user.id,
          stripe_customer_id: customerData.customerId,
          stripe_subscription_id: subscriptionData.subscriptionId,
          credit_balance_cents: billingInfo ? billingInfo.setup_fee_cents + billingInfo.monthly_fee_cents : 0,
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (updateError) {
        console.error('Billing record update error:', updateError);
        throw updateError;
      }

      toast({
        title: "Billing setup complete",
        description: "Your billing information has been saved successfully.",
      });
    } catch (error: any) {
      console.error("Error setting up billing:", error);
      toast({
        variant: "destructive",
        title: "Error setting up billing",
        description: error.message,
      });
    } finally {
      setLoading(false);
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
            <p>Setup Fee: {formatCurrency(billingInfo.setup_fee_cents)}</p>
            <p>Monthly Fee: {formatCurrency(billingInfo.monthly_fee_cents)}/month</p>
            <p>
              Call Cost Multiplier: {billingInfo.call_cost_multiplier}x standard
              rate
            </p>
          </div>
        )}
        <Button
          onClick={setupBilling}
          disabled={loading || !billingInfo}
          className="w-full"
        >
          {loading ? "Setting up..." : "Set Up Billing"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BillingSettings;
