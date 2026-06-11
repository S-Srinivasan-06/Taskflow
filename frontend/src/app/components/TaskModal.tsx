import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { parseISO, format } from 'date-fns';
import { X } from 'lucide-react';
import { Task, Priority, TaskStatus, CustomCategory, TaskCreateRequest, TaskUpdateRequest } from './types';

interface TaskModalProps {
  task: Task | null;
  categories: CustomCategory[];
  onClose: () => void;
  onSave: (data: TaskCreateRequest | TaskUpdateRequest) => void;
  onDelete: (id: string) => void;
}

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUSES: TaskStatus[] = ['PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED'];

const PRIORITY_ACTIVE: Record<Priority, string> = {
  LOW: 'bg-blue-500 text-white border-blue-500',
  MEDIUM: 'bg-yellow-500 text-black border-yellow-500',
  HIGH: 'bg-orange-500 text-white border-orange-500',
  URGENT: 'bg-red-500 text-white border-red-500',
};

const STATUS_ACTIVE: Record<TaskStatus, string> = {
  PENDING: 'bg-stone-700 text-white border-stone-700',
  IN_PROGRESS: 'bg-sky-600 text-white border-sky-600',
  DONE: 'bg-green-600 text-white border-green-600',
  CANCELLED: 'bg-red-800 text-white border-red-800',
};
export function TaskModal({ task, categories, onClose, onSave, onDelete }: TaskModalProps) {
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');

  const getInitialDate = () => {
    if (!task?.dueAt) return '';
    try {
      return format(parseISO(task.dueAt), 'yyyy-MM-dd');
    } catch {
      return '';
    }
  };

  const getInitialHour = () => {
    if (!task?.dueAt) return '12';
    try {
      return format(parseISO(task.dueAt), 'HH');
    } catch {
      return '12';
    }
  };

  const getInitialMinute = () => {
    if (!task?.dueAt) return '00';
    try {
      return format(parseISO(task.dueAt), 'mm');
    } catch {
      return '00';
    }
  };

  const [dueDate, setDueDate] = useState(getInitialDate());
  const [dueHour, setDueHour] = useState(getInitialHour());
  const [dueMinute, setDueMinute] = useState(getInitialMinute());

  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'LOW');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'PENDING');
  const [category, setCategory] = useState<string>(task?.category ?? '');
  const [customCat, setCustomCat] = useState('');
  const [showCustomCat, setShowCustomCat] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Custom Time Handlers
  const ensureDateSelected = () => {
    if (!dueDate) {
      setDueDate(format(new Date(), 'yyyy-MM-dd'));
    }
  };

  const handleHourChange = (val: string) => {
    ensureDateSelected();
    const cleaned = val.replace(/\D/g, '');
    if (cleaned === '') {
      setDueHour('');
      return;
    }
    let num = parseInt(cleaned, 10);
    if (num > 23) num = 23;
    setDueHour(num.toString());
  };

  const handleHourBlur = () => {
    if (!dueHour) {
      setDueHour('12');
    } else {
      setDueHour(parseInt(dueHour, 10).toString().padStart(2, '0'));
    }
  };

  const incrementHour = () => {
    ensureDateSelected();
    const current = dueHour ? parseInt(dueHour, 10) : 12;
    const next = (current + 1) % 24;
    setDueHour(next.toString().padStart(2, '0'));
  };

  const decrementHour = () => {
    ensureDateSelected();
    const current = dueHour ? parseInt(dueHour, 10) : 12;
    const next = (current - 1 + 24) % 24;
    setDueHour(next.toString().padStart(2, '0'));
  };

  const handleMinuteChange = (val: string) => {
    ensureDateSelected();
    const cleaned = val.replace(/\D/g, '');
    if (cleaned === '') {
      setDueMinute('');
      return;
    }
    let num = parseInt(cleaned, 10);
    if (num > 59) num = 59;
    setDueMinute(num.toString());
  };

  const handleMinuteBlur = () => {
    if (!dueMinute) {
      setDueMinute('00');
    } else {
      setDueMinute(parseInt(dueMinute, 10).toString().padStart(2, '0'));
    }
  };

  const incrementMinute = () => {
    ensureDateSelected();
    const current = dueMinute ? parseInt(dueMinute, 10) : 0;
    const next = (current + 5) % 60;
    setDueMinute(next.toString().padStart(2, '0'));
  };

  const decrementMinute = () => {
    ensureDateSelected();
    const current = dueMinute ? parseInt(dueMinute, 10) : 0;
    const next = (current - 5 + 60) % 60;
    setDueMinute(next.toString().padStart(2, '0'));
  };

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (deleteConfirm) {
      timer = setTimeout(() => setDeleteConfirm(false), 3000);
    }
    return () => clearTimeout(timer);
  }, [deleteConfirm]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title cannot be blank';
    if (title.trim().length > 255) errs.title = 'Title too long (max 255)';
    if (description && description.length > 10000) errs.description = 'Description too long (max 10000)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validate()) return;

    const resolvedCategory = showCustomCat && customCat.trim()
      ? customCat.trim().toLowerCase()
      : category || null;

    let dueAtValue: string | null = null;
    if (dueDate) {
      try {
        const [year, month, day] = dueDate.split('-').map(Number);
        const hour = parseInt(dueHour || '12', 10);
        const minute = parseInt(dueMinute || '00', 10);
        const dateObj = new Date(year, month - 1, day, hour, minute, 0);
        dueAtValue = dateObj.toISOString();
      } catch (e) {
        console.error(e);
      }
    }

    if (isEdit) {
      const data: TaskUpdateRequest = {
        title: title.trim(),
        description: description || null,
        dueAt: dueAtValue,
        category: resolvedCategory,
        priority,
        status,
      };
      onSave(data);
    } else {
      const data: TaskCreateRequest = {
        title: title.trim(),
        description: description || null,
        dueAt: dueAtValue,
        category: resolvedCategory,
        priority,
      };
      onSave(data);
    }
  };

  const handleDelete = () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    onDelete(task!.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          key="modal"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 320 }}
          className="w-full max-w-2xl bg-stone-100 dark:bg-black flex flex-col border-4 border-black dark:border-[#4169E1] shadow-[8px_8px_0px_0px_#000] dark:shadow-[#ffffff] relative max-h-full overflow-hidden"
          onClick={e => e.stopPropagation()}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b-4 border-black dark:border-[#4169E1] bg-white dark:bg-black shrink-0">
            <h2 className="text-xl font-bold uppercase tracking-widest">{isEdit ? 'EDIT TASK' : 'NEW TASK'}</h2>
            <button
              onClick={onClose}
              className="p-1 border-2 border-transparent hover:border-black dark:hover:border-[#4169E1] hover:bg-black dark:hover:bg-[#4169E1] hover:text-white transition-all"
              aria-label="Close"
            >
              <X size={24} strokeWidth={3} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
            {/* Title */}
            <div>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={e => { setTitle(e.target.value); if (errors.title) setErrors({}); }}
                placeholder="Task title..."
                className={[
                  'w-full bg-transparent outline-none border-b-2 pb-2 text-base text-black dark:text-[#f5f5f4] placeholder-stone-400',
                  errors.title ? 'border-red-500' : 'border-black dark:border-[#4169E1] focus:border-[#F97316]',
                ].join(' ')}
                style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, transition: 'border-color 0.15s' }}
              />
              {errors.title && (
                <p className="text-[11px] text-red-500 mt-1 tracking-wide">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Description (optional)..."
                rows={3}
                className="w-full bg-transparent outline-none border-b-2 border-black dark:border-[#4169E1] focus:border-[#F97316] pb-2 text-sm text-black dark:text-[#f5f5f4] placeholder-stone-400 resize-none"
                style={{ fontFamily: "'JetBrains Mono', monospace", transition: 'border-color 0.15s' }}
              />
              {errors.description && (
                <p className="text-[11px] text-red-500 mt-1 tracking-wide">{errors.description}</p>
              )}
            </div>
            {/* Due Date */}
            <div>
              <label className="text-[10px] tracking-widest text-stone-500 block mb-1 font-bold">DUE DATE & TIME</label>
              <div className="flex items-center gap-4">
                {/* Date Picker */}
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="flex-1 bg-transparent outline-none border-b-2 border-black dark:border-[#4169E1] focus:border-[#F97316] pb-2 text-sm text-black dark:text-[#f5f5f4]"
                  style={{ fontFamily: "'JetBrains Mono', monospace", transition: 'border-color 0.15s' }}
                />

                {/* Custom Time Selector (Always visible) */}
                <div className="flex items-center gap-1.5 border-2 border-black dark:border-[#4169E1] bg-white dark:bg-black px-3 py-1 shadow-brutal-sm dark:shadow-[#ffffff]">
                  {/* Hour Input + Arrows */}
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={incrementHour}
                      className="text-[8px] hover:bg-stone-200 dark:hover:bg-[#333333] w-full text-center select-none cursor-pointer leading-none font-bold"
                    >
                      ▲
                    </button>
                    <input
                      type="text"
                      value={dueHour}
                      onChange={e => handleHourChange(e.target.value)}
                      onBlur={handleHourBlur}
                      className="w-6 text-center text-xs font-bold bg-transparent text-black dark:text-[#f5f5f4] outline-none border-none p-0"
                      maxLength={2}
                    />
                    <button
                      type="button"
                      onClick={decrementHour}
                      className="text-[8px] hover:bg-stone-200 dark:hover:bg-[#333333] w-full text-center select-none cursor-pointer leading-none font-bold"
                    >
                      ▼
                    </button>
                  </div>

                  <span className="font-bold text-xs select-none">:</span>

                  {/* Minute Input + Arrows */}
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={incrementMinute}
                      className="text-[8px] hover:bg-stone-200 dark:hover:bg-[#333333] w-full text-center select-none cursor-pointer leading-none font-bold"
                    >
                      ▲
                    </button>
                    <input
                      type="text"
                      value={dueMinute}
                      onChange={e => handleMinuteChange(e.target.value)}
                      onBlur={handleMinuteBlur}
                      className="w-6 text-center text-xs font-bold bg-transparent text-black dark:text-[#f5f5f4] outline-none border-none p-0"
                      maxLength={2}
                    />
                    <button
                      type="button"
                      onClick={decrementMinute}
                      className="text-[8px] hover:bg-stone-200 dark:hover:bg-[#333333] w-full text-center select-none cursor-pointer leading-none font-bold"
                    >
                      ▼
                    </button>
                  </div>
                </div>

                {dueDate && (
                  <button
                    type="button"
                    onClick={() => { setDueDate(''); setDueHour('12'); setDueMinute('00'); }}
                    className="text-[10px] border-2 border-black dark:border-[#4169E1] bg-white dark:bg-black px-2 py-2 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors font-bold shadow-brutal-sm dark:shadow-[#ffffff] uppercase"
                  >
                    CLEAR
                  </button>
                )}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="text-[10px] tracking-widest text-stone-500 block mb-2 font-bold">PRIORITY</label>
              <div className="flex gap-2">
                {PRIORITIES.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={[
                      'flex-1 py-1.5 text-xs border-2 tracking-wider transition-colors font-bold',
                      priority === p
                        ? PRIORITY_ACTIVE[p]
                        : 'bg-white dark:bg-black text-black dark:text-[#f5f5f4] border-black dark:border-[#4169E1] hover:bg-stone-50 dark:hover:bg-[#333333]',
                    ].join(' ')}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] tracking-widest text-stone-500 block mb-2 font-bold">CATEGORY</label>
              {!showCustomCat ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCategory('')}
                    className={[
                      'px-3 py-1.5 text-xs border-2 border-black dark:border-[#4169E1] tracking-wider transition-colors font-bold',
                      category === '' ? 'bg-black dark:bg-[#4169E1] text-white' : 'bg-white dark:bg-black text-black dark:text-[#f5f5f4] hover:bg-stone-50 dark:hover:bg-[#333333]',
                    ].join(' ')}
                  >
                    NONE
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setCategory(cat.name)}
                      className={[
                        'px-3 py-1.5 text-xs border-2 border-black dark:border-[#4169E1] tracking-wider transition-colors font-bold flex items-center gap-1.5',
                        category === cat.name ? 'bg-black dark:bg-[#4169E1] text-white' : 'bg-white dark:bg-black text-black dark:text-[#f5f5f4] hover:bg-stone-50 dark:hover:bg-[#333333]',
                      ].join(' ')}
                    >
                      <div className={`w-2 h-2 ${cat.color} border border-black shrink-0`} />
                      {cat.name.toUpperCase()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowCustomCat(true)}
                    className="px-3 py-1.5 text-xs border-2 border-dashed border-black dark:border-[#4169E1] tracking-wider hover:bg-stone-200 dark:hover:bg-[#333333] transition-colors font-bold"
                  >
                    + CUSTOM
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCat}
                    onChange={e => setCustomCat(e.target.value)}
                    placeholder="e.g. meetings"
                    className="flex-1 bg-transparent outline-none border-b-2 border-black dark:border-[#4169E1] focus:border-[#F97316] pb-1 text-sm text-black dark:text-[#f5f5f4]"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => { setShowCustomCat(false); setCustomCat(''); }}
                    className="text-[10px] border-2 border-black dark:border-[#4169E1] px-2 py-0.5 hover:bg-stone-200 dark:hover:bg-[#333333] transition-colors font-bold"
                  >
                    CANCEL
                  </button>
                </div>
              )}
            </div>

            {/* Status (edit only) */}
            {isEdit && (
              <div>
                <label className="text-[10px] tracking-widest text-stone-500 block mb-2 font-bold">STATUS</label>
                <div className="flex gap-2">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={[
                        'flex-1 py-1.5 text-[10px] border-2 tracking-wider transition-colors font-bold',
                        status === s
                          ? STATUS_ACTIVE[s]
                          : 'bg-white dark:bg-black text-black dark:text-[#f5f5f4] border-black dark:border-[#4169E1] hover:bg-stone-50 dark:hover:bg-[#333333]',
                      ].join(' ')}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t-4 border-black dark:border-[#4169E1] shrink-0 mt-auto">
              {isEdit && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className={[
                    'px-6 py-2 border-2 text-xs font-bold uppercase shadow-brutal-sm dark:shadow-[#ffffff] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover dark:hover:shadow-[4px_4px_0px_0px_#ffffff] transition-all',
                    deleteConfirm
                      ? 'bg-red-700 text-white border-red-700'
                      : 'bg-white dark:bg-black text-red-600 border-red-600 hover:bg-red-600 hover:text-white',
                  ].join(' ')}
                >
                  {deleteConfirm ? 'SURE?' : 'DELETE'}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border-2 border-black dark:border-[#4169E1] bg-white dark:bg-black text-xs font-bold uppercase shadow-brutal-sm dark:shadow-[#ffffff] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover dark:hover:shadow-[4px_4px_0px_0px_#ffffff] transition-all"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="ml-auto px-6 py-2 text-xs bg-black dark:bg-[#4169E1] text-white border-2 border-black dark:border-[#4169E1] hover:bg-stone-800 dark:hover:bg-blue-700 transition-colors tracking-wider font-bold relative group/save"
              >
                <div className="absolute inset-0 translate-x-[3px] translate-y-[3px] bg-[#F97316] -z-10" />
                <span className="relative transition-transform duration-100 group-hover/save:-translate-x-[1px] group-hover/save:-translate-y-[1px] inline-block">
                  SAVE
                </span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
