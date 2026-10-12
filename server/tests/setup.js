process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/learnai_test?replicaSet=rs0';
process.env.JWT_SECRET = 'test-only-secret-with-more-than-thirty-two-characters';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_SAME_SITE = 'lax';
process.env.TRUST_PROXY = '0';
