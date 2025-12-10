// API v2 Files Routes
// This file serves as the entry point for file-related API endpoints in v2

import { NextRequest, NextResponse } from 'next/server';

// Proxy handler for file endpoints
export async function GET(request: NextRequest) {
  // Extract the subpath after /api/v2/files/
  const url = new URL(request.url);
  const subpath = url.pathname.replace(/^\/api\/v2\/files/, '');

  // Forward to the actual file endpoint (CSV, temp-image, etc.)
  // Handle different file-related endpoints
  let targetUrl;
  if (subpath.startsWith('/csv')) {
    targetUrl = `${request.nextUrl.origin}/api/csv${subpath.replace('/csv', '')}`;
  } else if (subpath.startsWith('/temp-image')) {
    targetUrl = `${request.nextUrl.origin}/api/temp-image${subpath.replace('/temp-image', '')}`;
  } else {
    // Default to a general files endpoint if it exists
    targetUrl = `${request.nextUrl.origin}/api/files${subpath}`;
  }

  const newRequest = new NextRequest(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  return fetch(newRequest);
}

export async function POST(request: NextRequest) {
  // Extract the subpath after /api/v2/files/
  const url = new URL(request.url);
  const subpath = url.pathname.replace(/^\/api\/v2\/files/, '');

  // Forward to the actual file endpoint (CSV, temp-image, etc.)
  let targetUrl;
  if (subpath.startsWith('/csv')) {
    targetUrl = `${request.nextUrl.origin}/api/csv${subpath.replace('/csv', '')}`;
  } else if (subpath.startsWith('/temp-image')) {
    targetUrl = `${request.nextUrl.origin}/api/temp-image${subpath.replace('/temp-image', '')}`;
  } else {
    // Default to a general files endpoint if it exists
    targetUrl = `${request.nextUrl.origin}/api/files${subpath}`;
  }

  const newRequest = new NextRequest(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  return fetch(newRequest);
}

export async function PUT(request: NextRequest) {
  // Extract the subpath after /api/v2/files/
  const url = new URL(request.url);
  const subpath = url.pathname.replace(/^\/api\/v2\/files/, '');

  // Forward to the actual file endpoint
  let targetUrl;
  if (subpath.startsWith('/csv')) {
    targetUrl = `${request.nextUrl.origin}/api/csv${subpath.replace('/csv', '')}`;
  } else if (subpath.startsWith('/temp-image')) {
    targetUrl = `${request.nextUrl.origin}/api/temp-image${subpath.replace('/temp-image', '')}`;
  } else {
    // Default to a general files endpoint if it exists
    targetUrl = `${request.nextUrl.origin}/api/files${subpath}`;
  }

  const newRequest = new NextRequest(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  return fetch(newRequest);
}

export async function DELETE(request: NextRequest) {
  // Extract the subpath after /api/v2/files/
  const url = new URL(request.url);
  const subpath = url.pathname.replace(/^\/api\/v2\/files/, '');

  // Forward to the actual file endpoint
  let targetUrl;
  if (subpath.startsWith('/csv')) {
    targetUrl = `${request.nextUrl.origin}/api/csv${subpath.replace('/csv', '')}`;
  } else if (subpath.startsWith('/temp-image')) {
    targetUrl = `${request.nextUrl.origin}/api/temp-image${subpath.replace('/temp-image', '')}`;
  } else {
    // Default to a general files endpoint if it exists
    targetUrl = `${request.nextUrl.origin}/api/files${subpath}`;
  }

  const newRequest = new NextRequest(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  return fetch(newRequest);
}