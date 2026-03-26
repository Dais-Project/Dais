import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useController, useFormContext } from "react-hook-form";
import { TABS_WORKSPACE_NAMESPACE } from "@/i18n/resources";
import { useGetSkillsSuspenseInfinite } from "@/api/skill";
import type { PageSkillBrief, SkillBrief } from "@/api/generated/schemas";
import { AsyncBoundary } from "@/components/custom/AsyncBoundary";
import {
  SelectDialog,
  SelectDialogContent,
  SelectDialogEmpty,
  SelectDialogFooter,
  SelectDialogGroup,
  SelectDialogItem,
  SelectDialogList,
  SelectDialogSearch,
  SelectDialogSkeleton,
  SelectDialogTrigger,
} from "@/components/custom/dialog/SelectDialog";
import { InfiniteScroll } from "@/components/custom/InfiniteScroll";
import { FieldItem } from "@/components/custom/item/FieldItem";
import { Button } from "@/components/ui/button";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import { PAGINATED_QUERY_DEFAULT_OPTIONS } from "@/constants/paginated-query-options";
import { useWorkspaceStore } from "@/stores/workspace-store";
import type { WorkspaceCreateFormValues, WorkspaceEditFormValues } from "../form-types";

function SkillQueryList() {
  const query = useGetSkillsSuspenseInfinite(undefined, {
    query: PAGINATED_QUERY_DEFAULT_OPTIONS,
  });

  return (
    <InfiniteScroll<SkillBrief, PageSkillBrief>
      query={query}
      selectItems={(page: PageSkillBrief) => page.items}
      itemRender={(skill: SkillBrief) => (
        <SelectDialogItem<number>
          key={skill.id}
          value={skill.id}
          keywords={[skill.name, skill.description ?? ""]}
        >
          {skill.name}
        </SelectDialogItem>
      )}
    />
  );
}

function SkillSelectedList({ selectedSkillIds }: { selectedSkillIds: number[] }) {
  const usableSkills = useWorkspaceStore((state) => state.current?.usable_skills);
  const { data } = useGetSkillsSuspenseInfinite(undefined, {
    query: PAGINATED_QUERY_DEFAULT_OPTIONS,
  });

  const usableSkillMap = useMemo(() => {
    const map = new Map<number, SkillBrief>();
    for (const skill of usableSkills ?? []) {
      map.set(skill.id, skill);
    }
    return map;
  }, [usableSkills]);

  const fetchedSkillMap = useMemo(() => {
    if (!data) {
      return new Map<number, SkillBrief>();
    }

    const map = new Map<number, SkillBrief>();
    const pages = data.pages as PageSkillBrief[];
    for (const skill of pages.flatMap((page) => page.items)) {
      map.set(skill.id, skill);
    }
    return map;
  }, [data]);

  const selectedSkills = useMemo(() => {
    const skills: SkillBrief[] = [];
    for (const id of selectedSkillIds) {
      const skillInWorkspace = usableSkillMap.get(id);
      if (skillInWorkspace) {
        skills.push(skillInWorkspace);
        continue;
      }

      const skillInFetched = fetchedSkillMap.get(id);
      if (skillInFetched) {
        skills.push(skillInFetched);
      }
    }
    return skills;
  }, [selectedSkillIds, usableSkillMap, fetchedSkillMap]);

  return (
    <div className="mt-2 space-y-2">
      {selectedSkills.map((skill) => (
        <Item key={skill.id} variant="outline" size="sm">
          <ItemContent>
            <ItemTitle>{skill.name}</ItemTitle>
          </ItemContent>
        </Item>
      ))}
    </div>
  );
}

export function SkillMultiSelectField() {
  const { t } = useTranslation(TABS_WORKSPACE_NAMESPACE);
  const { control } = useFormContext<WorkspaceCreateFormValues | WorkspaceEditFormValues>();
  const {
    field: { value, onChange },
    fieldState,
  } = useController({
    name: "usable_skill_ids",
    control,
  });

  const selectedSkillIds = value ?? [];

  return (
    <div>
      <FieldItem label={t("form.usable_skills.label")} fieldState={fieldState}>
        <SelectDialog<number> mode="multi" value={selectedSkillIds}>
          <SelectDialogTrigger>
            <Button type="button" variant="outline">
              {t("form.usable_skills.select")}
            </Button>
          </SelectDialogTrigger>
          <SelectDialogContent>
            <SelectDialogSearch placeholder={t("form.usable_skills.search_placeholder")} />
            <SelectDialogList>
              <SelectDialogEmpty>{t("form.usable_skills.empty")}</SelectDialogEmpty>
              <SelectDialogGroup>
                <AsyncBoundary skeleton={<SelectDialogSkeleton />}>
                  <SkillQueryList />
                </AsyncBoundary>
              </SelectDialogGroup>
            </SelectDialogList>
            <SelectDialogFooter
              onConfirm={onChange}
              confirmText={t("form.usable_skills.confirm")}
              cancelText={t("form.usable_skills.cancel")}
            />
          </SelectDialogContent>
        </SelectDialog>
      </FieldItem>

      <AsyncBoundary>
        <SkillSelectedList selectedSkillIds={selectedSkillIds} />
      </AsyncBoundary>
    </div>
  );
}
