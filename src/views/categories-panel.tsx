'use client'
import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/lib/i18n'
import { useToast } from '@/hooks/use-toast'

type Category = {
  id: string
  slug: string
  nameRu: string
  nameEn: string
  descRu: string
  descEn: string
  sortOrder: number
}

type NewCategory = {
  slug: string
  nameRu: string
  nameEn: string
  descRu: string
  descEn: string
  sortOrder: number
}

const emptyNew: NewCategory = { slug: '', nameRu: '', nameEn: '', descRu: '', descEn: '', sortOrder: 100 }

export function CategoriesPanel() {
  const { lang } = useI18n()
  const { toast } = useToast()

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newCat, setNewCat] = useState<NewCategory>({ ...emptyNew })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCat, setEditCat] = useState<Partial<Category>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories')
      const data = await res.json()
      if (res.ok) {
        setCategories(data.categories || [])
      } else {
        toast({ title: data.error || 'Ошибка загрузки категорий' })
      }
    } catch {
      toast({ title: 'Сетевая ошибка' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const handleAdd = async () => {
    if (!newCat.slug || !newCat.nameRu || !newCat.nameEn) {
      toast({ title: lang === 'ru' ? 'Заполните slug, nameRu и nameEn' : 'Fill slug, nameRu and nameEn' })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCat),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: lang === 'ru' ? 'Категория создана' : 'Category created' })
        setNewCat({ ...emptyNew })
        setShowAdd(false)
        fetchCategories()
      } else {
        toast({ title: data.error || 'Ошибка создания' })
      }
    } catch {
      toast({ title: 'Сетевая ошибка' })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editCat),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: lang === 'ru' ? 'Категория обновлена' : 'Category updated' })
        setEditingId(null)
        setEditCat({})
        fetchCategories()
      } else {
        toast({ title: data.error || 'Ошибка обновления' })
      }
    } catch {
      toast({ title: 'Сетевая ошибка' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        toast({ title: lang === 'ru' ? 'Категория удалена' : 'Category deleted' })
        setDeleteConfirm(null)
        fetchCategories()
      } else {
        toast({ title: data.error || 'Ошибка удаления' })
      }
    } catch {
      toast({ title: 'Сетевая ошибка' })
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditCat({ nameRu: cat.nameRu, nameEn: cat.nameEn, descRu: cat.descRu, descEn: cat.descEn, sortOrder: cat.sortOrder })
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-500">...</div>
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {lang === 'ru' ? 'Категории' : 'Categories'}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {categories.length} {lang === 'ru' ? (categories.length === 1 ? 'категория' : categories.length < 5 ? 'категории' : 'категорий') : 'categories'}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-700 transition-colors"
        >
          {showAdd
            ? (lang === 'ru' ? 'Отмена' : 'Cancel')
            : (lang === 'ru' ? '+ Добавить' : '+ Add category')
          }
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h4 className="text-sm font-semibold text-slate-700">
            {lang === 'ru' ? 'Новая категория' : 'New category'}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Slug</label>
              <input
                value={newCat.slug}
                onChange={e => setNewCat({ ...newCat, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="e-commerce"
                className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sort Order</label>
              <input
                type="number"
                value={newCat.sortOrder}
                onChange={e => setNewCat({ ...newCat, sortOrder: parseInt(e.target.value) || 100 })}
                className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Название (RU)</label>
              <input
                value={newCat.nameRu}
                onChange={e => setNewCat({ ...newCat, nameRu: e.target.value })}
                placeholder="Электронная коммерция"
                className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name (EN)</label>
              <input
                value={newCat.nameEn}
                onChange={e => setNewCat({ ...newCat, nameEn: e.target.value })}
                placeholder="E-commerce"
                className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Описание (RU)</label>
              <input
                value={newCat.descRu}
                onChange={e => setNewCat({ ...newCat, descRu: e.target.value })}
                placeholder="Описание категории"
                className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description (EN)</label>
              <input
                value={newCat.descEn}
                onChange={e => setNewCat({ ...newCat, descEn: e.target.value })}
                placeholder="Category description"
                className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !newCat.slug || !newCat.nameRu || !newCat.nameEn}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '...' : (lang === 'ru' ? 'Создать' : 'Create')}
          </button>
        </div>
      )}

      {/* Categories list */}
      <div className="space-y-2">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="rounded-xl border border-slate-200 bg-white transition-colors"
          >
            {editingId === cat.id ? (
              /* ── Edit mode ── */
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Название (RU)</label>
                    <input
                      value={editCat.nameRu || ''}
                      onChange={e => setEditCat({ ...editCat, nameRu: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Name (EN)</label>
                    <input
                      value={editCat.nameEn || ''}
                      onChange={e => setEditCat({ ...editCat, nameEn: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Описание (RU)</label>
                    <input
                      value={editCat.descRu || ''}
                      onChange={e => setEditCat({ ...editCat, descRu: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Description (EN)</label>
                    <input
                      value={editCat.descEn || ''}
                      onChange={e => setEditCat({ ...editCat, descEn: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={editCat.sortOrder ?? cat.sortOrder}
                      onChange={e => setEditCat({ ...editCat, sortOrder: parseInt(e.target.value) || 100 })}
                      className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdate(cat.id)}
                    disabled={saving}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? '...' : (lang === 'ru' ? 'Сохранить' : 'Save')}
                  </button>
                  <button
                    onClick={() => { setEditingId(null); setEditCat({}) }}
                    className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    {lang === 'ru' ? 'Отмена' : 'Cancel'}
                  </button>
                </div>
              </div>
            ) : (
              /* ── View mode ── */
              <div className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {lang === 'ru' ? cat.nameRu : cat.nameEn}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-500">
                      {cat.slug}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {lang === 'ru' ? cat.descRu : cat.descEn}
                  </div>
                </div>
                <div className="text-xs text-slate-400 shrink-0">
                  sort: {cat.sortOrder}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => startEdit(cat)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {lang === 'ru' ? 'Изменить' : 'Edit'}
                  </button>
                  {deleteConfirm === cat.id ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleDelete(cat.id)}
                        disabled={saving}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors"
                      >
                        {saving ? '...' : (lang === 'ru' ? 'Удалить' : 'Delete')}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        {lang === 'ru' ? 'Нет' : 'No'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(cat.id)}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      {lang === 'ru' ? 'Удалить' : 'Delete'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
