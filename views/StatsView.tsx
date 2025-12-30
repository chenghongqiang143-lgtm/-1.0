
import React, { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { Task, DayData, HOURS } from '../types';
import { LayoutDashboard } from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { formatDate, cn } from '../utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface StatsViewProps {
  tasks: Task[];
  scheduleData: DayData;
  recordData: DayData;
  allSchedules: Record<string, DayData>;
  recurringSchedule: Record<number, string[]>;
  allRecords: Record<string, DayData>;
  review: string;
  onUpdateReview: (text: string) => void;
  currentDate: string;
  dateObj: Date;
}

type AnalysisMode = 'none' | 'weekly' | 'monthly';

export const StatsView: React.FC<StatsViewProps> = ({
  tasks,
  scheduleData,
  recordData,
  allSchedules,
  recurringSchedule,
  allRecords,
  dateObj
}) => {
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('none');
  const scrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 100;
  }, []);

  const getTaskColor = (id: string) => tasks.find(t => t.id === id)?.color || '#e5e7eb';

  // Daily Stats for the main card (Today)
  const dailyStats = useMemo(() => {
    const plannedCounts: Record<string, number> = {};
    const actualCounts: Record<string, number> = {};
    HOURS.forEach(h => {
        const planned = scheduleData.hours[h] || [];
        planned.forEach(tid => plannedCounts[tid] = (plannedCounts[tid] || 0) + 1);
        const actual = recordData.hours[h] || [];
        actual.forEach(tid => actualCounts[tid] = (actualCounts[tid] || 0) + (1 / (actual.length || 1))); 
    });
    return tasks.map(t => {
        const planned = plannedCounts[t.id] || 0;
        const actual = actualCounts[t.id] || 0;
        const percentage = planned > 0 ? Math.round((actual / planned) * 100) : (actual > 0 ? 100 : 0);
        let statusColor = percentage >= 80 ? '#10b981' : (percentage >= 50 ? '#f59e0b' : '#f43f5e');
        return { ...t, planned, actual: parseFloat(actual.toFixed(1)), percentage, statusColor };
    }).filter(t => t.planned > 0 || t.actual > 0).sort((a,b) => b.percentage - a.percentage);
  }, [tasks, scheduleData, recordData]);

  // Analysis Data for Weekly/Monthly
  const { chartData, ratioStats, title } = useMemo(() => {
    if (analysisMode === 'none') return { chartData: [], ratioStats: [], title: '' };
    
    let start: Date, end: Date, titleText: string;
    if (analysisMode === 'weekly') {
        start = startOfWeek(dateObj, { weekStartsOn: 1 });
        end = endOfWeek(dateObj, { weekStartsOn: 1 });
        titleText = '本周概览';
    } else {
        start = startOfMonth(dateObj);
        end = endOfMonth(dateObj);
        titleText = '本月概览';
    }
    const days = eachDayOfInterval({ start, end });
    
    // Track totals per task
    const taskAccumulator: Record<string, { planned: number, actual: number }> = {};
    tasks.forEach(t => taskAccumulator[t.id] = { planned: 0, actual: 0 });

    const chartData = days.map(day => {
        const dKey = formatDate(day);
        const recHours = allRecords[dKey]?.hours || {};
        const schedHours = allSchedules[dKey]?.hours || {};
        
        // For Chart Data (Task Durations)
        const dayStat: any = {
            date: format(day, analysisMode === 'weekly' ? 'EEE' : 'd', { locale: zhCN }),
            fullDate: format(day, 'yyyy-MM-dd'),
        };
        // Initialize task keys for stacking consistency
        tasks.forEach(t => dayStat[t.id] = 0);

        HOURS.forEach(h => {
            // 1. Calculate Plan for this hour (for accumulator)
            const specificPlan = schedHours[h] || [];
            const recurringPlan = recurringSchedule[h] || [];
            const uniquePlan = Array.from(new Set([...specificPlan, ...recurringPlan]));
            
            // 2. Get Actual Record for this hour
            const actualRec = recHours[h] || [];
            if (actualRec.length > 0) {
                // Distribute time to tasks for chart
                const portion = 1 / actualRec.length;
                actualRec.forEach(tid => {
                    dayStat[tid] = (dayStat[tid] || 0) + portion;
                });
            }

            // 3. Accumulate totals for list
            uniquePlan.forEach(tid => {
                if (taskAccumulator[tid]) taskAccumulator[tid].planned += 1;
            });
            actualRec.forEach(tid => {
                 if (taskAccumulator[tid]) taskAccumulator[tid].actual += (1 / (actualRec.length || 1));
            });
        });
        
        // Round chart values
        tasks.forEach(t => {
            if (dayStat[t.id] > 0) dayStat[t.id] = Number(dayStat[t.id].toFixed(2));
        });

        return dayStat;
    });

    const ratioStats = tasks.map(t => {
        const stats = taskAccumulator[t.id];
        const planned = stats.planned;
        const actual = stats.actual;
        const hasData = planned > 0 || actual > 0;
        const ratio = planned > 0 ? (actual / planned) * 100 : (actual > 0 ? 100 : 0);
        return {
            ...t,
            plannedTotal: planned,
            actualTotal: actual,
            ratio,
            hasData
        };
    }).filter(t => t.hasData).sort((a, b) => b.ratio - a.ratio);

    return { chartData, ratioStats, title: titleText };
  }, [analysisMode, dateObj, allSchedules, recurringSchedule, allRecords, tasks]);

  // Custom Tooltip for Stacked Bar Chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // Filter out zero values and reverse to match stack visual order
        const activeItems = payload.filter((p: any) => p.value > 0).reverse();
        
        if (activeItems.length === 0) return null;
        
        const total = activeItems.reduce((acc: number, curr: any) => acc + (curr.value as number), 0);

        return (
            <div className="bg-white p-3 border border-stone-100 shadow-xl rounded-xl text-xs z-50">
                <p className="font-bold text-stone-700 mb-2">{label}</p>
                <div className="space-y-1.5">
                    {activeItems.map((entry: any) => (
                        <div key={entry.name} className="flex items-center gap-2 min-w-[120px]">
                            <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                            <span className="flex-1 text-stone-600 font-medium truncate max-w-[100px]">{entry.name}</span>
                            <span className="font-bold font-mono text-stone-800">{Number(entry.value).toFixed(1)}h</span>
                        </div>
                    ))}
                    <div className="pt-2 mt-1 border-t border-stone-100 flex justify-between font-bold text-stone-800">
                        <span>总计</span>
                        <span>{total.toFixed(1)}h</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
  };

  if (analysisMode !== 'none') {
      return (
          <div className="flex flex-col h-full bg-stone-50 overflow-hidden relative">
              {/* Header Card */}
              <div className="p-5 bg-white shadow-sm rounded-b-[2rem] z-20 relative shrink-0">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">{title}</h2>
                    <button onClick={() => setAnalysisMode('none')} className="text-xs font-bold text-stone-500 bg-stone-100 px-4 py-2 rounded-full hover:bg-stone-200 transition-colors">返回</button>
                  </div>
                  <div className="flex p-1 bg-stone-100 rounded-xl mb-6">
                      {['weekly', 'monthly'].map((m: any) => (
                          <button key={m} onClick={() => setAnalysisMode(m)} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", analysisMode === m ? "bg-white text-stone-800 shadow-sm" : "text-stone-400")}>
                            {m === 'weekly' ? '周视图' : '月视图'}
                          </button>
                      ))}
                  </div>

                  {/* Stacked Bar Chart Area */}
                  <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }} barCategoryGap={analysisMode === 'monthly' ? 4 : 16}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                            <XAxis 
                                dataKey="date" 
                                tick={{fontSize: 10, fill: '#a8a29e'}} 
                                axisLine={false} 
                                tickLine={false}
                                interval={analysisMode === 'monthly' ? 2 : 0}
                            />
                            <YAxis 
                                tick={{fontSize: 10, fill: '#a8a29e'}} 
                                axisLine={false} 
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f4', opacity: 0.5 }} />
                            {tasks.map((task) => (
                                <Bar 
                                    key={task.id}
                                    dataKey={task.id}
                                    name={task.name}
                                    stackId="a"
                                    fill={task.color}
                                    animationDuration={1000}
                                />
                            ))}
                        </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* Task Ratios List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 relative z-10 space-y-4">
                  <div className="pb-10">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest px-1 mb-3">
                        投入产出比 (实际/计划)
                    </h3>
                    <div className="space-y-3">
                        {ratioStats.map(task => (
                             <div key={task.id} className="bg-white rounded-xl p-4 shadow-sm border border-stone-50">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.color }} />
                                        <span className="text-xs font-bold text-stone-700">{task.name}</span>
                                    </div>
                                    <div className="text-[10px] font-mono font-bold text-stone-500">
                                        <span className="text-stone-800">{task.actualTotal.toFixed(1)}h</span>
                                        <span className="text-stone-300 mx-1">/</span>
                                        <span>{task.plannedTotal.toFixed(1)}h</span>
                                    </div>
                                </div>
                                {/* Progress Bar */}
                                <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden relative">
                                    <div 
                                        className="h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{ 
                                            width: `${Math.min(task.ratio, 100)}%`, 
                                            backgroundColor: task.color 
                                        }} 
                                    />
                                </div>
                                {task.ratio > 100 && (
                                    <div className="mt-1 text-right">
                                        <span className="text-[9px] font-bold text-emerald-500">超额完成 {Math.round(task.ratio - 100)}%</span>
                                    </div>
                                )}
                             </div>
                        ))}
                    </div>
                  </div>
              </div>
          </div>
      );
  }

  // Render Daily Stats (Comparison View)
  return (
    <div className="flex flex-col h-full bg-[#fcfcfc] overflow-y-auto custom-scrollbar pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {/* Timeline View (Comparison Today) */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-stone-50 overflow-hidden flex flex-col h-[400px]">
                 <div className="flex border-b border-stone-100 sticky top-0 bg-white z-10">
                     <div className="flex-1 py-3 text-center text-[10px] font-bold text-primary">计划</div>
                     <div className="w-px bg-stone-100" />
                     <div className="flex-1 py-3 text-center text-[10px] font-bold text-secondary">实际</div>
                 </div>
                 <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar relative">
                    <div className="flex min-h-full">
                        <div className="flex-1 border-r border-stone-50">
                            {HOURS.map(h => (
                                <div key={h} className="h-5 border-b border-stone-50/50 flex items-center px-2">
                                    <span className="w-4 text-[7px] text-stone-300 font-mono select-none">{h}</span>
                                    <div className="flex-1 flex h-full py-0.5 gap-0.5">
                                        {(scheduleData.hours[h] || []).map((tid, i) => <div key={i} className="flex-1 rounded-[1px]" style={{ backgroundColor: getTaskColor(tid) }} />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex-1">
                            {HOURS.map(h => (
                                <div key={h} className="h-5 border-b border-stone-50/50 flex items-center px-2">
                                    <div className="flex-1 flex h-full py-0.5 gap-0.5">
                                        {(recordData.hours[h] || []).map((tid, i) => <div key={i} className="flex-1 rounded-[1px]" style={{ backgroundColor: getTaskColor(tid) }} />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
            </div>

            {/* Execution Stats Card */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-stone-50 p-6 flex flex-col h-[400px]">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">执行分析</h3>
                     {/* Merged Entry Button */}
                     <button 
                        onClick={() => setAnalysisMode('weekly')} 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white rounded-xl shadow-lg shadow-stone-900/10 hover:bg-stone-800 transition-all active:scale-95"
                     >
                        <LayoutDashboard size={12} />
                        <span className="text-[10px] font-bold">概览</span>
                     </button>
                 </div>
                 <div className="space-y-5 overflow-y-auto custom-scrollbar pr-1 flex-1">
                     {dailyStats.map(stat => (
                         <div key={stat.id}>
                             <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[11px] font-bold text-stone-600">{stat.name}</span>
                                <span className="text-[10px] font-bold" style={{ color: stat.statusColor }}>{stat.percentage}%</span>
                             </div>
                             <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden shadow-inner">
                                 <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(stat.percentage, 100)}%`, backgroundColor: stat.color }} />
                             </div>
                         </div>
                     ))}
                     {dailyStats.length === 0 && <p className="text-center text-xs text-stone-300 py-10">今日暂无数据</p>}
                 </div>
            </div>
        </div>
    </div>
  );
};
