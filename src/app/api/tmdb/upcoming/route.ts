import { NextRequest } from 'next/server';
import { handleTmdbFeedRequest } from '../shared/tmdb-handler';

export async function GET(request: NextRequest) {
  return handleTmdbFeedRequest(request, 'upcoming');
}