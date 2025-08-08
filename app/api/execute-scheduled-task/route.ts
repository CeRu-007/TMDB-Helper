import { NextRequest, NextResponse } from 'next/server';
import { StorageManager, TMDBItem, Season, Episode, ScheduledTask } from '@/lib/storage';
import { readItems } from '@/lib/server-storage';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { ServerConfigManager } from '@/lib/server-config-manager'

const execAsync = promisify(exec);

// 接口定义
interface ExecuteTaskRequest {
    taskId: string;
    itemId: string;
    action: {
import { ServerConfigManager } from '@/lib/server-config-manager'

        seasonNumber: number;
        autoUpload: boolean;
        autoRemoveMarked: boolean;
        autoConfirm?: boolean;
        removeAirDateColumn?: boolean;
        removeRuntimeColumn?: boolean;
        removeBackdropColumn?: boolean;
        autoMarkUploaded?: boolean;
    };
    metadata?: {
        tmdbId?: string;
        title?: string;
    };
}

/**
 * 执行TMDB-Import命令
 */
async function executeTMDBImportCommand(command: string, workingDirectory: string): Promise<{ stdout: string, stderr: string }> {
    try {
        // 确保工作目录存在
        if (!fs.existsSync(workingDirectory)) {
            throw new Error(`工作目录不存在: ${workingDirectory}`);
        }

        console.log(`[API] [执行命令] ${command} (在${workingDirectory})`);

        // 检查Python是否可用
        try {
            await execAsync('python --version');
        } catch (pythonError) {
            console.error('[API] Python不可用', pythonError);
            throw new Error('Python不可用，请确保已安装Python并添加到PATH中');
        }

        // 执行命令
        console.log(`[API] 开始执行命令: ${command}`);
        const { stdout, stderr } = await execAsync(command, {
            cwd: workingDirectory,
            timeout: 180000 // 设置3分钟超时
        });

        if (stderr) {
            console.warn(`[API] 命令执行产生stderr输出: ${stderr}`);
        }

        console.log(`[API] 命令执行完成，输出长度: ${stdout.length}字符`);
        console.log(`[API] 标准输出内容:`, stdout);
        if (stderr) {
            console.log(`[API] 标准错误内容:`, stderr);
        }
        return { stdout, stderr };
    } catch (error: any) {
        console.error('[API] 命令执行失败:', error);

        // 提供更详细的错误信息
        let errorMessage = error.message || '未知错误';
        if (error.code === 'ENOENT') {
            errorMessage = `找不到可执行文件: ${error.path}`;
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = '命令执行超时 (3分钟)';
        }

        return { stdout: '', stderr: `${errorMessage}\n${error.stack || ''}` };
    }
}
/**
 * 从输
出中解析CSV文件路径
 */
function parseCSVPathFromOutput(output: string): string | null {
    console.log(`[API] 尝试解析CSV路径，输出内容:`, output);

    // 尝试多种可能的输出格式
    const patterns = [
        /Saved to (.+\.csv)/i,                    // 原始格式: "Saved to xxx.csv"
        /(?:导出|输出|保存)(?:到|至)\s*(.+\.csv)/i,  // 中文格式: "导出到xxx.csv"
        /(?:Output|Export|Save)(?:ed)?\s+(?:to\s+)?(.+\.csv)/i, // 英文格式: "Output xxx.csv"
        /(.+\.csv)\s*(?:已保存|已创建|已生成)/i,        // 后置格式: "xxx.csv 已保存"
        /(?:文件|File):\s*(.+\.csv)/i,             // 文件格式: "文件: xxx.csv"
        /(.+\.csv)/g                              // 最后尝试: 任何.csv文件
    ];

    for (const pattern of patterns) {
        const match = output.match(pattern);
        if (match && match[1]) {
            const csvPath = match[1].trim();
            console.log(`[API] 找到CSV路径: ${csvPath} (使用模式: ${pattern})`);
            return csvPath;
        }
    }

    // 如果所有模式都失败，尝试查找输出中的所有csv文件
    const csvFiles = output.match(/\S+\.csv/g);
    if (csvFiles && csvFiles.length > 0) {
        const csvPath = csvFiles[csvFiles.length - 1]; // 使用最后一个找到的CSV文件
        console.log(`[API] 通过通用匹配找到CSV路径: ${csvPath}`);
        return csvPath;
    }

    console.warn(`[API] 无法解析CSV路径，完整输出:`, output);
    return null;
}

