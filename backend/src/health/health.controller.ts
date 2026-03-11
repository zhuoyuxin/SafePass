import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  health(): { ok: true; timestamp: string } {
    return { ok: true, timestamp: new Date().toISOString() };
  }
}

