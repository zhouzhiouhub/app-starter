import { Module } from "@nestjs/common";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { PagesController } from "./pages.controller.js";
import { PagesService } from "./pages.service.js";

@Module({
  controllers: [PagesController],
  providers: [AdminApiGuard, PagesService],
  exports: [PagesService],
})
export class PagesModule {}
