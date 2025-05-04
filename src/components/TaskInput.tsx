import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

interface TaskInputProps {
  onAddTask: (text: string) => void;
  disabled?: boolean;
}

const TaskInput = ({ onAddTask, disabled = false }: TaskInputProps) => {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !disabled && !isSubmitting) {
      try {
        setIsSubmitting(true);
        await onAddTask(text.trim());
        setText("");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
      <Input
        type="text"
        placeholder="Add a new task..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 border-purple-200 focus-visible:ring-purple-300"
        disabled={disabled || isSubmitting}
      />
      <Button 
        type="submit" 
        disabled={!text.trim() || disabled || isSubmitting}
        className="bg-purple-600 hover:bg-purple-700"
      >
        {isSubmitting ? (
          <Loader2 size={16} className="mr-1 animate-spin" />
        ) : (
          <Plus size={16} className="mr-1" />
        )}
        Add
      </Button>
    </form>
  );
};

export default TaskInput;
