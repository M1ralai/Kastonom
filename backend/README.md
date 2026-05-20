# Kastonom Backend

Minimal backend orchestration API for the Kastonom hackathon MVP.

## Run

```bash
cd backend
npm test
npm start
```

The server defaults to mock mode and listens on `http://localhost:3001`.

Swagger UI is available at `http://localhost:3001/docs`.

The OpenAPI document is available at `http://localhost:3001/openapi.json`.

## Safe Defaults

- `KASTONOM_MODE=mock`
- `KASTONOM_FALLBACK_ENABLED=true` in mock mode
- `KASTONOM_DEMO_TENANT_ID=00000000-0000-0000-0000-000000000001`
- `KASTONOM_DEFAULT_VIDEO_PROVIDER=mock`
- `KASTONOM_MOCK_PREVIEW_URL=/demo-assets/mock-ad-preview.mp4`

Live provider and ad platform credentials are read only from environment variables and are never returned in API responses. Missing live configuration fails closed.

## Implemented Endpoints

- `GET /health`
- `GET /openapi.json`
- `GET /docs`
- `POST /creative-projects`
- `GET /creative-projects/{id}`
- `POST /generation-requests`
- `GET /video-jobs/{id}`
- `POST /generated-videos/{id}/select`
- `POST /ad-publications`
- `POST /ad-publications/{id}/metrics/sync`
- `POST /creative-iteration-suggestions`
- `GET /demo/fallback`
