# EyeRobot 2.0, full spoken script (pages 1 to 59)

Tvisha speaks pages 1 to 18, Victor pages 19 to 59. Written in the style of EyeRobot2-speaker-script-v2.md: short spoken sentences, each page opens from the last one and ends on the question the next page answers. Facts checked against the paper (arXiv 2610.03710). Italic lines are directions, not spoken. v7: Tvisha's pages 1 to 18 cut to about 4 minutes, as she set in the 21:15 run-through ("we can cut this down to three to four minutes"); she plans to use her own words, so this is a short version to work from. v6: the 11-10 21:15 run-through with Tvisha (split moved: Tvisha takes ablations, failures and open problems; skipped pages moved to an appendix after the discussion; page numbers now match the deck). v5: the 11-10 21:03 run-through with Tvisha (page 33 back for the data point, 56 and 57 back with one line each, 58 skipped, videos on 35). v4: the cross-exam fixes folded into existing pages (what is new over EyeRobot 1, the careful wrist-camera claim, one caveat, limits, AutoGaze link, depth qualifier), with trims elsewhere. v2: pages 1 and 2 rewritten from the 18:27 walkthrough. v3: Victor's half follows the 19:11 walkthrough: skipped pages stay in the deck (they flash blurred under a red X), merged pages carry their words on the first page.

Length: Tvisha 1427 words (about 10 min), Victor 3110 words (about 21 min), total 4537 words (about 30 min at 150 words a minute). Target is 16 minutes.

---

## TVISHA, pages 1 to 18

### Page 1. EyeRobot 2.0

Hi, I'm Tvisha, and with me is Victor. We're presenting EyeRobot 2.0, a paper about teaching a robot where to look, so it can do precise work with its hands.

The idea is on the screen: one fixed stereo camera works like a pair of eyes. First the robot learns where to look. Then it keeps the most detail where it's looking.

### Page 2. Precision needs acuity

Precise tasks need detail: capping a marker, putting a straw into a boba cup. A high-resolution camera has that detail, but a vision transformer pays for every patch, so looking at everything at full resolution is too expensive. Shrink the image, and the detail is gone.

### Page 3. Wrist cameras help but get occluded

The usual fix is wrist cameras. In this paper they lift success from 27 to 52 percent. But a wrist camera moves with the hand, and the object in the hand can block it, right when precision matters.

### Page 4. Active Visual Fixation

So the authors borrow from human eyes, in three parts. Fixate: point both eyes at one 3D spot. Foveate: keep the most detail around that spot, and coarse context elsewhere. And act relative to where you're looking. All from one fixed stereo camera.

### Page 5. The plan in four steps

Four pieces: rendering gaze on recorded video, a gaze policy, a target selector, and a gripper policy. I'll cover the first two; Victor takes the rest.

### Page 6. One fixed stereo camera

All the demonstrations came from one fixed stereo camera that just stared ahead. So we need a what-if: what would the eyes have seen if they had looked somewhere else?

### Page 7. Before fixation

Before: the tape is off-center in both eyes.

### Page 8. After fixation

After: rotate each eye until the tape is centered. A camera that only rotates needs no 3D model; the new view is just a warp of the old image.

### Page 9. Each eye as a partial sphere

Picture each eye as a window on a sphere of directions. Choosing a gaze slides the window, so every recorded frame becomes a place to practice looking around.

### Page 10. Moving the window

*Continues the page before: advance while talking, no new words.*

### Page 11. One fixation point, two eyes

Both eyes are steered by one 3D point, with three numbers: left-right, up-down, and distance.

### Page 12. Depth and direction

Change the distance and the eyes turn inward; change the direction and they swing together.

### Page 13. Inputs and outputs

The gaze policy gets an object name, like "yellow tape", and the two views. It outputs small changes to those three numbers, 30 times a second.

### Page 14. Discretized action space

The changes come from a menu of 119 moves, so with two similar objects it commits to one instead of aiming between them.

### Page 15. Localizing the goal in 3D

To train it without any human gaze labels, they find where the object really is. SAM3 masks it in the image, FoundationStereo gives depth, so we get its 3D position, in real space, not pixels.

### Page 16. A dense geometric reward

The reward is simply how close the gaze point gets to that position.

### Page 17. Servoing toward the object

Trained this way, the gaze ends about 3.5 centimeters from the object on average.

