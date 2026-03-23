export interface AffinitySkill {
  name: string;
  description: string;
  content: string;
}

export type AffinitySkillRegistry = readonly AffinitySkill[];

export function defineAffinitySkill<TSkill extends AffinitySkill>(
  skill: TSkill,
): TSkill {
  return skill;
}
