import { Database } from '../database';
import { RPGBot } from './rpg/rpg-bot';

const db = Database.getInstance();
const rpgBot = new RPGBot(db.campaigns, db.characters);

export const replyBots = [rpgBot];
