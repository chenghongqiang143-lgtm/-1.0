
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, CheckCircle, BarChart2, Settings, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AppState, Tab, Task, DayData } from './types';
import { loadState, saveState, DEFAULT_TASKS } from './services/storage';
import { cn, generateId, formatDate } from './utils';

import { ScheduleView } from './views/ScheduleView';
import { RecordView } from './views/RecordView';
import { StatsView } from './views/StatsView';
import { SettingsTab } from './views/SettingsTab';
import { ReviewModal } from './components/ReviewModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('record');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  
  // State
  const [state, setState] = useState<AppState>({
      tasks: [],
      schedule: {},
      recurringSchedule: {},
      records: {},
      reviews: {}
  });

  // Load initial data
  useEffect(() => {
    setState(loadState());

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Persist on change
  useEffect(() => {
     saveState(state);
  }, [state]);

  const dateKey = formatDate(currentDate);

  // Computed Property: Effective Schedule (Merge Recurring + Specific Day)
  const currentSchedule: DayData = useMemo(() => {
      const specificDayData = state.schedule[dateKey] || { hours: {} };
      const recurringData = state.recurringSchedule || {};
      const mergedHours: Record<number, string[]> = { ...specificDayData.hours };
      
      Object.keys(recurringData).forEach(k => {
          const hour = parseInt(k);
          const recTasks = recurringData[hour] || [];
          const existing = mergedHours[hour] || [];
          mergedHours[hour] = Array.from(new Set([...existing, ...recTasks]));
      });

      return { hours: mergedHours };
  }, [state.schedule, state.recurringSchedule, dateKey]);

  const currentRecord: DayData = state.records[dateKey] || { hours: {} };
  const currentReview: string = state.reviews[dateKey] || '';

  // --- Actions ---

  const updateScheduleHour = (hour: number, taskIds: string[]) => {
    setState(prev => ({
        ...prev,
        schedule: {
            ...prev.schedule,
            [dateKey]: {
                hours: { ...prev.schedule[dateKey]?.hours, [hour]: taskIds }
            }
        }
    }));
  };
  
  const updateRecurringSchedule = (hour: number, taskIds: string[]) => {
      setState(prev => ({
          ...prev,
          recurringSchedule: {
              [hour]: taskIds
          }
      }));
  };

  const updateRecordHour = (hour: number, taskIds: string[]) => {
    setState(prev => ({
        ...prev,
        records: {
            ...prev.records,
            [dateKey]: {
                hours: { ...currentRecord.hours, [hour]: taskIds }
            }
        }
    }));
  };

  const updateReview = (text: string) => {
    setState(prev => ({
        ...prev,
        reviews: {
            ...prev.reviews,
            [dateKey]: text
        }
    }));
  };

  const handleUpdateTask = (updatedTask: Task) => {
      setState(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
      }));
  };

  const handleAddTask = (newTaskPart: Omit<Task, 'id'>) => {
      const newTask = { ...newTaskPart, id: generateId() };
      setState(prev => ({
          ...prev,
          tasks: [...prev.tasks, newTask]
      }));
  };

  const handleDeleteTask = (taskId: string) => {
      if (!taskId) return;
      setState(prev => {
          const newState = JSON.parse(JSON.stringify(prev)) as AppState;
          newState.tasks = newState.tasks.filter(t => t.id !== taskId);
          Object.keys(newState.schedule).forEach(dayKey => {
              const dayData = newState.schedule[dayKey];
              if (dayData && dayData.hours) {
                  Object.keys(dayData.hours).forEach(hKey => {
                      const h = parseInt(hKey);
                      if (Array.isArray(dayData.hours[h])) {
                          dayData.hours[h] = dayData.hours[h].filter(id => id !== taskId);
                      }
                  });
              }
          });
          if (newState.recurringSchedule) {
              Object.keys(newState.recurringSchedule).forEach(hKey => {
                  const h = parseInt(hKey);
                  if (Array.isArray(newState.recurringSchedule[h])) {
                      newState.recurringSchedule[h] = newState.recurringSchedule[h].filter(id => id !== taskId);
                  }
              });
          }
          Object.keys(newState.records).forEach(dayKey => {
              const dayData = newState.records[dayKey];
              if (dayData && dayData.hours) {
                  Object.keys(dayData.hours).forEach(hKey => {
                      const h = parseInt(hKey);
                      if (Array.isArray(dayData.hours[h])) {
                          dayData.hours[h] = dayData.hours[h].filter(id => id !== taskId);
                      }
                  });
              }
          });
          return newState;
      });
  };

  const handleInstallApp = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') setInstallPrompt(null);
    });
  };

  const handleClearData = () => {
    setState({
        tasks: DEFAULT_TASKS,
        schedule: {},
        recurringSchedule: {},
        records: {},
        reviews: {}
    });
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chronos_backup_${format(new Date(), 'yyyyMMdd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target?.result as string;
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed.tasks) && parsed.schedule) {
                if (window.confirm('导入将覆盖当前所有数据，确定要继续吗？')) {
                    setState(parsed);
                }
            }
        } catch (err) { alert('导入失败'); }
    };
    reader.readAsText(file);
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
        const [year, month, day] = e.target.value.split('-').map(Number);
        setCurrentDate(new Date(year, month - 1, day));
    }
  };

  return (
    <div className="h-screen w-screen bg-[#f2f2f5] sm:bg-stone-100 flex items-center justify-center overflow-hidden font-sans text-stone-800 p-0 sm:p-4 md:p-8">
      <div className="w-full h-full sm:max-w-4xl sm:h-[92vh] sm:max-h-[1000px] bg-white sm:rounded-[2.5rem] flex flex-col shadow-2xl relative overflow-hidden sm:ring-1 sm:ring-black/5">
        
        {/* Header - [Review] [Date Nav] [Settings] */}
        <header className="pt-8 sm:pt-10 pb-4 px-5 bg-white/80 backdrop-blur-xl flex justify-between items-center z-20 select-none">
           <button 
             onClick={() => setIsReviewModalOpen(true)}
             className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 text-stone-600 transition-all active:scale-95"
           >
             <ClipboardList size={20} />
           </button>
           
           <div className="flex items-center gap-2 sm:gap-4 bg-stone-100/50 rounded-full p-1 border border-stone-50">
               <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="w-9 h-9 flex items-center justify-center rounded-full text-stone-500 hover:bg-white shadow-sm transition-all active:scale-90">
                 <ChevronLeft size={20} />
               </button>
               
               <div className="relative flex flex-col items-center justify-center px-2 sm:px-4 min-w-[100px]">
                 <input type="date" className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer" value={format(currentDate, 'yyyy-MM-dd')} onChange={handleDateSelect} />
                 <span className="font-bold text-base sm:text-lg text-stone-800 tracking-tight leading-none">{format(currentDate, 'M月d日', { locale: zhCN })}</span>
                 <span className="text-[10px] font-semibold text-stone-400 uppercase mt-0.5">{format(currentDate, 'EEEE', { locale: zhCN })}</span>
               </div>

               <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="w-9 h-9 flex items-center justify-center rounded-full text-stone-500 hover:bg-white shadow-sm transition-all active:scale-90">
                 <ChevronRight size={20} />
               </button>
           </div>

           <button 
             onClick={() => setActiveTab('settings')}
             className={cn(
               "w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-95",
               activeTab === 'settings' ? "bg-primary text-white shadow-md" : "bg-stone-100 text-stone-600"
             )}
           >
             <Settings size={20} />
           </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative bg-white">
          {activeTab === 'schedule' && (
            <ScheduleView 
                tasks={state.tasks} dayData={currentSchedule} recurringData={state.recurringSchedule}
                onUpdateHour={updateScheduleHour} onUpdateRecurring={updateRecurringSchedule}
                onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask}
            />
          )}
          {activeTab === 'record' && (
            <RecordView 
                tasks={state.tasks} dayData={currentRecord} 
                onUpdateHour={updateRecordHour} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask}
            />
          )}
          {activeTab === 'stats' && (
            <StatsView 
                tasks={state.tasks} scheduleData={currentSchedule} recordData={currentRecord}
                allSchedules={state.schedule} recurringSchedule={state.recurringSchedule}
                allRecords={state.records} review={currentReview} onUpdateReview={updateReview}
                currentDate={dateKey} dateObj={currentDate}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab
                tasks={state.tasks} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask}
                showInstallButton={!!installPrompt} onInstall={handleInstallApp} onExportData={handleExportData}
                onImportData={handleImportData} onClearData={handleClearData} allSchedules={state.schedule}
                allRecords={state.records} currentDate={currentDate}
            />
          )}
        </main>

        {/* Bottom Navigation - Order: [Schedule, Stats, Record] */}
        {/* Settings is now exclusively in the header as requested */}
        <div className="h-24 bg-white border-t border-stone-100 flex items-start justify-center px-6 z-30 shrink-0">
            <nav className="w-full max-w-sm mt-3 bg-stone-50/80 backdrop-blur rounded-2xl px-2 py-1.5 flex items-center justify-between shadow-sm border border-stone-100/50">
                <NavButton label="安排" active={activeTab === 'schedule'} onClick={() => setActiveTab('schedule')} icon={<Calendar size={20} />} />
                <NavButton label="统计" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<BarChart2 size={20} />} />
                <NavButton label="记录" active={activeTab === 'record'} onClick={() => setActiveTab('record')} icon={<CheckCircle size={20} />} />
            </nav>
        </div>

        <ReviewModal isOpen={isReviewModalOpen} onClose={() => setIsReviewModalOpen(false)} date={currentDate} initialContent={currentReview} onSave={updateReview} />
      </div>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={cn(
        "flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all duration-300 gap-1",
        active ? "text-primary bg-white shadow-sm" : "text-stone-400 hover:text-stone-600"
    )}
  >
    <div className={cn("transition-transform duration-300", active ? "scale-110" : "scale-100")}>{icon}</div>
    <span className={cn("text-[9px] font-bold tracking-tight uppercase", active ? "opacity-100" : "opacity-60")}>{label}</span>
  </button>
);
