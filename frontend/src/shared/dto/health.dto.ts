export interface HealthCheckDto {
  status: "ok" | "degraded" | "unhealthy";
  mode: "mock" | "live" | "degraded";
  version: string;
}
