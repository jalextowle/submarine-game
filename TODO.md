# Submarine Game - Future Enhancements

This document tracks planned improvements and features for the submarine game.

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