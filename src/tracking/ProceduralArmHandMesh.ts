import * as THREE from 'three';
import type { ArmHandFrame } from './types';

const FINGER_CHAINS: number[][] = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20],
];

class ArmTubeWireframe {
  public readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.BufferGeometry;
  private readonly positions: Float32Array;
  private readonly rings: number;
  private readonly radialSegments: number;
  private prevTwistAngle = 0;
  private hasPrevTwist = false;

  constructor(rings = 30, radialSegments = 18, color = 0x22ff66) {
    this.rings = rings;
    this.radialSegments = radialSegments;

    const vertCount = (rings + 1) * (radialSegments + 1);
    this.positions = new Float32Array(vertCount * 3);

    const indices: number[] = [];
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < radialSegments; s++) {
        const a = r * (radialSegments + 1) + s;
        const b = (r + 1) * (radialSegments + 1) + s;
        const c = (r + 1) * (radialSegments + 1) + (s + 1);
        const d = r * (radialSegments + 1) + (s + 1);
        indices.push(a, b, d, b, c, d);
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setIndex(indices);

    this.mesh = new THREE.Mesh(
      this.geometry,
      new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.72,
      })
    );
    this.mesh.frustumCulled = false;
  }

  private remapElbowDensity(u: number): number {
    const c = u - 0.5;
    return THREE.MathUtils.clamp(0.5 + 0.62 * c + 1.52 * c * c * c, 0, 1);
  }

  private radiusAt(t: number, scale: number): number {
    const meters =
      t < 0.5
        ? THREE.MathUtils.lerp(0.056, 0.043, t / 0.5)
        : THREE.MathUtils.lerp(0.043, 0.028, (t - 0.5) / 0.5);
    return meters * scale;
  }

  update(frame: ArmHandFrame): void {
    this.mesh.visible = frame.active;
    if (!frame.active) {
      this.hasPrevTwist = false;
      return;
    }

    const midUpper = new THREE.Vector3().lerpVectors(frame.shoulder, frame.elbow, 0.72);
    const midLower = new THREE.Vector3().lerpVectors(frame.elbow, frame.wrist, 0.28);
    const curve = new THREE.CatmullRomCurve3([
      frame.shoulder,
      midUpper,
      frame.elbow,
      midLower,
      frame.wrist,
    ]);

    const pts: THREE.Vector3[] = [];
    const tangents: THREE.Vector3[] = [];
    for (let r = 0; r <= this.rings; r++) {
      const t = this.remapElbowDensity(r / this.rings);
      pts.push(curve.getPointAt(t));
      tangents.push(curve.getTangentAt(t).normalize());
    }

    const normals: THREE.Vector3[] = new Array(this.rings + 1);
    const binormals: THREE.Vector3[] = new Array(this.rings + 1);

    const ref = Math.abs(tangents[0].z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    normals[0] = new THREE.Vector3().crossVectors(tangents[0], ref).normalize();
    binormals[0] = new THREE.Vector3().crossVectors(tangents[0], normals[0]).normalize();

    const rotQ = new THREE.Quaternion();
    for (let r = 1; r <= this.rings; r++) {
      rotQ.setFromUnitVectors(tangents[r - 1], tangents[r]);
      normals[r] = normals[r - 1].clone().applyQuaternion(rotQ).normalize();
      binormals[r] = new THREE.Vector3().crossVectors(tangents[r], normals[r]).normalize();
    }

    let wristTwist = 0;
    if (frame.hasHand) {
      const endT = tangents[this.rings];
      const endN = normals[this.rings];
      const endB = binormals[this.rings];

      const projPalmN = frame.palm.normal
        .clone()
        .addScaledVector(endT, -frame.palm.normal.dot(endT))
        .normalize();

      const rawAngle = Math.atan2(projPalmN.dot(endB), projPalmN.dot(endN));
      if (!this.hasPrevTwist) {
        this.prevTwistAngle = rawAngle;
        this.hasPrevTwist = true;
      } else {
        const delta = Math.atan2(
          Math.sin(rawAngle - this.prevTwistAngle),
          Math.cos(rawAngle - this.prevTwistAngle)
        );
        this.prevTwistAngle += delta;
      }
      wristTwist = this.prevTwistAngle;
    }

    let ptr = 0;
    const n = new THREE.Vector3();
    const b = new THREE.Vector3();
    const v = new THREE.Vector3();

    for (let r = 0; r <= this.rings; r++) {
      const t = this.remapElbowDensity(r / this.rings);
      const p = pts[r];
      n.copy(normals[r]);
      b.copy(binormals[r]);

      if (t > 0.5 && wristTwist !== 0) {
        const twistFactor = (t - 0.5) / 0.5;
        const angle = wristTwist * twistFactor;
        n.applyAxisAngle(tangents[r], angle);
        b.applyAxisAngle(tangents[r], angle);
      }

      const radius = this.radiusAt(t, frame.scale);
      const ellipseThin = t > 0.7 ? THREE.MathUtils.lerp(1.0, 0.62, (t - 0.7) / 0.3) : 1.0;

      for (let s = 0; s <= this.radialSegments; s++) {
        const theta = (s / this.radialSegments) * Math.PI * 2;
        const cos = Math.cos(theta) * radius * ellipseThin;
        const sin = Math.sin(theta) * radius;

        v.copy(p).addScaledVector(n, cos).addScaledVector(b, sin);
        this.positions[ptr++] = v.x;
        this.positions[ptr++] = v.y;
        this.positions[ptr++] = v.z;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

class HandSolidWireframe {
  public readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.BufferGeometry;
  private readonly positions: Float32Array;

  private readonly palmRings = 6;
  private readonly palmRadial = 14;
  private readonly fingerRadial = 10;
  private readonly fingerRingCounts = [12, 10, 10, 10, 10];

  constructor(color = 0x33ff88) {
    const indices: number[] = [];
    let vertexOffset = 0;

    const registerGrid = (rings: number, radial: number) => {
      for (let r = 0; r < rings; r++) {
        for (let s = 0; s < radial; s++) {
          const a = vertexOffset + r * (radial + 1) + s;
          const b = vertexOffset + (r + 1) * (radial + 1) + s;
          const c = vertexOffset + (r + 1) * (radial + 1) + (s + 1);
          const d = vertexOffset + r * (radial + 1) + (s + 1);
          indices.push(a, b, d, b, c, d);
        }
      }
      vertexOffset += (rings + 1) * (radial + 1);
    };

    registerGrid(this.palmRings, this.palmRadial);
    for (const rCount of this.fingerRingCounts) {
      registerGrid(rCount, this.fingerRadial);
    }

    this.positions = new Float32Array(vertexOffset * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setIndex(indices);

    this.mesh = new THREE.Mesh(
      this.geometry,
      new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
      })
    );
    this.mesh.frustumCulled = false;
  }

  update(frame: ArmHandFrame): void {
    this.mesh.visible = frame.active && frame.hasHand;
    if (!this.mesh.visible) return;

    const h = frame.hand;
    const s = frame.handScale;
    const palmNormal = frame.palm.normal;
    let ptr = 0;

    const knuckleRefs = [h[2], h[5], h[9], h[13], h[17]];
    const wristEdgeDirs = [
      new THREE.Vector3().subVectors(h[1], h[0]),
      new THREE.Vector3().subVectors(h[5], h[0]).multiplyScalar(0.28),
      new THREE.Vector3().subVectors(h[9], h[0]).multiplyScalar(0.25),
      new THREE.Vector3().subVectors(h[13], h[0]).multiplyScalar(0.26),
      new THREE.Vector3().subVectors(h[17], h[0]).multiplyScalar(0.32),
    ];

    const centerPt = new THREE.Vector3();
    const edgePt = new THREE.Vector3();
    const v = new THREE.Vector3();

    for (let r = 0; r <= this.palmRings; r++) {
      const u = r / this.palmRings;
      const rowPts = knuckleRefs.map((kPt, idx) => {
        const startPt = new THREE.Vector3().copy(h[0]).add(wristEdgeDirs[idx]);
        return new THREE.Vector3().lerpVectors(startPt, kPt, u);
      });

      const leftEdge = rowPts[0];
      const rightEdge = rowPts[4];
      const halfThickness = THREE.MathUtils.lerp(0.015, 0.012, u) * s;

      for (let col = 0; col <= this.palmRadial; col++) {
        const angle = (col / this.palmRadial) * Math.PI * 2;
        const tAcross = 0.5 - 0.5 * Math.cos(angle);
        const thicknessSign = Math.sin(angle);

        const segFloat = tAcross * 4;
        const segIdx = Math.min(Math.floor(segFloat), 3);
        const segFrac = segFloat - segIdx;
        edgePt.lerpVectors(rowPts[segIdx], rowPts[segIdx + 1], segFrac);

        centerPt.lerpVectors(leftEdge, rightEdge, tAcross);
        edgePt.lerp(centerPt, 0.15);

        v.copy(edgePt).addScaledVector(palmNormal, thicknessSign * halfThickness);
        this.positions[ptr++] = v.x;
        this.positions[ptr++] = v.y;
        this.positions[ptr++] = v.z;
      }
    }

    const baseRadii = [0.0105, 0.0085, 0.009, 0.0082, 0.0072];

    FINGER_CHAINS.forEach((chain, fIdx) => {
      const ringCount = this.fingerRingCounts[fIdx];
      const controlPts = chain.map((lmIdx) => h[lmIdx]);
      const curve = new THREE.CatmullRomCurve3(controlPts, false, 'centripetal', 0.25);

      const pts: THREE.Vector3[] = [];
      const tangents: THREE.Vector3[] = [];
      for (let r = 0; r <= ringCount; r++) {
        const t = r / ringCount;
        pts.push(curve.getPointAt(t));
        tangents.push(curve.getTangentAt(t).normalize());
      }

      const normals: THREE.Vector3[] = new Array(ringCount + 1);
      const binormals: THREE.Vector3[] = new Array(ringCount + 1);

      normals[0] = palmNormal
        .clone()
        .addScaledVector(tangents[0], -palmNormal.dot(tangents[0]))
        .normalize();
      if (normals[0].lengthSq() < 0.01) normals[0].set(0, 0, 1);
      binormals[0] = new THREE.Vector3().crossVectors(tangents[0], normals[0]).normalize();

      const q = new THREE.Quaternion();
      for (let r = 1; r <= ringCount; r++) {
        q.setFromUnitVectors(tangents[r - 1], tangents[r]);
        normals[r] = normals[r - 1].clone().applyQuaternion(q).normalize();
        binormals[r] = new THREE.Vector3().crossVectors(tangents[r], normals[r]).normalize();
      }

      const r0 = baseRadii[fIdx] * s;
      for (let r = 0; r <= ringCount; r++) {
        const t = r / ringCount;
        let radius = THREE.MathUtils.lerp(r0, r0 * 0.65, t);
        if (t > 0.88) {
          const tipT = (t - 0.88) / 0.12;
          radius *= Math.sqrt(Math.max(0.02, 1 - tipT * tipT));
        }

        for (let col = 0; col <= this.fingerRadial; col++) {
          const theta = (col / this.fingerRadial) * Math.PI * 2;
          v.copy(pts[r])
            .addScaledVector(normals[r], Math.cos(theta) * radius)
            .addScaledVector(binormals[r], Math.sin(theta) * radius);

          this.positions[ptr++] = v.x;
          this.positions[ptr++] = v.y;
          this.positions[ptr++] = v.z;
        }
      }
    });

    this.geometry.attributes.position.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

export class ProceduralArmHandRig {
  public readonly group = new THREE.Group();
  private readonly arms: [ArmTubeWireframe, ArmTubeWireframe];
  private readonly hands: [HandSolidWireframe, HandSolidWireframe];

  constructor(armColor = 0x22ff66, handColor = 0x44ffaa) {
    this.arms = [
      new ArmTubeWireframe(30, 18, armColor),
      new ArmTubeWireframe(30, 18, armColor),
    ];
    this.hands = [
      new HandSolidWireframe(handColor),
      new HandSolidWireframe(handColor),
    ];

    this.group.add(this.arms[0].mesh, this.arms[1].mesh, this.hands[0].mesh, this.hands[1].mesh);
  }

  update(frames: readonly ArmHandFrame[]): void {
    for (let i = 0; i < 2; i++) {
      if (frames[i]) {
        this.arms[i].update(frames[i]);
        this.hands[i].update(frames[i]);
      }
    }
  }

  dispose(): void {
    this.arms.forEach((a) => a.dispose());
    this.hands.forEach((h) => h.dispose());
  }
}