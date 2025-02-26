# Bugs

These are the fixes that annoyed me at the end of the last session.

- [ ] Fix the wave animations or remove them.
- [ ] Figure out why height goes from 10m to 0m when the submarine crashes onto the water.
- [ ] Fix the propellers speed so that it matches the propulsion.
- [x] Make the world bigger
- [ ] Improve chunk loading and immersiveness without compromising performance.
- [ ] Add more interesting terrain like trenches, continental shelfs, islands, and volcanoes.
- [ ] Unify the different settings that we have into a settings panel.

# Testing

- [ ] Create a list of things to test.
   - [ ] Basic motion
   - [ ] Collision detection with rocks and terrain.
   - [ ] Torpedo controls and effects 
   - [ ] Water splashes and sand effects
   - [ ] Jump physics

# Submarine Game - Future Enhancements

These are the features I should add in the short to medium term.

## Control Improvements

- [ ] Add realistic banking effect when strafing (roll rotation when moving sideways)
  - Implement smooth banking that doesn't interfere with yaw
  - Make sure rotation order is properly managed
  - Add adjustable banking intensity option

- [ ] Refine collision detection and response
  - Improve the repulsion forces to feel more natural
  - Add collision sounds and visual effects

- [ ] Add acceleration/deceleration curves to movement
  - Make movement feel more submarine-like with inertia

## Visual Enhancements

- [ ] Add bubbles from propeller when moving
- [ ] Add ocean current effects that slightly move the submarine
- [ ] Improve water jet effects during strafing
- [ ] Add more detailed ocean floor with coral, plants, and shipwrecks

## Gameplay Features

- [ ] Add collectible items
- [ ] Add enemy submarines or sea creatures
- [ ] Implement a simple mission system
- [ ] Add a depth pressure mechanic that affects the submarine at extreme depths

## Technical Improvements

- [ ] Optimize particle systems for better performance
- [ ] Add sound effects and ambient ocean sounds
- [ ] Implement saving/loading of game state

## Control Reference

Current submarine control scheme:
- Mouse: Control direction (aim) - affects yaw and pitch
- W/S: Move forward/backward in the direction the submarine is pointing
- A/D: Strafe left/right perpendicular to forward direction
- Space: Fire torpedo
- H: Toggle help 