import { Controller, Get, Post } from "@nestjs/common";
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
  addToCart(@CurrentRequestId() requestId = "local-dev") {
    return throwCommerceDisabled({ requestId });
  }

  @Post("checkout")
  checkout(@CurrentRequestId() requestId = "local-dev") {
    return throwCommerceDisabled({ requestId });
  }
}
