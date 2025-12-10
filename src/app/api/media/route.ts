// API v2 Media Routes
// This file serves as the entry point for media-related API endpoints in v2

import { NextRequest, NextResponse } from 'next/server';

// Proxy handler for media endpoints
export async function GET(request: NextRequest) {
  // Extract the subpath after /api/v2/media/
  const url = new URL(request.url);
  const subpath = url.pathname.replace(/^\/api\/v2\/media/, '');

  // Forward to the actual media endpoint
  const targetUrl = `${request.nextUrl.origin}/api/media${subpath}`;
  const newRequest = new NextRequest(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  return fetch(newRequest);
}

export async function POST(request: NextRequest) {
  // Extract the subpath after /api/v2/media/
  const url = new URL(request.url);
  const subpath = url.pathname.replace(/^\/api\/v2\/media/, '');

  // Forward to the actual media endpoint
  const targetUrl = `${request.nextUrl.origin}/api/media${subpath}`;
  const newRequest = new NextRequest(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  return fetch(newRequest);
}

export async function PUT(request: NextRequest) {
  // Extract the subpath after /api/v2/media/
  const url = new URL(request.url);
  const subpath = url.pathname.replace(/^\/api\/v2\/media/, '');

  // Forward to the actual media endpoint
  const targetUrl = `${request.nextUrl.origin}/api/media${subpath}`;
  const newRequest = new NextRequest(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  return fetch(newRequest);
}

export async function DELETE(request: NextRequest) {
  // Extract the subpath after /api/v2/media/
  const url = new URL(request.url);
  const subpath = url.pathname.replace(/^\/api\/v2\/media/, '');

  // Forward to the actual media endpoint
  const targetUrl = `${request.nextUrl.origin}/api/media${subpath}`;
  const newRequest = new NextRequest(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  return fetch(newRequest);
}