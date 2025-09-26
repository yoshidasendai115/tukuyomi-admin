import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // トークンの最終使用日時を更新
    const { data, error } = await supabaseAdmin
      .from('admin_store_edit_tokens')
      .update({
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('token', token)
      .eq('is_active', true)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating last_used_at:', error);
      return NextResponse.json(
        { error: error?.message || 'Failed to update token' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}