import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const station = searchParams.get('station');
    const address = searchParams.get('address');

    if (!station || !address) {
      return NextResponse.json(
        { error: 'station and address parameters are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    // Google Maps Distance Matrix APIを使用
    const origin = encodeURIComponent(`${station}駅`);
    const destination = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&mode=walking&language=ja&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return NextResponse.json(
        { error: `Google Maps API error: ${data.status}` },
        { status: 500 }
      );
    }

    const element = data.rows[0]?.elements[0];
    if (!element || element.status !== 'OK') {
      return NextResponse.json(
        { error: 'Could not calculate distance' },
        { status: 404 }
      );
    }

    // 徒歩時間を分単位で取得
    const durationMinutes = Math.ceil(element.duration.value / 60);
    const distanceMeters = element.distance.value;

    return NextResponse.json({
      duration: {
        text: element.duration.text,
        minutes: durationMinutes
      },
      distance: {
        text: element.distance.text,
        meters: distanceMeters
      },
      formattedDistance: `徒歩${durationMinutes}分`
    });
  } catch (error) {
    console.error('Error calculating distance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
