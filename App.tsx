import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, BarChart2, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AppState, Tab, Task, DayData } from './types';
import { loadState, saveState } from './services/storage';
import { cn, generateId, formatDate } from './utils';

import { ScheduleView } from './views/ScheduleView';
import { RecordView } from './views/RecordView';
import { StatsView } from './views/StatsView';
import { SettingsTab } from './views/SettingsTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('record');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  
  // State
  const [state, setState] = useState<AppState>({
      tasks: [],
      schedule: {},
      records: {},
      reviews: {}
  });

  // Load initial data
  useEffect(() => {
    setState(loadState());

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Persist on change
  useEffect(() => {
    if (state.tasks.length > 0) { 
        saveState(state);
    }
  }, [state]);

  const dateKey = formatDate(currentDate);

  // Get data for current day, or empty structure
  const currentSchedule: DayData = state.schedule[dateKey] || { hours: {} };
  const currentRecord: DayData = state.records[dateKey] || { hours: {} };
  const currentReview: string = state.reviews[dateKey] || '';

  // --- Actions ---

  const updateScheduleHour = (hour: number, taskIds: string[]) => {
    setState(prev => ({
        ...prev,
        schedule: {
            ...prev.schedule,
            [dateKey]: {
                hours: { ...currentSchedule.hours, [hour]: taskIds }
            }
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

  // Task Management
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
      setState(prev => ({
          ...prev,
          tasks: prev.tasks.filter(t => t.id !== taskId)
      }));
  };

  // Repeat Logic
  const handleRepeatTask = (taskId: string, hour: number) => {
      // Repeat for next 7 days
      const newSchedule = { ...state.schedule };
      for (let i = 0; i < 7; i++) {
          const futureDate = addDays(currentDate, i);
          const fKey = formatDate(futureDate);
          const day = newSchedule[fKey] || { hours: {} };
          
          day.hours = { ...day.hours, [hour]: [taskId] };
          newSchedule[fKey] = day;
      }
      setState(prev => ({ ...prev, schedule: newSchedule }));
  };

  // App & Data Actions
  const handleInstallApp = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setInstallPrompt(null);
      }
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
            // Simple validation
            if (Array.isArray(parsed.tasks) && parsed.schedule) {
                if (window.confirm('导入将覆盖当前所有数据，确定要继续吗？')) {
                    setState(parsed);
                    alert('数据导入成功！');
                }
            } else {
                alert('无效的数据文件格式');
            }
        } catch (err) {
            console.error(err);
            alert('导入失败：无法解析文件');
        }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-screen w-screen bg-[#f2f2f5] sm:bg-gradient-to-br sm:from-slate-100 sm:to-indigo-50 flex items-center justify-center overflow-hidden font-sans text-stone-800 p-0 sm:p-6 md:p-10">
      <div className="w-full max-w-[440px] h-full sm:h-[850px] bg-white sm:rounded-[3rem] flex flex-col shadow-2xl shadow-indigo-200/40 relative overflow-hidden ring-4 ring-white/50">
        
        {/* Header */}
        <header className="pt-10 pb-4 px-8 bg-white/80 backdrop-blur-xl flex justify-between items-center z-20 select-none">
           <button 
             onClick={() => setCurrentDate(subDays(currentDate, 1))} 
             className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-soft hover:bg-white hover:shadow-md text-stone-600 transition-all active:scale-95"
           >
             <ChevronLeft size={20} />
           </button>
           <div className="flex flex-col items-center">
             <span className="font-bold text-xl text-stone-800 tracking-tight">{format(currentDate, 'M月d日', { locale: zhCN })}</span>
             <span className="text-[11px] font-semibold text-stone-400 tracking-wider uppercase mt-1">
               {format(currentDate, 'EEEE', { locale: zhCN })}
             </span>
           </div>
           <button 
             onClick={() => setCurrentDate(addDays(currentDate, 1))} 
             className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-soft hover:bg-white hover:shadow-md text-stone-600 transition-all active:scale-95"
           >
             <ChevronRight size={20} />
           </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative bg-white/50">
          {activeTab === 'schedule' && (
            <ScheduleView 
                tasks={state.tasks} 
                dayData={currentSchedule} 
                onUpdateHour={updateScheduleHour}
                onUpdateTask={handleUpdateTask}
                onRepeatTask={handleRepeatTask}
            />
          )}
          {activeTab === 'record' && (
            <RecordView 
                tasks={state.tasks} 
                dayData={currentRecord} 
                onUpdateHour={updateRecordHour}
            />
          )}
          {activeTab === 'stats' && (
            <StatsView 
                tasks={state.tasks}
                scheduleData={currentSchedule}
                recordData={currentRecord}
                allSchedules={state.schedule}
                allRecords={state.records}
                review={currentReview}
                onUpdateReview={updateReview}
                currentDate={dateKey}
                dateObj={currentDate}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab
                tasks={state.tasks}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                showInstallButton={!!installPrompt}
                onInstall={handleInstallApp}
                onExportData={handleExportData}
                onImportData={handleImportData}
            />
          )}
        </main>

        {/* Floating Bottom Navigation */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center z-30 pointer-events-none">
            <nav className="h-16 bg-white/90 backdrop-blur-md rounded-full px-6 flex items-center gap-8 shadow-2xl shadow-stone-200/50 border border-white/50 pointer-events-auto transform translate-y-0 transition-transform">
                <NavButton 
                    active={activeTab === 'schedule'} 
                    onClick={() => setActiveTab('schedule')} 
                    icon={<Calendar size={22} strokeWidth={activeTab === 'schedule' ? 2.5 : 2} />} 
                />
                <NavButton 
                    active={activeTab === 'stats'} 
                    onClick={() => setActiveTab('stats')} 
                    icon={<BarChart2 size={22} strokeWidth={activeTab === 'stats' ? 2.5 : 2} />} 
                />
                <NavButton 
                    active={activeTab === 'record'} 
                    onClick={() => setActiveTab('record')} 
                    icon={<CheckCircle size={22} strokeWidth={activeTab === 'record' ? 2.5 : 2} />} 
                />
                <NavButton 
                    active={activeTab === 'settings'} 
                    onClick={() => setActiveTab('settings')} 
                    icon={<Settings size={22} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />} 
                />
            </nav>
        </div>
      </div>
    </div>
  );
}

const NavButton = ({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) => (
  <button 
    onClick={onClick}
    className={cn(
        "relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
        active ? "text-primary bg-primary/10" : "text-stone-400 hover:text-stone-600 hover:bg-stone-50"
    )}
  >
    <div className={cn("transition-all duration-300", active ? "scale-100" : "scale-90")}>{icon}</div>
    {active && <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full opacity-50"></div>}
  </button>
);