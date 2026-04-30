import "server-only";

import type {
  CustomFieldCatalogResult,
  CustomFieldBindingSummary,
  CustomFieldDefinitionSummary,
  CustomFieldObjectType,
  CustomFieldTargetLevel,
} from "@/lib/domain/custom-fields";

const normalizeCode = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

export type ContextualCustomFieldResolved = {
  definition: CustomFieldDefinitionSummary;
  binding: CustomFieldBindingSummary;
};

type ResolveContextualCustomFieldsInput = {
  catalog: CustomFieldCatalogResult;
  objectTypeCode: CustomFieldObjectType;
  screenCode: string;
  targetLevels: CustomFieldTargetLevel[];
};

export const resolveContextualCustomFields = ({
  catalog,
  objectTypeCode,
  screenCode,
  targetLevels,
}: ResolveContextualCustomFieldsInput): ContextualCustomFieldResolved[] => {
  const normalizedScreenCode = normalizeCode(screenCode);
  const resolved: ContextualCustomFieldResolved[] = [];

  catalog.definitions.forEach((definition) => {
    definition.bindings.forEach((binding) => {
      if (binding.objectTypeCode !== objectTypeCode) {
        return;
      }
      if (!targetLevels.includes(binding.targetLevel)) {
        return;
      }
      if (normalizeCode(binding.screenCode) !== normalizedScreenCode) {
        return;
      }
      if (binding.bindingStatus !== "active") {
        return;
      }
      if (binding.visibilityMode === "hidden" || !definition.isDefaultVisible) {
        return;
      }

      resolved.push({
        definition,
        binding,
      });
    });
  });

  return resolved.sort((left, right) => {
    if (left.binding.targetLevel !== right.binding.targetLevel) {
      return left.binding.targetLevel.localeCompare(right.binding.targetLevel, "it");
    }
    if (left.binding.sectionCode !== right.binding.sectionCode) {
      return left.binding.sectionCode.localeCompare(right.binding.sectionCode, "it");
    }
    if (left.binding.sortOrder !== right.binding.sortOrder) {
      return left.binding.sortOrder - right.binding.sortOrder;
    }
    return left.definition.label.localeCompare(right.definition.label, "it");
  });
};

export const formatContextSectionLabel = (sectionCode: string) => {
  const normalized = sectionCode.trim();
  if (!normalized) {
    return "Generale";
  }
  return normalized
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\w/, (token) => token.toUpperCase());
};

