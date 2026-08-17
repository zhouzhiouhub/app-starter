import { Controller, Get, Post } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";

@Controller()
export class CommerceController {
  @Get("products")
  getProducts() {
    return {
      data: [],
      meta: { requestId: "local-dev" }
    };
  }

  @Get("orders")
  getOrders() {
    return {
      data: [],
      meta: { requestId: "local-dev" }
    };
  }

  @Post("public/cart")
  addToCart() {
    return this.disabled();
  }

  @Post("public/checkout")
  checkout() {
    return this.disabled();
  }

  private disabled() {
    return {
      error: {
        code: apiErrorCodes.COMMERCE_DISABLED,
        message: "Commerce is reserved in MVP and disabled by default.",
        requestId: "local-dev"
      }
    };
  }
}
