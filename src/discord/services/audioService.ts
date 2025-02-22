export interface AudioService {
	play: () => Promise<void>;
	stop: () => Promise<void>;
}
