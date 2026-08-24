import { Controller, Post } from "@nestjs/common";
import { CurrentRequestId } from "../../common/request-id.decorator.js";
import { throwCommerceDisabled } from "./commerce-disabled.js";

@Controller("webhooks")
export class StripeWebhookController {
  @Post("stripe")
  receiveStripeWebhook(@CurrentRequestId() requestId = "local-dev") {
    return throwCommerceDisabled({
      message: "Stripe webhook is reserved in MVP and disabled by default.",
      requestId,
    });
  }
}
