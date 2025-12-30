import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Task, DayData, HOURS } from '../types';
import { TimelineRow } from '../components/TimelineRow';
import { TaskBlock } from '../components/TaskBlock';
import { TaskEditorModal } from '../components/TaskEditorModal';

interface RecordViewProps {
  tasks: Task[];
  dayData: DayData;
  onUpdateHour: (hour: number, taskIds: string[]) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const RecordView: React.FC<RecordViewProps> = ({
  tasks,
  dayData,
  onUpdateHour,
  onUpdateTask,
  onDeleteTask
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 180;
  }, []);

  useEffect(() => {
      if (selectedTaskId && !tasks.find(t => t.id === selectedTaskId)) setSelectedTaskId(null);
  }, [tasks, selectedTaskId]);

  const categories = Array.from(new Set(tasks.map(t => t.category || '未分类'))).sort();

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id === selectedTaskId ? null : task.id);
  };

  const handleHourClick = (hour: number) => {
    if (!selectedTaskId) return;
    const current = dayData.hours[hour] || [];
    if (current.includes(selectedTaskId)) {
        onUpdateHour(hour, current.filter(id => id !== selectedTaskId));
    } else {
        onUpdateHour(hour, current.length < 4 ? [...current, selectedTaskId] : [...current.slice(1), selectedTaskId]);
    }
  };

  return (
    <div className="flex h-full bg-white">
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative bg-white h-full pb-32 border-r border-stone-100 custom-scrollbar">
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-20 px-3 py-2.5 flex justify-between items-center border-b border-stone-50 shadow-sm">
             <span className="text-[10px] font-bold text-secondary tracking-wider uppercase">真实记录</span>
             {selectedTaskId && <span className="text-[9px] text-secondary font-bold bg-secondary/5 px-2 py-0.5 rounded-full border border-secondary/10">点击时间轴添加</span>}
        </div>
        <div className="pt-1">
          {HOURS.map(hour => (
            <TimelineRow key={hour} hour={hour} assignedTaskIds={dayData.hours[hour] || []} allTasks={tasks} onClick={handleHourClick} showDuration={true} />
          ))}
        </div>
      </div>

      {/* Right: Task List - Widened for two-column layout */}
      <div className="w-[180px] sm:w-[280px] md:w-[340px] bg-[#fafaf9] flex flex-col h-full shrink-0 transition-all duration-300">
        <div className="p-2 sm:p-3 z-10 sticky top-0 bg-[#fafaf9]/95 backdrop-blur border-b border-stone-50">
          <h2 className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">任务选择</h2>
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
                      onClick={() => handleTaskClick(task)}
                      className="w-full px-2 py-1.5"
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