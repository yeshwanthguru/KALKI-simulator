/* Lesson scenes and shot templates.
   A lesson is a complete scene that replaces the project (undo brings the old one back); each shot carries a teaching note.
   A template is a short run of shots that is added to the end of the current scene. Both use the normal project fields, so they
   go through the same checks as any file the user opens. The "tour of all camera moves" lesson is built in app.js from the move list. */

const note = (t) => t;

export const LESSONS = [
  {
    id: 'sizes', title: 'Shot sizes', blurb: 'From extreme wide to extreme close-up on the same moment. Each size says something different about the character.',
    scene: {
      title: 'Lesson: Shot sizes', aspect: '1.778', look: 'neutral', set: 'stall', shots: [
        { name: '1 Extreme wide', move: 'static', size: 'EWS', lens: 24, subject: 'both', duration: 3, notes: note('Extreme wide: the place first. Characters are small, the world is big.') },
        { name: '2 Wide', move: 'static', size: 'WS', lens: 35, subject: 'both', duration: 3, notes: note('Wide: both people and the space between them.') },
        { name: '3 Full shot', move: 'static', size: 'FS', lens: 35, subject: 'A', duration: 3, notes: note('Full: head to toe. Body language and costume read clearly.') },
        { name: '4 Medium', move: 'static', size: 'MS', lens: 50, subject: 'A', duration: 3, actionA: 'talk', notes: note('Medium: waist up. The everyday dialogue size.') },
        { name: '5 Medium close-up', move: 'static', size: 'MCU', lens: 50, subject: 'A', duration: 3, actionA: 'talk', notes: note('Medium close-up: chest up. Closer, but still polite.') },
        { name: '6 Close-up', move: 'static', size: 'CU', lens: 85, fstop: 2, subject: 'A', duration: 3, actionA: 'listen', notes: note('Close-up: the face. Use it for the moment that matters.') },
        { name: '7 Extreme close-up', move: 'static', size: 'ECU', lens: 85, fstop: 1.8, subject: 'A', duration: 3, actionA: 'listen', notes: note('Extreme close-up: eyes only. Save it, it loses power when overused.') }
      ]
    }
  },
  {
    id: 'lenses', title: 'Lens comparison', blurb: 'The same medium shot on seven lenses. The subject stays the same size, but the background and the sense of space change.',
    scene: {
      title: 'Lesson: Lenses', aspect: '1.778', look: 'golden', set: 'stall', shots: [14, 18, 24, 35, 50, 85, 135].map(l => ({
        name: l + 'mm', move: 'static', size: 'MS', lens: l, fstop: 5.6, subject: 'A', angle: 20, duration: 3, actionA: 'stand',
        notes: note(l <= 18 ? l + 'mm: very wide. The camera is close, the background stretches away, faces distort.' : l <= 35 ? l + 'mm: wide to normal. Natural depth, good for walking and group shots.' : l <= 50 ? l + 'mm: close to what the eye sees. A safe choice for dialogue.' : l + 'mm: telephoto. The camera is far away and the background is compressed and soft.')
      }))
    }
  },
  {
    id: 'dof', title: 'Aperture and depth of field', blurb: 'Same close-up at f/1.4, f/2.8, f/5.6 and f/11. Watch the background go from soft to sharp.',
    scene: {
      title: 'Lesson: Depth of field', aspect: '1.778', look: 'golden', set: 'stall', shots: [1.4, 2.8, 5.6, 11].map(f => ({
        name: 'f/' + f, move: 'static', size: 'CU', lens: 85, fstop: f, subject: 'A', angle: 25, duration: 3, actionA: 'listen',
        notes: note(f <= 1.8 ? 'f/' + f + ': very shallow. Only the eyes are sharp; the background melts. Isolates the character.' : f <= 2.8 ? 'f/' + f + ': shallow. A classic portrait look.' : f <= 5.6 ? 'f/' + f + ': medium. Some surroundings become readable.' : 'f/' + f + ': deep. Everything is sharp, good for showing a place or when focus is hard to pull.')
      }))
    }
  },
  {
    id: 'pushzoom', title: 'Push in vs zoom in', blurb: 'Both make the subject bigger, but only the push in changes the background perspective.',
    scene: {
      title: 'Lesson: Push in vs zoom', aspect: '1.778', look: 'neutral', set: 'stall', shots: [
        { name: 'Push in (camera moves)', move: 'push_in', size: 'MS', lens: 35, subject: 'A', angle: 30, duration: 5, amount: .8, actionA: 'think', notes: note('The camera physically moves closer. Background objects slide past, so you feel the depth.') },
        { name: 'Zoom in (lens moves)', move: 'zoom_in', size: 'MS', lens: 35, subject: 'A', angle: 30, duration: 5, amount: .8, actionA: 'think', notes: note('Only the lens changes. The view is magnified but the perspective stays flat. It feels more observed than felt.') }
      ]
    }
  },
  {
    id: 'coverage', title: 'Dialogue coverage', blurb: 'The standard way to shoot a conversation: master, two angles and close-ups, all staying on the same side of the action.',
    scene: {
      title: 'Lesson: Dialogue coverage', aspect: '2.39', look: 'golden', set: 'stall', shots: [
        { name: 'Master', move: 'static', size: 'WS', lens: 24, subject: 'both', duration: 5, actionA: 'sit', actionB: 'sit', notes: note('Master: shows the space and who sits where. Cut back to it when the scene shifts.') },
        { name: 'Over A, on B', move: 'static', size: 'MS', lens: 50, subject: 'B', angle: 28, duration: 5, actionA: 'sit', actionB: 'talk', notes: note('Camera behind A, looking at B. Keep it on the same side of the line between them.') },
        { name: 'Over B, on A', move: 'static', size: 'MS', lens: 50, subject: 'A', angle: -28, duration: 5, actionA: 'listen', actionB: 'sit', notes: note('Mirror angle. If you crossed to the other side, left and right would flip (the 180 degree rule).') },
        { name: 'Close-up A', move: 'push_in', size: 'CU', lens: 85, fstop: 2, subject: 'A', angle: -15, duration: 4, amount: .4, actionA: 'listen', actionB: 'sit', notes: note('Close-up with a very slow push as the line lands.') }
      ]
    }
  }
];

