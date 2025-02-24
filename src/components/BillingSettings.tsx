
import { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Initialize Stripe (use your publishable key)
const stripePromise = loadStripe("YOUR_PUBLISHABLE_KEY");

const BillingSettings = () => {
  const [loading, setLoading] = useState(false);
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [setupIntent, setSetupIntent] = useState<string | null>(null);
  const { toast } = useToast();
  const [session] = useState(() => supabase.auth.getSession());

  useEffect(() => {
    loadBillingInfo();
  }, []);

  const loadBillingInfo = async () => {
    try {
      const { data: billingSettings } = await supabase
        .from("billing_settings")
        .select("*")
        .single();

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
    if (!session) return;

    setLoading(true);
    try {
      // Create Stripe customer
      const { data: customerData } = await supabase.functions.invoke(
        "stripe-billing",
        {
          body: {
            action: "createCustomer",
            email: session.user?.email,
            userId: session.user?.id,
          },
        }
      );

      if (!customerData?.customerId) {
        throw new Error("Failed to create Stripe customer");
      }

      // Create SetupIntent
      const { data: setupData } = await supabase.functions.invoke(
        "stripe-billing",
        {
          body: {
            action: "setupIntent",
            customerId: customerData.customerId,
          },
        }
      );

      if (!setupData?.clientSecret) {
        throw new Error("Failed to create setup intent");
      }

      setSetupIntent(setupData.clientSecret);

      // Create subscription and charge setup fee
      const { data: subscriptionData } = await supabase.functions.invoke(
        "stripe-billing",
        {
          body: {
            action: "createSubscription",
            customerId: customerData.customerId,
            userId: session.user?.id,
            setupFee: billingInfo.setup_fee,
            monthlyFee: billingInfo.monthly_fee,
            currentCallCost: billingInfo.call_cost_multiplier,
          },
        }
      );

      if (!subscriptionData?.subscriptionId) {
        throw new Error("Failed to create subscription");
      }

      // Update user_billing record
      await supabase
        .from("user_billing")
        .upsert({
          user_id: session.user?.id,
          stripe_customer_id: customerData.customerId,
          stripe_subscription_id: subscriptionData.subscriptionId,
          credit_balance: billingInfo.setup_fee + billingInfo.monthly_fee,
          last_monthly_charge: new Date().toISOString(),
        });

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billing Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {billingInfo && (
          <div className="space-y-2">
            <p>Setup Fee: ${billingInfo.setup_fee}</p>
            <p>Monthly Fee: ${billingInfo.monthly_fee}/month</p>
            <p>
              Call Cost Multiplier: {billingInfo.call_cost_multiplier}x standard
              rate
            </p>
          </div>
        )}
        {setupIntent ? (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret: setupIntent }}
          >
            {/* Add Stripe Elements payment form component here */}
          </Elements>
        ) : (
          <Button
            onClick={setupBilling}
            disabled={loading || !billingInfo}
            className="w-full"
          >
            {loading ? "Setting up..." : "Set Up Billing"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default BillingSettings;
