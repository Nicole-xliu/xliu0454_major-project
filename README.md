# xliu0454_major-project
## Project Description

This is the individual functional prototype I created as part of our group project. The entire project is based on our collaboratively developed visual system of “city grid + color-block structures + road extraction + gallery exhibition background”. On top of this shared foundation, I created my own independent animation extension.

The work first presents a 3-second daytime city scene, which then gradually darkens to represent the arrival of night. Following this transition, the city roads slowly light up with yellow textures. Soon after, numerous moving car lights appear on the roads, creating a lively night-time traffic scene.

When the city fully enters nighttime, the large color blocks (representing buildings) begin to appear one by one, completing their appearance within 10 seconds, and then randomly changing colors every 5 seconds, imitating city lights constantly switching tones. Combined with the picture frame + gallery interior background visual design, the animation resembles a painting hung inside an art museum—yet when the museum becomes quiet late at night, the city inside the painting quietly comes alive, giving the viewer a sense that the artwork has awakened and transitioned from stillness into life.

## Interaction Instructions

I chose Time-based Animation as the driving method, meaning that all animation events occur automatically in a fixed time sequence. After entering the page, you can experience the work through mouse movement and the automated animation flow: Moving the mouse changes the direction of the frame’s shadow subtly; once loaded, the animation plays automatically — first showing a daytime city, then fading into darkness after 3 seconds; yellow roads gradually light up in the night, car lights start moving along the grid roads; one second after the car lights appear, the large color blocks begin to emerge one by one over 10 seconds, and then shift colors every 5 seconds to create a dynamic night-lighting effect. You can also click anywhere on the screen to regenerate the entire artwork, including new road sampling, color placement, car-light paths, and the arrangement of large blocks.

My conceptual intention is to express the transition from day to night within a city street environment, with a particular emphasis on nighttime atmosphere building — the city slowly lighting up, roads appearing from the dark, car lights flowing, and large blocks illuminating like building façades shifting in color. The entire concept revolves around the flow of time, which is why I chose Time-based Animation as the core driving mechanism rather than approaching the design from structural or spatial construction like other group members (such as railway-based or 3D-form-focused designs). My focus is specifically on how the passage of time brings the city to life, making my animation approach clearly distinct from the rest of the group.

## Animation Inspiration

The inspiration for my city-night animation comes from several visual references. First, nighttime photographs of New York and Tokyo, where buildings gradually light up in the dark, and where different buildings have different lighting rhythms and color variations — this inspired my idea of “large blocks appearing sequentially and continuing to change colors.” Second, Mondrian’s color-block compositions, in which each block is independent; this led me to give every large block its own timer, allowing each one to appear and change color independently during the night sequence. Finally, looping neon-light videos, whose constantly shifting hues encouraged me to use a time-based looping color-change system to create a dynamic lighting mood across the entire night scene.

## Technical Explanation

**1. Time-based Animation**

This functional prototype relies entirely on the time variable t = (millis() - startTime) / 1000 to drive the animation process. millis() is the official timing function provided by p5.js, which returns the number of milliseconds since the program started. I use it as the global timeline to control all animations, such as maintaining the static daytime scene for 3 seconds, fading in the black screen over 12 seconds, completing the road reveal in 5 seconds, continuously moving the car lights, and allowing large color blocks to appear randomly within the following 10 seconds and automatically change colors every 5 seconds. As a result, the entire work forms a continuous “day → dusk → night” narrative, completely independent of external input, fully realizing the essential characteristics of time-based animation.

**Reference code:**  
[Link Text]（https://p5js.org/reference/#/p5/millis）

**2. renderScene(t): Time-based State Machine**

renderScene(t) is the core rendering scheduler of the entire project. It switches scene states according to the time t, forming a “time-based state machine.” When t is less than showDelay, the daytime scene is maintained. After that, during fadeDuration, it uses the smoothstep formula to softly fade in the black screen. Then, it uses time mapping to reveal the yellow roads row by row. Once the scene has fully entered nighttime, it draws the moving car lights along their paths, large color blocks appear sequentially according to each block’s appearTime, and each block automatically changes color according to the rhythm defined by nextColorChange. This function integrates all individual animations into a coherent narrative and is the central controller of the entire system.

**3. CarLight: Automatic Path Recognition and Movement System**

The car light system is built using JavaScript’s class mechanism. Each car light object reads the road grid roadCells, checks whether connected cells exist in the four directions (up, down, left, right) to automatically determine the road direction, and uses the buildLine() function to recursively expand a complete drivable path. Each car light then updates its position according to a random stepInterval, making the speed of the car flow inconsistent and closer to real traffic behavior. This system refers to common grid path-expansion methods but does not use complex algorithms such as A*. Instead, it uses a lightweight “local expansion” approach based on continuous grid cells, which is well-suited to this project.

**Reference code:**  
[Link Text]（https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes）

[Link Text]（https://www.redblobgames.com/grids/）

**4. Big Blocks Animation: Nighttime Lighting System for Buildings**

The large block animation is an independent feature I developed outside the group code. I added four fields to each block — baseColor, currentColor, appearTime, and nextColorChange — giving each block its own “independent life.” The appearance time of large blocks is designed to be staggered; they appear randomly within 10 seconds after fadeEnd (the moment the scene becomes fully dark). In addition, I implemented a time-loop–based automatic color-changing system: every 5 seconds, each block executes a randomized color change.
