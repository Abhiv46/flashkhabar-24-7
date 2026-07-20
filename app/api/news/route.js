import { NextResponse } from 'next/server';
import { fetchCategoryItems, getCategory } from '../../../lib/news';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const catId = searchParams.get('cat') || 'top';

  try {
    const items = await fetchCategoryItems(catId);
    return NextResponse.json({ ok: true, category: getCategory(catId).label, items });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
