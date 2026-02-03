# VFX Types and Guidelines

## Combat Effects
- **Impacts**: Spark bursts, dust puffs, blood
- **Weapons**: Muzzle flash, sword trails, energy
- **Hits**: Screen shake, damage numbers, flash
- **Deaths**: Dissolve, explosion, fade

## Ability Effects
- **Casting**: Wind-up, charge indicator
- **Active**: Projectile, beam, area
- **Impact**: Hit confirmation, spread
- **Buff/Debuff**: Aura, icon, particles

## Environmental
- **Weather**: Rain, snow, fog, wind
- **Ambient**: Dust motes, fireflies, leaves
- **Hazards**: Fire, poison, electricity
- **Water**: Ripples, splashes, foam

## Performance Budget
- GPU particles: 10K-50K per effect
- Overdraw: Watch transparent layering
- Emitters: Pool and reuse
- Simulation: Cache when static

## Quality Guidelines
- Clear silhouette
- Readable at distance
- Consistent style
- Appropriate timing
- Good value/saturation

## Common Mistakes
- Too many particles
- Effects too large/small
- Wrong timing
- Inconsistent style
- Performance heavy
