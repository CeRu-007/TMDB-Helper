# CSV格式修复工具 (简化版)

## 问题描述

在TMDB-Import工具中，当某剧集的overview字段为空时，backdrop URL会错误地出现在overview列中，导致前端显示错误。

## 解决方案

本工具集提供了三种修复方法：

1. **quick-fix.bat** - 最简单的修复工具，仅使用PowerShell直接修复CSV文件
2. **fix-csv.bat** - 使用Node.js脚本修复CSV文件
3. **watch-csv.bat** - 监视模式，自动修复文件变化

## 快速使用

如果您遇到CSV文件格式问题，建议优先使用：

```
scripts\quick-fix.bat
```

这是最直接、最可靠的修复方式，不依赖于Node.js环境。

## 如何验证

修复后，确认以下几点：
1. 所有行数据列数相同
2. URL数据不应出现在overview列
3. 所有URL应正确显示在backdrop列中 