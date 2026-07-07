import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'node:dns';

dotenv.config();

mongoose.set('bufferCommands', false);

const redactMongoUri = (uri) => {
  if (!uri) return 'not configured';

  return uri.replace(
    /\/\/([^:]+):([^@]+)@/,
    (_, username) => `//${username}:****@`
  );
};

const DEFAULT_DNS_SERVERS = ['1.1.1.1', '8.8.8.8'];
let lastConnectionError = null;
let lastConnectionDurationMs = null;

const configureDns = () => {
  const servers = process.env.DNS_SERVERS?.split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  const dnsServers = servers?.length ? servers : DEFAULT_DNS_SERVERS;
  dns.setServers(dnsServers);
  console.log(`Using DNS servers: ${dnsServers.join(', ')}`);
};

export const DB_connection = async () => {
  const startedAt = Date.now();

  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not configured');
    }

    configureDns();
    console.log(
      'Connecting to MongoDB...',
      redactMongoUri(process.env.MONGO_URI)
    );
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 10000,
      connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS) || 10000,
      socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS) || 45000,
    });

    lastConnectionError = null;
    lastConnectionDurationMs = Date.now() - startedAt;
    console.log(`MongoDB Connected Successfully in ${lastConnectionDurationMs}ms`);
  } catch (error) {
    lastConnectionError = error.message;
    lastConnectionDurationMs = Date.now() - startedAt;
    console.error(`DB Connection Failed after ${lastConnectionDurationMs}ms:`, error.message);
    throw error;
  }
};

export const isDbConnected = () => mongoose.connection.readyState === 1;

export const getDbStatus = () => ({
  connected: isDbConnected(),
  readyState: mongoose.connection.readyState,
  host: mongoose.connection.host || null,
  name: mongoose.connection.name || null,
  lastConnectionDurationMs,
  lastConnectionError,
});
