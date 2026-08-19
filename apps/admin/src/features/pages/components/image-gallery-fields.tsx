import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Empty, Form, Input, Space, Tooltip, Typography } from "antd";
import {
  isMediaAssetReference,
  type PageSchema,
  type SectionNode,
} from "@app-starter/schema";
import { MediaAssetSelect } from "../../media/components/media-asset-select";
import { readImageAltFeedback } from "../image-alt-feedback";
import type { ImageSrcFeedback } from "../image-src-feedback";
import { readImageSrcFeedback } from "../image-src-feedback";
import {
  addImage,
  readImages,
  removeImage,
  updateImage,
} from "../section-list-prop-updates";

export function ImageGalleryFields(props: {
  onChange: (schema: PageSchema) => void;
  schema: PageSchema;
  section: SectionNode;
}) {
  const images = readImages(props.section);

  return (
    <Form.Item label="Images">
      <Space direction="vertical" style={{ width: "100%" }}>
        {images.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> : null}
        {images.map((image, index) => {
          const altFeedback = readImageAltFeedback(image.alt);
          const srcFeedback = readImageSrcFeedback(image.src);

          return (
            <Space
              direction="vertical"
              key={`${index}-${image.src}`}
              style={{ width: "100%" }}
            >
              <Space.Compact block>
                <Input
                  onChange={(event) =>
                    props.onChange(
                      updateImage(
                        props.schema,
                        props.section.id,
                        index,
                        "src",
                        event.target.value,
                      ),
                    )
                  }
                  placeholder="Image URL or media:// reference"
                  status={srcFeedback.status}
                  value={image.src}
                />
                <Input
                  onChange={(event) =>
                    props.onChange(
                      updateImage(
                        props.schema,
                        props.section.id,
                        index,
                        "alt",
                        event.target.value,
                      ),
                    )
                  }
                  placeholder="Alt text"
                  status={altFeedback.status}
                  value={image.alt}
                />
                <Tooltip title="Remove">
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      props.onChange(
                        removeImage(props.schema, props.section.id, index),
                      )
                    }
                  />
                </Tooltip>
              </Space.Compact>
              {renderImageFeedback(srcFeedback)}
              {renderImageFeedback(altFeedback)}
              <MediaAssetSelect
                onSelect={(asset) =>
                  props.onChange(
                    updateImage(
                      updateImage(
                        props.schema,
                        props.section.id,
                        index,
                        "src",
                        asset.reference,
                      ),
                      props.section.id,
                      index,
                      "alt",
                      image.alt || readAssetAltText(asset.metadata, asset.filename),
                    ),
                  )
                }
                value={isMediaAssetReference(image.src) ? image.src : undefined}
              />
            </Space>
          );
        })}
        <Button
          icon={<PlusOutlined />}
          onClick={() => props.onChange(addImage(props.schema, props.section.id))}
        >
          Add image
        </Button>
      </Space>
    </Form.Item>
  );
}

function renderImageFeedback(
  feedback: ImageSrcFeedback | ReturnType<typeof readImageAltFeedback>,
) {
  if (!feedback.help) {
    return null;
  }

  return (
    <Typography.Text
      type={feedback.status === "error" ? "danger" : "warning"}
    >
      {feedback.help}
    </Typography.Text>
  );
}

function readAssetAltText(
  metadata: Record<string, unknown>,
  filename: string,
): string {
  return typeof metadata.altText === "string" ? metadata.altText : filename;
}
