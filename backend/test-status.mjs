import { createApp } from './src/app.js';
import { initDatabase } from './src/db/index.js';

async function test() {
  await initDatabase();
  const app = createApp();
  const tenantId = '00000000-0000-0000-0000-000000000001';
  
  const project = await app.dispatch({
    method: 'POST',
    path: '/creative-projects',
    headers: { 'x-tenant-id': tenantId },
    body: {
      name: 'Test Project',
      creative_subject: {
        subject_type: 'product',
        name: 'Test Product',
        allowed_claims: [],
        forbidden_claims: [],
        unknown_fields: [],
        source: 'user_input'
      },
      source_assets: [{
        asset_type: 'image',
        source: 'external_url',
        url: 'https://example.com/product.png'
      }]
    }
  });
  console.log('Project status:', project.body.creative_project?.status);
  
  const gen = await app.dispatch({
    method: 'POST',
    path: '/generation-requests',
    headers: { 'x-tenant-id': tenantId },
    body: {
      project_id: project.body.creative_project.id,
      source_asset_ids: [project.body.source_assets[0].id],
      provider: 'mock',
      objective: 'awareness',
      platform: 'tiktok',
      duration_seconds: 15,
      aspect_ratio: '9:16',
      language: 'Turkish'
    }
  });
  console.log('Video job status:', gen.body.video_job?.status);
  console.log('Gen request status:', gen.body.generation_request?.status);
  
  const poll = await app.dispatch({
    method: 'GET',
    path: '/video-jobs/' + gen.body.video_job?.id,
    headers: { 'x-tenant-id': tenantId }
  });
  console.log('Poll status:', poll.body.video_job?.status);
  
  process.exit(0);
}
test().catch(e => { console.error(e); process.exit(1); });