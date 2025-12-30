
import React, { useState, useEffect } from 'react';
import { Task, TargetMode } from '../types';
import { X, Target, Type, Hash, Timer, Check, Tag, Trash2, AlertTriangle, Save } from 'lucide-react';
// Fix: Added import for cn utility
import { cn } from '../utils';

interface TaskEditorModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#64748b', '#78716c', '#57534e', '#1e293b',
  '#fda4af', '#fdba74', '#86efac', '#7dd3fc', '#c4b5fd', '#f0abfc'
];

export const TaskEditorModal: React.FC<TaskEditorModalProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [category, setCategory] = useState('无');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [targetMode, setTargetMode] = useState<TargetMode>('duration');
  const [targetValue, setTargetValue] = useState('');
  const [targetFrequency, setTargetFrequency] = useState('1');

  useEffect(() => {
    if (isOpen && task) {
      setName(task.name);
      setColor(task.color);
      setCategory(task.category);
      setShowDeleteConfirm(false);
      if (task.targets) {
          const val = (task.targets as any).duration !== undefined ? (task.targets as any).duration : task.targets.value;
          setTargetValue(val ? val.toString() : '');
          setTargetFrequency(task.targets.frequency.toString());
          setTargetMode(task.targets.mode || 'duration');
      } else {
          setTargetValue('');
          setTargetFrequency('1');
          setTargetMode('duration');
      }
    } else if (isOpen) {
      setName('');
      setColor('#3b82f6');
      setCategory('无');
      setTargetValue('');
      setTargetFrequency('1');
      setTargetMode('duration');
      setShowDeleteConfirm(false);
    }
  }, [isOpen, task]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    let targets = undefined;
    const val = parseFloat(targetValue);
    const freq = parseInt(targetFrequency);
    if (!isNaN(val) && val > 0 && !isNaN(freq) && freq > 0) {
        targets = { mode: targetMode, value: val, frequency: freq };
    }
    onSave({ id: task ? task.id : '', name: name.trim(), color, category, targets });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (showDeleteConfirm && task) {
          onDelete(task.id);
          onClose();
      } else setShowDeleteConfirm(true);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-[340px] overflow-hidden border border-stone-300 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-5 py-3.5 bg-stone-50 border-b border-stone-200 shrink-0">
          <h3 className="font-black text-sm text-stone-800 tracking-tight">{task ? '编辑任务' : '创建新任务'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-200 rounded-full transition-colors text-stone-400">
            <X size={16} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4 bg-white">
          <div className="space-y-2.5">
            <div className="relative">
               <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300">
                  <Type size={14} />
               </div>
               <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:bg-white focus:border-stone-400 transition-all font-bold text-xs text-stone-800"
                  placeholder="任务名称"
               />
            </div>
            <div className="relative">
               <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300">
                  <Tag size={14} />
               </div>
               <input 
                  type="text" 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:bg-white focus:border-stone-400 transition-all font-bold text-xs text-stone-600"
                  placeholder="分类标签"
                />
            </div>
          </div>

          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
              <div className="flex items-center gap-2 mb-3">
                  <Target size={12} className="text-primary" />
                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest">目标设定 (可选)</span>
              </div>
              
              <div className="flex bg-stone-200/50 p-1 rounded-lg mb-3">
                  <button type="button" onClick={() => setTargetMode('duration')} className={`flex-1 py-1 rounded-md text-[10px] font-black transition-all ${targetMode === 'duration' ? 'bg-white text-primary shadow-sm' : 'text-stone-400'}`}>计时</button>
                  <button type="button" onClick={() => setTargetMode('count')} className={`flex-1 py-1 rounded-md text-[10px] font-black transition-all ${targetMode === 'count' ? 'bg-white text-primary shadow-sm' : 'text-stone-400'}`}>次数</button>
              </div>
              
              <div className="flex gap-3">
                  <div className="flex-1">
                      <label className="text-[8px] font-black text-stone-400 uppercase tracking-tighter mb-1 block">{targetMode === 'duration' ? '目标(h)' : '目标(次)'}</label>
                      <input type="number" step={targetMode === 'duration' ? "0.5" : "1"} value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-black text-stone-700 focus:outline-none focus:border-primary" />
                  </div>
                  <div className="flex-1">
                      <label className="text-[8px] font-black text-stone-400 uppercase tracking-tighter mb-1 block">统计周期(天)</label>
                      <input type="number" value={targetFrequency} onChange={(e) => setTargetFrequency(e.target.value)} className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-black text-stone-700 focus:outline-none focus:border-primary" />
                  </div>
              </div>
          </div>
          
          <div>
            <label className="block text-[9px] font-black text-stone-400 uppercase tracking-widest mb-2.5">色彩风格</label>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((c) => (
                <button 
                  type="button" 
                  key={c} 
                  onClick={() => setColor(c)} 
                  className={`w-7 h-7 rounded-lg border border-white flex items-center justify-center transition-all ${color === c ? 'scale-110 shadow-md ring-1 ring-stone-900 ring-offset-1' : 'hover:scale-105'}`} 
                  style={{ backgroundColor: c }}
                >
                    {color === c && <div className="w-1.5 h-1.5 bg-white rounded-full opacity-50" />}
                </button>
              ))}
            </div>
          </div>
          
          <div className="pt-3 flex gap-2">
             {task && (
                 <button 
                    type="button" 
                    onClick={handleDeleteClick} 
                    className={cn(
                        "p-2.5 rounded-xl transition-all flex items-center justify-center",
                        showDeleteConfirm ? "bg-red-600 text-white flex-1" : "bg-stone-50 text-stone-400 hover:text-red-500 hover:bg-red-50"
                    )}
                 >
                     {showDeleteConfirm ? <span className="font-black text-[10px]">确认删除?</span> : <Trash2 size={16} />}
                 </button>
             )}
             {!showDeleteConfirm && (
                 <>
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white border border-stone-200 text-stone-500 font-bold text-xs hover:bg-stone-50 transition-colors">取消</button>
                    <button type="submit" className="flex-1 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-stone-800 active:scale-95 transition-all shadow-md">
                      <Save size={14} /> 确定
                    </button>
                 </>
             )}
          </div>
        </form>
      </div>
    </div>
  );
};
