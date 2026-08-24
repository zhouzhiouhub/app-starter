import { Module } from "@nestjs/common";
import { AdminCommerceController } from "./admin-commerce.controller.js";
import { PublicCommerceController } from "./public-commerce.controller.js";

@Module({
  controllers: [AdminCommerceController, PublicCommerceController],
})
export class CommerceModule {}
