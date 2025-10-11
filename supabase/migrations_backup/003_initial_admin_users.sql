-- ================================================
-- Initial Admin Users Setup
-- 初期管理者ユーザーの設定
-- ================================================

-- 初期管理者ユーザーの作成
-- 注意: 本番環境では必ず初回ログイン後にパスワードを変更してください

-- Supabaseの認証ユーザーを作成するための関数
-- （実際にはSupabaseダッシュボードまたは管理APIで実行する必要があります）

DO $$
DECLARE
    v_user_id_garen uuid;
    v_user_id_yoshida uuid;
BEGIN
    -- 1. ga-ren ユーザーの作成
    -- 注: 以下のINSERT文は例示用です。実際にはSupabase Authを通じてユーザーを作成する必要があります
    -- Supabase Dashboard > Authentication > Users から手動で作成するか、
    -- supabase.auth.admin.createUser() APIを使用してください

    -- メールアドレス: ga-ren@tukuyomi-admin.local
    -- パスワード: Pass1234@!

    -- 仮のUUIDを使用（実際のauth.users.idと置き換える必要があります）
    v_user_id_garen := gen_random_uuid();

    -- admin_usersテーブルにレコードを追加
    INSERT INTO admin_users (user_id, role, permissions, is_active)
    VALUES (
        v_user_id_garen,
        'super_admin',
        '{"all": true}'::jsonb,
        true
    );

    -- 2. ys-yoshida ユーザーの作成
    -- メールアドレス: ys-yoshida@tukuyomi-admin.local
    -- パスワード: Pass1234@!

    -- 仮のUUIDを使用（実際のauth.users.idと置き換える必要があります）
    v_user_id_yoshida := gen_random_uuid();

    -- admin_usersテーブルにレコードを追加
    INSERT INTO admin_users (user_id, role, permissions, is_active)
    VALUES (
        v_user_id_yoshida,
        'super_admin',
        '{"all": true}'::jsonb,
        true
    );

    RAISE NOTICE 'Initial admin users created. Please create actual auth users with following credentials:';
    RAISE NOTICE '1. Email: ga-ren@tukuyomi-admin.local, Password: Pass1234@!';
    RAISE NOTICE '2. Email: ys-yoshida@tukuyomi-admin.local, Password: Pass1234@!';
    RAISE NOTICE 'Then update admin_users table with correct user_ids from auth.users';
END $$;

-- ================================================
-- 手動セットアップ手順
-- ================================================
-- 1. Supabase Dashboard にアクセス
-- 2. Authentication > Users セクションへ移動
-- 3. "Create new user" をクリック
-- 4. 以下の情報でユーザーを作成:
--
--    ユーザー1:
--    - Email: ga-ren@tukuyomi-admin.local
--    - Password: Pass1234@!
--
--    ユーザー2:
--    - Email: ys-yoshida@tukuyomi-admin.local
--    - Password: Pass1234@!
--
-- 5. 作成後、各ユーザーのUUIDをコピー
-- 6. 以下のSQLを実行してadmin_usersテーブルを更新:
--
-- DELETE FROM admin_users WHERE user_id IN (SELECT user_id FROM admin_users);
--
-- INSERT INTO admin_users (user_id, role, permissions, is_active) VALUES
-- ('実際のga-renのUUID', 'super_admin', '{"all": true}'::jsonb, true),
-- ('実際のys-yoshidaのUUID', 'super_admin', '{"all": true}'::jsonb, true);
-- ================================================