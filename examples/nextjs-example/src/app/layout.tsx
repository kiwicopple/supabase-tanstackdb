import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Next.js + Supabase Collection Example',
  description: 'A todo app using @supabase/tanstack-db-collection',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 2rem;
            background: #f5f5f5;
          }
          h1 {
            color: #333;
          }
          .todo-form {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
          }
          .todo-form input {
            flex: 1;
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
          }
          .todo-form button {
            padding: 0.5rem 1rem;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          .todo-form button:hover {
            background: #2563eb;
          }
          .todo-list {
            list-style: none;
            padding: 0;
          }
          .todo-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem;
            background: white;
            border-radius: 4px;
            margin-bottom: 0.5rem;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          .todo-item.completed span {
            text-decoration: line-through;
            color: #999;
          }
          .todo-item input[type="checkbox"] {
            width: 1.25rem;
            height: 1.25rem;
          }
          .todo-item span {
            flex: 1;
          }
          .todo-item button {
            padding: 0.25rem 0.5rem;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.875rem;
          }
          .filter-buttons {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
          }
          .filter-buttons button {
            padding: 0.5rem 1rem;
            border: 1px solid #ddd;
            background: white;
            border-radius: 4px;
            cursor: pointer;
          }
          .filter-buttons button.active {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
          }
          .error {
            color: #ef4444;
            padding: 1rem;
            background: #fef2f2;
            border-radius: 4px;
            margin-bottom: 1rem;
          }
          .loading {
            color: #666;
            text-align: center;
            padding: 2rem;
          }
          .search-box {
            margin-bottom: 1rem;
          }
          .search-box input {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
