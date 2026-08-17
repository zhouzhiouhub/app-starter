import { Module } from "@nestjs/common";
import {
  AdminPagesController,
  PublicController
} from "./public.controller.js";
import { PublishedPageStore } from "./published-page.store.js";

@Module({
  controllers: [PublicController, AdminPagesController],
  providers: [PublishedPageStore]
})
export class PublicModule {}
