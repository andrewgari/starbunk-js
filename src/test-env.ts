import dotenv from 'dotenv';
import path from 'path';

// Load environment variables with explicit path
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Print all environment variables
console.log('STARBUNK_TOKEN =', process.env.STARBUNK_TOKEN?.substring(0, 10) + '...');
console.log('SNOWBUNK_TOKEN =', process.env.SNOWBUNK_TOKEN?.substring(0, 10) + '...');
console.log('TOKEN =', process.env.TOKEN?.substring(0, 10) + '...');
console.log('CLIENT_ID =', process.env.CLIENT_ID);
console.log('GUILD_ID =', process.env.GUILD_ID);
console.log('OPENAI_API_KEY =', process.env.OPENAI_API_KEY?.substring(0, 10) + '...');
