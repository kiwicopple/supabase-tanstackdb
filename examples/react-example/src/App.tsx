import { useState, useEffect, useCallback } from 'react'
import { supabase, todosCollectionOptions, where, type Todo } from './supabase'
import type { LoadSubsetOptions } from '@supabase/tanstack-db-collection'

type Filter = 'all' | 'active' | 'completed'

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load todos based on filter
  const loadTodos = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Build the load subset options based on filter
      const loadSubsetOptions: LoadSubsetOptions = {}

      if (filter === 'active') {
        loadSubsetOptions.where = where.eq('completed', false)
      } else if (filter === 'completed') {
        loadSubsetOptions.where = where.eq('completed', true)
      }

      const result = await todosCollectionOptions.load({
        meta: { loadSubsetOptions },
      })

      setTodos(result)
    } catch (err) {
      console.error('Failed to load todos:', err)
      setError(err instanceof Error ? err.message : 'Failed to load todos')
    } finally {
      setLoading(false)
    }
  }, [filter])

  // Initial load
  useEffect(() => {
    loadTodos()
  }, [loadTodos])

  // Add a new todo
  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTodo.trim()) return

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const result = await todosCollectionOptions.insert?.({
        title: newTodo.trim(),
        completed: false,
        user_id: user?.id || 'anonymous',
      })

      if (result?.success && result.data) {
        setTodos((prev) => [result.data!, ...prev])
        setNewTodo('')
      } else {
        throw new Error('Failed to add todo')
      }
    } catch (err) {
      console.error('Failed to add todo:', err)
      setError(err instanceof Error ? err.message : 'Failed to add todo')
    }
  }

  // Toggle todo completion
  const toggleTodo = async (id: string, completed: boolean) => {
    try {
      const result = await todosCollectionOptions.update?.(id, { completed: !completed })

      if (result?.success) {
        setTodos((prev) =>
          prev.map((todo) =>
            todo.id === id ? { ...todo, completed: !completed } : todo
          )
        )
      }
    } catch (err) {
      console.error('Failed to toggle todo:', err)
      setError(err instanceof Error ? err.message : 'Failed to update todo')
    }
  }

  // Delete a todo
  const deleteTodo = async (id: string) => {
    try {
      const result = await todosCollectionOptions.delete?.(id)

      if (result?.success) {
        setTodos((prev) => prev.filter((todo) => todo.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete todo:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete todo')
    }
  }

  return (
    <div>
      <h1>Todo App</h1>
      <p>Using @supabase/tanstack-db-collection</p>

      {error && (
        <div className="error">
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: '1rem' }}>
            Dismiss
          </button>
        </div>
      )}

      <form className="todo-form" onSubmit={addTodo}>
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="What needs to be done?"
        />
        <button type="submit">Add</button>
      </form>

      <div className="filter-buttons">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All
        </button>
        <button
          className={filter === 'active' ? 'active' : ''}
          onClick={() => setFilter('active')}
        >
          Active
        </button>
        <button
          className={filter === 'completed' ? 'active' : ''}
          onClick={() => setFilter('completed')}
        >
          Completed
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <ul className="todo-list">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className={`todo-item ${todo.completed ? 'completed' : ''}`}
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id, todo.completed)}
              />
              <span>{todo.title}</span>
              <button onClick={() => deleteTodo(todo.id)}>Delete</button>
            </li>
          ))}
          {todos.length === 0 && (
            <li className="todo-item">
              <span>No todos yet. Add one above!</span>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
