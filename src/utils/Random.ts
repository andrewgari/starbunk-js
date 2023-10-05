export default {
  roll: (max: number) => {
    return Math.floor(Math.random() * max);
  },
  percentChance: (target: number) => {
    const roll = Math.floor(Math.random() * 100);
    return roll <= target;
  }
};
