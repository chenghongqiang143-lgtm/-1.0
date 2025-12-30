import React, { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { Task, DayData, HOURS } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Calendar, TrendingUp, ChevronLeft, PieChart, Target } from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { formatDate, cn } from '../utils';

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
    const scores = days.map(day => {
        const dKey = formatDate(day);
        const schedRaw = allSchedules[dKey]?.hours || {};
        const rec = allRecords[dKey]?.hours || {};
        let totalPlannedSlots = 0, completedSlots = 0;
        HOURS.forEach(h => {
            const pTasks = Array.from(new Set([...(recurringSchedule[h] || []), ...(schedRaw[h] || [])]));
            const rTasks = rec[h] || [];
            if (pTasks.length > 0) {
                totalPlannedSlots += pTasks.length;
                completedSlots += pTasks.filter(pid => rTasks.includes(pid)).length;
            }
        });
        return {
            date: analysisMode === 'weekly' ? format(day, 'EEE', { locale: zhCN }) : format(day, 'd'),
            score: totalPlannedSlots === 0 ? 0 : Math.round((completedSlots / totalPlannedSlots) * 100),
            hasPlan: totalPlannedSlots > 0, isToday: isSameDay(day, dateObj)
        };
    });
    const summaries = tasks.map(t => {
        const mode = t.targets?.mode || 'duration';
        let actualTotal = 0;
        days.forEach(day => {
            const rec = allRecords[formatDate(day)]?.hours || {};
            HOURS.forEach(h => {
                const ids = rec[h] || [];
                if (ids.includes(t.id)) actualTotal += (mode === 'count' ? 1 : (1 / ids.length));
            });
        });
        let periodTarget = t.targets?.value ? (t.targets.value / t.targets.frequency) * days.length : 0;
        const completionRate = periodTarget > 0 ? Math.min(Math.round((actualTotal / periodTarget) * 100), 100) : (actualTotal > 0 ? 100 : 0);
        return { ...t, actualTotal, periodTarget, completionRate, unit: mode === 'count' ? '次' : 'h', hasTarget: periodTarget > 0 };
    }).filter(t => t.actualTotal > 0 || t.hasTarget).sort((a, b) => b.completionRate - a.completionRate);
    const activeDays = scores.filter(d => d.hasPlan);
    const avg = activeDays.length > 0 ? Math.round(activeDays.reduce((a, b) => a + b.score, 0) / activeDays.length) : 0;
    return { chartData: scores, taskSummaries: summaries, averageScore: avg, title: titleText };
  }, [analysisMode, dateObj, allSchedules, recurringSchedule, allRecords, tasks]);

  if (analysisMode !== 'none') {
      return (
          <div className="flex flex-col h-full bg-stone-50 overflow-hidden">
              <div className="p-6 bg-white shadow-sm rounded-b-[2rem]">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">{title}</h2>
                    <button onClick={() => setAnalysisMode('none')} className="text-xs font-bold text-stone-500 bg-stone-100 px-4 py-2 rounded-full">返回</button>
                  </div>
                  <div className="flex p-1 bg-stone-100 rounded-xl mb-4">
                      {['weekly', 'monthly'].map((m: any) => (
                          <button key={m} onClick={() => setAnalysisMode(m)} className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", analysisMode === m ? "bg-white text-stone-800 shadow-sm" : "text-stone-400")}>
                            {m === 'weekly' ? '周' : '月'}
                          </button>
                      ))}
                  </div>
                  <div className="flex items-end gap-3 text-stone-600">
                      <span className="text-5xl font-bold text-primary">{averageScore}%</span>
                      <span className="text-[10px] font-bold uppercase text-stone-400 mb-1">执行率</span>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm h-64 border border-stone-50">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#a8a29e' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 9, fill: '#d6d3d1' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                            <Bar dataKey="score" radius={[4, 4, 4, 4]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.isToday ? '#6366f1' : (entry.hasPlan ? (entry.score >= 80 ? '#10b981' : '#cbd5e1') : '#f5f5f4')} />
                                ))}
                            </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-[#fcfcfc] overflow-y-auto custom-scrollbar pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {/* Timeline View */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-stone-50 overflow-hidden flex flex-col h-[400px]">
                 <div className="flex border-b border-stone-100 sticky top-0 bg-white">
                     <div className="flex-1 py-3 text-center text-[10px] font-bold text-primary">计划</div>
                     <div className="w-px bg-stone-100" />
                     <div className="flex-1 py-3 text-center text-[10px] font-bold text-secondary">实际</div>
                 </div>
                 <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="flex">
                        <div className="flex-1 border-r border-stone-50">
                            {HOURS.map(h => (
                                <div key={h} className="h-5 border-b border-stone-50/50 flex items-center px-2">
                                    <span className="w-4 text-[7px] text-stone-300 font-mono">{h}</span>
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
                     <div className="flex gap-2">
                        <button onClick={() => setAnalysisMode('weekly')} className="text-[9px] font-bold text-stone-600 bg-stone-100 px-3 py-1.5 rounded-full">周</button>
                        <button onClick={() => setAnalysisMode('monthly')} className="text-[9px] font-bold text-white bg-stone-800 px-3 py-1.5 rounded-full shadow-md shadow-stone-800/20">月</button>
                     </div>
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