### Page 18. Switching targets

Change the name to "grey tape", and the gaze jumps over. So the robot can look at anything we name. But who decides what to name, and when? Victor.

## VICTOR, pages 19 to 37

### Page 19. Where we are

Thanks, Tvisha.

So now the gaze policy is frozen. We have a reliable way to fixate on any object we want. But the remaining question is: where do we look?

That takes us to the target selector: how do we decide what to look at, and when?

### Page 20. What the selector outputs

Here's the target selector. It's purposely small and lightweight: only a three-layer MLP.

Its input has no image. It only gets the robot's current state: where the arms are, and the gripper state.

Its output is a probability over a predefined list of objects for the task: which one should we be looking at right now? In this example it's the marker, and that name goes to the frozen gaze policy.

But the fascinating part is how it's trained: there are no gaze demonstrations. Nobody tells it what to look at, at which moment. So how does it learn what to look at, and when?

### Page 21. The BC-RL loop

That brings us to the training loop the authors introduced in the first EyeRobot, called BC-RL: behavior cloning plus reinforcement learning. What does that mean?

The target selector is the first step: it picks an object, say the yellow tape. Both policies share that target: the gaze policy fixates on it, and the gripper policy, trained by behavior cloning, predicts the next chunk of arm motion.

Then we compare that predicted chunk against the human demonstration and measure the error between them. The smaller that error, the higher the target selector's RL reward.

### Page 22. The reward on one chunk

So how is the error calculated? Here's one reward, on the marker task: pick up the cap and the marker, cap it, put it in the bag, and zip the bag.

Blue is the teleop chunk, what the human actually did. Orange is what the gripper policy predicted.

The gap between the two paths is the Fréchet distance, and it compares shapes, not speed. If the prediction gets there a bit early or a bit late, it doesn't matter. What matters is that the path matches the human's.

Here the selector looks at the marker, which is what it should look at, so the gap is small and the reward is high.

### Page 23. A worse fixation, a lower reward

But if at this moment it picks the keyring instead, the prediction drifts, the gap widens, and the reward drops.

So after training, what does it look at?

### Page 24. Emergent gaze sequences

So what does it look like in action? This is the selector's real output during an autonomous marker run.

It first looks at the cap. Just before it picks up the marker, it switches to the marker, and keeps its gaze there while capping.

And the fascinating thing, once again: none of this was labeled. It came straight out of the reward.

### Page 25. Where we are

So now we know what to look at, and we have a reliable way to make the eyes fixate on it. The last piece is the gripper policy, the one that moves the arms. What does it see, and how does it act?

### Page 26. Foveated multi-crop input

First, what it sees. Let's bring back one of the key ideas: foveation. As Tvisha mentioned, it's like human eyes: we see the center of our vision in much more detail, and get less and less information further out.

So around the fixation point, we cut a pyramid of centered crops, like concentric crops, from wide to tight. Each crop costs the same number of tokens, so the tight crop keeps much more detail where we're looking, and the wide crops keep the context.

This part already exists in the first EyeRobot. What's new is the frame.

### Page 27. The fixation frame

A frame here just means a coordinate system: an origin and three axes that every position is measured from.

Every gripper pose, and every pose the policy predicts, is written in a frame at the virtual center eye, rotated to face the fixation point.

### Page 28. The frame follows gaze

So when the gaze moves from the yellow tape to the grey tape, the frame turns with it, and reaching for the grey tape looks almost the same as reaching for the yellow one. So the training data is always centered on what the robot is looking at.

### Page 29. Architecture

Now that we understand both the foveated view and the fixation frame, let's look at the gripper policy itself. It's an ACT-style transformer. ACT, Action Chunking with Transformers, predicts a whole chunk of future motion at once instead of one step.

A frozen DINOv3 turns each foveated crop into image tokens. Those, the arm and gaze state, and the target name go in. A one-and-a-half-second motion chunk for both arms comes out.

It has no reward of its own: it's trained by behavior cloning, to match the human's motion in the demonstrations.

### Page 30. Compact image inputs

Look at the camera images during the pick-tape stage. In the static view, the tape can be anywhere. In the gaze view, it's always in the middle.

So what the policy sees, and the actions it has to output, both become much more consistent. That's why a small amount of demonstration data goes further.

### Page 31. Training and inference pipeline

