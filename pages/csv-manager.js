import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button, Table, Input, Space, Modal, message, Upload, Popconfirm } from 'antd';
import { UploadOutlined, DeleteOutlined, EditOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import axios from 'axios';

const { Search } = Input;

const CSVManager = () => {
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const router = useRouter();

  // 加载文件列表
  const loadFiles = async () => {
    try {
      const response = await axios.get('/api/csv/files');
      setFiles(response.data);
    } catch (error) {
      message.error('加载文件列表失败');
    }
  };

  // 加载CSV数据
  const loadCSVData = async (filename, page = 1, pageSize = 10) => {
    if (!filename) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/api/csv/read?file=${filename}&page=${page}&limit=${pageSize}`);
      setData(response.data.data);
      setPagination({
        ...pagination,
        total: response.data.total,
        current: page,
      });
    } catch (error) {
      message.error('加载CSV数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理文件上传
  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await axios.post('/api/csv/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      message.success('文件上传成功');
      loadFiles();
      return false; // 阻止默认上传行为
    } catch (error) {
      message.error('文件上传失败');
      return false;
    }
  };

  // 处理文件删除
  const handleDelete = async (filename) => {
    try {
      await axios.delete(`/api/csv/delete?file=${filename}`);
      message.success('文件删除成功');
      if (currentFile === filename) {
        setCurrentFile(null);
        setData([]);
      }
      loadFiles();
    } catch (error) {
      message.error('文件删除失败');
    }
  };

  // 处理表格变化（分页、排序等）
  const handleTableChange = (pagination, filters, sorter) => {
    loadCSVData(currentFile, pagination.current, pagination.pageSize);
  };

  // 导出为Excel
  const exportToExcel = () => {
    if (!data.length) return;
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${currentFile.replace('.csv', '')}.xlsx`);
  };

  // 初始化加载文件列表
  useEffect(() => {
    loadFiles();
  }, []);

  // 当选择文件变化时加载数据
  useEffect(() => {
    if (currentFile) {
      loadCSVData(currentFile);
    }
  }, [currentFile]);

  // 生成表格列
  const columns = data[0] 
    ? Object.keys(data[0]).map(key => ({
        title: key,
        dataIndex: key,
        key: key,
        sorter: (a, b) => {
          if (a[key] < b[key]) return -1;
          if (a[key] > b[key]) return 1;
          return 0;
        },
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
          <div style={{ padding: 8 }}>
            <Input
              placeholder={`搜索 ${key}`}
              value={selectedKeys[0]}
              onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
              onPressEnter={() => confirm()}
              style={{ width: 188, marginBottom: 8, display: 'block' }}
            />
            <Button
              type="primary"
              onClick={() => confirm()}
              size="small"
              style={{ width: 90, marginRight: 8 }}
            >
              搜索
            </Button>
            <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
              重置
            </Button>
          </div>
        ),
        filterIcon: filtered => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
        onFilter: (value, record) =>
          record[key] ? record[key].toString().toLowerCase().includes(value.toLowerCase()) : false,
      }))
    : [];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">CSV 文件管理</h1>
      
      <div className="flex justify-between mb-4">
        <div className="flex space-x-4">
          <Upload 
            accept=".csv"
            beforeUpload={handleUpload}
            showUploadList={false}
          >
            <Button type="primary" icon={<UploadOutlined />}>上传CSV</Button>
          </Upload>
          
          <Button 
            type="default" 
            icon={<DownloadOutlined />}
            onClick={exportToExcel}
            disabled={!currentFile}
          >
            导出Excel
          </Button>
        </div>
        
        <div>
          <Search 
            placeholder="搜索文件" 
            onSearch={value => setSearchText(value)}
            style={{ width: 200 }}
          />
        </div>
      </div>
      
      <div className="flex gap-4">
        {/* 文件列表 */}
        <div className="w-1/4 bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-4">文件列表</h2>
          <div className="space-y-2">
            {files
              .filter(file => file.toLowerCase().includes(searchText.toLowerCase()))
              .map(file => (
                <div 
                  key={file}
                  className={`p-2 rounded cursor-pointer hover:bg-gray-100 flex justify-between items-center ${
                    currentFile === file ? 'bg-blue-100' : ''
                  }`}
                  onClick={() => setCurrentFile(file)}
                >
                  <span className="truncate">{file}</span>
                  <Popconfirm
                    title="确定要删除这个文件吗？"
                    onConfirm={(e) => {
                      e.stopPropagation();
                      handleDelete(file);
                    }}
                    onClick={e => e.stopPropagation()}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button 
                      type="text" 
                      icon={<DeleteOutlined />} 
                      onClick={e => e.stopPropagation()}
                      danger
                    />
                  </Popconfirm>
                </div>
              ))}
          </div>
        </div>
        
        {/* 数据表格 */}
        <div className="flex-1 bg-white rounded shadow p-4">
          {currentFile ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">{currentFile}</h2>
                <div className="space-x-2">
                  <Button 
                    type="primary" 
                    icon={<EditOutlined />}
                    onClick={() => {
                      // 实现编辑功能
                    }}
                  >
                    编辑
                  </Button>
                </div>
              </div>
              
              <Table
                columns={columns}
                dataSource={data}
                rowKey={(record, index) => index}
                pagination={pagination}
                loading={loading}
                onChange={handleTableChange}
                scroll={{ x: 'max-content' }}
                bordered
              />
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              请从左侧选择或上传一个CSV文件
            </div>
          )}
        </div>
      </div>
      
      {/* 编辑模态框 */}
      <Modal
        title="编辑记录"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        {/* 编辑表单内容 */}
      </Modal>
    </div>
  );
};

export default CSVManager;
