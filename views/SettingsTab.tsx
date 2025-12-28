import React, { useState, useRef } from 'react';
import { Task } from '../types';
import { TaskBlock } from '../components/TaskBlock';
import { TaskEditorModal } from '../components/TaskEditorModal';
import { Plus, Download, Upload, Smartphone } from 'lucide-react';

interface SettingsTabProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  showInstallButton: boolean;
  onInstall: () => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  showInstallButton,
  onInstall,
  onExportData,
  onImportData
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group tasks by category
  const categories = Array.from(new Set(tasks.map(t => t.category)));

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleSave = (task: Task) => {
    if (editingTask) {
        onUpdateTask(task);
    } else {
        onAddTask(task);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportData(file);
    }
    // Reset value to allow same file selection again if needed
    if (e.target) e.target.value = '';
  };

  return (
    <div className="h-full bg-background overflow-y-auto p-4 pb-24">
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-background/95 backdrop-blur z-10 py-2">
        <h2 className="text-xl font-bold text-stone-800 tracking-tight">设置</h2>
        <button 
            onClick={handleNew}
            className="bg-stone-900 text-white px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-md shadow-stone-900/20 hover:bg-stone-800 hover:scale-105 transition-all"
        >
            <Plus size={16} /> <span className="text-xs font-medium">添加任务</span>
        </button>
      </div>

      <div className="space-y-8">
        {/* App & Data Section */}
        <div className="bg-white rounded-[2rem] p-5 shadow-soft border border-stone-50">
            <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4 ml-1">应用与数据</h3>
            <div className="grid grid-cols-2 gap-3">
                {showInstallButton && (
                  <button 
                    onClick={onInstall}
                    className="col-span-2 flex items-center justify-center gap-2 bg-primary/10 text-primary hover:bg-primary/20 py-3 rounded-xl transition-colors font-bold text-xs"
                  >
                      <Smartphone size={16} /> 安装应用到设备
                  </button>
                )}
                
                <button 
                  onClick={onExportData}
                  className="flex flex-col items-center justify-center gap-2 bg-stone-50 hover:bg-stone-100 py-4 rounded-xl transition-colors border border-stone-100"
                >
                    <div className="p-2 bg-white rounded-full text-stone-600 shadow-sm"><Download size={18} /></div>
                    <span className="text-xs font-bold text-stone-600">备份数据</span>
                </button>

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 bg-stone-50 hover:bg-stone-100 py-4 rounded-xl transition-colors border border-stone-100"
                >
                    <div className="p-2 bg-white rounded-full text-stone-600 shadow-sm"><Upload size={18} /></div>
                    <span className="text-xs font-bold text-stone-600">恢复数据</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  hidden 
                  accept=".json" 
                  onChange={handleFileChange} 
                />
            </div>
        </div>

        {/* Tasks Section */}
        <div>
           {categories.map(cat => (
              <div key={cat} className="mb-5">
                  <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">{cat}</h3>
                  <div className="grid grid-cols-2 gap-2">
                      {tasks.filter(t => t.category === cat).map(task => (
                          <TaskBlock 
                              key={task.id} 
                              task={task} 
                              onClick={() => handleEdit(task)}
                              showEditIcon
                              className="h-12 px-3 text-xs"
                          />
                      ))}
                  </div>
              </div>
          ))}
          {tasks.length === 0 && (
              <div className="text-center py-6 text-stone-300 text-sm bg-stone-50 rounded-2xl border-dashed border border-stone-200">
                  点击右上角添加您的第一个任务
              </div>
          )}
        </div>
      </div>

      <TaskEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={editingTask}
        onSave={handleSave}
        onDelete={onDeleteTask}
      />
    </div>
  );
};