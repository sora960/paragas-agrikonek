
import { useState } from "react";
import { Task } from "@/types/task";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskItemProps {
  task: Task;
  onComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}

const TaskItem = ({ task, onComplete, onDelete }: TaskItemProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="flex items-center justify-between p-4 mb-2 bg-white rounded-lg shadow-sm border border-gray-100 animate-fade-in hover:border-purple-100 transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-4">
        <Checkbox 
          id={`task-${task.id}`}
          checked={task.completed}
          onCheckedChange={(checked) => onComplete(task.id, checked === true)}
          className="border-purple-300 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
        />
        <label 
          htmlFor={`task-${task.id}`}
          className={cn(
            "text-gray-800 transition-all", 
            task.completed && "line-through text-gray-400"
          )}
        >
          {task.text}
        </label>
      </div>
      
      <Button
        variant="ghost" 
        size="icon" 
        onClick={() => onDelete(task.id)}
        className={cn(
          "text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all",
          !isHovered && "opacity-0 md:opacity-100 md:opacity-30"
        )}
      >
        <Trash size={16} />
      </Button>
    </div>
  );
};

export default TaskItem;
