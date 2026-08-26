import { Controller, Headers, Post, Req } from "@nestjs/common";
import type { RawBodyCaptureRequest } from "../../common/raw-body.js";
import { CurrentRequestId } from "../../common/request-id.decorator.js";
import { throwStripeWebhookReserved } from "./stripe-webhook-placeholder.js";

@Controller("webhooks")
export class StripeWebhookController {
  @Post("stripe")
  receiveStripeWebhook(
    @CurrentRequestId() requestId = "local-dev",
    @Headers("stripe-signature") stripeSignature?: string,
    @Req() request?: RawBodyCaptureRequest,
  ) {
    return throwStripeWebhookReserved({
      request,
      requestId,
      stripeSignature,
    });
  }
}
