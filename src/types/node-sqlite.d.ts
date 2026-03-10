/**
 * Node.js 内置 SQLite 模块类型定义
 * 用于 node:sqlite 模块
 */

declare module 'node:sqlite' {
  /**
   * 同步数据库连接类
   */
  export class DatabaseSync {
    /**
     * 创建或打开数据库连接
     * @param path 数据库文件路径，使用 ':memory:' 创建内存数据库
     */
    constructor(path: string);

    /**
     * 执行 SQL 语句（不返回结果）
     * @param sql SQL 语句
     */
    exec(sql: string): void;

    /**
     * 准备 SQL 语句
     * @param sql SQL 语句
     * @returns 准备好的语句对象
     */
    prepare(sql: string): StatementSync;

    /**
     * 关闭数据库连接
     */
    close(): void;

    /**
     * 是否已打开
     */
    readonly open: boolean;
  }

  /**
   * 同步预处理语句类
   */
  export class StatementSync {
    /**
     * 执行查询并返回所有结果
     * @param params 参数值
     * @returns 结果数组
     */
    all(...params: unknown[]): unknown[];

    /**
     * 执行查询并返回第一条结果
     * @param params 参数值
     * @returns 第一条结果或 undefined
     */
    get(...params: unknown[]): unknown;

    /**
     * 执行语句并返回变更信息
     * @param params 参数值
     * @returns 变更信息
     */
    run(...params: unknown[]): RunResult;

    /**
     * 获取列信息
     */
    readonly columns: ColumnDefinition[];
  }

  /**
   * 执行结果
   */
  export interface RunResult {
    /**
     * 受影响的行数
     */
    changes: number;

    /**
     * 最后插入的 rowid
     */
    lastInsertRowid: number | bigint;
  }

  /**
   * 列定义
   */
  export interface ColumnDefinition {
    /**
     * 列名
     */
    name: string;

    /**
     * 列是否来自特定表
     */
    column: string | null;

    /**
     * 列所属表名
     */
    table: string | null;

    /**
     * 数据库文件路径
     */
    database: string | null;
  }
}
