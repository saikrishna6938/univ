CREATE TABLE IF NOT EXISTS countries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  iso_code VARCHAR(10) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS programs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_name VARCHAR(255) NOT NULL,
  university_name VARCHAR(255) NOT NULL,
  degree_15yr_accepted VARCHAR(50),
  portal_or_direct VARCHAR(50),
  level_of_study VARCHAR(100),
  duration_in_months INT,
  duration_in_years DECIMAL(5,2),
  pace_of_study VARCHAR(100),
  teaching_form VARCHAR(100),
  language_of_study VARCHAR(100),
  private_or_public VARCHAR(50),
  location VARCHAR(255),
  campus VARCHAR(255),
  currency VARCHAR(20),
  application_fee DECIMAL(10,2),
  admission_fee DECIMAL(10,2),
  initial_deposit DECIMAL(10,2),
  scholarship VARCHAR(255),
  concentration VARCHAR(255),
  tuition_fee_per_semester DECIMAL(12,2),
  tuition_fee_per_year DECIMAL(12,2),
  tuition_fee_per_course DECIMAL(12,2),
  credits INT,
  per_credit_rate DECIMAL(10,2),
  gre_score VARCHAR(50),
  gmat_score VARCHAR(50),
  sat_score VARCHAR(50),
  act_score VARCHAR(50),
  ielts VARCHAR(50),
  ielts_nblt VARCHAR(50),
  toefl VARCHAR(50),
  toefl_nblt VARCHAR(50),
  duolingo VARCHAR(50),
  duolingo_nblt VARCHAR(50),
  pte VARCHAR(50),
  pte_nblt VARCHAR(50),
  backlogs VARCHAR(100),
  moi_accepted VARCHAR(50),
  wes_required VARCHAR(50),
  aps_required VARCHAR(50),
  inter_english_first_year VARCHAR(50),
  inter_english_second_year VARCHAR(50),
  intakes TEXT,
  deadlines TEXT,
  gap_accepted VARCHAR(100),
  without_maths VARCHAR(100),
  stateboard_accepted VARCHAR(100),
  entry_requirement_out_of4 DECIMAL(5,2),
  entry_requirement_out_of5 DECIMAL(5,2),
  entry_requirement_out_of10 DECIMAL(5,2),
  entry_requirement_out_of100 DECIMAL(6,2),
  english_requirement_icse VARCHAR(255),
  english_requirement_cbse VARCHAR(255),
  english_requirement_ib VARCHAR(255),
  english_requirement_others VARCHAR(255),
  age_gap_upto VARCHAR(100),
  noticeable_academic_gap VARCHAR(255),
  country_id INT,
  data JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_program_country FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE SET NULL,
  UNIQUE KEY uniq_program (program_name, university_name)
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(32),
  city VARCHAR(255),
  password_hash VARCHAR(255),
  otp_code VARCHAR(10),
  otp_expires_at DATETIME,
  email_verified_at DATETIME,
  last_login_at DATETIME,
  role ENUM('student', 'admin', 'manager', 'employee') DEFAULT 'student',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_admin_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role ENUM('admin', 'manager', 'employee') NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_role (user_id, role),
  CONSTRAINT fk_user_admin_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_country_access (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  country_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_country (user_id, country_id),
  CONSTRAINT fk_user_country_access_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_country_access_country FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lead_conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  looking_for TEXT NULL,
  conversation_status ENUM('new', 'contacted', 'follow_up', 'interested', 'not_interested', 'closed') DEFAULT 'new',
  notes TEXT NULL,
  reminder_at DATETIME NULL,
  reminder_done TINYINT(1) DEFAULT 0,
  last_contacted_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_lead_conversation_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_lead_conversation_reminder (reminder_at, reminder_done),
  INDEX idx_lead_conversation_status (conversation_status)
);

CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NOT NULL,
  country_id INT NULL,
  user_id INT NULL,
  created_date DATE DEFAULT (CURRENT_DATE),
  applicant_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(100),
  country_of_residence VARCHAR(255),
  statement TEXT,
  notes TEXT,
  status ENUM('submitted', 'reviewing', 'accepted', 'rejected') DEFAULT 'submitted',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_app_country FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS employee_application_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  employee_user_id INT NOT NULL,
  task_status ENUM('under_process', 'completed') DEFAULT 'under_process',
  task_notes TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_employee_application_task (application_id, employee_user_id),
  CONSTRAINT fk_employee_task_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_employee_task_user FOREIGN KEY (employee_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_employee_task_status (task_status)
);

CREATE TABLE IF NOT EXISTS featured_universities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  country_id INT NOT NULL,
  program_id INT NOT NULL,
  university_image VARCHAR(512) NULL,
  application_fee DECIMAL(10,2) NULL,
  discount_on_application_fees DECIMAL(10,2) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_featured_country FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
  CONSTRAINT fk_featured_program FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  degree VARCHAR(120) NOT NULL,
  program VARCHAR(255) NOT NULL,
  university VARCHAR(255) NOT NULL,
  logo VARCHAR(512) NULL,
  title VARCHAR(500) NOT NULL,
  event_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_events_event_date (event_date),
  INDEX idx_events_university (university),
  INDEX idx_events_program (program)
);

CREATE TABLE IF NOT EXISTS subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NULL,
  source VARCHAR(100) NULL,
  confirmed_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