/**
 * 读取CSV文件内容
 */
async function readCSVFile(filePath: string): Promise<string> {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`CSV文件不存在: ${filePath}`);
        }
        return await fs.promises.readFile(filePath, 'utf-8');
    } catch (error) {
        console.error('读取CSV文件失败:', error);
        throw new Error(`无法读取CSV文件: ${filePath}`);
    }
}

/**
 * 解析CSV内容（增强版）
 */
function parseCSV(csvContent: string): { headers: string[], rows: string[][] } {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
        return { headers: [], rows: [] };
    }

    console.log(`[API] 开始解析CSV，总行数: ${lines.length}`);

    const headers = parseCSVLine(lines[0]);
    console.log(`[API] CSV表头: ${headers.join(' | ')}`);

    const rows: string[][] = [];

    for (let i = 1; i < lines.length; i++) {
        try {
            const row = parseCSVLine(lines[i]);

            // 验证行的字段数量
            if (row.length !== headers.length) {
                console.warn(`[API] 第${i + 1}行字段数量不匹配: 期望${headers.length}个，实际${row.length}个`);
                console.warn(`[API] 问题行内容: ${lines[i].substring(0, 100)}...`);

                // 尝试修复字段数量
                while (row.length < headers.length) {
                    row.push(''); // 补充空字段
                }
                while (row.length > headers.length) {
                    row.pop(); // 移除多余字段
                }
            }

            rows.push(row);
        } catch (error) {
            console.error(`[API] 解析第${i + 1}行失败:`, error);
            console.error(`[API] 问题行: ${lines[i]}`);
            // 跳过有问题的行
            continue;
        }
    }

    console.log(`[API] CSV解析完成: ${headers.length}列 x ${rows.length}行`);
    return { headers, rows };
}

/**
 * 解析CSV行（修复版）- 使用更可靠的CSV解析器
 */
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
        const char = line[i];

        if (char === '"') {
            if (!inQuotes) {
                // 开始引号
                inQuotes = true;
            } else {
                // 在引号内，检查下一个字符
                const nextChar = line[i + 1];
                if (nextChar === '"') {
                    // 转义引号 - 两个连续的引号表示一个引号字符
                    currentField += '"';
                    i++; // 跳过下一个引号
                } else {
                    // 结束引号
                    inQuotes = false;
                }
            }
        } else if (char === ',' && !inQuotes) {
            // 字段分隔符（不在引号内）
            result.push(currentField.trim());
            currentField = '';
        } else {
            // 普通字符
            currentField += char;
        }

        i++;
    }

    // 添加最后一个字段
    result.push(currentField.trim());

    return result;
}

/**
 * 将CSV数据转换为字符串
 */
function csvDataToString(data: { headers: string[], rows: string[][] }): string {
    const headerLine = data.headers.map(formatCSVField).join(',');
    const rowLines = data.rows.map(row => row.map(formatCSVField).join(','));
    return [headerLine, ...rowLines].join('\n');
}

/**
 * 格式化CSV字段
 */
function formatCSVField(value: string): string {
    // 如果字段包含逗号、引号或换行符，需要用引号包裹
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        // 将字段中的引号替换为两个引号
        const escaped = value.replace(/"/g, '""');
        return `"${escaped}"`;
    }
    return value;
}/**

* 自动删除已标记完成的集数（改进版：范围删除）
 */
