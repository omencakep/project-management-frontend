'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, setAuthToken } from '@/lib/api';
import { clearToken, getToken } from '@/lib/storage';

type User = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
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
  assignee?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  dependencies?: Array<{
    id: string;
    dependsOnId: string;
    dependsOn?: { id: string; title: string } | null;
  }>;
};
type Board = {
  project: { id: string; name: string; description?: string | null };
  columns: Record<'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED', Task[]>;
};
type Me = { id: string; roles: string[] };

const statuses = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'] as const;

const STATUS_META: Record<
  string,
  { label: string; color: string; badgeBg: string; badgeBorder: string }
> = {
  TODO: {
    label: 'To Do',
    color: '#7A8FFF',
    badgeBg: 'rgba(122,143,255,0.12)',
    badgeBorder: 'rgba(122,143,255,0.25)',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: '#00A8FF',
    badgeBg: 'rgba(0,168,255,0.12)',
    badgeBorder: 'rgba(0,168,255,0.25)',
  },
  BLOCKED: {
    label: 'Blocked',
    color: '#FF6B6B',
    badgeBg: 'rgba(255,107,107,0.12)',
    badgeBorder: 'rgba(255,107,107,0.25)',
  },
  DONE: {
    label: 'Done',
    color: '#00D97A',
    badgeBg: 'rgba(0,217,122,0.12)',
    badgeBorder: 'rgba(0,217,122,0.25)',
  },
};

