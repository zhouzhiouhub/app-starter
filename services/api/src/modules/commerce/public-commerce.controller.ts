import { Controller, Post } from "@nestjs/common";
import { CurrentRequestId } from "../../common/request-id.decorator.js";
import { throwCommerceDisabled } from "./commerce-disabled.js";

@Controller("public")
export class PublicCommerceController {
  @Post("cart")
  addToCart(@CurrentRequestId() requestId = "local-dev") {
    return throwCommerceDisabled({ requestId });
  }

  @Post("checkout")
  checkout(@CurrentRequestId() requestId = "local-dev") {
    return throwCommerceDisabled({ requestId });
  }
}
