import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      data: {
        authLogin: "POST /api/v1/auth/login",
        ok: true,
        service: "api",
        version: "0.1.0"
      }
    };
  }
}
