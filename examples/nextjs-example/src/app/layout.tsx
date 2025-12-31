import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Knowledge Base - Multi-table Example',
  description: 'A knowledge base app using @supabase/tanstack-db-collection with multiple tables',
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
            margin: 0;
            padding: 0;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            min-height: 100vh;
          }

          .app {
            display: flex;
            min-height: 100vh;
          }

          /* Category Sidebar */
          .category-sidebar {
            width: 260px;
            background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
            color: white;
            padding: 1.5rem 1rem;
            flex-shrink: 0;
          }

          .sidebar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            padding: 0 0.5rem;
          }

          .sidebar-header h2 {
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #64748b;
          }

          .add-btn {
            width: 28px;
            height: 28px;
            background: #334155;
            border: none;
            border-radius: 6px;
            color: white;
            font-size: 1.25rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s;
          }

          .add-btn:hover {
            background: #475569;
          }

          .add-category-form {
            background: #334155;
            padding: 0.75rem;
            border-radius: 8px;
            margin-bottom: 1rem;
          }

          .add-category-form input[type="text"] {
            width: 100%;
            padding: 0.5rem;
            border: none;
            border-radius: 4px;
            background: #1e293b;
            color: white;
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
          }

          .add-category-form input::placeholder {
            color: #64748b;
          }

          .form-row {
            display: flex;
            gap: 0.5rem;
          }

          .icon-input {
            width: 50px !important;
            text-align: center;
          }

          .add-category-form input[type="color"] {
            width: 36px;
            height: 32px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            padding: 0;
          }

          .add-category-form button {
            flex: 1;
            padding: 0.5rem;
            background: #3b82f6;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-size: 0.9rem;
          }

          .category-sidebar ul {
            list-style: none;
          }

          .category-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 0.25rem;
            transition: background 0.15s;
          }

          .category-item:hover {
            background: rgba(255, 255, 255, 0.08);
          }

          .category-item.selected {
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          }

          .category-icon {
            font-size: 1.25rem;
          }

          .category-name {
            flex: 1;
            font-size: 0.95rem;
          }

          .category-count {
            font-size: 0.8rem;
            color: #64748b;
            background: rgba(255, 255, 255, 0.1);
            padding: 0.125rem 0.5rem;
            border-radius: 10px;
          }

          /* Main Content */
          .main-content {
            flex: 1;
            padding: 2rem;
            overflow-y: auto;
          }

          .content-header {
            margin-bottom: 2rem;
          }

          .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
          }

          .header-top h1 {
            font-size: 1.75rem;
            color: #1e293b;
          }

          .new-article-btn {
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            transition: transform 0.15s, box-shadow 0.15s;
          }

          .new-article-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          }

          .search-bar {
            display: flex;
            gap: 1rem;
            align-items: center;
            margin-bottom: 1rem;
          }

          .search-bar input[type="text"] {
            flex: 1;
            padding: 0.75rem 1rem;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 0.95rem;
            background: white;
          }

          .search-bar input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }

          .published-filter {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.9rem;
            color: #64748b;
            white-space: nowrap;
          }

          .published-filter input {
            width: 1rem;
            height: 1rem;
          }

          /* Tag Filter */
          .tag-filter {
            background: white;
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }

          .tag-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
            font-size: 0.9rem;
            color: #64748b;
          }

          .add-tag-btn {
            background: none;
            border: 1px dashed #cbd5e1;
            color: #64748b;
            padding: 0.25rem 0.75rem;
            border-radius: 6px;
            font-size: 0.8rem;
            cursor: pointer;
          }

          .add-tag-btn:hover {
            border-color: #3b82f6;
            color: #3b82f6;
          }

          .add-tag-form {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 0.75rem;
          }

          .add-tag-form input[type="text"] {
            flex: 1;
            padding: 0.5rem;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 0.875rem;
          }

          .add-tag-form input[type="color"] {
            width: 32px;
            height: 32px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            padding: 0;
          }

          .add-tag-form button {
            padding: 0.5rem 1rem;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          }

          .tag-list {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .tag {
            padding: 0.375rem 0.75rem;
            border-radius: 20px;
            font-size: 0.8rem;
            border: 2px solid var(--tag-color, #8b5cf6);
            background: white;
            color: var(--tag-color, #8b5cf6);
            cursor: pointer;
            transition: all 0.15s;
          }

          .tag:hover {
            background: var(--tag-color, #8b5cf6);
            color: white;
          }

          .tag.selected {
            background: var(--tag-color, #8b5cf6);
            color: white;
          }

          .no-tags {
            color: #94a3b8;
            font-size: 0.875rem;
          }

          /* Articles Grid */
          .articles-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1.5rem;
          }

          .article-card {
            background: white;
            border-radius: 12px;
            padding: 1.25rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
            border: 1px solid #e2e8f0;
            transition: transform 0.15s, box-shadow 0.15s;
          }

          .article-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          }

          .article-card.featured {
            border-color: #fbbf24;
            background: linear-gradient(to bottom, #fffbeb, white);
          }

          .article-card.draft {
            opacity: 0.75;
          }

          .article-header {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 0.75rem;
            flex-wrap: wrap;
          }

          .featured-badge {
            background: #fef3c7;
            color: #92400e;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
          }

          .draft-badge {
            background: #f1f5f9;
            color: #64748b;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
          }

          .article-category {
            font-size: 0.8rem;
            font-weight: 600;
          }

          .article-title {
            font-size: 1.1rem;
            color: #1e293b;
            margin-bottom: 0.5rem;
            cursor: pointer;
          }

          .article-title:hover {
            color: #3b82f6;
          }

          .article-excerpt {
            color: #64748b;
            font-size: 0.9rem;
            line-height: 1.5;
            margin-bottom: 0.75rem;
          }

          .article-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.375rem;
            margin-bottom: 0.75rem;
          }

          .article-tag {
            padding: 0.125rem 0.5rem;
            border-radius: 4px;
            font-size: 0.7rem;
            color: white;
            font-weight: 500;
          }

          .article-meta {
            display: flex;
            justify-content: space-between;
            font-size: 0.8rem;
            color: #94a3b8;
            margin-bottom: 0.75rem;
          }

          .article-actions {
            display: flex;
            gap: 0.5rem;
            border-top: 1px solid #f1f5f9;
            padding-top: 0.75rem;
          }

          .action-btn {
            padding: 0.375rem 0.625rem;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.15s;
          }

          .action-btn:hover {
            background: #f1f5f9;
          }

          .action-btn.active {
            background: #3b82f6;
            border-color: #3b82f6;
          }

          .action-btn.delete:hover {
            background: #fee2e2;
            border-color: #fecaca;
          }

          .no-articles {
            grid-column: 1 / -1;
            text-align: center;
            padding: 4rem 2rem;
            color: #64748b;
            background: white;
            border-radius: 12px;
            border: 2px dashed #e2e8f0;
          }

          .loading {
            text-align: center;
            padding: 4rem;
            color: #64748b;
          }

          .error-banner {
            background: #fef2f2;
            color: #dc2626;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .error-banner button {
            background: none;
            border: none;
            color: #dc2626;
            font-size: 1.25rem;
            cursor: pointer;
          }

          /* Modal */
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
            padding: 2rem;
          }

          .modal {
            background: white;
            border-radius: 16px;
            max-width: 600px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
          }

          .article-editor {
            padding: 1.5rem;
          }

          .editor-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
          }

          .editor-header h2 {
            font-size: 1.25rem;
            color: #1e293b;
          }

          .close-btn {
            width: 32px;
            height: 32px;
            background: #f1f5f9;
            border: none;
            border-radius: 8px;
            font-size: 1.25rem;
            cursor: pointer;
            color: #64748b;
          }

          .close-btn:hover {
            background: #e2e8f0;
          }

          .form-group {
            margin-bottom: 1.25rem;
          }

          .form-group label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: #374151;
            margin-bottom: 0.5rem;
          }

          .form-group input[type="text"],
          .form-group textarea,
          .form-group select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 0.95rem;
            font-family: inherit;
          }

          .form-group textarea {
            resize: vertical;
          }

          .form-group.checkbox label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
          }

          .form-group.checkbox input {
            width: 1rem;
            height: 1rem;
          }

          .tag-selector {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .form-actions {
            display: flex;
            gap: 0.75rem;
            justify-content: flex-end;
            padding-top: 1rem;
            border-top: 1px solid #e2e8f0;
          }

          .btn-secondary {
            padding: 0.75rem 1.5rem;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 0.95rem;
            cursor: pointer;
          }

          .btn-secondary:hover {
            background: #f8fafc;
          }

          .btn-primary {
            padding: 0.75rem 1.5rem;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
          }

          .btn-primary:hover {
            background: #2563eb;
          }

          /* Responsive */
          @media (max-width: 768px) {
            .app {
              flex-direction: column;
            }

            .category-sidebar {
              width: 100%;
              padding: 1rem;
            }

            .category-sidebar ul {
              display: flex;
              overflow-x: auto;
              gap: 0.5rem;
              padding-bottom: 0.5rem;
            }

            .category-item {
              flex-shrink: 0;
            }

            .main-content {
              padding: 1rem;
            }

            .articles-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
