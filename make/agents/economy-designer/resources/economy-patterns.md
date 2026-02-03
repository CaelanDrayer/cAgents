# Economy Design Patterns

## Sink/Source Balance
- **Sources**: Quest rewards, drops, purchases
- **Sinks**: Upgrades, consumables, taxes, repairs
- Goal: Sources = Sinks over time
- Monitor for inflation/deflation

## Currency Tiers
- **Soft Currency**: Easy to earn, basic purchases
- **Hard Currency**: Slower to earn, premium items
- **Event Currency**: Limited-time, focused rewards
- Conversion rates between tiers

## Progression Curves
```
Linear: Same XP per level
Exponential: Increasing XP per level
S-Curve: Fast early, slow mid, fast late
```

## Loot Tables
- Define drop pools
- Weight by rarity
- Include pity systems
- Test for edge cases

## Rarity Tiers (Example)
- Common: 60% drop rate
- Uncommon: 25%
- Rare: 10%
- Epic: 4%
- Legendary: 1%

## Anti-Inflation Tools
- Currency sinks (repair costs, taxes)
- Time-limited currencies
- Account/character binding
- Auction house fees
- Upgrade failure/degradation

## Balancing Process
1. Spreadsheet model
2. Simulate player progression
3. Playtest with real players
4. Analyze data
5. Tune and iterate