export const TEMPLATES = [
  {
    id: 'dialogue', title: 'Dialogue pair', blurb: 'Two matching over-the-shoulder shots and a reaction close-up.',
    shots: [
      { name: 'Over A, on B', move: 'static', size: 'MS', lens: 50, subject: 'B', angle: 28, duration: 5, actionA: 'sit', actionB: 'talk' },
      { name: 'Over B, on A', move: 'static', size: 'MS', lens: 50, subject: 'A', angle: -28, duration: 5, actionA: 'talk', actionB: 'sit' },
      { name: 'Reaction', move: 'push_in', size: 'CU', lens: 85, fstop: 2, subject: 'A', angle: -15, duration: 3, amount: .4, actionA: 'listen', actionB: 'sit' }
    ]
  },
  {
    id: 'walktalk', title: 'Walk and talk', blurb: 'A tracking shot that follows one walking actor, then a settling wide.',
    shots: [
      { name: 'Follow', move: 'follow', size: 'FS', lens: 35, subject: 'B', angle: 90, duration: 6, actionB: 'walk', actionA: 'stand' },
      { name: 'Settle', move: 'pull_out', size: 'WS', lens: 24, subject: 'both', duration: 4, amount: .5 }
    ]
  },
  {
    id: 'tension', title: 'Tension build', blurb: 'Locked wide, slow push, a tilted horizon, then the dolly zoom.',
    shots: [
      { name: 'Calm', move: 'static', size: 'WS', lens: 35, subject: 'both', duration: 3 },
      { name: 'Notice', move: 'push_in', size: 'MS', lens: 50, subject: 'A', angle: 20, duration: 4, amount: .6, actionA: 'listen' },
      { name: 'Unease', move: 'dutch', size: 'MCU', lens: 35, subject: 'A', duration: 3, amount: .5, actionA: 'look' },
      { name: 'Realisation', move: 'dolly_zoom', size: 'CU', lens: 50, fstop: 1.8, subject: 'A', duration: 4, amount: .8, actionA: 'listen' }
    ]
  },
  {
    id: 'reveal', title: 'Scene opener', blurb: 'Start tight on a detail, rise to reveal the place, then step in to the character.',
    shots: [
      { name: 'Reveal', move: 'reveal', size: 'WS', lens: 24, fstop: 5.6, subject: 'both', duration: 5, amount: .7 },
      { name: 'Meet the character', move: 'push_in', size: 'MS', lens: 50, fstop: 2.8, subject: 'A', angle: 25, duration: 4, amount: .6, actionA: 'sip' }
    ]
  },
  {
    id: 'reels', title: 'Reels hook (9:16)', blurb: 'A fast three-shot opener for vertical video: whip, close-up, punch-in. Switch the frame to 9:16 first.',
    shots: [
      { name: 'Whip in', move: 'whip_pan', size: 'MS', lens: 24, subject: 'A', duration: 2, amount: .7 },
      { name: 'Face', move: 'push_in', size: 'CU', lens: 50, fstop: 2, subject: 'A', duration: 2, amount: .7, actionA: 'talk' },
      { name: 'Reaction', move: 'zoom_in', size: 'MCU', lens: 35, subject: 'B', duration: 2, amount: .7, actionB: 'shrug' }
    ]
  }
];
