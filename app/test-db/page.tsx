'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestDBPage() {
  const [results, setResults] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  const runTests = async () => {
    setIsLoading(true);
    const testResults: any = {};

    // 1. Supabase接続テスト
    testResults.connection = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    };

    // 2. テーブル存在確認
    try {
      const { data, error } = await supabase
        .from('admin_auth_users')
        .select('count')
        .limit(1);

      testResults.tableExists = {
        success: !error,
        error: error?.message || null,
        code: error?.code || null
      };
    } catch (e) {
      testResults.tableExists = {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    // 3. 関数存在確認
    try {
      const { data, error } = await supabase.rpc('authenticate_admin', {
        p_login_id: 'test-non-existent',
        p_password: 'test',
        p_ip_address: 'test'
      });

      testResults.functionExists = {
        success: !error || (error && !error.message?.includes('does not exist')),
        functionResponse: data,
        error: error?.message || null,
        code: error?.code || null
      };
    } catch (e) {
      testResults.functionExists = {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    // 4. ユーザー一覧（参照のみ、削除しない）
    try {
      const { data, error } = await supabase
        .from('admin_auth_users')
        .select('login_id, display_name, role, is_active');

      testResults.users = {
        success: !error,
        data: data,
        error: error?.message || null
      };
    } catch (e) {
      testResults.users = {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    setResults(testResults);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">データベース接続テスト</h1>

        <button
          onClick={runTests}
          disabled={isLoading}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isLoading ? 'テスト中...' : 'テスト実行'}
        </button>

        {Object.keys(results).length > 0 && (
          <div className="space-y-6">
            {/* 接続情報 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-3">1. Supabase接続</h2>
              <pre className="bg-gray-100 p-3 rounded overflow-x-auto text-sm">
                {JSON.stringify(results.connection, null, 2)}
              </pre>
            </div>

            {/* テーブル確認 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-3">2. admin_auth_users テーブル</h2>
              <div className={`inline-block px-3 py-1 rounded text-white mb-3 ${
                results.tableExists?.success ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {results.tableExists?.success ? '✓ 存在する' : '✗ 存在しない'}
              </div>
              <pre className="bg-gray-100 p-3 rounded overflow-x-auto text-sm">
                {JSON.stringify(results.tableExists, null, 2)}
              </pre>
            </div>

            {/* 関数確認 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-3">3. authenticate_admin 関数</h2>
              <div className={`inline-block px-3 py-1 rounded text-white mb-3 ${
                results.functionExists?.success ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {results.functionExists?.success ? '✓ 存在する' : '✗ 存在しない'}
              </div>
              <pre className="bg-gray-100 p-3 rounded overflow-x-auto text-sm">
                {JSON.stringify(results.functionExists, null, 2)}
              </pre>
            </div>

            {/* ユーザー一覧 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-3">4. 登録済みユーザー</h2>
              <div className={`inline-block px-3 py-1 rounded text-white mb-3 ${
                results.users?.success ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {results.users?.success ? '✓ 取得成功' : '✗ 取得失敗'}
              </div>
              <pre className="bg-gray-100 p-3 rounded overflow-x-auto text-sm">
                {JSON.stringify(results.users, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-100 rounded-lg">
          <h3 className="font-semibold mb-2">セットアップが必要な場合：</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Supabase Studio を開く: http://localhost:54323</li>
            <li>SQL Editor を選択</li>
            <li>scripts/apply-admin-auth.sql の内容をコピー＆ペースト</li>
            <li>Run ボタンをクリック</li>
          </ol>
        </div>
      </div>
    </div>
  );
}