import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { AuditController } from "./audit.controller.js";
import { AuditService } from "./audit.service.js";

@Module({
  controllers: [AuditController],
  exports: [AuditService],
  imports: [PrismaModule],
  providers: [AuditService],
})
export class AuditModule {}
