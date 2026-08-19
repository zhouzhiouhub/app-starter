import {
  ConflictException,
  Controller,
  Get,
  Post,
  UseGuards,
} from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { RequireScopes } from "../../common/require-scopes.decorator.js";

@Controller()
export class CommerceController {
  @Get("products")
  @UseGuards(AdminApiGuard)
  @RequireScopes("product:read")
  getProducts() {
    return {
      data: [],
      meta: { requestId: "local-dev" }
    };
  }

  @Get("orders")
  @UseGuards(AdminApiGuard)
  @RequireScopes("order:read")
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
    throw new ConflictException({
      code: apiErrorCodes.COMMERCE_DISABLED,
      message: "Commerce is reserved in MVP and disabled by default.",
    });
  }
}
