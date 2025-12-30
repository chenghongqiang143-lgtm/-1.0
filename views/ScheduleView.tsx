import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Task, DayData, HOURS } from '../types';
import { TaskBlock } from '../components/TaskBlock';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { TimelineRow } from '../components/TimelineRow';
import { cn } from '../utils';
import { Repeat } from 'lucide-react';

interface ScheduleViewProps {
  tasks: Task[];
  dayData: DayData;
  recurringData: Record<number, string[]>;
  onUpdateHour: (hour: number, taskIds: string[]) => void;
  onUpdateRecurring: (hour: number, taskIds: string[]) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  tasks,
  dayData,
  recurringData,
  onUpdateHour,
  onUpdateRecurring,
  onUpdateTask,
  onDeleteTask
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRepeatMode, setIsRepeatMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 180;
  }, []);

  useEffect(() => {
      if (selectedTaskId && !tasks.find(t => t.id === selectedTaskId)) setSelectedTaskId(null);
  }, [tasks, selectedTaskId]);

  const categories = Array.from(new Set(tasks.map(t => t.category || '未分类'))).sort();

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  const handleTaskClick = (taskId: string) => {
      setSelectedTaskId(selectedTaskId === taskId ? null : taskId);
  };

  const handleHourClick = (hour: number) => {
      if (!selectedTaskId) return;
      if (isRepeatMode) {
         const current = recurringData[hour] || [];
         if (current.includes(selectedTaskId)) {
             onUpdateRecurring(hour, current.filter(id => id !== selectedTaskId));
         } else {
             onUpdateRecurring(hour, current.length < 4 ? [...current, selectedTaskId] : [...current.slice(1), selectedTaskId]);
         }
      } else {
         const current = dayData.hours[hour] || [];
         if (current.includes(selectedTaskId)) {
             onUpdateHour(hour, current.filter(id => id !== selectedTaskId));
         } else {
             onUpdateHour(hour, current.length < 4 ? [...current, selectedTaskId] : [...current.slice(1), selectedTaskId]);
         }
      }
  };

  return (
    <div className="flex h-full bg-white">
      {/* Left: Timeline - Grows with screen */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative bg-white h-full pb-32 custom-scrollbar border-r border-stone-100">
         <div className={cn(
             "sticky top-0 backdrop-blur-md z-20 px-3 py-2.5 flex justify-between items-center border-b shadow-sm transition-colors",
             isRepeatMode ? "bg-purple-50/95 border-purple-100" : "bg-white/95 border-stone-50"
         )}>
             <span className={cn("text-[10px] font-bold tracking-wider uppercase", isRepeatMode ? "text-purple-600" : "text-primary")}>
                 {isRepeatMode ? "重复日程 (每日)" : "今日计划"}
             </span>
             {selectedTaskId && (
                 <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", isRepeatMode ? "text-purple-600 bg-purple-100 border-purple-200" : "text-primary bg-primary/5 border-primary/10")}>
                     {isRepeatMode ? "固定模式" : "选择模式"}
                 </span>
             )}
        </div>
        <div className="pt-1">
          {HOURS.map(hour => (
            <TimelineRow key={hour} hour={hour} assignedTaskIds={dayData.hours[hour] || []} allTasks={tasks} onClick={handleHourClick} showDuration={true} />
          ))}
        </div>
      </div>

      {/* Right: Task List - Widened for two-column layout */}
      <div className="w-[180px] sm:w-[280px] md:w-[340px] bg-[#fafaf9] flex flex-col h-full shrink-0 transition-all duration-300">
        <div className="p-2 sm:p-3 z-10 sticky top-0 bg-[#fafaf9]/95 backdrop-blur border-b border-stone-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h2 className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">任务池</h2>
          <button
            onClick={() => setIsRepeatMode(!isRepeatMode)}
            className={cn(
                "flex items-center gap-1.5 px-1.5 py-1 rounded-lg transition-all active:scale-95 border",
                isRepeatMode ? "bg-purple-600 text-white border-purple-600 shadow-sm" : "bg-white text-stone-500 border-stone-200"
            )}
          >
              <Repeat size={10} />
              <span className="text-[9px] font-bold">重复</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-1.5 sm:px-2 pb-32 space-y-4 pt-3 custom-scrollbar">
          {categories.map(cat => (
            <div key={cat}>
               <h3 className="text-[8px] sm:text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">{cat}</h3>
               {/* Forced grid-cols-2 for task modules */}
               <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {tasks.filter(t => (t.category || '未分类') === cat).map(task => (
                    <TaskBlock
                      key={task.id} task={task} selected={selectedTaskId === task.id}
                      onClick={() => handleTaskClick(task.id)}
                      onDoubleClick={() => openEditModal(task)}
                      className="w-full px-2 py-1.5" showEditIcon={true}
                    />
                  ))}
               </div>
            </div>
          ))}
        </div>
      </div>

      <TaskEditorModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} task={editingTask} onSave={onUpdateTask} onDelete={onDeleteTask} />
    </div>
  );
};