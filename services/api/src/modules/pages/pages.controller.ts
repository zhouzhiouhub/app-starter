import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminApiGuard } from "../../common/admin-api.guard.js";
import { requireIdempotencyKey } from "../../common/idempotency-key.js";
import { PagesService } from "./pages.service.js";

@Controller("pages")
@UseGuards(AdminApiGuard)
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @Get()
  list(@Query("page") page?: string, @Query("limit") limit?: string) {
    return this.pages.list({ page, limit });
  }

  @Post()
  create(
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
  ) {
    return this.pages.create(body, requireIdempotencyKey(idempotencyKey));
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.pages.getById(id);
  }

  @Put(":id/schema")
  saveDraft(
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("id") id: string,
  ) {
    return this.pages.saveDraft(
      id,
      body,
      requireIdempotencyKey(idempotencyKey),
    );
  }

  @Post(":id/publish")
  publish(
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("id") id: string,
  ) {
    return this.pages.publish(
      id,
      isEmptyBody(body) ? undefined : body,
      requireIdempotencyKey(idempotencyKey),
    );
  }
}

function isEmptyBody(body: unknown): boolean {
  return !body || (typeof body === "object" && Object.keys(body).length === 0);
}
