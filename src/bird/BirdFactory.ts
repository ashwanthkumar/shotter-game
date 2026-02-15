import * as THREE from 'three';
import { BirdDef } from '../types';

export class BirdFactory {
  createBird(def: BirdDef): THREE.Group {
    const group = new THREE.Group();

    // Body - elongated sphere
    const bodyGeo = new THREE.SphereGeometry(def.radius, 12, 8);
    bodyGeo.scale(def.bodyScale, 0.7, 0.7);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: def.bodyColor,
      shininess: 30,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // Belly
    const bellyGeo = new THREE.SphereGeometry(def.radius * 0.75, 10, 6);
    bellyGeo.scale(def.bodyScale * 0.8, 0.5, 0.6);
    const bellyMat = new THREE.MeshPhongMaterial({
      color: def.bellyColor,
      shininess: 20,
    });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.y = -def.radius * 0.15;
    belly.position.z = def.radius * 0.1;
    group.add(belly);

    // Wings (will be animated)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(def.wingSpan * 0.5, def.wingSpan * 0.3, def.wingSpan, 0);
    wingShape.quadraticCurveTo(def.wingSpan * 0.5, -def.wingSpan * 0.1, 0, 0);

    const wingGeo = new THREE.ShapeGeometry(wingShape);
    const wingMat = new THREE.MeshPhongMaterial({
      color: def.wingColor,
      side: THREE.DoubleSide,
      shininess: 20,
    });

    // Left wing
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(0, def.radius * 0.1, def.radius * 0.2);
    leftWing.name = 'leftWing';
    group.add(leftWing);

    // Right wing (mirrored)
    const rightWing = new THREE.Mesh(wingGeo, wingMat.clone());
    rightWing.position.set(0, def.radius * 0.1, -def.radius * 0.2);
    rightWing.scale.z = -1;
    rightWing.name = 'rightWing';
    group.add(rightWing);

    // Head
    const headGeo = new THREE.SphereGeometry(def.radius * 0.45, 8, 6);
    const headMat = new THREE.MeshPhongMaterial({
      color: def.bodyColor,
      shininess: 30,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.x = def.radius * def.bodyScale * 0.85;
    head.position.y = def.radius * 0.3;
    group.add(head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(def.radius * 0.1, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeWhiteGeo = new THREE.SphereGeometry(def.radius * 0.14, 6, 6);

    for (const side of [-1, 1]) {
      const eyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
      eyeWhite.position.set(
        def.radius * def.bodyScale * 0.85 + def.radius * 0.3,
        def.radius * 0.4,
        side * def.radius * 0.2
      );
      group.add(eyeWhite);

      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(
        def.radius * def.bodyScale * 0.85 + def.radius * 0.35,
        def.radius * 0.4,
        side * def.radius * 0.22
      );
      group.add(eye);
    }

    // Beak
    const beakGeo = new THREE.ConeGeometry(def.radius * 0.15, def.radius * 0.4, 4);
    const beakMat = new THREE.MeshPhongMaterial({
      color: def.beakColor,
      shininess: 50,
    });
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(
      def.radius * def.bodyScale * 0.85 + def.radius * 0.55,
      def.radius * 0.25,
      0
    );
    group.add(beak);

    // Tail feathers
    const tailGeo = new THREE.ConeGeometry(def.radius * 0.2, def.radius * 0.6, 4);
    const tailMat = new THREE.MeshPhongMaterial({
      color: def.wingColor,
      side: THREE.DoubleSide,
    });
    for (let i = -1; i <= 1; i++) {
      const tail = new THREE.Mesh(tailGeo, tailMat);
      tail.rotation.z = Math.PI / 2 + i * 0.2;
      tail.position.set(
        -def.radius * def.bodyScale * 0.9,
        def.radius * 0.1 + i * 0.05,
        i * def.radius * 0.1
      );
      group.add(tail);
    }

    return group;
  }

  createFeather(color: number, size: number): THREE.Mesh {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(size * 0.3, size * 0.5, 0, size);
    shape.quadraticCurveTo(-size * 0.3, size * 0.5, 0, 0);

    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshPhongMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
    });
    return new THREE.Mesh(geo, mat);
  }

  createAircraft(): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 60 });
    const accentMat = new THREE.MeshPhongMaterial({ color: 0x2255cc, shininess: 40 });
    const redMat = new THREE.MeshPhongMaterial({ color: 0xcc2222, shininess: 40 });

