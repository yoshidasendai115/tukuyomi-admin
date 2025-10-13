'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface Genre {
  id: string;
  name: string;
  description: string;
  is_visible: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

function SortableRow({ genre, onEdit, onDelete }: { genre: Genre; onEdit: (genre: Genre) => void; onDelete: (genre: Genre) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: genre.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-gray-50">
      <td className="px-4 py-3 w-12" {...attributes} {...listeners}>
        <svg className="w-5 h-5 text-gray-400 cursor-move" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {genre.name}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {genre.description || '-'}
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          genre.is_visible
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {genre.is_visible ? '表示' : '非表示'}
        </span>
      </td>
      <td className="px-4 py-3 text-center text-sm text-gray-600">
        {genre.display_order}
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium">
        <button
          onClick={() => onEdit(genre)}
          className="text-indigo-600 hover:text-indigo-900 mr-3"
        >
          編集
        </button>
        <button
          onClick={() => onDelete(genre)}
          className="text-red-600 hover:text-red-900"
        >
          削除
        </button>
      </td>
    </tr>
  );
}

export default function GenresPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_visible: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchGenres();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
        resetForm();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showModal]);

  const fetchGenres = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/masters/genres');
      const result = await response.json();

      if (result.data) {
        const sortedGenres = (result.data as Genre[]).sort((a, b) =>
          a.display_order - b.display_order
        );
        setGenres(sortedGenres);
      }
    } catch (error) {
      console.error('Error fetching genres:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = genres.findIndex(g => g.id === active.id);
    const newIndex = genres.findIndex(g => g.id === over.id);

    const newGenres = arrayMove(genres, oldIndex, newIndex);
    setGenres(newGenres);

    // 表示順を更新
    const updates = newGenres.map((genre, index) => ({
      id: genre.id,
      display_order: index + 1,
    }));

    try {
      await fetch('/api/masters/genres/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
    } catch (error) {
      console.error('Error updating order:', error);
      fetchGenres(); // エラーの場合は再取得
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const method = editingGenre ? 'PUT' : 'POST';
      const url = editingGenre
        ? `/api/masters/genres/${editingGenre.id}`
        : '/api/masters/genres';

      const body = editingGenre
        ? formData
        : { ...formData, display_order: genres.length + 1 };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        fetchGenres();
        setShowModal(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving genre:', error);
    }
  };

  const handleEdit = (genre: Genre) => {
    setEditingGenre(genre);
    setFormData({
      name: genre.name,
      description: genre.description || '',
      is_visible: genre.is_visible,
    });
    setShowModal(true);
  };

  const handleDelete = async (genre: Genre) => {
    if (!confirm(`「${genre.name}」を削除してもよろしいですか？`)) return;

    try {
      const response = await fetch(`/api/masters/genres/${genre.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchGenres();
      }
    } catch (error) {
      console.error('Error deleting genre:', error);
    }
  };

  const resetForm = () => {
    setEditingGenre(null);
    setFormData({
      name: '',
      description: '',
      is_visible: true,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">業態マスタ管理</h1>
              <p className="mt-2 text-sm text-gray-600">
                店舗の業態（ジャンル）を管理します
              </p>
            </div>
            <div className="space-x-4">
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                + 新規追加
              </button>
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                ダッシュボードへ戻る
              </Link>
            </div>
          </div>
        </div>

        {/* テーブル */}
        <div className="bg-white rounded-lg shadow">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext
              items={genres.map(g => g.id)}
              strategy={verticalListSortingStrategy}
            >
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 w-12"></th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      業態名
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      説明
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      表示状態
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      表示順
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {genres.map((genre) => (
                    <SortableRow
                      key={genre.id}
                      genre={genre}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </tbody>
              </table>
            </SortableContext>
          </DndContext>

          {genres.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              業態が登録されていません
            </div>
          )}
        </div>

        {/* 編集モーダル */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-gray-500 opacity-75"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            ></div>
            <div className="relative bg-white rounded-lg max-w-md w-full mx-4 p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900">
                {editingGenre ? '業態編集' : '新規業態登録'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    業態名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                    placeholder="例: カフェ"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    説明
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder="業態の説明を入力"
                  />
                </div>

                <div className="mb-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_visible}
                      onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                      className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">表示する</span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    チェックを外すと、この業態は選択肢に表示されません
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    {editingGenre ? '更新' : '追加'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}