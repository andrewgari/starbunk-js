import request from 'supertest';
import { createHealthServer } from '../src/health';

describe('CovaBot health endpoint', () => {
  it('returns 200 OK', async () => {
    const { app, server } = createHealthServer(0); // use ephemeral port
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    server.close();
  });
});

