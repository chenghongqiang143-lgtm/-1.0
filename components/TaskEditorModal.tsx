import React, { useState, useEffect } from 'react';
import { Task } from '../types';
import { X, Trash2 } from 'lucide-react';

interface TaskEditorModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

const PRESET_COLORS = [
  // Warm & Vibrant
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  // Nature & Fresh
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  // Ocean & Sky
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  // Purple & Pink
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  // Elegant Dark
  '#64748b', '#78716c', '#57534e', '#1e293b',
  // Soft Pastels
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
  const [category, setCategory] = useState('Life');

  useEffect(() => {
    if (isOpen && task) {
      setName(task.name);
      setColor(task.color);
      setCategory(task.category);
    } else if (isOpen) {
      setName('');
      setColor('#3b82f6');
      setCategory('Life'); // Default category
    }
  }, [isOpen, task]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: task ? task.id : '', // ID will be handled by parent if new
      name,
      color,
      category
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 border border-white/20">
        <div className="flex justify-between items-center p-5 border-b border-stone-100 bg-stone-50/50">
          <h3 className="font-bold text-lg text-stone-800">{task ? '编辑任务' : '新建任务'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-stone-200/50 rounded-full transition-colors text-stone-500">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">名称</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white transition-all font-medium text-stone-700 placeholder:text-stone-300"
              placeholder="输入任务名称"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">颜色风格</label>
            <div className="grid grid-cols-6 gap-3">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full shadow-sm transition-transform hover:scale-110 flex items-center justify-center ${color === c ? 'ring-2 ring-offset-2 ring-stone-400 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                >
                    {color === c && <div className="w-2 h-2 bg-white/80 rounded-full" />}
                </button>
              ))}
            </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">分类标签</label>
             <input 
              type="text" 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white transition-all font-medium text-stone-700 placeholder:text-stone-300"
              placeholder="例如：工作、生活、健康"
            />
          </div>

          <div className="flex gap-3 pt-4">
             {task && onDelete && (
               <button 
                type="button" 
                onClick={() => { onDelete(task.id); onClose(); }}
                className="px-4 py-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl flex items-center gap-2 transition-colors font-medium"
               >
                 <Trash2 size={20} />
               </button>
             )}
            <button 
              type="submit" 
              className="flex-1 bg-stone-900 text-white py-3 rounded-xl font-bold hover:bg-stone-800 shadow-lg shadow-stone-900/20 active:scale-95 transition-all"
            >
              保存更改
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};