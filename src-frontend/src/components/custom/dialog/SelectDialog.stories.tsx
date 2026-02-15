import { Button } from "@/components/ui/button";
import {
  SelectDialog,
  SelectDialogContent,
  SelectDialogEmpty,
  SelectDialogFooter,
  SelectDialogGroup,
  SelectDialogItem,
  SelectDialogList,
  SelectDialogSearch,
  SelectDialogTrigger,
} from "./SelectDialog";

function SingleSelect() {
  return (
    <SelectDialog value={model} onValueChange={setModel}>
      <SelectDialogTrigger>
        <Button variant="outline">{model || "Select model"}</Button>
      </SelectDialogTrigger>
      <SelectDialogContent>
        <SelectDialogSearch placeholder="Search models..." />
        <SelectDialogList>
          <SelectDialogEmpty>No models found.</SelectDialogEmpty>
          <SelectDialogGroup>
            {models.map((m) => (
              <SelectDialogItem key={m} value={m} />
            ))}
          </SelectDialogGroup>
        </SelectDialogList>
      </SelectDialogContent>
    </SelectDialog>
  );
}

function SingleGroupedSelect() {
  return (
    <SelectDialog value={selected} onValueChange={setSelected}>
      <SelectDialogTrigger>
        <Button variant="outline">{selected || "Pick one"}</Button>
      </SelectDialogTrigger>
      <SelectDialogContent>
        <SelectDialogSearch />
        <SelectDialogList>
          <SelectDialogEmpty />
          {groups.map((group, i) => (
            <>
              <SelectDialogGroup key={group.heading} heading={group.heading}>
                {group.items.map((item) => (
                  <SelectDialogItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectDialogItem>
                ))}
              </SelectDialogGroup>
              {i < groups.length - 1 && <SelectDialogSeparator />}
            </>
          ))}
        </SelectDialogList>
      </SelectDialogContent>
    </SelectDialog>
  );
}

function MultiSelect() {
  return (
    <SelectDialog mode="multi" value={tags} onValueChange={setTags}>
      <SelectDialogTrigger>
        <Button variant="outline">Select tags ({tags.length})</Button>
      </SelectDialogTrigger>
      <SelectDialogContent>
        <SelectDialogSearch placeholder="Search tags..." />
        <SelectDialogList>
          <SelectDialogEmpty>No tags found.</SelectDialogEmpty>
          <SelectDialogGroup>
            {allTags.map((tag) => (
              <SelectDialogItem key={tag} value={tag} />
            ))}
          </SelectDialogGroup>
        </SelectDialogList>
        <SelectDialogFooter onConfirm={(keys) => setTags(keys)} />
      </SelectDialogContent>
    </SelectDialog>
  );
}
