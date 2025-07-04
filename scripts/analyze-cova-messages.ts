#!/usr/bin/env npx tsx

import { Client, GatewayIntentBits, TextChannel, Message, User } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const COVA_USER_ID = '139592376443338752';
const STARBUNK_GUILD_ID = '753251582719688714';
const OUTPUT_DIR = './data/personality-analysis';
const MESSAGES_PER_BATCH = 100;
const MAX_MESSAGES = 10000; // Limit to avoid overwhelming analysis

interface MessageData {
  id: string;
  content: string;
  timestamp: string;
  channel: string;
  channelId: string;
  referencedMessage?: {
    id: string;
    content: string;
    author: string;
  };
  attachments: string[];
  reactions: string[];
}

interface PersonalityAnalysis {
  totalMessages: number;
  averageMessageLength: number;
  commonWords: { [word: string]: number };
  sentenceStarters: string[];
  commonPhrases: string[];
  emoticons: string[];
  topics: { [topic: string]: number };
  responsePatterns: {
    questionsAsked: number;
    questionsAnswered: number;
    agreements: number;
    disagreements: number;
    helpOffers: number;
  };
  conversationStyle: {
    casual: number;
    technical: number;
    supportive: number;
    humorous: number;
  };
}

class CovaMessageAnalyzer {
  private client: Client;
  private guild: any;
  private messages: MessageData[] = [];

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
  }

  async initialize(): Promise<void> {
    const token = process.env.STARBUNK_TOKEN || process.env.COVABOT_TOKEN;
    if (!token) {
      throw new Error('Discord token not found. Please set STARBUNK_TOKEN or COVABOT_TOKEN in .env');
    }

    await this.client.login(token);
    console.log('Discord client logged in successfully');

    this.guild = await this.client.guilds.fetch(STARBUNK_GUILD_ID);
    if (!this.guild) {
      throw new Error(`Guild ${STARBUNK_GUILD_ID} not found`);
    }
    console.log(`Connected to guild: ${this.guild.name}`);
  }

  async fetchAllMessages(): Promise<void> {
    console.log('Fetching all channels...');
    const channels = await this.guild.channels.fetch();
    const textChannels = channels.filter((channel: any) => channel.type === 0); // TEXT channels

    console.log(`Found ${textChannels.size} text channels`);
    let totalMessages = 0;

    for (const [channelId, channel] of textChannels) {
      if (!(channel instanceof TextChannel)) continue;
      
      console.log(`\\nAnalyzing channel: #${channel.name}`);
      
      try {
        let lastId: string | undefined;
        let channelMessages = 0;

        while (channelMessages < MAX_MESSAGES && totalMessages < MAX_MESSAGES) {
          const fetchOptions: any = { limit: MESSAGES_PER_BATCH };
          if (lastId) {
            fetchOptions.before = lastId;
          }

          const messages = await channel.messages.fetch(fetchOptions);
          if (messages.size === 0) break;

          const covaMessages = messages.filter((msg: Message) => 
            msg.author.id === COVA_USER_ID && 
            msg.content.length > 0 && 
            !msg.author.bot
          );

          for (const [messageId, message] of covaMessages) {
            const messageData: MessageData = {
              id: message.id,
              content: message.content,
              timestamp: message.createdAt.toISOString(),
              channel: channel.name,
              channelId: channel.id,
              attachments: message.attachments.map(a => a.url),
              reactions: message.reactions.cache.map(r => r.emoji.name || r.emoji.id).filter(Boolean),
            };

            // Check if this is a reply to another message
            if (message.reference) {
              try {
                const referencedMessage = await channel.messages.fetch(message.reference.messageId!);
                messageData.referencedMessage = {
                  id: referencedMessage.id,
                  content: referencedMessage.content,
                  author: referencedMessage.author.username,
                };
              } catch (error) {
                // Referenced message might be deleted or inaccessible
              }
            }

            this.messages.push(messageData);
            channelMessages++;
            totalMessages++;
          }

          lastId = messages.last()?.id;
          
          console.log(`  Collected ${channelMessages} messages from Cova in #${channel.name}`);
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error processing channel #${channel.name}:`, error);
      }
    }

    console.log(`\\nTotal messages collected: ${this.messages.length}`);
  }

  analyzeMessages(): PersonalityAnalysis {
    console.log('Analyzing messages for personality patterns...');
    
    const analysis: PersonalityAnalysis = {
      totalMessages: this.messages.length,
      averageMessageLength: 0,
      commonWords: {},
      sentenceStarters: [],
      commonPhrases: [],
      emoticons: [],
      topics: {},
      responsePatterns: {
        questionsAsked: 0,
        questionsAnswered: 0,
        agreements: 0,
        disagreements: 0,
        helpOffers: 0,
      },
      conversationStyle: {
        casual: 0,
        technical: 0,
        supportive: 0,
        humorous: 0,
      },
    };

    const allWords: string[] = [];
    const phrases: string[] = [];
    const starters: string[] = [];

    for (const message of this.messages) {
      const content = message.content.toLowerCase();
      
      // Calculate message length
      analysis.averageMessageLength += content.length;
      
      // Extract words (excluding mentions, links, etc.)
      const words = content
        .replace(/<[@#!&]?\d+>/g, '') // Remove Discord mentions
        .replace(/https?:\/\/\S+/g, '') // Remove URLs
        .replace(/[^\w\s']/g, ' ') // Replace punctuation with spaces
        .split(/\s+/)
        .filter(word => word.length > 2);
      
      allWords.push(...words);
      
      // Extract sentence starters
      const sentences = message.content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length > 0) {
          const firstWords = trimmed.split(/\s+/).slice(0, 3).join(' ');
          starters.push(firstWords);
        }
      }
      
      // Extract common phrases (2-4 words)
      for (let i = 0; i < words.length - 1; i++) {
        const phrase2 = words.slice(i, i + 2).join(' ');
        const phrase3 = words.slice(i, i + 3).join(' ');
        if (phrase2.length > 4) phrases.push(phrase2);
        if (phrase3.length > 8) phrases.push(phrase3);
      }
      
      // Detect emoticons and reactions
      const emoticons = content.match(/[:;=]-?[)(\]D|/\\pP]/g) || [];
      analysis.emoticons.push(...emoticons);
      
      // Pattern analysis
      if (content.includes('?')) analysis.responsePatterns.questionsAsked++;
      if (message.referencedMessage) analysis.responsePatterns.questionsAnswered++;
      if (/\\b(yeah|yes|agree|exactly|right|true)\\b/.test(content)) analysis.responsePatterns.agreements++;
      if (/\\b(nah|no|disagree|wrong|false)\\b/.test(content)) analysis.responsePatterns.disagreements++;
      if (/\\b(help|assist|support|fix|solve)\\b/.test(content)) analysis.responsePatterns.helpOffers++;
      
      // Style analysis
      if (/\\b(lol|haha|lmao|😂|funny|joke)\\b/.test(content)) analysis.conversationStyle.humorous++;
      if (/\\b(code|programming|dev|bug|api|function|typescript|javascript)\\b/.test(content)) analysis.conversationStyle.technical++;
      if (/\\b(nice|good|great|awesome|cool|sweet)\\b/.test(content)) analysis.conversationStyle.supportive++;
      if (/\\b(gonna|wanna|dunno|ain't|'s|'d|'ll|'ve)\\b/.test(content)) analysis.conversationStyle.casual++;
      
      // Topic detection
      const topics = {
        programming: /\\b(code|programming|dev|bug|api|function|typescript|javascript|react|node)\\b/.test(content),
        gaming: /\\b(game|gaming|play|boss|level|character|rpg|ff|final fantasy)\\b/.test(content),
        discord: /\\b(discord|bot|server|channel|message|webhook)\\b/.test(content),
        music: /\\b(music|song|album|artist|band|play|sound)\\b/.test(content),
        comics: /\\b(batman|superman|comic|dc|marvel|hero|villain)\\b/.test(content),
        personal: /\\b(kyra|pug|dog|pet|coke|zero|taco|bell)\\b/.test(content),
      };
      
      for (const [topic, matches] of Object.entries(topics)) {
        if (matches) {
          analysis.topics[topic] = (analysis.topics[topic] || 0) + 1;
        }
      }
    }

    // Calculate averages and frequencies
    analysis.averageMessageLength = Math.round(analysis.averageMessageLength / this.messages.length);
    
    // Count word frequencies
    const wordCounts: { [word: string]: number } = {};
    for (const word of allWords) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
    
    // Get top words
    const sortedWords = Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 50);
    
    analysis.commonWords = Object.fromEntries(sortedWords);
    
    // Get common phrases
    const phraseCounts: { [phrase: string]: number } = {};
    for (const phrase of phrases) {
      phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
    }
    
    analysis.commonPhrases = Object.entries(phraseCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 25)
      .map(([phrase]) => phrase);
    
    // Get common sentence starters
    const starterCounts: { [starter: string]: number } = {};
    for (const starter of starters) {
      starterCounts[starter] = (starterCounts[starter] || 0) + 1;
    }
    
    analysis.sentenceStarters = Object.entries(starterCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([starter]) => starter);

    return analysis;
  }

  async saveResults(analysis: PersonalityAnalysis): Promise<void> {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Save raw messages
    const messagesPath = path.join(OUTPUT_DIR, 'cova-messages.json');
    fs.writeFileSync(messagesPath, JSON.stringify(this.messages, null, 2));
    console.log(`Raw messages saved to: ${messagesPath}`);

    // Save analysis
    const analysisPath = path.join(OUTPUT_DIR, 'cova-personality-analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
    console.log(`Personality analysis saved to: ${analysisPath}`);

    // Generate markdown report
    const reportPath = path.join(OUTPUT_DIR, 'cova-analysis-report.md');
    const report = this.generateMarkdownReport(analysis);
    fs.writeFileSync(reportPath, report);
    console.log(`Analysis report saved to: ${reportPath}`);
  }

  private generateMarkdownReport(analysis: PersonalityAnalysis): string {
    return `# Cova Personality Analysis Report

## Overview
- **Total Messages Analyzed**: ${analysis.totalMessages}
- **Average Message Length**: ${analysis.averageMessageLength} characters
- **Analysis Date**: ${new Date().toISOString()}

## Communication Patterns

### Most Common Words
${Object.entries(analysis.commonWords).slice(0, 20).map(([word, count]) => `- **${word}**: ${count}`).join('\\n')}

### Common Sentence Starters
${analysis.sentenceStarters.slice(0, 10).map(starter => `- "${starter}"`).join('\\n')}

### Common Phrases
${analysis.commonPhrases.slice(0, 15).map(phrase => `- "${phrase}"`).join('\\n')}

## Conversation Style Analysis

### Response Patterns
- **Questions Asked**: ${analysis.responsePatterns.questionsAsked}
- **Questions Answered**: ${analysis.responsePatterns.questionsAnswered}
- **Agreements**: ${analysis.responsePatterns.agreements}
- **Disagreements**: ${analysis.responsePatterns.disagreements}
- **Help Offers**: ${analysis.responsePatterns.helpOffers}

### Style Characteristics
- **Casual Language**: ${analysis.conversationStyle.casual} instances
- **Technical Language**: ${analysis.conversationStyle.technical} instances
- **Supportive Language**: ${analysis.conversationStyle.supportive} instances
- **Humorous Language**: ${analysis.conversationStyle.humorous} instances

## Topic Interests
${Object.entries(analysis.topics).sort(([,a], [,b]) => b - a).map(([topic, count]) => `- **${topic}**: ${count} messages`).join('\\n')}

## Emoticon Usage
- **Unique Emoticons**: ${[...new Set(analysis.emoticons)].join(', ')}
- **Total Emoticon Usage**: ${analysis.emoticons.length}

## Key Insights

### Communication Style
- Shows ${analysis.conversationStyle.casual > analysis.conversationStyle.technical * 2 ? 'highly casual' : 'balanced casual-technical'} communication style
- ${analysis.responsePatterns.helpOffers > analysis.totalMessages * 0.1 ? 'Frequently offers help' : 'Occasionally offers help'} to others
- ${analysis.responsePatterns.agreements > analysis.responsePatterns.disagreements * 2 ? 'Generally agreeable' : 'Balanced in agreement/disagreement'} in conversations

### Engagement Patterns
- Responds to questions ${Math.round((analysis.responsePatterns.questionsAnswered / analysis.totalMessages) * 100)}% of the time
- Asks questions ${Math.round((analysis.responsePatterns.questionsAsked / analysis.totalMessages) * 100)}% of the time
- Shows ${analysis.conversationStyle.humorous > analysis.totalMessages * 0.05 ? 'frequent' : 'occasional'} humor in conversations
`;
  }

  async cleanup(): Promise<void> {
    await this.client.destroy();
    console.log('Discord client disconnected');
  }
}

// Main execution
async function main() {
  const analyzer = new CovaMessageAnalyzer();
  
  try {
    await analyzer.initialize();
    await analyzer.fetchAllMessages();
    const analysis = analyzer.analyzeMessages();
    await analyzer.saveResults(analysis);
    
    console.log('\\n=== Analysis Complete ===');
    console.log(`Total messages analyzed: ${analysis.totalMessages}`);
    console.log(`Average message length: ${analysis.averageMessageLength} characters`);
    console.log(`Top topics:`, Object.entries(analysis.topics).sort(([,a], [,b]) => b - a).slice(0, 5));
    
  } catch (error) {
    console.error('Error during analysis:', error);
    process.exit(1);
  } finally {
    await analyzer.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}