import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns';

dotenv.config();

const redactMongoUri = (uri) => {
  if (!uri) return 'not configured';

  return uri.replace(
    /\/\/([^:]+):([^@]+)@/,
    (_, username) => `//${username}:****@`
  );
};

const DEFAULT_DNS_SERVERS = ['1.1.1.1', '8.8.8.8'];

const configureDns = () => {
  const servers = process.env.DNS_SERVERS?.split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  const dnsServers = servers?.length ? servers : DEFAULT_DNS_SERVERS;
  dns.setServers(dnsServers);
  console.log(`Using DNS servers: ${dnsServers.join(', ')}`);
};

export const DB_connection = async () => {
  try {
    configureDns();
    console.log(
      'Connecting to MongoDB...',
      redactMongoUri(process.env.MONGO_URI)
    );
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('DB Connection Failed:', error);
    process.exit(1);
  }
};
