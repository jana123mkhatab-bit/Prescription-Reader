// Best-effort, demo-scope heuristic only — NOT a real clinical drug-interaction
// checker. Flags a pair of saved medications if one's warnings text happens to
// mention the other's name. Always framed to the user as best-effort.
export function checkInteractions(medications) {
  return medications.map((med, i) => {
    const others = medications.filter((_, j) => j !== i);
    const flaggedWith = others.filter((other) => {
      const warnings = (med.warnings || "").toLowerCase();
      const otherNames = [other.brandName, other.genericName].filter(Boolean).map((n) => n.toLowerCase());
      return otherNames.some((name) => name.length > 2 && warnings.includes(name));
    });
    return { ...med, flaggedWith: flaggedWith.map((f) => f.id) };
  });
}
