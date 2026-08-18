import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query
} from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { PagesService } from "./pages.service.js";

@Controller("pages")
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  @Get()
  list(@Query("page") page?: string, @Query("limit") limit?: string) {
    return this.pages.list({ page, limit });
  }

  @Post()
  create(
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.pages.create(body);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.pages.getById(id);
  }

  @Put(":id/schema")
  saveDraft(
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("id") id: string
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.pages.saveDraft(id, body);
  }

  @Post(":id/publish")
  publish(
    @Body() body: unknown,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Param("id") id: string
  ) {
    requireIdempotencyKey(idempotencyKey);
    return this.pages.publish(id, isEmptyBody(body) ? undefined : body);
  }
}

function requireIdempotencyKey(idempotencyKey: string | undefined) {
  if (!idempotencyKey) {
    throw new BadRequestException({
      code: apiErrorCodes.VALIDATION_ERROR,
      message: "Idempotency-Key header is required for write operations."
    });
  }

  return idempotencyKey;
}

function isEmptyBody(body: unknown): boolean {
  return !body || (typeof body === "object" && Object.keys(body).length === 0);
}