function autoRemoveMarkedEpisodes(csvData: { headers: string[], rows: string[][] }, item: TMDBItem, isYoukuPlatform: boolean = false): { headers: string[], rows: string[][] } {
    // 如果没有集数数据或CSV数据为空，直接返回
    if (!item.episodes && (!item.seasons || item.seasons.length === 0) || csvData.rows.length === 0) {
        return csvData;
    }

    // 查找集数列的索引
    const episodeColumnIndex = csvData.headers.findIndex(
        header => header.toLowerCase().includes('episode') || header.toLowerCase().includes('集')
    );

    if (episodeColumnIndex === -1) {
        console.warn('无法找到CSV中的集数列');
        return csvData;
    }

    // 收集已完成的集数
    const completedEpisodes: number[] = [];

    // 处理多季情况
    if (item.seasons && item.seasons.length > 0) {
        item.seasons.forEach((season: Season) => {
            if (season.episodes) {
                season.episodes.forEach((episode: Episode) => {
                    if (episode.completed) {
                        completedEpisodes.push(episode.number);
                    }
                });
            }
        });
    } else if (item.episodes) {
        // 处理单季情况
        item.episodes.forEach((episode: Episode) => {
            if (episode.completed) {
                completedEpisodes.push(episode.number);
            }
        });
    }

    if (completedEpisodes.length === 0) {
        return csvData; // 没有已完成的集数
    }

    // 排序集数
    completedEpisodes.sort((a, b) => a - b);

    // 优酷特殊处理：删除已标记集数-1
    let episodesToRemove = [...completedEpisodes];
    if (isYoukuPlatform && episodesToRemove.length > 0) {
        // 移除最后一集，即只删除1到n-1集
        episodesToRemove.pop();
        console.log(`[API] 优酷平台特殊处理：原本要删除${completedEpisodes.length}集，实际删除${episodesToRemove.length}集`);
    }

    if (episodesToRemove.length === 0) {
        return csvData; // 优酷特殊处理后没有要删除的集数
    }

    console.log(`[API] 准备删除已完成的集数: ${episodesToRemove.join(', ')}`);

    // 使用范围删除策略
    const filteredRows = filterRowsByEpisodeRange(csvData.rows, episodeColumnIndex, episodesToRemove);

    console.log(`[API] CSV行数变化: ${csvData.rows.length} -> ${filteredRows.length} (删除了${csvData.rows.length - filteredRows.length}行)`);

    return {
        headers: csvData.headers,
        rows: filteredRows
    };
}

/**
 * 按集数范围过滤CSV行（修复版）
 */
function filterRowsByEpisodeRange(rows: string[][], episodeColumnIndex: number, episodesToRemove: number[]): string[][] {
    if (episodesToRemove.length === 0) {
        return rows;
    }

    console.log(`[API] 开始过滤CSV行，总行数: ${rows.length}, 集数列索引: ${episodeColumnIndex}`);
    console.log(`[API] 要删除的集数: ${episodesToRemove.join(', ')}`);

    // 创建要删除的集数Set，提高查找效率
    const episodesToRemoveSet = new Set(episodesToRemove);

    const filteredRows: string[][] = [];
    let deletedCount = 0;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        // 检查行是否完整
        if (episodeColumnIndex >= row.length) {
            console.log(`[API] 保留不完整的行${i}: 列数不足`);
            filteredRows.push(row);
            continue;
        }

        const episodeValue = row[episodeColumnIndex];
        const episodeNumber = extractEpisodeNumber(episodeValue);

        if (episodeNumber === null) {
            console.log(`[API] 保留无法解析集数的行 ${i}: "${episodeValue}"`);
            filteredRows.push(row);
            continue;
        }

        // 检查是否需要删除
        if (episodesToRemoveSet.has(episodeNumber)) {
            console.log(`[API] 删除第${episodeNumber}集的数据行${i}: "${episodeValue}"`);
            deletedCount++;
        } else {
            console.log(`[API] 保留第${episodeNumber}集的数据行${i}: "${episodeValue}"`);
            filteredRows.push(row);
        }
    }

    console.log(`[API] 过滤完成: 原始${rows.length}行 -> 保留${filteredRows.length}行 (删除${deletedCount}行)`);
    return filteredRows;
}

/**
 * 从文本中提取集数编号（增强版）
 */
function extractEpisodeNumber(episodeValue: string): number | null {
    if (!episodeValue) {
        return null;
    }

    const str = episodeValue.toString().trim();

    // 尝试直接转换数字
    if (/^\d+$/.test(str)) {
        return parseInt(str, 10);
    }

    // 常见的集数模式
    const patterns = [
        /第(\d+)集/,           // 第X集
        /第(\d+)话/,           // 第X话
        /EP(\d+)/i,            // EPX
        /Episode\s*(\d+)/i,    // Episode X
        /E(\d+)/i,             // EX
        /(\d+)$/,              // 以数字结尾
        /^(\d+)/,              // 以数字开头
    ];

    for (const pattern of patterns) {
        const match = str.match(pattern);
        if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num)) {
                return num;
            }
        }
    }

    // 提取所有数字，取第一个
    const numbers = str.match(/\d+/g);
    if (numbers && numbers.length > 0) {
        const num = parseInt(numbers[0], 10);
        if (!isNaN(num)) {
            return num;
        }
    }

    return null;
}

