export const VARIANT_HUB_MESSAGE_SOURCE = "varianthub-preview" as const;

export type VariantHubPreviewMessage =
  | {
      source: typeof VARIANT_HUB_MESSAGE_SOURCE;
      type: "shortcut";
      key: "ArrowLeft" | "ArrowRight" | "Escape";
      shiftKey: boolean;
      projectId?: string;
      itemKey?: string;
      variantId?: string;
      instanceId?: string;
    }
  | {
      source: typeof VARIANT_HUB_MESSAGE_SOURCE;
      type: "state";
      itemKey?: string;
      variantId?: string;
      projectId?: string;
      instanceId?: string;
      href: string;
      scrollY: number;
    };

export function isVariantHubPreviewMessage(
  value: unknown,
): value is VariantHubPreviewMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  if (message.source !== VARIANT_HUB_MESSAGE_SOURCE) return false;
  const hasValidIdentity =
    (message.projectId === undefined || typeof message.projectId === "string") &&
    (message.itemKey === undefined || typeof message.itemKey === "string") &&
    (message.variantId === undefined || typeof message.variantId === "string") &&
    (message.instanceId === undefined || typeof message.instanceId === "string");
  if (message.type === "shortcut") {
    return (
      (message.key === "ArrowLeft" ||
        message.key === "ArrowRight" ||
        message.key === "Escape") &&
      typeof message.shiftKey === "boolean" &&
      hasValidIdentity
    );
  }
  return (
    message.type === "state" &&
    typeof message.href === "string" &&
    typeof message.scrollY === "number" &&
    Number.isFinite(message.scrollY) &&
    hasValidIdentity
  );
}
