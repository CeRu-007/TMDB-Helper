import { describe, it, expect } from 'vitest';
import {
  scheduleTaskToRow,
  scheduleTaskRowToScheduleTask,
  type ScheduleTask,
  type PlatformSourceConfig,
  type FieldCleanup,
} from '@/types/schedule';
import { mergeMultiPlatformCSVs, type PlatformCSVResult } from '@/lib/scheduler/csv-cleaner';

describe('多平台模式端到端测试', () => {
  describe('完整流程模拟：配置 → 保存 → 加载 → 执行 → 合并', () => {
    it('流程1：用户配置双平台，保存后加载，验证配置完整', () => {
      // 1. 用户在UI配置双平台
      const userConfig: PlatformSourceConfig[] = [
        {
          url: 'https://www.mgtv.com/123.html',
          enabled: true,
          keepFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
        },
        {
          url: 'https://tv.cctv.com/456.html',
          enabled: true,
          keepFields: {
            name: false,
            air_date: false,
            runtime: false,
            overview: true,
            backdrop: false,
          },
        },
      ];

      // 2. 创建任务（模拟API POST）
      const task: ScheduleTask = {
        id: 'task-001',
        itemId: 'item-001',
        cron: '0 2 * * *',
        enabled: true,
        headless: true,
        incremental: true,
        autoImport: false,
        tmdbSeason: 1,
        tmdbLanguage: 'zh-CN',
        tmdbAutoResponse: 'w',
        fieldCleanup: {
          name: false,
          air_date: false,
          runtime: false,
          overview: false,
          backdrop: false,
        },
        checkMetadataCompleteness: false,
        cleanFakeTitles: false,
        platformUrl: 'https://www.mgtv.com/123.html',
        platformConfigs: userConfig,
        lastRunAt: null,
        nextRunAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 3. 序列化到数据库行（模拟DB存储）
      const dbRow = scheduleTaskToRow(task);
      expect(dbRow.platformConfigs).toBe(JSON.stringify(userConfig));
      expect(dbRow.platformUrl).toBe('https://www.mgtv.com/123.html');

      // 4. 从数据库行反序列化（模拟DB加载）
      const loadedTask = scheduleTaskRowToScheduleTask(dbRow);
      expect(loadedTask.platformConfigs).toEqual(userConfig);
      expect(loadedTask.platformConfigs?.length).toBe(2);
      expect(loadedTask.platformConfigs?.[0].enabled).toBe(true);
      expect(loadedTask.platformConfigs?.[1].keepFields.overview).toBe(true);
      expect(loadedTask.platformConfigs?.[1].keepFields.name).toBe(false);

      // 5. 验证执行器路由逻辑：2个启用的平台 → 多平台模式
      const enabledPlatforms = loadedTask.platformConfigs?.filter((s) => s.enabled) || [];
      expect(enabledPlatforms.length).toBe(2);
    });

    it('流程2：用户配置三平台，其中一个禁用', () => {
      const userConfig: PlatformSourceConfig[] = [
        {
          url: 'https://www.mgtv.com/123.html',
          enabled: true,
          keepFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
        },
        {
          url: 'https://tv.cctv.com/456.html',
          enabled: true,
          keepFields: {
            name: false,
            air_date: false,
            runtime: false,
            overview: true,
            backdrop: false,
          },
        },
        {
          url: 'https://www.iqiyi.com/789.html',
          enabled: false,
          keepFields: {
            name: false,
            air_date: false,
            runtime: false,
            overview: false,
            backdrop: true,
          },
        },
      ];

      const task: ScheduleTask = {
        id: 'task-002',
        itemId: 'item-002',
        cron: '0 3 * * *',
        enabled: true,
        headless: true,
        incremental: true,
        autoImport: false,
        tmdbSeason: 1,
        tmdbLanguage: 'zh-CN',
        tmdbAutoResponse: 'w',
        fieldCleanup: {
          name: false,
          air_date: false,
          runtime: false,
          overview: false,
          backdrop: false,
        },
        checkMetadataCompleteness: false,
        cleanFakeTitles: false,
        platformConfigs: userConfig,
        lastRunAt: null,
        nextRunAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const dbRow = scheduleTaskToRow(task);
      const loadedTask = scheduleTaskRowToScheduleTask(dbRow);

      // 验证只有2个启用的平台参与执行
      const enabledPlatforms = loadedTask.platformConfigs?.filter((s) => s.enabled) || [];
      expect(enabledPlatforms.length).toBe(2);
      expect(enabledPlatforms[0].url).toBe('https://www.mgtv.com/123.html');
      expect(enabledPlatforms[1].url).toBe('https://tv.cctv.com/456.html');
    });
  });

  describe('CSV合并完整流程测试', () => {
    it('流程3：双平台CSV合并 - 字段保留验证', () => {
      // 模拟芒果TV的CSV（主源）
      const mgtvCSV = `episode_number,name,air_date,runtime,overview,backdrop
1,第1集,2024-01-01,45,芒果简介,http://mgtv.jpg
2,第2集,2024-01-08,45,芒果简介2,http://mgtv2.jpg
3,第3集,2024-01-15,45,,http://mgtv3.jpg`;

      // 模拟CCTV的CSV（副源）
      const cctvCSV = `episode_number,name,air_date,runtime,overview,backdrop
1,Episode 1,2024-01-01,40,CCTV简介,http://cctv.jpg
2,Episode 2,2024-01-08,40,CCTV简介2,http://cctv2.jpg
3,Episode 3,2024-01-15,40,CCTV简介3,http://cctv3.jpg`;

      const results: PlatformCSVResult[] = [
        {
          url: 'https://www.mgtv.com/123.html',
          csvContent: mgtvCSV,
          keptFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
        },
        {
          url: 'https://tv.cctv.com/456.html',
          csvContent: cctvCSV,
          keptFields: {
            name: false,
            air_date: false,
            runtime: false,
            overview: true,
            backdrop: false,
          },
        },
      ];

      const merged = mergeMultiPlatformCSVs(results);
      const lines = merged.split('\n');

      // 验证标题行
      expect(lines[0]).toBe('episode_number,name,air_date,runtime,overview,backdrop');

      // 验证第1集：name保留芒果，overview保留芒果（有值）
      expect(lines[1]).toContain('第1集');
      expect(lines[1]).toContain('芒果简介');

      // 验证第2集：同上
      expect(lines[2]).toContain('第2集');
      expect(lines[2]).toContain('芒果简介2');

      // 验证第3集：name保留芒果，overview芒果为空应从CCTV填充
      expect(lines[3]).toContain('第3集');
      expect(lines[3]).toContain('CCTV简介3');
    });

    it('流程4：三平台CSV合并 - 多字段来源验证', () => {
      // 芒果TV：提供name和air_date
      const csv1 = `episode_number,name,air_date,runtime,overview,backdrop
1,第1集,2024-01-01,45,,`;

      // CCTV：提供overview
      const csv2 = `episode_number,name,air_date,runtime,overview,backdrop
1,Episode 1,2024-01-01,40,CCTV简介,http://cctv.jpg`;

      // 爱奇艺：提供backdrop
      const csv3 = `episode_number,name,air_date,runtime,overview,backdrop
1,エピソード1,2024-01-01,50,,http://iqiyi.jpg`;

      const results: PlatformCSVResult[] = [
        {
          url: 'https://www.mgtv.com/123.html',
          csvContent: csv1,
          keptFields: {
            name: true,
            air_date: true,
            runtime: true,
            overview: false,
            backdrop: false,
          },
        },
        {
          url: 'https://tv.cctv.com/456.html',
          csvContent: csv2,
          keptFields: {
            name: false,
            air_date: false,
            runtime: false,
            overview: true,
            backdrop: false,
          },
        },
        {
          url: 'https://www.iqiyi.com/789.html',
          csvContent: csv3,
          keptFields: {
            name: false,
            air_date: false,
            runtime: false,
            overview: false,
            backdrop: true,
          },
        },
      ];

      const merged = mergeMultiPlatformCSVs(results);
      const lines = merged.split('\n');
      const fields = lines[1].split(',');

      // name: 从芒果TV（第1个字段）
      expect(fields[1]).toBe('第1集');
      // air_date: 从芒果TV
      expect(fields[2]).toBe('2024-01-01');
      // runtime: 从芒果TV（45）
      expect(fields[3]).toBe('45');
      // overview: 从CCTV（芒果为空）
      expect(fields[4]).toBe('CCTV简介');
      // backdrop: 从爱奇艺（芒果和CCTV都为空）
      expect(fields[5]).toBe('http://iqiyi.jpg');
    });

    it('流程5：副源有更多集数时，以主源为基准', () => {
      const primaryCSV = `episode_number,name,air_date,runtime,overview,backdrop
1,第1集,2024-01-01,45,简介1,http://primary.jpg
2,第2集,2024-01-08,45,简介2,http://primary2.jpg`;

      const secondaryCSV = `episode_number,name,air_date,runtime,overview,backdrop
1,Episode 1,2024-01-01,40,Overview1,http://secondary.jpg
2,Episode 2,2024-01-08,40,Overview2,http://secondary2.jpg
3,Episode 3,2024-01-15,40,Overview3,http://secondary3.jpg
4,Episode 4,2024-01-22,40,Overview4,http://secondary4.jpg`;

      const results: PlatformCSVResult[] = [
        {
          url: 'https://www.mgtv.com/123.html',
          csvContent: primaryCSV,
          keptFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
        },
        {
          url: 'https://tv.cctv.com/456.html',
          csvContent: secondaryCSV,
          keptFields: {
            name: false,
            air_date: false,
            runtime: false,
            overview: true,
            backdrop: true,
          },
        },
      ];

      const merged = mergeMultiPlatformCSVs(results);
      const lines = merged.split('\n');

      // 主源只有2集，合并后应该只有2集
      expect(lines.length).toBe(3); // header + 2 rows
      expect(lines[1]).toContain('第1集');
      expect(lines[2]).toContain('第2集');
    });

    it('流程6：所有字段都为空时，从副源填充', () => {
      const primaryCSV = `episode_number,name,air_date,runtime,overview,backdrop
1,,,45,,`;

      const secondaryCSV = `episode_number,name,air_date,runtime,overview,backdrop
1,Episode 1,2024-01-01,40,Overview,http://img.jpg`;

      const results: PlatformCSVResult[] = [
        {
          url: 'https://www.mgtv.com/123.html',
          csvContent: primaryCSV,
          keptFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
        },
        {
          url: 'https://tv.cctv.com/456.html',
          csvContent: secondaryCSV,
          keptFields: {
            name: true,
            air_date: true,
            runtime: false,
            overview: true,
            backdrop: true,
          },
        },
      ];

      const merged = mergeMultiPlatformCSVs(results);
      const lines = merged.split('\n');
      const fields = lines[1].split(',');

      // name: 主源为空，副源有值且启用 → 填充
      expect(fields[1]).toBe('Episode 1');
      // air_date: 主源为空，副源有值且启用 → 填充
      expect(fields[2]).toBe('2024-01-01');
      // runtime: 主源有值（45），副源未启用 → 保留主源
      expect(fields[3]).toBe('45');
      // overview: 主源为空，副源有值且启用 → 填充
      expect(fields[4]).toBe('Overview');
      // backdrop: 主源为空，副源有值且启用 → 填充
      expect(fields[5]).toBe('http://img.jpg');
    });
  });

  describe('边界情况测试', () => {
    it('边界1：platformConfigs为undefined时降级到单平台模式', () => {
      const task: ScheduleTask = {
        id: 'task-003',
        itemId: 'item-003',
        cron: '0 2 * * *',
        enabled: true,
        headless: true,
        incremental: true,
        autoImport: false,
        tmdbSeason: 1,
        tmdbLanguage: 'zh-CN',
        tmdbAutoResponse: 'w',
        fieldCleanup: {
          name: false,
          air_date: false,
          runtime: false,
          overview: false,
          backdrop: false,
        },
        checkMetadataCompleteness: false,
        cleanFakeTitles: false,
        platformUrl: 'https://www.mgtv.com/123.html',
        // platformConfigs 未设置
        lastRunAt: null,
        nextRunAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const dbRow = scheduleTaskToRow(task);
      const loadedTask = scheduleTaskRowToScheduleTask(dbRow);

      // platformConfigs应为undefined
      expect(loadedTask.platformConfigs).toBeUndefined();

      // 启用的平台数为0，应降级到单平台模式
      const enabledPlatforms = loadedTask.platformConfigs?.filter((s) => s.enabled) || [];
      expect(enabledPlatforms.length).toBe(0);
    });

    it('边界2：platformConfigs为空数组时降级到单平台模式', () => {
      const task: ScheduleTask = {
        id: 'task-004',
        itemId: 'item-004',
        cron: '0 2 * * *',
        enabled: true,
        headless: true,
        incremental: true,
        autoImport: false,
        tmdbSeason: 1,
        tmdbLanguage: 'zh-CN',
        tmdbAutoResponse: 'w',
        fieldCleanup: {
          name: false,
          air_date: false,
          runtime: false,
          overview: false,
          backdrop: false,
        },
        checkMetadataCompleteness: false,
        cleanFakeTitles: false,
        platformConfigs: [],
        lastRunAt: null,
        nextRunAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const dbRow = scheduleTaskToRow(task);
      const loadedTask = scheduleTaskRowToScheduleTask(dbRow);

      expect(loadedTask.platformConfigs).toEqual([]);

      const enabledPlatforms = loadedTask.platformConfigs?.filter((s) => s.enabled) || [];
      expect(enabledPlatforms.length).toBe(0);
    });

    it('边界3：所有平台都禁用时降级到单平台模式', () => {
      const task: ScheduleTask = {
        id: 'task-005',
        itemId: 'item-005',
        cron: '0 2 * * *',
        enabled: true,
        headless: true,
        incremental: true,
        autoImport: false,
        tmdbSeason: 1,
        tmdbLanguage: 'zh-CN',
        tmdbAutoResponse: 'w',
        fieldCleanup: {
          name: false,
          air_date: false,
          runtime: false,
          overview: false,
          backdrop: false,
        },
        checkMetadataCompleteness: false,
        cleanFakeTitles: false,
        platformConfigs: [
          {
            url: 'https://a.com',
            enabled: false,
            keepFields: {
              name: true,
              air_date: true,
              runtime: true,
              overview: true,
              backdrop: true,
            },
          },
          {
            url: 'https://b.com',
            enabled: false,
            keepFields: {
              name: true,
              air_date: true,
              runtime: true,
              overview: true,
              backdrop: true,
            },
          },
        ],
        lastRunAt: null,
        nextRunAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const dbRow = scheduleTaskToRow(task);
      const loadedTask = scheduleTaskRowToScheduleTask(dbRow);

      const enabledPlatforms = loadedTask.platformConfigs?.filter((s) => s.enabled) || [];
      expect(enabledPlatforms.length).toBe(0);
    });

    it('边界4：只有一个平台启用时降级到单平台模式', () => {
      const task: ScheduleTask = {
        id: 'task-006',
        itemId: 'item-006',
        cron: '0 2 * * *',
        enabled: true,
        headless: true,
        incremental: true,
        autoImport: false,
        tmdbSeason: 1,
        tmdbLanguage: 'zh-CN',
        tmdbAutoResponse: 'w',
        fieldCleanup: {
          name: false,
          air_date: false,
          runtime: false,
          overview: false,
          backdrop: false,
        },
        checkMetadataCompleteness: false,
        cleanFakeTitles: false,
        platformConfigs: [
          {
            url: 'https://a.com',
            enabled: true,
            keepFields: {
              name: true,
              air_date: true,
              runtime: true,
              overview: true,
              backdrop: true,
            },
          },
          {
            url: 'https://b.com',
            enabled: false,
            keepFields: {
              name: true,
              air_date: true,
              runtime: true,
              overview: true,
              backdrop: true,
            },
          },
        ],
        lastRunAt: null,
        nextRunAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const dbRow = scheduleTaskToRow(task);
      const loadedTask = scheduleTaskRowToScheduleTask(dbRow);

      const enabledPlatforms = loadedTask.platformConfigs?.filter((s) => s.enabled) || [];
      // 只有1个启用，应降级到单平台模式
      expect(enabledPlatforms.length).toBe(1);
    });

    it('边界5：CSV合并时副源缺少某些字段', () => {
      const primaryCSV = `episode_number,name,air_date,runtime,overview,backdrop
1,第1集,2024-01-01,45,简介,`;

      // 副源缺少air_date和runtime列
      const secondaryCSV = `episode_number,name,overview
1,Episode 1,Overview from B`;

      const results: PlatformCSVResult[] = [
        {
          url: 'https://a.com',
          csvContent: primaryCSV,
          keptFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
        },
        {
          url: 'https://b.com',
          csvContent: secondaryCSV,
          keptFields: {
            name: false,
            air_date: false,
            runtime: false,
            overview: true,
            backdrop: false,
          },
        },
      ];

      const merged = mergeMultiPlatformCSVs(results);
      const lines = merged.split('\n');

      // 输出应使用主源的header
      expect(lines[0]).toBe('episode_number,name,air_date,runtime,overview,backdrop');
      // 第1集：overview主源有值，保留
      expect(lines[1]).toContain('简介');
    });
  });

  describe('数据完整性测试', () => {
    it('完整性1：keepFields所有字段都为false时，不从副源填充任何字段', () => {
      const primaryCSV = `episode_number,name,air_date,runtime,overview,backdrop
1,第1集,2024-01-01,45,,`;

      const secondaryCSV = `episode_number,name,air_date,runtime,overview,backdrop
1,Episode 1,2024-01-01,40,Overview,http://img.jpg`;

      const results: PlatformCSVResult[] = [
        {
          url: 'https://a.com',
          csvContent: primaryCSV,
          keptFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
        },
        {
          url: 'https://b.com',
          csvContent: secondaryCSV,
          keptFields: {
            name: false,
            air_date: false,
            runtime: false,
            overview: false,
            backdrop: false,
          },
        },
      ];

      const merged = mergeMultiPlatformCSVs(results);
      const lines = merged.split('\n');
      const fields = lines[1].split(',');

      // overview主源为空，副源有值但未启用 → 保持空
      expect(fields[4]).toBe('');
      // backdrop主源为空，副源有值但未启用 → 保持空
      expect(fields[5]).toBe('');
    });

    it('完整性2：副源数据不应覆盖主源已有数据', () => {
      const primaryCSV = `episode_number,name,air_date,runtime,overview,backdrop
1,主源名称,2024-01-01,45,主源简介,http://主源.jpg`;

      const secondaryCSV = `episode_number,name,air_date,runtime,overview,backdrop
1,副源名称,2024-02-02,40,副源简介,http://副源.jpg`;

      const results: PlatformCSVResult[] = [
        {
          url: 'https://a.com',
          csvContent: primaryCSV,
          keptFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
        },
        {
          url: 'https://b.com',
          csvContent: secondaryCSV,
          keptFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
        },
      ];

      const merged = mergeMultiPlatformCSVs(results);
      const lines = merged.split('\n');

      // 所有字段都应保留主源值
      expect(lines[1]).toContain('主源名称');
      expect(lines[1]).toContain('2024-01-01');
      expect(lines[1]).toContain('45');
      expect(lines[1]).toContain('主源简介');
      expect(lines[1]).toContain('http://主源.jpg');
    });
  });
});
