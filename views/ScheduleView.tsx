import React, { useState } from 'react';
import { Task, DayData, HOURS } from '../types';
import { TaskBlock } from '../components/TaskBlock';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { TimelineRow } from '../components/TimelineRow';
import { Repeat } from 'lucide-react';

interface ScheduleViewProps {
  tasks: Task[];
  dayData: DayData;
  onUpdateHour: (hour: number, taskIds: string[]) => void;
  onUpdateTask: (task: Task) => void;
  onRepeatTask: (taskId: string, hour: number) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  tasks,
  dayData,
  onUpdateHour,
  onUpdateTask,
  onRepeatTask
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [repeatMode, setRepeatMode] = useState(false);

  // Group tasks by category
  const categories = Array.from(new Set(tasks.map(t => t.category || '未分类'))).sort();

  const handleTaskDoubleClick = (task: Task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  const handleHourClick = (hour: number) => {
      if (selectedTaskId) {
          if (repeatMode) {
              onRepeatTask(selectedTaskId, hour);
              setRepeatMode(false);
          } else {
             const currentTasks = dayData.hours[hour] || [];
             if (currentTasks.includes(selectedTaskId)) {
                 onUpdateHour(hour, currentTasks.filter(id => id !== selectedTaskId));
             } else {
                 if (currentTasks.length < 4) {
                     onUpdateHour(hour, [...currentTasks, selectedTaskId]);
                 } else {
                    onUpdateHour(hour, [...currentTasks.slice(1), selectedTaskId]);
                 }
             }
          }
      }
  };
  
  const handleTaskDrop = (hour: number, taskId: string) => {
       const currentTasks = dayData.hours[hour] || [];
       if (!currentTasks.includes(taskId)) {
            if (currentTasks.length < 4) {
                onUpdateHour(hour, [...currentTasks, taskId]);
            } else {
                onUpdateHour(hour, [...currentTasks.slice(1), taskId]);
            }
       }
  };

  return (
    <div className="flex h-full bg-white">
      {/* Left: Task List */}
      <div className="w-[120px] sm:w-[140px] border-r border-stone-100 bg-[#fafaf9] flex flex-col h-full shrink-0">
        <div className="p-3 z-10 sticky top-0 bg-[#fafaf9]/95 backdrop-blur border-b border-stone-50">
          <h2 className="text-[9px] font-bold text-stone-400 uppercase tracking-widest ml-1">任务池</h2>
          {selectedTaskId && (
              <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                 <button 
                    onClick={() => setRepeatMode(!repeatMode)}
                    className={`text-[9px] w-full justify-center flex items-center gap-1 px-2 py-1 rounded-full border transition-all ${repeatMode ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'}`}
                 >
                    <Repeat size={10} /> {repeatMode ? '点击' : '重复'}
                 </button>
              </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-24 space-y-4 pt-3 custom-scrollbar">
          {categories.map(cat => (
            <div key={cat}>
               <div className="flex items-center gap-1.5 mb-1.5 ml-1">
                   <div className="w-0.5 h-0.5 rounded-full bg-stone-300"></div>
                   <h3 className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{cat}</h3>
               </div>
               <div className="space-y-1.5">
                  {tasks.filter(t => (t.category || '未分类') === cat).map(task => (
                    <TaskBlock
                      key={task.id}
                      task={task}
                      selected={selectedTaskId === task.id}
                      onClick={() => setSelectedTaskId(task.id === selectedTaskId ? null : task.id)}
                      onDoubleClick={() => handleTaskDoubleClick(task)}
                      className="w-full"
                      showEditIcon
                      draggable={true}
                    />
                  ))}
               </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="text-center py-10 text-stone-300 text-[10px] px-2 leading-relaxed">
                点击右下角设置<br/>去添加任务
            </div>
          )}
        </div>
      </div>

      {/* Right: Timeline */}
      <div className="flex-1 overflow-y-auto relative bg-white h-full pb-20 custom-scrollbar">
         <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-20 px-3 py-2.5 flex justify-between items-center border-b border-stone-50 shadow-sm">
             <span className="text-[10px] font-bold text-primary tracking-wider uppercase">今日计划</span>
             {selectedTaskId && <span className="text-[9px] text-primary font-medium bg-primary/5 px-1.5 py-0.5 rounded-full border border-primary/10">选择模式</span>}
        </div>
        <div className="pt-1 pb-32">
          {HOURS.map(hour => (
            <TimelineRow
              key={hour}
              hour={hour}
              assignedTaskIds={dayData.hours[hour] || []}
              allTasks={tasks}
              onClick={handleHourClick}
              onTaskDrop={handleTaskDrop}
              showDuration={true}
            />
          ))}
        </div>
      </div>

      <TaskEditorModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        task={editingTask}
        onSave={(updated) => {
            onUpdateTask(updated);
            setEditingTask(null);
        }}
      />
    </div>
  );
};