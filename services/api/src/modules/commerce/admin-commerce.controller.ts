import {
  Controller,
  Get,
  Headers,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { requireIdempotencyKey } from "../../common/idempotency-key.js";
import { CurrentRequestId } from "../../common/request-id.decorator.js";
import { RequireScopes } from "../../common/require-scopes.decorator.js";
import { throwAdminCommerceDetailUnavailable } from "./admin-commerce-detail-placeholder.js";
import {
  throwAdminProductUnavailable,
  throwAdminProductWriteDisabled,
} from "./admin-product-placeholder.js";
import { createCommerceReadPlaceholder } from "./commerce-read-placeholder.js";

@Controller()
@UseGuards(AdminApiGuard)
export class AdminCommerceController {
  @Get("products")
  @RequireScopes("product:read")
  getProducts(@CurrentRequestId() requestId = "local-dev") {
    return createCommerceReadPlaceholder("products", requestId);
  }

  @Post("products")
  @RequireScopes("product:write")
  createProduct(
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    requireIdempotencyKey(idempotencyKey);

    return throwAdminProductWriteDisabled(requestId);
  }

  @Get("products/:id")
  @RequireScopes("product:read")
  getProduct(@CurrentRequestId() requestId = "local-dev") {
    return throwAdminProductUnavailable(requestId);
  }

  @Get("products/:id/variants")
  @RequireScopes("product:read")
  getProductVariants(@CurrentRequestId() requestId = "local-dev") {
    return createCommerceReadPlaceholder("variants", requestId);
  }

  @Get("products/:id/prices")
  @RequireScopes("product:read")
  getProductPrices(@CurrentRequestId() requestId = "local-dev") {
    return createCommerceReadPlaceholder("prices", requestId);
  }

  @Get("products/:id/inventory")
  @RequireScopes("product:read")
  getProductInventory(@CurrentRequestId() requestId = "local-dev") {
    return createCommerceReadPlaceholder("inventory", requestId);
  }

  @Patch("products/:id")
  @RequireScopes("product:write")
  updateProduct(
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @CurrentRequestId() requestId = "local-dev",
  ) {
    requireIdempotencyKey(idempotencyKey);

    return throwAdminProductWriteDisabled(requestId);
  }

  @Get("orders")
  @RequireScopes("order:read")
  getOrders(@CurrentRequestId() requestId = "local-dev") {
    return createCommerceReadPlaceholder("orders", requestId);
  }

  @Get("orders/:id")
  @RequireScopes("order:read")
  getOrder(@CurrentRequestId() requestId = "local-dev") {
    return throwAdminCommerceDetailUnavailable("order", requestId);
  }

  @Get("payments")
  @RequireScopes("payment:read")
  getPayments(@CurrentRequestId() requestId = "local-dev") {
    return createCommerceReadPlaceholder("payments", requestId);
  }

  @Get("payments/:id")
  @RequireScopes("payment:read")
  getPayment(@CurrentRequestId() requestId = "local-dev") {
    return throwAdminCommerceDetailUnavailable("payment", requestId);
  }
}
