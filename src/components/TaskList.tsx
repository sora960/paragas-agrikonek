
import { Task } from "@/types/task";
import TaskItem from "./TaskItem";

interface TaskListProps {
  tasks: Task[];
  onCompleteTask: (id: string, completed: boolean) => void;
  onDeleteTask: (id: string) => void;
}

const TaskList = ({ tasks, onCompleteTask, onDeleteTask }: TaskListProps) => {
  if (tasks.length === 0) {
    return (
      <div className="text-center p-8 animate-fade-in">
        <p className="text-gray-500">No tasks yet. Add one to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 animate-fade-in">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onComplete={onCompleteTask}
          onDelete={onDeleteTask}
        />
      ))}
    </div>
  );
};

export default TaskList;
