# Project Management Frontend

Next.js app untuk consume backend Project Management.

## Run

```bash
bun install
bun run dev
```

## Env

```bash
NEXT_PUBLIC_BE_URL=http://localhost:3000
```

## Alur

- Login simpan JWT ke localStorage
- Dashboard ambil list project dari backend
- Board project ambil data task per kolom
- Task bisa dibuat, diedit, dihapus, dipindah status, tambah/hapus dependency
- Komentar, attachment, dan audit log tampil di panel task

## Endpoint yang dipakai frontend

- `POST /auth/login`
- `GET /users/me`
- `GET /users`
- `GET /projects`
- `GET /projects/:id`
- `GET /projects/:id/board`
- `GET /projects/:projectId/tasks`
- `POST /projects/:projectId/tasks`
- `GET /tasks/:id`
- `PATCH /tasks/:id`
- `PATCH /tasks/:id/status`
- `PATCH /tasks/:id/assignee`
- `POST /tasks/:id/dependencies`
- `DELETE /tasks/:id/dependencies`
- `DELETE /tasks/:id`
- `POST /tasks/:id/comments`
- `GET /tasks/:id/comments`
- `POST /tasks/:id/attachments`
- `GET /tasks/:id/attachments`
- `GET /tasks/:id/audit-logs`