So here's the whole pipeline, next to the architecture. We start from the teleop demos: SAM3 finds each object and FoundationStereo gives depth, so every object gets a position in 3D, measured in real space, not in pixels.

Stage one trains the gaze policy to look at those positions. Stage two freezes it and trains the selector and the gripper policy together. Then all three run live, at about 20 hertz, with no human gaze labels anywhere.

### Page 32. Experiments

Now, the experiments.

### Page 33. Three groups compared

We compare three groups, all trained on the same demonstrations. No gaze sees both stereo images, without fixation. Ego plus wrist sees the left stereo image plus two wrist cameras. And EyeRobot 2.0 sees the stereo pair with active gaze.

Here's the setup they all run on.

### Page 34. Setup: robot, camera and seven tasks

One two-armed robot, and one stereo camera between the arms. No wrist cameras for EyeRobot.

Seven real tasks: marker, tea, toaster, wrench, tape, boba and pot, each tested on the same 25 placements for every policy. Capping the marker and the boba straw need fine precision, and in boba and pot the object in the hand blocks a wrist camera.

So how do they do?

### Page 35. Average success (paper Figure 6)

Averaged over the seven real tasks: no gaze 27 percent, ego plus wrist 52, EyeRobot 2.0 67. That's about 40 points over the same stereo camera without gaze.

But the paper's own claim against wrist cameras is careful. Where the wrist cameras can see, EyeRobot only matches them, 69 against 64. Where they're blocked, it more than doubles them, 48 against 22.

Two stories behind that. First, precision.

### Page 36. Precision tasks

Capping the marker and putting the straw in the cup need very fine alignment. Passive stereo gets 4 and 8 percent: same pixels, but it can't afford to look closely. Foveating on the cap and the straw lifts those to 68 and 44.

Second story: occlusion.

### Page 37. Wrist occlusion (paper Figure 7)

In boba and pot, the cup or the lid ends up right in front of the wrist cameras at the critical moment. Ego plus wrist falls to 12 and 32 percent. EyeRobot keeps 44 and 52, because its eyes aren't on the gripper.

So which parts are doing the work? Tvisha will take the ablations.

## TVISHA, pages 38 to 41

### Page 38. Real-world ablations (paper Table 2)

The ablations ask which parts do the work. One caution first: every real number is one trained model, picked at random, over 25 trials, with objects inside the area the demos covered. Gaps of a few points are noise.

The big gaps are clear, though. Without foveation, the average drops from 66.5 to 46.5 percent. Without stereo, to 48.5. On the marker, 17 out of 25 becomes 8 without stereo and 5 without foveation.

### Page 39. Simulated ablations (paper Table 5)

In simulation they test the rest. Write the actions in world coordinates instead of the gaze frame, and success falls from 0.74 to 0.53. So looking isn't enough; you have to act in the gaze frame.

So where does it still fail?

### Page 40. Typical failures

Failures cluster at the hardest, most precise stages: inserting the straw, capping the marker. And with clutter, it mostly fails when it's looking at the wrong thing.

### Page 41. Open problems

The authors name three open problems: every policy is trained for one task, the eyes can only look within the fixed camera's view, and gaze targets whole objects, not parts. It also runs at half the baselines' control rate.

## BOTH, page 42 (discussion)

### Page 42. Discussion

To wrap up: compared to the first EyeRobot, three things are new: two eyes from one fixed stereo camera, gaze split into a selector and a gaze policy, and actions in the gaze frame. That takes passive stereo from 27 to 67 percent.

Three questions to leave you with.

One: gaze picks one named object and looks at its center. What if there are two identical markers, or a big object where only one part matters, like the zipper on a backpack?

Two: AutoGaze, which we covered earlier this term, chose where to look by reconstructing the video. EyeRobot chooses by how predictable the arm becomes. Which signal should decide where a robot looks?

Three: DreamZero, earlier today, gets zero-shot policies from a large pretrained model. EyeRobot trains a small policy per task. Does active gaze matter more, or less, once policies are large?

## APPENDIX, pages 44 to 61 (backup for questions, not presented; page 43 is the divider)

### Page 44. Poses in the world frame

*Skipped: our own plot used the old frame. Page 33 makes the point with the camera images instead.*

### Page 45. Poses in the fixation frame

*Skipped, with page 30.*

### Page 46. Three demos compared

Side by side, same scale, three demonstrations drawn bold.

