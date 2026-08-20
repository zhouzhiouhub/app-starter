import { BadRequestException } from "@nestjs/common";
import {
  apiErrorCodes,
  collectPublishableImageSrcIssues,
  type PageSchema,
} from "@app-starter/schema";

export function assertPublishablePageImageSources(schema: PageSchema): void {
  const invalidImageSources = collectPublishableImageSrcIssues(schema);

  if (invalidImageSources.length === 0) {
    return;
  }

  throw new BadRequestException({
    code: apiErrorCodes.VALIDATION_ERROR,
    message:
      "Page image sources must use relative paths, HTTPS image URLs, or media references.",
    details: {
      invalidImageSources,
    },
  });
}
