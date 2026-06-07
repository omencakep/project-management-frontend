'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch, setAuthToken } from '@/lib/api';
import { getToken } from '@/lib/storage';

type User = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  department?: string | null;
  roles?: string[];
};

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
  version: number;
  clientVisible: boolean;
  blockedByDependencies?: boolean;
  assignee?: { id: string; firstName?: string | null; lastName?: string | null } | null;
  dependencies?: Array<{ id: string; dependsOnId: string; dependsOn?: { id: string; title: string } | null }>;
};

type Board = {
  project: { id: string; name: string; description?: string | null };
  columns: Record<'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED', Task[]>;
};

type Me = {
  id: string;
  roles: string[];
  department?: string | null;
};

type AssigneeOption = {
  id: string;
  label: string;
};

const statuses = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'] as const;

export default function ProjectBoardPage() {
  const params = useParams<{ id: string }>();
  const token = typeof window === 'undefined' ? null : getToken();
  const [board, setBoard] = useState<Board | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetails, setTaskDetails] = useState<{ comments: any[]; attachments: any[]; auditLogs: any[] }>({
    comments: [],
    attachments: [],
    auditLogs: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigneeId: '',
    clientVisible: false,
  });
  const [dependencyForm, setDependencyForm] = useState({ taskId: '', dependsOnId: '' });
  const [commentForm, setCommentForm] = useState('');
  const [attachmentForm, setAttachmentForm] = useState({ url: '', filename: '' });

  async function loadBoard() {
    if (!token) return;
    const [boardRes, meRes, usersRes] = await Promise.all([
      apiFetch<{ data: Board }>(`/projects/${params.id}/board`, { token }),
      apiFetch<{ data: Me }>('/users/me', { token }),
      apiFetch<{ data: User[] }>('/users', { token }).catch(() => ({ data: [] })),
    ]);
    setBoard(boardRes.data);
    setMe(meRes.data);
    setUsers(usersRes.data);
  }

  useEffect(() => {
    setAuthToken(token);
    loadBoard().catch(() => setError('Gagal load board'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const allTasks = useMemo(() => {
    if (!board) return [];
    return statuses.flatMap((status) => board.columns[status]);
  }, [board]);

  const assigneeOptions = useMemo<AssigneeOption[]>(() => {
    const directUsers = users
      .filter((user) =>
        user.roles?.some((role) => ['ADMIN', 'PROJECT_MANAGER', 'CONTRIBUTOR'].includes(role)),
      )
      .map((user) => ({
        id: user.id,
        label: `${user.firstName || 'No name'} ${user.lastName || ''} (${user.email})`.trim(),
      }));

    const boardUsers = allTasks
      .filter((task) => task.assignee?.id)
      .map((task) => ({
        id: task.assignee!.id,
        label: `${task.assignee?.firstName || 'No name'} ${task.assignee?.lastName || ''}`.trim(),
      }));

    const merged = [...directUsers, ...boardUsers];
    return merged.filter(
      (option, index) => merged.findIndex((item) => item.id === option.id) === index,
    );
  }, [allTasks, users]);

  async function refreshTask(taskId: string) {
    if (!token) return;
    const [taskRes, commentsRes, attachmentsRes, logsRes] = await Promise.all([
      apiFetch<{ data: Task }>(`/tasks/${taskId}`, { token }),
      apiFetch<{ data: any[] }>(`/tasks/${taskId}/comments`, { token }),
      apiFetch<{ data: any[] }>(`/tasks/${taskId}/attachments`, { token }),
      apiFetch<{ data: any[] }>(`/tasks/${taskId}/audit-logs`, { token }),
    ]);
    setSelectedTask(taskRes.data);
    setTaskDetails({
      comments: commentsRes.data,
      attachments: attachmentsRes.data,
      auditLogs: logsRes.data,
    });
  }

  async function selectTask(taskId: string) {
    try {
      await refreshTask(taskId);
    } catch {
      setError('Gagal load task detail');
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      await apiFetch(`/projects/${params.id}/tasks`, {
        method: 'POST',
        token,
        body: {
          title: taskForm.title,
          description: taskForm.description || undefined,
          assigneeId: taskForm.assigneeId || undefined,
          clientVisible: taskForm.clientVisible,
        },
      });
      setTaskForm({ title: '', description: '', assigneeId: '', clientVisible: false });
      await loadBoard();
    } catch (err: any) {
      setError(err?.message || 'Gagal create task');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddDependency(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      await apiFetch(`/tasks/${dependencyForm.taskId}/dependencies`, {
        method: 'POST',
        token,
        body: { dependsOnId: dependencyForm.dependsOnId },
      });
      setDependencyForm({ taskId: '', dependsOnId: '' });
      await loadBoard();
    } catch (err: any) {
      setError(err?.message || 'Gagal tambah dependency');
    } finally {
      setLoading(false);
    }
  }

  async function updateTaskStatus(task: Task, status: Task['status']) {
    if (!token || task.status === status) return;
    try {
      await apiFetch(`/tasks/${task.id}/status`, {
        method: 'PATCH',
        token,
        body: { status, version: task.version },
      });
      await loadBoard();
      if (selectedTask?.id === task.id) await refreshTask(task.id);
    } catch (err: any) {
      setError(err?.message || 'Gagal update status');
    }
  }

  async function handleDrop(status: Task['status']) {
    if (!dragTaskId || !board) return;
    const task = allTasks.find((item) => item.id === dragTaskId);
    if (task) await updateTaskStatus(task, status);
    setDragTaskId(null);
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedTask) return;
    try {
      await apiFetch(`/tasks/${selectedTask.id}/comments`, {
        method: 'POST',
        token,
        body: { content: commentForm, isInternal: false },
      });
      setCommentForm('');
      await refreshTask(selectedTask.id);
    } catch (err: any) {
      setError(err?.message || 'Gagal tambah komentar');
    }
  }

  async function handleAddAttachment(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedTask) return;
    try {
      await apiFetch(`/tasks/${selectedTask.id}/attachments`, {
        method: 'POST',
        token,
        body: attachmentForm,
      });
      setAttachmentForm({ url: '', filename: '' });
      await refreshTask(selectedTask.id);
    } catch (err: any) {
      setError(err?.message || 'Gagal tambah attachment');
    }
  }

  async function handleAttachmentFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentForm({
        url: typeof reader.result === 'string' ? reader.result : '',
        filename: file.name,
      });
    };
    reader.readAsDataURL(file);
  }

  if (!board) {
    return (
      <main className="container" style={{ padding: 32 }}>
        Loading...
      </main>
    );
  }

  const isPm = me?.roles?.includes('PROJECT_MANAGER') || me?.roles?.includes('ADMIN');

  return (
    <main className="container" style={{ padding: '24px 0 40px' }}>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h1 style={{ marginTop: 0 }}>{board.project.name}</h1>
        <p className="muted">{board.project.description}</p>
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'start' }}>
        <div className="grid" style={{ gap: 16 }}>
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Board</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
              {statuses.map((status) => (
                <section
                  key={status}
                  className="card"
                  style={{ padding: 12, minHeight: 300, background: '#fafafa' }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(status)}
                >
                  <h4 style={{ marginTop: 0 }}>{status}</h4>
                  <div className="grid">
                    {board.columns[status].map((task) => (
                      <article
                        key={task.id}
                        className="card"
                        draggable
                        onDragStart={() => setDragTaskId(task.id)}
                        onClick={() => selectTask(task.id)}
                        style={{
                          padding: 12,
                          cursor: 'grab',
                          borderColor: selectedTask?.id === task.id ? '#0f766e' : undefined,
                        }}
                      >
                        <strong>{task.title}</strong>
                        <p className="muted" style={{ marginBottom: 8 }}>{task.description}</p>
                        <small>{task.blockedByDependencies ? 'Blocked' : 'Ready'}</small>
                        {task.clientVisible ? <small style={{ marginLeft: 8 }}>Client visible</small> : null}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Create Task</h3>
            <form className="grid" onSubmit={handleCreateTask}>
              <input
                className="input"
                placeholder="Title"
                value={taskForm.title}
                onChange={(e) => setTaskForm((s) => ({ ...s, title: e.target.value }))}
              />
              <textarea
                className="textarea"
                placeholder="Description"
                rows={3}
                value={taskForm.description}
                onChange={(e) => setTaskForm((s) => ({ ...s, description: e.target.value }))}
              />
              <select
                className="select"
                value={taskForm.assigneeId}
                onChange={(e) => setTaskForm((s) => ({ ...s, assigneeId: e.target.value }))}
              >
                <option value="">Assignee</option>
                {assigneeOptions.map((option) => (
                  <option value={option.id} key={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={taskForm.clientVisible}
                  onChange={(e) => setTaskForm((s) => ({ ...s, clientVisible: e.target.checked }))}
                />
                Client visible
              </label>
              <button className="button" disabled={loading || !isPm}>
                {loading ? 'Saving...' : 'Create task'}
              </button>
            </form>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Add Dependency</h3>
            <form className="grid" onSubmit={handleAddDependency}>
              <select
                className="select"
                value={dependencyForm.taskId}
                onChange={(e) => setDependencyForm((s) => ({ ...s, taskId: e.target.value }))}
              >
                <option value="">Select task</option>
                {allTasks.map((task) => (
                  <option value={task.id} key={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
              <select
                className="select"
                value={dependencyForm.dependsOnId}
                onChange={(e) => setDependencyForm((s) => ({ ...s, dependsOnId: e.target.value }))}
              >
                <option value="">Depends on</option>
                {allTasks.map((task) => (
                  <option value={task.id} key={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
              <button className="button" disabled={loading || !isPm}>
                {loading ? 'Saving...' : 'Add dependency'}
              </button>
            </form>
          </div>
        </div>

        <aside className="grid" style={{ gap: 16, position: 'sticky', top: 16 }}>
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Task Detail</h3>
            {selectedTask ? (
              <>
                <strong>{selectedTask.title}</strong>
                <p className="muted">{selectedTask.description}</p>
                <p>Status: {selectedTask.status}</p>
                <p>Version: {selectedTask.version}</p>
                <p>Blocked: {selectedTask.blockedByDependencies ? 'Yes' : 'No'}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {statuses.map((status) => (
                    <button
                      key={status}
                      className="button secondary"
                      onClick={() => updateTaskStatus(selectedTask, status)}
                    >
                      Move {status}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted">Select task.</p>
            )}
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Add Comment</h3>
            <form className="grid" onSubmit={handleAddComment}>
              <textarea
                className="textarea"
                placeholder="Write a comment..."
                rows={3}
                value={commentForm}
                onChange={(e) => setCommentForm(e.target.value)}
                disabled={!selectedTask}
              />
              <button className="button" disabled={!selectedTask || !commentForm.trim()}>
                Send comment
              </button>
            </form>
            <div style={{ marginTop: 16 }}>
              {taskDetails.comments.length ? (
                taskDetails.comments.map((comment: any) => (
                  <div key={comment.id} style={{ marginBottom: 12 }}>
                    <strong>{comment.author?.firstName || 'Anon'}</strong>
                    <p className="muted" style={{ margin: 0 }}>
                      {comment.content}
                    </p>
                  </div>
                ))
              ) : (
                <p className="muted">No comments</p>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Upload Attachment</h3>
            <form className="grid" onSubmit={handleAddAttachment}>
              <input
                className="input"
                type="file"
                onChange={handleAttachmentFileChange}
                disabled={!selectedTask}
              />
              <input
                className="input"
                placeholder="Filename"
                value={attachmentForm.filename}
                onChange={(e) => setAttachmentForm((s) => ({ ...s, filename: e.target.value }))}
                disabled={!selectedTask}
              />
              <button className="button" disabled={!selectedTask || !attachmentForm.url || !attachmentForm.filename}>
                Upload
              </button>
            </form>
            <div style={{ marginTop: 16 }}>
              {taskDetails.attachments.length ? (
                taskDetails.attachments.map((item: any) => (
                  <div key={item.id} style={{ marginBottom: 8 }}>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {item.filename}
                    </a>
                  </div>
                ))
              ) : (
                <p className="muted">No attachments</p>
              )}
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Audit Log</h3>
            {taskDetails.auditLogs.length ? (
              taskDetails.auditLogs.map((log: any) => (
                <div key={log.id} style={{ marginBottom: 12 }}>
                  <strong>{log.column}</strong>
                  <p className="muted" style={{ margin: 0 }}>
                    {log.oldValue} → {log.newValue}
                  </p>
                </div>
              ))
            ) : (
              <p className="muted">No audit logs</p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
