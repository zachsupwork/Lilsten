
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
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

export default function CreateBatchCall() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingNumbers, setLoadingNumbers] = useState(true);
  const [fromNumbers, setFromNumbers] = useState<PhoneNumber[]>([]);
  const [formData, setFormData] = useState<BatchCallForm>({
    from_number: "",
    name: "",
    tasks: [{ to_number: "" }],
  });

  useEffect(() => {
    const fetchPhoneNumbers = async () => {
      try {
        const response = await fetch('https://api.retellai.com/list-phone-numbers', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${RETELL_API_KEY}`,
              'Content-Type': 'application/json',
            }
          });

          if (!response.ok) {
              const errorText = await response.text();
              console.error("Retell API error:", response.status, errorText);
              throw new Error(`Failed to fetch phonenumber: ${response.status} ${errorText}`);
            }
      
          const data = await response.json();
          console.log("phone number fetched successfully:", data);
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

  const handleAddTask = () => {
    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, { to_number: "" }]
    }));
  };

  const handleTaskChange = (index: number, value: string) => {
    const newTasks = [...formData.tasks];
    newTasks[index] = { ...newTasks[index], to_number: value };
    setFormData(prev => ({
      ...prev,
      tasks: newTasks
    }));
  };

  const handleRemoveTask = (index: number) => {
    if (formData.tasks.length > 1) {
      const newTasks = formData.tasks.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        tasks: newTasks
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // If validation passes, proceed with batch call creation
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
    } catch (error: any) {
      console.error("Error creating batch call:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create batch call. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Batch Call</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">From Number</label>
              <Select
                value={formData.from_number}
                onValueChange={(value) => setFormData(prev => ({ ...prev, from_number: value }))}
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
              <p className="text-sm text-gray-500 mt-1">
                Must be a number purchased from or imported to Retell
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Batch Call Name</label>
              <Input
                type="text"
                placeholder="My Batch Call"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium mb-2">Call Tasks</label>
              {formData.tasks.map((task, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="To Number (E.164 format)"
                    value={task.to_number}
                    onChange={(e) => handleTaskChange(index, e.target.value)}
                    required
                    pattern="^\+[1-9]\d{10,14}$"
                    className="font-mono"
                  />
                  {formData.tasks.length > 1 && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleRemoveTask(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTask}
                className="mt-2"
              >
                Add Task
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Schedule Time (optional)</label>
              <Input
                type="datetime-local"
                onChange={(e) => {
                  const timestamp = new Date(e.target.value).getTime();
                  setFormData(prev => ({ ...prev, trigger_timestamp: timestamp }));
                }}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading || loadingNumbers}>
                {isLoading ? "Creating..." : "Create Batch Call"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/calls")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
