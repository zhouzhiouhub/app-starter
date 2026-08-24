import { Module } from "@nestjs/common";
import { AdminCommerceController } from "./admin-commerce.controller.js";
import { PublicCommerceController } from "./public-commerce.controller.js";
import { StripeWebhookController } from "./stripe-webhook.controller.js";

@Module({
  controllers: [
    AdminCommerceController,
    PublicCommerceController,
    StripeWebhookController,
  ],
})
export class CommerceModule {}
