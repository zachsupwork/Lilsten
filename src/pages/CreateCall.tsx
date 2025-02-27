
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Phone, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RETELL_API_KEY } from "../../src/lib/retell";

interface BatchCallTask {
  to_number: string;
  retell_llm_dynamic_variables?: Record<string, any>;
}

interface BatchCallForm {
  from_number: string;
  name: string;
  tasks: BatchCallTask[];
  trigger_timestamp?: number;
}

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
  const [formData, setFormData] = useState<BatchCallForm>({
      from_number: "",
      name: "Agent Batch Call",
      tasks: [{ to_number: "" }],
    });
  const [fromNumber, setFromNumber] = useState("");
  const [toNumbers, setToNumbers] = useState<ToNumberEntry[]>([{ number: "" }]);
  const [loading, setLoading] = useState(false);
  const [loadingNumbers, setLoadingNumbers] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPhoneNumbers = async () => {
      try {                  
            const response = await fetch("https://api.retellai.com/list-phone-numbers", {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${RETELL_API_KEY}`,
                "Content-Type": "application/json"
              }
            });
      
            if (!response.ok) {
              const errorText = await response.text();
              console.error("Retell API error:", response.status, errorText);
              throw new Error(`Failed to fetch phonenumber: ${response.status} ${errorText}`);
            }
      
            const data = await response.json();
            console.log("Phone number fetched successfully:", data);
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
    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, { to_number: "" }]
    }));
  };

  const handleRemoveNumber = (index: number) => {
    if (toNumbers.length > 1) {
      const newNumbers = toNumbers.filter((_, i) => i !== index);
      setToNumbers(newNumbers);
    }
    if (formData.tasks.length > 1) {
      const newTasks = formData.tasks.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        tasks: newTasks
      }));
    }
  };

  const handleNumberChange = (index: number, value: string) => {
    const newNumbers = [...toNumbers];
    newNumbers[index] = { number: value };
    setToNumbers(newNumbers);
    const newTasks = [...formData.tasks];
    newTasks[index] = { ...newTasks[index], to_number: value };
    setFormData(prev => ({
      ...prev,
      tasks: newTasks
    }));
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
        const response = await fetch("https://api.retellai.com/v2/create-phone-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RETELL_API_KEY}`
        },
          body: JSON.stringify({
              action: 'createPhoneCall',
              from_number: fromNumber,
              to_number: validNumbers[0].number,
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create phone call");
        }

        toast({
          title: "Call created successfully",
          description: `Call ID: ${data.call_id}`,
        });

        navigate(`/calls/${data.call_id}`);
      } else {
        const response = await fetch("https://api.retellai.com/create-batch-call", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RETELL_API_KEY}`
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create batch call");
        }

        toast({
          title: "Success",
          description: `Batch call created with ID: ${data.batch_call_id}`,
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
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, from_number: value }))
                    setFromNumber(value)
                  }}
                >
                  <SelectTrigger className="font-mono">
                    <SelectValue placeholder="Select a phone number"/>
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

