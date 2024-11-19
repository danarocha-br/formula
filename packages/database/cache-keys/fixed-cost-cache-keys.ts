export const FixedCostCacheKeys = {
  fixedCost: (userId: string, fixedCostId: string) =>
    `fixed-cost:${userId}:${fixedCostId}`,
  fixedCostsList: (userId: string) =>
    `fixed-cost-list:${userId}`,
};
