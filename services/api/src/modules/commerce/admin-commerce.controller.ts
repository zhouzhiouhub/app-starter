import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { CurrentRequestId } from "../../common/request-id.decorator.js";
import { RequireScopes } from "../../common/require-scopes.decorator.js";
import { createCommerceReadPlaceholder } from "./commerce-read-placeholder.js";

@Controller()
@UseGuards(AdminApiGuard)
export class AdminCommerceController {
  @Get("products")
  @RequireScopes("product:read")
  getProducts(@CurrentRequestId() requestId = "local-dev") {
    return createCommerceReadPlaceholder("products", requestId);
  }

  @Get("orders")
  @RequireScopes("order:read")
  getOrders(@CurrentRequestId() requestId = "local-dev") {
    return createCommerceReadPlaceholder("orders", requestId);
  }

  @Get("payments")
  @RequireScopes("payment:read")
  getPayments(@CurrentRequestId() requestId = "local-dev") {
    return createCommerceReadPlaceholder("payments", requestId);
  }
}
