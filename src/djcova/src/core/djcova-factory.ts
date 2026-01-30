import { DJCovaService } from '@/services/dj-cova-service';
import { DJCova } from '@/core/dj-cova';

export function createDJCovaService(): DJCovaService {
  const djCova = new DJCova();
  return new DJCovaService(djCova);
}
