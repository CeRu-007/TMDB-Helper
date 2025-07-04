// 测试导入功能的简单脚本
// 在浏览器控制台中运行

async function testImport() {
  console.log("开始测试导入功能...");
  
  // 创建测试数据
  const testData = {
    items: [
      {
        id: "test-1",
        title: "测试项目",
        mediaType: "tv",
        tmdbId: "12345",
        weekday: 1,
        completed: false,
        status: "ongoing",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    tasks: [],
    version: "1.0.0",
    exportDate: new Date().toISOString()
  };
  
  const jsonData = JSON.stringify(testData, null, 2);
  console.log("测试数据:", testData);
  
  try {
    // 测试验证功能
    console.log("1. 测试数据验证...");
    const validation = StorageManager.validateImportData(jsonData);
    console.log("验证结果:", validation);
    
    if (!validation.isValid) {
      console.error("验证失败:", validation.error);
      return;
    }
    
    // 测试导入功能
    console.log("2. 测试数据导入...");
    const importResult = await StorageManager.importData(jsonData);
    console.log("导入结果:", importResult);
    
    if (importResult.success) {
      console.log("✅ 导入成功!");
    } else {
      console.error("❌ 导入失败:", importResult.error);
    }
    
  } catch (error) {
    console.error("测试过程中发生错误:", error);
  }
}

// 运行测试
testImport();