export default function ProjectBoardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const token = typeof window === 'undefined' ? null : getToken();

  const [board, setBoard] = useState<Board | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskDetails, setTaskDetails] = useState<{
    comments: any[];
    attachments: any[];
    auditLogs: any[];
  }>({ comments: [], attachments: [], auditLogs: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);

  // ── Create Task Modal ──
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigneeId: '',
    clientVisible: false,
  });
  const [taskCreateLoading, setTaskCreateLoading] = useState(false);
  const [taskCreateError, setTaskCreateError] = useState('');
  const [taskCreateSuccess, setTaskCreateSuccess] = useState(false);

  function openTaskModal() {
    setTaskForm({ title: '', description: '', assigneeId: '', clientVisible: false });
    setTaskCreateError('');
    setTaskCreateSuccess(false);
    setShowTaskModal(true);
  }
  function closeTaskModal() {
    if (taskCreateLoading) return;
    setShowTaskModal(false);
  }

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    assigneeId: '',
    clientVisible: false,
  });
  const [dependencyForm, setDependencyForm] = useState({ taskId: '', dependsOnId: '' });
  const [commentForm, setCommentForm] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'detail' | 'comments' | 'audit'>('detail');

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

  async function refreshTask(taskId: string) {
    if (!token) return;
    const [taskRes, commentsRes, attachmentsRes, logsRes] = await Promise.all([
      apiFetch<{ data: Task }>(`/tasks/${taskId}`, { token }),
      apiFetch<{ data: any[] }>(`/tasks/${taskId}/comments`, { token }),
      apiFetch<{ data: any[] }>(`/tasks/${taskId}/attachments`, { token }),
      apiFetch<{ data: any[] }>(`/tasks/${taskId}/audit-logs`, { token }),
    ]);
    setSelectedTask(taskRes.data);
    setEditForm({
      title: taskRes.data.title,
      description: taskRes.data.description || '',
      assigneeId: taskRes.data.assignee?.id || '',
      clientVisible: taskRes.data.clientVisible,
    });
    setTaskDetails({
      comments: commentsRes.data,
      attachments: attachmentsRes.data,
      auditLogs: logsRes.data.slice(0, 5),
    });
  }

  useEffect(() => {
    setAuthToken(token);
    if (!token) { router.push('/login'); return; }
    loadBoard().catch(() => setError('Gagal memuat board'));
  }, [params.id]);

  // Close modal on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeTaskModal(); };
    if (showTaskModal) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showTaskModal, taskCreateLoading]);

  const allTasks = useMemo(
    () => (board ? statuses.flatMap((s) => board.columns[s]) : []),
    [board],
  );
  const assigneeOptions = useMemo(
    () =>
      users
        .filter((u) => u.roles?.some((r) => ['ADMIN', 'PROJECT_MANAGER', 'CONTRIBUTOR'].includes(r)))
        .map((u) => ({
          id: u.id,
          label: `${u.firstName || ''} ${u.lastName || ''} (${u.email})`.trim(),
        })),
    [users],
  );
  const isPm = me?.roles?.includes('PROJECT_MANAGER') || me?.roles?.includes('ADMIN');

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setTaskCreateLoading(true);
    setTaskCreateError('');
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
      setTaskCreateSuccess(true);
      await loadBoard();
      setTimeout(() => setShowTaskModal(false), 900);
    } catch (err: any) {
      setTaskCreateError(err.message || 'Gagal membuat task');
    } finally {
      setTaskCreateLoading(false);
    }
  }

  async function handleEditTask(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedTask) return;
    setLoading(true);
    try {
      await apiFetch(`/tasks/${selectedTask.id}`, {
        method: 'PATCH',
        token,
        body: {
          title: editForm.title,
          description: editForm.description,
          assigneeId: editForm.assigneeId || null,
          clientVisible: editForm.clientVisible,
          version: selectedTask.version,
        },
      });
      await loadBoard();
      await refreshTask(selectedTask.id);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan perubahan');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTask() {
    if (!token || !selectedTask || !confirm('Hapus task ini?')) return;
    setLoading(true);
    try {
      await apiFetch(`/tasks/${selectedTask.id}`, { method: 'DELETE', token });
      setSelectedTask(null);
      await loadBoard();
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus task');
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
      setError(err.message || 'Gagal update status');
    }
  }

  async function handleDrop(status: Task['status']) {
    if (!dragTaskId || !board) return;
    const task = allTasks.find((t) => t.id === dragTaskId);
    if (task) await updateTaskStatus(task, status);
    setDragTaskId(null);
  }

  async function handleAddDependency(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    try {
      await apiFetch(`/tasks/${dependencyForm.taskId}/dependencies`, {
        method: 'POST',
        token,
        body: { dependsOnId: dependencyForm.dependsOnId },
      });
      setDependencyForm({ taskId: '', dependsOnId: '' });
      await loadBoard();
    } catch (err: any) {
      setError(err.message || 'Gagal menambah dependency');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteDependency(taskId: string, dependsOnId: string) {
    if (!token) return;
    try {
      await apiFetch(`/tasks/${taskId}/dependencies`, {
        method: 'DELETE',
        token,
        body: { dependsOnId },
      });
      await loadBoard();
      if (selectedTask?.id === taskId) await refreshTask(taskId);
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus dependency');
    }
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
      setError(err.message || 'Gagal menambah komentar');
    }
  }

  async function handleAttachmentUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !selectedTask || !attachmentFile) return;
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => reject(new Error('Gagal membaca file'));
      reader.readAsDataURL(attachmentFile);
    });
    try {
      await apiFetch(`/tasks/${selectedTask.id}/attachments`, {
        method: 'POST',
        token,
        body: { url, filename: attachmentFile.name },
      });
      setAttachmentFile(null);
      await refreshTask(selectedTask.id);
    } catch (err: any) {
      setError(err.message || 'Gagal upload attachment');
    }
  }

  function logout() {
    clearToken();
    setAuthToken(null);
    router.push('/login');
  }

  if (!board) {
    return (
      <div style={{ background: '#0A0E1A', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '2px solid rgba(0,160,255,0.3)', borderTopColor: '#00A8FF', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'sans-serif' }}>Memuat board...</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');

        .bp-page { font-family:'Plus Jakarta Sans',sans-serif; background:#0A0E1A; min-height:100vh; display:flex; flex-direction:column; }

        /* ── Nav ── */
        .bp-nav { background:#0D1222; border-bottom:0.5px solid rgba(255,255,255,0.07); padding:0 24px; height:56px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:20; flex-shrink:0; }
        .bp-nav-left { display:flex; align-items:center; gap:18px; }
        .bp-logo { display:flex; align-items:center; gap:9px; }
        .bp-logo-icon { width:28px; height:28px; background:linear-gradient(135deg,#0078FF,#00C8FF); border-radius:7px; display:flex; align-items:center; justify-content:center; }
        .bp-logo-text { font-family:'Syne',sans-serif; font-size:16px; font-weight:800; color:#fff; }
        .bp-nav-sep { width:0.5px; height:20px; background:rgba(255,255,255,0.1); }
        .bp-breadcrumb { display:flex; align-items:center; gap:7px; font-size:12px; }
        .bp-breadcrumb-link { color:rgba(255,255,255,0.35); cursor:pointer; background:none; border:none; font-family:'Plus Jakarta Sans',sans-serif; font-size:12px; padding:0; }
        .bp-breadcrumb-link:hover { color:rgba(255,255,255,0.65); }
        .bp-breadcrumb-sep { color:rgba(255,255,255,0.2); }
        .bp-breadcrumb-current { color:rgba(255,255,255,0.75); font-weight:600; }
        .bp-nav-right { display:flex; align-items:center; gap:8px; }
        .bp-btn-ghost { background:rgba(255,255,255,0.04); border:0.5px solid rgba(255,255,255,0.1); border-radius:7px; padding:6px 12px; font-size:12px; font-weight:600; color:rgba(255,255,255,0.5); font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; display:flex; align-items:center; gap:6px; transition:background 0.15s,color 0.15s; }
        .bp-btn-ghost:hover { background:rgba(255,255,255,0.08); color:#fff; }
        .bp-avatar { width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg,#0078FF,#00C8FF); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#fff; }

        /* ── Header ── */
        .bp-header { padding:20px 24px 0; display:flex; align-items:flex-start; justify-content:space-between; gap:16px; }
        .bp-project-name { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; color:#fff; margin-bottom:4px; }
        .bp-project-desc { font-size:13px; color:rgba(255,255,255,0.38); line-height:1.55; }
        .bp-header-actions { display:flex; gap:8px; flex-shrink:0; }
        .bp-btn-primary { background:linear-gradient(135deg,#0078FF,#00C8FF); border:none; border-radius:8px; padding:9px 16px; font-size:13px; font-weight:700; color:#fff; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; display:flex; align-items:center; gap:7px; position:relative; overflow:hidden; transition:opacity 0.15s; }
        .bp-btn-primary:hover { opacity:0.9; }
        .bp-btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
        .bp-shine { position:absolute; top:0; left:-100%; width:60%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent); animation:bp-shine 2.5s infinite; }
        @keyframes bp-shine { 0%{left:-100%} 60%,100%{left:150%} }

        /* ── Body ── */
        .bp-body { display:flex; gap:0; flex:1; padding-top:16px; overflow:hidden; }

        /* ── Board ── */
        .bp-board-area { flex:1; padding:0 0 24px 24px; overflow-x:auto; min-width:0; }
        .bp-board { display:flex; gap:12px; min-width:max-content; }
        .bp-col { width:220px; flex-shrink:0; display:flex; flex-direction:column; gap:8px; }
        .bp-col-header { display:flex; align-items:center; justify-content:space-between; padding:9px 12px; background:rgba(255,255,255,0.04); border:0.5px solid rgba(255,255,255,0.07); border-radius:8px; }
        .bp-col-label { font-size:11px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; }
        .bp-col-count { font-size:11px; font-weight:600; background:rgba(255,255,255,0.09); color:rgba(255,255,255,0.5); padding:2px 8px; border-radius:10px; }

        /* Task card */
        .bp-task { background:#0D1628; border:0.5px solid rgba(255,255,255,0.07); border-radius:9px; padding:12px; cursor:pointer; transition:border-color 0.15s,background 0.15s; position:relative; overflow:hidden; }
        .bp-task::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; opacity:0; transition:opacity 0.15s; }
        .bp-task:hover { background:#0F1A30; border-color:rgba(0,160,255,0.3); }
        .bp-task:hover::before, .bp-task.bp-selected::before { opacity:1; }
        .bp-task.bp-selected { border-color:rgba(0,160,255,0.5); background:#0F1A30; }
        .bp-task-title { font-size:13px; font-weight:700; color:#fff; line-height:1.3; margin-bottom:5px; }
        .bp-task-desc { font-size:11px; color:rgba(255,255,255,0.35); line-height:1.5; margin-bottom:8px; }
        .bp-task-footer { display:flex; align-items:center; justify-content:space-between; }
        .bp-task-badge { font-size:9px; font-weight:700; letter-spacing:0.4px; text-transform:uppercase; padding:2px 7px; border-radius:10px; }
        .badge-ready  { background:rgba(0,200,100,0.12); color:#00D97A; border:0.5px solid rgba(0,200,100,0.2); }
        .badge-blocked { background:rgba(255,80,80,0.12); color:#FF6B6B; border:0.5px solid rgba(255,80,80,0.2); }
        .bp-task-avatar { width:22px; height:22px; border-radius:50%; background:rgba(0,120,255,0.25); display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700; color:#00A8FF; }
        .bp-add-task-btn { display:flex; align-items:center; justify-content:center; gap:5px; background:rgba(255,255,255,0.02); border:0.5px dashed rgba(255,255,255,0.1); border-radius:8px; padding:9px; font-size:11px; color:rgba(255,255,255,0.28); cursor:pointer; transition:all 0.15s; font-family:'Plus Jakarta Sans',sans-serif; width:100%; }
        .bp-add-task-btn:hover { border-color:rgba(0,160,255,0.35); color:#0096FF; background:rgba(0,160,255,0.04); }

        /* ── Sidebar ── */
        .bp-sidebar { width:300px; flex-shrink:0; background:#0B1120; border-left:0.5px solid rgba(255,255,255,0.07); display:flex; flex-direction:column; overflow-y:auto; margin-right:0; }
        .bp-panel { padding:16px; border-bottom:0.5px solid rgba(255,255,255,0.06); }

        /* Sidebar tabs */
        .bp-tabs { display:flex; gap:0; border-bottom:0.5px solid rgba(255,255,255,0.07); padding:0 16px; }
        .bp-tab { padding:10px 12px; font-size:11px; font-weight:700; color:rgba(255,255,255,0.3); cursor:pointer; border-bottom:2px solid transparent; background:none; border-left:none; border-right:none; border-top:none; font-family:'Plus Jakarta Sans',sans-serif; transition:color 0.15s,border-color 0.15s; }
        .bp-tab.active { color:#00A8FF; border-bottom-color:#00A8FF; }
        .bp-tab:hover:not(.active) { color:rgba(255,255,255,0.55); }

        /* Detail content */
        .bp-detail-name { font-family:'Syne',sans-serif; font-size:15px; font-weight:800; color:#fff; line-height:1.3; margin-bottom:8px; }
        .bp-detail-desc { font-size:12px; color:rgba(255,255,255,0.38); line-height:1.6; margin-bottom:12px; }
        .bp-meta-table { width:100%; border-collapse:collapse; margin-bottom:14px; }
        .bp-meta-table td { padding:4px 0; font-size:12px; vertical-align:top; }
        .bp-meta-table td:first-child { color:rgba(255,255,255,0.35); width:95px; }
        .bp-meta-table td:last-child { color:rgba(255,255,255,0.65); font-weight:600; text-align:right; }
        .bp-status-badge { font-size:10px; font-weight:700; padding:3px 9px; border-radius:10px; text-transform:uppercase; letter-spacing:0.4px; display:inline-block; }
        .bp-section-label { font-size:10px; font-weight:700; color:rgba(255,255,255,0.25); letter-spacing:0.6px; text-transform:uppercase; margin-bottom:7px; }
        .bp-move-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:12px; }
        .bp-move-btn { background:rgba(255,255,255,0.04); border:0.5px solid rgba(255,255,255,0.08); border-radius:6px; padding:7px 4px; font-size:10px; font-weight:700; color:rgba(255,255,255,0.4); font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; text-align:center; transition:all 0.15s; }
        .bp-move-btn:hover { background:rgba(0,160,255,0.1); border-color:rgba(0,160,255,0.3); color:#00A8FF; }

        /* Edit form */
        .bp-input { width:100%; background:rgba(255,255,255,0.04); border:0.5px solid rgba(255,255,255,0.1); border-radius:7px; padding:8px 10px; font-size:12px; font-family:'Plus Jakarta Sans',sans-serif; color:#fff; outline:none; box-sizing:border-box; transition:border-color 0.15s; margin-bottom:8px; }
        .bp-input:focus { border-color:rgba(0,160,255,0.5); }
        .bp-input::placeholder { color:rgba(255,255,255,0.2); }
        .bp-select { width:100%; background:#0D1628; border:0.5px solid rgba(255,255,255,0.1); border-radius:7px; padding:8px 10px; font-size:12px; font-family:'Plus Jakarta Sans',sans-serif; color:#fff; outline:none; box-sizing:border-box; margin-bottom:8px; cursor:pointer; }
        .bp-checkbox-row { display:flex; align-items:center; gap:8px; margin-bottom:10px; font-size:12px; color:rgba(255,255,255,0.5); cursor:pointer; }
        .bp-save-btn { width:100%; background:rgba(0,120,255,0.15); border:0.5px solid rgba(0,160,255,0.3); border-radius:7px; padding:8px; font-size:12px; font-weight:700; color:#00A8FF; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; transition:background 0.15s; margin-bottom:8px; }
        .bp-save-btn:hover { background:rgba(0,120,255,0.25); }
        .bp-delete-btn { width:100%; background:rgba(255,60,60,0.07); border:0.5px solid rgba(255,60,60,0.2); border-radius:7px; padding:8px; font-size:12px; font-weight:700; color:#FF6B6B; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; transition:background 0.15s; display:flex; align-items:center; justify-content:center; gap:6px; }
        .bp-delete-btn:hover { background:rgba(255,60,60,0.14); }

        /* Dependencies */
        .bp-dep-item { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:6px 0; border-bottom:0.5px solid rgba(255,255,255,0.05); }
        .bp-dep-name { font-size:11px; color:rgba(255,255,255,0.5); }
        .bp-dep-del { background:none; border:none; color:rgba(255,100,100,0.5); cursor:pointer; font-size:13px; padding:0; transition:color 0.15s; }
        .bp-dep-del:hover { color:#FF6B6B; }

        /* Comments */
        .bp-comment { margin-bottom:10px; }
        .bp-comment-author { font-size:11px; font-weight:700; color:rgba(255,255,255,0.65); margin-bottom:2px; }
        .bp-comment-body { font-size:11px; color:rgba(255,255,255,0.38); line-height:1.55; }
        .bp-comment-textarea { width:100%; background:rgba(255,255,255,0.04); border:0.5px solid rgba(255,255,255,0.1); border-radius:7px; padding:8px 10px; font-size:12px; font-family:'Plus Jakarta Sans',sans-serif; color:#fff; outline:none; resize:none; margin-bottom:7px; transition:border-color 0.15s; box-sizing:border-box; }
        .bp-comment-textarea:focus { border-color:rgba(0,160,255,0.45); }
        .bp-comment-textarea::placeholder { color:rgba(255,255,255,0.2); }
        .bp-send-btn { width:100%; background:rgba(0,120,255,0.12); border:0.5px solid rgba(0,160,255,0.25); border-radius:7px; padding:8px; font-size:12px; font-weight:700; color:#00A8FF; font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer; transition:background 0.15s; }
        .bp-send-btn:hover:not(:disabled) { background:rgba(0,120,255,0.22); }
        .bp-send-btn:disabled { opacity:0.35; cursor:not-allowed; }

        /* Audit log */
        .bp-log-item { display:flex; align-items:flex-start; gap:8px; margin-bottom:10px; }
        .bp-log-dot { width:6px; height:6px; border-radius:50%; background:#0078FF; margin-top:4px; flex-shrink:0; }
        .bp-log-text { font-size:11px; color:rgba(255,255,255,0.38); line-height:1.55; }
        .bp-log-field { color:rgba(255,255,255,0.6); font-weight:700; }

        /* Attachments */
        .bp-attach-link { display:flex; align-items:center; gap:7px; padding:7px 0; border-bottom:0.5px solid rgba(255,255,255,0.05); font-size:11px; color:#0096FF; text-decoration:none; }
        .bp-attach-link:hover { color:#00C8FF; }

        /* Dep form */
        .bp-dep-panel { background:#0D1628; border:0.5px solid rgba(255,255,255,0.07); border-radius:10px; padding:14px; margin:0 24px 16px; }

        /* Error */
        .bp-error { display:flex; align-items:center; gap:8px; background:rgba(220,50,50,0.08); border:0.5px solid rgba(220,50,50,0.22); border-radius:8px; padding:10px 14px; font-size:12px; color:#FF6B6B; margin:0 24px 8px; }

        /* Empty state */
        .bp-empty-sidebar { text-align:center; padding:24px 16px; color:rgba(255,255,255,0.2); font-size:12px; }

        @media (max-width:900px) { .bp-sidebar { display:none; } }

        /* ══════════════════════════════════════
           CREATE TASK MODAL
        ══════════════════════════════════════ */
        .modal-overlay {
          position:fixed; inset:0; z-index:100;
          background:rgba(5,8,18,0.82);
          backdrop-filter:blur(6px);
          display:flex; align-items:center; justify-content:center;
          padding:16px;
          animation:modal-fade-in 0.18s ease;
        }
        @keyframes modal-fade-in { from{opacity:0} to{opacity:1} }

        .modal-box {
          background:#0D1628;
          border:0.5px solid rgba(0,160,255,0.2);
          border-radius:14px;
          width:100%; max-width:460px;
          box-shadow:0 24px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(0,120,255,0.12);
          animation:modal-slide-up 0.2s ease;
          overflow:hidden;
        }
        @keyframes modal-slide-up { from{transform:translateY(18px);opacity:0} to{transform:translateY(0);opacity:1} }

        .modal-topbar {
          height:3px;
          background:linear-gradient(90deg,#0078FF,#00C8FF,#7A8FFF);
        }
        .modal-header {
          display:flex; align-items:flex-start; justify-content:space-between;
          padding:20px 22px 0; gap:12px;
        }
        .modal-eyebrow {
          font-size:10px; font-weight:700;
          color:rgba(0,168,255,0.7);
          letter-spacing:0.8px; text-transform:uppercase;
          margin-bottom:5px;
        }
        .modal-title {
          font-family:'Syne',sans-serif;
          font-size:18px; font-weight:800; color:#fff; line-height:1.2;
        }
        .modal-close {
          background:rgba(255,255,255,0.05);
          border:0.5px solid rgba(255,255,255,0.1);
          border-radius:7px;
          width:30px; height:30px;
          display:flex; align-items:center; justify-content:center;
          color:rgba(255,255,255,0.4);
          cursor:pointer; font-size:18px; line-height:1;
          transition:background 0.15s,color 0.15s; flex-shrink:0;
        }
        .modal-close:hover { background:rgba(255,255,255,0.1); color:#fff; }

        .modal-body { padding:18px 22px 22px; display:flex; flex-direction:column; gap:12px; }

        .modal-field { display:flex; flex-direction:column; gap:6px; }
        .modal-label {
          font-size:11px; font-weight:700;
          color:rgba(255,255,255,0.35);
          letter-spacing:0.5px; text-transform:uppercase;
          display:flex; align-items:center; gap:5px;
        }
        .modal-required { color:#FF6B6B; }
        .modal-input {
          background:rgba(255,255,255,0.04);
          border:0.5px solid rgba(255,255,255,0.1);
          border-radius:8px; padding:10px 13px;
          font-size:13px; font-family:'Plus Jakarta Sans',sans-serif;
          color:#fff; outline:none;
          transition:border-color 0.15s,background 0.15s;
          width:100%; box-sizing:border-box; margin:0;
        }
        .modal-input:focus { border-color:rgba(0,160,255,0.5); background:rgba(0,160,255,0.04); }
        .modal-input::placeholder { color:rgba(255,255,255,0.2); }
        .modal-textarea { resize:vertical; min-height:72px; line-height:1.6; }
        .modal-select {
          background:#0A0F1E;
          border:0.5px solid rgba(255,255,255,0.1);
          border-radius:8px; padding:10px 13px;
          font-size:13px; font-family:'Plus Jakarta Sans',sans-serif;
          color:#fff; outline:none; width:100%; box-sizing:border-box; cursor:pointer;
          transition:border-color 0.15s;
        }
        .modal-select:focus { border-color:rgba(0,160,255,0.5); }
        .modal-checkbox-row {
          display:flex; align-items:center; gap:9px;
          font-size:13px; color:rgba(255,255,255,0.45); cursor:pointer;
          padding:2px 0;
        }
        .modal-error {
          display:flex; align-items:center; gap:8px;
          background:rgba(220,50,50,0.08); border:0.5px solid rgba(220,50,50,0.22);
          border-radius:8px; padding:10px 13px; font-size:12px; color:#FF6B6B;
        }
        .modal-success {
          display:flex; align-items:center; gap:8px;
          background:rgba(0,200,100,0.08); border:0.5px solid rgba(0,200,100,0.22);
          border-radius:8px; padding:10px 13px; font-size:12px; color:#00D97A;
        }
        .modal-divider { height:0.5px; background:rgba(255,255,255,0.07); margin:2px 0; }
        .modal-footer { display:flex; gap:8px; }
        .modal-cancel {
          flex:1; background:rgba(255,255,255,0.04);
          border:0.5px solid rgba(255,255,255,0.1); border-radius:8px; padding:11px;
          font-size:13px; font-weight:600; color:rgba(255,255,255,0.4);
          font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer;
          transition:background 0.15s,color 0.15s;
        }
        .modal-cancel:hover:not(:disabled){ background:rgba(255,255,255,0.08); color:#fff; }
        .modal-cancel:disabled { opacity:0.4; cursor:not-allowed; }
        .modal-submit {
          flex:2; background:linear-gradient(135deg,#0078FF,#00C8FF);
          border:none; border-radius:8px; padding:11px 18px;
          font-size:13px; font-weight:700; color:#fff;
          font-family:'Plus Jakarta Sans',sans-serif; cursor:pointer;
          display:flex; align-items:center; justify-content:center; gap:8px;
          position:relative; overflow:hidden; transition:opacity 0.15s;
        }
        .modal-submit:hover:not(:disabled){ opacity:0.9; }
        .modal-submit:disabled { opacity:0.5; cursor:not-allowed; }
        @keyframes modal-spin{to{transform:rotate(360deg)}}
        .modal-spinner {
          width:14px; height:14px;
          border:2px solid rgba(255,255,255,0.3); border-top-color:#fff;
          border-radius:50%; animation:modal-spin 0.7s linear infinite; flex-shrink:0;
        }
        /* 2-col grid inside modal */
        .modal-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        @media(max-width:480px){ .modal-grid-2 { grid-template-columns:1fr; } }
      `}</style>

      <div className='bp-page'>

        {/* ══ CREATE TASK MODAL ══ */}
        {showTaskModal && (
          <div
            className='modal-overlay'
            onClick={(e) => { if (e.target === e.currentTarget) closeTaskModal(); }}
          >
            <div className='modal-box' role='dialog' aria-modal='true' aria-labelledby='task-modal-title'>
              <div className='modal-topbar' />
              <div className='modal-header'>
                <div>
                  <div className='modal-eyebrow'>Board · {board.project.name}</div>
                  <div className='modal-title' id='task-modal-title'>Buat Task Baru</div>
                </div>
                <button className='modal-close' onClick={closeTaskModal} disabled={taskCreateLoading} aria-label='Tutup'>×</button>
              </div>

              <div className='modal-body'>
                {taskCreateError && (
                  <div className='modal-error'>
                    <svg width='14' height='14' viewBox='0 0 14 14' fill='none' aria-hidden='true'>
                      <circle cx='7' cy='7' r='6' stroke='#FF6B6B' strokeWidth='1.3'/>
                      <path d='M7 4.5V7.5M7 9.5v.3' stroke='#FF6B6B' strokeWidth='1.3' strokeLinecap='round'/>
                    </svg>
                    {taskCreateError}
                  </div>
                )}
                {taskCreateSuccess && (
                  <div className='modal-success'>
                    <svg width='14' height='14' viewBox='0 0 14 14' fill='none' aria-hidden='true'>
                      <circle cx='7' cy='7' r='6' stroke='#00D97A' strokeWidth='1.3'/>
                      <path d='M4.5 7l2 2 3-3.5' stroke='#00D97A' strokeWidth='1.3' strokeLinecap='round' strokeLinejoin='round'/>
                    </svg>
                    Task berhasil dibuat!
                  </div>
                )}

                <form id='create-task-form' onSubmit={handleCreateTask} style={{ display:'contents' }}>
                  {/* Title */}
                  <div className='modal-field'>
                    <label className='modal-label' htmlFor='task-title'>
                      Judul Task <span className='modal-required'>*</span>
                    </label>
                    <input
                      id='task-title'
                      className='modal-input'
                      placeholder='Contoh: Desain halaman login'
                      value={taskForm.title}
                      onChange={(e) => setTaskForm((s) => ({ ...s, title: e.target.value }))}
                      required
                      disabled={taskCreateLoading || taskCreateSuccess}
                      autoFocus
                    />
                  </div>

                  {/* Description */}
                  <div className='modal-field'>
                    <label className='modal-label' htmlFor='task-desc'>Deskripsi</label>
                    <textarea
                      id='task-desc'
                      className='modal-input modal-textarea'
                      placeholder='Jelaskan detail task ini... (opsional)'
                      value={taskForm.description}
                      onChange={(e) => setTaskForm((s) => ({ ...s, description: e.target.value }))}
                      disabled={taskCreateLoading || taskCreateSuccess}
                    />
                  </div>

                  {/* Assignee + Client visible */}
                  <div className='modal-grid-2'>
                    <div className='modal-field'>
                      <label className='modal-label' htmlFor='task-assignee'>Assignee</label>
                      <select
                        id='task-assignee'
                        className='modal-select'
                        value={taskForm.assigneeId}
                        onChange={(e) => setTaskForm((s) => ({ ...s, assigneeId: e.target.value }))}
                        disabled={taskCreateLoading || taskCreateSuccess}
                      >
                        <option value=''>Pilih assignee</option>
                        {assigneeOptions.map((o) => (
                          <option key={o.id} value={o.id}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className='modal-field' style={{ justifyContent:'flex-end' }}>
                      <label className='modal-label'>Visibilitas</label>
                      <label className='modal-checkbox-row'>
                        <input
                          type='checkbox'
                          checked={taskForm.clientVisible}
                          onChange={(e) => setTaskForm((s) => ({ ...s, clientVisible: e.target.checked }))}
                          disabled={taskCreateLoading || taskCreateSuccess}
                        />
                        Tampilkan ke client
                      </label>
                    </div>
                  </div>
                </form>

                <div className='modal-divider' />

                <div className='modal-footer'>
                  <button type='button' className='modal-cancel' onClick={closeTaskModal} disabled={taskCreateLoading}>
                    Batal
                  </button>
                  <button
                    type='submit'
                    form='create-task-form'
                    className='modal-submit'
                    disabled={taskCreateLoading || taskCreateSuccess || !taskForm.title.trim()}
                  >
                    {taskCreateLoading ? (
                      <><div className='modal-spinner' />Menyimpan...</>
                    ) : taskCreateSuccess ? (
                      <>
                        <svg width='14' height='14' viewBox='0 0 14 14' fill='none' aria-hidden='true'>
                          <path d='M3 7l3 3 5-5.5' stroke='white' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'/>
                        </svg>
                        Tersimpan!
                      </>
                    ) : (
                      <>
                        <svg width='14' height='14' viewBox='0 0 14 14' fill='none' aria-hidden='true'>
                          <path d='M7 2v10M2 7h10' stroke='white' strokeWidth='2' strokeLinecap='round'/>
                        </svg>
                        Buat Task
                      </>
                    )}
                    {!taskCreateLoading && !taskCreateSuccess && <div className='bp-shine' />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Navbar ── */}
        <nav className='bp-nav'>
          <div className='bp-nav-left'>
            <div className='bp-logo'>
              <div className='bp-logo-icon'>
                <svg width='14' height='14' viewBox='0 0 14 14' fill='none'>
                  <path d='M2.5 7l3 3L11.5 3' stroke='white' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'/>
                </svg>
              </div>
              <span className='bp-logo-text'>Nodewave</span>
            </div>
            <div className='bp-nav-sep' />
            <div className='bp-breadcrumb'>
              <button className='bp-breadcrumb-link' onClick={() => router.push('/dashboard')}>Dashboard</button>
              <span className='bp-breadcrumb-sep'>/</span>
              <span className='bp-breadcrumb-current'>{board.project.name}</span>
            </div>
          </div>
          <div className='bp-nav-right'>
            <button className='bp-btn-ghost' onClick={() => router.back()}>← Kembali</button>
            <button className='bp-btn-ghost' onClick={() => router.push('/dashboard')}>Dashboard</button>
            <button className='bp-btn-ghost' onClick={logout}>Logout</button>
            <div className='bp-avatar'>PM</div>
          </div>
        </nav>

        {/* ── Project Header ── */}
        <div className='bp-header'>
          <div>
            <div className='bp-project-name'>{board.project.name}</div>
            {board.project.description && (
              <div className='bp-project-desc'>{board.project.description}</div>
            )}
          </div>
          <div className='bp-header-actions'>
            {isPm && (
              <button className='bp-btn-primary' onClick={openTaskModal}>
                <div className='bp-shine' />
                <svg width='13' height='13' viewBox='0 0 13 13' fill='none' aria-hidden='true'>
                  <path d='M6.5 1v11M1 6.5h11' stroke='white' strokeWidth='2' strokeLinecap='round'/>
                </svg>
                Task Baru
              </button>
            )}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className='bp-error' role='alert'>
            <svg width='14' height='14' viewBox='0 0 14 14' fill='none' aria-hidden='true'>
              <circle cx='7' cy='7' r='6' stroke='#FF6B6B' strokeWidth='1.3'/>
              <path d='M7 4.5V7.5M7 9.5v.3' stroke='#FF6B6B' strokeWidth='1.3' strokeLinecap='round'/>
            </svg>
            {error}
          </div>
        )}

        {/* ── Dependency Form (PM only) ── */}
        {isPm && allTasks.length > 1 && (
          <div className='bp-dep-panel'>
            <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.6px', textTransform:'uppercase', marginBottom:10 }}>
              Tambah Dependency
            </div>
            <form
              onSubmit={handleAddDependency}
              style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:8, alignItems:'center' }}
            >
              <select
                className='bp-select'
                style={{ marginBottom:0 }}
                value={dependencyForm.taskId}
                onChange={(e) => setDependencyForm((s) => ({ ...s, taskId: e.target.value }))}
              >
                <option value=''>Pilih task</option>
                {allTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <select
                className='bp-select'
                style={{ marginBottom:0 }}
                value={dependencyForm.dependsOnId}
                onChange={(e) => setDependencyForm((s) => ({ ...s, dependsOnId: e.target.value }))}
              >
                <option value=''>Bergantung pada</option>
                {allTasks.filter((t) => t.id !== dependencyForm.taskId).map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <button
                type='submit'
                className='bp-save-btn'
                style={{ marginBottom:0, whiteSpace:'nowrap' }}
                disabled={loading || !dependencyForm.taskId || !dependencyForm.dependsOnId}
              >
                Tambah
              </button>
            </form>
          </div>
        )}

        {/* ── Body: Board + Sidebar ── */}
        <div className='bp-body'>
          {/* Board columns */}
          <div className='bp-board-area'>
            <div className='bp-board'>
              {statuses.map((status) => {
                const meta = STATUS_META[status];
                return (
                  <div
                    key={status}
                    className='bp-col'
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(status)}
                  >
                    <div className='bp-col-header'>
                      <span className='bp-col-label' style={{ color: meta.color }}>{meta.label}</span>
                      <span className='bp-col-count'>{board.columns[status].length}</span>
                    </div>

                    {board.columns[status].map((task) => {
                      const initials = task.assignee
                        ? `${task.assignee.firstName?.[0] || ''}${task.assignee.lastName?.[0] || ''}`
                        : null;
                      return (
                        <div
                          key={task.id}
                          className={`bp-task${selectedTask?.id === task.id ? ' bp-selected' : ''}`}
                          style={{ '--accent': meta.color } as any}
                          draggable
                          onDragStart={() => setDragTaskId(task.id)}
                          onClick={() => { refreshTask(task.id); setActiveTab('detail'); }}
                        >
                          <style>{`.bp-task[style*="--accent:${meta.color}"]::before{background:${meta.color}}`}</style>
                          <div className='bp-task-title'>{task.title}</div>
                          {task.description && (
                            <div className='bp-task-desc'>
                              {task.description.length > 70 ? task.description.slice(0, 70) + '…' : task.description}
                            </div>
                          )}
                          <div className='bp-task-footer'>
                            <span className={`bp-task-badge ${task.blockedByDependencies ? 'badge-blocked' : 'badge-ready'}`}>
                              {task.blockedByDependencies ? 'Blocked' : 'Ready'}
                            </span>
                            {initials && <div className='bp-task-avatar'>{initials}</div>}
                          </div>
                        </div>
                      );
                    })}

                    {isPm && (
                      <button className='bp-add-task-btn' onClick={openTaskModal}>
                        + Tambah task
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Sidebar ── */}
          <aside className='bp-sidebar'>
            <div className='bp-tabs'>
              {(['detail', 'comments', 'audit'] as const).map((tab) => (
                <button
                  key={tab}
                  className={`bp-tab${activeTab === tab ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'detail' ? 'Detail' : tab === 'comments' ? 'Komentar' : 'Audit Log'}
                </button>
              ))}
            </div>

            {/* Detail Tab */}
            {activeTab === 'detail' && (
              <div className='bp-panel'>
                {!selectedTask ? (
                  <div className='bp-empty-sidebar'>Pilih task di board untuk melihat detail</div>
                ) : (
                  <>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:10 }}>
                      <div className='bp-detail-name'>{selectedTask.title}</div>
                      <span
                        className='bp-status-badge'
                        style={{
                          background: STATUS_META[selectedTask.status].badgeBg,
                          color: STATUS_META[selectedTask.status].color,
                          border: `0.5px solid ${STATUS_META[selectedTask.status].badgeBorder}`,
                          flexShrink: 0,
                        }}
                      >
                        {STATUS_META[selectedTask.status].label}
                      </span>
                    </div>
                    {selectedTask.description && (
                      <div className='bp-detail-desc'>{selectedTask.description}</div>
                    )}
                    <table className='bp-meta-table'>
                      <tbody>
                        <tr>
                          <td>Assignee</td>
                          <td>{selectedTask.assignee ? `${selectedTask.assignee.firstName || ''} ${selectedTask.assignee.lastName || ''}`.trim() : '—'}</td>
                        </tr>
                        <tr><td>Version</td><td>v{selectedTask.version}</td></tr>
                        <tr><td>Client visible</td><td>{selectedTask.clientVisible ? 'Ya' : 'Tidak'}</td></tr>
                      </tbody>
                    </table>

                    {isPm && (
                      <form onSubmit={handleEditTask} style={{ marginBottom:14 }}>
                        <div className='bp-section-label' style={{ marginBottom:8 }}>Edit Task</div>
                        <input className='bp-input' value={editForm.title} onChange={(e) => setEditForm((s) => ({ ...s, title: e.target.value }))} />
                        <textarea className='bp-input' rows={2} style={{ resize:'none' }} value={editForm.description} onChange={(e) => setEditForm((s) => ({ ...s, description: e.target.value }))} />
                        <select className='bp-select' value={editForm.assigneeId} onChange={(e) => setEditForm((s) => ({ ...s, assigneeId: e.target.value }))}>
                          <option value=''>Unassigned</option>
                          {assigneeOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                        <label className='bp-checkbox-row'>
                          <input type='checkbox' checked={editForm.clientVisible} onChange={(e) => setEditForm((s) => ({ ...s, clientVisible: e.target.checked }))} />
                          Client visible
                        </label>
                        <button type='submit' className='bp-save-btn' disabled={loading}>
                          {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                      </form>
                    )}

                    <div className='bp-section-label'>Pindah ke</div>
                    <div className='bp-move-grid'>
                      {statuses.filter((s) => s !== selectedTask.status).map((s) => (
                        <button key={s} className='bp-move-btn' onClick={() => updateTaskStatus(selectedTask, s)} type='button'>
                          {STATUS_META[s].label}
                        </button>
                      ))}
                    </div>

                    {(selectedTask.dependencies?.length ?? 0) > 0 && (
                      <div style={{ marginBottom:14 }}>
                        <div className='bp-section-label'>Dependencies</div>
                        {selectedTask.dependencies!.map((dep) => (
                          <div key={dep.id} className='bp-dep-item'>
                            <span className='bp-dep-name'>{dep.dependsOn?.title || dep.dependsOnId}</span>
                            {isPm && (
                              <button className='bp-dep-del' onClick={() => handleDeleteDependency(selectedTask.id, dep.dependsOnId)} type='button'>×</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {taskDetails.attachments.length > 0 && (
                      <div style={{ marginBottom:14 }}>
                        <div className='bp-section-label'>Lampiran</div>
                        {taskDetails.attachments.map((item: any) => (
                          <a key={item.id} href={item.url} target='_blank' rel='noreferrer' className='bp-attach-link'>📎 {item.filename}</a>
                        ))}
                      </div>
                    )}

                    {selectedTask && (
                      <form onSubmit={handleAttachmentUpload} style={{ marginBottom:14 }}>
                        <div className='bp-section-label'>Upload Lampiran</div>
                        <input type='file' className='bp-input' onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} style={{ padding:'6px 10px' }} />
                        <button type='submit' className='bp-save-btn' disabled={!attachmentFile} style={{ marginTop:4 }}>Upload</button>
                      </form>
                    )}

                    {isPm && (
                      <button className='bp-delete-btn' onClick={handleDeleteTask} type='button' disabled={loading}>
                        🗑 Hapus Task
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className='bp-panel'>
                {!selectedTask ? (
                  <div className='bp-empty-sidebar'>Pilih task untuk melihat komentar</div>
                ) : (
                  <>
                    <div style={{ marginBottom:14 }}>
                      {taskDetails.comments.length ? (
                        taskDetails.comments.map((c: any) => (
                          <div key={c.id} className='bp-comment'>
                            <div className='bp-comment-author'>{c.author?.firstName || 'Anonim'}</div>
                            <div className='bp-comment-body'>{c.content}</div>
                          </div>
                        ))
                      ) : (
                        <div className='bp-empty-sidebar' style={{ padding:'12px 0' }}>Belum ada komentar</div>
                      )}
                    </div>
                    <form onSubmit={handleAddComment}>
                      <textarea className='bp-comment-textarea' rows={3} placeholder='Tulis komentar...' value={commentForm} onChange={(e) => setCommentForm(e.target.value)} />
                      <button className='bp-send-btn' type='submit' disabled={!commentForm.trim()}>Kirim Komentar</button>
                    </form>
                  </>
                )}
              </div>
            )}

            {/* Audit Log Tab */}
            {activeTab === 'audit' && (
              <div className='bp-panel'>
                {!selectedTask ? (
                  <div className='bp-empty-sidebar'>Pilih task untuk melihat audit log</div>
                ) : taskDetails.auditLogs.length ? (
                  taskDetails.auditLogs.map((log: any) => (
                    <div key={log.id} className='bp-log-item'>
                      <div className='bp-log-dot' />
                      <div className='bp-log-text'>
                        <span className='bp-log-field'>{log.column}</span>: {String(log.oldValue)} → {String(log.newValue)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='bp-empty-sidebar'>Belum ada audit log</div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}