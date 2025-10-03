import { supabaseAdmin } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client not configured' },
        { status: 500 }
      );
    }

    // FormDataを取得
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const storeId = formData.get('storeId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        { status: 400 }
      );
    }

    // ファイル名を生成（タイムスタンプ + オリジナルのファイル名）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // ストレージのパスを決定
    const storagePath = `store-images/${storeId}/${type}/${fileName}`;

    // ファイルをArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Supabase Storageにアップロード
    const { data, error } = await supabaseAdmin.storage
      .from('store-images')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return NextResponse.json(
        { error: '画像のアップロードに失敗しました', details: error.message },
        { status: 500 }
      );
    }

    // 公開URLを取得
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from('store-images').getPublicUrl(storagePath);

    return NextResponse.json({
      url: publicUrl,
      path: storagePath,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: '画像のアップロード中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
