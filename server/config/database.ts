import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.DATABASE_URL;
    
    if (!mongoURI) {
      const errorMessage = 'DATABASE_URL is not defined in environment variables. Please set DATABASE_URL in your .env file (e.g., mongodb://localhost:27017/zuzuplan)';
      console.error('❌ MongoDB connection error:', errorMessage);
      throw new Error(errorMessage);
    }

    // Extract database name from connection string for logging
    const dbNameMatch = mongoURI.match(/\/([^/?]+)(\?|$)/);
    const dbName = dbNameMatch ? dbNameMatch[1] : 'unknown';

    const options: mongoose.ConnectOptions = {
      // MongoDB connection options
    };

    await mongoose.connect(mongoURI, options);

    const actualDbName = mongoose.connection.db?.databaseName || dbName;
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database name: ${actualDbName}`);
    console.log(`💡 Note: Database will appear in MongoDB Compass after you write data to it`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ MongoDB connection error:', error instanceof Error ? error.message : error);
    console.error('💡 Tip: Make sure MongoDB is running and DATABASE_URL is set in your .env file');
    process.exit(1);
  }
};

// Export the connection function and mongoose instance
export { connectDB };
export default mongoose;
