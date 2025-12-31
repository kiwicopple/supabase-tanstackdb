'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  supabase,
  categoriesCollectionOptions,
  articlesCollectionOptions,
  tagsCollectionOptions,
  articleTagsCollectionOptions,
  where,
  type Category,
  type Article,
  type Tag,
  type ArticleTag,
} from '@/lib/supabase'
import type { LoadSubsetOptions, WhereExpression } from '@supabase/tanstack-db-collection'

// ============================================
// Category Sidebar Component
// ============================================
function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onAddCategory,
}: {
  categories: Category[]
  selectedCategoryId: string | null
  onSelectCategory: (id: string | null) => void
  onAddCategory: (name: string, icon: string, color: string) => void
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📁')
  const [newColor, setNewColor] = useState('#3b82f6')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    onAddCategory(newName.trim(), newIcon, newColor)
    setNewName('')
    setIsAdding(false)
  }

  return (
    <nav className="category-sidebar">
      <div className="sidebar-header">
        <h2>Categories</h2>
        <button onClick={() => setIsAdding(!isAdding)} className="add-btn">
          {isAdding ? '×' : '+'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="add-category-form">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name..."
            autoFocus
          />
          <div className="form-row">
            <input
              type="text"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              placeholder="Icon"
              className="icon-input"
            />
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
            />
            <button type="submit">Add</button>
          </div>
        </form>
      )}

      <ul>
        <li
          className={`category-item ${selectedCategoryId === null ? 'selected' : ''}`}
          onClick={() => onSelectCategory(null)}
        >
          <span className="category-icon">📚</span>
          <span className="category-name">All Articles</span>
          <span className="category-count">{categories.reduce((acc, c) => acc, 0)}</span>
        </li>
        {categories.map((category) => (
          <li
            key={category.id}
            className={`category-item ${selectedCategoryId === category.id ? 'selected' : ''}`}
            onClick={() => onSelectCategory(category.id)}
            style={{ '--category-color': category.color } as React.CSSProperties}
          >
            <span className="category-icon">{category.icon}</span>
            <span className="category-name">{category.name}</span>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// ============================================
// Tag Filter Component
// ============================================
function TagFilter({
  tags,
  selectedTagIds,
  onToggleTag,
  onAddTag,
}: {
  tags: Tag[]
  selectedTagIds: Set<string>
  onToggleTag: (id: string) => void
  onAddTag: (name: string, color: string) => void
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#8b5cf6')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    onAddTag(newName.trim(), newColor)
    setNewName('')
    setIsAdding(false)
  }

  return (
    <div className="tag-filter">
      <div className="tag-header">
        <span>Filter by tags:</span>
        <button onClick={() => setIsAdding(!isAdding)} className="add-tag-btn">
          {isAdding ? '×' : '+ Add Tag'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="add-tag-form">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tag name..."
          />
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
          />
          <button type="submit">Add</button>
        </form>
      )}

      <div className="tag-list">
        {tags.map((tag) => (
          <button
            key={tag.id}
            className={`tag ${selectedTagIds.has(tag.id) ? 'selected' : ''}`}
            style={{ '--tag-color': tag.color } as React.CSSProperties}
            onClick={() => onToggleTag(tag.id)}
          >
            {tag.name}
          </button>
        ))}
        {tags.length === 0 && <span className="no-tags">No tags yet</span>}
      </div>
    </div>
  )
}

// ============================================
// Article Card Component
// ============================================
function ArticleCard({
  article,
  category,
  tags,
  onTogglePublished,
  onToggleFeatured,
  onDelete,
  onSelect,
}: {
  article: Article
  category?: Category
  tags: Tag[]
  onTogglePublished: (id: string, published: boolean) => void
  onToggleFeatured: (id: string, featured: boolean) => void
  onDelete: (id: string) => void
  onSelect: (id: string) => void
}) {
  return (
    <article className={`article-card ${article.featured ? 'featured' : ''} ${!article.published ? 'draft' : ''}`}>
      <div className="article-header">
        {article.featured && <span className="featured-badge">⭐ Featured</span>}
        {!article.published && <span className="draft-badge">Draft</span>}
        {category && (
          <span className="article-category\" style={{ color: category.color }}>
            {category.icon} {category.name}
          </span>
        )}
      </div>

      <h3 className="article-title" onClick={() => onSelect(article.id)}>
        {article.title}
      </h3>

      {article.excerpt && <p className="article-excerpt">{article.excerpt}</p>}

      <div className="article-tags">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="article-tag"
            style={{ background: tag.color }}
          >
            {tag.name}
          </span>
        ))}
      </div>

      <div className="article-meta">
        <span className="view-count">👁 {article.view_count} views</span>
        <span className="article-date">
          {new Date(article.created_at).toLocaleDateString()}
        </span>
      </div>

      <div className="article-actions">
        <button
          className={`action-btn ${article.published ? 'active' : ''}`}
          onClick={() => onTogglePublished(article.id, article.published)}
          title={article.published ? 'Unpublish' : 'Publish'}
        >
          {article.published ? '📢' : '📝'}
        </button>
        <button
          className={`action-btn ${article.featured ? 'active' : ''}`}
          onClick={() => onToggleFeatured(article.id, article.featured)}
          title={article.featured ? 'Unfeature' : 'Feature'}
        >
          ⭐
        </button>
        <button
          className="action-btn delete"
          onClick={() => onDelete(article.id)}
          title="Delete"
        >
          🗑
        </button>
      </div>
    </article>
  )
}

