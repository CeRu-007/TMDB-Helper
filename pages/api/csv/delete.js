import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { file } = req.query;

  if (!file) {
    return res.status(400).json({ message: 'File name is required' });
  }

  try {
    const filePath = path.join(process.cwd(), 'data', file);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // 删除文件
    fs.unlinkSync(filePath);
    
    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
}
