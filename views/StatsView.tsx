import React, { useState, useMemo } from 'react';
import { Task, DayData, HOURS } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Calendar, TrendingUp, ChevronLeft, PieChart, BarChart3 } from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, getDate } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { formatDate, cn } from '../utils';

interface StatsViewProps {
  tasks: Task[];
  scheduleData: DayData;
  recordData: DayData;
  allSchedules: Record<string, DayData>;
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
  allRecords,
  dateObj
}) => {
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('none');

  const getTaskColor = (id: string) => tasks.find(t => t.id === id)?.color || '#e5e7eb';

  // Daily Stats for the current day (Main View)
  const dailyStats = useMemo(() => {
    const plannedCounts: Record<string, number> = {};
    const actualCounts: Record<string, number> = {};
    
    HOURS.forEach(h => {
        const planned = scheduleData.hours[h] || [];
        planned.forEach(tid => plannedCounts[tid] = (plannedCounts[tid] || 0) + 1);

        const actual = recordData.hours[h] || [];
        // If multiple tasks in one hour, split the hour
        actual.forEach(tid => actualCounts[tid] = (actualCounts[tid] || 0) + (1 / (actual.length || 1))); 
    });

    return tasks.map(t => {
        const planned = plannedCounts[t.id] || 0;
        const actual = actualCounts[t.id] || 0;
        const percentage = planned > 0 ? Math.round((actual / planned) * 100) : (actual > 0 ? 100 : 0);
        
        let statusColor = '#f43f5e'; // Red (<50%)
        if (percentage >= 80) statusColor = '#10b981'; // Green
        else if (percentage >= 50) statusColor = '#f59e0b'; // Yellow

        return {
            ...t,
            planned,
            actual: parseFloat(actual.toFixed(1)),
            percentage,
            statusColor
        };
    }).filter(t => t.planned > 0 || t.actual > 0).sort((a,b) => b.percentage - a.percentage);
  }, [tasks, scheduleData, recordData]);

  // Combined Analysis Stats Calculation (Weekly & Monthly)
  const { chartData, taskSummaries, averageScore, title } = useMemo(() => {
    if (analysisMode === 'none') return { chartData: [], taskSummaries: [], averageScore: 0, title: '' };
    
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

    // 1. Chart Data: Daily Adherence Scores
    const scores = days.map(day => {
        const dKey = formatDate(day);
        const sched = allSchedules[dKey]?.hours || {};
        const rec = allRecords[dKey]?.hours || {};

        let totalPlannedSlots = 0;
        let completedSlots = 0;

        HOURS.forEach(h => {
            const pTasks = sched[h] || [];
            const rTasks = rec[h] || [];
            if (pTasks.length > 0) {
                totalPlannedSlots += pTasks.length;
                const matches = pTasks.filter(pid => rTasks.includes(pid)).length;
                completedSlots += matches;
            }
        });

        const score = totalPlannedSlots === 0 ? 0 : Math.round((completedSlots / totalPlannedSlots) * 100);

        return {
            date: analysisMode === 'weekly' ? format(day, 'EEE', { locale: zhCN }) : format(day, 'd'),
            fullDate: dKey,
            score: score,
            hasPlan: totalPlannedSlots > 0,
            isToday: isSameDay(day, dateObj)
        };
    });

    // 2. Task Summaries: Cumulative Durations
    const taskMap = new Map<string, { planned: number, actual: number }>();
    
    days.forEach(day => {
        const dKey = formatDate(day);
        const sched = allSchedules[dKey]?.hours || {};
        const rec = allRecords[dKey]?.hours || {};

        HOURS.forEach(h => {
             // Planned Hours
             (sched[h] || []).forEach(tid => {
                 const curr = taskMap.get(tid) || { planned: 0, actual: 0 };
                 curr.planned += 1;
                 taskMap.set(tid, curr);
             });
             // Actual Hours
             const actuals = rec[h] || [];
             if (actuals.length > 0) {
                 const val = 1 / actuals.length;
                 actuals.forEach(tid => {
                     const curr = taskMap.get(tid) || { planned: 0, actual: 0 };
                     curr.actual += val;
                     taskMap.set(tid, curr);
                 });
             }
        });
    });

    const summaries = tasks.map(t => {
        const data = taskMap.get(t.id) || { planned: 0, actual: 0 };
        const plannedHours = data.planned;
        const actualHours = parseFloat(data.actual.toFixed(1));
        
        return {
            ...t,
            totalPlanned: plannedHours,
            totalActual: actualHours,
            delta: parseFloat((actualHours - plannedHours).toFixed(1))
        };
    })
    .filter(t => t.totalPlanned > 0 || t.totalActual > 0)
    .sort((a, b) => b.totalActual - a.totalActual);

    const activeDays = scores.filter(d => d.hasPlan);
    const avg = activeDays.length > 0 ? Math.round(activeDays.reduce((a, b) => a + b.score, 0) / activeDays.length) : 0;

    return { chartData: scores, taskSummaries: summaries, averageScore: avg, title: titleText };
  }, [analysisMode, dateObj, allSchedules, allRecords, tasks]);

  // Analysis View Render
  if (analysisMode !== 'none') {
      return (
          <div className="flex flex-col h-full bg-stone-50 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
              {/* Header */}
              <div className="p-6 bg-white shadow-sm z-10 rounded-b-[2rem]">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                        <div className="p-2.5 bg-indigo-50 rounded-2xl text-primary"><TrendingUp size={20} /></div>
                        {title}
                    </h2>
                    <button 
                        onClick={() => setAnalysisMode('none')}
                        className="flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-800 bg-stone-100 pl-3 pr-4 py-2 rounded-full transition-colors active:scale-95"
                    >
                        <ChevronLeft size={14} /> 返回
                    </button>
                  </div>
                  
                  {/* Mode Toggle */}
                  <div className="flex p-1 bg-stone-100 rounded-xl mb-4">
                      <button 
                        onClick={() => setAnalysisMode('weekly')}
                        className={cn(
                            "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                            analysisMode === 'weekly' ? "bg-white text-stone-800 shadow-sm" : "text-stone-400 hover:text-stone-600"
                        )}
                      >
                        周视图
                      </button>
                      <button 
                        onClick={() => setAnalysisMode('monthly')}
                        className={cn(
                            "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                            analysisMode === 'monthly' ? "bg-white text-stone-800 shadow-sm" : "text-stone-400 hover:text-stone-600"
                        )}
                      >
                        月视图
                      </button>
                  </div>

                  <div className="flex items-end gap-3 text-stone-600 pl-1">
                      <span className="text-6xl font-bold text-primary tracking-tighter leading-none">{averageScore}<span className="text-3xl">%</span></span>
                      <span className="text-sm font-medium bg-stone-100 text-stone-500 px-3 py-1 rounded-full mb-1">平均达成率</span>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 custom-scrollbar">
                  {/* Chart */}
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm h-64 w-full border border-stone-50">
                      <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">执行趋势</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                            <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 9, fill: '#a8a29e', fontWeight: 500 }} 
                                axisLine={false} 
                                tickLine={false} 
                                interval={analysisMode === 'monthly' ? 2 : 0} 
                            />
                            <YAxis tick={{ fontSize: 9, fill: '#d6d3d1' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                            <Tooltip 
                                cursor={{ fill: '#fafaf9' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.1)', padding: '8px 12px' }}
                                formatter={(value: number) => [`${value}%`]}
                                labelStyle={{ display: 'none' }}
                            />
                            <Bar dataKey="score" radius={[4, 4, 4, 4]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.isToday ? '#6366f1' : (entry.hasPlan ? (entry.score >= 80 ? '#10b981' : '#cbd5e1') : '#f5f5f4')} />
                                ))}
                            </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                  </div>

                  {/* Task Breakdown List */}
                  <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-stone-50">
                      <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">各任务累计时长</h3>
                      <div className="space-y-3">
                          {taskSummaries.map(t => (
                              <div key={t.id} className="flex flex-col gap-1.5 pb-2 border-b border-stone-50 last:border-0">
                                  <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                                          <span className="text-xs font-bold text-stone-700">{t.name}</span>
                                      </div>
                                      <div className="text-[10px] font-mono text-stone-400">
                                          <span className="text-stone-600 font-bold">{t.totalActual}h</span> / {t.totalPlanned}h
                                      </div>
                                  </div>
                                  {/* Progress bar for plan vs actual */}
                                  <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden flex relative">
                                      <div className="absolute top-0 left-0 h-full bg-stone-200 z-0" style={{ width: '100%' }} />
                                      <div 
                                        className="h-full z-10 rounded-full" 
                                        style={{ 
                                            width: `${Math.min((t.totalActual / (Math.max(t.totalPlanned, t.totalActual, 1))) * 100, 100)}%`,
                                            backgroundColor: t.color
                                        }} 
                                      />
                                  </div>
                              </div>
                          ))}
                          {taskSummaries.length === 0 && (
                              <p className="text-center text-xs text-stone-300 py-4">该时段暂无数据</p>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )
  }

  // Daily Stats View (Main)
  return (
    <div className="flex flex-col h-full bg-[#fcfcfc] pb-24">
        {/* Dual Timelines - Synchronized Scroll */}
        {/* Optimized for narrower row height and cleaner look */}
        <div className="flex-1 m-4 bg-white rounded-[2rem] shadow-soft border border-stone-50 overflow-hidden relative flex flex-col">
             
             {/* Sticky Header inside the container */}
             <div className="flex border-b border-stone-100 z-20 bg-white sticky top-0 shadow-sm">
                 <div className="flex-1 py-3 text-center">
                    <span className="text-[10px] font-bold text-primary/80 uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full">计划</span>
                 </div>
                 <div className="w-px bg-stone-100"></div>
                 <div className="flex-1 py-3 text-center">
                    <span className="text-[10px] font-bold text-secondary/80 uppercase tracking-widest bg-secondary/5 px-3 py-1 rounded-full">实际</span>
                 </div>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                <div className="flex min-h-full">
                    {/* Plan Column */}
                    <div className="flex-1 border-r border-stone-50 bg-white">
                        <div className="pb-4 pt-1">
                        {HOURS.map(h => {
                            const tIds = scheduleData.hours[h] || [];
                            return (
                                <div key={h} className="h-7 border-b border-stone-50/50 flex items-center px-1.5 relative group">
                                    <span className="w-5 text-[8px] text-stone-300 font-mono flex-shrink-0 text-center">{h}</span>
                                    <div className="flex-1 flex h-full py-[3px] gap-[2px]">
                                        {tIds.map((tid, i) => (
                                            <div key={i} className="flex-1 rounded-[4px] opacity-90" style={{ backgroundColor: getTaskColor(tid) }} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </div>

                    {/* Actual Column */}
                    <div className="flex-1 bg-stone-50/20">
                        <div className="pb-4 pt-1">
                        {HOURS.map(h => {
                            const tIds = recordData.hours[h] || [];
                            return (
                                <div key={h} className="h-7 border-b border-stone-50/50 flex items-center px-1.5">
                                    <div className="flex-1 flex h-full py-[3px] gap-[2px]">
                                        {tIds.map((tid, i) => (
                                            <div key={i} className="flex-1 rounded-[4px]" style={{ backgroundColor: getTaskColor(tid) }} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        </div>
                    </div>
                </div>
             </div>
        </div>

        {/* Daily Summary & Analysis Links */}
        <div className="h-auto bg-white mx-4 mb-4 rounded-[2rem] shadow-soft border border-stone-50 p-5">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">今日执行度</h3>
                 <div className="flex gap-2">
                    <button 
                        onClick={() => setAnalysisMode('weekly')} 
                        className="text-[10px] flex items-center gap-1 text-stone-600 bg-stone-100 px-3 py-1.5 rounded-full hover:bg-stone-200 transition-colors font-bold active:scale-95"
                    >
                        <Calendar size={12} /> 周
                    </button>
                    <button 
                        onClick={() => setAnalysisMode('monthly')} 
                        className="text-[10px] flex items-center gap-1 text-white bg-stone-800 px-3 py-1.5 rounded-full hover:bg-stone-700 transition-colors font-bold active:scale-95 shadow-md shadow-stone-800/20"
                    >
                        <PieChart size={12} /> 月
                    </button>
                 </div>
             </div>
             <div className="space-y-4 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                 {dailyStats.map(stat => (
                     <div key={stat.id} className="group">
                         <div className="flex justify-between items-center mb-1.5 px-1">
                             <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }}></div>
                                <span className="text-[11px] font-bold text-stone-600 truncate max-w-[100px]">{stat.name}</span>
                             </div>
                             <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-stone-400 font-medium">{stat.actual}h / {stat.planned}h</span>
                                <span className="text-[11px] font-mono font-bold" style={{ color: stat.statusColor }}>{stat.percentage}%</span>
                             </div>
                         </div>
                         <div className="relative h-2.5 bg-stone-100 rounded-full overflow-hidden shadow-inner">
                             <div 
                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${Math.min(stat.percentage, 100)}%`, backgroundColor: stat.color }}
                             />
                         </div>
                     </div>
                 ))}
                 {dailyStats.length === 0 && (
                     <p className="text-center text-xs text-stone-300 py-4">今日暂无数据</p>
                 )}
             </div>
        </div>
    </div>
  );
};