    // Fuselage
    const fuselageGeo = new THREE.CylinderGeometry(0.25, 0.2, 2.0, 8);
    fuselageGeo.rotateZ(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
    group.add(fuselage);

    // Nose cone
    const noseGeo = new THREE.ConeGeometry(0.25, 0.5, 8);
    noseGeo.rotateZ(-Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, redMat);
    nose.position.x = 1.25;
    group.add(nose);

    // Main wings
    const wingGeo = new THREE.BoxGeometry(0.8, 0.04, 2.4);
    const wing = new THREE.Mesh(wingGeo, accentMat);
    wing.position.set(0, 0, 0);
    group.add(wing);

    // Tail wing (horizontal stabilizer)
    const tailWingGeo = new THREE.BoxGeometry(0.4, 0.03, 1.0);
    const tailWing = new THREE.Mesh(tailWingGeo, accentMat);
    tailWing.position.set(-0.9, 0, 0);
    group.add(tailWing);

    // Vertical stabilizer (tail fin)
    const finGeo = new THREE.BoxGeometry(0.4, 0.6, 0.03);
    const fin = new THREE.Mesh(finGeo, redMat);
    fin.position.set(-0.9, 0.3, 0);
    group.add(fin);

    // Propeller hub
    const hubGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 6);
    hubGeo.rotateZ(Math.PI / 2);
    const hub = new THREE.Mesh(hubGeo, new THREE.MeshPhongMaterial({ color: 0x333333 }));
    hub.position.x = 1.5;
    hub.name = 'propHub';
    group.add(hub);

    // Propeller blades
    const propGroup = new THREE.Group();
    propGroup.position.x = 1.52;
    propGroup.name = 'propeller';
    const bladeMat = new THREE.MeshPhongMaterial({ color: 0x444444, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const bladeGeo = new THREE.BoxGeometry(0.02, 0.5, 0.08);
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.rotation.x = (i * Math.PI * 2) / 3;
      propGroup.add(blade);
    }
    group.add(propGroup);

    // Windows
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x88ccff });
    const windowGeo = new THREE.SphereGeometry(0.1, 6, 4);
    windowGeo.scale(0.6, 1, 1);
    for (let i = 0; i < 4; i++) {
      const w = new THREE.Mesh(windowGeo, windowMat);
      w.position.set(0.3 - i * 0.25, 0.2, 0.22);
      group.add(w);
      const w2 = new THREE.Mesh(windowGeo, windowMat);
      w2.position.set(0.3 - i * 0.25, 0.2, -0.22);
      group.add(w2);
    }

    return group;
  }

  createPowerUp(): THREE.Group {
    const group = new THREE.Group();

    // Glowing orb
    const orbGeo = new THREE.IcosahedronGeometry(0.3, 1);
    const orbMat = new THREE.MeshPhongMaterial({
      color: 0x00ffff,
      emissive: 0x005566,
      shininess: 100,
      transparent: true,
      opacity: 0.9,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    orb.name = 'orb';
    group.add(orb);

    // Outer glow ring
    const ringGeo = new THREE.RingGeometry(0.35, 0.45, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.name = 'ring';
    group.add(ring);

    // Lightning bolt icon (flat shape)
    const boltShape = new THREE.Shape();
    boltShape.moveTo(0.05, 0.2);
    boltShape.lineTo(-0.08, 0.02);
    boltShape.lineTo(0.02, 0.02);
    boltShape.lineTo(-0.05, -0.2);
    boltShape.lineTo(0.12, 0.0);
    boltShape.lineTo(0.02, 0.0);
    boltShape.lineTo(0.05, 0.2);

    const boltGeo = new THREE.ShapeGeometry(boltShape);
    const boltMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      side: THREE.DoubleSide,
    });
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.z = 0.31;
    group.add(bolt);
    const bolt2 = new THREE.Mesh(boltGeo, boltMat);
    bolt2.position.z = -0.31;
    bolt2.rotation.y = Math.PI;
    group.add(bolt2);

    return group;
  }
}