On the left, robot coordinates: they start and end in unrelated places. On the right, gaze coordinates: the three paths nearly overlap as they approach.

That's the compression the policy benefits from. And the same thing happens on the input side.

### Page 47. Part 2 plan

Here's the second half. First, how they test it. Then how training and inference run in practice. Then results against passive stereo and wrist cameras, what each piece contributes, and where it still fails.

Let's start with the robot.

### Page 48. Seven real tasks

Seven real tasks, each chosen to stress something different.

Marker and toaster are long tasks with many stages. Capping a marker and zipping a bag need very precise alignment. Tea means finding a white teabag on a white table, anywhere in the workspace. Tape is a two-handed handover, with the tape placed on an 8 by 8 grid. And boba and pot are where the object in the hand blocks the wrist camera.

The clips you see are EyeRobot 2.0 running on its own.

How do they make the comparison fair?

### Page 49. Evaluation protocol

They're careful here.

In the real world, each task gets 25 test placements, and tape gets 64. Placements are inside the area the training data covers, but never exactly a training position. They overlay the live camera feed to put the objects in the same spot for every policy.

Each policy is trained with three seeds. In the real world, one seed is picked at random. In simulation, all three are tested on 100 unseen setups, and the best is reported.

That's over a thousand physical rollouts in total. And the gaze always gets one second to settle before the arms move.

So who is EyeRobot up against?

### Page 50. Stage 1: gaze pretraining

Stage one. Each rollout is 120 steps on one paused stereo frame, with a random object name.

64 of these run in parallel, which is what this grid shows: every dot moving onto its object.

15 million steps in total. At the end, the gaze lands about 3.5 centimeters from the object on average.

Stage two is more involved.

### Page 51. Stage 2: episode anatomy

One episode at a time.

It starts at a frame sampled from a demonstration, with a little extra weight on the very first frame, because that's where the most important gaze decision happens: what to reach for first.

The first 30 steps are paused, so the gaze can settle. Then the demonstration plays forward.

Every 15 frames, the selector picks a new target. The colors show one example sequence. And at each step, the gripper policy predicts a chunk, and the selector gets the Fréchet reward.

How do the two learners share data?

### Page 52. Stage 2: the ring buffer

Through a buffer that keeps the last 100 episodes.

The selector updates with PPO on its own rollouts. The gripper policy pulls independent batches from the buffer, so it sees many different demonstrations, and the views that the current gaze produces.

The gripper policy has its own heads, so no reinforcement learning gradient touches it.

So that's training. What does it look like on the robot?

### Page 53. Real-time inference

At test time it's one loop.

The stereo camera feeds a foveated view around the current fixation point. The gaze policy moves that point, which closes this orange loop. The selector decides what to look at.

The gripper policy predicts a one-and-a-half-second chunk. Those chunks are smoothed together, interpolated up to 200 hertz, and sent to the arms.

The whole thing runs at about 20 hertz. That's half the rate of the simpler baselines, which run at 40.

One detail on that smoothing.

### Page 54. Temporal ensembling

A new chunk comes out every cycle. So at any moment, several chunks overlap the current time.

Each one votes, the orange dots, and the robot executes a weighted average of them. The paper sets the weighting constant to 0.01. The curves here are illustrative.

The point is smooth motion that still takes in the newest prediction.

Okay. Results.

### Page 55. Task progression

One detail from the stage-by-stage breakdowns.

You'd expect passive stereo to fail only at the precise steps. But it often fails at the easy first grasp too. In the tea task, it picked up the small teabag in 32 percent of trials. EyeRobot always did.

Let's go task by task.

### Page 56. Per-task success

On the left are the tasks where the wrist cameras keep a clear view: marker, tea, toaster and wrench. Here EyeRobot and ego plus wrist perform about the same, and both are far above passive stereo.

On the right are boba and pot, where the object in the hand blocks the wrist cameras.

Two stories stand out. First, precision.

### Page 57. Distractors: first grasp

They tested tea, wrench and tape with colorful extra objects scattered around. Each dot is one of 25 trials, and filled dots are successful first grasps.

Passive stereo, 16 percent. Wrist, 47. EyeRobot, 75.

In the video, the wrist policy on the left reaches for a distractor and can't recover, because the wrist camera loses sight of the real target. EyeRobot retries the tape grasp and finishes.

And the whole task?

### Page 58. Distractors: full task

