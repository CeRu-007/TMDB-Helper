import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 确保data目录存在
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const form = new formidable.IncomingForm();
    form.uploadDir = dataDir;
    form.keepExtensions = true;

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Error parsing form data:', err);
        return res.status(500).json({ message: 'Error uploading file' });
      }

      const file = files.file;
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // 确保文件是CSV格式
      if (!file.originalFilename.endsWith('.csv')) {
        // 删除上传的非CSV文件
        fs.unlinkSync(file.filepath);
        return res.status(400).json({ message: 'Only CSV files are allowed' });
      }

      // 构建新文件路径
      const newPath = path.join(dataDir, file.originalFilename);
      
      // 如果目标文件已存在，先删除
      if (fs.existsSync(newPath)) {
        fs.unlinkSync(newPath);
      }

      // 重命名文件
      fs.renameSync(file.filepath, newPath);

      res.status(200).json({ filename: file.originalFilename });
    });
  } catch (error) {
    console.error('Error handling file upload:', error);
    res.status(500).json({ message: 'Error handling file upload' });
  }
}
