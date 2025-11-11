/**
 * HDFS 数据管理模块
 * 使用 webhdfs@0.3.5 版本
 */

const fs = require('fs');
const csv = require('csv-parser');

// 0.3.5 版本的导入方式
const webhdfs = require('webhdfs');
const hdfs = webhdfs.createClient({
  host: process.env.HDFS_HOST || 'localhost',
  port: process.env.HDFS_PORT || 50070,
  user: process.env.HDFS_USER || 'hadoop',
  path: '/webhdfs/v1'
});

class HDFSManager {
  constructor() {
    this.hdfsPath = '/game-data';
  }

  /**
   * 上传游戏数据到 HDFS
   */
  uploadGameData(localFilePath) {
    return new Promise((resolve, reject) => {
      console.log('? 开始上传数据到 HDFS...');
      
      const remoteFilePath = `${this.hdfsPath}/games.csv`;
      const localFileStream = fs.createReadStream(localFilePath);
      const remoteFileStream = hdfs.createWriteStream(remoteFilePath);

      localFileStream.pipe(remoteFileStream);

      remoteFileStream.on('error', (error) => {
        console.error('? HDFS 上传失败:', error);
        reject(error);
      });

      remoteFileStream.on('finish', () => {
        console.log('? 数据已上传到 HDFS:', remoteFilePath);
        resolve(remoteFilePath);
      });
    });
  }

  /**
   * 从 HDFS 读取数据
   */
  readGameData() {
    return new Promise((resolve, reject) => {
      console.log('? 从 HDFS 读取数据...');
      
      const remoteFilePath = `${this.hdfsPath}/games.csv`;
      const remoteFileStream = hdfs.createReadStream(remoteFilePath);
      
      const results = [];
      
      remoteFileStream
        .pipe(csv())
        .on('data', (row) => {
          // 数据清洗和类型转换
          if (!row.Name || !row.Platform) return;
          
          results.push({
            Name: row.Name,
            Platform: row.Platform,
            Genre: row.Genre || 'Unknown',
            Publisher: row.Publisher,
            Year_of_Release: parseInt(row.Year_of_Release) || null,
            NA_Sales: parseFloat(row.NA_Sales) || 0,
            EU_Sales: parseFloat(row.EU_Sales) || 0,
            JP_Sales: parseFloat(row.JP_Sales) || 0,
            Other_Sales: parseFloat(row.Other_Sales) || 0,
            Global_Sales: parseFloat(row.Global_Sales) || 0,
            User_Score: parseFloat(row.User_Score) || null,
            Critic_Score: parseFloat(row.Critic_Score) || null
          });
        })
        .on('end', () => {
          console.log(`? 从 HDFS 读取完成: ${results.length} 条记录`);
          resolve(results);
        })
        .on('error', (error) => {
          console.error('? HDFS 读取失败:', error);
          reject(error);
        });
    });
  }

  /**
   * 检查 HDFS 文件是否存在
   */
  checkFileExists(filePath) {
    return new Promise((resolve) => {
      hdfs.exists(filePath, (exists) => {
        resolve(exists);
      });
    });
  }

  /**
   * 创建 HDFS 目录
   */
  createDirectory(dirPath) {
    return new Promise((resolve, reject) => {
      hdfs.mkdir(dirPath, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log('? HDFS 目录创建成功:', dirPath);
          resolve();
        }
      });
    });
  }

  /**
   * 初始化 HDFS 环境
   */
  async initialize() {
    try {
      console.log('? 初始化 HDFS 环境...');
      
      // 检查目录是否存在
      const exists = await this.checkFileExists(this.hdfsPath);
      
      if (!exists) {
        console.log('? 创建 HDFS 目录...');
        await this.createDirectory(this.hdfsPath);
      }

      // 上传数据（如果本地文件存在）
      const localFile = './games.csv';
      if (fs.existsSync(localFile)) {
        const hdfsFile = `${this.hdfsPath}/games.csv`;
        const hdfsExists = await this.checkFileExists(hdfsFile);
        
        if (!hdfsExists) {
          console.log('? 首次上传数据到 HDFS...');
          await this.uploadGameData(localFile);
        } else {
          console.log('? HDFS 数据文件已存在');
        }
      }

      return true;
    } catch (error) {
      console.error('? HDFS 初始化失败:', error);
      return false;
    }
  }
}

module.exports = HDFSManager;