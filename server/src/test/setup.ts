process.env.NODE_ENV = 'test';
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/medicare_pro_test?replicaSet=rs0';
process.env.HOSPITAL_ID ??= '65f0c0c2e5b1d229b984a101';
process.env.JWT_ACCESS_SECRET ??= 'test-only-secret-with-at-least-thirty-two-characters';
