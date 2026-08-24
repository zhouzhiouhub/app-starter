import { ConflictException, Controller, Post } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { CurrentRequestId } from "../../common/request-id.decorator.js";

@Controller("public")
export class PublicCommerceController {
  @Post("cart")
  addToCart(@CurrentRequestId() requestId = "local-dev") {
    return this.disabled(requestId);
  }

  @Post("checkout")
  checkout(@CurrentRequestId() requestId = "local-dev") {
    return this.disabled(requestId);
  }

  private disabled(requestId: string) {
    throw new ConflictException({
      code: apiErrorCodes.COMMERCE_DISABLED,
      message: "Commerce is reserved in MVP and disabled by default.",
      requestId,
    });
  }
}
