"use client";

import {
  addMonths,
  differenceInMinutes,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Flag,
  ListChecks,
  Plus,
  RotateCcw,
  Target,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";

type Task = {
  id: string;
  title: string;
  kind: "task" | "follow-up";
  taskDate: string;
  startTime: string;
  endTime: string;
  dueDate: string | null;
  priority: "low" | "medium" | "high";
  goal: string;
  notes: string;
  status: "open" | "done";
  createdAt: string;
  updatedAt: string;
};

type DayTarget = {
  targetDate: string;
  focusLabel: string;
  targetMinutes: number;
};

type Draft = {
  title: string;
  kind: Task["kind"];
  taskDate: string;
  startTime: string;
  endTime: string;
  dueDate: string;
  priority: Task["priority"];
  goal: string;
  notes: string;
};

const weekdays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function emptyDraft(date: Date): Draft {
  return {
    title: "",
    kind: "task",
    taskDate: dateKey(date),
    startTime: "09:00",
    endTime: "10:00",
    dueDate: dateKey(date),
    priority: "medium",
    goal: "",
    notes: "",
  };
}

function minutesFor(task: Task) {
  return Math.max(
    0,
    differenceInMinutes(
      parse(task.endTime, "HH:mm", new Date()),
      parse(task.startTime, "HH:mm", new Date())
    )
  );
}

function humanMinutes(minutes: number) {
  if (minutes <= 0) return "0h";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours ? `${hours}h` : ""}${hours && mins ? " " : ""}${mins ? `${mins}m` : ""}`;
}

async function jsonOrError(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(payload.error || "Something went wrong.");
  return payload;
}

export default function Home() {
  const today = useMemo(() => new Date(), []);
  const [activeMonth, setActiveMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(today);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [targets, setTargets] = useState<DayTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemOpen, setItemOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(today));
  const [targetLabel, setTargetLabel] = useState("");
  const [targetHours, setTargetHours] = useState("8");
  const [saving, setSaving] = useState(false);

  const visibleStart = useMemo(
    () => startOfWeek(startOfMonth(activeMonth), { weekStartsOn: 1 }),
    [activeMonth]
  );
  const visibleEnd = useMemo(
    () => endOfWeek(endOfMonth(activeMonth), { weekStartsOn: 1 }),
    [activeMonth]
  );
  const calendarDays = useMemo(
    () => eachDayOfInterval({ start: visibleStart, end: visibleEnd }),
    [visibleStart, visibleEnd]
  );

  const loadPlanner = useCallback(async () => {
    setLoading(true);
    try {
      const range = `start=${dateKey(visibleStart)}&end=${dateKey(visibleEnd)}`;
      const [tasksResponse, targetsResponse] = await Promise.all([
        fetch(`/api/tasks?${range}`, { cache: "no-store" }),
        fetch(`/api/targets?${range}`, { cache: "no-store" }),
      ]);
      const [taskData, targetData] = await Promise.all([
        jsonOrError(tasksResponse) as Promise<{ tasks?: Task[] }>,
        jsonOrError(targetsResponse) as Promise<{ targets?: DayTarget[] }>,
      ]);
      setTasks(taskData.tasks ?? []);
      setTargets(targetData.targets ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load the planner.");
    } finally {
      setLoading(false);
    }
  }, [visibleEnd, visibleStart]);

  useEffect(() => {
    void loadPlanner();
  }, [loadPlanner]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      const items = map.get(task.taskDate) ?? [];
      items.push(task);
      map.set(task.taskDate, items);
    }
    return map;
  }, [tasks]);

  const selectedKey = dateKey(selectedDate);
  const selectedTasks = tasksByDate.get(selectedKey) ?? [];
  const selectedTarget = targets.find((target) => target.targetDate === selectedKey);
  const plannedMinutes = selectedTasks.reduce((sum, task) => sum + minutesFor(task), 0);
  const completedMinutes = selectedTasks
    .filter((task) => task.status === "done")
    .reduce((sum, task) => sum + minutesFor(task), 0);
  const capacityMinutes = selectedTarget?.targetMinutes ?? 480;
  const capacityPercent = Math.min(100, Math.round((plannedMinutes / capacityMinutes) * 100));

  const monthTasks = tasks.filter((task) => isSameMonth(new Date(`${task.taskDate}T12:00:00`), activeMonth));
  const openCount = monthTasks.filter((task) => task.status === "open").length;
  const followUpCount = monthTasks.filter(
    (task) => task.kind === "follow-up" && task.status === "open"
  ).length;
  const monthMinutes = monthTasks.reduce((sum, task) => sum + minutesFor(task), 0);

  function selectMonth(month: Date) {
    setActiveMonth(startOfMonth(month));
    setSelectedDate(startOfMonth(month));
  }

  function openCreate(date: Date) {
    setSelectedDate(date);
    setEditingTask(null);
    setDraft(emptyDraft(date));
    setItemOpen(true);
  }

  function openEdit(task: Task) {
    setSelectedDate(new Date(`${task.taskDate}T12:00:00`));
    setEditingTask(task);
    setDraft({
      title: task.title,
      kind: task.kind,
      taskDate: task.taskDate,
      startTime: task.startTime,
      endTime: task.endTime,
      dueDate: task.dueDate ?? "",
      priority: task.priority,
      goal: task.goal,
      notes: task.notes,
    });
    setItemOpen(true);
  }

  function openTarget() {
    setTargetLabel(selectedTarget?.focusLabel ?? "");
    setTargetHours(String((selectedTarget?.targetMinutes ?? 480) / 60));
    setTargetOpen(true);
  }

  async function saveItem(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(editingTask ? `/api/tasks/${editingTask.id}` : "/api/tasks", {
        method: editingTask ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, dueDate: draft.dueDate || null }),
      });
      const data = (await jsonOrError(response)) as { task?: Task };
      if (!data.task) throw new Error("The saved item could not be read.");
      setTasks((current) =>
        editingTask
          ? current.map((task) => (task.id === data.task!.id ? data.task! : task))
          : [...current, data.task!].sort((a, b) =>
              `${a.taskDate}${a.startTime}`.localeCompare(`${b.taskDate}${b.startTime}`)
            )
      );
      setItemOpen(false);
      toast.success(editingTask ? "Item updated" : "Added to your calendar");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this item.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask() {
    if (!editingTask) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/tasks/${editingTask.id}`, { method: "DELETE" });
      if (!response.ok) await jsonOrError(response);
      setTasks((current) => current.filter((task) => task.id !== editingTask.id));
      setItemOpen(false);
      toast.success("Item removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove this item.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task: Task) {
    const nextStatus = task.status === "done" ? "open" : "done";
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item))
    );
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = (await jsonOrError(response)) as { task?: Task };
      if (data.task) {
        setTasks((current) => current.map((item) => (item.id === task.id ? data.task! : item)));
      }
    } catch (error) {
      setTasks((current) => current.map((item) => (item.id === task.id ? task : item)));
      toast.error(error instanceof Error ? error.message : "Could not update this item.");
    }
  }

  async function saveTarget(event: React.FormEvent) {
    event.preventDefault();
    const hours = Number(targetHours);
    setSaving(true);
    try {
      const response = await fetch("/api/targets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetDate: selectedKey,
          focusLabel: targetLabel,
          targetMinutes: Math.round(hours * 60),
        }),
      });
      const data = (await jsonOrError(response)) as { target?: DayTarget };
      if (!data.target) throw new Error("The saved target could not be read.");
      setTargets((current) => [
        ...current.filter((target) => target.targetDate !== selectedKey),
        data.target!,
      ]);
      setTargetOpen(false);
      toast.success("Daily target saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the target.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="planner-page">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <CalendarDays />
          </div>
          <div>
            <p className="brand-name">FocusCal</p>
            <p className="brand-note">Plan the work. Protect the time.</p>
          </div>
        </div>

        <div className="month-controls" aria-label="Calendar navigation">
          <Button variant="ghost" size="icon-sm" onClick={() => selectMonth(subMonths(activeMonth, 1))} aria-label="Previous month"><ArrowLeft /></Button>
          <h1>{format(activeMonth, "MMMM yyyy")}</h1>
          <Button variant="ghost" size="icon-sm" onClick={() => selectMonth(addMonths(activeMonth, 1))} aria-label="Next month"><ArrowRight /></Button>
          <button className="today-link" onClick={() => { setActiveMonth(startOfMonth(today)); setSelectedDate(today); }}>Today</button>
        </div>

        <div className="topbar-actions">
          <div className="month-stat"><span>{humanMinutes(monthMinutes)}</span> planned</div>
          <div className="month-stat"><span>{openCount}</span> open</div>
          <div className="month-stat follow"><span>{followUpCount}</span> follow-ups</div>
          <Button className="add-task-button" onClick={() => openCreate(selectedDate)}><Plus /> Add item</Button>
        </div>
      </header>

      <section className="planner-workspace">
        <div className="calendar-card">
          <div className="calendar-hint">
            <span><span className="legend-dot task-dot" /> Task</span>
            <span><span className="legend-dot follow-dot" /> Follow-up</span>
            <span className="hint-copy">Click any day to add an item</span>
          </div>

          <div className="weekday-row" aria-hidden="true">
            {weekdays.map((day) => <div key={day}>{day}</div>)}
          </div>

          <div className={`month-grid ${calendarDays.length > 35 ? "six-weeks" : ""}`}>
            {calendarDays.map((day) => {
              const key = dateKey(day);
              const dayTasks = tasksByDate.get(key) ?? [];
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDate);
              const maxVisible = calendarDays.length > 35 ? 2 : 3;
              return (
                <div
                  key={key}
                  className={`day-cell ${!isSameMonth(day, activeMonth) ? "outside" : ""} ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${format(day, "EEEE, MMMM d")}. ${dayTasks.length} items. Add item.`}
                  onClick={() => openCreate(day)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openCreate(day);
                    }
                  }}
                >
                  <div className="day-heading">
                    <span className="day-number">{format(day, "d")}</span>
                    {dayTasks.length > 0 && <span className="day-total">{dayTasks.length}</span>}
                  </div>
                  <div className="day-events">
                    {dayTasks.slice(0, maxVisible).map((task) => (
                      <button
                        key={task.id}
                        className={`event-chip ${task.kind === "follow-up" ? "follow-up" : "task"} ${task.status === "done" ? "done" : ""}`}
                        onClick={(event) => { event.stopPropagation(); openEdit(task); }}
                        title={`${task.startTime} ${task.title}`}
                      >
                        <span>{task.startTime}</span>
                        <strong>{task.title}</strong>
                      </button>
                    ))}
                    {dayTasks.length > maxVisible && <span className="more-events">+{dayTasks.length - maxVisible} more</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {loading && <div className="loading-layer"><RotateCcw className="spin" /> Loading month…</div>}
        </div>

        <aside className="day-panel">
          <div className="day-panel-heading">
            <div><p>{format(selectedDate, "EEEE")}</p><h2>{format(selectedDate, "MMMM d")}</h2></div>
            <Button size="icon" onClick={() => openCreate(selectedDate)} aria-label="Add item to selected day"><Plus /></Button>
          </div>

          <button className="target-card" onClick={openTarget}>
            <span className="target-icon"><Target /></span>
            <span className="target-copy"><small>DAILY TARGET</small><strong>{selectedTarget?.focusLabel || "Set your focus for this day"}</strong></span>
            <span className="target-hours">{humanMinutes(capacityMinutes)}</span>
            <ChevronRight />
          </button>

          <div className="schedule-heading">
            <div><h3>Time plan</h3><span>{selectedTasks.length} {selectedTasks.length === 1 ? "item" : "items"}</span></div>
            <span className="planned-time"><Clock3 /> {humanMinutes(plannedMinutes)}</span>
          </div>

          <div className="schedule-list">
            {selectedTasks.length === 0 ? (
              <div className="empty-plan">
                <span><ListChecks /></span><h3>Your day is clear</h3>
                <p>Add a task or follow-up, then give it a protected time block.</p>
                <Button variant="outline" onClick={() => openCreate(selectedDate)}><Plus /> Add first item</Button>
              </div>
            ) : selectedTasks.map((task) => (
              <article key={task.id} className={`schedule-item ${task.status === "done" ? "done" : ""}`}>
                <button className="complete-button" onClick={() => void toggleTask(task)} aria-label={task.status === "done" ? `Reopen ${task.title}` : `Complete ${task.title}`}>{task.status === "done" && <Check />}</button>
                <button className="schedule-body" onClick={() => openEdit(task)}>
                  <span className="schedule-time">{task.startTime}–{task.endTime}</span>
                  <strong>{task.title}</strong>
                  <span className="schedule-meta">
                    <span className={task.kind === "follow-up" ? "follow-label" : "task-label"}>{task.kind === "follow-up" ? "Follow-up" : "Task"}</span>
                    {task.goal && <span><Flag /> {task.goal}</span>}
                    {task.dueDate && task.dueDate !== task.taskDate && <span><CircleAlert /> Due {format(new Date(`${task.dueDate}T12:00:00`), "MMM d")}</span>}
                  </span>
                </button>
              </article>
            ))}
          </div>

          <div className="capacity-card">
            <div className="capacity-labels"><span>Daily capacity</span><strong>{humanMinutes(plannedMinutes)} / {humanMinutes(capacityMinutes)}</strong></div>
            <div className="capacity-track" aria-label={`${capacityPercent}% of daily capacity planned`}><span style={{ width: `${capacityPercent}%` }} /></div>
            <p>{humanMinutes(completedMinutes)} completed · {humanMinutes(Math.max(0, capacityMinutes - plannedMinutes))} still open</p>
          </div>
        </aside>
      </section>

      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent className="item-dialog sm:max-w-xl">
          <DialogHeader><DialogTitle>{editingTask ? "Edit calendar item" : "Add to calendar"}</DialogTitle><DialogDescription>Schedule the work, define the outcome, and keep the deadline visible.</DialogDescription></DialogHeader>
          <form onSubmit={saveItem} className="dialog-form">
            <div className="field full-field"><label htmlFor="item-title">Title</label><Input id="item-title" autoFocus required maxLength={160} placeholder="e.g. Follow up on proposal" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></div>
            <div className="field"><label>Type</label><Select value={draft.kind} onValueChange={(value) => setDraft({ ...draft, kind: value as Task["kind"] })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="task">Task</SelectItem><SelectItem value="follow-up">Follow-up</SelectItem></SelectContent></Select></div>
            <div className="field"><label>Priority</label><Select value={draft.priority} onValueChange={(value) => setDraft({ ...draft, priority: value as Task["priority"] })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select></div>
            <div className="field"><label htmlFor="item-date">Calendar date</label><Input id="item-date" type="date" required value={draft.taskDate} onChange={(event) => setDraft({ ...draft, taskDate: event.target.value })} /></div>
            <div className="field"><label htmlFor="item-due">Deadline</label><Input id="item-due" type="date" value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} /></div>
            <div className="time-fields full-field"><div className="field"><label htmlFor="item-start">Start</label><Input id="item-start" type="time" required value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></div><span>to</span><div className="field"><label htmlFor="item-end">End</label><Input id="item-end" type="time" required value={draft.endTime} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} /></div></div>
            <div className="field full-field"><label htmlFor="item-goal">Target / outcome</label><Input id="item-goal" maxLength={120} placeholder="What should be achieved?" value={draft.goal} onChange={(event) => setDraft({ ...draft, goal: event.target.value })} /></div>
            <div className="field full-field"><label htmlFor="item-notes">Notes</label><Textarea id="item-notes" maxLength={1000} placeholder="Context, contact details, or next step" value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></div>
            <DialogFooter className="full-field dialog-actions">
              {editingTask && <Button type="button" variant="ghost" className="delete-action" disabled={saving} onClick={() => void deleteTask()}><Trash2 /> Delete</Button>}
              <span className="action-spacer" />
              <Button type="button" variant="outline" onClick={() => setItemOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : editingTask ? "Save changes" : "Add item"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={targetOpen} onOpenChange={setTargetOpen}>
        <DialogContent className="target-dialog sm:max-w-md">
          <DialogHeader><DialogTitle>Set daily target</DialogTitle><DialogDescription>{format(selectedDate, "EEEE, MMMM d")}</DialogDescription></DialogHeader>
          <form onSubmit={saveTarget} className="target-form">
            <div className="field"><label htmlFor="focus-target">Main focus</label><Input id="focus-target" autoFocus maxLength={120} placeholder="e.g. Finish the client proposal" value={targetLabel} onChange={(event) => setTargetLabel(event.target.value)} /></div>
            <div className="field"><label htmlFor="capacity-hours">Available work hours</label><Input id="capacity-hours" type="number" min="1" max="16" step="0.5" required value={targetHours} onChange={(event) => setTargetHours(event.target.value)} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setTargetOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save target"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Toaster position="top-center" richColors />
    </main>
  );
}
