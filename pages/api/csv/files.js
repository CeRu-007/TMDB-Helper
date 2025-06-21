import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 确保data目录存在
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 读取data目录下的所有CSV文件
    const files = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.csv'))
      .map(file => ({
        name: file,
        path: path.join(dataDir, file),
        size: fs.statSync(path.join(dataDir, file)).size,
        mtime: fs.statSync(path.join(dataDir, file)).mtime
      }));

    res.status(200).json(files.map(f => f.name));
  } catch (error) {
    console.error('Error reading files:', error);
    res.status(500).json({ message: 'Error reading files' });
  }
}