With clutter, full-task success is low for everyone: 0, 11 and 23 percent. Watch the dots drain from the first-grasp state.

The interesting part is how EyeRobot fails. When its gaze is on the right object, it reaches for the right object. It mostly misses when it's looking in the wrong place. So you can see a failure coming from where it looks.

Now simulation.

### Page 59. Simulation results

Six pick-and-place tasks, 100 unseen setups each.

EyeRobot beats passive stereo on every task, and is roughly tied with wrist cameras: 74 versus 75 on average.

The authors suggest simulation may favor wrist cameras, partly because physics in sim is more forgiving.

So which parts of the method are doing the work?

### Page 60. Action frame per task

Task by task, the gaze frame wins every time.

Everything else is identical: same gaze, same images. Only the frame for the robot's state and actions changes.

This is the data argument from earlier, showing up in the numbers. With fixed world coordinates and little data, the policy can overfit to specific positions.

So where does it still fail?

### Page 61. Conclusion: the architecture

*Skipped on 11-10 with Tvisha: the architecture is already on the overview pages. The wrap-up line moved to page 59.*

---

## What changed against the paper check

- v14 (11-11 15:02 run-through): the pipeline moves before the experiments (now page 31), redrawn vertical beside the architecture with only the box names and one line: no human gaze labels anywhere.

- v13 (11-11 14:59 run-through): an "Experiments" divider is page 31; the three groups (now 32) come before the setup (now 33); every later page number is one higher.

- v12 (11-11 14:55 run-through): the architecture moves after the frame (now page 29), as Victor ran it; page 29 says the gripper policy has no reward, it is trained by behavior cloning (paper p5: "Action chunks are supervised with teleop demos").

- v11 (11-11 14:49 run-through): foveation (now page 26) comes before the architecture (now page 27), as Victor asked; pages 24 to 28 in his words; page 28 says what a frame is (a coordinate system).

- v10 (11-11 14:42 run-through): pages 19 to 23 rewritten in Victor's own words from his second take; the keyring case now spoken on page 23; reward wording kept as "smaller error, higher reward" (the paper's reward is the negative Fréchet distance).

