export interface CodeMember {
  id: string;
  name: string;
  code: string;
}

export interface ObservedCodeCluster {
  prefix: string;
  members: CodeMember[];
  coverage: number;
  statement: string;
}

function normalizedDigits(code: string): string {
  return code.replace(/\D/g, "");
}

/**
 * Finds descriptive local prefix pockets without claiming that PLU digits encode
 * product semantics. A cluster is surfaced only as an observed relationship.
 */
export function discoverObservedPrefixClusters(
  members: CodeMember[],
  minimumMembers = 2,
  minimumPrefixLength = 2,
): ObservedCodeCluster[] {
  const valid = members
    .map((member) => ({ ...member, code: normalizedDigits(member.code) }))
    .filter((member) => member.code.length >= minimumPrefixLength);
  const candidates = new Map<string, CodeMember[]>();

  valid.forEach((member) => {
    for (
      let length = minimumPrefixLength;
      length < member.code.length;
      length += 1
    ) {
      const prefix = member.code.slice(0, length);
      const group = candidates.get(prefix) ?? [];
      group.push(member);
      candidates.set(prefix, group);
    }
  });

  return [...candidates.entries()]
    .filter(([, group]) => group.length >= minimumMembers)
    .filter(([prefix, group]) => {
      const longerPrefixExists = [...candidates.entries()].some(
        ([candidate, candidateGroup]) =>
          candidate.startsWith(prefix) &&
          candidate.length > prefix.length &&
          candidateGroup.length === group.length,
      );
      return !longerPrefixExists;
    })
    .map(([prefix, group]) => ({
      prefix,
      members: group,
      coverage: group.length / Math.max(1, valid.length),
      statement: `${group.length} listed items share the observed ${prefix} prefix. This is a memory relationship, not a code-generation rule.`,
    }))
    .sort((left, right) =>
      right.members.length - left.members.length || right.prefix.length - left.prefix.length,
    );
}
