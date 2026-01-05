
import React, { useState, useRef, useLayoutEffect, useMemo, useEffect } from 'react';
import { Task, DayData, HOURS, Objective, Todo } from '../types';
import { TimelineRow } from '../components/TimelineRow';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { cn, formatDate, generateId } from '../utils';
import { Clock, LayoutGrid, Check, X, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';

interface TrackerViewProps {
  tasks: Task[];
  objectives: Objective[];
  categoryOrder: string[];
  scheduleData: DayData;
  recordData: DayData;
  recurringSchedule: Record<number, string[]>;
  allRecords: Record<string, DayData>;
  onUpdateRecord: (hour: number, taskIds: string[]) => void;
  onUpdateSchedule: (hour: number, taskIds: string[]) => void;
  onUpdateRecurring: (hour: number, taskIds: string[]) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTodo: (todo: Todo) => void;
  currentDate: Date;
  onEditingStatusChange?: (status: string | null) => void;
}

export const TrackerView: React.FC<TrackerViewProps> = ({
  tasks,
  objectives,
  categoryOrder,
  scheduleData,
  recordData,
  recurringSchedule,
  onUpdateRecord,
  onUpdateSchedule,
  onUpdateRecurring,
  onUpdateTask,
  onDeleteTask,
  onAddTodo,
  currentDate,
  onEditingStatusChange
}) => {
  const [activeSlot, setActiveSlot] = useState<{ hour: number, side: 'plan' | 'actual' } | null>(null);
  const [isRecurringMode, setIsRecurringMode] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 180;
  }, []);

  // 同步状态到父组件
  useEffect(() => {
    if (onEditingStatusChange) {
      if (activeSlot) {
        onEditingStatusChange(`${activeSlot.hour}:00 ${activeSlot.side === 'plan' ? '安排' : '记录'}`);
      } else {
        onEditingStatusChange(null);
      }
    }
  }, [activeSlot, onEditingStatusChange]);

  const taskProgress = useMemo(() => {
    const stats: Record<string, number> = {};
    tasks.forEach(t => stats[t.id] = 0);
    
    HOURS.forEach(h => {
      const ids = recordData.hours[h] || [];
      ids.forEach(tid => {
        if (stats[tid] !== undefined) {
          const task = tasks.find(t => t.id === tid);
          if (task?.targets?.mode === 'count') {
            stats[tid] += 1;
          } else {
            stats[tid] += (1 / Math.max(ids.length, 1));
          }
        }
      });
    });
    return stats;
  }, [tasks, recordData]);

  const sortedCategories = useMemo(() => {
    const existingCats = new Set(tasks.map(t => t.category || '未分类'));
    const ordered = categoryOrder.filter(c => existingCats.has(c));
    const others = Array.from(existingCats).filter(c => !categoryOrder.includes(c));
    return [...ordered, ...others];
  }, [tasks, categoryOrder]);

  const getObjectiveTitle = (id: string) => {
    if (id === '未分类') return '未分类';
    const obj = objectives.find(o => o.id === id);
    return obj ? obj.title : '未知分类';
  };

  const handleHourClick = (hour: number, side: 'plan' | 'actual') => {
    setActiveSlot(prev => (prev?.hour === hour && prev?.side === side) ? null : { hour, side });
  };

  const handleToggleTaskInSlot = (taskId: string) => {
    if (!activeSlot) return;

    const { hour, side } = activeSlot;

    if (side === 'actual') {
        const current = recordData.hours[hour] || [];
        const isIncluded = current.includes(taskId);
        if (isIncluded) {
            onUpdateRecord(hour, current.filter(id => id !== taskId));
        } else {
            onUpdateRecord(hour, [...current, taskId].slice(-4));
        }
    } else {
        if (isRecurringMode) {
            const current = recurringSchedule[hour] || [];
            const isIncluded = current.includes(taskId);
            if (isIncluded) {
                onUpdateRecurring(hour, current.filter(id => id !== taskId));
            } else {
                onUpdateRecurring(hour, [...current, taskId].slice(-4));
            }
        } else {
            const current = scheduleData.hours[hour] || [];
            const isIncluded = current.includes(taskId);
            if (isIncluded) {
                onUpdateSchedule(hour, current.filter(id => id !== taskId));
            } else {
                onUpdateSchedule(hour, [...current, taskId].slice(-4));
            }
        }
    }
  };

  const isTaskInActiveSlot = (taskId: string) => {
      if (!activeSlot) return false;
      const { hour, side } = activeSlot;
      if (side === 'actual') return (recordData.hours[hour] || []).includes(taskId);
      if (isRecurringMode) return (recurringSchedule[hour] || []).includes(taskId);
      return (scheduleData.hours[hour] || []).includes(taskId);
  };

  const PoolContent = () => (
    <div className="flex flex-col h-full bg-white">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10 shrink-0">
            <h3 className="text-[9px] font-bold text-stone-900 uppercase tracking-widest flex items-center gap-1.5">
                <LayoutGrid size={10} /> 行为模板库
            </h3>
            {activeSlot?.side === 'plan' && (
                <button 
                    onClick={() => setIsRecurringMode(!isRecurringMode)}
                    className={cn(
                        "px-2 py-0.5 rounded-md text-[8px] font-bold uppercase transition-all flex items-center gap-1 border",
                        isRecurringMode ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-400 border-stone-100 hover:border-stone-300"
                    )}
                >
                    <Repeat size={10} /> {isRecurringMode ? '已开启循环' : '循环'}
                </button>
            )}
            <button onClick={() => setActiveSlot(null)} className="p-1 hover:bg-stone-100 rounded-full text-stone-300 transition-colors">
                <X size={14} />
            </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar pb-32">
            {sortedCategories.map(cat => (
                <div key={cat} className="space-y-2">
                    <div className="px-1 flex items-center gap-2">
                        <span className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.2em] truncate">{getObjectiveTitle(cat)}</span>
                        <div className="h-px flex-1 bg-stone-100" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {tasks.filter(t => (t.category || '未分类') === cat).map(task => {
                            const isSelected = isTaskInActiveSlot(task.id);
                            const currentVal = taskProgress[task.id] || 0;
                            const target = task.targets;
                            const dailyTarget = target ? (target.value / target.frequency) : 0;
                            const progress = dailyTarget > 0 ? Math.min((currentVal / dailyTarget) * 100, 100) : 0;
                            const isCompleted = progress >= 100;

                            return (
                                <div 
                                    key={task.id}
                                    onClick={(e) => { e.stopPropagation(); handleToggleTaskInSlot(task.id); }}
                                    className={cn(
                                        "px-3 h-10 rounded-xl border transition-all cursor-pointer relative shadow-sm flex items-center overflow-hidden",
                                        isSelected 
                                            ? "bg-stone-900 border-stone-900 text-white z-10" 
                                            : "bg-white border-stone-100 hover:border-stone-300 text-stone-700"
                                    )}
                                >
                                    {!isSelected && (
                                        <div 
                                            className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all duration-700 ease-out z-0"
                                            style={{ 
                                                width: `${progress}%`, 
                                                backgroundColor: `${task.color}15`
                                            }}
                                        />
                                    )}

                                    <div className="relative z-10 flex items-center gap-2 w-full min-w-0">
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full shrink-0",
                                            isCompleted && !isSelected ? "animate-pulse shadow-[0_0_4px_rgba(0,0,0,0.2)]" : ""
                                        )} style={{ backgroundColor: isSelected ? 'white' : task.color }} />
                                        
                                        <span className={cn(
                                            "text-[10px] font-bold leading-none truncate flex-1"
                                        )}>{task.name}</span>

                                        {!isSelected && isCompleted && (
                                          <Check size={8} className="text-emerald-500 shrink-0" />
                                        )}
                                        {!isSelected && !isCompleted && dailyTarget > 0 && (
                                          <span className="text-[7px] font-medium text-stone-300 tabular-nums shrink-0">
                                            {Math.round(progress)}%
                                          </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  return (
    <div className="flex h-full bg-white overflow-hidden relative">
      {/* 记录页 (Actual Side) 激活时从左侧弹出 */}
      <aside className={cn(
        "absolute left-0 top-0 bottom-0 w-[240px] bg-white border-r border-stone-200 z-[70] transition-transform duration-500 ease-out shadow-[10px_0_40px_rgba(0,0,0,0.08)]",
        activeSlot?.side === 'actual' ? "translate-x-0" : "-translate-x-full"
      )}>
        <PoolContent />
      </aside>

      {/* 安排页 (Plan Side) 激活时从右侧弹出 */}
      <aside className={cn(
        "absolute right-0 top-0 bottom-0 w-[240px] bg-white border-l border-stone-200 z-[70] transition-transform duration-500 ease-out shadow-[-10px_0_40px_rgba(0,0,0,0.08)]",
        activeSlot?.side === 'plan' ? "translate-x-0" : "translate-x-full"
      )}>
        <PoolContent />
      </aside>

      <div ref={scrollRef} className="flex-1 overflow-y-auto relative bg-white custom-scrollbar pb-32">
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-40 px-5 py-3 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-6 w-full">
                <div className="flex-1 flex items-center justify-center gap-2 text-stone-300">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">安排 (Plan)</span>
                    <ChevronLeft size={12} />
                </div>
                <div className="w-14 flex items-center justify-center">
                    <Clock size={16} className="text-stone-200" />
                </div>
                <div className="flex-1 flex items-center justify-center gap-2 text-stone-300">
                    <ChevronRight size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">记录 (Actual)</span>
                </div>
            </div>
        </div>

        <div className="pt-1">
          {HOURS.map(hour => (
            <TimelineRow 
              key={hour} 
              hour={hour} 
              assignedScheduleIds={scheduleData.hours[hour] || []} 
              assignedRecordIds={recordData.hours[hour] || []} 
              allTasks={tasks} 
              onScheduleClick={(h) => handleHourClick(h, 'plan')}
              onRecordClick={(h) => handleHourClick(h, 'actual')}
              activeSlot={activeSlot ? { hour: activeSlot.hour, type: activeSlot.side === 'plan' ? 'schedule' : 'record' } : null}
            />
          ))}
        </div>
      </div>

      <TaskEditorModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} task={editingTask} onSave={onUpdateTask} onDelete={onDeleteTask} objectives={objectives} />
    </div>
  );
};
