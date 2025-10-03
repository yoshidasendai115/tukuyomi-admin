'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  RAILWAY_LINES,
  getRailwayLines,
  getStationsByLine,
  getRailwayLinesByStation,
  getStationOrder,
  type RailwayLine
} from '@/lib/constants/railway-lines';

interface Station {
  id: string;
  name: string;
  is_major?: boolean;
  is_within_tokyo23?: boolean;
  latitude?: number;
  longitude?: number;
  index_letter?: string;
  railway_lines?: string[];
  line_orders?: Record<string, number>;
  needsLineAddition?: boolean;
}

export default function StationMasterPage() {
  const [selectedLine, setSelectedLine] = useState<RailwayLine>('JR山手線');
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [formData, setFormData] = useState<Station>({
    id: '',
    name: '',
    is_major: false,
    is_within_tokyo23: true,
    railway_lines: [],
    line_orders: {}
  });

  const railwayLines = getRailwayLines();

  useEffect(() => {
    fetchStations();
  }, []);

  // エスケープキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
        resetForm();
      }
    };

    if (showModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showModal]);

  const fetchStations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/masters/stations');
      const { data } = await response.json();
      console.log('Fetched stations:', data); // デバッグ用
      setStations(data || []);
    } catch (error) {
      console.error('Error fetching stations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 選択された路線の駅を取得
  const getStationsForSelectedLine = (): Station[] => {
    const lineStations = getStationsByLine(selectedLine);
    const stationsInLine: Station[] = [];

    lineStations.forEach((stationName, index) => {
      // データベースの駅名は「駅」サフィックスが付いているので、比較時に追加
      const stationNameWithSuffix = `${stationName}駅`;

      const station = stations.find(s =>
        s.name === stationNameWithSuffix &&
        s.railway_lines?.includes(selectedLine)
      );

      if (station) {
        stationsInLine.push(station);
      } else {
        // 他の路線に存在する駅かチェック
        const existingStation = stations.find(s => s.name === stationNameWithSuffix);
        if (existingStation) {
          // 駅は存在するが、この路線には未所属（路線追加が必要）
          stationsInLine.push({
            ...existingStation,
            id: `add-line-${selectedLine}-${existingStation.id}`,
            needsLineAddition: true
          });
        } else {
          // 駅が存在しない場合は仮のデータを作成
          stationsInLine.push({
            id: `temp-${selectedLine}-${stationName}`,
            name: stationName,
            railway_lines: [selectedLine],
            line_orders: { [selectedLine]: index + 1 }
          });
        }
      }
    });

    return stationsInLine;
  };

  const handleEdit = (station: Station) => {
    setEditingStation(station);
    setFormData(station);
    setShowModal(true);
  };

  const handleDelete = async (station: Station) => {
    if (!confirm(`${station.name}駅を削除しますか？`)) return;

    try {
      await fetch(`/api/masters/stations/${station.id}`, {
        method: 'DELETE'
      });
      await fetchStations();
    } catch (error) {
      console.error('Error deleting station:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const method = editingStation ? 'PUT' : 'POST';
      const url = editingStation
        ? `/api/masters/stations/${editingStation.id}`
        : '/api/masters/stations';

      // 路線内順序を自動設定
      if (!editingStation && formData.railway_lines) {
        const newLineOrders: Record<string, number> = {};
        formData.railway_lines.forEach(line => {
          const lineStations = getStationsByLine(line as RailwayLine);
          const order = lineStations.indexOf(formData.name) + 1;
          if (order > 0) {
            newLineOrders[line] = order;
          }
        });
        formData.line_orders = newLineOrders;
      }

      console.log('Sending data:', formData); // デバッグ用
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('API Error:', error);
        alert('保存に失敗しました: ' + (error.error || error.message));
        return;
      }

      await fetchStations();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving station:', error);
    }
  };

  const resetForm = () => {
    setEditingStation(null);
    setFormData({
      id: '',
      name: '',
      is_major: false,
      is_within_tokyo23: true,
      railway_lines: [],
      line_orders: {}
    });
  };

  const stationsForLine = getStationsForSelectedLine();

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
              <h1 className="text-2xl font-bold text-gray-900">駅マスタ管理</h1>
              <p className="mt-2 text-sm text-gray-600">
                路線別に駅を管理します
              </p>
            </div>
            <div className="space-x-4">
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                ダッシュボードへ戻る
              </Link>
            </div>
          </div>
        </div>

        {/* 路線タブ */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <div className="flex flex-wrap">
              {railwayLines.map((line) => (
                <button
                  key={line}
                  onClick={() => setSelectedLine(line)}
                  className={`
                    px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap
                    ${selectedLine === line
                      ? 'text-indigo-600 border-indigo-600 bg-indigo-50'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  {line}
                </button>
              ))}
            </div>
          </div>

          {/* アクションバー */}
          <div className="p-4 border-b bg-gray-50">
            <button
              onClick={() => {
                resetForm();
                setFormData(prev => ({
                  ...prev,
                  railway_lines: [selectedLine],
                  line_orders: { [selectedLine]: stationsForLine.length + 1 }
                }));
                setShowModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              + {selectedLine}に駅を追加
            </button>
          </div>

          {/* 駅一覧テーブル */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    順序
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    駅名
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    主要駅
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    23区内
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    他路線
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stationsForLine.map((station, index) => {
                  const otherLines = station.railway_lines?.filter(line => line !== selectedLine) || [];
                  const isTemporary = station.id.startsWith('temp-');
                  const needsLineAddition = station.needsLineAddition;

                  return (
                    <tr key={station.id} className={`hover:bg-gray-50 ${(isTemporary || needsLineAddition) ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {station.name}
                        {isTemporary && (
                          <span className="ml-2 text-xs text-red-500">（未登録）</span>
                        )}
                        {needsLineAddition && (
                          <span className="ml-2 text-xs text-blue-500">（路線追加）</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {station.is_major ? (
                          <span className="text-green-600">●</span>
                        ) : (
                          <span className="text-gray-300">○</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {station.is_within_tokyo23 !== false ? (
                          <span className="text-green-600">●</span>
                        ) : (
                          <span className="text-gray-300">○</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {otherLines.length > 0 ? (
                          <div className="text-xs">
                            {otherLines.join(', ')}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isTemporary && !needsLineAddition ? (
                          <>
                            <button
                              onClick={() => handleEdit(station)}
                              className="text-indigo-600 hover:text-indigo-900 mr-3"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDelete(station)}
                              className="text-red-600 hover:text-red-900"
                            >
                              削除
                            </button>
                          </>
                        ) : needsLineAddition ? (
                          <button
                            onClick={async () => {
                              // 既存の駅に路線を追加
                              const realId = station.id.replace(`add-line-${selectedLine}-`, '');
                              const updatedStation = {
                                ...station,
                                railway_lines: [...(station.railway_lines || []), selectedLine],
                                line_orders: {
                                  ...(station.line_orders || {}),
                                  [selectedLine]: index + 1
                                }
                              };

                              try {
                                const response = await fetch(`/api/masters/stations/${realId}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(updatedStation)
                                });

                                if (response.ok) {
                                  await fetchStations();
                                } else {
                                  const errorData = await response.json();
                                  console.error('Failed to add line to station:', errorData);
                                  alert('路線の追加に失敗しました: ' + (errorData.error || errorData.message || '不明なエラー'));
                                }
                              } catch (error) {
                                console.error('Error adding line to station:', error);
                                alert('エラーが発生しました');
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            路線追加
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              // 未登録駅を即座に登録（モーダルを開かずに直接登録）
                              const newStation = {
                                name: station.name,
                                is_major: false,
                                is_within_tokyo23: true,
                                railway_lines: [selectedLine],
                                line_orders: { [selectedLine]: index + 1 }
                              };

                              try {
                                const response = await fetch('/api/masters/stations', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(newStation)
                                });

                                if (response.ok) {
                                  // 登録成功後、即座にデータを再取得
                                  await fetchStations();
                                } else {
                                  const errorData = await response.json();
                                  console.error('Failed to register station:', errorData);
                                  alert('駅の登録に失敗しました: ' + (errorData.error || errorData.message || '不明なエラー'));
                                }
                              } catch (error) {
                                console.error('Error registering station:', error);
                                alert('エラーが発生しました');
                              }
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            登録
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {stationsForLine.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              この路線には駅が登録されていません
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
            <div className="relative bg-white rounded-lg max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingStation ? '駅編集' : '新規駅登録'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    駅名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    required
                    placeholder="例: 渋谷"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    路線名は含めないでください（例: ✗JR山手線渋谷 → ○渋谷）
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    所属路線
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 bg-white">
                    {railwayLines.map(line => (
                      <label key={line} className="flex items-center py-1 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.railway_lines?.includes(line) || false}
                          onChange={(e) => {
                            const newLines = e.target.checked
                              ? [...(formData.railway_lines || []), line]
                              : formData.railway_lines?.filter(l => l !== line) || [];

                            // 路線内順序を自動設定
                            const newLineOrders = { ...formData.line_orders };
                            if (e.target.checked) {
                              const lineStations = getStationsByLine(line);
                              const order = lineStations.indexOf(formData.name) + 1;
                              if (order > 0) {
                                newLineOrders[line] = order;
                              } else {
                                newLineOrders[line] = lineStations.length + 1;
                              }
                            } else {
                              delete newLineOrders[line];
                            }

                            setFormData({
                              ...formData,
                              railway_lines: newLines,
                              line_orders: newLineOrders
                            });
                          }}
                          className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{line}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_major}
                        onChange={(e) => setFormData({ ...formData, is_major: e.target.checked })}
                        className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">主要駅</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_within_tokyo23}
                        onChange={(e) => setFormData({ ...formData, is_within_tokyo23: e.target.checked })}
                        className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">東京23区内</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      緯度
                    </label>
                    <input
                      type="number"
                      step="0.0000001"
                      value={formData.latitude || ''}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      経度
                    </label>
                    <input
                      type="number"
                      step="0.0000001"
                      value={formData.longitude || ''}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    {editingStation ? '更新' : '登録'}
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