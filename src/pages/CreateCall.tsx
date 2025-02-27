
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Phone, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PhoneNumber {
  phone_number: string;
  phone_number_pretty: string;
  nickname: string | null;
}

interface ToNumberEntry {
  number: string;
}

const CreateCall = () => {
  const [fromNumbers, setFromNumbers] = useState<PhoneNumber[]>([]);
  const [fromNumber, setFromNumber] = useState("");
  const [toNumbers, setToNumbers] = useState<ToNumberEntry[]>([{ number: "" }]);
  const [loading, setLoading] = useState(false);
  const [loadingNumbers, setLoadingNumbers] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPhoneNumbers = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          'retell-calls',
          {
            body: {
              action: 'listPhoneNumbers'
            }
          }
        );

        if (error) throw error;
        setFromNumbers(data);
      } catch (err: any) {
        console.error('Error fetching phone numbers:', err);
        toast({
          variant: "destructive",
          title: "Error loading phone numbers",
          description: err.message || "Failed to load phone numbers",
        });
      } finally {
        setLoadingNumbers(false);
      }
    };

    fetchPhoneNumbers();
  }, [toast]);

  const handleAddNumber = () => {
    setToNumbers([...toNumbers, { number: "" }]);
  };

  const handleRemoveNumber = (index: number) => {
    if (toNumbers.length > 1) {
      const newNumbers = toNumbers.filter((_, i) => i !== index);
      setToNumbers(newNumbers);
    }
  };

  const handleNumberChange = (index: number, value: string) => {
    const newNumbers = [...toNumbers];
    newNumbers[index] = { number: value };
    setToNumbers(newNumbers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Filter out empty numbers
    const validNumbers = toNumbers.filter(entry => entry.number.trim() !== "");
    
    if (validNumbers.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter at least one valid phone number",
      });
      setLoading(false);
      return;
    }

    try {
      // If there's only one number, use createPhoneCall
      if (validNumbers.length === 1) {
        const { data, error } = await supabase.functions.invoke(
          'retell-calls',
          {
            body: {
              action: 'createPhoneCall',
              from_number: fromNumber,
              to_number: validNumbers[0].number,
            }
          }
        );

        if (error) throw error;

        toast({
          title: "Call created successfully",
          description: `Call ID: ${data.call_id}`,
        });

        navigate(`/calls/${data.call_id}`);
      } else {
        // If there are multiple numbers, use createBatchCall
        const { data, error } = await supabase.functions.invoke(
          'retell-calls',
          {
            body: {
              action: 'createBatchCall',
              from_number: fromNumber,
              tasks: validNumbers.map(n => ({ to_number: n.number }))
            }
          }
        );

        if (error) throw error;

        toast({
          title: "Batch call created successfully",
          description: `Created ${data.summary.successful} calls, ${data.summary.failed} failed`,
        });

        navigate("/calls");
      }
    } catch (err: any) {
      console.error('Error creating call:', err);
      toast({
        variant: "destructive",
        title: "Error creating call",
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
              Create {toNumbers.length > 1 ? "Batch" : ""} Phone Call
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="fromNumber" className="text-sm font-medium">
                  From Number
                </label>
                <Select
                  value={fromNumber}
                  onValueChange={setFromNumber}
                >
                  <SelectTrigger className="font-mono">
                    <SelectValue placeholder="Select a phone number" />
                  </SelectTrigger>
                  <SelectContent>
                    {fromNumbers.map((number) => (
                      <SelectItem 
                        key={number.phone_number} 
                        value={number.phone_number}
                        className="font-mono"
                      >
                        {number.nickname ? `${number.phone_number_pretty} (${number.nickname})` : number.phone_number_pretty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  Must be a number purchased from or imported to Retell
                </p>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium">To Number(s)</label>
                {toNumbers.map((entry, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="+12137774445"
                      value={entry.number}
                      onChange={(e) => handleNumberChange(index, e.target.value)}
                      required
                      pattern="^\+[1-9]\d{1,14}$"
                      className="font-mono"
                    />
                    {toNumbers.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemoveNumber(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddNumber}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Number
                </Button>
                <p className="text-sm text-gray-500">
                  The number(s) you want to call (E.164 format)
                </p>
              </div>

              <Button type="submit" disabled={loading || loadingNumbers} className="w-full">
                {loading ? "Creating..." : `Create ${toNumbers.length > 1 ? "Batch " : ""}Call`}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateCall;

