import { Controller, Get, Headers, Post } from "@nestjs/common";
import { requireIdempotencyKey } from "../../common/idempotency-key.js";
import { CurrentRequestId } from "../../common/request-id.decorator.js";
import { throwCommerceDisabled } from "./commerce-disabled.js";
import { throwPublicProductUnavailable } from "./public-product-placeholder.js";

@Controller("public")
export class PublicCommerceController {
  @Get("products/:slug")
  getProduct(@CurrentRequestId() requestId = "local-dev") {
    return throwPublicProductUnavailable(requestId);
  }

  @Post("cart")
  addToCart(
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    requireIdempotencyKey(idempotencyKey);

    return throwCommerceDisabled({
      action: "add-to-cart",
      requestId,
      resource: "cart",
    });
  }

  @Post("checkout")
  checkout(
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    requireIdempotencyKey(idempotencyKey);

    return throwCommerceDisabled({
      action: "checkout",
      requestId,
      resource: "checkout",
    });
  }
}
