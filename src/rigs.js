/* Camera rigs: the equipment that would make each camera move in real life.
   Every move has a default rig, a shot can pick another one, and the set view draws it so the move can be planned on location.
   Budget tips are common low-cost workarounds, not safety advice: test any improvised rig with a dummy load before putting a camera on it. */

export const RIGS = {
  tripod: { name: 'Tripod + fluid head', draw: 'tripod', how: 'Camera stays on a tripod and only the head turns. Lock the legs and level the head first.', budget: 'Any sturdy tripod works. Add weight to the centre hook so it does not creep on the floor.' },
  column: { name: 'Tripod with centre column', draw: 'column', how: 'Raise or lower the centre column smoothly while the camera stays level.', budget: 'Small moves only. For longer height changes use a ladder-free jib or a monopod on a stool.' },
  dolly: { name: 'Dolly + track', draw: 'dolly', how: 'Camera sits on a wheeled dolly that rolls along straight or curved track. Lay the track before the shot and keep the speed even.', budget: 'A wheelchair or a trolley on a smooth floor, or skateboard wheels on a plank; push with the whole body, not the arms.' },
  slider: { name: 'Slider', draw: 'dolly', how: 'A short motorised or manual slider gives a gentle push or sideways move on a tripod.', budget: 'A 60-100 cm slider on a table or tripod covers most small push-ins and trucks.' },
  curve: { name: 'Circular track', draw: 'dolly', how: 'Dolly on curved or circular track around the subject, the camera always looking at the middle.', budget: 'Walk a steady arc with a gimbal and mark the floor with tape for the radius.' },
  jib: { name: 'Jib / crane arm', draw: 'jib', how: 'The camera sits on the end of a counterweighted arm that swings or lifts. Practise the counterweight before the take.', budget: 'A pole-mounted camera held overhead, or a drone for the high end of the move.' },
  gimbal: { name: 'Gimbal / stabiliser', draw: 'operator', how: 'An operator walks with the camera on a handheld stabiliser. Bend the knees and roll the feet to keep it smooth.', budget: 'A phone gimbal or in-camera stabilisation; walk toe to heel and rehearse the path.' },
  handheld: { name: 'Handheld / shoulder', draw: 'operator', how: 'The operator holds the camera, ideally on a shoulder rig, and lets the body movement show.', budget: 'Hold the phone or camera with two hands and elbows tucked in; use a strap or a shoulder support to control the shake.' }
};

/* the usual rig for each move (the camera moves are defined in app.js) */
const DEFAULT_RIG = {
  static: 'tripod', pan: 'tripod', tilt: 'tripod', zoom_in: 'tripod', dutch: 'tripod', whip_pan: 'tripod',
  push_in: 'dolly', pull_out: 'dolly', truck: 'dolly', dolly_zoom: 'dolly', pedestal: 'column',
  arc: 'curve', orbit: 'curve', spiral: 'curve', crane: 'jib', reveal: 'jib', follow: 'gimbal', handheld: 'handheld'
};

export const rigIds = () => Object.keys(RIGS);
export const rigFor = (shot) => (shot && RIGS[shot.rig] ? shot.rig : DEFAULT_RIG[shot && shot.move] || 'tripod');
export const normRig = (v) => (RIGS[v] ? v : 'auto');
