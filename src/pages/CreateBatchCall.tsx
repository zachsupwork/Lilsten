
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

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

export default function CreateBatchCall() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<BatchCallForm>({
    from_number: "",
    name: "",
    tasks: [{ to_number: "" }],
  });

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
      const response = await fetch("/api/create-batch-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
    } catch (error) {
      console.error("Error creating batch call:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create batch call. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Batch Call</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">From Number (E.164 format)</label>
              <Input
                type="text"
                placeholder="+14157774444"
                value={formData.from_number}
                onChange={(e) => setFormData(prev => ({ ...prev, from_number: e.target.value }))}
                required
                pattern="^\+[1-9]\d{10,14}$"
              />
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
              <Button type="submit" disabled={isLoading}>
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

