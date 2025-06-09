// Polyfill TextEncoder and TextDecoder for testing environment
const { TextEncoder: NodeTextEncoder, TextDecoder: NodeTextDecoder } = require('util');

global.TextEncoder = NodeTextEncoder;
global.TextDecoder = NodeTextDecoder;
const dotenv = require('dotenv');

dotenv.config();
// Mock axios to prevent ESM parsing issues
jest.mock('axios');
// Provide dummy OpenAI API key for test environment
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
const request = require('supertest');

const app = require('../../server');

describe('API Integration Tests', () => {
  let createdStaffId: string;
  let createdProjectId: string;

  // Test staff endpoints
  test('GET /api/staff returns 200 and array', async () => {
    const res = await request(app).get('/api/staff');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/staff creates a new staff', async () => {
    const payload = {
      name: `TestStaff_${Date.now()}`,
      grade: 'Junior',
      department: 'Testing',
      role: 'Tester',
      city: 'TestCity',
      country: 'TestLand',
      skills: 'Testing'
    };
    const res = await request(app).post('/api/staff').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe(payload.name);
    createdStaffId = res.body.id;
  });

  test('PUT /api/staff/:id updates the staff', async () => {
    const update = { grade: 'Senior' };
    const res = await request(app).put(`/api/staff/${createdStaffId}`).send(update);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdStaffId);
    expect(res.body.grade).toBe('Senior');
  });

  test('DELETE /api/staff/:id deletes the staff', async () => {
    const res = await request(app).delete(`/api/staff/${createdStaffId}`);
    expect(res.status).toBe(204);
  });

  // Test project endpoints
  test('GET /api/projects returns 200 and array', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('POST /api/projects creates a new project', async () => {
    const payload = {
      name: `TestProject_${Date.now()}`,
      description: 'Integration test project',
      partner_name: 'TestPartner',
      team_lead: 'LeadTester',
      budget: 1000
    };
    const res = await request(app).post('/api/projects').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe(payload.name);
    createdProjectId = res.body.id;
  });

  test('PUT /api/projects/:id updates the project', async () => {
    const update = { budget: 2000 };
    const res = await request(app).put(`/api/projects/${createdProjectId}`).send(update);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(createdProjectId);
    expect(res.body.budget).toBe(2000);
  });

  test('DELETE /api/projects/:id deletes the project', async () => {
    const res = await request(app).delete(`/api/projects/${createdProjectId}`);
    expect(res.status).toBe(204);
  });

});

// Export to satisfy isolatedModules flag
export {}; 