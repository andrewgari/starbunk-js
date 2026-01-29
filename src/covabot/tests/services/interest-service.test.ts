import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InterestService } from '../../src/services/interest-service';
import { InterestRepository } from '../../src/repositories/interest-repository';
import { CovaProfile } from '../../src/models/memory-types';

describe('InterestService', () => {
  let mockInterestRepo: Partial<InterestRepository>;
  let interestService: InterestService;

  const mockProfile: CovaProfile = {
    id: 'test-profile',
    displayName: 'Test Bot',
    identity: { type: 'static', botName: 'Test Bot' },
    personality: {
      systemPrompt: 'You are a test bot',
      traits: [],
      interests: ['typescript', 'react', 'tech:discord', 'tech:bots'],
      speechPatterns: { lowercase: false, sarcasmLevel: 0.3, technicalBias: 0.5 },
    },
    triggers: [],
    socialBattery: { maxMessages: 5, windowMinutes: 10, cooldownSeconds: 30 },
    llmConfig: { model: 'gpt-4o-mini', temperature: 0.4, max_tokens: 256 },
    ignoreBots: true,
  };

  beforeEach(() => {
    mockInterestRepo = {
      getInterests: vi.fn().mockReturnValue([]),
      upsertInterest: vi.fn(),
      deleteInterest: vi.fn().mockReturnValue(false),
      adjustWeight: vi.fn(),
      clearProfileInterests: vi.fn().mockReturnValue(0),
      initializeFromInterests: vi.fn(),
    };

    interestService = new InterestService(mockInterestRepo as InterestRepository);
  });

  describe('initializeFromProfile', () => {
    it('should initialize interests from profile', async () => {
      const mockInterests = [
        { profile_id: 'test-profile', keyword: 'typescript', category: null, weight: 1.0 },
        { profile_id: 'test-profile', keyword: 'react', category: null, weight: 1.0 },
        { profile_id: 'test-profile', keyword: 'discord', category: 'tech', weight: 1.0 },
        { profile_id: 'test-profile', keyword: 'bots', category: 'tech', weight: 1.0 },
      ];

      vi.mocked(mockInterestRepo.getInterests!).mockResolvedValue(mockInterests);

      await interestService.initializeFromProfile(mockProfile);

      expect(mockInterestRepo.initializeFromInterests).toHaveBeenCalledWith('test-profile', [
        'typescript',
        'react',
        'tech:discord',
        'tech:bots',
      ]);

      const interests = await interestService.getInterests('test-profile');

      expect(interests.length).toBe(4);
      expect(interests.map(i => i.keyword)).toContain('typescript');
      expect(interests.map(i => i.keyword)).toContain('react');
      expect(interests.map(i => i.keyword)).toContain('discord');
      expect(interests.map(i => i.keyword)).toContain('bots');
    });

    it('should parse category prefix from interests', async () => {
      const mockInterests = [
        { profile_id: 'test-profile', keyword: 'discord', category: 'tech', weight: 1.0 },
      ];

      vi.mocked(mockInterestRepo.getInterests!).mockResolvedValue(mockInterests);

      await interestService.initializeFromProfile(mockProfile);

      const interests = await interestService.getInterests('test-profile');
      const discordInterest = interests.find(i => i.keyword === 'discord');

      expect(discordInterest?.category).toBe('tech');
    });

    it('should clear existing interests on reinitialize', async () => {
      // First initialization - mock returns extra-keyword
      vi.mocked(mockInterestRepo.getInterests!).mockReturnValue([
        { profile_id: 'test-profile', keyword: 'extra-keyword', category: null, weight: 1.0 },
      ]);

      await interestService.initializeFromProfile(mockProfile);

      // After reinitialization - mock returns the new interests
      const finalInterests = [
        { profile_id: 'test-profile', keyword: 'typescript', category: null, weight: 1.0 },
        { profile_id: 'test-profile', keyword: 'react', category: null, weight: 1.0 },
        { profile_id: 'test-profile', keyword: 'discord', category: 'tech', weight: 1.0 },
        { profile_id: 'test-profile', keyword: 'bots', category: 'tech', weight: 1.0 },
      ];
      vi.mocked(mockInterestRepo.getInterests!).mockResolvedValue(finalInterests);

      await interestService.initializeFromProfile(mockProfile);

      const interests = await interestService.getInterests('test-profile');
      expect(interests.map(i => i.keyword)).not.toContain('extra-keyword');
    });
  });

  describe('addInterest / removeInterest', () => {
    it('should add a new interest', async () => {
      const addedInterest = [
        { profile_id: 'profile', keyword: 'testing', category: 'dev', weight: 0.8 },
      ];

      vi.mocked(mockInterestRepo.getInterests!).mockResolvedValue(addedInterest);

      await interestService.addInterest('profile', 'testing', 'dev', 0.8);

      expect(mockInterestRepo.upsertInterest).toHaveBeenCalledWith(
        'profile',
        'testing',
        'dev',
        0.8,
      );

      const interests = await interestService.getInterests('profile');

      expect(interests).toHaveLength(1);
      expect(interests[0].keyword).toBe('testing');
      expect(interests[0].category).toBe('dev');
      expect(interests[0].weight).toBe(0.8);
    });

    it('should update existing interest', async () => {
      const updatedInterest = [
        { profile_id: 'profile', keyword: 'testing', category: 'qa', weight: 0.9 },
      ];

      vi.mocked(mockInterestRepo.getInterests!).mockResolvedValue(updatedInterest);

      await interestService.addInterest('profile', 'testing', 'dev', 0.5);
      await interestService.addInterest('profile', 'testing', 'qa', 0.9);

      const interests = await interestService.getInterests('profile');

      expect(interests).toHaveLength(1);
      expect(interests[0].weight).toBe(0.9);
      expect(interests[0].category).toBe('qa');
    });

    it('should remove an interest', async () => {
      vi.mocked(mockInterestRepo.deleteInterest!).mockResolvedValue(true);

      await interestService.addInterest('profile', 'testing');
      const removed = await interestService.removeInterest('profile', 'testing');

      expect(removed).toBe(true);
      expect(mockInterestRepo.deleteInterest).toHaveBeenCalledWith('profile', 'testing');
    });

    it('should return false when removing non-existent interest', async () => {
      vi.mocked(mockInterestRepo.deleteInterest!).mockResolvedValue(false);

      const removed = await interestService.removeInterest('profile', 'non-existent');

      expect(removed).toBe(false);
    });
  });

  describe('calculateInterestScore', () => {
    beforeEach(async () => {
      const mockInterests = [
        { profile_id: 'test-profile', keyword: 'typescript', category: null, weight: 1.0 },
        { profile_id: 'test-profile', keyword: 'react', category: null, weight: 1.0 },
        { profile_id: 'test-profile', keyword: 'discord', category: 'tech', weight: 1.0 },
        { profile_id: 'test-profile', keyword: 'bots', category: 'tech', weight: 1.0 },
      ];

      vi.mocked(mockInterestRepo.getInterests!).mockReturnValue(mockInterests);
      await interestService.initializeFromProfile(mockProfile);
    });

    it('should return high score for keyword match', async () => {
      const result = await interestService.calculateInterestScore(
        'test-profile',
        'I love working with TypeScript and React!',
      );

      expect(result.score).toBeGreaterThan(0);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches.map(m => m.keyword)).toContain('typescript');
      expect(result.matches.map(m => m.keyword)).toContain('react');
    });

    it('should return zero score for no matches', async () => {
      const result = await interestService.calculateInterestScore(
        'test-profile',
        'What is the weather like today?',
      );

      expect(result.score).toBe(0);
      expect(result.matches).toHaveLength(0);
    });

    it('should use word boundary matching', async () => {
      const result = await interestService.calculateInterestScore(
        'test-profile',
        'reactionary behavior',
      );

      // Should not match 'react' since 'reactionary' is different word
      expect(result.matches.find(m => m.keyword === 'react')).toBeUndefined();
    });

    it('should be case insensitive', async () => {
      const result = await interestService.calculateInterestScore(
        'test-profile',
        'TYPESCRIPT IS GREAT',
      );

      expect(result.matches.map(m => m.keyword)).toContain('typescript');
    });
  });

  describe('isInterested', () => {
    beforeEach(async () => {
      const mockInterests = [
        { profile_id: 'test-profile', keyword: 'typescript', category: null, weight: 1.0 },
        { profile_id: 'test-profile', keyword: 'react', category: null, weight: 1.0 },
        { profile_id: 'test-profile', keyword: 'discord', category: 'tech', weight: 1.0 },
        { profile_id: 'test-profile', keyword: 'bots', category: 'tech', weight: 1.0 },
      ];

      vi.mocked(mockInterestRepo.getInterests!).mockReturnValue(mockInterests);
      await interestService.initializeFromProfile(mockProfile);
    });

    it('should return interested=true above threshold', async () => {
      const result = await interestService.isInterested(
        'test-profile',
        'Working on a TypeScript React project',
        0.3,
      );

      expect(result.interested).toBe(true);
      expect(result.score).toBeGreaterThan(0.3);
    });

    it('should return interested=false below threshold', async () => {
      const result = await interestService.isInterested(
        'test-profile',
        'Random unrelated message',
        0.3,
      );

      expect(result.interested).toBe(false);
    });

    it('should include top match when interested', async () => {
      const result = await interestService.isInterested(
        'test-profile',
        'TypeScript is the best',
        0.3,
      );

      expect(result.topMatch).toBeDefined();
      expect(result.topMatch?.keyword).toBe('typescript');
    });
  });

  describe('adjustInterestWeight', () => {
    it('should increase weight', async () => {
      const adjustedInterest = [
        { profile_id: 'profile', keyword: 'testing', category: null, weight: 0.8 },
      ];

      vi.mocked(mockInterestRepo.getInterests!).mockResolvedValue(adjustedInterest);

      await interestService.addInterest('profile', 'testing', null, 0.5);
      await interestService.adjustInterestWeight('profile', 'testing', 0.3);

      expect(mockInterestRepo.adjustWeight).toHaveBeenCalledWith('profile', 'testing', 0.3);

      const interests = await interestService.getInterests('profile');
      expect(interests[0].weight).toBe(0.8);
    });

    it('should decrease weight', async () => {
      const adjustedInterest = [
        { profile_id: 'profile', keyword: 'testing', category: null, weight: 0.3 },
      ];

      vi.mocked(mockInterestRepo.getInterests!).mockResolvedValue(adjustedInterest);

      await interestService.addInterest('profile', 'testing', null, 0.5);
      await interestService.adjustInterestWeight('profile', 'testing', -0.2);

      expect(mockInterestRepo.adjustWeight).toHaveBeenCalledWith('profile', 'testing', -0.2);

      const interests = await interestService.getInterests('profile');
      expect(interests[0].weight).toBe(0.3);
    });

    it('should clamp weight to min 0.1', async () => {
      const adjustedInterest = [
        { profile_id: 'profile', keyword: 'testing', category: null, weight: 0.1 },
      ];

      vi.mocked(mockInterestRepo.getInterests!).mockResolvedValue(adjustedInterest);

      await interestService.addInterest('profile', 'testing', null, 0.2);
      await interestService.adjustInterestWeight('profile', 'testing', -0.5);

      const interests = await interestService.getInterests('profile');
      expect(interests[0].weight).toBe(0.1);
    });

    it('should clamp weight to max 2.0', async () => {
      const adjustedInterest = [
        { profile_id: 'profile', keyword: 'testing', category: null, weight: 2.0 },
      ];

      vi.mocked(mockInterestRepo.getInterests!).mockResolvedValue(adjustedInterest);

      await interestService.addInterest('profile', 'testing', null, 1.8);
      await interestService.adjustInterestWeight('profile', 'testing', 0.5);

      const interests = await interestService.getInterests('profile');
      expect(interests[0].weight).toBe(2.0);
    });
  });
});
