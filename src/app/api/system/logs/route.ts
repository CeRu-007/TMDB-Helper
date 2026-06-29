import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { AuthenticatedAPIRoute } from '@/lib/api/authenticated-api-route';
import { getLogDir } from '@/lib/utils/logger';

const LOG_DIR = getLogDir();

interface LogFileEntry {
  name: string;
  size: number;
  lastModified: string;
}

function listLogFiles(): LogFileEntry[] {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      return [];
    }

    const entries = fs.readdirSync(LOG_DIR);
    const files: LogFileEntry[] = [];

    for (const entry of entries) {
      if (entry.endsWith('.log') || /\.\d+\.log$/.test(entry)) {
        const filePath = path.join(LOG_DIR, entry);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            files.push({
              name: entry,
              size: stat.size,
              lastModified: stat.mtime.toISOString(),
            });
          }
        } catch {}
      }
    }

    files.sort((a, b) => {
      if (a.name === 'app.log') {
        return -1;
      }
      if (b.name === 'app.log') {
        return 1;
      }
      return b.lastModified.localeCompare(a.lastModified);
    });

    return files;
  } catch {
    return [];
  }
}

function readLogFile(
  filename: string,
  tail: number = 100,
  search?: string,
  levelFilter?: number
): { content: string; totalLines: number } | null {
  const resolvedPath = path.resolve(LOG_DIR, filename);
  const normalizedLogDir = path.resolve(LOG_DIR);
  if (!resolvedPath.startsWith(normalizedLogDir)) {
    return null;
  }
  if (!fs.existsSync(resolvedPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    const allLines = content.split('\n').filter((l) => l.length > 0);
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

    let filtered = allLines;

    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter((l) => l.toLowerCase().includes(lowerSearch));
    }

    if (levelFilter !== undefined && levelFilter > 0) {
      filtered = filtered.filter((l) => {
        const match = l.match(/\[(DEBUG|INFO|WARN|ERROR)\]/);
        if (!match) {
          return true;
        }
        const lineLevel = levelNames.indexOf(match[1]!);
        return lineLevel >= levelFilter!;
      });
    }

    const tailed = filtered.slice(-tail);
    return { content: tailed.join('\n'), totalLines: allLines.length };
  } catch {
    return null;
  }
}

function deleteLogFile(filename?: string): boolean {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      return false;
    }

    if (filename) {
      const resolvedPath = path.resolve(LOG_DIR, filename);
      if (!resolvedPath.startsWith(path.resolve(LOG_DIR))) {
        return false;
      }
      fs.unlinkSync(resolvedPath);
      return true;
    }

    const entries = fs.readdirSync(LOG_DIR);
    for (const entry of entries) {
      if (entry.endsWith('.log') || /\.\d+\.log$/.test(entry)) {
        try {
          fs.unlinkSync(path.join(LOG_DIR, entry));
        } catch {}
      }
    }
    return true;
  } catch {
    return false;
  }
}

class LogsRoute extends AuthenticatedAPIRoute {
  protected async handleAuthenticated(request: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(request.url);
    const method = request.method;

    if (method === 'GET') {
      return this.handleGet(searchParams);
    }

    if (method === 'DELETE') {
      return this.handleDelete(searchParams);
    }

    return this.errorResponse('Method not allowed', 405);
  }

  private async handleGet(searchParams: URLSearchParams): Promise<NextResponse> {
    const file = searchParams.get('file');

    if (file) {
      const tailParam = searchParams.get('tail');
      const searchStr = searchParams.get('search');
      const levelParam = searchParams.get('level');

      const result = readLogFile(
        file,
        tailParam ? parseInt(tailParam, 10) || 100 : 100,
        searchStr || undefined,
        levelParam ? parseInt(levelParam, 10) || undefined : undefined
      );

      if (!result) {
        return this.errorResponse('日志文件不存在或无法读取', 404);
      }

      return this.successResponse({
        file,
        content: result.content,
        totalLines: result.totalLines,
      });
    }

    const files = listLogFiles();
    return this.successResponse({ files });
  }

  private async handleDelete(searchParams: URLSearchParams): Promise<NextResponse> {
    const file = searchParams.get('file') || undefined;
    const success = deleteLogFile(file);

    if (!success) {
      return this.errorResponse('删除日志文件失败', 500);
    }

    return this.successResponse({ deleted: true, file: file || null });
  }
}

export const GET = async (request: NextRequest) => {
  const route = new LogsRoute();
  return route.execute(request);
};

export const DELETE = async (request: NextRequest) => {
  const route = new LogsRoute();
  return route.execute(request);
};
