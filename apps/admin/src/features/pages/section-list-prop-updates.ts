import type { PageSchema, SectionNode } from "@app-starter/schema";

export interface FaqItemValue {
  answer: string;
  question: string;
}

export interface ImageValue {
  alt: string;
  src: string;
}

export interface SpecRowValue {
  label: string;
  value: string;
}

export function readFaqItems(section: SectionNode): FaqItemValue[] {
  return readObjectArray(section.props.items).map((item) => ({
    answer: readString(item.answer),
    question: readString(item.question),
  }));
}

export function addFaqItem(current: PageSchema, sectionId: string): PageSchema {
  return updateItems(current, sectionId, "items", readFaqItems, (items) => [
    ...items,
    {
      answer: "Add an answer.",
      question: "New question",
    },
  ]);
}

export function updateFaqItem(
  current: PageSchema,
  sectionId: string,
  index: number,
  field: keyof FaqItemValue,
  value: string,
): PageSchema {
  return updateItems(current, sectionId, "items", readFaqItems, (items) =>
    updateAt(items, index, (item) => ({ ...item, [field]: value })),
  );
}

export function removeFaqItem(
  current: PageSchema,
  sectionId: string,
  index: number,
): PageSchema {
  return updateItems(current, sectionId, "items", readFaqItems, (items) =>
    removeAt(items, index),
  );
}

export function readImages(section: SectionNode): ImageValue[] {
  return readObjectArray(section.props.images).map((image) => ({
    alt: readString(image.alt),
    src: readString(image.src),
  }));
}

export function addImage(current: PageSchema, sectionId: string): PageSchema {
  return updateItems(current, sectionId, "images", readImages, (images) => [
    ...images,
    {
      alt: "",
      src: "",
    },
  ]);
}

export function updateImage(
  current: PageSchema,
  sectionId: string,
  index: number,
  field: keyof ImageValue,
  value: string,
): PageSchema {
  return updateItems(current, sectionId, "images", readImages, (images) =>
    updateAt(images, index, (image) => ({ ...image, [field]: value })),
  );
}

export function removeImage(
  current: PageSchema,
  sectionId: string,
  index: number,
): PageSchema {
  return updateItems(current, sectionId, "images", readImages, (images) =>
    removeAt(images, index),
  );
}

export function readSpecRows(section: SectionNode): SpecRowValue[] {
  return readObjectArray(section.props.rows).map((row) => ({
    label: readString(row.label),
    value: readString(row.value),
  }));
}

export function addSpecRow(current: PageSchema, sectionId: string): PageSchema {
  return updateItems(current, sectionId, "rows", readSpecRows, (rows) => [
    ...rows,
    {
      label: "Label",
      value: "Value",
    },
  ]);
}

export function updateSpecRow(
  current: PageSchema,
  sectionId: string,
  index: number,
  field: keyof SpecRowValue,
  value: string,
): PageSchema {
  return updateItems(current, sectionId, "rows", readSpecRows, (rows) =>
    updateAt(rows, index, (row) => ({ ...row, [field]: value })),
  );
}

export function removeSpecRow(
  current: PageSchema,
  sectionId: string,
  index: number,
): PageSchema {
  return updateItems(current, sectionId, "rows", readSpecRows, (rows) =>
    removeAt(rows, index),
  );
}

function updateItems<TItem extends object>(
  current: PageSchema,
  sectionId: string,
  propName: string,
  reader: (section: SectionNode) => TItem[],
  updater: (items: TItem[]) => TItem[],
): PageSchema {
  return {
    ...current,
    sections: current.sections.map((section) => {
      if (section.id !== sectionId) {
        return section;
      }

      return {
        ...section,
        props: {
          ...section.props,
          [propName]: updater(reader(section)),
        },
      };
    }),
  };
}

function updateAt<TItem>(
  items: TItem[],
  index: number,
  updater: (item: TItem) => TItem,
): TItem[] {
  return items.map((item, itemIndex) =>
    itemIndex === index ? updater(item) : item,
  );
}

function removeAt<TItem>(items: TItem[], index: number): TItem[] {
  return items.filter((_item, itemIndex) => itemIndex !== index);
}

function readObjectArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
