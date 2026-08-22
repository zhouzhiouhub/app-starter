import {
  ConflictException,
  Controller,
  Get,
  Post,
  UseGuards,
} from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { CurrentRequestId } from "../../common/request-id.decorator.js";
import { RequireScopes } from "../../common/require-scopes.decorator.js";

@Controller()
export class CommerceController {
  @Get("products")
  @UseGuards(AdminApiGuard)
  @RequireScopes("product:read")
  getProducts(@CurrentRequestId() requestId = "local-dev") {
    return {
      data: [],
      meta: { requestId },
    };
  }

  @Get("orders")
  @UseGuards(AdminApiGuard)
  @RequireScopes("order:read")
  getOrders(@CurrentRequestId() requestId = "local-dev") {
    return {
      data: [],
      meta: { requestId },
    };
  }

  @Post("public/cart")
  addToCart(@CurrentRequestId() requestId = "local-dev") {
    return this.disabled(requestId);
  }

  @Post("public/checkout")
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