/**
 * 写入CSV文件
 */
async function writeCSVFile(filePath: string, content: string): Promise<void> {
    try {
        await fs.promises.writeFile(filePath, content, 'utf-8');
    } catch (error) {
        console.error('写入CSV文件失败:', error);
        throw new Error(`无法写入CSV文件: ${filePath}`);
    }
}

/**
 * 执行TMDB上传命令
 */
async function executeTMDBUpload(csvFilePath: string, workingDirectory: string, autoConfirm: boolean = false): Promise<{ stdout: string, stderr: string }> {
    // 构建上传命令
    let uploadCommand = `python -m tmdb-import.importor -f "${csvFilePath}"`;

    // 如果需要自动确认，使用echo y | 前缀
    if (autoConfirm) {
        uploadCommand = `echo y | ${uploadCommand}`;
    }

    return executeTMDBImportCommand(uploadCommand, workingDirectory);
}

/**
 * 从输出中提取已上传的集数
 */
function extractUploadedEpisodes(output: string): number[] {
    const uploadedEpisodes: number[] = [];
    const lines = output.split('\n');

    // 寻找上传成功的集数
    for (const line of lines) {
        // 匹配形如 "上传成功：第X集" 或 "Upload successful: Episode X" 的行
        const zhMatch = line.match(/上传成功：?第?(\d+)(?:集)?/);
        const enMatch = line.match(/Upload successful: (?:Episode )?(\d+)/i);

        if (zhMatch && zhMatch[1]) {
            uploadedEpisodes.push(parseInt(zhMatch[1], 10));
        } else if (enMatch && enMatch[1]) {
            uploadedEpisodes.push(parseInt(enMatch[1], 10));
        }
    }

    return uploadedEpisodes;
}

/**
 * 将成功上传的集数标记为已完成
 */
