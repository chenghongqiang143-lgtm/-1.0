import React, { useState } from 'react';
import { Task, DayData, HOURS } from '../types';
import { TimelineRow } from '../components/TimelineRow';
import { TaskBlock } from '../components/TaskBlock';

interface RecordViewProps {
  tasks: Task[];
  dayData: DayData;
  onUpdateHour: (hour: number, taskIds: string[]) => void;
}

export const RecordView: React.FC<RecordViewProps> = ({
  tasks,
  dayData,
  onUpdateHour,
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const categories = Array.from(new Set(tasks.map(t => t.category || '未分类'))).sort();

  const handleHourClick = (hour: number) => {
    if (!selectedTaskId) return;

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
  };

  return (
    <div className="flex h-full bg-white">
      {/* Left: Timeline */}
      <div className="flex-1 overflow-y-auto relative bg-white h-full pb-20 border-r border-stone-100 custom-scrollbar">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-20 px-3 py-2.5 flex justify-between items-center border-b border-stone-50 shadow-sm">
             <span className="text-[10px] font-bold text-secondary tracking-wider uppercase">真实记录</span>
             {selectedTaskId && <span className="text-[9px] text-secondary font-medium bg-secondary/5 px-1.5 py-0.5 rounded-full border border-secondary/10">记录模式</span>}
        </div>
        <div className="pt-1 pb-32">
          {HOURS.map(hour => (
            <TimelineRow
              key={hour}
              hour={hour}
              assignedTaskIds={dayData.hours[hour] || []}
              allTasks={tasks}
              onClick={handleHourClick}
              showDuration={true}
            />
          ))}
        </div>
      </div>

      {/* Right: Task List */}
      <div className="w-[120px] sm:w-[140px] bg-[#fafaf9] flex flex-col h-full shrink-0">
        <div className="p-3 z-10 sticky top-0 bg-[#fafaf9]/95 backdrop-blur border-b border-stone-50">
          <h2 className="text-[9px] font-bold text-stone-400 uppercase tracking-widest ml-1">任务选择</h2>
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
                      className="w-full"
                    />
                  ))}
               </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="text-center py-10 text-stone-300 text-[10px]">
                暂无任务
            </div>
          )}
        </div>
      </div>
    </div>
  );
};