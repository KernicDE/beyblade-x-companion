CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  appliedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  passwordHash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Rookie Blader' CHECK (role IN ('Council', 'Referee', 'Blader', 'Rookie Blader')),
  isBanned INTEGER NOT NULL DEFAULT 0,
  banReason TEXT,
  bannedAt TEXT,
  bannedBy TEXT,
  totpSecret TEXT,
  totpEnabled INTEGER NOT NULL DEFAULT 0,
  totpRecoveryCodes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS parts (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('blade', 'assistBlade', 'ratchet', 'bit')),
  name TEXT NOT NULL,
  manufacturer TEXT,
  imageUrl TEXT,
  releaseDate TEXT,
  releaseWave TEXT,
  description TEXT,
  assessment TEXT,
  officialStats TEXT,
  ratingsSource TEXT,
  tier TEXT,
  customLine INTEGER NOT NULL DEFAULT 0,
  baselineRatings TEXT,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  suggestedBy TEXT,
  moderatorNote TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_parts_status ON parts(status);
CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);

CREATE TABLE IF NOT EXISTS beys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  manufacturer TEXT,
  imageUrl TEXT,
  releaseDate TEXT,
  releaseWave TEXT,
  priceJpy INTEGER,
  priceUsd INTEGER,
  priceEur INTEGER,
  bladeId TEXT NOT NULL,
  assistBladeId TEXT,
  ratchetId TEXT NOT NULL,
  bitId TEXT NOT NULL,
  assessment TEXT,
  highlights TEXT,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  suggestedBy TEXT,
  moderatorNote TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_beys_status ON beys(status);

CREATE TABLE IF NOT EXISTS bey_barcodes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  format TEXT,
  manufacturer TEXT,
  beyId TEXT NOT NULL,
  source TEXT,
  createdBy TEXT,
  createdAt TEXT NOT NULL,
  UNIQUE(code, manufacturer)
);

CREATE INDEX IF NOT EXISTS idx_bey_barcodes_code ON bey_barcodes(code);
CREATE INDEX IF NOT EXISTS idx_bey_barcodes_beyId ON bey_barcodes(beyId);

CREATE TABLE IF NOT EXISTS part_ratings (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  partId TEXT NOT NULL,
  attack REAL NOT NULL,
  defense REAL NOT NULL,
  stamina REAL NOT NULL,
  balance REAL NOT NULL,
  countsInAverage INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(userId, partId)
);

CREATE INDEX IF NOT EXISTS idx_part_ratings_partId_counts ON part_ratings(partId, countsInAverage);
CREATE INDEX IF NOT EXISTS idx_part_ratings_userId ON part_ratings(userId);

CREATE TABLE IF NOT EXISTS bey_ratings (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  beyId TEXT NOT NULL,
  attack REAL NOT NULL,
  defense REAL NOT NULL,
  stamina REAL NOT NULL,
  balance REAL NOT NULL,
  countsInAverage INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(userId, beyId)
);

CREATE INDEX IF NOT EXISTS idx_bey_ratings_beyId_counts ON bey_ratings(beyId, countsInAverage);
CREATE INDEX IF NOT EXISTS idx_bey_ratings_userId ON bey_ratings(userId);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  targetType TEXT NOT NULL CHECK (targetType IN ('bey', 'part')),
  targetId TEXT NOT NULL,
  text TEXT NOT NULL,
  deletedAt TEXT,
  deletedBy TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_target ON comments(targetType, targetId, deletedAt);
CREATE INDEX IF NOT EXISTS idx_comments_userId ON comments(userId);

CREATE TABLE IF NOT EXISTS owned_beys (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  beyId TEXT NOT NULL,
  purchaseDate TEXT,
  shop TEXT,
  priceEur REAL,
  priceChf REAL,
  setName TEXT,
  note TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_owned_beys_userId ON owned_beys(userId);
CREATE INDEX IF NOT EXISTS idx_owned_beys_beyId ON owned_beys(beyId);

CREATE TABLE IF NOT EXISTS owned_parts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  partId TEXT NOT NULL,
  category TEXT NOT NULL,
  obtainedFrom TEXT,
  purchaseDate TEXT,
  note TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_owned_parts_userId ON owned_parts(userId);

CREATE TABLE IF NOT EXISTS builds (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  note TEXT,
  bladeId TEXT NOT NULL,
  assistBladeId TEXT,
  ratchetId TEXT NOT NULL,
  bitId TEXT NOT NULL,
  isPublic INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_builds_userId ON builds(userId);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  date TEXT NOT NULL,
  myBeySource TEXT NOT NULL CHECK (myBeySource IN ('bey', 'ownedBey', 'build')),
  myBeyId TEXT NOT NULL,
  opponentName TEXT NOT NULL,
  opponentBeyId TEXT,
  opponentCombo TEXT,
  result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
  finishType TEXT CHECK (finishType IN ('xtreme', 'over', 'burst', 'spin')),
  note TEXT,
  countsInStats INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_matches_userId ON matches(userId);
CREATE INDEX IF NOT EXISTS idx_matches_myBeyId_counts ON matches(myBeyId, countsInStats);
CREATE INDEX IF NOT EXISTS idx_matches_opponentBeyId_counts ON matches(opponentBeyId, countsInStats);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actorId TEXT NOT NULL,
  action TEXT NOT NULL,
  targetType TEXT,
  targetId TEXT,
  meta TEXT,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actorId);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
