import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      data: {
        ok: true,
        service: "api",
        version: "0.1.0"
      }
    };
  }
}
