/**
 * HDFS 数据管理模块
 * 负责将游戏数据上传到 HDFS 并读取
 */

const { WebHDFS } = require('webhdfs')
const fs = require('fs')
const csv = require('csv-parser')

class HDFSManager {
  constructor() {
    // 连接 HDFS
    this.hdfs = new WebHDFS({
      host: process.env.HDFS_HOST || 'localhost',
      port: process.env.HDFS_PORT || 50070,
      user: process.env.HDFS_USER || 'hadoop'
    })
    
    this.hdfsPath = '/game-data'
  }

  /**
   * 上传游戏数据到 HDFS
   */
  async uploadGameData(localFilePath) {
    return new Promise((resolve, reject) => {
      console.log('? 开始上传数据到 HDFS...')
      
      const remoteFilePath = `${this.hdfsPath}/games.csv`
      const localFileStream = fs.createReadStream(localFilePath)
      const remoteFileStream = this.hdfs.createWriteStream(remoteFilePath)

      localFileStream.pipe(remoteFileStream)

      remoteFileStream.on('error', (error) => {
        console.error('? HDFS 上传失败:', error)
        reject(error)
      })

      remoteFileStream.on('finish', () => {
        console.log('? 数据已上传到 HDFS:', remoteFilePath)
        resolve(remoteFilePath)
      })
    })
  }

  /**
   * 从 HDFS 读取数据
   */
  async readGameData() {
    return new Promise((resolve, reject) => {
      console.log('? 从 HDFS 读取数据...')
      
      const remoteFilePath = `${this.hdfsPath}/games.csv`
      const remoteFileStream = this.hdfs.createReadStream(remoteFilePath)
      
      const results = []
      
      remoteFileStream
        .pipe(csv())
        .on('data', (row) => {
          // 数据清洗和类型转换
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
          })
        })
        .on('end', () => {
          console.log(`? 从 HDFS 读取完成: ${results.length} 条记录`)
          resolve(results)
        })
        .on('error', (error) => {
          console.error('? HDFS 读取失败:', error)
          reject(error)
        })
    })
  }

  /**
   * 检查 HDFS 文件是否存在
   */
  async checkFileExists(filePath) {
    return new Promise((resolve) => {
      this.hdfs.exists(filePath, (exists) => {
        resolve(exists)
      })
    })
  }

  /**
   * 获取 HDFS 文件状态
   */
  async getFileStatus(filePath) {
    return new Promise((resolve, reject) => {
      this.hdfs.getFileStatus(filePath, (error, status) => {
        if (error) {
          reject(error)
        } else {
          resolve(status)
        }
      })
    })
  }

  /**
   * 列出 HDFS 目录内容
   */
  async listDirectory(dirPath) {
    return new Promise((resolve, reject) => {
      this.hdfs.readdir(dirPath, (error, files) => {
        if (error) {
          reject(error)
        } else {
          resolve(files)
        }
      })
    })
  }

  /**
   * 创建 HDFS 目录
   */
  async createDirectory(dirPath) {
    return new Promise((resolve, reject) => {
      this.hdfs.mkdir(dirPath, (error) => {
        if (error) {
          reject(error)
        } else {
          console.log('? HDFS 目录创建成功:', dirPath)
          resolve()
        }
      })
    })
  }

  /**
   * 初始化 HDFS 环境
   */
  async initialize() {
    try {
      // 检查目录是否存在
      const exists = await this.checkFileExists(this.hdfsPath)
      
      if (!exists) {
        console.log('? 创建 HDFS 目录...')
        await this.createDirectory(this.hdfsPath)
      }

      // 上传数据（如果本地文件存在）
      const localFile = './games.csv'
      if (fs.existsSync(localFile)) {
        const hdfsFile = `${this.hdfsPath}/games.csv`
        const hdfsExists = await this.checkFileExists(hdfsFile)
        
        if (!hdfsExists) {
          console.log('? 首次上传数据到 HDFS...')
          await this.uploadGameData(localFile)
        } else {
          console.log('? HDFS 数据文件已存在')
        }
      }

      return true
    } catch (error) {
      console.error('? HDFS 初始化失败:', error)
      return false
    }
  }
}

module.exports = HDFSManager