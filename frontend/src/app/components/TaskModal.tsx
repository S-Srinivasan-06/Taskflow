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

function toDatetimeLocalValue(isoStr: string): string {
  try {
    const d = parseISO(isoStr);
    return format(d, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return '';
  }
}

export function TaskModal({ task, categories, onClose, onSave, onDelete }: TaskModalProps) {
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [dueAt, setDueAt] = useState(task?.dueAt ? toDatetimeLocalValue(task.dueAt) : '');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'LOW');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'PENDING');
  const [category, setCategory] = useState<string>(task?.category ?? '');
  const [customCat, setCustomCat] = useState('');
  const [showCustomCat, setShowCustomCat] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);

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

    const dueAtValue = dueAt ? new Date(dueAt).toISOString() : null;

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
          className="w-full max-w-2xl bg-stone-100 flex flex-col border-4 border-black shadow-[8px_8px_0px_0px_#000] relative max-h-full overflow-hidden"
          onClick={e => e.stopPropagation()}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b-4 border-black bg-white shrink-0">
            <h2 className="text-xl font-bold uppercase tracking-widest">{isEdit ? 'EDIT TASK' : 'NEW TASK'}</h2>
            <button
              onClick={onClose}
              className="p-1 border-2 border-transparent hover:border-black hover:bg-black hover:text-white transition-all"
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
                  'w-full bg-transparent outline-none border-b-2 pb-2 text-base text-black placeholder-stone-400',
                  errors.title ? 'border-red-500' : 'border-black focus:border-[#F97316]',
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
                className="w-full bg-transparent outline-none border-b-2 border-black focus:border-[#F97316] pb-2 text-sm text-black placeholder-stone-400 resize-none"
                style={{ fontFamily: "'JetBrains Mono', monospace", transition: 'border-color 0.15s' }}
              />
              {errors.description && (
                <p className="text-[11px] text-red-500 mt-1 tracking-wide">{errors.description}</p>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="text-[10px] tracking-widest text-stone-500 block mb-1 font-bold">DUE DATE</label>
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={dueAt}
                  onChange={e => setDueAt(e.target.value)}
                  className="flex-1 bg-transparent outline-none border-b-2 border-black focus:border-[#F97316] pb-2 text-sm text-black"
                  style={{ fontFamily: "'JetBrains Mono', monospace", transition: 'border-color 0.15s' }}
                />
                {dueAt && (
                  <button
                    type="button"
                    onClick={() => setDueAt('')}
                    className="text-[10px] border-2 border-black px-2 py-0.5 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors font-bold"
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
                        : 'bg-white text-black border-black hover:bg-stone-50',
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
                      'px-3 py-1.5 text-xs border-2 border-black tracking-wider transition-colors font-bold',
                      category === '' ? 'bg-black text-white' : 'bg-white text-black hover:bg-stone-50',
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
                        'px-3 py-1.5 text-xs border-2 border-black tracking-wider transition-colors font-bold flex items-center gap-1.5',
                        category === cat.name ? 'bg-black text-white' : 'bg-white text-black hover:bg-stone-50',
                      ].join(' ')}
                    >
                      <div className={`w-2 h-2 ${cat.color} border border-black shrink-0`} />
                      {cat.name.toUpperCase()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowCustomCat(true)}
                    className="px-3 py-1.5 text-xs border-2 border-dashed border-black tracking-wider hover:bg-stone-200 transition-colors font-bold"
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
                    className="flex-1 bg-transparent outline-none border-b-2 border-black focus:border-[#F97316] pb-1 text-sm"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => { setShowCustomCat(false); setCustomCat(''); }}
                    className="text-[10px] border-2 border-black px-2 py-0.5 hover:bg-stone-200 transition-colors font-bold"
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
                          : 'bg-white text-black border-black hover:bg-stone-50',
                      ].join(' ')}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-6 border-t-4 border-black shrink-0 mt-auto">
              {isEdit && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className={[
                    'px-6 py-2 border-2 text-xs font-bold uppercase shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover transition-all',
                    deleteConfirm
                      ? 'bg-red-700 text-white border-red-700'
                      : 'bg-white text-red-600 border-red-600 hover:bg-red-600 hover:text-white',
                  ].join(' ')}
                >
                  {deleteConfirm ? 'SURE?' : 'DELETE'}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border-2 border-black bg-white text-xs font-bold uppercase shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-hover transition-all"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="ml-auto px-6 py-2 text-xs bg-black text-white border-2 border-black hover:bg-stone-800 transition-colors tracking-wider font-bold relative group/save"
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