// ============================================
// Article Editor Component
// ============================================
function ArticleEditor({
  categories,
  tags,
  onSave,
  onCancel,
}: {
  categories: Category[]
  tags: Tag[]
  onSave: (article: Partial<Article>, tagIds: string[]) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [published, setPublished] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !categoryId) return

    onSave(
      {
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt.trim() || null,
        category_id: categoryId,
        published,
        featured: false,
        view_count: 0,
      },
      Array.from(selectedTags)
    )
  }

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }

  return (
    <div className="article-editor">
      <div className="editor-header">
        <h2>New Article</h2>
        <button onClick={onCancel} className="close-btn">×</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article title..."
            required
          />
        </div>

        <div className="form-group">
          <label>Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            <option value="">Select a category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Excerpt</label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="Brief description..."
            rows={2}
          />
        </div>

        <div className="form-group">
          <label>Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your article content here..."
            rows={8}
            required
          />
        </div>

        <div className="form-group">
          <label>Tags</label>
          <div className="tag-selector">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`tag ${selectedTags.has(tag.id) ? 'selected' : ''}`}
                style={{ '--tag-color': tag.color } as React.CSSProperties}
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Publish immediately
          </label>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Create Article
          </button>
        </div>
      </form>
    </div>
  )
}

// ============================================
// Main App Component
// ============================================
export default function Home() {
  // State
  const [categories, setCategories] = useState<Category[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [articleTags, setArticleTags] = useState<ArticleTag[]>([])

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [showPublishedOnly, setShowPublishedOnly] = useState(false)

  const [isEditorOpen, setIsEditorOpen] = useState(false)

  const [loading, setLoading] = useState({
    categories: true,
    articles: true,
    tags: true,
  })
  const [error, setError] = useState<string | null>(null)

  // ============================================
  // Load Categories
  // ============================================
  const loadCategories = useCallback(async () => {
    setLoading((prev) => ({ ...prev, categories: true }))
    try {
      const result = await categoriesCollectionOptions.load({
        meta: { loadSubsetOptions: {} },
      })
      setCategories(result)
    } catch (err) {
      console.error('Failed to load categories:', err)
      setError(err instanceof Error ? err.message : 'Failed to load categories')
    } finally {
      setLoading((prev) => ({ ...prev, categories: false }))
    }
  }, [])

  // ============================================
  // Load Articles (with filters)
  // ============================================
  const loadArticles = useCallback(async () => {
    setLoading((prev) => ({ ...prev, articles: true }))
    try {
      const loadSubsetOptions: LoadSubsetOptions = {}
      const conditions: WhereExpression[] = []

      // Filter by category
      if (selectedCategoryId) {
        conditions.push(where.eq('category_id', selectedCategoryId))
      }

      // Filter by published status
      if (showPublishedOnly) {
        conditions.push(where.eq('published', true))
      }

      // Search by title or content
      if (searchQuery.trim()) {
        // Search in title OR excerpt using OR
        conditions.push(
          where.or(
            where.ilike('title', `%${searchQuery.trim()}%`),
            where.ilike('excerpt', `%${searchQuery.trim()}%`)
          )
        )
      }

      // Combine conditions
      if (conditions.length === 1) {
        loadSubsetOptions.where = conditions[0]
      } else if (conditions.length > 1) {
        loadSubsetOptions.where = where.and(...conditions)
      }

      const result = await articlesCollectionOptions.load({
        meta: { loadSubsetOptions },
      })
      setArticles(result)
    } catch (err) {
      console.error('Failed to load articles:', err)
      setError(err instanceof Error ? err.message : 'Failed to load articles')
    } finally {
      setLoading((prev) => ({ ...prev, articles: false }))
    }
  }, [selectedCategoryId, showPublishedOnly, searchQuery])

  // ============================================
  // Load Tags
  // ============================================
  const loadTags = useCallback(async () => {
    setLoading((prev) => ({ ...prev, tags: true }))
    try {
      const result = await tagsCollectionOptions.load({
        meta: { loadSubsetOptions: {} },
      })
      setTags(result)
    } catch (err) {
      console.error('Failed to load tags:', err)
      setError(err instanceof Error ? err.message : 'Failed to load tags')
    } finally {
      setLoading((prev) => ({ ...prev, tags: false }))
    }
  }, [])

  // ============================================
  // Load Article Tags (junction table)
  // ============================================
  const loadArticleTags = useCallback(async () => {
    if (articles.length === 0) {
      setArticleTags([])
      return
    }

    try {
      // Load article tags for visible articles
      const articleIds = articles.map((a) => a.id)
      const result = await articleTagsCollectionOptions.load({
        meta: {
          loadSubsetOptions: {
            where: where.in('article_id', articleIds),
          },
        },
      })
      setArticleTags(result)
    } catch (err) {
      console.error('Failed to load article tags:', err)
    }
  }, [articles])

  // Initial load
  useEffect(() => {
    loadCategories()
    loadTags()
  }, [loadCategories, loadTags])

  useEffect(() => {
    loadArticles()
  }, [loadArticles])

  useEffect(() => {
    loadArticleTags()
  }, [loadArticleTags])

  // ============================================
  // Category CRUD
  // ============================================
  const addCategory = async (name: string, icon: string, color: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const slug = name.toLowerCase().replace(/\s+/g, '-')
      const result = await categoriesCollectionOptions.insert?.({
        name,
        slug,
        description: null,
        icon,
        color,
        user_id: user?.id || 'anonymous',
      })
      if (result?.success && result.data) {
        setCategories((prev) => [...prev, result.data!])
      }
    } catch (err) {
      console.error('Failed to add category:', err)
      setError(err instanceof Error ? err.message : 'Failed to add category')
    }
  }

  // ============================================
  // Article CRUD
  // ============================================
  const addArticle = async (article: Partial<Article>, tagIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const slug = (article.title || '').toLowerCase().replace(/\s+/g, '-')

      const result = await articlesCollectionOptions.insert?.({
        ...article,
        slug,
        user_id: user?.id || 'anonymous',
      } as Omit<Article, 'id' | 'created_at' | 'updated_at'>)

      if (result?.success && result.data) {
        const newArticle = result.data
        setArticles((prev) => [newArticle, ...prev])

        // Add article tags
        for (const tagId of tagIds) {
          await articleTagsCollectionOptions.insert?.({
            article_id: newArticle.id,
            tag_id: tagId,
          })
        }

        // Reload article tags
        await loadArticleTags()
        setIsEditorOpen(false)
      }
    } catch (err) {
      console.error('Failed to add article:', err)
      setError(err instanceof Error ? err.message : 'Failed to add article')
    }
  }

  const toggleArticlePublished = async (id: string, currentPublished: boolean) => {
    try {
      const result = await articlesCollectionOptions.update?.(id, { published: !currentPublished })
      if (result?.success) {
        setArticles((prev) =>
          prev.map((a) => (a.id === id ? { ...a, published: !currentPublished } : a))
        )
      }
    } catch (err) {
      console.error('Failed to update article:', err)
      setError(err instanceof Error ? err.message : 'Failed to update article')
    }
  }

  const toggleArticleFeatured = async (id: string, currentFeatured: boolean) => {
    try {
      const result = await articlesCollectionOptions.update?.(id, { featured: !currentFeatured })
      if (result?.success) {
        setArticles((prev) =>
          prev.map((a) => (a.id === id ? { ...a, featured: !currentFeatured } : a))
        )
      }
    } catch (err) {
      console.error('Failed to update article:', err)
      setError(err instanceof Error ? err.message : 'Failed to update article')
    }
  }

  const deleteArticle = async (id: string) => {
    try {
      const result = await articlesCollectionOptions.delete?.(id)
      if (result?.success) {
        setArticles((prev) => prev.filter((a) => a.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete article:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete article')
    }
  }

  // ============================================
  // Tag CRUD
  // ============================================
  const addTag = async (name: string, color: string) => {
    try {
      const slug = name.toLowerCase().replace(/\s+/g, '-')
      const result = await tagsCollectionOptions.insert?.({
        name,
        slug,
        color,
      })
      if (result?.success && result.data) {
        setTags((prev) => [...prev, result.data!])
      }
    } catch (err) {
      console.error('Failed to add tag:', err)
      setError(err instanceof Error ? err.message : 'Failed to add tag')
    }
  }

  const toggleTagFilter = (tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }

  // ============================================
  // Filter articles by selected tags
  // ============================================
  const filteredArticles = articles.filter((article) => {
    if (selectedTagIds.size === 0) return true
    const articleTagIds = articleTags
      .filter((at) => at.article_id === article.id)
      .map((at) => at.tag_id)
    return Array.from(selectedTagIds).some((tagId) => articleTagIds.includes(tagId))
  })

  // Get tags for an article
  const getArticleTags = (articleId: string): Tag[] => {
    const tagIds = articleTags
      .filter((at) => at.article_id === articleId)
      .map((at) => at.tag_id)
    return tags.filter((t) => tagIds.includes(t.id))
  }

  // Create category map
  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  // ============================================
  // Render
  // ============================================
  return (
    <div className="app">
      {/* Category Sidebar */}
      <CategorySidebar
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        onAddCategory={addCategory}
      />

      {/* Main Content */}
      <main className="main-content">
        <header className="content-header">
          <div className="header-top">
            <h1>Knowledge Base</h1>
            <button onClick={() => setIsEditorOpen(true)} className="new-article-btn">
              + New Article
            </button>
          </div>

          <div className="search-bar">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles..."
            />
            <label className="published-filter">
              <input
                type="checkbox"
                checked={showPublishedOnly}
                onChange={(e) => setShowPublishedOnly(e.target.checked)}
              />
              Published only
            </label>
          </div>

          <TagFilter
            tags={tags}
            selectedTagIds={selectedTagIds}
            onToggleTag={toggleTagFilter}
            onAddTag={addTag}
          />
        </header>

        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {loading.articles ? (
          <div className="loading">Loading articles...</div>
        ) : (
          <div className="articles-grid">
            {filteredArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                category={categoryMap.get(article.category_id)}
                tags={getArticleTags(article.id)}
                onTogglePublished={toggleArticlePublished}
                onToggleFeatured={toggleArticleFeatured}
                onDelete={deleteArticle}
                onSelect={() => {}}
              />
            ))}
            {filteredArticles.length === 0 && (
              <div className="no-articles">
                {searchQuery || selectedTagIds.size > 0 || selectedCategoryId
                  ? 'No articles match your filters'
                  : 'No articles yet. Create your first one!'}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="modal-overlay" onClick={() => setIsEditorOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <ArticleEditor
              categories={categories}
              tags={tags}
              onSave={addArticle}
              onCancel={() => setIsEditorOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
