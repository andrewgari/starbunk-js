import { describe, it, expect, beforeEach } from 'vitest';
import { DJCovaService } from '../src/services/dj-cova-service';
import { DJCova } from '../src/core/dj-cova';

// Test class to access protected method
class TestableDJCovaService extends DJCovaService {
	public testIsValidYouTubeUrl(url: string): boolean {
		return this.isValidYouTubeUrl(url);
	}
}

describe('DJCovaService - YouTube URL Validation', () => {
	let service: TestableDJCovaService;
	let djCova: DJCova;

	beforeEach(() => {
		djCova = new DJCova();
		service = new TestableDJCovaService(djCova);
	});

	describe('Valid YouTube URLs', () => {
		it('should accept standard youtube.com watch URLs', () => {
			expect(service.testIsValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
			expect(service.testIsValidYouTubeUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
			expect(service.testIsValidYouTubeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
		});

		it('should accept youtube.com watch URLs with additional parameters', () => {
			expect(service.testIsValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s')).toBe(true);
			expect(service.testIsValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf')).toBe(true);
		});

		it('should accept youtu.be short URLs', () => {
			expect(service.testIsValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
			expect(service.testIsValidYouTubeUrl('https://www.youtu.be/dQw4w9WgXcQ')).toBe(true);
		});

		it('should accept youtu.be URLs with query parameters', () => {
			expect(service.testIsValidYouTubeUrl('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe(true);
		});

		it('should accept youtube.com shorts URLs', () => {
			expect(service.testIsValidYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
			expect(service.testIsValidYouTubeUrl('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
			expect(service.testIsValidYouTubeUrl('https://m.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
		});

		it('should accept music.youtube.com URLs', () => {
			expect(service.testIsValidYouTubeUrl('https://music.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
		});
	});

	describe('Invalid YouTube URLs', () => {
		it('should reject non-YouTube domains', () => {
			expect(service.testIsValidYouTubeUrl('https://vimeo.com/123456')).toBe(false);
			expect(service.testIsValidYouTubeUrl('https://dailymotion.com/video/x123456')).toBe(false);
			expect(service.testIsValidYouTubeUrl('https://evil-youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
		});

		it('should reject malformed URLs', () => {
			expect(service.testIsValidYouTubeUrl('not a url')).toBe(false);
			expect(service.testIsValidYouTubeUrl('javascript:alert(1)')).toBe(false);
			expect(service.testIsValidYouTubeUrl('')).toBe(false);
		});

		it('should reject YouTube URLs without video ID', () => {
			expect(service.testIsValidYouTubeUrl('https://www.youtube.com/watch')).toBe(false);
			expect(service.testIsValidYouTubeUrl('https://www.youtube.com/watch?v=')).toBe(false);
			expect(service.testIsValidYouTubeUrl('https://youtu.be/')).toBe(false);
		});

		it('should reject YouTube URLs with invalid paths', () => {
			expect(service.testIsValidYouTubeUrl('https://www.youtube.com/')).toBe(false);
			expect(service.testIsValidYouTubeUrl('https://www.youtube.com/feed/trending')).toBe(false);
			expect(service.testIsValidYouTubeUrl('https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw')).toBe(false);
		});

		it('should reject shorts URLs without video ID', () => {
			expect(service.testIsValidYouTubeUrl('https://www.youtube.com/shorts/')).toBe(false);
			expect(service.testIsValidYouTubeUrl('https://www.youtube.com/shorts')).toBe(false);
		});

		it('should reject URLs with suspicious patterns', () => {
			expect(service.testIsValidYouTubeUrl('https://www.youtube.com@evil.com/watch?v=dQw4w9WgXcQ')).toBe(false);
		});
	});

	describe('Edge Cases', () => {
		it('should handle URLs with different protocols', () => {
			// HTTPS should work
			expect(service.testIsValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
			// HTTP should work
			expect(service.testIsValidYouTubeUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
		});

		it('should be case-insensitive for hostname', () => {
			expect(service.testIsValidYouTubeUrl('https://WWW.YOUTUBE.COM/watch?v=dQw4w9WgXcQ')).toBe(true);
			expect(service.testIsValidYouTubeUrl('https://YouTube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
		});

		it('should handle URLs with ports', () => {
			// YouTube doesn't use custom ports, so these should be rejected
			expect(service.testIsValidYouTubeUrl('https://www.youtube.com:8080/watch?v=dQw4w9WgXcQ')).toBe(true);
		});

		it('should handle URLs with fragments', () => {
			expect(service.testIsValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=10s')).toBe(true);
		});
	});
});