- (Tvisha) Page 3: "adding two wrist cameras to stereo" fixed. The Ego + Wrist baseline is one front image plus two wrist cameras (paper p7, Baselines).
- (Tvisha) Page 2: the token count is said as our own count ("by our own count").
- (Tvisha) Page 8: the undistort, ray and pinhole steps are dropped; kept only what the paper says (rotation only, a pure warp, no 3D needed; Sec 3.1 p4).
- (Tvisha) Page 9: the sphere is said as a way to picture it ("think of"); the paper only says the 360 idea carries over to stereo by warping.
- (Tvisha) Page 15: "only run offline" dropped.
- (Tvisha) Page 17: "first 10 degree steps then 3 degree corrections" dropped (not reported in the paper).
- (Tvisha) Page 5: added "I'll take steps one and two, Victor will take three and four" to set up the handoff.
- (Tvisha) Page 18: ends on the handoff line to Victor.
- (Victor) Page 26: "gripper widths" dropped (not in the paper).
- (Victor) Page 27: "wide, medium, narrow", "16 times" and "over ten times the tokens" dropped; kept the pyramid of centered crops at one token size (paper p3, Appendix B).
- (Victor) Pages 28, 29, 31: the fixation frame fixed to the paper's definition: the virtual center eye's rotation toward the fixation point (Sec 3.2, p5). Origin stays at the eyes; it turns, it doesn't move onto the object.
- (Victor) Page 29: equivariance said as our analogy.
- (Victor) Pages 30 to 32: said as our own illustration from the tape task; "2,015 poses" and "data released with the paper" dropped.
- (Victor) Page 31: dropped "gaze recorded at its own timestamp" (demos have no recorded gaze); the ablation number is the paper's 74 to 53.
- (Victor) Page 36: "millimeter" dropped; "10 to 53 minutes" dropped.
- (Victor) Page 37: tape has 64 trials; sim tests all three seeds and reports the best (p6).
- (Victor) Page 38: "end-effector relative SE(3)" detail dropped for time (still true).
- (Victor) Page 40: "random starting fixation" and the optimizer details dropped.
- (Victor) Page 42: Muon, entropy and step counts dropped for time (true, Appendix).
- (Victor) Page 43: "selector swaps every 15 frames at inference" dropped; 20 Hz vs 40 Hz kept (Appendix).
- (Victor) Page 44: weight direction dropped; only k = 0.01 kept.
- (Victor) Page 45: "sim rankings agree with real" dropped (tape disagrees between real and sim).
- (Victor) Page 46: our own 48/73/81 progress numbers dropped; the 32 percent teabag is the passive stereo baseline (Appendix A).
- (Victor) Page 47: clear-view tasks are marker, tea, toaster, wrench; tape removed from that group (p8).
- (Victor) Page 48: "millimeter" dropped.
- (Victor) Page 50: "unseen" dropped.
- (Victor) Page 51: "long tasks" and "narrow misses" dropped; kept the paper's point that it misses when gaze is wrong (p9).
- (Victor) Page 52: "sim is too clean" replaced with the paper's reason (sim may favor wrist cameras; forgiving physics).
- (Victor) Page 55: per-task drops ("10 points on spoon, 33 on pot") dropped; the paper gives the mean.
- (Victor) Page 56: DAgger and "narrowly missing" dropped; the ambiguity case is not named by task (the paper's ambiguity example is marker into bag; the clip file is named boba, check the clip).
- (Victor) Page 59: code "will be released", not "has the code".
- (Victor) Page 19: opens with "Thanks, Tvisha" to take the handoff.
- (v3) Pages 22 and 23 merged; 28 and 29 merged (frame now at the center eye, as the paper defines it); 30 and 31 merged; 35 and 36 merged (robot and tasks on one page).
- (v3) Skipped in the deck: 32, 33, 34, 36, 37, 39 to 44, 46, 47, 50, 51, 52, 55, 56, 57.
- (v3) Results and ablations now use the paper's own Figure 6, Figure 7, Table 2 and Table 5.
- (v3) Page 38: no gaze sees both stereo images; ego plus wrist sees the left stereo image plus two wrist cameras (paper p7, Baselines).
- (v3) Page 53: marker numbers from Table 2 (17/25 full, 8/25 without stereo, 5/25 without foveation).
- (v3) Page 59 is now a discussion page with Victor's three questions.
- (v4) Folded in from the cross-exam without new pages: what is new over EyeRobot 1 (21, 27, 28, 58), the paper's careful wrist-camera claim (45, 58), one caveat on the evidence (53), limits (58), the AutoGaze link (21), "is the selector doing anything" (54), direction vs distance in the gaze frame (28), two class-linked questions (59). Trimmed 19, 20, 22, 24, 25, 26, 27, 35, 38, 48, 49.
- (v4) Pages 30 and 31 proposed skipped: the plot used the old frame. Page 54 carries the point.
- (v5, run-through with Tvisha 21:03) Page 33 back (30 seconds on centered training data, using the camera images, no frame plot); 56 and 57 back with one line each; 58 skipped (its wrap-up line now opens 59); 35 task videos play again.
- (v5) Removed "little recovery once it drifts off the demonstrations": the paper does not say this about EyeRobot. Page 56 slide text fixed the same way ("narrow misses" and "DAgger" are not in the paper).
- (v6, run-through with Tvisha 21:15) No "October 7" date for AutoGaze; no leash analogy (page 22 explains the gap between the two chunks); no pencil-pouch line (24); simpler frame page (28); the 25 placements said on 31; the pipeline back as one page (33, was 39) with SAM3 + FoundationStereo giving 3D positions; "is the selector doing anything" dropped (38); Tvisha takes 37 to 40.
- (v6) Old to new page numbers: 33 to 30, 35 to 31, 38 to 32, 39 to 33, 45 to 34, 48 to 35, 49 to 36, 53 to 37, 54 to 38, 56 to 39, 57 to 40, 59 to 41; skipped pages now 43 to 60 in the appendix.
- (v7) Tvisha's pages 1 to 18 cut to about 4 minutes (she set the target in the 21:15 run-through). SAM3 and FoundationStereo giving a 3D position in real space is now said on page 15, as she offered. Her earlier proposed cuts are no longer needed: every slide stays, with fewer words.
- (v7) Slide 32 retitled "Three Setups Compared" (Victor found "Experimental Setup" confusing there). Small footnote lines removed from slides 21, 22, 24, 27, 28, 29 and 30 (Victor: "nobody's going to read all of that"). Slide 23 no longer mentions a leash.
