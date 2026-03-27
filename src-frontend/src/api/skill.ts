export {
	getGetSkillQueryKey,
	getGetSkillsInfiniteQueryKey,
	useCreateSkill,
	useDeleteSkill,
	useGetSkillSuspense,
	useGetSkillsSuspenseInfinite,
	useUpdateSkill,
} from "./generated/endpoints/skill/skill";

import queryClient from "@/query-client";
import {
	getGetSkillQueryKey,
	getGetSkillsInfiniteQueryKey,
} from "./generated/endpoints/skill/skill";

export async function invalidateSkillQueries(skillId?: number) {
	await queryClient.invalidateQueries({ queryKey: getGetSkillsInfiniteQueryKey() });
	if (skillId !== undefined) {
		await queryClient.invalidateQueries({ queryKey: getGetSkillQueryKey(skillId) });
	}
}
