-- 椿萱语音安全守护 - 数据库初始化脚本
-- 数据库: nodejs_demo

USE nodejs_demo;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  nickname VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE,
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(255),
  user_type ENUM('elder', 'children', 'volunteer', 'admin') NOT NULL,
  gender ENUM('male', 'female') DEFAULT 'male',
  age INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone),
  INDEX idx_user_type (user_type)
);

-- 亲子关联表
CREATE TABLE IF NOT EXISTS parent_child_relations (
  id VARCHAR(50) PRIMARY KEY,
  children_id VARCHAR(50) NOT NULL,
  elder_id VARCHAR(50) NOT NULL,
  status ENUM('pending', 'active', 'unlinked') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unlinked_at TIMESTAMP NULL,
  INDEX idx_children (children_id),
  INDEX idx_elder (elder_id),
  INDEX idx_status (status)
);

-- 关联请求表
CREATE TABLE IF NOT EXISTS relate_requests (
  id VARCHAR(50) PRIMARY KEY,
  children_id VARCHAR(50) NOT NULL,
  elder_id VARCHAR(50) NOT NULL,
  verify_code VARCHAR(10) NOT NULL,
  status ENUM('pending', 'completed', 'expired') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  INDEX idx_children (children_id),
  INDEX idx_elder (elder_id),
  INDEX idx_verify (verify_code)
);

-- 使用统计表
CREATE TABLE IF NOT EXISTS usage_statistics (
  id VARCHAR(50) PRIMARY KEY,
  elder_id VARCHAR(50) NOT NULL,
  type ENUM('ai_usage', 'app_open', 'emergency', 'health_check', 'medicine_reminder') NOT NULL,
  value INT DEFAULT 1,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_elder (elder_id),
  INDEX idx_type (type),
  INDEX idx_created (created_at)
);

-- 每日汇总表
CREATE TABLE IF NOT EXISTS daily_summary (
  id VARCHAR(50) PRIMARY KEY,
  elder_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  ai_usage_count INT DEFAULT 0,
  app_open_count INT DEFAULT 0,
  emergency_count INT DEFAULT 0,
  health_score INT DEFAULT 85,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_elder_date (elder_id, date),
  INDEX idx_elder (elder_id),
  INDEX idx_date (date)
);

-- AI分析表
CREATE TABLE IF NOT EXISTS ai_analysis (
  id VARCHAR(50) PRIMARY KEY,
  elder_id VARCHAR(50) NOT NULL,
  title VARCHAR(200),
  content TEXT NOT NULL,
  level ENUM('good', 'normal', 'warning', 'alert') DEFAULT 'normal',
  status ENUM('new', 'read', 'archived') DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_elder (elder_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
);

-- AI分析通知表
CREATE TABLE IF NOT EXISTS ai_analysis_notifications (
  id VARCHAR(50) PRIMARY KEY,
  elder_id VARCHAR(50) NOT NULL,
  analysis_id VARCHAR(50) NOT NULL,
  children_ids JSON NOT NULL,
  title VARCHAR(200),
  content TEXT NOT NULL,
  level ENUM('good', 'normal', 'warning', 'alert') DEFAULT 'normal',
  status ENUM('unread', 'read') DEFAULT 'unread',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_elder (elder_id),
  INDEX idx_status (status)
);

-- 紧急呼叫记录表
CREATE TABLE IF NOT EXISTS emergency_records (
  id VARCHAR(50) PRIMARY KEY,
  elder_id VARCHAR(50) NOT NULL,
  children_ids JSON NOT NULL,
  reason VARCHAR(255),
  status ENUM('pending', 'processing', 'resolved', 'cancelled') DEFAULT 'pending',
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  INDEX idx_elder (elder_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
);

-- 聊天记录表
CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR(50) PRIMARY KEY,
  sender_type ENUM('elder', 'children', 'ai') NOT NULL,
  sender_id VARCHAR(50) NOT NULL,
  receiver_id VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  message_type ENUM('text', 'voice', 'image') DEFAULT 'text',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sender (sender_id),
  INDEX idx_receiver (receiver_id),
  INDEX idx_created (created_at)
);

-- 守护设置表
CREATE TABLE IF NOT EXISTS guardian_settings (
  id VARCHAR(50) PRIMARY KEY,
  elder_id VARCHAR(50) NOT NULL,
  guardian_enabled BOOLEAN DEFAULT FALSE,
  emergency_contacts JSON,
  alert_thresholds JSON,
  reminder_settings JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_elder (elder_id)
);

-- 健康数据表
CREATE TABLE IF NOT EXISTS health_data (
  id VARCHAR(50) PRIMARY KEY,
  elder_id VARCHAR(50) NOT NULL,
  heart_rate INT,
  blood_pressure_systolic INT,
  blood_pressure_diastolic INT,
  blood_oxygen INT,
  temperature DECIMAL(4, 1),
  data_source VARCHAR(50),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_elder (elder_id),
  INDEX idx_recorded (recorded_at)
);

-- 插入测试数据
INSERT INTO users (id, nickname, phone, password, user_type, gender, age) VALUES
('elder_001', '爸爸', '13800138001', '$2a$10$abcdefghijklmnopqrstuv', 'elder', 'male', 68),
('elder_002', '妈妈', '13800138002', '$2a$10$abcdefghijklmnopqrstuv', 'elder', 'female', 65),
('children_001', '孝顺儿子', '13800138100', '$2a$10$abcdefghijklmnopqrstuv', 'children', 'male', 35)
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

-- 插入关联关系
INSERT INTO parent_child_relations (id, children_id, elder_id, status) VALUES
('relation_001', 'children_001', 'elder_001', 'active'),
('relation_002', 'children_001', 'elder_002', 'active')
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- 插入今日使用统计
INSERT INTO daily_summary (id, elder_id, date, ai_usage_count, app_open_count, emergency_count, health_score) VALUES
('summary_001', 'elder_001', CURDATE(), 12, 5, 0, 88),
('summary_002', 'elder_002', CURDATE(), 8, 3, 0, 85)
ON DUPLICATE KEY UPDATE 
  ai_usage_count = VALUES(ai_usage_count),
  app_open_count = VALUES(app_open_count);

-- 插入AI分析
INSERT INTO ai_analysis (id, elder_id, title, content, level, status) VALUES
('analysis_001', 'elder_001', '情绪状态分析', '今天心情不错，与小银对话活跃度较高。建议多陪伴老人，关注其心理健康。', 'good', 'new'),
('analysis_002', 'elder_002', '活动状态提醒', '今日活动量偏低，建议适当增加户外活动时间。', 'warning', 'new')
ON DUPLICATE KEY UPDATE content = VALUES(content);