async function markEpisodesAsCompleted(item: TMDBItem, seasonNumber: number, episodeNumbers: number[]): Promise<TMDBItem | null> {
    if (episodeNumbers.length === 0) {
        return null; // 没有需要标记的集数
    }

    console.log(`[API] 将集数标记为已完成: 第${seasonNumber}季, 集数=${episodeNumbers.join(', ')}`);

    // 创建副本以避免直接修改原对象
    const updatedItem = JSON.parse(JSON.stringify(item)) as TMDBItem;
    let changed = false;

    // 处理多季情况
    if (updatedItem.seasons && updatedItem.seasons.length > 0) {
        // 找到目标季
        const targetSeason = updatedItem.seasons.find(s => s.seasonNumber === seasonNumber);

        if (targetSeason && targetSeason.episodes) {
            // 标记目标集数为已完成
            episodeNumbers.forEach(episodeNum => {
                const episode = targetSeason.episodes.find(e => e.number === episodeNum);
                if (episode && !episode.completed) {
                    episode.completed = true;
                    changed = true;
                }
            });
        }
    }
    // 处理单季情况（旧数据格式）
    else if (updatedItem.episodes) {
        // 标记目标集数为已完成
        episodeNumbers.forEach(episodeNum => {
            const episode = updatedItem.episodes!.find(e => e.number === episodeNum);
            if (episode && !episode.completed) {
                episode.completed = true;
                changed = true;
            }
        });
    }

    // 如果有更改，保存更新后的项目
    if (changed) {
        // 更新updatedAt字段
        updatedItem.updatedAt = new Date().toISOString();

        try {
            const success = await StorageManager.updateItem(updatedItem);
            if (success) {
                console.log(`[API] 成功更新项目: ${updatedItem.title}`);
                return updatedItem;
            } else {
                console.error(`[API] 更新项目失败: ${updatedItem.title}`);
                return null;
            }
        } catch (error) {
            console.error(`[API] 更新项目时出错:`, error);
            return null;
        }
    }

    return null; // 没有更改
}/**

* POST 处理程序
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    console.log('[API] 收到执行定时任务请求');

    try {
        // 解析请求体
        const requestData: ExecuteTaskRequest = await request.json();

        // 验证请求参数
        if (!requestData || !requestData.taskId || !requestData.action) {
            return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
        }

        console.log(`[API] 执行定时任务: taskId=${requestData.taskId}, itemId=${requestData.itemId}, 第${requestData.action.seasonNumber}季`);

        // 记录额外元数据（如果存在）
        if (requestData.metadata) {
            console.log(`[API] 附加元数据: tmdbId=${requestData.metadata.tmdbId || '未提供'}, title="${requestData.metadata.title || '未提供'}"`);
        }

        // 获取所有项目，用于后续各种情况
        // 优先使用服务器端存储，确保数据一致性
        let items: TMDBItem[] = [];
        try {
            items = readItems(); // 直接从服务器端文件读取
            console.log(`[API] 从服务器存储读取了${items.length} 个项目`);
        } catch (serverError) {
            console.warn(`[API] 服务器存储读取失败，尝试StorageManager:`, serverError);
            // 如果服务器存储失败，回退到StorageManager
            items = await StorageManager.getItemsWithRetry();
            console.log(`[API] 从StorageManager获取了${items.length} 个项目`);
        }

        // 添加零项目保护 - 如果系统中没有任何项目，直接返回错误
        if (items.length === 0) {
            console.error('[API] 系统中没有可用项目，无法继续执行');
            return NextResponse.json({
                success: false,
                error: "系统中没有可用项目",
                suggestion: "请先添加至少一个项目，然后再尝试执行任务"
            }, { status: 500 });
        }

        let foundValidItem = false;
        let item = null;

        // 首先尝试通过ID直接查找
        if (requestData.itemId) {
            item = items.find(i => i.id === requestData.itemId);

            // 如果直接通过ID找到了项目，标记为有效
            if (item) {
                console.log(`[API] 通过ID直接找到项目: ${item.title} (ID: ${item.id})`);
                foundValidItem = true;

                // 验证平台URL
                if (!item.platformUrl) {
                    console.error(`[API] 错误: 项目 ${item.title} (ID: ${item.id}) 缺少平台URL`);
                    return NextResponse.json({
                        success: false,
                        error: `项目 ${item.title} 没有设置平台URL`,
                        suggestion: "请先在项目设置中添加平台URL"
                    }, { status: 400 });
                }
            } else {
                console.warn(`[API] 通过ID ${requestData.itemId} 未找到项目，尝试其他方法`);
            }
        } else {
            console.warn(`[API] 请求中无有效itemId，将尝试从其他信息中查找项目`);
        }

        // 如果没有通过ID找到项目，尝试通过元数据查找
        if (!foundValidItem && requestData.metadata) {
            console.log(`[API] 尝试通过元数据查找项目`);

            // 通过TMDB ID查找
            if (requestData.metadata.tmdbId) {
                const matchByTmdbId = items.find(i => i.tmdbId === requestData.metadata?.tmdbId);
                if (matchByTmdbId) {
                    console.log(`[API] 通过TMDB ID ${requestData.metadata.tmdbId} 找到项目: ${matchByTmdbId.title} (ID: ${matchByTmdbId.id})`);
                    item = matchByTmdbId;
                    requestData.itemId = matchByTmdbId.id;
                    foundValidItem = true;
                }
            }

            // 如果TMDB ID没找到，尝试通过标题查找
            if (!foundValidItem && requestData.metadata.title) {
                const title = requestData.metadata.title;
                const matchByTitle = items.find(i =>
                    i.title === title ||
                    (i.title.includes(title) && i.title.length - title.length < 10) ||
                    (title.includes(i.title) && title.length - i.title.length < 10)
                );

                if (matchByTitle) {
                    console.log(`[API] 通过标题 "${title}" 找到项目: ${matchByTitle.title} (ID: ${matchByTitle.id})`);
                    item = matchByTitle;
                    requestData.itemId = matchByTitle.id;
                    foundValidItem = true;
                }
            }
        }

        // 如果所有方法都失败，使用最近创建的项目作为最后手段
        if (!foundValidItem) {
            console.warn(`[API] 所有匹配方法均失败，使用最近创建的项目作为备用`);

            // 按创建时间排序
            const sortedItems = [...items].sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            if (sortedItems.length > 0) {
                const fallbackItem = sortedItems[0];
                console.log(`[API] 使用最近创建的项目: ${fallbackItem.title} (ID: ${fallbackItem.id})`);
                requestData.itemId = fallbackItem.id;
                item = fallbackItem;
                foundValidItem = true;
            } else {
                // 这种情况理论上不应该发生，因为我们前面已经检查了items.length > 0
                // 但为了健壮性，仍然保留此检查
                return NextResponse.json({
                    error: "系统中没有可用项目",
                    suggestion: "请先添加至少一个项目，然后再尝试执行任务"
                }, { status: 500 });
            }
        }

        // 最终检查是否找到有效项目
        if (!item || !foundValidItem) {
            console.error(`[API] 无法为请求找到有效项目，itemId=${requestData.itemId}`);
            return NextResponse.json({
                error: `无法找到有效项目`,
                suggestion: '请检查项目是否存在或重新创建任务'
            }, { status: 404 });
        }

        // 验证项目信息
        if (!item.tmdbId) {
            return NextResponse.json({ error: `项目 ${item.title} 缺少TMDB ID` }, { status: 400 });
        }

        if (!item.platformUrl) {
            return NextResponse.json({ error: `项目 ${item.title} 缺少平台URL` }, { status: 400 });
        }

        // 检查项目是否有指定的季数
        if (requestData.action.seasonNumber > 0 && item.mediaType === 'tv') {
            if (!item.seasons || !item.seasons.some(s => s.seasonNumber === requestData.action.seasonNumber)) {
                return NextResponse.json({
                    error: `项目 ${item.title} 没有第${requestData.action.seasonNumber} 季`
                }, { status: 400 });
            }
        }

        // 查找TMDB-Import目录（从服务端配置读取，未配置时回退）
        const configuredPath = ServerConfigManager.getConfigItem('tmdbImportPath') as string | undefined
        const tmdbImportDir = configuredPath ? configuredPath : path.resolve(process.cwd(), 'TMDB-Import-master');
        if (!fs.existsSync(tmdbImportDir)) {
            return NextResponse.json({
                error: '找不到TMDB-Import目录',
                suggestion: configuredPath ? `请检查配置的路径是否存在: ${configuredPath}` : '请在设置中配置 TMDB-Import 路径或确保 TMDB-Import-master 目录存在'
            }, { status: 500 });
        }

        // 构建导出命令
        let extractCommand = `python -m tmdb-import.extractor -u "${item.platformUrl}" -s ${requestData.action.seasonNumber}`;

        // 执行导出命令
        const { stdout, stderr } = await executeTMDBImportCommand(extractCommand, tmdbImportDir);

        // 检查是否有错误
        if (stderr && !stdout) {
            return NextResponse.json({
                error: '执行TMDB导出命令失败',
                details: stderr,
                command: extractCommand
            }, { status: 500 });
        }

        // 从输出中解析CSV文件路径
        let csvPath = parseCSVPathFromOutput(stdout);

        // 如果无法从输出解析，尝试查找工作目录中最新的CSV文件
        if (!csvPath) {
            console.warn(`[API] 无法从输出解析CSV路径，尝试查找最新的CSV文件`);
            try {
                const files = await fs.promises.readdir(tmdbImportDir);
                const csvFiles = files.filter(file => file.endsWith('.csv'));

                if (csvFiles.length > 0) {
                    // 按修改时间排序，获取最新的CSV文件
                    const csvFilesWithStats = await Promise.all(
                        csvFiles.map(async file => {
                            const filePath = path.join(tmdbImportDir, file);
                            const stats = await fs.promises.stat(filePath);
                            return { file, mtime: stats.mtime };
                        })
                    );

                    csvFilesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
                    csvPath = csvFilesWithStats[0].file;
                    console.log(`[API] 找到最新的CSV文件: ${csvPath}`);
                }
            } catch (dirError) {
                console.error(`[API] 查找CSV文件失败:`, dirError);
            }
        }

        if (!csvPath) {
            console.error(`[API] 无法解析CSV路径，完整输出:`, stdout);
            console.error(`[API] 错误输出:`, stderr);

            return NextResponse.json({
                error: '无法从输出中找到CSV文件路径',
                details: {
                    stdout: stdout.substring(0, 1000) + (stdout.length > 1000 ? '...' : ''),
                    stderr: stderr.substring(0, 500) + (stderr.length > 500 ? '...' : ''),
                    command: extractCommand,
                    workingDir: tmdbImportDir
                }
            }, { status: 500 });
        }

        // 构建CSV文件的绝对路径
        let csvAbsolutePath: string;
        if (path.isAbsolute(csvPath)) {
            csvAbsolutePath = csvPath;
        } else {
            csvAbsolutePath = path.resolve(tmdbImportDir, csvPath);
        }

        console.log(`[API] CSV文件路径: ${csvAbsolutePath}`);

        // 验证CSV文件是否存在
        if (!fs.existsSync(csvAbsolutePath)) {
            console.error(`[API] CSV文件不存在: ${csvAbsolutePath}`);
            return NextResponse.json({
                error: 'CSV文件不存在',
                details: {
                    expectedPath: csvAbsolutePath,
                    parsedPath: csvPath,
                    workingDir: tmdbImportDir
                }
            }, { status: 500 });
        }

        // 如果需要自动过滤已完成的集数
        if (requestData.action.autoRemoveMarked) {
            try {
                // 读取CSV文件
                const csvContent = await readCSVFile(csvAbsolutePath);

                // 解析CSV内容
                const csvData = parseCSV(csvContent);

                // 检查是否是优酷平台
                const isYoukuPlatform = item.platformUrl.includes('youku.com');

                // 过滤已完成的集数
                const filteredData = autoRemoveMarkedEpisodes(csvData, item, isYoukuPlatform);

                // 将过滤后的数据写回CSV文件
                const filteredContent = csvDataToString(filteredData);
                await writeCSVFile(csvAbsolutePath, filteredContent);

                console.log(`[API] 已过滤已完成集数: 原始=${csvData.rows.length}行, 过滤后=${filteredData.rows.length}行`);
            } catch (error) {
                console.error('[API] 过滤已完成集数时出错:', error);
                // 继续执行，不中断流程
            }
        }

        // 处理列数据清空选项（修复后的逻辑）
        console.log(`[API] 检查列删除选项: removeAirDateColumn=${requestData.action.removeAirDateColumn}, removeRuntimeColumn=${requestData.action.removeRuntimeColumn}, removeBackdropColumn=${requestData.action.removeBackdropColumn}`);
        if (requestData.action.removeAirDateColumn || requestData.action.removeRuntimeColumn || requestData.action.removeBackdropColumn) {
            try {
                // 读取CSV文件
                const csvContent = await readCSVFile(csvAbsolutePath);

                // 解析CSV内容
                const csvData = parseCSV(csvContent);
                let modified = false;

                // 需要清空数据的列名映射
                const columnsToEmpty: { [key: string]: string[] } = {};

                if (requestData.action.removeAirDateColumn) {
                    columnsToEmpty['air_date'] = ['air_date', 'airdate', '播出日期', '首播日期'];
                }

                if (requestData.action.removeRuntimeColumn) {
                    columnsToEmpty['runtime'] = ['runtime', '时长', '分钟', 'duration', '片长'];
                }

                if (requestData.action.removeBackdropColumn) {
                    columnsToEmpty['backdrop'] = ['backdrop_path', 'backdrop', 'still_path', 'still', '分集图片', '背景图片', '剧照', 'episode_image'];
                }

                // 收集要清空数据的列索引
                const indicesToEmpty: number[] = [];

                Object.entries(columnsToEmpty).forEach(([type, possibleNames]) => {
                    possibleNames.forEach(name => {
                        const index = csvData.headers.findIndex(h =>
                            h.toLowerCase() === name.toLowerCase() ||
                            h.toLowerCase().includes(name.toLowerCase()) ||
                            name.toLowerCase().includes(h.toLowerCase())
                        );
                        if (index !== -1 && !indicesToEmpty.includes(index)) {
                            indicesToEmpty.push(index);
                            console.log(`[API] 找到要清空数据的${type}列: ${csvData.headers[index]} (索引: ${index})`);
                        } else if (index === -1) {
                            console.log(`[API] 未找到${type}列，搜索名称: ${name}，CSV表头: [${csvData.headers.join(', ')}]`);
                        }
                    });
                });

                if (indicesToEmpty.length > 0) {
                    indicesToEmpty.forEach(index => {
                        const columnName = csvData.headers[index];
                        // 保留表头，只清空所有行中对应列的数据
                        csvData.rows.forEach(row => {
                            if (index < row.length) {
                                row[index] = ''; // 清空数据，保留列结构和逗号分隔符
                            }
                        });
                        console.log(`[API] 已清空列数据: ${columnName}`);
                    });

                    // 将修改后的数据写回CSV文件
                    const modifiedContent = csvDataToString(csvData);
                    await writeCSVFile(csvAbsolutePath, modifiedContent);

                    console.log(`[API] 已清空 ${indicesToEmpty.length} 个列的数据，CSV文件已更新`);
                    modified = true;
                } else {
                    console.log(`[API] 未找到需要清空数据的列`);
                }
            } catch (error) {
                console.error('[API] 清空CSV列数据时出错:', error);
                // 继续执行，不中断流程
            }
        }

        // 如果需要自动上传
        if (requestData.action.autoUpload) {
            // 执行上传命令
            const uploadResult = await executeTMDBUpload(
                csvAbsolutePath,
                tmdbImportDir,
                !!requestData.action.autoConfirm
            );

            // 如果需要自动标记已上传的集数
            if (requestData.action.autoMarkUploaded) {
                // 从输出中提取成功上传的集数
                const uploadedEpisodes = extractUploadedEpisodes(uploadResult.stdout);

                if (uploadedEpisodes.length > 0) {
                    // 将上传成功的集数标记为已完成
                    await markEpisodesAsCompleted(item, requestData.action.seasonNumber, uploadedEpisodes);
                }
            }

            return NextResponse.json({
                success: true,
                message: '成功执行TMDB导入任务',
                csvPath: csvPath,
                uploadOutput: uploadResult.stdout.substring(0, 1000) + (uploadResult.stdout.length > 1000 ? '...' : '')
            });
        } else {
            // 如果不需要自动上传，只返回CSV路径
            return NextResponse.json({
                success: true,
                message: '成功执行TMDB导出任务',
                csvPath: csvPath
            });
        }
    } catch (error: any) {
        console.error('[API] 执行定时任务失败:', error);
        return NextResponse.json({
            error: '执行定时任务失败',
            message: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

/**
 * 为了兼容原有的GET请求方式，仍然保留GET处理程序
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    console.log('[API] 收到GET请求，建议改用POST方法');

    try {
        // 从URL参数中获取信息
        const url = new URL(request.url);
        const itemId = url.searchParams.get('itemId');
        const seasonNumber = parseInt(url.searchParams.get('seasonNumber') || '1', 10);
        const autoUpload = url.searchParams.get('autoUpload') === 'true';
        const autoRemoveMarked = url.searchParams.get('autoRemoveMarked') === 'true';
        const autoConfirm = url.searchParams.get('autoConfirm') === 'true';
        const removeAirDateColumn = url.searchParams.get('removeAirDateColumn') === 'true';
        const removeRuntimeColumn = url.searchParams.get('removeRuntimeColumn') === 'true';
        const removeBackdropColumn = url.searchParams.get('removeBackdropColumn') === 'true';
        const autoMarkUploaded = url.searchParams.get('autoMarkUploaded') !== 'false'; // 默认为true

        // 验证必要参数
        if (!itemId) {
            return NextResponse.json({ error: '缺少必要参数: itemId' }, { status: 400 });
        }

        // 检查系统中是否有项目
        let items: TMDBItem[] = [];
        try {
            items = readItems(); // 直接从服务器端文件读取
            console.log(`[API] GET请求从服务器存储读取了${items.length} 个项目`);
        } catch (serverError) {
            console.warn(`[API] GET请求服务器存储读取失败，尝试StorageManager:`, serverError);
            items = await StorageManager.getItemsWithRetry();
            console.log(`[API] GET请求从StorageManager获取了${items.length} 个项目`);
        }

        if (items.length === 0) {
            console.error('[API] GET请求处理错误: 系统中没有可用项目');
            return NextResponse.json({
                success: false,
                error: "系统中没有可用项目",
                suggestion: "请先添加至少一个项目，然后再尝试执行任务"
            }, { status: 500 });
        }

        // 模拟POST请求的请求体
        const requestData: ExecuteTaskRequest = {
            taskId: 'legacy-get-request',
            itemId,
            action: {
                seasonNumber,
                autoUpload,
                autoRemoveMarked,
                autoConfirm,
                removeAirDateColumn,
                removeRuntimeColumn,
                removeBackdropColumn,
                autoMarkUploaded
            }
        };

        // 直接调用POST处理程序，传递JSON数据
        return POST(new NextRequest(request.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        }));
    } catch (error: any) {
        console.error('[API] 处理GET请求失败:', error);
        return NextResponse.json({
            error: '处理请求失败',
            message: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}