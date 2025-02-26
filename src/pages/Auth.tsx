
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const createStripeCustomer = async (userId: string, userEmail: string) => {
    try {
      console.log('Creating Stripe customer for:', { userId, userEmail });
      
      const { data, error } = await supabase.functions.invoke("stripe-billing", {
        body: {
          action: "createCustomer",
          email: userEmail,
          userId: userId,
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data?.customerId) {
        console.error('No customerId returned:', data);
        throw new Error('No customer ID returned from Stripe');
      }
      
      console.log('Creating user_billing record with:', {
        userId,
        stripeCustomerId: data.customerId,
      });

      // Initialize user_billing record with default values
      const { error: billingError } = await supabase
        .from("user_billing")
        .insert({
          user_id: userId,
          stripe_customer_id: data.customerId,
          credit_balance_cents: 0,
          next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (billingError) {
        console.error('Error creating billing record:', billingError);
        throw billingError;
      }

      return data.customerId;
    } catch (error: any) {
      console.error("Error in createStripeCustomer:", error);
      throw new Error(error.message || "Failed to create Stripe customer");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        console.log('Signing up user:', email);
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (signUpError) {
          console.error('Signup error:', signUpError);
          throw signUpError;
        }
        
        if (signUpData.user) {
          console.log('User created successfully:', signUpData.user.id);
          // Create Stripe customer after successful signup
          await createStripeCustomer(signUpData.user.id, signUpData.user.email || email);
          
          toast({
            title: "Account created",
            description: "Please check your email to confirm your account.",
          });
        } else {
          throw new Error('User data not returned from signup');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        navigate("/");
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        variant: "destructive",
        title: "Authentication error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? "Create Account" : "Welcome Back"}</CardTitle>
          <CardDescription>
            {isSignUp
              ? "Sign up for a new account"
              : "Sign in to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Loading..."
                : isSignUp
                ? "Create Account"
                : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Need an account? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
