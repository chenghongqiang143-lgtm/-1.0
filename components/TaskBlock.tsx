import React from 'react';
import { Task } from '../types';
import { getContrastColor, cn } from '../utils';
import { Edit2 } from 'lucide-react';

interface TaskBlockProps {
  task: Task;
  onClick?: () => void;
  onDoubleClick?: () => void;
  selected?: boolean;
  className?: string;
  showEditIcon?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
}

export const TaskBlock: React.FC<TaskBlockProps> = ({ 
  task, 
  onClick, 
  onDoubleClick, 
  selected, 
  className,
  showEditIcon = false,
  draggable = false,
  onDragStart,
  onDragOver,
  onDrop
}) => {
  const textColor = getContrastColor(task.color);
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (onDragStart) {
      onDragStart(e, task);
    }
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "relative group flex items-center justify-between px-2.5 py-2 rounded-lg transition-all duration-200 cursor-pointer select-none",
        selected ? "ring-2 ring-offset-1 ring-primary shadow-md scale-[1.02]" : "hover:scale-[1.01] hover:shadow-sm",
        "active:scale-95",
        className
      )}
      style={{ backgroundColor: task.color }}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <span 
            className="font-bold text-[11px] truncate leading-tight tracking-wide"
            style={{ color: textColor }}
        >
          {task.name}
        </span>
      </div>
      
      {showEditIcon && (
        <div 
            className={cn(
                "opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full",
                textColor === '#ffffff' ? "hover:bg-white/20" : "hover:bg-black/10"
            )}
        >
             <Edit2 size={10} color={textColor} />
        </div>
      )}
      
      {/* Selection Indicator Dot */}
      {selected && (
        <div className="absolute -right-1 -top-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white" />
      )}
    </div>
  );
};