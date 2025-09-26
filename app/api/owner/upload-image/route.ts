import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'main' or 'additional'
    const storeId = formData.get('storeId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルがありません' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // ファイル名を生成（タイムスタンプ付き）
    const timestamp = Date.now();
    const fileName = `${storeId}/${type}_${timestamp}_${file.name}`;

    // Supabaseストレージにアップロード
    const { data, error } = await supabaseAdmin.storage
      .from('store-images')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json(
        { error: 'アップロードに失敗しました' },
        { status: 500 }
      );
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('store-images')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicUrl
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}