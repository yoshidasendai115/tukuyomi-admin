import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // ジャンル情報を取得（is_visible=trueのみ）
    const { data: genres, error: genresError } = await supabaseAdmin
      .from('genres')
      .select('id, name')
      .eq('is_visible', true)
      .order('display_order', { ascending: true });

    if (genresError) {
      console.error('Error fetching genres:', genresError);
    }

    // 駅情報をareasテーブルから取得
    const { data: areas, error: areasError } = await supabaseAdmin
      .from('areas')
      .select('id, name, railway_lines')
      .order('name', { ascending: true });

    if (areasError) {
      console.error('Error fetching areas:', areasError);
    }

    // 路線情報を整理（重複を排除し、非JSON形式で処理）
    const railwayLines = new Set<string>();
    areas?.forEach((area: any) => {
      if (area.railway_lines) {
        // JSON配列の場合とカンマ区切り文字列の場合の両方に対応
        let lines: string[] = [];
        if (Array.isArray(area.railway_lines)) {
          lines = area.railway_lines;
        } else if (typeof area.railway_lines === 'string') {
          // カンマ区切り文字列、JSONパース、または単一文字列として処理
          try {
            const parsed = JSON.parse(area.railway_lines);
            lines = Array.isArray(parsed) ? parsed : [area.railway_lines];
          } catch {
            lines = area.railway_lines.split(',').map((line: string) => line.trim()).filter((line: string) => line);
          }
        }

        lines.forEach((line: string) => {
          if (line && line.trim()) {
            railwayLines.add(line.trim());
          }
        });
      }
    });

    return NextResponse.json({
      genres: genres || [],
      stations: areas?.map((area: any) => ({
        id: area.id,
        name: area.name,
        // railway_linesを文字列配列として返す
        railway_lines: area.railway_lines ?
          (Array.isArray(area.railway_lines) ?
            area.railway_lines :
            (typeof area.railway_lines === 'string' ?
              (area.railway_lines.startsWith('[') ?
                JSON.parse(area.railway_lines) :
                area.railway_lines.split(',').map((line: string) => line.trim()).filter((line: string) => line)
              ) :
              []
            )
          ) :
          []
      })) || [],
      railwayLines: Array.from(railwayLines).sort()
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}