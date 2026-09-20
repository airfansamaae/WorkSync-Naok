-- academic_schema.sql
-- คำสั่งสร้างตารางทั้งหมดสำหรับ Cloudflare D1
-- สามารถ Copy ไปรันในแท็บ D1 Console ได้ทันที

CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    json_data TEXT NOT NULL,
    version INTEGER NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'teacher',
    status TEXT NOT NULL DEFAULT 'approved',
    email TEXT,
    phone TEXT,
    position TEXT,
    avatar TEXT,
    createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    assignedBy TEXT NOT NULL,
    targetRole TEXT NOT NULL DEFAULT 'all',
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    dueDateStart TEXT,
    dueDateEnd TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    description TEXT,
    subfolderId TEXT,
    createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    assignmentId TEXT NOT NULL,
    userId TEXT NOT NULL,
    userName TEXT NOT NULL,
    submittedAt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted',
    notes TEXT,
    files TEXT,
    score REAL,
    feedback TEXT
);

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    academicYear TEXT NOT NULL,
    semester TEXT NOT NULL,
    uploadedBy TEXT NOT NULL,
    uploadedAt TEXT NOT NULL,
    fileSize INTEGER,
    fileType TEXT,
    previewType TEXT,
    driveFileId TEXT,
    downloadUrl TEXT,
    viewUrl TEXT,
    description TEXT,
    tags TEXT
);

CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT,
    date TEXT NOT NULL,
    dateStart TEXT,
    dateEnd TEXT,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    isPinned INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lunch_menus (
    id TEXT PRIMARY KEY,
    date TEXT UNIQUE NOT NULL,
    mainDish TEXT NOT NULL,
    soup TEXT,
    dessert TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    userId TEXT NOT NULL,
    userName TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT
);

CREATE TABLE IF NOT EXISTS websites (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    imageUrl TEXT,
    driveFileId TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_websites_order ON websites("order");

