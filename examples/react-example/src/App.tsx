import { useState, useEffect, useCallback } from 'react'
import {
  supabase,
  projectsCollectionOptions,
  tasksCollectionOptions,
  commentsCollectionOptions,
  where,
  type Project,
  type Task,
  type Comment,
  type TaskStatus,
  type TaskPriority,
} from './supabase'
import type { LoadSubsetOptions, WhereExpression } from '@supabase/tanstack-db-collection'

// ============================================
// Project List Component
// ============================================
function ProjectList({
  projects,
  selectedProjectId,
  onSelectProject,
  onAddProject,
  onDeleteProject,
}: {
  projects: Project[]
  selectedProjectId: string | null
  onSelectProject: (id: string | null) => void
  onAddProject: (name: string, color: string) => void
  onDeleteProject: (id: string) => void
}) {
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectColor, setNewProjectColor] = useState('#3b82f6')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return
    onAddProject(newProjectName.trim(), newProjectColor)
    setNewProjectName('')
  }

  return (
    <div className="project-list">
      <h2>Projects</h2>

      <form onSubmit={handleSubmit} className="add-form">
        <input
          type="text"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          placeholder="New project name..."
        />
        <input
          type="color"
          value={newProjectColor}
          onChange={(e) => setNewProjectColor(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>

      <ul>
        <li
          className={selectedProjectId === null ? 'selected' : ''}
          onClick={() => onSelectProject(null)}
        >
          <span className="color-dot" style={{ background: '#888' }} />
          All Projects
        </li>
        {projects.map((project) => (
          <li
            key={project.id}
            className={selectedProjectId === project.id ? 'selected' : ''}
            onClick={() => onSelectProject(project.id)}
          >
            <span className="color-dot" style={{ background: project.color }} />
            <span className="project-name">{project.name}</span>
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteProject(project.id)
              }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ============================================
// Task Item Component
// ============================================
function TaskItem({
  task,
  project,
  onUpdateStatus,
  onDelete,
  onSelect,
  isSelected,
}: {
  task: Task
  project?: Project
  onUpdateStatus: (id: string, status: TaskStatus) => void
  onDelete: (id: string) => void
  onSelect: (id: string) => void
  isSelected: boolean
}) {
  const priorityColors: Record<TaskPriority, string> = {
    low: '#22c55e',
    medium: '#eab308',
    high: '#ef4444',
  }

  const statusLabels: Record<TaskStatus, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
  }

  return (
    <li className={`task-item ${isSelected ? 'selected' : ''} status-${task.status}`}>
      <div className="task-header" onClick={() => onSelect(task.id)}>
        <span
          className="priority-indicator"
          style={{ background: priorityColors[task.priority] }}
          title={`Priority: ${task.priority}`}
        />
        <span className="task-title">{task.title}</span>
        {project && (
          <span className="task-project" style={{ color: project.color }}>
            {project.name}
          </span>
        )}
      </div>

      <div className="task-actions">
        <select
          value={task.status}
          onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button onClick={() => onDelete(task.id)}>Delete</button>
      </div>

      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      {task.due_date && (
        <span className="task-due-date">
          Due: {new Date(task.due_date).toLocaleDateString()}
        </span>
      )}
    </li>
  )
}

// ============================================
// Comments Section Component
// ============================================
function CommentsSection({
  taskId,
  comments,
  onAddComment,
  onDeleteComment,
}: {
  taskId: string
  comments: Comment[]
  onAddComment: (taskId: string, content: string) => void
  onDeleteComment: (id: string) => void
}) {
  const [newComment, setNewComment] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    onAddComment(taskId, newComment.trim())
    setNewComment('')
  }

  return (
    <div className="comments-section">
      <h3>Comments ({comments.length})</h3>

      <form onSubmit={handleSubmit} className="add-form">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
        />
        <button type="submit">Post</button>
      </form>

      <ul className="comments-list">
        {comments.map((comment) => (
          <li key={comment.id} className="comment-item">
            <p>{comment.content}</p>
            <div className="comment-meta">
              <span>{new Date(comment.created_at).toLocaleString()}</span>
              <button onClick={() => onDeleteComment(comment.id)}>Delete</button>
            </div>
          </li>
        ))}
        {comments.length === 0 && (
          <li className="no-comments">No comments yet</li>
        )}
      </ul>
    </div>
  )
}

// ============================================
// Main App Component
// ============================================
export default function App() {
  // State
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [comments, setComments] = useState<Comment[]>([])

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium')

  const [loading, setLoading] = useState({ projects: true, tasks: true, comments: false })
  const [error, setError] = useState<string | null>(null)

  // ============================================
  // Load Projects
  // ============================================
  const loadProjects = useCallback(async () => {
    setLoading((prev) => ({ ...prev, projects: true }))
    try {
      const result = await projectsCollectionOptions.load({
        meta: { loadSubsetOptions: {} },
      })
      setProjects(result)
    } catch (err) {
      console.error('Failed to load projects:', err)
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading((prev) => ({ ...prev, projects: false }))
    }
  }, [])

  // ============================================
  // Load Tasks (with filters)
  // ============================================
  const loadTasks = useCallback(async () => {
    setLoading((prev) => ({ ...prev, tasks: true }))
    try {
      const loadSubsetOptions: LoadSubsetOptions = {}
      const conditions: WhereExpression[] = []

      // Filter by project
      if (selectedProjectId) {
        conditions.push(where.eq('project_id', selectedProjectId))
      }

      // Filter by status
      if (statusFilter !== 'all') {
        conditions.push(where.eq('status', statusFilter))
      }

      // Filter by priority
      if (priorityFilter !== 'all') {
        conditions.push(where.eq('priority', priorityFilter))
      }

      // Search by title
      if (searchQuery.trim()) {
        conditions.push(where.ilike('title', `%${searchQuery.trim()}%`))
      }

      // Combine conditions
      if (conditions.length === 1) {
        loadSubsetOptions.where = conditions[0]
      } else if (conditions.length > 1) {
        loadSubsetOptions.where = where.and(...conditions)
      }

      const result = await tasksCollectionOptions.load({
        meta: { loadSubsetOptions },
      })
      setTasks(result)
    } catch (err) {
      console.error('Failed to load tasks:', err)
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading((prev) => ({ ...prev, tasks: false }))
    }
  }, [selectedProjectId, statusFilter, priorityFilter, searchQuery])

  // ============================================
  // Load Comments for Selected Task
  // ============================================
  const loadComments = useCallback(async () => {
    if (!selectedTaskId) {
      setComments([])
      return
    }

    setLoading((prev) => ({ ...prev, comments: true }))
    try {
      const result = await commentsCollectionOptions.load({
        meta: {
          loadSubsetOptions: {
            where: where.eq('task_id', selectedTaskId),
          },
        },
      })
      setComments(result)
    } catch (err) {
      console.error('Failed to load comments:', err)
      setError(err instanceof Error ? err.message : 'Failed to load comments')
    } finally {
      setLoading((prev) => ({ ...prev, comments: false }))
    }
  }, [selectedTaskId])

  // Initial load
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  // ============================================
  // Project CRUD
  // ============================================
  const addProject = async (name: string, color: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const result = await projectsCollectionOptions.insert?.({
        name,
        description: null,
        color,
        user_id: user?.id || 'anonymous',
      })
      if (result?.success && result.data) {
        setProjects((prev) => [result.data!, ...prev])
      }
    } catch (err) {
      console.error('Failed to add project:', err)
      setError(err instanceof Error ? err.message : 'Failed to add project')
    }
  }

  const deleteProject = async (id: string) => {
    try {
      const result = await projectsCollectionOptions.delete?.(id)
      if (result?.success) {
        setProjects((prev) => prev.filter((p) => p.id !== id))
        if (selectedProjectId === id) {
          setSelectedProjectId(null)
        }
      }
    } catch (err) {
      console.error('Failed to delete project:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete project')
    }
  }

  // ============================================
  // Task CRUD
  // ============================================
  const addTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return

    // Require a project to be selected
    if (!selectedProjectId) {
      setError('Please select a project first')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const result = await tasksCollectionOptions.insert?.({
        project_id: selectedProjectId,
        title: newTaskTitle.trim(),
        description: null,
        status: 'todo',
        priority: newTaskPriority,
        due_date: null,
        user_id: user?.id || 'anonymous',
      })
      if (result?.success && result.data) {
        setTasks((prev) => [result.data!, ...prev])
        setNewTaskTitle('')
      }
    } catch (err) {
      console.error('Failed to add task:', err)
      setError(err instanceof Error ? err.message : 'Failed to add task')
    }
  }

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    try {
      const result = await tasksCollectionOptions.update?.(id, { status })
      if (result?.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status } : t))
        )
      }
    } catch (err) {
      console.error('Failed to update task:', err)
      setError(err instanceof Error ? err.message : 'Failed to update task')
    }
  }

  const deleteTask = async (id: string) => {
    try {
      const result = await tasksCollectionOptions.delete?.(id)
      if (result?.success) {
        setTasks((prev) => prev.filter((t) => t.id !== id))
        if (selectedTaskId === id) {
          setSelectedTaskId(null)
        }
      }
    } catch (err) {
      console.error('Failed to delete task:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete task')
    }
  }

  // ============================================
  // Comment CRUD
  // ============================================
  const addComment = async (taskId: string, content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const result = await commentsCollectionOptions.insert?.({
        task_id: taskId,
        content,
        user_id: user?.id || 'anonymous',
      })
      if (result?.success && result.data) {
        setComments((prev) => [...prev, result.data!])
      }
    } catch (err) {
      console.error('Failed to add comment:', err)
      setError(err instanceof Error ? err.message : 'Failed to add comment')
    }
  }

  const deleteComment = async (id: string) => {
    try {
      const result = await commentsCollectionOptions.delete?.(id)
      if (result?.success) {
        setComments((prev) => prev.filter((c) => c.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete comment:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete comment')
    }
  }

  // ============================================
  // Render
  // ============================================
  const selectedTask = tasks.find((t) => t.id === selectedTaskId)
  const projectMap = new Map(projects.map((p) => [p.id, p]))

  return (
    <div className="app">
      <header>
        <h1>Project Manager</h1>
        <p>Multi-table example with @supabase/tanstack-db-collection</p>
      </header>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <div className="main-layout">
        {/* Sidebar: Projects */}
        <aside className="sidebar">
          {loading.projects ? (
            <div className="loading">Loading projects...</div>
          ) : (
            <ProjectList
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              onAddProject={addProject}
              onDeleteProject={deleteProject}
            />
          )}
        </aside>

        {/* Main Content: Tasks */}
        <main className="content">
          <div className="task-filters">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="search-input"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
            >
              <option value="all">All Status</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {selectedProjectId && (
            <form onSubmit={addTask} className="add-task-form">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="New task title..."
              />
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <button type="submit">Add Task</button>
            </form>
          )}

          {!selectedProjectId && (
            <p className="hint">Select a project to add tasks</p>
          )}

          {loading.tasks ? (
            <div className="loading">Loading tasks...</div>
          ) : (
            <ul className="task-list">
              {tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  project={projectMap.get(task.project_id)}
                  onUpdateStatus={updateTaskStatus}
                  onDelete={deleteTask}
                  onSelect={setSelectedTaskId}
                  isSelected={task.id === selectedTaskId}
                />
              ))}
              {tasks.length === 0 && (
                <li className="no-tasks">
                  {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                    ? 'No tasks match your filters'
                    : 'No tasks yet'}
                </li>
              )}
            </ul>
          )}
        </main>

        {/* Right Panel: Comments */}
        {selectedTask && (
          <aside className="detail-panel">
            <div className="task-detail-header">
              <h2>{selectedTask.title}</h2>
              <button onClick={() => setSelectedTaskId(null)}>×</button>
            </div>

            {loading.comments ? (
              <div className="loading">Loading comments...</div>
            ) : (
              <CommentsSection
                taskId={selectedTask.id}
                comments={comments}
                onAddComment={addComment}
                onDeleteComment={deleteComment}
              />
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
